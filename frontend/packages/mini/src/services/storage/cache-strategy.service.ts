/**
 * 缓存策略服务
 * 负责管理课程和历史记录的离线缓存策略
 */

import { localDBService, LocalTable } from './local-db.service';

// 课程数据类型(从后端ICourseData简化)
export interface CourseData {
  courseId: string;
  title: string;
  description: string;
  order: number;
  duration: number;
  difficulty: number;
  tags: string[];
  content: Array<{
    type: 'text' | 'image' | 'diagram' | 'quote';
    content: string;
    imageUrl?: string;
    caption?: string;
  }>;
  quiz?: any;
}

// 卜卦记录类型(从后端DivinationRecord简化)
export interface DivinationRecordData {
  _id: string;
  hexagram: {
    primary: {
      name: string;
      symbol: string;
      pinyin: string;
      sequence: number;
    };
    changed: {
      name: string;
      symbol: string;
      pinyin: string;
      sequence: number;
    };
    mutual: {
      name: string;
      symbol: string;
      pinyin: string;
      sequence: number;
    };
    changingLines: number[];
  };
  preciseInfo?: {
    name: string;
    gender: 'male' | 'female';
    birthDate: Date;
    question: string;
  };
  interpretation: {
    basic: {
      hexagramName: string;
      guaci: string;
      guaciTranslation: string;
      yaoci: Array<{
        position: number;
        original: string;
        translation: string;
      }>;
    };
    detailed?: {
      changingAnalysis: string;
      mutualAnalysis: string;
      timingAnalysis: string;
      advice: string;
    };
    precise?: string;
  };
  payment?: {
    type: 'free' | 'single' | 'membership';
    amount: number;
    status: 'unpaid' | 'paid' | 'refunded';
  };
  isFavorite: boolean;
  createdAt: string;
  syncAt: string;
}

// 学习进度类型
export interface LearningProgressData {
  courseId: string;
  completedChapters: string[];
  lastReadChapter: string;
  progress: number; // 0-100
  quizCompleted?: boolean;
  quizScore?: number;
  lastReadTime: number;
}

// 缓存配置
export interface CacheConfig {
  maxSize: number; // 最大缓存条数
  ttl: number; // 缓存时间(秒)
  strategy: 'lru' | 'fifo' | 'manual'; // 缓存淘汰策略
}

// 缓存策略配置
const CACHE_CONFIGS: Record<string, CacheConfig> = {
  [LocalTable.COURSES]: {
    maxSize: 50, // 最多缓存50个课程
    ttl: 30 * 24 * 60 * 60, // 30天
    strategy: 'lru', // 最近最少使用淘汰
  },
  [LocalTable.LEARNING_PROGRESS]: {
    maxSize: 100, // 最多100条学习进度
    ttl: 90 * 24 * 60 * 60, // 90天
    strategy: 'manual', // 手动管理
  },
  [LocalTable.DIVINATION_HISTORY]: {
    maxSize: 100, // 最多100条历史记录
    ttl: 365 * 24 * 60 * 60, // 1年
    strategy: 'fifo', // 先进先出淘汰
  },
};

export class CacheStrategyService {
  private static instance: CacheStrategyService;

  private constructor() {}

  static getInstance(): CacheStrategyService {
    if (!CacheStrategyService.instance) {
      CacheStrategyService.instance = new CacheStrategyService();
    }
    return CacheStrategyService.instance;
  }

  /**
   * 缓存课程数据
   * @param courseId 课程ID
   * @param data 课程数据
   */
  async cacheCourse(courseId: string, data: CourseData): Promise<boolean> {
    try {
      const config = CACHE_CONFIGS[LocalTable.COURSES];

      // 检查是否超过最大缓存数
      const allCourses = await localDBService.getAll(LocalTable.COURSES);
      if (allCourses.length >= config.maxSize) {
        await this.evictCache(LocalTable.COURSES, config.strategy);
      }

      return await localDBService.upsert(LocalTable.COURSES, courseId, data, 'synced');
    } catch (error) {
      console.error('[CacheStrategyService] cacheCourse error:', error);
      return false;
    }
  }

  /**
   * 批量缓存课程数据
   */
  async cacheCourses(courses: CourseData[]): Promise<boolean> {
    try {
      const config = CACHE_CONFIGS[LocalTable.COURSES];

      for (const course of courses) {
        await this.cacheCourse(course.courseId, course);
      }

      return true;
    } catch (error) {
      console.error('[CacheStrategyService] cacheCourses error:', error);
      return false;
    }
  }

  /**
   * 获取缓存的课程
   */
  async getCachedCourse(courseId: string): Promise<CourseData | null> {
    try {
      return await localDBService.getById<CourseData>(LocalTable.COURSES, courseId);
    } catch (error) {
      console.error('[CacheStrategyService] getCachedCourse error:', error);
      return null;
    }
  }

  /**
   * 获取所有缓存课程
   */
  async getAllCachedCourses(): Promise<CourseData[]> {
    try {
      return await localDBService.getAll<CourseData>(LocalTable.COURSES);
    } catch (error) {
      console.error('[CacheStrategyService] getAllCachedCourses error:', error);
      return [];
    }
  }

  /**
   * 缓存卜卦历史记录
   */
  async cacheDivinationRecord(recordId: string, data: DivinationRecordData): Promise<boolean> {
    try {
      const config = CACHE_CONFIGS[LocalTable.DIVINATION_HISTORY];

      // 检查是否超过最大缓存数
      const allRecords = await localDBService.getAll(LocalTable.DIVINATION_HISTORY);
      if (allRecords.length >= config.maxSize) {
        await this.evictCache(LocalTable.DIVINATION_HISTORY, config.strategy);
      }

      return await localDBService.upsert(LocalTable.DIVINATION_HISTORY, recordId, data, 'synced');
    } catch (error) {
      console.error('[CacheStrategyService] cacheDivinationRecord error:', error);
      return false;
    }
  }

  /**
   * 批量缓存卜卦历史记录
   */
  async cacheDivinationRecords(records: DivinationRecordData[]): Promise<boolean> {
    try {
      for (const record of records) {
        await this.cacheDivinationRecord(record._id, record);
      }
      return true;
    } catch (error) {
      console.error('[CacheStrategyService] cacheDivinationRecords error:', error);
      return false;
    }
  }

  /**
   * 获取缓存的卜卦记录
   */
  async getCachedDivinationRecord(recordId: string): Promise<DivinationRecordData | null> {
    try {
      return await localDBService.getById<DivinationRecordData>(LocalTable.DIVINATION_HISTORY, recordId);
    } catch (error) {
      console.error('[CacheStrategyService] getCachedDivinationRecord error:', error);
      return null;
    }
  }

  /**
   * 获取所有缓存的卜卦记录
   */
  async getAllCachedDivinationRecords(): Promise<DivinationRecordData[]> {
    try {
      return await localDBService.getAll<DivinationRecordData>(LocalTable.DIVINATION_HISTORY);
    } catch (error) {
      console.error('[CacheStrategyService] getAllCachedDivinationRecords error:', error);
      return [];
    }
  }

  /**
   * 保存学习进度
   */
  async saveLearningProgress(courseId: string, progress: LearningProgressData): Promise<boolean> {
    try {
      const config = CACHE_CONFIGS[LocalTable.LEARNING_PROGRESS];

      // 检查是否超过最大缓存数
      const allProgress = await localDBService.getAll(LocalTable.LEARNING_PROGRESS);
      if (allProgress.length >= config.maxSize) {
        // 删除最旧的进度记录
        const sorted = (allProgress as any).sort((a: any, b: any) => a.lastReadTime - b.lastReadTime);
        if (sorted.length > 0) {
          await localDBService.delete(LocalTable.LEARNING_PROGRESS, sorted[0].id);
        }
      }

      return await localDBService.upsert(LocalTable.LEARNING_PROGRESS, courseId, progress, 'pending');
    } catch (error) {
      console.error('[CacheStrategyService] saveLearningProgress error:', error);
      return false;
    }
  }

  /**
   * 获取学习进度
   */
  async getLearningProgress(courseId: string): Promise<LearningProgressData | null> {
    try {
      return await localDBService.getById<LearningProgressData>(LocalTable.LEARNING_PROGRESS, courseId);
    } catch (error) {
      console.error('[CacheStrategyService] getLearningProgress error:', error);
      return null;
    }
  }

  /**
   * 获取所有学习进度
   */
  async getAllLearningProgress(): Promise<LearningProgressData[]> {
    try {
      return await localDBService.getAll<LearningProgressData>(LocalTable.LEARNING_PROGRESS);
    } catch (error) {
      console.error('[CacheStrategyService] getAllLearningProgress error:', error);
      return [];
    }
  }

  /**
   * 缓存淘汰策略
   */
  private async evictCache(table: LocalTable, strategy: 'lru' | 'fifo' | 'manual'): Promise<void> {
    if (strategy === 'manual') {
      // 手动管理,不自动淘汰
      return;
    }

    const allData = await localDBService.getAll(table);
    if (allData.length === 0) {
      return;
    }

    let itemToRemove: any;

    if (strategy === 'lru') {
      // 最近最少使用:按更新时间排序,删除最旧的
      const sorted = (allData as any).sort((a: any, b: any) => a.updatedAt - b.updatedAt);
      itemToRemove = sorted[0];
    } else if (strategy === 'fifo') {
      // 先进先出:按创建时间排序,删除最早的
      const sorted = (allData as any).sort((a: any, b: any) => a.createdAt - b.createdAt);
      itemToRemove = sorted[0];
    }

    if (itemToRemove) {
      await localDBService.delete(table, itemToRemove.id);
      console.log(`[CacheStrategyService] Evicted item ${itemToRemove.id} from ${table} using ${strategy} strategy`);
    }
  }

  /**
   * 清理过期缓存
   */
  async cleanExpiredCache(): Promise<void> {
    try {
      const tables = [LocalTable.COURSES, LocalTable.DIVINATION_HISTORY, LocalTable.LEARNING_PROGRESS];

      for (const table of tables) {
        const config = CACHE_CONFIGS[table];
        const allData = await localDBService.getAll(table);
        const now = Date.now();

        for (const item of allData as any) {
          const age = (now - item.createdAt) / 1000; // 转换为秒
          if (age > config.ttl) {
            await localDBService.delete(table, item.id);
            console.log(`[CacheStrategyService] Cleaned expired item ${item.id} from ${table}`);
          }
        }
      }
    } catch (error) {
      console.error('[CacheStrategyService] cleanExpiredCache error:', error);
    }
  }

  /**
   * 预热缓存(加载常用数据)
   */
  async warmupCache(apiBaseUrl: string, token?: string): Promise<void> {
    try {
      // 这里可以从API加载常用数据
      // 例如:最近学习的课程、最近的卜卦记录等
      console.log('[CacheStrategyService] Cache warmup started');

      // TODO: 实现具体的预热逻辑
      // const recentCourses = await fetchRecentCourses(apiBaseUrl, token);
      // await this.cacheCourses(recentCourses);

      console.log('[CacheStrategyService] Cache warmup completed');
    } catch (error) {
      console.error('[CacheStrategyService] warmupCache error:', error);
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheStats(): Promise<Record<string, any>> {
    try {
      const stats: Record<string, any> = {};

      for (const table of [LocalTable.COURSES, LocalTable.DIVINATION_HISTORY, LocalTable.LEARNING_PROGRESS]) {
        const allData = await localDBService.getAll(table);
        const config = CACHE_CONFIGS[table];

        stats[table] = {
          count: allData.length,
          maxSize: config.maxSize,
          usagePercent: ((allData.length / config.maxSize) * 100).toFixed(2) + '%',
          strategy: config.strategy,
        };
      }

      return stats;
    } catch (error) {
      console.error('[CacheStrategyService] getCacheStats error:', error);
      return {};
    }
  }

  /**
   * 清空所有缓存
   */
  async clearAllCache(): Promise<boolean> {
    try {
      await localDBService.clearTable(LocalTable.COURSES);
      await localDBService.clearTable(LocalTable.DIVINATION_HISTORY);
      await localDBService.clearTable(LocalTable.LEARNING_PROGRESS);
      return true;
    } catch (error) {
      console.error('[CacheStrategyService] clearAllCache error:', error);
      return false;
    }
  }
}

// 导出单例
export const cacheStrategyService = CacheStrategyService.getInstance();
