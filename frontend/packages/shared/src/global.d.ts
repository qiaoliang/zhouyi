/**
 * 全局类型声明
 */

// 微信小程序全局变量
declare const wx: WechatMiniprogram.Wx | {
  setStorageSync: (key: string, value: string) => void;
  getStorageSync: (key: string) => string;
  removeStorageSync: (key: string) => void;
};

// Web localStorage
declare const localStorage: {
  setItem: (key: string, value: string) => void;
  getItem: (key: string) => string | null;
  removeItem: (key: string) => void;
};

// 开发环境变量
declare const __DEV__: boolean;
