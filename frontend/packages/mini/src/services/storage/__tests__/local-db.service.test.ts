/**
 * 本地数据库服务单元测试
 */

import { localDBService, LocalTable } from '../local-db.service';
import { storageService } from '../storage.service';

// 模拟 storageService
jest.mock('../storage.service', () => ({
  storageService: {
    get: jest.fn(),
    set: jest.fn(),
    setWithExpire: jest.fn(),
    remove: jest.fn(),
  },
}));

describe('LocalDBService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('should return all data from table', async () => {
      const testData = [
        { id: '1', data: { name: 'Test 1' }, createdAt: 1000, updatedAt: 2000 },
        { id: '2', data: { name: 'Test 2' }, createdAt: 1000, updatedAt: 2000 },
      ];
      (storageService.get as jest.Mock).mockResolvedValue(testData);

      const result = await localDBService.getAll(LocalTable.COURSES);

      expect(result).toEqual(testData);
      expect(storageService.get).toHaveBeenCalledWith(LocalTable.COURSES);
    });

    it('should return empty array on error', async () => {
      (storageService.get as jest.Mock).mockRejectedValue(new Error('Error'));

      const result = await localDBService.getAll(LocalTable.COURSES);

      expect(result).toEqual([]);
    });

    it('should return empty array when no data', async () => {
      (storageService.get as jest.Mock).mockResolvedValue(null);

      const result = await localDBService.getAll(LocalTable.COURSES);

      expect(result).toEqual([]);
    });
  });

  describe('getById', () => {
    it('should return data by id', async () => {
      const testData = [
        { id: '1', data: { name: 'Test 1' }, createdAt: 1000, updatedAt: 2000 },
        { id: '2', data: { name: 'Test 2' }, createdAt: 1000, updatedAt: 2000 },
      ];
      (storageService.get as jest.Mock).mockResolvedValue(testData);

      const result = await localDBService.getById(LocalTable.COURSES, '1');

      expect(result).toEqual(testData[0]);
    });

    it('should return null when id not found', async () => {
      const testData = [
        { id: '1', data: { name: 'Test 1' }, createdAt: 1000, updatedAt: 2000 },
      ];
      (storageService.get as jest.Mock).mockResolvedValue(testData);

      const result = await localDBService.getById(LocalTable.COURSES, '999');

      expect(result).toBeNull();
    });
  });

  describe('upsert', () => {
    it('should insert new data', async () => {
      (storageService.get as jest.Mock).mockResolvedValue([]);
      (storageService.setWithExpire as jest.Mock).mockResolvedValue(true);

      const result = await localDBService.upsert(LocalTable.COURSES, '1', { name: 'New Course' });

      expect(result).toBe(true);
      expect(storageService.setWithExpire).toHaveBeenCalledWith(
        LocalTable.COURSES,
        expect.arrayContaining([
          expect.objectContaining({
            id: '1',
            data: { name: 'New Course' },
            syncStatus: 'pending',
          }),
        ]),
        expect.any(Number)
      );
    });

    it('should update existing data', async () => {
      const existingData = [
        { id: '1', data: { name: 'Old Course' }, createdAt: 1000, updatedAt: 2000 },
      ];
      (storageService.get as jest.Mock).mockResolvedValue(existingData);
      (storageService.setWithExpire as jest.Mock).mockResolvedValue(true);

      const result = await localDBService.upsert(LocalTable.COURSES, '1', { name: 'Updated Course' });

      expect(result).toBe(true);
      expect(storageService.setWithExpire).toHaveBeenCalledWith(
        LocalTable.COURSES,
        expect.arrayContaining([
          expect.objectContaining({
            id: '1',
            data: { name: 'Updated Course' },
            createdAt: 1000, // 保持原创建时间
          }),
        ]),
        expect.any(Number)
      );
    });

    it('should handle errors gracefully', async () => {
      (storageService.get as jest.Mock).mockRejectedValue(new Error('Error'));

      const result = await localDBService.upsert(LocalTable.COURSES, '1', { name: 'Course' });

      expect(result).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete data by id', async () => {
      const testData = [
        { id: '1', data: { name: 'Test 1' } },
        { id: '2', data: { name: 'Test 2' } },
      ];
      (storageService.get as jest.Mock).mockResolvedValue(testData);
      (storageService.setWithExpire as jest.Mock).mockResolvedValue(true);

      const result = await localDBService.delete(LocalTable.COURSES, '1');

      expect(result).toBe(true);
      expect(storageService.setWithExpire).toHaveBeenCalledWith(
        LocalTable.COURSES,
        expect.arrayContaining([
          expect.objectContaining({ id: '2' }),
        ]),
        expect.any(Number)
      );
    });

    it('should handle errors gracefully', async () => {
      (storageService.get as jest.Mock).mockRejectedValue(new Error('Error'));

      const result = await localDBService.delete(LocalTable.COURSES, '1');

      expect(result).toBe(false);
    });
  });

  describe('clearTable', () => {
    it('should clear table', async () => {
      (storageService.remove as jest.Mock).mockResolvedValue(true);

      const result = await localDBService.clearTable(LocalTable.COURSES);

      expect(result).toBe(true);
      expect(storageService.remove).toHaveBeenCalledWith(LocalTable.COURSES);
    });
  });

  describe('query', () => {
    it('should filter by id', async () => {
      const testData = [
        { id: '1', data: { name: 'Test 1' } },
        { id: '2', data: { name: 'Test 2' } },
      ];
      (storageService.get as jest.Mock).mockResolvedValue(testData);

      const result = await localDBService.query(LocalTable.COURSES, { id: '1' });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(testData[0]);
    });

    it('should filter by sync status', async () => {
      const testData = [
        { id: '1', data: { name: 'Test 1' }, syncStatus: 'synced' },
        { id: '2', data: { name: 'Test 2' }, syncStatus: 'pending' },
      ];
      (storageService.get as jest.Mock).mockResolvedValue(testData);

      const result = await localDBService.query(LocalTable.COURSES, { syncStatus: 'pending' });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(testData[1]);
    });

    it('should limit results', async () => {
      const testData = [
        { id: '1', data: { name: 'Test 1' } },
        { id: '2', data: { name: 'Test 2' } },
        { id: '3', data: { name: 'Test 3' } },
      ];
      (storageService.get as jest.Mock).mockResolvedValue(testData);

      const result = await localDBService.query(LocalTable.COURSES, { limit: 2 });

      expect(result).toHaveLength(2);
    });
  });

  describe('getPendingSync', () => {
    it('should return pending items', async () => {
      const testData = [
        { id: '1', data: { name: 'Test 1' }, syncStatus: 'synced' },
        { id: '2', data: { name: 'Test 2' }, syncStatus: 'pending' },
      ];
      (storageService.get as jest.Mock).mockResolvedValue(testData);

      const result = await localDBService.getPendingSync(LocalTable.COURSES);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(testData[1]);
    });
  });

  describe('updateSyncStatus', () => {
    it('should update sync status', async () => {
      const testData = [
        { id: '1', data: { name: 'Test 1' }, syncStatus: 'pending' },
      ];
      (storageService.get as jest.Mock).mockResolvedValue(testData);
      (storageService.setWithExpire as jest.Mock).mockResolvedValue(true);

      const result = await localDBService.updateSyncStatus(LocalTable.COURSES, '1', 'synced');

      expect(result).toBe(true);
      expect(storageService.setWithExpire).toHaveBeenCalledWith(
        LocalTable.COURSES,
        expect.arrayContaining([
          expect.objectContaining({
            id: '1',
            syncStatus: 'synced',
          }),
        ]),
        expect.any(Number)
      );
    });

    it('should return false when id not found', async () => {
      const testData = [
        { id: '1', data: { name: 'Test 1' } },
      ];
      (storageService.get as jest.Mock).mockResolvedValue(testData);

      const result = await localDBService.updateSyncStatus(LocalTable.COURSES, '999', 'synced');

      expect(result).toBe(false);
    });
  });

  describe('batchUpdateSyncStatus', () => {
    it('should update multiple items', async () => {
      const testData = [
        { id: '1', data: { name: 'Test 1' }, syncStatus: 'pending' },
        { id: '2', data: { name: 'Test 2' }, syncStatus: 'pending' },
        { id: '3', data: { name: 'Test 3' }, syncStatus: 'synced' },
      ];
      (storageService.get as jest.Mock).mockResolvedValue(testData);
      (storageService.setWithExpire as jest.Mock).mockResolvedValue(true);

      const result = await localDBService.batchUpdateSyncStatus(LocalTable.COURSES, ['1', '2'], 'synced');

      expect(result).toBe(true);
      expect(storageService.setWithExpire).toHaveBeenCalledWith(
        LocalTable.COURSES,
        expect.arrayContaining([
          expect.objectContaining({ id: '1', syncStatus: 'synced' }),
          expect.objectContaining({ id: '2', syncStatus: 'synced' }),
          expect.objectContaining({ id: '3', syncStatus: 'synced' }),
        ]),
        expect.any(Number)
      );
    });
  });
});
