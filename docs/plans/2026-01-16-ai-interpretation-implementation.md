# AI 解卦功能实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**目标:** 为登录用户提供基于 GLM 大语言模型的智能解卦服务，用户卜卦后可选择获取 AI 深度解读。

**架构:** 在现有卜卦系统基础上扩展，新建 GLMService 处理 LLM 调用，在 DivinationController 添加新端点，使用 Redis 实现缓存和限流。

**技术栈:** NestJS、MongoDB、Redis、GLM API、Jest

---

## 前置准备

### 准备步骤 0: 确认环境变量配置

**文件:** `.env`

**Step 1: 检查现有环境变量**

```bash
cat .env | grep -E "GLM_|REDIS_|JWT_"
```

**Step 2: 添加 GLM 配置（如果不存在）**

在 `.env` 文件末尾添加：
```bash
# GLM API 配置
GLM_API_KEY="your_glm_api_key_here"
GLM_BASE_URL="https://open.bigmodel.cn/api/paas/v4"
GLM_MODEL="glm-4-flash"
GLM_TIMEOUT=30000
GLM_MAX_TOKENS=2000

# AI 解卦限流配置
AI_INTERPRETATION_RATE_LIMIT=10
AI_INTERPRETATION_CACHE_TTL=86400
```

**Step 3: 更新 .env.example**

```bash
# 在 .env.example 末尾添加相同的 GLM 配置
```

**Step 4: 提交**

```bash
git add .env .env.example
git commit -m "feat: add GLM API configuration"
```

---

## Phase 1: 基础设施 - GLMService 核心

### 任务 1.1: 创建 GLMService 基础结构

**文件:**
- 创建: `src/modules/divination/glm.service.ts`
- 修改: `src/modules/divination/divination.module.ts`

**Step 1: 创建 GLMService 文件**

```bash
touch src/modules/divination/glm.service.ts
```

**Step 2: 编写基础服务结构**

创建文件 `src/modules/divination/glm.service.ts`：

```typescript
import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';
import { firstValueFrom } from 'rxjs';
import { createHash } from 'crypto';

/**
 * AI 解读结果接口
 */
export interface AIInterpretation {
  summary: string;
  detailedAnalysis: string;
  advice: string;
  prompt?: string;
  model?: string;
  createdAt: Date;
  cached: boolean;
}

/**
 * GLM API 响应接口
 */
interface GLMResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

/**
 * GLM 服务
 * 负责调用 GLM API 生成 AI 解卦内容
 */
@Injectable()
export class GLMService {
  private readonly logger = new Logger(GLMService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeout: number;
  private readonly maxTokens: number;
  private readonly rateLimit: number;
  private readonly cacheTTL: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @InjectRedis() private readonly redis: Redis,
  ) {
    this.apiKey = this.configService.get<string>('GLM_API_KEY') || '';
    this.baseUrl = this.configService.get<string>('GLM_BASE_URL') || 'https://open.bigmodel.cn/api/paas/v4';
    this.model = this.configService.get<string>('GLM_MODEL') || 'glm-4-flash';
    this.timeout = this.configService.get<number>('GLM_TIMEOUT') || 30000;
    this.maxTokens = this.configService.get<number>('GLM_MAX_TOKENS') || 2000;
    this.rateLimit = this.configService.get<number>('AI_INTERPRETATION_RATE_LIMIT') || 10;
    this.cacheTTL = this.configService.get<number>('AI_INTERPRETATION_CACHE_TTL') || 86400;

    if (!this.apiKey) {
      this.logger.warn('GLM_API_KEY is not configured');
    }
  }

  /**
   * 检查用户请求频率限制
   * @param userId 用户ID
   * @returns 是否允许请求
   */
  async checkRateLimit(userId: string): Promise<boolean> {
    const currentHour = Math.floor(Date.now() / 3600000); // 当前小时戳
    const key = `ai:interpretation:rate:${userId}:${currentHour}`;

    const count = await this.redis.incr(key);

    if (count === 1) {
      // 第一次请求，设置过期时间为 1 小时
      await this.redis.expire(key, 3600);
    }

    return count <= this.rateLimit;
  }

  /**
   * 获取缓存的解读
   * @param hexagramSequence 卦序
   * @param question 用户问题
   * @returns 缓存的解读或 null
   */
  async getCachedInterpretation(
    hexagramSequence: number,
    question?: string,
  ): Promise<AIInterpretation | null> {
    const questionHash = question
      ? createHash('md5').update(question).digest('hex')
      : 'none';
    const cacheKey = `ai:interpretation:cache:${hexagramSequence}:${questionHash}`;

    const cached = await this.redis.get(cacheKey);

    if (cached) {
      this.logger.log(`Cache hit for hexagram ${hexagramSequence}`);
      return JSON.parse(cached) as AIInterpretation;
    }

    return null;
  }

  /**
   * 保存解读到缓存
   * @param hexagramSequence 卦序
   * @param interpretation 解读结果
   * @param question 用户问题
   */
  async setCachedInterpretation(
    hexagramSequence: number,
    interpretation: AIInterpretation,
    question?: string,
  ): Promise<void> {
    const questionHash = question
      ? createHash('md5').update(question).digest('hex')
      : 'none';
    const cacheKey = `ai:interpretation:cache:${hexagramSequence}:${questionHash}`;

    await this.redis.setex(
      cacheKey,
      this.cacheTTL,
      JSON.stringify(interpretation),
    );

    this.logger.log(`Cached interpretation for hexagram ${hexagramSequence}`);
  }

  /**
   * 获取分布式锁
   * @param recordId 记录ID
   * @returns 是否获取到锁
   */
  async acquireLock(recordId: string): Promise<boolean> {
    const lockKey = `ai:interpretation:lock:${recordId}`;
    const result = await this.redis.set(lockKey, '1', 'EX', 60, 'NX');

    return result === 'OK';
  }

  /**
   * 释放分布式锁
   * @param recordId 记录ID
   */
  async releaseLock(recordId: string): Promise<void> {
    const lockKey = `ai:interpretation:lock:${recordId}`;
    await this.redis.del(lockKey);
  }

  /**
   * 调用 GLM API
   * @param prompt 提示词
   * @returns GLM 响应文本
   */
  private async callGLM(prompt: string): Promise<string> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${this.baseUrl}/chat/completions`,
          {
            model: this.model,
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
            max_tokens: this.maxTokens,
            temperature: 0.7,
          },
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: this.timeout,
          },
        ),
      );

      const data = response.data as GLMResponse;

      if (!data.choices || data.choices.length === 0) {
        throw new InternalServerErrorException('GLM API 返回空响应');
      }

      return data.choices[0].message.content;
    } catch (error: any) {
      this.logger.error(`GLM API Error: ${error.message}`);

      if (error.code === 'ECONNABORTED') {
        throw new InternalServerErrorException('GLM API 请求超时');
      }

      if (error.response?.status === 401) {
        throw new InternalServerErrorException('GLM API 密钥无效');
      }

      if (error.response?.status === 429) {
        throw new InternalServerErrorException('GLM API 请求频率超限');
      }

      throw new InternalServerErrorException('AI 解读服务暂时不可用');
    }
  }

  /**
   * 生成 AI 解读（主要方法，待实现）
   * @param recordId 记录ID
   * @param userId 用户ID
   * @param question 用户问题
   * @returns AI 解读结果
   */
  async generateAIInterpretation(
    recordId: string,
    userId: string,
    question?: string,
  ): Promise<AIInterpretation> {
    // 待实现
    throw new Error('Not implemented yet');
  }

  /**
   * 组织卦象提示词（待实现）
   * @param hexagram 卦象数据
   * @param question 用户问题
   * @returns 提示词
   */
  private async buildHexagramPrompt(
    hexagram: any,
    question?: string,
  ): Promise<string> {
    // 待实现
    throw new Error('Not implemented yet');
  }
}
```

**Step 3: 在 DivinationModule 中注册 GLMService**

修改 `src/modules/divination/divination.module.ts`，在 `providers` 数组中添加：

```typescript
import { GLMService } from './glm.service';

// 在 @Module 装饰器中：
@Module({
  // ...
  providers: [
    // ... 现有 providers
    GLMService,
  ],
  exports: [GLMService],
})
```

**Step 4: 编写基础测试**

创建 `src/modules/divination/glm.service.spec.ts`：

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { GLMService } from './glm.service';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
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
          provide: 'Redis',
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<GLMService>(GLMService);
    redis = module.get<Redis>('Redis');
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
      expect(mockRedis.incr).toHaveBeenCalledWith('ai:interpretation:rate:user-123:' + Math.floor(Date.now() / 3600000));
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

      expect(result).toEqual(cached);
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
```

**Step 5: 运行测试**

```bash
pnpm run test -- src/modules/divination/glm.service.spec.ts
```

期望输出：全部测试通过

**Step 6: 提交**

```bash
git add src/modules/divination/glm.service.ts src/modules/divination/glm.service.spec.ts src/modules/divination/divination.module.ts
git commit -m "feat: create GLMService with rate limiting and caching infrastructure"
```

---

## Phase 2: 数据库 Schema 扩展

### 任务 2.1: 扩展 DivinationRecord Schema

**文件:**
- 修改: `src/database/schemas/divination-record.schema.ts`

**Step 1: 备份当前 Schema**

```bash
cp src/database/schemas/divination-record.schema.ts src/database/schemas/divination-record.schema.ts.bak
```

**Step 2: 修改 Schema 添加 aiInterpretation 字段**

在 `src/database/schemas/divination-record.schema.ts` 中，找到 Schema 定义，在 `interpretation` 字段后添加：

```typescript
// 在 @Schema() 装饰器的类中，添加新字段：
@Prop({ required: false })
aiInterpretation?: {
  summary: string;
  detailedAnalysis: string;
  advice: string;
  prompt?: string;
  model?: string;
  createdAt: Date;
  cached: boolean;
};
```

完整的 Schema 修改部分应该类似：

```typescript
@Schema({ timestamps: true })
export class DivinationRecord {
  // ... 现有字段

  @Prop({ required: false })
  aiInterpretation?: {
    summary: string;
    detailedAnalysis: string;
    advice: string;
    prompt?: string;
    model?: string;
    createdAt: Date;
    cached: boolean;
  };

  // ... 其他字段
}
```

**Step 3: 运行测试确保 Schema 变更不影响现有功能**

```bash
pnpm run test -- src/modules/divination/divination.service.spec.ts
pnpm run test -- src/modules/divination/divination.controller.spec.ts
```

期望输出：所有测试通过

**Step 4: 提交**

```bash
git add src/database/schemas/divination-record.schema.ts
git commit -m "feat: add aiInterpretation field to DivinationRecord schema"
```

---

### 任务 2.2: 创建 AI 解读 DTO

**文件:**
- 创建: `src/modules/divination/dto/ai-interpretation.dto.ts`

**Step 1: 创建 DTO 文件**

```bash
touch src/modules/divination/dto/ai-interpretation.dto.ts
```

**Step 2: 编写 DTO**

```typescript
import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * AI 解读请求 DTO
 */
export class RequestAIInterpretationDto {
  @ApiProperty({
    description: '用户的问题（可选，用于个性化解读）',
    required: false,
  })
  @IsOptional()
  @IsString()
  question?: string;
}

/**
 * AI 解读响应 DTO
 */
export class AIInterpretationResponseDto {
  @ApiProperty({ description: '记录ID' })
  recordId: string;

  @ApiProperty({ description: 'AI 解读结果' })
  aiInterpretation: {
    summary: string;
    detailedAnalysis: string;
    advice: string;
    createdAt: Date;
  };

  @ApiProperty({ description: '是否来自缓存' })
  cached: boolean;
}

/**
 * AI 解读内容 DTO
 */
export class AIInterpretationContentDto {
  @ApiProperty({ description: '核心解读摘要' })
  summary: string;

  @ApiProperty({ description: '详细分析' })
  detailedAnalysis: string;

  @ApiProperty({ description: '行动建议' })
  advice: string;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;
}
```

**Step 3: 提交**

```bash
git add src/modules/divination/dto/ai-interpretation.dto.ts
git commit -m "feat: create DTOs for AI interpretation"
```

---

## Phase 3: GLMService 核心方法实现

### 任务 3.1: 实现 buildHexagramPrompt 方法

**文件:**
- 修改: `src/modules/divination/glm.service.ts`

**Step 1: 添加依赖注入**

在 `GLMService` 构造函数中添加 HexagramModel：

```typescript
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Hexagram } from '../../database/schemas/hexagram.schema';

constructor(
  private readonly configService: ConfigService,
  private readonly httpService: HttpService,
  @InjectRedis() private readonly redis: Redis,
  @InjectModel('Hexagram') private readonly hexagramModel: Model<Hexagram>,
) {
  // ... 现有代码
}
```

**Step 2: 实现 buildHexagramPrompt 方法**

替换 `buildHexagramPrompt` 方法为：

```typescript
/**
 * 组织卦象提示词
 * @param hexagram 卦象数据
 * @param question 用户问题
 * @returns 提示词
 */
private async buildHexagramPrompt(
  hexagram: any,
  question?: string,
): Promise<string> {
  // 获取主卦数据
  const primaryHexagram = await this.hexagramModel
    .findOne({ sequence: hexagram.primary.sequence })
    .exec();

  if (!primaryHexagram) {
    throw new InternalServerErrorException('卦象数据不存在');
  }

  let prompt = `你是一位精通周易的解卦大师。请根据以下卦象信息，结合周易传统理论，为用户提供专业、深刻的解卦分析。\n\n`;

  // 基本信息
  prompt += `【卦象基本信息】\n`;
  prompt += `主卦：${primaryHexagram.name}（${primaryHexagram.symbol}）- 第${primaryHexagram.sequence}卦\n`;
  prompt += `卦辞：${primaryHexagram.guaci.original}\n`;
  prompt += `卦辞译文：${primaryHexagram.guaci.translation}\n\n`;

  // 六爻分析
  prompt += `【六爻分析】\n`;
  primaryHexagram.yaoci.forEach((yao: any) => {
    prompt += `${yao.position}爻：${yao.original} - ${yao.translation}\n`;
  });
  prompt += `\n`;

  // 变卦信息
  if (hexagram.changingLines && hexagram.changingLines.length > 0) {
    prompt += `【变卦信息】\n`;
    prompt += `变爻位置：${hexagram.changingLines.join('、')}爻\n`;
    prompt += `变卦：${hexagram.changed.name}（${hexagram.changed.symbol}）\n`;

    const changedHexagram = await this.hexagramModel
      .findOne({ sequence: hexagram.changed.sequence })
      .exec();

    if (changedHexagram) {
      prompt += `变卦卦辞：${changedHexagram.guaci.original}\n`;
    }
    prompt += `\n`;
  }

  // 互卦信息
  if (hexagram.mutual) {
    prompt += `【互卦信息】\n`;
    prompt += `互卦：${hexagram.mutual.name}（${hexagram.mutual.symbol}）\n`;

    const mutualHexagram = await this.hexagramModel
      .findOne({ sequence: hexagram.mutual.sequence })
      .exec();

    if (mutualHexagram) {
      prompt += `互卦说明：互卦由二三四爻和三四五爻组成，代表事情发展的中间过程。\n`;
    }
    prompt += `\n`;
  }

  // 用户问题
  if (question) {
    prompt += `【用户问题】\n`;
    prompt += `${question}\n\n`;
  }

  // 解读要求
  prompt += `【解读要求】\n`;
  prompt += `请从以下几个方面进行解读：\n`;
  prompt += `1. 核心卦意：用简洁的语言概括卦象的核心含义（100-150字）\n`;
  prompt += `2. 详细分析：结合卦辞、爻辞、变爻、互卦进行深入分析（500-800字）\n`;
  prompt += `3. 实践建议：给出具体的行动建议和注意事项（200-300字）\n\n`;

  prompt += `请用专业但不晦涩的语言，让现代读者能够理解并应用。\n\n`;

  prompt += `请以 JSON 格式返回：\n`;
  prompt += `{\n`;
  prompt += `  "summary": "核心解读摘要",\n`;
  prompt += `  "detailedAnalysis": "详细分析",\n`;
  prompt += `  "advice": "行动建议"\n`;
  prompt += `}\n`;

  return prompt;
}
```

**Step 3: 更新测试**

在 `glm.service.spec.ts` 中添加测试：

```typescript
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

    // 重新注入 hexagramModel
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GLMService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: HttpService, useValue: mockHttpService },
        { provide: 'Redis', useValue: mockRedis },
        { provide: 'Hexagram', useValue: mockHexagramModel },
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
```

**Step 4: 运行测试**

```bash
pnpm run test -- src/modules/divination/glm.service.spec.ts
```

**Step 5: 提交**

```bash
git add src/modules/divination/glm.service.ts src/modules/divination/glm.service.spec.ts
git commit -m "feat: implement buildHexagramPrompt method"
```

---

### 任务 3.2: 实现 generateAIInterpretation 方法

**文件:**
- 修改: `src/modules/divination/glm.service.ts`

**Step 1: 添加 DivinationRecord 依赖**

```typescript
import { DivinationRecord } from '../../database/schemas/divination-record.schema';

constructor(
  private readonly configService: ConfigService,
  private readonly httpService: HttpService,
  @InjectRedis() private readonly redis: Redis,
  @InjectModel('Hexagram') private readonly hexagramModel: Model<Hexagram>,
  @InjectModel('DivinationRecord') private readonly divinationRecordModel: Model<DivinationRecord>,
) {
  // ... 现有代码
}
```

**Step 2: 实现 generateAIInterpretation 完整方法**

替换 `generateAIInterpretation` 方法为：

```typescript
/**
 * 生成 AI 解读（主要方法）
 * @param recordId 记录ID
 * @param userId 用户ID
 * @param question 用户问题
 * @returns AI 解读结果
 */
async generateAIInterpretation(
  recordId: string,
  userId: string,
  question?: string,
): Promise<AIInterpretation> {
  // 1. 检查限流
  const allowed = await this.checkRateLimit(userId);
  if (!allowed) {
    throw new HttpException(
      '请求过于频繁，请稍后再试',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  // 2. 获取记录
  const record = await this.divinationRecordModel
    .findOne({ _id: recordId, userId })
    .exec();

  if (!record) {
    throw new BadRequestException('卜卦记录不存在');
  }

  // 3. 如果已有 AI 解读，直接返回
  if (record.aiInterpretation) {
    this.logger.log(`Returning existing AI interpretation for record ${recordId}`);
    return record.aiInterpretation;
  }

  // 4. 检查缓存
  const cached = await this.getCachedInterpretation(
    record.hexagram.primary.sequence,
    question,
  );

  if (cached) {
    // 保存到记录
    await this.divinationRecordModel
      .updateOne(
        { _id: recordId },
        { $set: { aiInterpretation: cached } },
      )
      .exec();

    return cached;
  }

  // 5. 获取分布式锁
  const lockAcquired = await this.acquireLock(recordId);
  if (!lockAcquired) {
    throw new HttpException(
      '正在处理中，请稍后再试',
      HttpStatus.CONFLICT,
    );
  }

  try {
    // 6. 组织提示词
    const prompt = await this.buildHexagramPrompt(
      record.hexagram,
      question,
    );

    this.logger.log(`Calling GLM API for record ${recordId}`);

    // 7. 调用 GLM API
    const responseText = await this.callGLM(prompt);

    // 8. 解析响应
    let parsedResponse: any;

    try {
      // 尝试提取 JSON（处理可能的代码块格式）
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
                       responseText.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const jsonString = jsonMatch[1] || jsonMatch[0];
        parsedResponse = JSON.parse(jsonString);
      } else {
        parsedResponse = JSON.parse(responseText);
      }
    } catch (e) {
      // JSON 解析失败，使用文本分段
      this.logger.warn('Failed to parse GLM response as JSON, using text extraction');

      const sections = responseText.split(/\n\n+|\n\s*-/);
      parsedResponse = {
        summary: sections[0] || '解读生成中...',
        detailedAnalysis: sections[1] || responseText,
        advice: sections[2] || '请根据卦象谨慎行事',
      };
    }

    // 9. 构建解读结果
    const interpretation: AIInterpretation = {
      summary: parsedResponse.summary || '',
      detailedAnalysis: parsedResponse.detailedAnalysis || '',
      advice: parsedResponse.advice || '',
      prompt, // 保存提示词用于调试
      model: this.model,
      createdAt: new Date(),
      cached: false,
    };

    // 10. 保存到记录
    await this.divinationRecordModel
      .updateOne(
        { _id: recordId },
        { $set: { aiInterpretation: interpretation } },
      )
      .exec();

    // 11. 保存到缓存
    await this.setCachedInterpretation(
      record.hexagram.primary.sequence,
      interpretation,
      question,
    );

    this.logger.log(`AI interpretation generated for record ${recordId}`);

    return interpretation;

  } finally {
    // 12. 释放锁
    await this.releaseLock(recordId);
  }
}
```

**Step 3: 更新测试**

在 `glm.service.spec.ts` 中添加完整的测试：

```typescript
import { BadRequestException } from '@nestjs/common';

// ... 在测试文件中添加：

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
```

**Step 4: 运行测试**

```bash
pnpm run test -- src/modules/divination/glm.service.spec.ts
```

**Step 5: 提交**

```bash
git add src/modules/divination/glm.service.ts src/modules/divination/glm.service.spec.ts
git commit -m "feat: implement generateAIInterpretation with full workflow"
```

---

## Phase 4: Controller 端点实现

### 任务 4.1: 添加 AI 解读端点

**文件:**
- 修改: `src/modules/divination/divination.controller.ts`

**Step 1: 添加 DTO 导入**

在 `divination.controller.ts` 顶部添加导入：

```typescript
import { RequestAIInterpretationDto } from './dto/ai-interpretation.dto';
```

**Step 2: 添加端点方法**

在 `DivinationController` 类中添加新方法：

```typescript
/**
 * 获取 AI 深度解读
 * 需要登录
 */
@UseGuards(JwtAuthGuard)
@Post('record/:id/ai-interpretation')
async getAIInterpretation(
  @Param('id') id: string,
  @CurrentUser() user: any,
  @Body() dto: RequestAIInterpretationDto,
) {
  const result = await this.glmService.generateAIInterpretation(
    id,
    user.userId,
    dto.question,
  );

  return {
    success: true,
    data: {
      recordId: id,
      aiInterpretation: {
        summary: result.summary,
        detailedAnalysis: result.detailedAnalysis,
        advice: result.advice,
        createdAt: result.createdAt,
      },
      cached: result.cached,
    },
    message: '获取 AI 解卦成功',
    timestamp: Date.now(),
  };
}
```

**Step 3: 在构造函数中注入 GLMService**

确保 Controller 构造函数中有 `glmService`：

```typescript
constructor(
  private readonly divinationService: DivinationService,
  private readonly analysisService: HexagramAnalysisService,
  private readonly interpretationService: InterpretationService,
  private readonly glmService: GLMService,  // 添加这一行
) {}
```

**Step 4: 更新 Controller 测试**

在 `divination.controller.spec.ts` 中添加测试：

```typescript
describe('POST /record/:id/ai-interpretation', () => {
  it('should return AI interpretation for authenticated user', async () => {
    const mockUser = { userId: 'user-123' };
    const mockAIInterpretation = {
      summary: '测试摘要',
      detailedAnalysis: '测试分析',
      advice: '测试建议',
      createdAt: new Date(),
      cached: false,
    };

    jest.spyOn(glmService, 'generateAIInterpretation')
      .mockResolvedValue(mockAIInterpretation);

    const response = await controller.getAIInterpretation('record-123', mockUser, {});

    expect(response.success).toBe(true);
    expect(response.data.aiInterpretation).toBeDefined();
    expect(response.message).toBe('获取 AI 解卦成功');
  });

  it('should require authentication', async () => {
    // 测试未认证用户会被拒绝
  });
});
```

**Step 5: 运行测试**

```bash
pnpm run test -- src/modules/divination/divination.controller.spec.ts
```

**Step 6: 提交**

```bash
git add src/modules/divination/divination.controller.ts src/modules/divination/divination.controller.spec.ts
git commit -m "feat: add AI interpretation endpoint"
```

---

## Phase 5: Swagger 文档更新

### 任务 5.1: 添加 API 文档装饰器

**文件:**
- 修改: `src/modules/divination/divination.controller.ts`

**Step 1: 添加 ApiTags 和 ApiResponse 装饰器**

更新端点方法，添加完整的 Swagger 文档：

```typescript
import { ApiResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

// 在类装饰器中添加：
@ApiTags('divination')
@Controller('divination')
export class DivinationController {
  // ...
}

/**
 * 获取 AI 深度解读
 * 需要登录
 */
@ApiOperation({
  summary: '获取 AI 深度解读',
  description: '为登录用户提供基于 GLM 大语言模型的智能解卦服务。每个用户每小时最多请求 10 次。',
})
@ApiResponse({
  status: 200,
  description: '获取成功',
  type: AIInterpretationResponseDto,
})
@ApiResponse({
  status: 400,
  description: '请求参数错误',
})
@ApiResponse({
  status: 401,
  description: '未登录',
})
@ApiResponse({
  status: 429,
  description: '请求频率超限',
})
@UseGuards(JwtAuthGuard)
@Post('record/:id/ai-interpretation')
async getAIInterpretation(
  @Param('id') id: string,
  @CurrentUser() user: any,
  @Body() dto: RequestAIInterpretationDto,
) {
  // ... 现有代码
}
```

**Step 2: 提交**

```bash
git add src/modules/divination/divination.controller.ts
git commit -m "docs: add Swagger documentation for AI interpretation endpoint"
```

---

## Phase 6: 端到端测试

### 任务 6.1: 编写集成测试

**文件:**
- 创建: `src/modules/divination/ai-interpretation.integration.spec.ts`

**Step 1: 创建集成测试文件**

```bash
touch src/modules/divination/ai-interpretation.integration.spec.ts
```

**Step 2: 编写集成测试**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect, connection, Document, Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Redis } from 'ioredis';

describe('AI Interpretation Integration Tests', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;
  let userModel: Model<any>;
  let divinationRecordModel: Model<any>;
  let jwtService: JwtService;
  let redis: Redis;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    // 启动内存 MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // 创建测试模块
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).overrideProvider(getModelToken('User'))
      .useValue(createTestModel())
      .overrideProvider(getModelToken('DivinationRecord'))
      .useValue(createTestModel())
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    userModel = app.get(getModelToken('User'));
    divinationRecordModel = app.get(getModelToken('DivinationRecord'));
    jwtService = app.get(JwtService);
    redis = app.get<Redis>('Redis');

    // 创建测试用户并获取 token
    const user = await userModel.create({
      phone: '13800138000',
      passwordHash: 'hash',
    });
    userId = user._id.toString();
    accessToken = jwtService.sign({ userId, phone: user.phone });
  });

  afterAll(async () => {
    await connection.close();
    await mongoServer.stop();
    await app.close();
  });

  beforeEach(async () => {
    // 清空 Redis
    await redis.flushdb();
    // 清空数据库
    await divinationRecordModel.deleteMany({});
  });

  describe('POST /api/v1/divination/record/:id/ai-interpretation', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/divination/record/507f1f77bcf86cd799439011/ai-interpretation')
        .expect(401);
    });

    it('should return 404 for non-existent record', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/divination/record/507f1f77bcf86cd799439011/ai-interpretation')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should rate limit requests', async () => {
      // 创建测试记录
      const record = await divinationRecordModel.create({
        userId,
        hexagram: { primary: { sequence: 1 } },
      });

      // 发送 11 次请求
      for (let i = 0; i < 11; i++) {
        const response = await request(app.getHttpServer())
          .post(`/api/v1/divination/record/${record._id}/ai-interpretation`)
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ question: '测试问题' });

        if (i < 10) {
          expect(response.status).toBe(200);
        } else {
          expect(response.status).toBe(429);
        }
      }
    });
  });
});
```

**Step 3: 运行集成测试**

```bash
pnpm run test -- src/modules/divination/ai-interpretation.integration.spec.ts
```

**Step 4: 提交**

```bash
git add src/modules/divination/ai-interpretation.integration.spec.ts
git commit -m "test: add AI interpretation integration tests"
```

---

## Phase 7: 手动测试与验证

### 任务 7.1: 本地测试

**Step 1: 启动开发服务器**

```bash
pnpm run start:dev
```

**Step 2: 测试 API 端点**

```bash
# 首先登录获取 token
TOKEN=$(curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","code":"123456"}' \
  | jq -r '.data.accessToken')

# 创建一个卜卦记录
RECORD_ID=$(curl -X POST http://localhost:3000/api/v1/divination/divinate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  | jq -r '.data.recordId')

# 获取 AI 解读
curl -X POST http://localhost:3000/api/v1/divination/record/$RECORD_ID/ai-interpretation \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"question":"我的事业会如何发展？"}' \
  | jq .
```

**Step 3: 验证响应**

预期响应格式：
```json
{
  "success": true,
  "data": {
    "recordId": "...",
    "aiInterpretation": {
      "summary": "...",
      "detailedAnalysis": "...",
      "advice": "...",
      "createdAt": "2026-01-16T..."
    },
    "cached": false
  },
  "message": "获取 AI 解卦成功",
  "timestamp": 1234567890
}
```

**Step 4: 验证缓存**

再次请求同一记录，应该返回 `cached: true`：

```bash
curl -X POST http://localhost:3000/api/v1/divination/record/$RECORD_ID/ai-interpretation \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  | jq '.data.cached'
```

预期输出：`true`

**Step 5: 验证限流**

快速发送 11 次请求，第 11 次应该返回 429：

```bash
for i in {1..11}; do
  curl -X POST http://localhost:3000/api/v1/divination/record/$RECORD_ID/ai-interpretation \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -w "\nStatus: %{http_code}\n"
done
```

---

## Phase 8: 前端集成准备

### 任务 8.1: 更新前端 API 客户端

**文件:**
- 修改: `frontend/packages/shared/services/divination.ts`

**Step 1: 添加 AI 解读方法**

```typescript
/**
 * 获取 AI 深度解读
 * @param recordId 卜卦记录 ID
 * @param question 用户的问题（可选）
 * @returns AI 解读结果
 */
async getAIInterpretation(
  recordId: string,
  question?: string,
): Promise<{
  success: boolean;
  data: {
    recordId: string;
    aiInterpretation: {
      summary: string;
      detailedAnalysis: string;
      advice: string;
      createdAt: Date;
    };
    cached: boolean;
  };
  message: string;
  timestamp: number;
}> {
  return this.apiClient.post(
    `/divination/record/${recordId}/ai-interpretation`,
    { question },
  );
}
```

**Step 2: 提交**

```bash
git add frontend/packages/shared/services/divination.ts
git commit -m "feat: add getAIInterpretation method to shared API client"
```

---

## 完成！

### 验证清单

- [ ] GLMService 基础设施完成
- [ ] Schema 扩展完成
- [ ] buildHexagramPrompt 实现完成
- [ ] generateAIInterpretation 实现完成
- [ ] Controller 端点添加完成
- [ ] Swagger 文档更新完成
- [ ] 单元测试全部通过
- [ ] 集成测试通过
- [ ] 手动测试验证通过
- [ ] 前端 API 客户端更新完成

### 后续步骤

1. **前端 UI 开发**：在卜卦结果页面添加「获取 AI 深度解读」按钮
2. **监控设置**：配置日志和指标监控
3. **成本优化**：根据实际使用情况调整缓存策略
4. **用户反馈**：添加点赞/点踩功能

---

**计划版本**: 1.0
**创建日期**: 2026-01-16
**预计工作量**: 5-7 天
