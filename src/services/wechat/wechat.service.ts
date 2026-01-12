import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { RedisService } from '../../modules/redis/redis.service';
import { wechatConfig } from '../../config/wechat.config';

/**
 * 微信登录响应接口
 */
export interface WechatAuthResponse {
  openid: string;
  unionid?: string;
  session_key?: string;
  errcode?: number;
  errmsg?: string;
}

/**
 * 微信用户信息接口
 */
export interface WechatUserInfo {
  openid: string;
  unionid?: string;
  nickname?: string;
  headimgurl?: string;
  sex?: number;
  province?: string;
  city?: string;
  country?: string;
}

/**
 * 微信Access Token响应
 */
export interface WechatAccessTokenResponse {
  access_token: string;
  expires_in: number;
  errcode?: number;
  errmsg?: string;
}

/**
 * 微信服务
 * 处理微信登录、获取用户信息等功能
 */
@Injectable()
export class WechatService {
  private readonly logger = new Logger(WechatService.name);
  private readonly axiosInstance: AxiosInstance;

  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
  ) {
    this.axiosInstance = axios.create({
      timeout: 10000,
    });
  }

  /**
   * 小程序登录：通过code换取openid和session_key
   * @param code 微信小程序wx.login返回的code
   * @returns openid, unionid, session_key
   */
  async miniProgramLogin(code: string): Promise<WechatAuthResponse> {
    const appId = wechatConfig.miniProgram.appId;
    const appSecret = wechatConfig.miniProgram.appSecret;

    if (!appId || !appSecret) {
      throw new Error('微信小程序配置未设置');
    }

    const url = wechatConfig.api.jscode2session;
    const params = {
      appid: appId,
      secret: appSecret,
      js_code: code,
      grant_type: 'authorization_code',
    };

    try {
      this.logger.log(`小程序登录请求: ${url}`);
      const response = await this.axiosInstance.get<WechatAuthResponse>(url, { params });
      const data = response.data;

      // 检查微信API错误
      if (data.errcode && data.errcode !== 0) {
        this.logger.error(`微信API错误: ${data.errcode} - ${data.errmsg}`);
        throw new UnauthorizedException(`微信登录失败: ${data.errmsg}`);
      }

      if (!data.openid) {
        throw new UnauthorizedException('微信登录失败: 未返回openid');
      }

      // 缓存session_key（可选，用于解密敏感数据）
      if (data.session_key) {
        const cacheKey = `${wechatConfig.cachePrefix.sessionKey}${data.openid}`;
        await this.redisService.set(cacheKey, data.session_key, 7200); // 2小时过期
      }

      this.logger.log(`小程序登录成功: openid=${data.openid}`);
      return data;
    } catch (error) {
      this.logger.error('小程序登录失败', error.message);
      throw new UnauthorizedException('微信登录失败，请重试');
    }
  }

  /**
   * APP端登录：通过code换取access_token和用户信息
   * @param code 微信APP授权后获取的code
   * @returns 用户信息
   */
  async appLogin(code: string): Promise<WechatAuthResponse & WechatUserInfo> {
    const appId = wechatConfig.app.appId;
    const appSecret = wechatConfig.app.appSecret;

    if (!appId || !appSecret) {
      throw new Error('微信APP配置未设置');
    }

    // 第一步：通过code获取access_token
    let accessToken: string;
    try {
      accessToken = await this.getAppAccessToken();
    } catch (error) {
      this.logger.error('获取微信access_token失败', error.message);
      throw new UnauthorizedException('微信登录失败，请重试');
    }

    // 第二步：通过access_token和code获取用户信息
    const url = wechatConfig.api.appUserInfo;
    const params = {
      access_token: accessToken,
      openid: code, // APP端此处使用code作为临时标识
    };

    try {
      const response = await this.axiosInstance.get<WechatUserInfo & { errcode?: number; errmsg?: string }>(url, {
        params,
      });
      const data = response.data;

      // 检查微信API错误
      if (data.errcode && data.errcode !== 0) {
        this.logger.error(`微信API错误: ${data.errcode} - ${data.errmsg}`);
        throw new UnauthorizedException(`微信登录失败: ${data.errmsg}`);
      }

      if (!data.openid) {
        throw new UnauthorizedException('微信登录失败: 未返回openid');
      }

      this.logger.log(`APP登录成功: openid=${data.openid}`);
      return {
        openid: data.openid,
        unionid: data.unionid,
        ...data,
      };
    } catch (error) {
      this.logger.error('APP获取用户信息失败', error.message);
      throw new UnauthorizedException('微信登录失败，请重试');
    }
  }

  /**
   * 获取微信access_token（APP端使用）
   * 注意：access_token有7200秒有效期，需要缓存
   */
  private async getAppAccessToken(): Promise<string> {
    const cacheKey = `${wechatConfig.cachePrefix.accessToken}app`;

    // 先尝试从缓存获取
    const cachedToken = await this.redisService.get(cacheKey);
    if (cachedToken) {
      return cachedToken;
    }

    // 缓存不存在，重新获取
    const appId = wechatConfig.app.appId;
    const appSecret = wechatConfig.app.appSecret;
    const url = wechatConfig.api.appAccessToken;
    const params = {
      grant_type: 'client_credential',
      appid: appId,
      secret: appSecret,
    };

    try {
      const response = await this.axiosInstance.get<WechatAccessTokenResponse>(url, { params });
      const data = response.data;

      if (data.errcode && data.errcode !== 0) {
        throw new Error(`获取access_token失败: ${data.errmsg}`);
      }

      if (!data.access_token) {
        throw new Error('获取access_token失败: 未返回access_token');
      }

      // 缓存access_token（提前5分钟过期）
      const expiresIn = (data.expires_in || 7200) - 300;
      await this.redisService.set(cacheKey, data.access_token, expiresIn);

      return data.access_token;
    } catch (error) {
      this.logger.error('获取access_token失败', error.message);
      throw error;
    }
  }

  /**
   * 缓存session_key
   * @param openid 用户openid
   * @param sessionKey 会话密钥
   */
  async cacheSessionKey(openid: string, sessionKey: string): Promise<void> {
    const cacheKey = `${wechatConfig.cachePrefix.sessionKey}${openid}`;
    await this.redisService.set(cacheKey, sessionKey, 7200); // 2小时过期
  }

  /**
   * 获取缓存的session_key
   * @param openid 用户openid
   */
  async getSessionKey(openid: string): Promise<string | null> {
    const cacheKey = `${wechatConfig.cachePrefix.sessionKey}${openid}`;
    return await this.redisService.get(cacheKey);
  }
}
