/**
 * 微信SDK服务
 * 封装微信登录、分享等功能
 */

import { Platform } from 'react-native';
import { authService } from './auth';

// 微信SDK模块（动态导入）
let WeChat: any = null;

/**
 * 初始化微信SDK
 * 在App启动时调用
 */
export const initWeChat = async (appId: string): Promise<boolean> => {
  try {
    // 动态导入微信SDK
    if (!WeChat) {
      try {
        WeChat = require('react-native-wechat-lib').default;
      } catch (e) {
        console.warn('微信SDK未安装，跳过初始化');
        return false;
      }
    }

    if (WeChat) {
      await WeChat.registerApp(appId, 'universalLink');
      console.log('微信SDK初始化成功');
      return true;
    }
    return false;
  } catch (error) {
    console.error('微信SDK初始化失败:', error);
    return false;
  }
};

/**
 * 检查微信是否已安装
 */
export const isWeChatInstalled = async (): Promise<boolean> => {
  if (!WeChat) {
    try {
      WeChat = require('react-native-wechat-lib').default;
    } catch (e) {
      return false;
    }
  }

  try {
    return await WeChat.isWXAppInstalled();
  } catch (error) {
    console.error('检查微信安装状态失败:', error);
    return false;
  }
};

/**
 * 微信登录（APP端）
 */
export const loginWithWeChatApp = async (): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    // 检查微信SDK
    if (!WeChat) {
      try {
        WeChat = require('react-native-wechat-lib').default;
      } catch (e) {
        return {
          success: false,
          error: '微信SDK未正确配置，请稍后重试',
        };
      }
    }

    // 检查微信是否已安装
    const isInstalled = await isWeChatInstalled();
    if (!isInstalled) {
      return {
        success: false,
        error: '未检测到微信应用，请先安装微信',
      };
    }

    // 发起微信授权登录
    const response = await WeChat.sendAuthRequest(
      'snsapi_userinfo', // 获取用户信息
      'zhouyi_app_login' // 用于防止CSRF攻击
    );

    if (!response || !response.code) {
      return {
        success: false,
        error: '微信授权失败，请重试',
      };
    }

    // 使用授权码登录后端
    await authService.loginWithWechatApp({
      code: response.code,
    });

    return { success: true };
  } catch (error: any) {
    console.error('微信登录失败:', error);
    return {
      success: false,
      error: error.message || '微信登录失败，请稍后重试',
    };
  }
};

/**
 * 获取微信版本号
 */
export const getWeChatApiVersion = async (): Promise<string> => {
  if (!WeChat) {
    try {
      WeChat = require('react-native-wechat-lib').default;
    } catch (e) {
      return '0.0.0';
    }
  }

  try {
    return await WeChat.getWXApiVersion();
  } catch (error) {
    return '0.0.0';
  }
};

/**
 * 微信分享（预留接口）
 */
export const shareToWeChat = async (
  type: 'text' | 'image' | 'link' | 'music' | 'video',
  data: any
): Promise<boolean> => {
  if (!WeChat) {
    return false;
  }

  try {
    // TODO: 实现分享功能
    return true;
  } catch (error) {
    console.error('微信分享失败:', error);
    return false;
  }
};
