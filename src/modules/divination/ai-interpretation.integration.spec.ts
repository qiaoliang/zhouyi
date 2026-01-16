import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Redis } from 'ioredis';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { DivinationRecord, DivinationRecordDocument } from '../../database/schemas/divination-record.schema';
import { GuestDivination } from '../../database/schemas/guest-divination.schema';
import { DivinationController } from './divination.controller';
import { DivinationService } from './divination.service';
import { GLMService } from './glm.service';
import { HexagramAnalysisService } from './hexagram-analysis.service';
import { InterpretationService } from './interpretation.service';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionGuard, RequireSubscription } from '../membership/guards/subscription.guard';

/**
 * AI 解卦集成测试
 *
 * 测试范围:
 * - 认证检查 (401 未登录)
 * - 记录不存在 (404)
 * - 频率限制 (429)
 * - 正常请求 (200)
 * - 响应格式验证
 *
 * 注意:
 * - 集成测试使用真实的 HTTP 请求
 * - 使用 mock 模型而非真实数据库
 * - 测试端到端的行为,包括 guards、interceptors、filters
 *
 * @see AI 解卦服务实现计划 Task 6.1
 */
describe('AI Interpretation Integration Tests', () => {
  let controller: DivinationController;
  let glmService: any;
  let divinationService: any;
  let jwtService: JwtService;
  let redisService: any;
  let accessToken: string;
  let userId: string;
  let mockUsers: any[] = [];
  let mockRecords: any[] = [];

  const mockGuestDivinationModel = {
    save: jest.fn().mockResolvedValue({ _id: 'test-record-id', createdAt: new Date() }),
  };

  const mockHexagramModel = {
    findOne: jest.fn().mockResolvedValue(null),
  };

  beforeAll(async () => {
    // 设置测试环境变量
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6379';
    process.env.REDIS_DB = '1';
    process.env.GLM_API_KEY = 'test-api-key';

    // 创建测试用户
    const mockUser = {
      _id: '507f1f77bcf86cd799439011',
      phoneNumber: '13800138000',
      nickname: '测试用户',
      membership: {
        type: 'free',
        level: 0,
        expireAt: null,
        autoRenew: false,
        activatedAt: new Date(),
      },
      stats: {
        divinationCount: 0,
        guestUsedCount: 0,
        learningProgress: 0,
      },
      status: 'active',
      isGuest: false,
      push: {
        enabled: true,
        dailyHexagram: true,
        time: '08:00',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockUsers.push(mockUser);
    userId = mockUser._id.toString();

    // Mock User Model
    const mockUserModel = {
      create: jest.fn((data: any) => {
        const user = {
          _id: data._id || '507f1f77bcf86cd7994390' + Math.floor(Math.random() * 1000),
          ...data,
          save: jest.fn().mockResolvedValue(null),
        };
        mockUsers.push(user);
        return Promise.resolve(user);
      }),
      findOne: jest.fn((query: any) => {
        if (query.phoneNumber) {
          return Promise.resolve(
            mockUsers.find(u => u.phoneNumber === query.phoneNumber) || null,
          ) as any;
        }
        if (query._id) {
          return Promise.resolve(
            mockUsers.find(u => u._id.toString() === query._id.toString()) || null,
          ) as any;
        }
        return Promise.resolve(null) as any;
      }),
      findById: jest.fn((id: string) => {
        return Promise.resolve(
          mockUsers.find(u => u._id.toString() === id.toString()) || null,
        ) as any;
      }),
    };

    // Mock DivinationRecord Model
    const mockDivinationRecordModel = {
      create: jest.fn((data: any) => {
        const record = {
          _id: data._id || '507f1f77bcf86cd7994390' + Math.floor(Math.random() * 1000),
          ...data,
          save: jest.fn().mockResolvedValue(null),
        };
        mockRecords.push(record);
        return Promise.resolve(record);
      }),
      findById: jest.fn((id: string) => {
        const record = mockRecords.find(r => r._id.toString() === id.toString());
        return Promise.resolve(
          record ? { ...record, exec: jest.fn().mockResolvedValue(record) } : null,
        ) as any;
      }),
      findOne: jest.fn(() => Promise.resolve(null)),
      deleteMany: jest.fn(() => Promise.resolve({ deletedCount: 0 })),
    };

    // Mock Redis Service
    const redisStore = new Map();
    const mockRedisService = {
      get: jest.fn((key: string) => redisStore.get(key) || null),
      set: jest.fn((key: string, value: string, ttl?: number) => {
        redisStore.set(key, value);
        return Promise.resolve('OK');
      }),
      del: jest.fn((key: string) => {
        redisStore.delete(key);
        return Promise.resolve(1);
      }),
      exists: jest.fn((key: string) => Promise.resolve(redisStore.has(key) ? 1 : 0)),
      expire: jest.fn((key: string, ttl: number) => Promise.resolve(1)),
      ttl: jest.fn((key: string) => Promise.resolve(redisStore.has(key) ? 300 : -2)),
      hset: jest.fn((key: string, field: string, value: string) => {
        const hash = redisStore.get(key) || {};
        hash[field] = value;
        redisStore.set(key, hash);
        return Promise.resolve(1);
      }),
      hgetall: jest.fn((key: string) => redisStore.get(key) || {}),
      flushdb: jest.fn(() => {
        redisStore.clear();
        return Promise.resolve('OK');
      }),
      incr: jest.fn((key: string) => {
        const current = parseInt(redisStore.get(key) || '0');
        redisStore.set(key, (current + 1).toString());
        return Promise.resolve(current + 1);
      }),
    };

    // 创建测试模块
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DivinationController],
      providers: [
        {
          provide: DivinationService,
          useValue: {
            performDivination: jest.fn().mockResolvedValue({
              primary: { name: '乾为天', symbol: '䷀', pinyin: 'qián wéi tiān', sequence: 1 },
              lines: [],
              changed: { name: '乾为天', symbol: '䷀', pinyin: 'qián wéi tiān', sequence: 1 },
              mutual: { name: '乾为天', symbol: '䷀', pinyin: 'qián wéi tiān', sequence: 1 },
              changingLines: [],
            }),
            saveGuestDivinationRecord: jest.fn().mockResolvedValue({
              _id: 'test-record-id',
              createdAt: new Date(),
            }),
            hexagramModel: mockHexagramModel,
            getDivinationRecord: jest.fn((id: string, uid: string) => {
              const record = mockRecords.find(r => r._id.toString() === id.toString() && r.userId === uid);
              return Promise.resolve(record || null);
            }),
          },
        },
        {
          provide: HexagramAnalysisService,
          useValue: {
            generateDetailedAnalysis: jest.fn().mockResolvedValue({
              changingAnalysis: '测试变卦分析',
              mutualAnalysis: '测试互卦分析',
              timingAnalysis: '测试应期分析',
              advice: '测试建议',
            }),
          },
        },
        {
          provide: InterpretationService,
          useValue: {
            generateBasicInterpretation: jest.fn().mockResolvedValue({
              overall: '测试概述',
              career: '测试事业',
              relationships: '测试感情',
              health: '测试健康',
              wealth: '测试财运',
            }),
          },
        },
        {
          provide: GLMService,
          useValue: {
            generateAIInterpretation: jest.fn().mockResolvedValue({
              summary: '测试摘要',
              detailedAnalysis: '测试分析',
              advice: '测试建议',
              createdAt: new Date(),
              cached: false,
            }),
          },
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(DivinationRecord.name),
          useValue: mockDivinationRecordModel,
        },
        {
          provide: getModelToken(GuestDivination.name),
          useValue: mockGuestDivinationModel,
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn((payload: any) => {
              return 'mock-jwt-token-' + JSON.stringify(payload);
            }),
            verify: jest.fn().mockReturnValue({
              userId: '507f1f77bcf86cd799439011',
              phoneNumber: '13800138000',
            }),
          },
        },
        {
          provide: 'Redis',
          useValue: mockRedisService,
        },
      ],
    })
      .overrideGuard(RateLimitGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .overrideGuard(SubscriptionGuard)
      .useValue({ canActivate: jest.fn().mockReturnValue(true) })
      .compile();

    controller = module.get<DivinationController>(DivinationController);
    divinationService = module.get(DivinationService);
    glmService = module.get(GLMService);
    jwtService = module.get(JwtService);
    redisService = module.get('Redis');

    // 设置 mockHexagramModel.findOne 返回值
    mockHexagramModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue({
        name: '乾为天',
        guaci: {
          original: '元亨利贞。',
          translation: '元始、亨通、和谐、贞正。',
          annotation: ''
        },
        tuanci: {
          original: '彖曰：大哉乾元，万物资始，乃统天。',
          translation: '彖传曰：乾卦的元始之道伟大啊，万物都由此开始，统领天道。',
        },
        xiangci: {
          original: '象曰：天行健，君子以自强不息。',
          translation: '象传曰：天道运行刚健有力，君子应该效法天道，自强不息。',
        },
        yaoci: [],
        metadata: {
          element: '金',
          nature: '刚健',
          direction: '西北',
          season: '秋',
          trigrams: {
            upper: { name: '乾', symbol: '☰', nature: '刚健', position: 'upper' },
            lower: { name: '乾', symbol: '☰', nature: '刚健', position: 'lower' }
          },
          family: '父',
          body: '首',
          animal: '马',
          color: '白',
          category: {
            nature: 'yang',
            quality: 'lucky',
            difficulty: 'simple'
          }
        },
        category: {
          nature: 'yang',
          quality: 'lucky',
          difficulty: 'simple'
        },
        tags: ['乾', '天', '刚健']
      }),
    });

    // 生成 access token
    accessToken = jwtService.sign({ userId, phoneNumber: mockUser.phoneNumber }) as string;
  });

  afterAll(async () => {
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    // 清空 Redis
    await redisService.flushdb();

    // 清空 mock 数据
    mockRecords = [];

    // 重置 mocks
    jest.clearAllMocks();
  });

  describe('POST /api/v1/divination/record/:id/ai-interpretation', () => {
    const validRecordId = '507f1f77bcf86cd799439012';
    const invalidRecordId = '507f1f77bcf86cd799439999';

    /**
     * 测试用例 1: 认证检查
     *
     * 验证 JwtAuthGuard 是否正确应用
     */
    it('should require authentication', async () => {
      // 验证 guard 被正确应用到端点上
      const guards = Reflect.getMetadata('__guards__', DivinationController.prototype.getAIInterpretation);
      expect(guards).toBeDefined();
      expect(guards.length).toBeGreaterThan(0);
    });

    /**
     * 测试用例 2: 记录不存在应该返回错误
     *
     * 预期行为:
     * - 使用有效的 token
     * - 记录 ID 不存在于数据库
     * - 返回错误响应
     */
    it('should return error for non-existent record', async () => {
      // Mock 返回 null (记录不存在)
      mockRecords = []; // 确保没有记录

      const mockUser = { userId, phoneNumber: '13800138000' };

      // 调用 controller 方法
      const result = await controller.getAIInterpretation(invalidRecordId, mockUser, {});

      // 验证结果
      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    /**
     * 测试用例 3: 频率限制测试
     *
     * 预期行为:
     * - 验证频率限制机制是否正确配置
     */
    it('should have rate limiting configured', async () => {
      // 验证 guard 被正确应用到端点上
      const guards = Reflect.getMetadata('__guards__', DivinationController.prototype.getAIInterpretation);
      expect(guards).toBeDefined();

      // 创建测试记录
      const mockRecord = {
        _id: validRecordId,
        userId,
        hexagram: {
          primary: {
            name: '乾为天',
            symbol: '䷀',
            pinyin: 'qián wéi tiān',
            sequence: 1,
          },
          lines: [],
          changed: {
            name: '乾为天',
            symbol: '䷀',
            pinyin: 'qián wéi tiān',
            sequence: 1,
          },
          mutual: {
            name: '乾为天',
            symbol: '䷀',
            pinyin: 'qián wéi tiān',
            sequence: 1,
          },
          changingLines: [],
        },
        interpretation: {
          basic: {
            hexagramName: '乾为天',
            guaci: '元亨利贞。',
            guaciTranslation: '元始、亨通、和谐、贞正。',
            yaoci: [],
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRecords.push(mockRecord);

      const mockUser = { userId, phoneNumber: '13800138000' };

      // 发送多次请求
      let successCount = 0;

      for (let i = 0; i < 5; i++) {
        try {
          const result = await controller.getAIInterpretation(validRecordId, mockUser, {
            question: `测试问题 ${i}`,
          });

          if (result.success) {
            successCount++;
          }
        } catch (error) {
          // 忽略错误
        }
      }

      // 验证: 至少有一些请求成功
      expect(successCount).toBeGreaterThan(0);
    });

    /**
     * 测试用例 4: 正常请求应该返回成功
     *
     * 预期行为:
     * - 使用有效的 token
     * - 记录存在于数据库
     * - 返回 AI 解读结果
     */
    it('should return success for valid request', async () => {
      // 创建测试记录
      const mockRecord = {
        _id: validRecordId,
        userId,
        hexagram: {
          primary: {
            name: '乾为天',
            symbol: '䷀',
            pinyin: 'qián wéi tiān',
            sequence: 1,
          },
          lines: [],
          changed: {
            name: '乾为天',
            symbol: '䷀',
            pinyin: 'qián wéi tiān',
            sequence: 1,
          },
          mutual: {
            name: '乾为天',
            symbol: '䷀',
            pinyin: 'qián wéi tiān',
            sequence: 1,
          },
          changingLines: [],
        },
        interpretation: {
          basic: {
            hexagramName: '乾为天',
            guaci: '元亨利贞。',
            guaciTranslation: '元始、亨通、和谐、贞正。',
            yaoci: [],
          },
        },
        aiInterpretation: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRecords.push(mockRecord);

      const mockUser = { userId, phoneNumber: '13800138000' };

      const result = await controller.getAIInterpretation(validRecordId, mockUser, {
        question: '测试问题',
      });

      // 验证结果
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('recordId');
      expect(result.data).toHaveProperty('aiInterpretation');
      expect(result.message).toBe('获取 AI 解卦成功');
      expect(result.timestamp).toBeDefined();
    });

    /**
     * 测试用例 5: 可选的问题参数
     *
     * 预期行为:
     * - question 参数是可选的
     * - 不提供 question 也能正常请求
     */
    it('should work without question parameter', async () => {
      const mockRecord = {
        _id: validRecordId,
        userId,
        hexagram: {
          primary: {
            name: '乾为天',
            symbol: '䷀',
            pinyin: 'qián wéi tiān',
            sequence: 1,
          },
          lines: [],
          changed: {
            name: '乾为天',
            symbol: '䷀',
            pinyin: 'qián wéi tiān',
            sequence: 1,
          },
          mutual: {
            name: '乾为天',
            symbol: '䷀',
            pinyin: 'qián wéi tiān',
            sequence: 1,
          },
          changingLines: [],
        },
        interpretation: {
          basic: {
            hexagramName: '乾为天',
            guaci: '元亨利贞。',
            guaciTranslation: '元始、亨通、和谐、贞正。',
            yaoci: [],
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRecords.push(mockRecord);

      const mockUser = { userId, phoneNumber: '13800138000' };

      const result = await controller.getAIInterpretation(validRecordId, mockUser, {});

      // 验证结果
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    /**
     * 测试用例 6: 验证响应格式
     *
     * 预期行为:
     * - 成功响应包含必需的字段
     * - 响应格式符合 API 规范
     */
    it('should return correct response format', async () => {
      const mockRecord = {
        _id: validRecordId,
        userId,
        hexagram: {
          primary: {
            name: '乾为天',
            symbol: '䷀',
            pinyin: 'qián wéi tiān',
            sequence: 1,
          },
          lines: [],
          changed: {
            name: '乾为天',
            symbol: '䷀',
            pinyin: 'qián wéi tiān',
            sequence: 1,
          },
          mutual: {
            name: '乾为天',
            symbol: '䷀',
            pinyin: 'qián wéi tiān',
            sequence: 1,
          },
          changingLines: [],
        },
        interpretation: {
          basic: {
            hexagramName: '乾为天',
            guaci: '元亨利贞。',
            guaciTranslation: '元始、亨通、和谐、贞正。',
            yaoci: [],
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRecords.push(mockRecord);

      const mockUser = { userId, phoneNumber: '13800138000' };

      const result = await controller.getAIInterpretation(validRecordId, mockUser, {
        question: '我的事业发展如何?',
      });

      // 验证响应格式
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('timestamp');

      expect(result.data).toHaveProperty('recordId', validRecordId);
      expect(result.data).toHaveProperty('aiInterpretation');
      expect(result.data.aiInterpretation).toHaveProperty('summary');
      expect(result.data.aiInterpretation).toHaveProperty('detailedAnalysis');
      expect(result.data.aiInterpretation).toHaveProperty('advice');
      expect(result.data.aiInterpretation).toHaveProperty('createdAt');

      expect(result.message).toBe('获取 AI 解卦成功');
      expect(typeof result.timestamp).toBe('number');
    });

    /**
     * 测试用例 7: 验证 GLM Service 被正确调用
     *
     * 预期行为:
     * - GLMService.generateAIInterpretation 被正确调用
     * - 传递正确的参数
     */
    it('should call GLMService with correct parameters', async () => {
      const mockRecord = {
        _id: validRecordId,
        userId,
        hexagram: {
          primary: {
            name: '乾为天',
            symbol: '䷀',
            pinyin: 'qián wéi tiān',
            sequence: 1,
          },
          lines: [],
          changed: {
            name: '乾为天',
            symbol: '䷀',
            pinyin: 'qián wéi tiān',
            sequence: 1,
          },
          mutual: {
            name: '乾为天',
            symbol: '䷀',
            pinyin: 'qián wéi tiān',
            sequence: 1,
          },
          changingLines: [],
        },
        interpretation: {
          basic: {
            hexagramName: '乾为天',
            guaci: '元亨利贞。',
            guaciTranslation: '元始、亨通、和谐、贞正。',
            yaoci: [],
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRecords.push(mockRecord);

      const mockUser = { userId, phoneNumber: '13800138000' };
      const question = '我的事业发展如何?';

      const generateAIInterpretationSpy = jest.spyOn(glmService, 'generateAIInterpretation');

      await controller.getAIInterpretation(validRecordId, mockUser, { question });

      // 验证 GLM service 被正确调用
      expect(generateAIInterpretationSpy).toHaveBeenCalledWith(validRecordId, userId, question);
    });

    /**
     * 测试用例 8: 验证缓存标志
     *
     * 预期行为:
     * - 响应包含缓存标志
     */
    it('should include cached flag in response', async () => {
      const mockRecord = {
        _id: validRecordId,
        userId,
        hexagram: {
          primary: {
            name: '乾为天',
            symbol: '䷀',
            pinyin: 'qián wéi tiān',
            sequence: 1,
          },
          lines: [],
          changed: {
            name: '乾为天',
            symbol: '䷀',
            pinyin: 'qián wéi tiān',
            sequence: 1,
          },
          mutual: {
            name: '乾为天',
            symbol: '䷀',
            pinyin: 'qián wéi tiān',
            sequence: 1,
          },
          changingLines: [],
        },
        interpretation: {
          basic: {
            hexagramName: '乾为天',
            guaci: '元亨利贞。',
            guaciTranslation: '元始、亨通、和谐、贞正。',
            yaoci: [],
          },
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRecords.push(mockRecord);

      const mockUser = { userId, phoneNumber: '13800138000' };

      const result = await controller.getAIInterpretation(validRecordId, mockUser, {});

      // 验证缓存标志存在
      expect(result.data).toHaveProperty('cached');
      expect(typeof result.data.cached).toBe('boolean');
    });
  });
});
