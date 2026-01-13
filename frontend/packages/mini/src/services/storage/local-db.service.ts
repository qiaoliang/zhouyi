/**
 * 本地数据库服务
 * 管理离线数据的增删改查操作
 */

import { storageService } from './storage.service';

// 数据表枚举
export enum LocalTable {
  COURSES = 'courses', // 课程表
  LEARNING_PROGRESS = 'learning_progress', // 学习进度表
  DIVINATION_HISTORY = 'divination_history', // 卜卦历史表
  USER_CONFIG = 'user_config', // 用户配置表
  HEXAGRAM_DATA = 'hexagram_data', // 卦象数据表
}

// 通用数据接口
interface LocalData<T> {
  id: string;
  data: T;
  createdAt: number;
  updatedAt: number;
  syncStatus?: 'synced' | 'pending' | 'conflict'; // 同步状态
}

// 查询条件接口
interface QueryCondition {
  id?: string;
  syncStatus?: 'synced' | 'pending' | 'conflict';
  createdAtGreaterThan?: number;
  limit?: number;
}

export class LocalDBService {
  private static instance: LocalDBService;
  private readonly CACHE_EXPIRE_DAYS = 30; // 缓存30天

  private constructor() {}

  static getInstance(): LocalDBService {
    if (!LocalDBService.instance) {
      LocalDBService.instance = new LocalDBService();
    }
    return LocalDBService.instance;
  }

  /**
   * 获取表的所有数据
   */
  async getAll<T>(table: LocalTable): Promise<T[]> {
    try {
      const data = await storageService.get<LocalData<T>[]>(table);
      return data || [];
    } catch (error) {
      console.error(`[LocalDBService] getAll ${table} error:`, error);
      return [];
    }
  }

  /**
   * 根据ID获取单条数据
   */
  async getById<T>(table: LocalTable, id: string): Promise<T | null> {
    try {
      const allData = await this.getAll<T>(table);
      return allData.find((item: any) => item.id === id) || null;
    } catch (error) {
      console.error(`[LocalDBService] getById ${table} error:`, error);
      return null;
    }
  }

  /**
   * 插入或更新数据
   */
  async upsert<T>(table: LocalTable, id: string, data: T, syncStatus: 'synced' | 'pending' = 'pending'): Promise<boolean> {
    try {
      const allData = await this.getAll(table);
      const now = Date.now();
      const index = allData.findIndex((item: any) => item.id === id);

      const newData: LocalData<T> = {
        id,
        data,
        createdAt: index >= 0 ? (allData[index] as any).createdAt : now,
        updatedAt: now,
        syncStatus,
      };

      if (index >= 0) {
        allData[index] = newData;
      } else {
        allData.push(newData);
      }

      return await storageService.setWithExpire(table, allData, this.CACHE_EXPIRE_DAYS * 24 * 60 * 60);
    } catch (error) {
      console.error(`[LocalDBService] upsert ${table} error:`, error);
      return false;
    }
  }

  /**
   * 删除数据
   */
  async delete(table: LocalTable, id: string): Promise<boolean> {
    try {
      const allData = await this.getAll(table);
      const filteredData = allData.filter((item: any) => item.id !== id);
      return await storageService.setWithExpire(table, filteredData, this.CACHE_EXPIRE_DAYS * 24 * 60 * 60);
    } catch (error) {
      console.error(`[LocalDBService] delete ${table} error:`, error);
      return false;
    }
  }

  /**
   * 清空表
   */
  async clearTable(table: LocalTable): Promise<boolean> {
    try {
      return await storageService.remove(table);
    } catch (error) {
      console.error(`[LocalDBService] clearTable ${table} error:`, error);
      return false;
    }
  }

  /**
   * 查询数据(带条件)
   */
  async query<T>(table: LocalTable, condition: QueryCondition): Promise<T[]> {
    try {
      let allData = await this.getAll<T>(table);

      // 按ID过滤
      if (condition.id) {
        allData = allData.filter((item: any) => item.id === condition.id);
      }

      // 按同步状态过滤
      if (condition.syncStatus) {
        allData = allData.filter((item: any) => item.syncStatus === condition.syncStatus);
      }

      // 按创建时间过滤
      if (condition.createdAtGreaterThan) {
        allData = allData.filter((item: any) => item.createdAt > condition.createdAtGreaterThan);
      }

      // 限制返回数量
      if (condition.limit) {
        allData = allData.slice(0, condition.limit);
      }

      return allData;
    } catch (error) {
      console.error(`[LocalDBService] query ${table} error:`, error);
      return [];
    }
  }

  /**
   * 获取待同步的数据
   */
  async getPendingSync<T>(table: LocalTable): Promise<T[]> {
    return this.query<T>(table, { syncStatus: 'pending' });
  }

  /**
   * 更新同步状态
   */
  async updateSyncStatus(table: LocalTable, id: string, status: 'synced' | 'pending' | 'conflict'): Promise<boolean> {
    try {
      const allData = await this.getAll(table);
      const index = allData.findIndex((item: any) => item.id === id);

      if (index >= 0) {
        (allData[index] as any).syncStatus = status;
        return await storageService.setWithExpire(table, allData, this.CACHE_EXPIRE_DAYS * 24 * 60 * 60);
      }

      return false;
    } catch (error) {
      console.error(`[LocalDBService] updateSyncStatus ${table} error:`, error);
      return false;
    }
  }

  /**
   * 批量更新同步状态
   */
  async batchUpdateSyncStatus(table: LocalTable, ids: string[], status: 'synced' | 'pending' | 'conflict'): Promise<boolean> {
    try {
      const allData = await this.getAll(table);
      let updated = false;

      allData.forEach((item: any) => {
        if (ids.includes(item.id)) {
          item.syncStatus = status;
          updated = true;
        }
      });

      if (updated) {
        return await storageService.setWithExpire(table, allData, this.CACHE_EXPIRE_DAYS * 24 * 60 * 60);
      }

      return true;
    } catch (error) {
      console.error(`[LocalDBService] batchUpdateSyncStatus ${table} error:`, error);
      return false;
    }
  }

  /**
   * 获取数据库统计信息
   */
  async getStats(): Promise<Record<string, number>> {
    try {
      const info = await storageService.getInfo();
      const stats: Record<string, number> = {};

      if (info) {
        info.keys.forEach((key) => {
          // 移除前缀和版本号
          const table = key.replace(/^zhouyi_v1_/, '');
          if (table) {
            stats[table] = (stats[table] || 0) + 1;
          }
        });

        stats['currentSize'] = info.currentSize;
        stats['limitSize'] = info.limitSize;
      }

      return stats;
    } catch (error) {
      console.error('[LocalDBService] getStats error:', error);
      return {};
    }
  }
}

// 导出单例
export const localDBService = LocalDBService.getInstance();
