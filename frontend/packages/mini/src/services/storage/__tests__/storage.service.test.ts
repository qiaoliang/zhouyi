/**
 * 本地存储服务单元测试
 */

import { storageService } from '../storage.service';

// 模拟微信API
const mockWx = {
  setStorage: jest.fn(),
  getStorage: jest.fn(),
  removeStorage: jest.fn(),
  clearStorage: jest.fn(),
  getStorageInfo: jest.fn(),
};

(global as any).wx = mockWx;

describe('StorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('set', () => {
    it('should successfully store data', async () => {
      mockWx.setStorage.mockImplementation(({ success }) => success());

      const result = await storageService.set('test-key', { foo: 'bar' });

      expect(result).toBe(true);
      expect(mockWx.setStorage).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'zhouyi_v1_test-key',
          data: expect.objectContaining({
            data: { foo: 'bar' },
            timestamp: expect.any(Number),
          }),
        })
      );
    });

    it('should store data with expiration', async () => {
      mockWx.setStorage.mockImplementation(({ success }) => success());

      const expire = Date.now() + 60000;
      await storageService.set('test-key', { foo: 'bar' }, { expire });

      expect(mockWx.setStorage).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expire,
          }),
        })
      );
    });

    it('should handle errors gracefully', async () => {
      mockWx.setStorage.mockImplementation(({ fail }) => fail(new Error('Storage error')));

      const result = await storageService.set('test-key', { foo: 'bar' });

      expect(result).toBe(false);
    });
  });

  describe('get', () => {
    it('should successfully retrieve data', async () => {
      const testData = { foo: 'bar' };
      mockWx.getStorage.mockImplementation(({ success }) => {
        success({
          data: {
            data: testData,
            timestamp: Date.now(),
          },
        });
      });

      const result = await storageService.get('test-key');

      expect(result).toEqual(testData);
    });

    it('should return null for non-existent key', async () => {
      mockWx.getStorage.mockImplementation(({ fail }) => {
        fail({ errMsg: 'data not found' });
      });

      const result = await storageService.get('non-existent-key');

      expect(result).toBeNull();
    });

    it('should return null for expired data', async () => {
      mockWx.getStorage.mockImplementation(({ success }) => {
        success({
          data: {
            data: { foo: 'bar' },
            timestamp: Date.now(),
            expire: Date.now() - 1000, // 过期
          },
        });
      });

      // 模拟 removeStorage
      mockWx.removeStorage.mockImplementation(({ success }) => success());

      const result = await storageService.get('expired-key');

      expect(result).toBeNull();
      expect(mockWx.removeStorage).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockWx.getStorage.mockImplementation(({ fail }) => fail(new Error('Get error')));

      const result = await storageService.get('test-key');

      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('should successfully remove data', async () => {
      mockWx.removeStorage.mockImplementation(({ success }) => success());

      const result = await storageService.remove('test-key');

      expect(result).toBe(true);
      expect(mockWx.removeStorage).toHaveBeenCalledWith({
        key: 'zhouyi_v1_test-key',
      });
    });

    it('should handle errors gracefully', async () => {
      mockWx.removeStorage.mockImplementation(({ fail }) => fail(new Error('Remove error')));

      const result = await storageService.remove('test-key');

      expect(result).toBe(false);
    });
  });

  describe('clear', () => {
    it('should successfully clear all data', async () => {
      mockWx.clearStorage.mockImplementation(({ success }) => success());

      const result = await storageService.clear();

      expect(result).toBe(true);
      expect(mockWx.clearStorage).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockWx.clearStorage.mockImplementation(({ fail }) => fail(new Error('Clear error')));

      const result = await storageService.clear();

      expect(result).toBe(false);
    });
  });

  describe('getInfo', () => {
    it('should successfully get storage info', async () => {
      const mockInfo = {
        keys: ['key1', 'key2'],
        currentSize: 1024,
        limitSize: 10240,
      };
      mockWx.getStorageInfo.mockImplementation(({ success }) => success(mockInfo));

      const result = await storageService.getInfo();

      expect(result).toEqual(mockInfo);
    });

    it('should handle errors gracefully', async () => {
      mockWx.getStorageInfo.mockImplementation(({ fail }) => fail(new Error('GetInfo error')));

      const result = await storageService.getInfo();

      expect(result).toBeNull();
    });
  });

  describe('setWithExpire', () => {
    it('should set data with TTL', async () => {
      mockWx.setStorage.mockImplementation(({ success }) => success());

      const ttlSeconds = 60;
      await storageService.setWithExpire('test-key', { foo: 'bar' }, ttlSeconds);

      expect(mockWx.setStorage).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expire: expect.any(Number),
          }),
        })
      );
    });
  });
});
