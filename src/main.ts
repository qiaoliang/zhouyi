import 'crypto'; // 显式导入 crypto 模块以解决 Node.js 18 兼容性问题
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

/**
 * NestJS 应用入口
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 全局路由前缀
  app.setGlobalPrefix('api/v1');

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 自动剥离未在DTO中定义的属性
      forbidNonWhitelisted: true, // 如果有未定义的属性则抛出错误
      transform: true, // 自动转换类型
      transformOptions: {
        enableImplicitConversion: true, // 启用隐式类型转换
      },
    }),
  );

  // CORS 配置
  const isDev = process.env.NODE_ENV === 'development';

  app.enableCors({
    origin: isDev ? '*' : (process.env.CORS_ORIGIN?.split(',') || []),
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`
┌─────────────────────────────────────────┐
│                                         │
│   周易通APP API 服务启动成功              │
│                                         │
│   环境: ${process.env.NODE_ENV || 'development'}
│   端口: ${port}
│   地址: http://localhost:${port}/api/v1
│                                         │
└─────────────────────────────────────────┘
  `);
}

bootstrap();