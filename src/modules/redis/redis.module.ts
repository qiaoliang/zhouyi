import { Module, Global } from '@nestjs/common';
import { RedisModule as NestRedisModule } from '@nestjs-modules/ioredis';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

/**
 * Redis 模块
 * 提供缓存和会话管理功能
 */
@Global()
@Module({
  imports: [
    NestRedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'single',
        url: `redis://${configService.get('REDIS_HOST') || 'localhost'}:${configService.get('REDIS_PORT') || 6379}`,
        password: configService.get('REDIS_PASSWORD') || undefined,
        db: parseInt(configService.get('REDIS_DB') || '0', 10),
      }),
    }),
  ],
  providers: [RedisService],
  exports: [RedisService, NestRedisModule],
})
export class RedisModule {}
