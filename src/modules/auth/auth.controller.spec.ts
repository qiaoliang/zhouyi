import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RedisService } from '../redis/redis.service';
import { SmsService } from '../../services/sms/sms.service';
import { WechatService } from '../../services/wechat/wechat.service';
import { UserService } from '../../services/user/user.service';
import { ResponseInterceptor } from '../../common/interceptors/response.interceptor';
import { HttpExceptionFilter } from '../../common/filters/http-exception.filter';
import { UserDataBuilder } from '../../test/helpers/test-data.builder';
import { MockFactory, TestContext } from '../../test/helpers/mock.factory';
import { APP_GUARD } from '@nestjs/core';

/**
 * AuthController 集成测试
 *
 * 测试策略：
 * 1. 测试HTTP层的行为（请求/响应）
 * 2. 验证DTO验证
 * 3. 测试公开路由和受保护路由
 * 4. 验证统一的响应格式
 *
 * 反模式避免：
 * - ❌ 不测试Service层的业务逻辑（已有单元测试）
 * - ✅ 只测试Controller层的职责
 * - ❌ 不过度Mock，让测试验证端到端行为
 * - ✌ 避免测试框架代码（测试业务行为）
 */
describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let context: TestContext;
  let mockUsers: any[];
  let controller: AuthController;
  let authService: AuthService;

  beforeAll(async () => {
    // 准备测试上下文
    context = new TestContext();
    mockUsers = [];

    // 手动创建AuthService实例并注入所有依赖
    authService = new AuthService(
      MockFactory.createUserModel(mockUsers) as any,
      context.redisService as any,
      context.jwtService as any,
      context.configService as any,
      context.smsService as any,
      context.wechatService as any,
      {} as any, // UserService mock
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: ConfigService, useValue: context.configService },
        { provide: JwtService, useValue: context.jwtService },
        { provide: AuthService, useValue: authService },
        { provide: 'UserModel', useValue: MockFactory.createUserModel(mockUsers) },
        { provide: RedisService, useValue: context.redisService },
        { provide: SmsService, useValue: context.smsService },
        { provide: WechatService, useValue: context.wechatService },
        // 覆盖 APP_GUARD 以禁用 ThrottlerGuard
        {
          provide: APP_GUARD,
          useValue: { canActivate: () => true },
        },
        // 提供 ThrottlerGuard mock
        {
          provide: ThrottlerGuard,
          useValue: { canActivate: () => true },
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = moduleFixture.get<AuthController>(AuthController);

    app = moduleFixture.createNestApplication();

    // 应用全局配置（与main.ts保持一致）
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalFilters(new HttpExceptionFilter());
    app.setGlobalPrefix('api/v1');

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    context.clearRedisStore();
    // 清空用户数组
    mockUsers.splice(0, mockUsers.length);
  });

  describe('POST /api/v1/auth/send-code', () => {
    const endpoint = '/api/v1/auth/send-code';

    it('应该成功发送验证码', async () => {
      // Arrange
      const phoneNumber = '13800138000';

      // Act
      const response = await request(app.getHttpServer())
        .post(endpoint)
        .send({ phoneNumber })
        .expect(201);

      // Assert - 验证响应格式
      expect(response.body).toMatchObject({
        success: true,
        message: '验证码发送成功',
        data: {
          expiresAt: expect.any(Number),
        },
        timestamp: expect.any(Number),
      });

      expect(response.body.data.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('应该拒绝无效的手机号', async () => {
      // Act & Assert
      const response = await request(app.getHttpServer())
        .post(endpoint)
        .send({ phoneNumber: '12345' })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: '手机号格式不正确',
        },
        timestamp: expect.any(Number),
      });
    });

    it('应该拒绝缺少手机号的请求', async () => {
      // Act & Assert
      const response = await request(app.getHttpServer())
        .post(endpoint)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('应该拒绝额外字段的请求（forbidNonWhitelisted）', async () => {
      // Act & Assert
      const response = await request(app.getHttpServer())
        .post(endpoint)
        .send({
          phoneNumber: '13800138000',
          extraField: 'should-not-be-here',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('应该在发送频率限制时返回错误', async () => {
      // Arrange - 模拟已发送过
      const phoneNumber = '13800138000';
      context.redisStore.set(`sms:rate:${phoneNumber}`, Date.now().toString());

      // Act & Assert
      const response = await request(app.getHttpServer())
        .post(endpoint)
        .send({ phoneNumber })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('发送过于频繁'),
        },
      });
    });
  });

  describe('POST /api/v1/auth/login', () => {
    const endpoint = '/api/v1/auth/login';
    const phoneNumber = '13800138000';
    const validCode = '123456';

    beforeEach(() => {
      // 设置验证码
      context.setRedisHash(`sms:code:${phoneNumber}`, 'code', validCode);
      context.setRedisHash(`sms:code:${phoneNumber}`, 'createdAt', Math.floor(Date.now() / 1000).toString());
      context.setRedisHash(`sms:code:${phoneNumber}`, 'expiresAt', (Math.floor(Date.now() / 1000) + 300).toString());
      context.setRedisHash(`sms:code:${phoneNumber}`, 'attempts', '0');
    });

    it('应该成功登录并返回token', async () => {
      // Act
      const response = await request(app.getHttpServer())
        .post(endpoint)
        .send({ phoneNumber, code: validCode })
        .expect(201);

      // Assert
      expect(response.body).toMatchObject({
        success: true,
        message: '登录成功',
        data: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          expiresIn: expect.any(Number),
          user: {
            id: expect.any(String),
            phoneNumber: '138****8000',
            nickname: '',
            avatar: '',
            isGuest: false,
            membership: {
              type: 'free',
              level: 0,
              expireAt: null,
              autoRenew: false,
            },
          },
        },
        timestamp: expect.any(Number),
      });
    });

    it('应该拒绝缺少字段的请求', async () => {
      // Act & Assert
      await request(app.getHttpServer())
        .post(endpoint)
        .send({ phoneNumber })
        .expect(400);

      await request(app.getHttpServer())
        .post(endpoint)
        .send({ code: validCode })
        .expect(400);
    });

    it('应该拒绝错误格式的验证码', async () => {
      // Act & Assert
      const response = await request(app.getHttpServer())
        .post(endpoint)
        .send({ phoneNumber, code: '12345' }) // 5位数
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('应该处理验证码错误', async () => {
      // Act & Assert
      const response = await request(app.getHttpServer())
        .post(endpoint)
        .send({ phoneNumber, code: '654321' })
        .expect(401);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('验证码错误'),
        },
      });
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    const endpoint = '/api/v1/auth/refresh';

    it('应该成功刷新token', async () => {
      // Arrange
      const refreshToken = 'valid-refresh-token';
      const userId = '507f1f77bcf86cd799439011';
      mockUsers.push(new UserDataBuilder().withId(userId).buildDocument());

      (context.jwtService.verify as jest.Mock).mockReturnValue({
        sub: userId,
        type: 'refresh',
      });

      // Act
      const response = await request(app.getHttpServer())
        .post(endpoint)
        .send({ refreshToken })
        .expect(201);

      // Assert
      expect(response.body).toMatchObject({
        success: true,
        message: 'Token刷新成功',
        data: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          expiresIn: expect.any(Number),
          user: expect.any(Object),
        },
      });
    });

    it('应该拒绝缺少refreshToken的请求', async () => {
      // Act & Assert
      const response = await request(app.getHttpServer())
        .post(endpoint)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/wechat/mini-login', () => {
    const endpoint = '/api/v1/auth/wechat/mini-login';

    it('应该成功通过微信code登录', async () => {
      // Arrange
      const code = '071Abc2def3GHI4jklm5no6pqr7stu8';
      context.wechatService.miniProgramLogin = jest.fn().mockResolvedValue({
        openid: 'oXYZ1234567890',
        unionid: 'uABC1234567890',
        session_key: 'mock-session-key',
      });

      // Act
      const response = await request(app.getHttpServer())
        .post(endpoint)
        .send({ code })
        .expect(201);

      // Assert
      expect(response.body).toMatchObject({
        success: true,
        message: '微信登录成功',
        data: {
          accessToken: expect.any(String),
          user: expect.objectContaining({
            nickname: '微信用户',
          }),
        },
      });
    });

    it('应该支持携带用户信息', async () => {
      // Arrange
      const code = '071Abc2def3GHI4jklm5no6pqr7stu8';
      context.wechatService.miniProgramLogin = jest.fn().mockResolvedValue({
        openid: 'oXYZ1234567890',
        unionid: 'uABC1234567890',
      });

      const userInfo = {
        nickname: '自定义昵称',
        avatar: 'https://custom.com/avatar.jpg',
        gender: 1,
      };

      // Act
      const response = await request(app.getHttpServer())
        .post(endpoint)
        .send({ code, userInfo })
        .expect(201);

      // Assert
      expect(response.body.data.user).toMatchObject({
        nickname: '自定义昵称',
        avatar: 'https://custom.com/avatar.jpg',
      });
    });

    it('应该拒绝缺少code的请求', async () => {
      // Act & Assert
      const response = await request(app.getHttpServer())
        .post(endpoint)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/wechat/app-login', () => {
    const endpoint = '/api/v1/auth/wechat/app-login';

    it('应该成功通过APP微信code登录', async () => {
      // Arrange
      const code = 'wechat-app-code';
      context.wechatService.appLogin = jest.fn().mockResolvedValue({
        openid: 'oAPP9999',
        unionid: 'uAPP9999',
        nickname: '微信APP用户',
        headimgurl: 'https://wx.qlogo.cn/avatar.jpg',
      });

      // Act
      const response = await request(app.getHttpServer())
        .post(endpoint)
        .send({ code })
        .expect(201);

      // Assert
      expect(response.body).toMatchObject({
        success: true,
        message: '微信登录成功',
        data: {
          accessToken: expect.any(String),
          user: expect.objectContaining({
            nickname: '微信APP用户',
          }),
        },
      });
    });
  });
});
