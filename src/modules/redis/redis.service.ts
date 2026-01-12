import { Injectable, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
import { InjectRedis } from '@nestjs-modules/ioredis';

/**
 * Redis 服务
 * 提供常用的 Redis 操作方法
 */
@Injectable()
export class RedisService {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * 设置键值对
   */
  async set(key: string, value: string, ttl?: number): Promise<'OK'> {
    if (ttl) {
      return this.redis.setex(key, ttl, value);
    }
    return this.redis.set(key, value);
  }

  /**
   * 获取值
   */
  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  /**
   * 删除键
   */
  async del(key: string): Promise<number> {
    return this.redis.del(key);
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<number> {
    return this.redis.exists(key);
  }

  /**
   * 设置过期时间
   */
  async expire(key: string, seconds: number): Promise<number> {
    return this.redis.expire(key, seconds);
  }

  /**
   * 获取剩余过期时间
   */
  async ttl(key: string): Promise<number> {
    return this.redis.ttl(key);
  }

  /**
   * 哈希操作 - 设置字段
   */
  async hset(key: string, field: string, value: string): Promise<number> {
    return this.redis.hset(key, field, value);
  }

  /**
   * 哈希操作 - 获取所有字段
   */
  async hgetall(key: string): Promise<Record<string, string>> {
    return this.redis.hgetall(key);
  }

  /**
   * 哈希操作 - 删除字段
   */
  async hdel(key: string, ...fields: string[]): Promise<number> {
    return this.redis.hdel(key, ...fields);
  }

  /**
   * 自增操作
   */
  async incr(key: string): Promise<number> {
    return this.redis.incr(key);
  }

  /**
   * 清空当前数据库
   */
  async flushdb(): Promise<'OK'> {
    return this.redis.flushdb();
  }
}
