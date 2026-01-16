import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { InjectRedis } from '@nestjs-modules/ioredis';
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
    const currentHour = Math.floor(Date.now() / 3600000);
    const key = `ai:interpretation:rate:${userId}:${currentHour}`;

    const count = await this.redis.incr(key);

    if (count === 1) {
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
      const parsed = JSON.parse(cached) as AIInterpretation;
      // 将字符串日期转换回 Date 对象
      parsed.createdAt = new Date(parsed.createdAt);
      return parsed;
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
   */
  async generateAIInterpretation(
    recordId: string,
    userId: string,
    question?: string,
  ): Promise<AIInterpretation> {
    throw new Error('Not implemented yet');
  }

  /**
   * 组织卦象提示词（待实现）
   */
  private async buildHexagramPrompt(
    hexagram: any,
    question?: string,
  ): Promise<string> {
    throw new Error('Not implemented yet');
  }
}
