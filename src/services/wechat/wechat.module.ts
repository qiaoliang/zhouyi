import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '../../modules/redis/redis.module';
import { WechatService } from './wechat.service';

/**
 * 微信服务模块
 * 提供微信登录、用户信息获取等功能
 */
@Module({
  imports: [ConfigModule, RedisModule],
  providers: [WechatService],
  exports: [WechatService],
})
export class WechatModule {}
