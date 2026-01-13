import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import { RedisService } from '../../modules/redis/redis.service';
import { SmsService } from '../../services/sms/sms.service';
import { WechatService } from '../../services/wechat/wechat.service';
import { User, UserDocument } from '../../database/schemas/user.schema';

/**
 * Mock工厂
 * 创建测试中需要的Mock对象
 *
 * 反模式避免：
 * - 不过度使用Mock（只mock外部依赖）
 * - Mock行为简单明确
 * - 提供清晰的设置API
 */
export class MockFactory {
  /**
   * 创建ConfigService Mock
   */
  static createConfigService(): Partial<ConfigService> {
    return {
      get: jest.fn((key: string) => {
        const config: Record<string, any> = {
          JWT_SECRET: 'test-secret',
          JWT_EXPIRES_IN: '15m',
          JWT_REFRESH_EXPIRES_IN: '7d',
          CODE_LENGTH: '6',
          CODE_EXPIRES_IN: '300',
          CODE_SEND_INTERVAL: '60',
          CODE_MAX_ATTEMPTS: '5',
          WECHAT_APP_APPID: 'test-appid',
          WECHAT_APP_APPSECRET: 'test-secret',
          WECHAT_MINI_PROGRAM_APPID: 'test-mini-appid',
          WECHAT_MINI_PROGRAM_APPSECRET: 'test-mini-secret',
        };
        return config[key];
      }),
    };
  }

  /**
   * 创建JwtService Mock
   */
  static createJwtService(): Partial<JwtService> {
    return {
      signAsync: jest.fn().mockResolvedValue('mock-jwt-token'),
      verify: jest.fn().mockReturnValue({
        sub: '507f1f77bcf86cd799439011',
        type: 'access',
      }),
    };
  }

  /**
   * 创建RedisService Mock
   * 使用Map模拟Redis存储，便于测试验证
   */
  static createRedisService(): Partial<RedisService> {
    const store = new Map<string, any>();

    return {
      get: jest.fn((key: string) => store.get(key) || null),  // 返回 null 而不是 undefined
      set: jest.fn((key: string, value: string, ttl?: number) => {
        store.set(key, value);
        return Promise.resolve('OK');
      }),
      del: jest.fn((key: string) => {
        store.delete(key);
        return Promise.resolve(1);
      }),
      exists: jest.fn((key: string) => Promise.resolve(store.has(key) ? 1 : 0)),
      expire: jest.fn((key: string, ttl: number) => {
        // 实际设置过期时间（模拟）
        return Promise.resolve(1);
      }),
      ttl: jest.fn((key: string) => Promise.resolve(store.has(key) ? 300 : -2)),
      hset: jest.fn((key: string, field: string, value: string) => {
        const hash = store.get(key) || {};
        hash[field] = value;
        store.set(key, hash);
        return Promise.resolve(1);
      }),
      hgetall: jest.fn((key: string) => store.get(key) || {}),
      incr: jest.fn((key: string) => {
        const current = parseInt(store.get(key) || '0');
        store.set(key, (current + 1).toString());
        return Promise.resolve(current + 1);
      }),
      flushdb: jest.fn().mockResolvedValue('OK'),
    };
  }

  /**
   * 创建SmsService Mock
   */
  static createSmsService(): Partial<SmsService> {
    return {
      validatePhoneNumber: jest.fn((phone: string) => /^1[3-9]\d{9}$/.test(phone)),
      sendVerificationCode: jest.fn().mockResolvedValue(undefined),
    };
  }

  /**
   * 创建WechatService Mock
   */
  static createWechatService(): Partial<WechatService> {
    return {
      miniProgramLogin: jest.fn().mockResolvedValue({
        openid: 'oXYZ1234567890',
        unionid: 'uABC1234567890',
        session_key: 'mock-session-key',
      }),
      appLogin: jest.fn().mockResolvedValue({
        openid: 'oXYZ1234567890',
        unionid: 'uABC1234567890',
        nickname: '微信用户',
        headimgurl: 'https://example.com/avatar.jpg',
      }),
    };
  }

  /**
   * 创建UserModel Mock
   */
  static createUserModel(users: UserDocument[] = []): Partial<Model<UserDocument>> {
    const userMap = new Map<string, UserDocument>();
    users.forEach(user => userMap.set(user._id.toString(), user));

    return {
      findOne: jest.fn((query: any) => {
        // 通过phoneNumber查找
        if (query.phoneNumber) {
          return Promise.resolve(
            users.find(u => u.phoneNumber === query.phoneNumber) || null,
          ) as any;
        }
        // 通过openId查找
        if (query.openId) {
          return Promise.resolve(
            users.find(u => u.openId === query.openId) || null,
          ) as any;
        }
        // 通过unionId查找
        if (query.unionId) {
          return Promise.resolve(
            users.find(u => u.unionId === query.unionId) || null,
          ) as any;
        }
        // 通过_id查找
        if (query._id) {
          return Promise.resolve(
            users.find(u => u._id.toString() === query._id.toString()) || null,
          ) as any;
        }
        return Promise.resolve(null) as any;
      }),
      create: jest.fn((data: any) => {
        // 添加默认字段（模拟 Schema 默认值）
        const newUser = {
          _id: '507f1f77bcf86cd7994390' + Math.floor(Math.random() * 1000),
          phoneNumber: data.phoneNumber || '',
          nickname: data.nickname || '',
          avatar: data.avatar || '',
          gender: data.gender ?? 0,
          isGuest: data.isGuest ?? false,
          openId: data.openId || '',
          unionId: data.unionId || '',
          status: data.status ?? 'active',
          // 添加默认 membership
          membership: data.membership || {
            type: 'free',
            level: 0,
            expireAt: null,
            autoRenew: false,
            activatedAt: new Date(),
          },
          // 添加默认 stats
          stats: data.stats || {
            divinationCount: 0,
            guestUsedCount: 0,
            learningProgress: 0,
          },
          // 添加默认 push
          push: data.push || {
            enabled: true,
            dailyHexagram: true,
            time: '08:00',
          },
          lastLoginAt: data.lastLoginAt || null,
          createdAt: data.createdAt || new Date(),
          updatedAt: data.updatedAt || new Date(),
          ...data,  // 允许覆盖默认值
        } as UserDocument;
        newUser.save = jest.fn().mockResolvedValue(newUser);
        users.push(newUser);
        return Promise.resolve(newUser) as any;
      }),
      findById: jest.fn((id: string) => {
        return Promise.resolve(
          users.find(u => u._id.toString() === id.toString()) || null,
        ) as any;
      }),
    };
  }
}

/**
 * 测试上下文
 * 封装测试中常用的Mock对象
 */
export class TestContext {
  public readonly configService: Partial<ConfigService>;
  public readonly jwtService: Partial<JwtService>;
  public readonly redisService: Partial<RedisService>;
  public readonly smsService: Partial<SmsService>;
  public readonly wechatService: Partial<WechatService>;

  // Mock存储引用，便于测试验证
  public readonly redisStore: Map<string, any>;

  constructor() {
    this.configService = MockFactory.createConfigService();
    this.jwtService = MockFactory.createJwtService();
    this.redisStore = new Map();

    // 创建带存储的RedisService
    this.redisService = {
      get: jest.fn((key: string) => this.redisStore.get(key) || null),  // 返回 null 而不是 undefined
      set: jest.fn((key: string, value: string, ttl?: number) => {
        this.redisStore.set(key, value);
        return Promise.resolve('OK');
      }),
      del: jest.fn((key: string) => {
        this.redisStore.delete(key);
        return Promise.resolve(1);
      }),
      exists: jest.fn((key: string) => this.redisStore.has(key) ? 1 : 0),
      expire: jest.fn((key: string, ttl: number) => Promise.resolve(1)),  // 添加 expire 方法
      ttl: jest.fn((key: string) => {
        return this.redisStore.has(key) ? 300 : -2;
      }),
      hset: jest.fn((key: string, field: string, value: string) => {
        const hash = this.redisStore.get(key) || {};
        hash[field] = value;
        this.redisStore.set(key, hash);
        return Promise.resolve(1);
      }),
      hgetall: jest.fn((key: string) => this.redisStore.get(key) || {}),
    } as any;

    this.smsService = MockFactory.createSmsService();
    this.wechatService = MockFactory.createWechatService();
  }

  /**
   * 清空Redis存储
   */
  clearRedisStore(): void {
    this.redisStore.clear();
  }

  /**
   * 设置Redis哈希值
   */
  setRedisHash(key: string, field: string, value: string): void {
    const hash = this.redisStore.get(key) || {};
    hash[field] = value;
    this.redisStore.set(key, hash);
  }
}
