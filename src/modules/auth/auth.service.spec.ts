import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { RedisService } from '../redis/redis.service';
import { SmsService } from '../../services/sms/sms.service';
import { WechatService } from '../../services/wechat/wechat.service';
import { UserService } from '../../services/user/user.service';
import { UserDataBuilder, VerificationCodeDataBuilder } from '../../test/helpers/test-data.builder';
import { MockFactory, TestContext } from '../../test/helpers/mock.factory';

/**
 * AuthService 单元测试
 *
 * 测试原则：
 * 1. 测试行为而非实现 - 测试"发送验证码后用户可以登录"，而不是"调用了send方法"
 * 2. AAA模式 - Arrange, Act, Assert
 * 3. 一个测试只验证一件事
 * 4. 测试名称清晰描述测试内容
 * 5. 避免测试私有方法
 *
 * 反模式避免：
 * - ❌ 不测试save()被调用（实现细节）
 * - ✅ 测试用户可以成功登录（行为）
 * - ❌ 不过度Mock，让测试验证真实行为
 * - ✌ 避免在测试中编写业务逻辑
 */
describe('AuthService', () => {
  let service: AuthService;
  let context: TestContext;
  let mockUsers: UserDocument[];

  beforeEach(async () => {
    // Arrange - 准备测试上下文
    context = new TestContext();
    mockUsers = [];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: ConfigService, useValue: context.configService },
        { provide: JwtService, useValue: context.jwtService },
        { provide: RedisService, useValue: context.redisService },
        { provide: SmsService, useValue: context.smsService },
        { provide: WechatService, useValue: context.wechatService },
        { provide: UserService, useValue: {
          updateLastLogin: jest.fn().mockResolvedValue({}),
          updateUserFromWechat: jest.fn().mockResolvedValue({}),
        }},
        {
          provide: 'UserModel',
          useValue: MockFactory.createUserModel(mockUsers),
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // 重置所有Mock调用记录
    jest.clearAllMocks();
  });

  describe('发送验证码', () => {
    const phoneNumber = '13800138000';

    it('应该成功发送验证码到有效手机号', async () => {
      // Arrange - 准备测试数据和Mock
      context.redisStore.set(`sms:rate:${phoneNumber}`, null); // 没有发送记录

      // Act - 执行被测试的方法
      const result = await service.sendVerificationCode(phoneNumber);

      // Assert - 验证行为（不是实现细节）
      expect(result).toHaveProperty('expiresAt');
      expect(result.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));

      // 验证Redis中存储了验证码
      expect(context.redisService.hset).toHaveBeenCalledWith(
        `sms:code:${phoneNumber}`,
        'code',
        expect.any(String),
      );
      expect(context.redisService.hset).toHaveBeenCalledWith(
        `sms:code:${phoneNumber}`,
        'createdAt',
        expect.any(String),
      );

      // 验证设置了发送频率限制
      expect(context.redisService.set).toHaveBeenCalledWith(
        `sms:rate:${phoneNumber}`,
        expect.any(String),
        60,
      );

      // 验证短信服务被调用（不是验证具体参数）
      expect(context.smsService.sendVerificationCode).toHaveBeenCalledWith(
        phoneNumber,
        expect.any(String),
      );
    });

    it('应该拒绝无效的手机号格式', async () => {
      // Arrange
      const invalidPhone = '12345';

      // Act & Assert
      await expect(service.sendVerificationCode(invalidPhone)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.sendVerificationCode(invalidPhone)).rejects.toThrow(
        '手机号格式不正确',
      );

      // 验证没有调用短信服务
      expect(context.smsService.sendVerificationCode).not.toHaveBeenCalled();
    });

    it('应该在发送间隔期内拒绝重复发送', async () => {
      // Arrange - 模拟60秒内已经发送过
      context.redisStore.set(`sms:rate:${phoneNumber}`, Date.now().toString());

      // Act & Assert
      await expect(service.sendVerificationCode(phoneNumber)).rejects.toThrow(
        '发送过于频繁',
      );

      // 验证没有再次发送短信
      expect(context.smsService.sendVerificationCode).not.toHaveBeenCalled();
    });

    it('应该在验证失败次数过多时锁定用户', async () => {
      // Arrange - 模拟已失败5次
      context.redisStore.set(`sms:attempts:${phoneNumber}`, '5');

      // Act & Assert
      await expect(service.sendVerificationCode(phoneNumber)).rejects.toThrow(
        '验证失败次数过多',
      );
    });

    it('应该在验证码包含简单数字时重新生成', async () => {
      // 这个测试验证验证码生成的质量
      // 但我们不测试私有方法generateCode()，而是通过行为验证

      // Arrange
      const validCodes: string[] = [];
      const originalHset = context.redisService.hset.bind(context.redisService);
      context.redisService.hset = jest.fn((key, field, value) => {
        if (field === 'code') {
          validCodes.push(value);
        }
        return originalHset(key, field, value);
      });

      // Act - 发送多次，确保不会生成简单验证码
      for (let i = 0; i < 20; i++) {
        context.clearRedisStore();
        await service.sendVerificationCode(phoneNumber);
      }

      // Assert - 验证没有简单验证码
      const simplePatterns = /^(\d)\1{5}$|^123456|234567|345678|456789|987654|876543|765432|654321$/;
      const hasSimpleCode = validCodes.some(code => simplePatterns.test(code));
      expect(hasSimpleCode).toBe(false);
    });
  });

  describe('验证码登录', () => {
    const phoneNumber = '13800138000';
    const validCode = '123456';

    beforeEach(() => {
      // 设置验证码
      const codeData = new VerificationCodeDataBuilder()
        .withCode(validCode)
        .buildAsHash();
      context.setRedisHash(`sms:code:${phoneNumber}`, 'code', codeData.code);
      context.setRedisHash(`sms:code:${phoneNumber}`, 'createdAt', codeData.createdAt);
      context.setRedisHash(`sms:code:${phoneNumber}`, 'expiresAt', codeData.expiresAt);
      context.setRedisHash(`sms:code:${phoneNumber}`, 'attempts', codeData.attempts);
    });

    it('应该使用有效验证码成功登录新用户', async () => {
      // Arrange - 没有现有用户
      mockUsers = [];

      // Act
      const result = await service.loginWithCode(phoneNumber, validCode);

      // Assert - 验证返回的认证信息
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn');
      expect(result).toHaveProperty('user');

      expect(result.user).toMatchObject({
        phoneNumber: '138****8000', // 手机号被脱敏
        nickname: '',
        isGuest: false,
      });

      expect(result.user.membership).toMatchObject({
        type: 'free',
        level: 0,
      });

      // 验证验证码被删除
      expect(context.redisService.del).toHaveBeenCalledWith(`sms:code:${phoneNumber}`);
      expect(context.redisService.del).toHaveBeenCalledWith(`sms:attempts:${phoneNumber}`);
    });

    it('应该使用有效验证码成功登录现有用户', async () => {
      // Arrange - 创建现有用户
      const existingUser = new UserDataBuilder()
        .withPhoneNumber(phoneNumber)
        .withNickname('老用户')
        .buildDocument();
      mockUsers.push(existingUser);

      // Act
      const result = await service.loginWithCode(phoneNumber, validCode);

      // Assert - 返回现有用户的信息
      expect(result.user.nickname).toBe('老用户');
    });

    it('应该拒绝不存在的验证码', async () => {
      // Arrange
      context.clearRedisStore();

      // Act & Assert
      await expect(service.loginWithCode(phoneNumber, '000000')).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.loginWithCode(phoneNumber, '000000')).rejects.toThrow(
        '验证码不存在或已过期',
      );
    });

    it('应该拒绝过期的验证码', async () => {
      // Arrange - 创建过期验证码
      context.clearRedisStore();
      const expiredCodeData = new VerificationCodeDataBuilder()
        .expired()
        .buildAsHash();
      context.setRedisHash(`sms:code:${phoneNumber}`, 'code', expiredCodeData.code);
      context.setRedisHash(`sms:code:${phoneNumber}`, 'expiresAt', expiredCodeData.expiresAt);

      // Act & Assert
      await expect(service.loginWithCode(phoneNumber, validCode)).rejects.toThrow(
        '验证码已过期',
      );
    });

    it('应该拒绝错误的验证码并记录尝试次数', async () => {
      // Act
      const wrongCode = '654321';
      await expect(service.loginWithCode(phoneNumber, wrongCode)).rejects.toThrow(
        '验证码错误',
      );

      // Assert - 验证尝试次数被记录
      expect(context.redisService.hset).toHaveBeenCalledWith(
        `sms:code:${phoneNumber}`,
        'attempts',
        '1',
      );
    });

    it('应该在验证码错误次数过多时锁定', async () => {
      // Arrange - 设置已有4次失败
      context.setRedisHash(`sms:code:${phoneNumber}`, 'attempts', '4');

      // Act & Assert
      await expect(service.loginWithCode(phoneNumber, '654321')).rejects.toThrow(
        '验证失败次数过多',
      );

      // 验证验证码被删除
      expect(context.redisService.del).toHaveBeenCalledWith(`sms:code:${phoneNumber}`);
    });

    it('应该在成功登录后更新用户最后登录时间', async () => {
      // Arrange
      const existingUser = new UserDataBuilder()
        .withPhoneNumber(phoneNumber)
        .withLastLoginAt(new Date('2024-01-01'))
        .buildDocument();
      mockUsers.push(existingUser);

      const beforeLogin = existingUser.lastLoginAt;

      // Act
      await service.loginWithCode(phoneNumber, validCode);

      // Assert
      expect(existingUser.lastLoginAt.getTime()).toBeGreaterThan(beforeLogin.getTime());
    });
  });

  describe('Token刷新', () => {
    it('应该使用有效的refresh_token生成新token', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';
      const userId = '507f1f77bcf86cd799439011';
      const mockUser = new UserDataBuilder()
        .withId(userId)
        .buildDocument();
      mockUsers.push(mockUser);

      (context.jwtService.verify as jest.Mock).mockReturnValue({
        sub: userId,
        type: 'refresh',
      });

      // Act
      const result = await service.refreshToken(refreshToken);

      // Assert
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(context.jwtService.verify).toHaveBeenCalledWith(refreshToken);
    });

    it('应该拒绝无效的refresh_token类型', async () => {
      // Arrange
      const refreshToken = 'access-token-instead';
      (context.jwtService.verify as jest.Mock).mockReturnValue({
        sub: 'user-id',
        type: 'access', // 错误的类型
      });

      // Act & Assert - catch块覆盖了特定错误消息
      await expect(service.refreshToken(refreshToken)).rejects.toThrow(
        '无效的Token',
      );
    });

    it('应该拒绝不存在的用户token刷新', async () => {
      // Arrange
      const refreshToken = 'valid-but-user-not-exist';
      (context.jwtService.verify as jest.Mock).mockReturnValue({
        sub: 'non-existent-user',
        type: 'refresh',
      });

      // Act & Assert - catch块覆盖了特定错误消息
      await expect(service.refreshToken(refreshToken)).rejects.toThrow('无效的Token');
    });
  });

  describe('登出', () => {
    it('应该将token加入黑名单', async () => {
      // Arrange
      const userId = 'user-123';
      const tokenId = 'token-123';

      // Act
      await service.logout(userId, tokenId);

      // Assert
      expect(context.redisService.set).toHaveBeenCalledWith(
        `auth:blacklist:${tokenId}`,
        '1',
        900, // 15分钟 = 900秒
      );
    });
  });

  describe('微信小程序登录', () => {
    const mockWechatCode = '071Abc2def3GHI4jklm5no6pqr7stu8';

    it('应该使用微信code成功登录新用户', async () => {
      // Arrange
      mockUsers = [];
      context.wechatService.miniProgramLogin = jest.fn().mockResolvedValue({
        openid: 'oXYZ1234567890',
        unionid: 'uABC1234567890',
        session_key: 'mock-session-key',
      });

      // Act
      const result = await service.loginWithWechatMiniProgram(mockWechatCode);

      // Assert
      expect(result).toHaveProperty('accessToken');
      expect(result.user).toHaveProperty('id');
      expect(context.wechatService.miniProgramLogin).toHaveBeenCalledWith(mockWechatCode);
    });

    it('应该支持微信老用户登录', async () => {
      // Arrange - 创建已有微信用户
      const existingUser = new UserDataBuilder()
        .withUnionId('uABC1234567890')
        .withNickname('老微信用户')
        .buildDocument();
      mockUsers.push(existingUser);

      // Act
      const result = await service.loginWithWechatMiniProgram(mockWechatCode, {
        nickname: '新昵称',
      });

      // Assert - 保持原昵称（因为已有昵称）
      expect(result.user.nickname).toBe('老微信用户');
    });

    it('应该处理微信API错误', async () => {
      // Arrange
      context.wechatService.miniProgramLogin = jest.fn().mockRejectedValue(
        new Error('微信API错误'),
      );

      // Act & Assert
      await expect(
        service.loginWithWechatMiniProgram(mockWechatCode),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('微信APP登录', () => {
    const mockWechatCode = 'wechat-app-code';

    it('应该使用微信APP code成功登录', async () => {
      // Arrange
      mockUsers = [];
      context.wechatService.appLogin = jest.fn().mockResolvedValue({
        openid: 'oXYZ9999',
        unionid: 'uABC9999',
        nickname: '微信APP用户',
        headimgurl: 'https://example.com/avatar.jpg',
      });

      // Act
      const result = await service.loginWithWechatApp(mockWechatCode);

      // Assert
      expect(result).toHaveProperty('accessToken');
      expect(context.wechatService.appLogin).toHaveBeenCalledWith(mockWechatCode);
    });

    it('应该使用用户提供的昵称和头像', async () => {
      // Arrange
      mockUsers = [];
      context.wechatService.appLogin = jest.fn().mockResolvedValue({
        openid: 'oXYZ9999',
        unionid: 'uABC9999',
      });

      const userInfo = {
        nickname: '自定义昵称',
        avatar: 'https://custom.com/avatar.jpg',
      };

      // Act
      const result = await service.loginWithWechatApp(mockWechatCode, userInfo);

      // Assert
      expect(result.user.nickname).toBe(userInfo.nickname);
      expect(result.user.avatar).toBe(userInfo.avatar);
    });
  });
});
