/**
 * 本地存储服务
 * 基于微信小程序 Storage API 实现,用于离线数据缓存
 */

export interface StorageOptions {
  expire?: number; // 过期时间戳(毫秒)
}

export class StorageService {
  private static instance: StorageService;
  private readonly PREFIX = 'zhouyi_';
  private readonly CACHE_VERSION = 'v1';

  private constructor() {}

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * 生成带版本和前缀的key
   */
  private getKey(key: string): string {
    return `${this.PREFIX}${this.CACHE_VERSION}_${key}`;
  }

  /**
   * 存储数据
   */
  async set<T>(key: string, data: T, options?: StorageOptions): Promise<boolean> {
    try {
      // 检查 wx 对象是否存在
      if (typeof wx === 'undefined' || !wx.setStorage) {
        console.warn('[StorageService] wx.setStorage is not available');
        return false;
      }

      const storageKey = this.getKey(key);
      const value = {
        data,
        timestamp: Date.now(),
        expire: options?.expire || null,
      };

      await new Promise((resolve, reject) => {
        wx.setStorage({
          key: storageKey,
          data: value,
          success: () => resolve(true),
          fail: (err) => reject(err),
        });
      });

      return true;
    } catch (error) {
      console.error('[StorageService] set error:', error);
      return false;
    }
  }

  /**
   * 获取数据
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // 检查 wx 对象是否存在
      if (typeof wx === 'undefined' || !wx.getStorage) {
        console.warn('[StorageService] wx.getStorage is not available');
        return null;
      }

      const storageKey = this.getKey(key);

      const value = await new Promise<any>((resolve, reject) => {
        wx.getStorage({
          key: storageKey,
          success: (res) => resolve(res.data),
          fail: (err) => {
            // 数据不存在是正常情况,不报错
            if (err.errMsg && err.errMsg.includes('data not found')) {
              resolve(null);
            } else {
              reject(err);
            }
          },
        });
      });

      if (!value) {
        return null;
      }

      // 检查是否过期
      if (value.expire && Date.now() > value.expire) {
        await this.remove(key);
        return null;
      }

      return value.data as T;
    } catch (error) {
      console.error('[StorageService] get error:', error);
      return null;
    }
  }

  /**
   * 删除数据
   */
  async remove(key: string): Promise<boolean> {
    try {
      // 检查 wx 对象是否存在
      if (typeof wx === 'undefined' || !wx.removeStorage) {
        console.warn('[StorageService] wx.removeStorage is not available');
        return false;
      }

      const storageKey = this.getKey(key);

      await new Promise((resolve, reject) => {
        wx.removeStorage({
          key: storageKey,
          success: () => resolve(true),
          fail: (err) => reject(err),
        });
      });

      return true;
    } catch (error) {
      console.error('[StorageService] remove error:', error);
      return false;
    }
  }

  /**
   * 清空所有数据
   */
  async clear(): Promise<boolean> {
    try {
      // 检查 wx 对象是否存在
      if (typeof wx === 'undefined' || !wx.clearStorage) {
        console.warn('[StorageService] wx.clearStorage is not available');
        return false;
      }

      await new Promise((resolve, reject) => {
        wx.clearStorage({
          success: () => resolve(true),
          fail: (err) => reject(err),
        });
      });

      return true;
    } catch (error) {
      console.error('[StorageService] clear error:', error);
      return false;
    }
  }

  /**
   * 获取存储信息
   */
  async getInfo(): Promise<WechatMiniprogram.GetStorageInfoOptionResult | null> {
    try {
      // 检查 wx 对象是否存在
      if (typeof wx === 'undefined' || !wx.getStorageInfo) {
        console.warn('[StorageService] wx.getStorageInfo is not available');
        return null;
      }

      return await new Promise((resolve, reject) => {
        wx.getStorageInfo({
          success: (res) => resolve(res),
          fail: (err) => reject(err),
        });
      });
    } catch (error) {
      console.error('[StorageService] getInfo error:', error);
      return null;
    }
  }

  /**
   * 设置带过期时间的缓存
   */
  async setWithExpire<T>(key: string, data: T, ttlSeconds: number): Promise<boolean> {
    const expire = Date.now() + ttlSeconds * 1000;
    return this.set(key, data, { expire });
  }
}

// 导出单例
export const storageService = StorageService.getInstance();
