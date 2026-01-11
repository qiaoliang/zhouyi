# 周易通APP - NestJS后端服务框架搭建指南

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | v1.0 |
| 创建日期 | 2026-01-11 |
| 框架版本 | Nest.js 10.x + Node.js 20.x |

---

## 1. 项目初始化

### 1.1 创建Nest.js项目

```bash
# 使用Nest CLI创建项目
npm install -g @nestjs/cli
nest new zhouyi-api --package-manager pnpm

cd zhouyi-api

# 安装额外依赖
pnpm add @nestjs/config @nestjs/jwt @nestjs/passport passport passport-jwt
pnpm add @nestjs/mongoose @nestjs/schedule @nestjs/throttler
pnpm add mongoose redis class-validator class-transformer
pnpm add bcrypt uuid
pnpm add winston nest-winston

# 开发依赖
pnpm add -D @types/uuid @types/bcrypt @types/passport-jwt
```

---

### 1.2 项目目录结构

```
zhouyi-api/
├── src/
│   ├── main.ts                        # 应用入口
│   ├── app.module.ts                  # 根模块
│   │
│   ├── common/                        # 公共模块
│   │   ├── decorators/                # 自定义装饰器
│   │   │   ├── current-user.decorator.ts
│   │   │   └── public.decorator.ts
│   │   ├── filters/                   # 异常过滤器
│   │   │   └── http-exception.filter.ts
│   │   ├── guards/                    # 守卫
│   │   │   ├── auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── interceptors/              # 拦截器
│   │   │   ├── logging.interceptor.ts
│   │   │   └── transform.interceptor.ts
│   │   ├── pipes/                     # 管道
│   │   │   └── validation.pipe.ts
│   │   └── utils/                     # 工具函数
│   │       ├── crypto.util.ts
│   │       ├── date.util.ts
│   │       └── phone.util.ts
│   │
│   ├── config/                        # 配置
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   └── jwt.config.ts
│   │
│   ├── modules/                       # 业务模块
│   │   ├── user/                      # 用户模块
│   │   │   ├── user.module.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── user.service.ts
│   │   │   ├── schemas/               # Mongoose Schemas
│   │   │   │   └── user.schema.ts
│   │   │   ├── dto/                   # 数据传输对象
│   │   │   │   ├── create-user.dto.ts
│   │   │   │   ├── update-user.dto.ts
│   │   │   │   └── login.dto.ts
│   │   │   └── interfaces/
│   │   │       └── user.interface.ts
│   │   │
│   │   ├── auth/                      # 认证模块
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   └── wechat.strategy.ts
│   │   │   └── dto/
│   │   │       └── login.dto.ts
│   │   │
│   │   ├── divination/                # 卜卦模块
│   │   │   ├── divination.module.ts
│   │   │   ├── divination.controller.ts
│   │   │   ├── divination.service.ts
│   │   │   └── schemas/
│   │   │       └── divination.schema.ts
│   │   │
│   │   ├── content/                   # 内容模块
│   │   │   ├── content.module.ts
│   │   │   ├── content.controller.ts
│   │   │   ├── content.service.ts
│   │   │   └── schemas/
│   │   │       └── hexagram.schema.ts
│   │   │
│   │   ├── payment/                   # 支付模块
│   │   │   ├── payment.module.ts
│   │   │   ├── payment.controller.ts
│   │   │   ├── payment.service.ts
│   │   │   └── schemas/
│   │   │       └── order.schema.ts
│   │   │
│   │   └── learning/                  # 学习模块
│   │       ├── learning.module.ts
│   │       ├── learning.controller.ts
│   │       ├── learning.service.ts
│   │       └── schemas/
│   │           └── learning.schema.ts
│   │
│   ├── database/                      # 数据库
│   │   ├── schemas/                   # Mongoose Schemas
│   │   └── repositories/              # 数据访问层
│   │
│   ├── services/                      # 第三方服务
│   │   ├── wechat/                    # 微信服务
│   │   │   ├── wechat.service.ts
│   │   │   └── wechatpay.service.ts
│   │   ├── alipay/                    # 支付宝服务
│   │   │   └── alipay.service.ts
│   │   ├── sms/                       # 短信服务
│   │   │   └── sms.service.ts
│   │   ├── oss/                       # 对象存储
│   │   │   └── oss.service.ts
│   │   └── push/                      # 推送服务
│   │       └── push.service.ts
│   │
│   └── jobs/                          # 定时任务
│       ├── daily-hexagram.job.ts
│       └── membership-check.job.ts
│
├── test/                              # 测试
│   ├── unit/
│   └── e2e/
│
├── .env.example                       # 环境变量示例
├── .env                               # 环境变量 (本地)
├── .env.production                    # 环境变量 (生产)
├── .gitignore
├── nest-cli.json
├── tsconfig.json
├── package.json
└── README.md
```

---

## 2. 核心配置

### 2.1 main.ts - 应用入口

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  const configService = app.get(ConfigService);

  // 全局前缀
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api/v1');
  app.setGlobalPrefix(apiPrefix);

  // CORS
  app.enableCors({
    origin: configService.get<string>('app.corsOrigin', '*'),
    credentials: true,
  });

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // 自动移除未定义的属性
      forbidNonWhitelisted: true, // 禁止未定义的属性
      transform: true,           // 自动转换类型
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 全局异常过滤器
  app.useGlobalFilters(new HttpExceptionFilter());

  // 全局拦截器
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // 启动应用
  const port = configService.get<number>('app.port', 3000);
  await app.listen(port);

  logger.log(`🚀 Application is running on: http://localhost:${port}/${apiPrefix}`);
}

bootstrap();
```

---

### 2.2 app.module.ts - 根模块

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

// 配置文件
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import jwtConfig from './config/jwt.config';

// 模块
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { DivinationModule } from './modules/divination/divination.module';
import { ContentModule } from './modules/content/content.module';
import { PaymentModule } from './modules/payment/payment.module';
import { LearningModule } from './modules/learning/learning.module';

// 第三方服务模块
import { WechatModule } from './services/wechat/wechat.module';
import { SmsModule } from './services/sms/sms.module';
import { OssModule } from './services/oss/oss.module';
import { PushModule } from './services/push/push.module';

// 定时任务
import { DailyHexagramJob } from './jobs/daily-hexagram.job';
import { MembershipCheckJob } from './jobs/membership-check.job';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, jwtConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    // MongoDB
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('database.uri'),
      }),
      inject: [ConfigService],
    }),

    // 限流
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000,      // 1分钟
        limit: 10,       // 10次
      },
      {
        name: 'medium',
        ttl: 3600000,    // 1小时
        limit: 100,      // 100次
      },
    ]),

    // 定时任务
    ScheduleModule.forRoot(),

    // 业务模块
    UserModule,
    AuthModule,
    DivinationModule,
    ContentModule,
    PaymentModule,
    LearningModule,

    // 第三方服务
    WechatModule,
    SmsModule,
    OssModule,
    PushModule,
  ],
  providers: [
    DailyHexagramJob,
    MembershipCheckJob,
  ],
})
export class AppModule {}
```

---

### 2.3 配置文件示例

#### app.config.ts

```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  corsOrigin: process.env.CORS_ORIGIN?.split(',') || '*',
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
}));
```

#### database.config.ts

```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/zhouyi',
  options: {
    maxPoolSize: parseInt(process.env.DB_MAX_POOL_SIZE || '10', 10),
    minPoolSize: parseInt(process.env.DB_MIN_POOL_SIZE || '2', 10),
  },
}));
```

#### redis.config.ts

```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
}));
```

---

## 3. 中间件配置

### 3.1 异常过滤器

```typescript
// common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器内部错误';
    let error = 'INTERNAL_SERVER_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = exceptionResponse['message'] || exception.message;
      error = exceptionResponse['error'] || 'HTTP_ERROR';
    }

    // 记录错误日志
    this.logger.error(
      `${request.method} ${request.url} - Status: ${status} - Error: ${message}`,
      exception instanceof Error ? exception.stack : '',
    );

    // 返回统一格式
    response.status(status).json({
      success: false,
      error: {
        code: error,
        message: Array.isArray(message) ? message[0] : message,
      },
      timestamp: new Date().getTime(),
    });
  }
}
```

---

### 3.2 日志拦截器

```typescript
// common/interceptors/logging.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const startTime = Date.now();

    this.logger.log(
      `→ ${method} ${url} - ${ip} - ${userAgent}`,
    );

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.logger.log(
            `✓ ${method} ${url} - ${duration}ms`,
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            `✗ ${method} ${url} - ${duration}ms - ${error.message}`,
          );
        },
      }),
    );
  }
}
```

---

### 3.3 转换拦截器

```typescript
// common/interceptors/transform.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data: data || null,
        message: '操作成功',
        timestamp: new Date().getTime(),
      })),
    );
  }
}
```

---

## 4. 守卫

### 4.1 JWT认证守卫

```typescript
// common/guards/auth.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('未登录或登录已过期');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('app.jwt.secret'),
      });

      request.user = payload;
    } catch (error) {
      throw new UnauthorizedException('登录已过期，请重新登录');
    }

    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
```

---

### 4.2 公共路由装饰器

```typescript
// common/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

---

## 5. 数据库Schema示例

### 5.1 用户Schema

```typescript
// modules/user/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ type: String, unique: true, sparse: true })
  unionId: string;

  @Prop({ type: String, unique: true, sparse: true })
  openId: string;

  @Prop()
  phoneNumber: string;

  @Prop()
  nickname: string;

  @Prop()
  avatar: string;

  @Prop({
    type: {
      type: String,
      enum: ['free', 'monthly', 'yearly'],
      default: 'free',
    },
  })
  membership: {
    type: string;
    level: number;
    expireAt: Date;
  };

  @Prop({ default: false })
  isGuest: boolean;

  @Prop({ default: 'active' })
  status: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// 索引
UserSchema.index({ unionId: 1 }, { unique: true, sparse: true });
UserSchema.index({ openId: 1 }, { unique: true, sparse: true });
UserSchema.index({ phoneNumber: 1 }, { unique: true, sparse: true });
```

---

## 6. Controller示例

### 6.1 用户Controller

```typescript
// modules/user/user.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(AuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile')
  getProfile(@Request() req) {
    return this.userService.findById(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Post(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }
}
```

---

## 7. 环境变量配置

### .env.example

```bash
# 应用配置
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1
CORS_ORIGIN=*

# JWT配置
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# MongoDB配置
MONGODB_URI=mongodb://localhost:27017/zhouyi
DB_MAX_POOL_SIZE=10
DB_MIN_POOL_SIZE=2

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# 微信配置
WECHAT_APP_ID=
WECHAT_APP_SECRET=
MINI_PROGRAM_APP_ID=
MINI_PROGRAM_APP_SECRET=

# 支付配置
WECHAT_PAY_MCH_ID=
WECHAT_PAY_API_KEY=
ALIPAY_APP_ID=
ALIPAY_PRIVATE_KEY=

# 短信配置
SMS_ACCESS_KEY_ID=
SMS_ACCESS_KEY_SECRET=
SMS_SIGN_NAME=周易通
SMS_TEMPLATE_CODE=

# 对象存储
OSS_ACCESS_KEY_ID=
OSS_ACCESS_KEY_SECRET=
OSS_BUCKET=zhouyi-app
OSS_REGION=oss-cn-hangzhou

# 推送配置
JPUSH_APP_KEY=
JPUSH_MASTER_SECRET=
```

---

## 8. 启动脚本

### package.json

```json
{
  "name": "zhouyi-api",
  "version": "1.0.0",
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "typeorm": "typeorm-ts-node-commonjs"
  },
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "@nestjs/config": "^3.0.0",
    "@nestjs/jwt": "^10.0.0",
    "@nestjs/passport": "^10.0.0",
    "@nestjs/mongoose": "^10.0.0",
    "@nestjs/schedule": "^4.0.0",
    "@nestjs/throttler": "^5.0.0",
    "passport": "^0.6.0",
    "passport-jwt": "^4.0.1",
    "mongoose": "^8.0.0",
    "redis": "^4.6.0",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1",
    "bcrypt": "^5.1.1",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@nestjs/schematics": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "@types/express": "^4.17.17",
    "@types/jest": "^29.5.2",
    "@types/node": "^20.3.1",
    "@types/passport-jwt": "^3.0.9",
    "@types/bcrypt": "^5.0.0",
    "@types/uuid": "^9.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.42.0",
    "jest": "^29.5.0",
    "ts-jest": "^29.1.0",
    "ts-loader": "^9.4.3",
    "ts-node": "^10.9.1",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.1.3"
  }
}
```

---

## 9. 运行命令

```bash
# 开发模式
pnpm start:dev

# 生产构建
pnpm build

# 生产运行
pnpm start:prod

# 代码检查
pnpm lint

# 运行测试
pnpm test

# 测试覆盖率
pnpm test:cov
```

---

**文档编写**: Claude
**最后更新**: 2026-01-11
**适用版本**: Nest.js 10.x
