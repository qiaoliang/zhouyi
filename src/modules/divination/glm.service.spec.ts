import { Test, TestingModule } from '@nestjs/testing';
import { GLMService } from './glm.service';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { getRedisConnectionToken } from '@nestjs-modules/ioredis';
import { getModelToken } from '@nestjs/mongoose';
import { Redis } from 'ioredis';
import { InternalServerErrorException, BadRequestException, HttpException } from '@nestjs/common';

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
        AI_INTERPRETATION_LOCK_TTL: 60,
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

  const mockHexagramModel = {
    findOne: jest.fn().mockReturnValue({
      exec: jest.fn(),
    }),
  };

  const mockDivinationRecordModel = {
    findOne: jest.fn().mockReturnValue({
      exec: jest.fn(),
    }),
    updateOne: jest.fn().mockReturnValue({
      exec: jest.fn(),
    }),
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
        {
          provide: getModelToken('Hexagram'),
          useValue: mockHexagramModel,
        },
        {
          provide: getModelToken('DivinationRecord'),
          useValue: mockDivinationRecordModel,
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

  describe('generateAIInterpretation', () => {
    it('should return existing interpretation if already exists', async () => {
      const mockRecord = {
        _id: 'record-123',
        userId: 'user-123',
        hexagram: { primary: { sequence: 1 } },
        aiInterpretation: {
          summary: 'existing',
          detailedAnalysis: 'existing',
          advice: 'existing',
          createdAt: new Date(),
          cached: false,
        },
      };

      jest.spyOn(service, 'checkRateLimit').mockResolvedValue(true);
      jest.spyOn(service['divinationRecordModel'], 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockRecord),
      } as any);

      const result = await service.generateAIInterpretation('record-123', 'user-123');

      expect(result).toEqual(mockRecord.aiInterpretation);
    });

    it('should throw 404 when record not found', async () => {
      jest.spyOn(service, 'checkRateLimit').mockResolvedValue(true);
      jest.spyOn(service['divinationRecordModel'], 'findOne').mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as any);

      await expect(
        service.generateAIInterpretation('record-123', 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw 429 when rate limit exceeded', async () => {
      jest.spyOn(service, 'checkRateLimit').mockResolvedValue(false);

      await expect(
        service.generateAIInterpretation('record-123', 'user-123'),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('buildHexagramPrompt', () => {
    it('should build prompt with all hexagram data', async () => {
      const mockHexagramModel = {
        findOne: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            name: '乾',
            symbol: '☰',
            sequence: 1,
            guaci: {
              original: '元亨利贞',
              translation: '元始、亨通、和谐、贞正',
            },
            yaoci: [
              {
                position: '初',
                original: '初九：潜龙勿用',
                translation: '初九：潜藏的龙，不要轻举妄动',
              },
            ],
          }),
        }),
      };

      // Override the module with hexagramModel
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          GLMService,
          { provide: ConfigService, useValue: mockConfigService },
          { provide: HttpService, useValue: mockHttpService },
          { provide: getRedisConnectionToken(), useValue: mockRedis },
          { provide: getModelToken('Hexagram'), useValue: mockHexagramModel },
          { provide: getModelToken('DivinationRecord'), useValue: mockDivinationRecordModel },
        ],
      }).compile();

      const testService = module.get<GLMService>(GLMService);

      const hexagram = {
        primary: { sequence: 1, name: '乾', symbol: '☰' },
        changed: { sequence: 1, name: '乾', symbol: '☰' },
        mutual: { sequence: 1, name: '乾', symbol: '☰' },
        changingLines: [1],
      };

      const prompt = await testService['buildHexagramPrompt'](hexagram, '测试问题');

      expect(prompt).toContain('你是一位精通周易的解卦大师');
      expect(prompt).toContain('乾');
      expect(prompt).toContain('测试问题');
    });
  });
});
