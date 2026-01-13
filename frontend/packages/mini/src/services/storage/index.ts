/**
 * 本地存储模块导出
 */

export { storageService, StorageService } from './storage.service';
export { localDBService, LocalDBService, LocalTable } from './local-db.service';
export { cacheStrategyService, CacheStrategyService } from './cache-strategy.service';

// 重新导出类型
export type { StorageOptions } from './storage.service';
export type { LocalData, QueryCondition } from './local-db.service';
export type { CacheConfig, CourseData, DivinationRecordData, LearningProgressData } from './cache-strategy.service';
