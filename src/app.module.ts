import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './modules/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { SmsModule } from './services/sms/sms.module';
import { CryptoModule } from './services/crypto/crypto.module';
import { HexagramModule } from './modules/hexagram/hexagram.module';
import { DivinationModule } from './modules/divination/divination.module';
import { LearningModule } from './modules/learning/learning.module';
import { DailyHexagramModule } from './modules/daily-hexagram/daily-hexagram.module';
import { MembershipModule } from './modules/membership/membership.module';
import { UserModule } from './services/user/user.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import databaseConfig from './config/database.config';

/**
 * 应用根模块
 */
@Module({
  imports: [
    // 配置模块 - 加载环境变量
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [databaseConfig],
    }),

    // 数据库模块
    DatabaseModule,

    // Redis 模块
    RedisModule,

    // 短信服务模块
    SmsModule,

    // 加密服务模块
    CryptoModule,

    // 认证模块
    AuthModule,

    // 卦象模块
    HexagramModule,

    // 卜卦模块
    DivinationModule,

    // 学习模块
    LearningModule,

    // 每日一卦模块
    DailyHexagramModule,

    // 会员模块
    MembershipModule,

    // 用户服务模块
    UserModule,
  ],
  controllers: [],
  providers: [
    // 全局响应拦截器
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    // 全局异常过滤器
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
