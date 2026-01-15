import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const guestId = request.body?.device?.deviceId;
    const ip = request.ip;

    if (!guestId) {
      return true; // 如果没有 guestId，跳过限流
    }

    const key = `rate_limit:guest_divination:${guestId}`;
    const limit = 5; // 每分钟5次
    const window = 60; // 60秒

    try {
      const current = await this.redis.incr(key);

      if (current === 1) {
        await this.redis.expire(key, window);
      }

      if (current > limit) {
        const ttl = await this.redis.ttl(key);
        this.logger.warn(`Rate limit exceeded for guestId: ${guestId}`);
        throw new Error(`请求过于频繁，请在 ${ttl} 秒后重试`);
      }

      return true;
    } catch (error) {
      this.logger.error('Rate limit check failed', error);
      // 如果 Redis 出错，允许请求通过
      return true;
    }
  }
}