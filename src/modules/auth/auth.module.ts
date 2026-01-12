import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User, UserSchema } from '../../database/schemas/user.schema';
import { RedisModule } from '../redis/redis.module';
import { SmsModule } from '../../services/sms/sms.module';
import { WechatModule } from '../../services/wechat/wechat.module';

/**
 * 认证模块
 * 提供用户认证、Token管理等功能
 */
@Module({
  imports: [
    // MongoDB 用户模型
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),

    // Redis 模块
    RedisModule,

    // 短信服务模块
    SmsModule,

    // 微信服务模块
    WechatModule,

    // Passport 模块
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // JWT 模块
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN', '15m'),
        },
      }),
    }),

    // 限流模块
    ThrottlerModule.forRoot([{
      ttl: 60000, // 60秒
      limit: 10,  // 最多10次请求
    }]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
  ],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
