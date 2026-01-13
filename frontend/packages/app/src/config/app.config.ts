/**
 * 应用配置
 * 包含微信AppID、API地址等配置信息
 */

/**
 * 微信配置
 */
export const WECHAT_CONFIG = {
  // 微信开放平台AppID（需要在微信开放平台注册移动应用）
  APP_ID: process.env.EXPO_PUBLIC_WECHAT_APP_ID || '',

  // 微信小程序AppID（需要在微信公众平台注册小程序）
  MINI_APP_ID: process.env.EXPO_PUBLIC_WECHAT_MINI_APP_ID || '',

  // Universal Link (iOS)
  UNIVERSAL_LINK: process.env.EXPO_PUBLIC_WECHAT_UNIVERSAL_LINK || '',
};

/**
 * API配置
 */
export const API_CONFIG = {
  // API基础URL
  BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:3000/api',

  // 超时时间（毫秒）
  TIMEOUT: 15000,
};

/**
 * 应用配置
 */
export const APP_CONFIG = {
  // 应用名称
  APP_NAME: '周易通',

  // 应用版本
  VERSION: '1.0.0',

  // 游客模式限制
  GUEST_DIVINATION_LIMIT: 2,

  // 卜卦历史每页数量
  DIVINATION_HISTORY_PAGE_SIZE: 20,
};
