import { Test, TestingModule } from '@nestjs/testing';
import { GLMService } from './glm.service';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { getRedisConnectionToken } from '@nestjs-modules/ioredis';
import { Redis } from 'ioredis';

describe('GLMService', () => {
  let service: GLMService;
  let redis: Redis;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        GLM_API_KEY: 'test-key',
        GLM_BASE_URL: 'https://test.api.com',
        GLM_MODEL: 'glm-4-flash',
        GLM_TIMEOUT: 30000,
        GLM_MAX_TOKENS: 2000,
        AI_INTERPRETATION_RATE_LIMIT: 10,
        AI_INTERPRETATION_CACHE_TTL: 86400,
      };
      return config[key] || null;
    }),
  };

  const mockHttpService = {
    axiosRef: {
      post: jest.fn(),
    },
  };

  const mockRedis = {
    incr: jest.fn(),
    expire: jest.fn(),
    get: jest.fn(),
    setex: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GLMService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: getRedisConnectionToken(),
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<GLMService>(GLMService);
    redis = module.get<Redis>(getRedisConnectionToken());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkRateLimit', () => {
    it('should allow first request', async () => {
      mockRedis.incr.mockResolvedValue(1);

      const result = await service.checkRateLimit('user-123');

      expect(result).toBe(true);
      expect(mockRedis.incr).toHaveBeenCalledWith(expect.stringContaining('ai:interpretation:rate:user-123:'));
      expect(mockRedis.expire).toHaveBeenCalledWith(expect.any(String), 3600);
    });

    it('should block request exceeding limit', async () => {
      mockRedis.incr.mockResolvedValue(11);

      const result = await service.checkRateLimit('user-123');

      expect(result).toBe(false);
    });
  });

  describe('getCachedInterpretation', () => {
    it('should return cached interpretation', async () => {
      const cached = {
        summary: '测试摘要',
        detailedAnalysis: '测试分析',
        advice: '测试建议',
        createdAt: new Date(),
        cached: true,
      };
      mockRedis.get.mockResolvedValue(JSON.stringify(cached));

      const result = await service.getCachedInterpretation(1, 'test question');

      expect(result).toMatchObject({
        summary: '测试摘要',
        detailedAnalysis: '测试分析',
        advice: '测试建议',
        cached: true,
      });
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('should return null when cache miss', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.getCachedInterpretation(1);

      expect(result).toBeNull();
    });
  });

  describe('setCachedInterpretation', () => {
    it('should save interpretation to cache', async () => {
      const interpretation = {
        summary: '测试摘要',
        detailedAnalysis: '测试分析',
        advice: '测试建议',
        createdAt: new Date(),
        cached: true,
      };

      await service.setCachedInterpretation(1, interpretation, 'test question');

      expect(mockRedis.setex).toHaveBeenCalledWith(
        expect.stringContaining('ai:interpretation:cache:1:'),
        86400,
        JSON.stringify(interpretation),
      );
    });
  });

  describe('acquireLock', () => {
    it('should acquire lock successfully', async () => {
      mockRedis.set.mockResolvedValue('OK');

      const result = await service.acquireLock('record-123');

      expect(result).toBe(true);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'ai:interpretation:lock:record-123',
        '1',
        'EX',
        60,
        'NX',
      );
    });

    it('should fail to acquire lock when already held', async () => {
      mockRedis.set.mockResolvedValue(null);

      const result = await service.acquireLock('record-123');

      expect(result).toBe(false);
    });
  });

  describe('releaseLock', () => {
    it('should release lock', async () => {
      await service.releaseLock('record-123');

      expect(mockRedis.del).toHaveBeenCalledWith('ai:interpretation:lock:record-123');
    });
  });
});
