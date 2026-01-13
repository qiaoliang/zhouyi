/**
 * 缓存策略服务单元测试
 */

import { cacheStrategyService } from '../cache-strategy.service';
import { localDBService, LocalTable } from '../local-db.service';

// 模拟 localDBService
jest.mock('../local-db.service', () => ({
  localDBService: {
    getAll: jest.fn(),
    getById: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    clearTable: jest.fn(),
  },
  LocalTable: {
    COURSES: 'courses',
    LEARNING_PROGRESS: 'learning_progress',
    DIVINATION_HISTORY: 'divination_history',
  },
}));

describe('CacheStrategyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('cacheCourse', () => {
    it('should cache a course successfully', async () => {
      (localDBService.getAll as jest.Mock).mockResolvedValue([]);
      (localDBService.upsert as jest.Mock).mockResolvedValue(true);

      const courseData = {
        courseId: 'course-1',
        title: 'Test Course',
        description: 'Test Description',
        order: 1,
        duration: 10,
        difficulty: 1,
        tags: ['test'],
        content: [],
      };

      const result = await cacheStrategyService.cacheCourse('course-1', courseData);

      expect(result).toBe(true);
      expect(localDBService.upsert).toHaveBeenCalledWith(
        LocalTable.COURSES,
        'course-1',
        courseData,
        'synced'
      );
    });

    it('should evict oldest course when cache is full', async () => {
      const existingCourses = Array(50).fill(null).map((_, i) => ({
        id: `course-${i}`,
        data: {},
        createdAt: Date.now() - i * 1000,
        updatedAt: Date.now() - i * 1000,
      }));

      (localDBService.getAll as jest.Mock).mockResolvedValue(existingCourses);
      (localDBService.upsert as jest.Mock).mockResolvedValue(true);
      (localDBService.delete as jest.Mock).mockResolvedValue(true);

      const courseData = {
        courseId: 'course-new',
        title: 'New Course',
        description: 'New Description',
        order: 1,
        duration: 10,
        difficulty: 1,
        tags: ['test'],
        content: [],
      };

      await cacheStrategyService.cacheCourse('course-new', courseData);

      expect(localDBService.delete).toHaveBeenCalled();
      expect(localDBService.upsert).toHaveBeenCalled();
    });
  });

  describe('getCachedCourse', () => {
    it('should retrieve cached course', async () => {
      const courseData = {
        courseId: 'course-1',
        title: 'Test Course',
        description: 'Test Description',
        order: 1,
        duration: 10,
        difficulty: 1,
        tags: ['test'],
        content: [],
      };

      (localDBService.getById as jest.Mock).mockResolvedValue(courseData);

      const result = await cacheStrategyService.getCachedCourse('course-1');

      expect(result).toEqual(courseData);
      expect(localDBService.getById).toHaveBeenCalledWith(LocalTable.COURSES, 'course-1');
    });

    it('should return null when course not found', async () => {
      (localDBService.getById as jest.Mock).mockResolvedValue(null);

      const result = await cacheStrategyService.getCachedCourse('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('cacheDivinationRecord', () => {
    it('should cache a divination record successfully', async () => {
      (localDBService.getAll as jest.Mock).mockResolvedValue([]);
      (localDBService.upsert as jest.Mock).mockResolvedValue(true);

      const recordData = {
        _id: 'record-1',
        hexagram: {
          primary: {
            name: '乾为天',
            symbol: '䷀',
            pinyin: 'qian',
            sequence: 1,
          },
          changed: {
            name: '坤为地',
            symbol: '䷁',
            pinyin: 'kun',
            sequence: 2,
          },
          mutual: {
            name: '乾为天',
            symbol: '䷀',
            pinyin: 'qian',
            sequence: 1,
          },
          changingLines: [],
        },
        interpretation: {
          basic: {
            hexagramName: '乾为天',
            guaci: '元亨利贞',
            guaciTranslation: '元始亨通利于贞正',
            yaoci: [],
          },
        },
        isFavorite: false,
        createdAt: new Date().toISOString(),
        syncAt: new Date().toISOString(),
      };

      const result = await cacheStrategyService.cacheDivinationRecord('record-1', recordData);

      expect(result).toBe(true);
      expect(localDBService.upsert).toHaveBeenCalledWith(
        LocalTable.DIVINATION_HISTORY,
        'record-1',
        recordData,
        'synced'
      );
    });
  });

  describe('saveLearningProgress', () => {
    it('should save learning progress successfully', async () => {
      (localDBService.getAll as jest.Mock).mockResolvedValue([]);
      (localDBService.upsert as jest.Mock).mockResolvedValue(true);

      const progressData = {
        courseId: 'course-1',
        completedChapters: ['chapter-1'],
        lastReadChapter: 'chapter-1',
        progress: 50,
        lastReadTime: Date.now(),
      };

      const result = await cacheStrategyService.saveLearningProgress('course-1', progressData);

      expect(result).toBe(true);
      expect(localDBService.upsert).toHaveBeenCalledWith(
        LocalTable.LEARNING_PROGRESS,
        'course-1',
        progressData,
        'pending'
      );
    });
  });

  describe('cleanExpiredCache', () => {
    it('should clean expired cache items', async () => {
      const oldItem = {
        id: 'old-course',
        data: {},
        createdAt: Date.now() - 31 * 24 * 60 * 60 * 1000, // 31天前
      };
      const newItem = {
        id: 'new-course',
        data: {},
        createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000, // 10天前
      };

      (localDBService.getAll as jest.Mock).mockResolvedValue([oldItem, newItem]);
      (localDBService.delete as jest.Mock).mockResolvedValue(true);

      await cacheStrategyService.cleanExpiredCache();

      expect(localDBService.delete).toHaveBeenCalledWith(LocalTable.COURSES, 'old-course');
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      (localDBService.getAll as jest.Mock)
        .mockResolvedValueOnce([{}, {}, {}]) // COURSES: 3 items
        .mockResolvedValueOnce([{}, {}]) // DIVINATION_HISTORY: 2 items
        .mockResolvedValueOnce([]); // LEARNING_PROGRESS: 0 items

      const stats = await cacheStrategyService.getCacheStats();

      expect(stats[LocalTable.COURSES].count).toBe(3);
      expect(stats[LocalTable.COURSES].maxSize).toBe(50);
      expect(stats[LocalTable.DIVINATION_HISTORY].count).toBe(2);
      expect(stats[LocalTable.LEARNING_PROGRESS].count).toBe(0);
    });
  });

  describe('clearAllCache', () => {
    it('should clear all cache tables', async () => {
      (localDBService.clearTable as jest.Mock).mockResolvedValue(true);

      const result = await cacheStrategyService.clearAllCache();

      expect(result).toBe(true);
      expect(localDBService.clearTable).toHaveBeenCalledWith(LocalTable.COURSES);
      expect(localDBService.clearTable).toHaveBeenCalledWith(LocalTable.DIVINATION_HISTORY);
      expect(localDBService.clearTable).toHaveBeenCalledWith(LocalTable.LEARNING_PROGRESS);
    });
  });
});
