/**
 * API基础配置
 */

const API_BASE_URL = __DEV__
  ? 'http://localhost:3000/api/v1'
  : 'https://api.zhouyi.com/api/v1';

/**
 * 平台类型
 */
type Platform = 'weapp' | 'web' | 'rn';

/**
 * 检测当前平台
 */
function detectPlatform(): Platform {
  // 小程序环境
  if (typeof wx !== 'undefined' && wx.request) {
    return 'weapp';
  }
  // React Native 环境
  if (typeof (global as any).navigator !== 'undefined' && (global as any).navigator.product === 'ReactNative') {
    return 'rn';
  }
  // Web 环境
  return 'web';
}

/**
 * 当前平台
 */
const currentPlatform = detectPlatform();

/**
 * 请求配置接口
 */
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  data?: any;
  timeout?: number;
}

/**
 * 小程序请求适配器
 */
function weappRequest(
  url: string,
  options: RequestOptions
): Promise<any> {
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: options.method || 'GET',
      data: options.data,
      header: options.headers,
      timeout: options.timeout || 30000,
      success: (res: any) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res);
        } else {
          reject(new Error(`请求失败: ${res.statusCode}`));
        }
      },
      fail: (err: any) => {
        reject(new Error(err.errMsg || '网络请求失败'));
      },
    });
  });
}

/**
 * Web 请求适配器
 */
async function webRequest(
  url: string,
  options: RequestOptions
): Promise<any> {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: options.headers,
    body: options.data ? JSON.stringify(options.data) : undefined,
  });
  return response;
}

/**
 * 统一请求函数
 */
async function unifiedRequest(
  url: string,
  options: RequestOptions
): Promise<any> {
  switch (currentPlatform) {
    case 'weapp':
      return weappRequest(url, options);
    case 'web':
    case 'rn':
      return webRequest(url, options);
    default:
      // 默认使用 Web 请求
      return webRequest(url, options);
  }
}

/**
 * API请求封装
 */
export class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * 设置认证Token
   */
  setToken(token: string) {
    this.token = token;
  }

  /**
   * 获取Token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * 清除Token
   */
  clearToken() {
    this.token = null;
  }

  /**
   * 通用请求方法
   */
  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await unifiedRequest(url, {
        method: options.method || 'GET',
        headers,
        data: options.data,
        timeout: options.timeout || 30000,
      });

      // 统一处理响应数据
      let data: any;
      if (response.data) {
        // 小程序响应
        data = response.data;
      } else {
        // Web/React Native 响应
        data = await response.json();
      }

      // 检查响应状态
      const statusCode = response.statusCode || response.status;
      if (statusCode >= 200 && statusCode < 300) {
        if (!data.success && data.code !== 0 && data.code !== 200) {
          throw new Error(data.error?.message || data.message || '请求失败');
        }
        return data.data || data;
      } else {
        throw new Error(data.error?.message || data.message || `请求失败: ${statusCode}`);
      }
    } catch (error) {
      console.error('API请求失败:', error);
      throw error;
    }
  }

  /**
   * GET请求
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST请求
   */
  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      data,
    });
  }

  /**
   * PUT请求
   */
  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      data,
    });
  }

  /**
   * DELETE请求
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

/**
 * API客户端实例
 */
export const apiClient = new ApiClient();
