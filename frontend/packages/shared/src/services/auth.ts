/**
 * 认证服务
 * 处理用户登录、注册、Token管理等
 */

import { apiClient } from './api';
import { AuthResponse, User } from '../types';

// 存储适配器 - 支持多平台
let storageAdapter: {
  setItem: (key: string, value: string) => Promise<void> | void;
  getItem: (key: string) => Promise<string | null> | string | null;
  removeItem: (key: string) => Promise<void> | void;
} | null = null;

// 检测运行环境并初始化存储适配器
try {
  // React Native环境
  AsyncStorage = require('@react-native-async-storage/async-storage').default;
  storageAdapter = {
    setItem: async (key, value) => await AsyncStorage.setItem(key, value),
    getItem: async (key) => await AsyncStorage.getItem(key),
    removeItem: async (key) => await AsyncStorage.removeItem(key),
  };
} catch (e) {
  // 检查是否为小程序环境
  if (typeof wx !== 'undefined' && wx.setStorageSync) {
    storageAdapter = {
      setItem: (key, value) => wx.setStorageSync(key, value),
      getItem: (key) => wx.getStorageSync(key) || null,
      removeItem: (key) => wx.removeStorageSync(key),
    };
  } else if (typeof localStorage !== 'undefined') {
    // Web环境
    storageAdapter = {
      setItem: (key, value) => localStorage.setItem(key, value),
      getItem: (key) => localStorage.getItem(key),
      removeItem: (key) => localStorage.removeItem(key),
    };
  }
}

let AsyncStorage: any;

export interface SendCodeResponse {
  expiresAt: number;
}

export interface LoginParams {
  phoneNumber: string;
  code: string;
}

export interface WechatLoginParams {
  code: string;
  userInfo?: {
    nickname?: string;
    avatar?: string;
  };
}

/**
 * 存储键
 */
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_INFO: 'user_info',
  GUEST_ID: 'guest_id',
  GUEST_DIVINATION_COUNT: 'guest_divination_count',
};

/**
 * 认证服务类
 */
class AuthService {
  /**
   * 发送验证码
   */
  async sendVerificationCode(phoneNumber: string): Promise<SendCodeResponse> {
    return apiClient.post<SendCodeResponse>('/auth/send-code', {
      phoneNumber,
    });
  }

  /**
   * 手机验证码登录
   */
  async loginWithCode(params: LoginParams): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', params);

    // 保存Token和用户信息
    if (response.accessToken) {
      apiClient.setToken(response.accessToken);
      await this.saveToken(response.accessToken);
    }

    if (response.user) {
      await this.saveUserInfo(response.user);
    }

    return response;
  }

  /**
   * 微信小程序登录
   */
  async loginWithWechatMini(params: WechatLoginParams): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      '/auth/wechat/mini-login',
      params
    );

    if (response.accessToken) {
      apiClient.setToken(response.accessToken);
      await this.saveToken(response.accessToken);
    }

    if (response.user) {
      await this.saveUserInfo(response.user);
    }

    return response;
  }

  /**
   * 微信APP登录
   */
  async loginWithWechatApp(params: WechatLoginParams): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      '/auth/wechat/app-login',
      params
    );

    if (response.accessToken) {
      apiClient.setToken(response.accessToken);
      await this.saveToken(response.accessToken);
    }

    if (response.user) {
      await this.saveUserInfo(response.user);
    }

    return response;
  }

  /**
   * 游客登录
   */
  async loginAsGuest(): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/guest-login', {});

    if (response.accessToken) {
      apiClient.setToken(response.accessToken);
      await this.saveToken(response.accessToken);
    }

    if (response.user) {
      await this.saveUserInfo(response.user);
      // 保存游客ID和卜卦次数
      if (response.user.isGuest) {
        await this.setItem(STORAGE_KEYS.GUEST_ID, response.user.id);
        await this.setItem(STORAGE_KEYS.GUEST_DIVINATION_COUNT, '0');
      }
    }

    return response;
  }

  /**
   * 刷新Token
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/refresh', {
      refreshToken,
    });

    if (response.accessToken) {
      apiClient.setToken(response.accessToken);
      await this.saveToken(response.accessToken);
    }

    if (response.user) {
      await this.saveUserInfo(response.user);
    }

    return response;
  }

  /**
   * 登出
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout', {});
    } finally {
      apiClient.clearToken();
      await this.clearToken();
      await this.clearUserInfo();
      await this.clearGuestData();
    }
  }

  /**
   * 保存Token到本地存储
   */
  private async saveToken(token: string): Promise<void> {
    await this.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
  }

  /**
   * 清除本地Token
   */
  private async clearToken(): Promise<void> {
    await this.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    await this.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  /**
   * 保存用户信息
   */
  private async saveUserInfo(user: User): Promise<void> {
    await this.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(user));
  }

  /**
   * 清除用户信息
   */
  private async clearUserInfo(): Promise<void> {
    await this.removeItem(STORAGE_KEYS.USER_INFO);
  }

  /**
   * 清除游客数据
   */
  private async clearGuestData(): Promise<void> {
    await this.removeItem(STORAGE_KEYS.GUEST_ID);
    await this.removeItem(STORAGE_KEYS.GUEST_DIVINATION_COUNT);
  }

  /**
   * 从本地恢复Token
   */
  async restoreToken(): Promise<string | null> {
    const token = await this.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
      apiClient.setToken(token);
      return token;
    }
    return null;
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(): Promise<User | null> {
    const userInfoStr = await this.getItem(STORAGE_KEYS.USER_INFO);
    if (userInfoStr) {
      try {
        return JSON.parse(userInfoStr) as User;
      } catch (e) {
        console.error('解析用户信息失败:', e);
        return null;
      }
    }
    return null;
  }

  /**
   * 从服务器获取最新用户信息
   */
  async fetchUserInfo(): Promise<User> {
    return apiClient.get<User>('/auth/me');
  }

  /**
   * 判断是否为游客
   */
  async isGuest(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user?.isGuest ?? false;
  }

  /**
   * 获取游客卜卦次数
   */
  async getGuestDivinationCount(): Promise<number> {
    const count = await this.getItem(STORAGE_KEYS.GUEST_DIVINATION_COUNT);
    return count ? parseInt(count, 10) : 0;
  }

  /**
   * 增加游客卜卦次数
   */
  async incrementGuestDivinationCount(): Promise<number> {
    const currentCount = await this.getGuestDivinationCount();
    const newCount = currentCount + 1;
    await this.setItem(STORAGE_KEYS.GUEST_DIVINATION_COUNT, String(newCount));
    return newCount;
  }

  /**
   * 请求注销账户
   */
  async requestAccountDeletion(): Promise<{
    confirmationCode: string;
    expiresAt: string;
    dataDeletionInfo: any;
  }> {
    return apiClient.post('/auth/account/deletion/request', {});
  }

  /**
   * 确认注销账户
   */
  async confirmAccountDeletion(confirmation: boolean): Promise<any> {
    return apiClient.delete('/auth/account/deletion/confirm');
  }

  /**
   * 获取会员信息
   */
  async getMembershipInfo(): Promise<{
    type: 'free' | 'monthly' | 'yearly';
    expireAt: string | null;
    isExpired: boolean;
    privileges: any;
  }> {
    return apiClient.get('/membership/info');
  }

  /**
   * 通用存储方法
   */
  private async setItem(key: string, value: string): Promise<void> {
    if (storageAdapter) {
      await storageAdapter.setItem(key, value);
    }
  }

  /**
   * 通用获取方法
   */
  private async getItem(key: string): Promise<string | null> {
    if (storageAdapter) {
      return await storageAdapter.getItem(key);
    }
    return null;
  }

  /**
   * 通用删除方法
   */
  private async removeItem(key: string): Promise<void> {
    if (storageAdapter) {
      await storageAdapter.removeItem(key);
    }
  }
}

// 导出单例
export const authService = new AuthService();
