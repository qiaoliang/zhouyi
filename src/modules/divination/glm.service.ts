import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { InjectModel } from '@nestjs/mongoose';
import Redis from 'ioredis';
import { firstValueFrom } from 'rxjs';
import { createHash } from 'crypto';
import { AxiosError } from 'axios';
import { Model } from 'mongoose';
import { Hexagram, IYaoCi } from '../../database/schemas/hexagram.schema';

/**
 * 常量定义
 */
const HOUR_IN_MS = 3600000;
const HOUR_IN_SECONDS = 3600;

/**
 * 卦象基本信息接口（用于生成提示词）
 */
interface IHexagramInfo {
  sequence: number;
  name: string;
  symbol: string;
}

/**
 * 卦象提示词输入接口
 */
interface IHexagramPromptInput {
  primary: IHexagramInfo;
  changed?: IHexagramInfo;
  mutual?: IHexagramInfo;
  changingLines?: number[];
}

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
  private readonly lockTTL: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @InjectRedis() private readonly redis: Redis,
    @InjectModel('Hexagram') private readonly hexagramModel: Model<Hexagram>,
  ) {
    this.apiKey = this.configService.get<string>('GLM_API_KEY') || '';
    this.baseUrl = this.configService.get<string>('GLM_BASE_URL') || 'https://open.bigmodel.cn/api/paas/v4';
    this.model = this.configService.get<string>('GLM_MODEL') || 'glm-4-flash';
    this.timeout = this.configService.get<number>('GLM_TIMEOUT') || 30000;
    this.maxTokens = this.configService.get<number>('GLM_MAX_TOKENS') || 2000;
    this.rateLimit = this.configService.get<number>('AI_INTERPRETATION_RATE_LIMIT') || 10;
    this.cacheTTL = this.configService.get<number>('AI_INTERPRETATION_CACHE_TTL') || 86400;
    this.lockTTL = this.configService.get<number>('AI_INTERPRETATION_LOCK_TTL') || 60;

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
    const currentHour = Math.floor(Date.now() / HOUR_IN_MS);
    const key = `ai:interpretation:rate:${userId}:${currentHour}`;

    const count = await this.redis.incr(key);

    if (count === 1) {
      await this.redis.expire(key, HOUR_IN_SECONDS);
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
    const result = await this.redis.set(lockKey, '1', 'EX', this.lockTTL, 'NX');

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
    } catch (error: unknown) {
      // 类型守卫：检查是否为 AxiosError
      if (this.isAxiosError(error)) {
        const sanitizedMessage = this.sanitizeErrorMessage(error.message);
        this.logger.error(`GLM API Error: ${sanitizedMessage}`);

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

      // 处理非 Axios 错误
      if (error instanceof Error) {
        this.logger.error(`GLM Service Error: ${error.message}`);
        throw new InternalServerErrorException('AI 解读服务暂时不可用');
      }

      // 处理未知错误类型
      this.logger.error('GLM Service Unknown Error');
      throw new InternalServerErrorException('AI 解读服务暂时不可用');
    }
  }

  /**
   * 类型守卫：检查是否为 AxiosError
   */
  private isAxiosError(error: unknown): error is AxiosError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'isAxiosError' in error &&
      (error as AxiosError).isAxiosError === true
    );
  }

  /**
   * 清理错误消息，移除敏感信息
   */
  private sanitizeErrorMessage(message: string): string {
    // 移除可能的 API key
    let sanitized = message.replace(new RegExp(this.apiKey, 'g'), '***');
    // 移除 Bearer token
    sanitized = sanitized.replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, 'Bearer ***');
    return sanitized;
  }

  /**
   * 生成 AI 解读（主要方法，待实现）
   */
  async generateAIInterpretation(
    recordId: string,
    userId: string,
    question?: string,
  ): Promise<AIInterpretation> {
    // 输入验证
    if (!recordId || recordId.trim() === '') {
      throw new InternalServerErrorException('记录ID不能为空');
    }

    if (!userId || userId.trim() === '') {
      throw new InternalServerErrorException('用户ID不能为空');
    }

    throw new InternalServerErrorException('AI 解读功能暂未实现');
  }

  /**
   * 组织卦象提示词
   * @param hexagram 卦象数据
   * @param question 用户问题
   * @returns 提示词
   */
  private async buildHexagramPrompt(
    hexagram: IHexagramPromptInput,
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
    primaryHexagram.yaoci.forEach((yao: IYaoCi) => {
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
}
