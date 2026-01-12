import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RedisService } from '../redis/redis.service';
import { SmsService } from '../../services/sms/sms.service';
import { WechatService } from '../../services/wechat/wechat.service';
import { maskPhone } from '../../common/utils/phone.validator';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { Gender } from '../../database/schemas/user.schema';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { AuthResponse, UserInfoResponse } from './interfaces/auth-response.interface';
import { WechatLoginInfo } from './interfaces/wechat-user-info.interface';

/**
 * 认证服务
 * 处理用户登录、注册、Token管理等核心逻辑
 */
@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private redisService: RedisService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private smsService: SmsService,
    private wechatService: WechatService,
  ) {}

  /**
   * 发送验证码
   */
  async sendVerificationCode(phoneNumber: string): Promise<{ expiresAt: number }> {
    // 1. 验证手机号格式
    if (!this.smsService.validatePhoneNumber(phoneNumber)) {
      throw new BadRequestException('手机号格式不正确');
    }

    // 2. 检查发送频率限制
    const rateKey = `sms:rate:${phoneNumber}`;
    const lastSent = await this.redisService.get(rateKey);
    if (lastSent) {
      const ttl = await this.redisService.ttl(rateKey);
      throw new BadRequestException(`发送过于频繁，请${ttl}秒后再试`);
    }

    // 3. 检查是否被锁定
    const attemptsKey = `sms:attempts:${phoneNumber}`;
    const attempts = parseInt((await this.redisService.get(attemptsKey)) || '0');
    if (attempts >= 5) {
      throw new BadRequestException('验证失败次数过多，请1小时后再试');
    }

    // 4. 生成验证码
    const code = this.generateCode();
    const codeKey = `sms:code:${phoneNumber}`;
    const expiresIn = parseInt(this.configService.get('CODE_EXPIRES_IN', '300'));
    const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

    // 5. 存储验证码到 Redis
    await this.redisService.hset(codeKey, 'code', code);
    await this.redisService.hset(codeKey, 'createdAt', Math.floor(Date.now() / 1000).toString());
    await this.redisService.hset(codeKey, 'expiresAt', expiresAt.toString());
    await this.redisService.hset(codeKey, 'attempts', '0');
    await this.redisService.expire(codeKey, expiresIn);

    // 6. 发送短信
    try {
      await this.smsService.sendVerificationCode(phoneNumber, code);
    } catch (error) {
      // 发送失败，删除已存储的验证码
      await this.redisService.del(codeKey);
      throw error;
    }

    // 7. 设置发送频率限制
    const interval = parseInt(this.configService.get('CODE_SEND_INTERVAL', '60'));
    await this.redisService.set(rateKey, Date.now().toString(), interval);

    return { expiresAt };
  }

  /**
   * 验证码登录
   */
  async loginWithCode(phoneNumber: string, code: string): Promise<AuthResponse> {
    const codeKey = `sms:code:${phoneNumber}`;
    const codeData = await this.redisService.hgetall(codeKey);

    // 1. 验证码不存在
    if (!codeData || !codeData.code) {
      throw new UnauthorizedException('验证码不存在或已过期');
    }

    // 2. 验证码过期
    const now = Math.floor(Date.now() / 1000);
    if (parseInt(codeData.expiresAt) < now) {
      await this.redisService.del(codeKey);
      throw new UnauthorizedException('验证码已过期');
    }

    // 3. 验证码错误
    if (codeData.code !== code) {
      const attempts = parseInt(codeData.attempts || '0') + 1;
      const attemptsKey = `sms:attempts:${phoneNumber}`;

      if (attempts >= 5) {
        // 锁定1小时
        await this.redisService.set(attemptsKey, '5', 3600);
        await this.redisService.del(codeKey);
        throw new UnauthorizedException('验证失败次数过多，请1小时后再试');
      }

      // 更新尝试次数
      await this.redisService.hset(codeKey, 'attempts', attempts.toString());
      await this.redisService.set(attemptsKey, attempts.toString(), 300);

      throw new UnauthorizedException(`验证码错误，还剩${5 - attempts}次机会`);
    }

    // 4. 验证成功，删除验证码
    await this.redisService.del(codeKey);
    await this.redisService.del(`sms:attempts:${phoneNumber}`);

    // 5. 查找或创建用户
    let user = await this.userModel.findOne({ phoneNumber });
    if (!user) {
      user = await this.userModel.create({
        phoneNumber,
        nickname: '',
        avatar: '',
        isGuest: false,
        lastLoginAt: new Date(),
      });
    } else {
      user.lastLoginAt = new Date();
      await user.save();
    }

    // 6. 生成Token
    const tokens = await this.generateTokens(user._id.toString());

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: this.parseExpirationTime(this.configService.get('JWT_EXPIRES_IN', '15m')),
      user: this.formatUserInfo(user),
    };
  }

  /**
   * 刷新Token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken);

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('无效的Token类型');
      }

      // 查找用户
      const user = await this.userModel.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('用户不存在');
      }

      // 生成新Token
      const tokens = await this.generateTokens(user._id.toString());

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: this.parseExpirationTime(this.configService.get('JWT_EXPIRES_IN', '15m')),
        user: this.formatUserInfo(user),
      };
    } catch (error) {
      throw new UnauthorizedException('无效的Token');
    }
  }

  /**
   * 登出（将Token加入黑名单）
   */
  async logout(userId: string, tokenId: string): Promise<void> {
    const expiresIn = this.parseExpirationTime(this.configService.get('JWT_EXPIRES_IN', '15m'));
    const blacklistKey = `auth:blacklist:${tokenId}`;
    await this.redisService.set(blacklistKey, '1', expiresIn);
  }

  /**
   * 微信小程序登录
   * @param code 微信小程序wx.login返回的code
   * @param userInfo 用户信息（可选）
   * @returns 认证响应
   */
  async loginWithWechatMiniProgram(
    code: string,
    userInfo?: { nickname?: string; avatar?: string; gender?: number },
  ): Promise<AuthResponse> {
    try {
      // 1. 调用微信API获取openid和session_key
      const wechatAuthData = await this.wechatService.miniProgramLogin(code);

      // 2. 构造微信登录信息
      const loginInfo: WechatLoginInfo = {
        openid: wechatAuthData.openid,
        unionid: wechatAuthData.unionid,
        nickname: userInfo?.nickname,
        avatar: userInfo?.avatar,
        gender: userInfo?.gender,
        loginType: 'mini-program',
      };

      // 3. 查找或创建用户
      const user = await this.findOrCreateWechatUser(loginInfo);

      // 4. 生成Token
      const tokens = await this.generateTokens(user._id.toString());

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: this.parseExpirationTime(this.configService.get('JWT_EXPIRES_IN', '15m')),
        user: this.formatUserInfo(user),
      };
    } catch (error) {
      throw new UnauthorizedException('微信登录失败: ' + error.message);
    }
  }

  /**
   * 微信APP登录
   * @param code 微信APP授权后获取的code
   * @param userInfo 用户信息（可选）
   * @returns 认证响应
   */
  async loginWithWechatApp(
    code: string,
    userInfo?: { nickname?: string; avatar?: string; sex?: number; province?: string; city?: string; country?: string },
  ): Promise<AuthResponse> {
    try {
      // 1. 调用微信API获取用户信息
      const wechatAuthData = await this.wechatService.appLogin(code);

      // 2. 构造微信登录信息
      const loginInfo: WechatLoginInfo = {
        openid: wechatAuthData.openid,
        unionid: wechatAuthData.unionid,
        nickname: userInfo?.nickname || wechatAuthData.nickname,
        avatar: userInfo?.avatar || wechatAuthData.headimgurl,
        gender: userInfo?.sex || wechatAuthData.sex,
        loginType: 'app',
      };

      // 3. 查找或创建用户
      const user = await this.findOrCreateWechatUser(loginInfo);

      // 4. 生成Token
      const tokens = await this.generateTokens(user._id.toString());

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: this.parseExpirationTime(this.configService.get('JWT_EXPIRES_IN', '15m')),
        user: this.formatUserInfo(user),
      };
    } catch (error) {
      throw new UnauthorizedException('微信登录失败: ' + error.message);
    }
  }

  /**
   * 根据微信登录信息查找或创建用户
   * @param loginInfo 微信登录信息
   * @returns 用户文档
   */
  private async findOrCreateWechatUser(loginInfo: WechatLoginInfo): Promise<UserDocument> {
    let user: UserDocument | null = null;

    // 优先使用unionid查找（如果有）
    if (loginInfo.unionid) {
      user = await this.userModel.findOne({ unionId: loginInfo.unionid });
    }

    // 如果没找到，使用openid查找
    if (!user) {
      const searchQuery: any = {};
      if (loginInfo.loginType === 'mini-program') {
        searchQuery.openId = loginInfo.openid;
      } else {
        // APP端如果有unionid就用unionid，否则用openid（兼容未绑定开放平台的情况）
        searchQuery.unionId = loginInfo.unionid || loginInfo.openid;
      }
      user = await this.userModel.findOne(searchQuery);
    }

    // 如果用户已存在，更新最后登录时间和用户信息
    if (user) {
      user.lastLoginAt = new Date();

      // 更新用户昵称和头像（如果提供）
      if (loginInfo.nickname && !user.nickname) {
        user.nickname = loginInfo.nickname;
      }
      if (loginInfo.avatar && !user.avatar) {
        user.avatar = loginInfo.avatar;
      }

      // 如果之前只有openId，现在有unionId了，更新unionId
      if (loginInfo.unionid && !user.unionId) {
        user.unionId = loginInfo.unionid;
      }

      await user.save();
      return user;
    }

    // 创建新用户
    const newUser = await this.userModel.create({
      unionId: loginInfo.unionid,
      openId: loginInfo.loginType === 'mini-program' ? loginInfo.openid : undefined,
      nickname: loginInfo.nickname || '微信用户',
      avatar: loginInfo.avatar || '',
      gender: this.mapGender(loginInfo.gender),
      isGuest: false,
      lastLoginAt: new Date(),
    });

    return newUser;
  }

  /**
   * 映射微信性别到系统性别
   * @param wechatGender 微信性别：0-未知，1-男，2-女
   * @returns 系统性别枚举
   */
  private mapGender(wechatGender?: number): Gender {
    if (!wechatGender || wechatGender === 0) return Gender.UNKNOWN;
    if (wechatGender === 1) return Gender.MALE;
    if (wechatGender === 2) return Gender.FEMALE;
    return Gender.UNKNOWN;
  }

  /**
   * 生成Token对
   */
  private async generateTokens(userId: string): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = { sub: userId, type: 'access' };
    const refreshPayload: JwtPayload = { sub: userId, type: 'refresh' };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwtService.signAsync(refreshPayload, {
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * 生成验证码
   */
  private generateCode(): string {
    const length = parseInt(this.configService.get('CODE_LENGTH', '6'));
    const code = Math.floor(Math.random() * Math.pow(10, length))
      .toString()
      .padStart(length, '0');

    // 避免简单验证码
    if (/^(\d)\1{5}$/.test(code) || /^123456|234567|345678|456789|987654|876543|765432|654321$/.test(code)) {
      return this.generateCode();
    }

    return code;
  }

  /**
   * 格式化用户信息
   */
  private formatUserInfo(user: UserDocument): UserInfoResponse {
    return {
      id: user._id.toString(),
      phoneNumber: maskPhone(user.phoneNumber || ''),
      nickname: user.nickname || '',
      avatar: user.avatar || '',
      membership: user.membership,
      isGuest: user.isGuest || false,
    };
  }

  /**
   * 解析过期时间字符串为秒数
   */
  private parseExpirationTime(timeStr: string): number {
    const match = timeStr.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // 默认15分钟

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    return value * multipliers[unit];
  }
}
