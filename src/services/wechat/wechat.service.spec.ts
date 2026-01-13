import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { WechatService } from './wechat.service';
import { RedisService } from '../../modules/redis/redis.service';
import { MockFactory, TestContext } from '../../test/helpers/mock.factory';

// Mock wechatConfig 模块 - 必须在所有导入之前
jest.mock('../../config/wechat.config', () => ({
  wechatConfig: {
    app: {
      appId: 'test-appid',
      appSecret: 'test-secret',
    },
    miniProgram: {
      appId: 'test-mini-appid',
      appSecret: 'test-mini-secret',
    },
    api: {
      appAccessToken: 'https://api.weixin.qq.com/cgi-bin/token',
      appUserInfo: 'https://api.weixin.qq.com/sns/userinfo',
      jscode2session: 'https://api.weixin.qq.com/sns/jscode2session',
    },
    cachePrefix: {
      accessToken: 'wechat:access_token:',
      sessionKey: 'wechat:session_key:',
    },
  },
}));

/**
 * WechatService 单元测试
 *
 * 测试策略：
 * 1. Mock外部HTTP请求（axios） - 避免真实调用微信API
 * 2. 测试错误处理逻辑
 * 3. 验证缓存逻辑
 * 4. 测试边界条件
 *
 * 反模式避免：
 * - ❌ 不测试真实的axios请求（集成测试职责）
 * - ✅ 只测试服务层的业务逻辑
 * - ❌ 不测试微信API的行为（不在我们控制范围）
 * - ✅ 测试我们如何处理微信API的响应
 */
describe('WechatService', () => {
  let service: WechatService;
  let context: TestContext;
  let axiosGetMock: jest.Mock;

  beforeEach(async () => {
    context = new TestContext();

    // Mock axios
    axiosGetMock = jest.fn();
    jest.spyOn(axios, 'create').mockReturnValue({
      get: axiosGetMock,
    } as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WechatService,
        { provide: ConfigService, useValue: context.configService },
        { provide: RedisService, useValue: context.redisService },
      ],
    }).compile();

    service = module.get<WechatService>(WechatService);
    jest.clearAllMocks();
  });

  describe('小程序登录', () => {
    const mockCode = '071Abc2def3GHI4jklm5no6pqr7stu8';

    it('应该成功通过code换取openid和session_key', async () => {
      // Arrange - 模拟微信API成功响应
      axiosGetMock.mockResolvedValue({
        data: {
          openid: 'oXYZ1234567890',
          unionid: 'uABC1234567890',
          session_key: 'Abc123Def456',
        },
      });

      // Act
      const result = await service.miniProgramLogin(mockCode);

      // Assert - 验证返回数据
      expect(result).toMatchObject({
        openid: 'oXYZ1234567890',
        unionid: 'uABC1234567890',
        session_key: 'Abc123Def456',
      });

      // 验证调用了正确的微信API端点
      expect(axiosGetMock).toHaveBeenCalledWith(
        'https://api.weixin.qq.com/sns/jscode2session',
        {
          params: {
            appid: 'test-mini-appid',
            secret: 'test-mini-secret',
            js_code: mockCode,
            grant_type: 'authorization_code',
          },
        },
      );

      // 验证session_key被缓存
      expect(context.redisService.set).toHaveBeenCalledWith(
        `wechat:session_key:oXYZ1234567890`,
        'Abc123Def456',
        7200,
      );
    });

    it('应该处理微信API返回的错误', async () => {
      // Arrange - 模拟微信API错误响应
      axiosGetMock.mockResolvedValue({
        data: {
          errcode: 40029,
          errmsg: 'invalid code',
        },
      });

      // Act & Assert - 验证抛出UnauthorizedException
      await expect(service.miniProgramLogin(mockCode)).rejects.toThrow(
        UnauthorizedException,
      );
      // 验证通用错误消息（为了安全不暴露具体错误）
      await expect(service.miniProgramLogin(mockCode)).rejects.toThrow(
        '微信登录失败，请重试',
      );
    });

    it('应该处理微信API未返回openid的情况', async () => {
      // Arrange - 模拟缺少openid的响应
      axiosGetMock.mockResolvedValue({
        data: {
          session_key: 'Abc123Def456',
        },
      });

      // Act & Assert - 验证抛出UnauthorizedException和通用错误消息
      await expect(service.miniProgramLogin(mockCode)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.miniProgramLogin(mockCode)).rejects.toThrow(
        '微信登录失败，请重试',
      );
    });

    it('应该处理网络错误', async () => {
      // Arrange - 模拟网络错误
      axiosGetMock.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(service.miniProgramLogin(mockCode)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('APP登录', () => {
    const mockCode = 'wechat-app-auth-code';

    it('应该成功获取用户信息', async () => {
      // Arrange - 模拟获取access_token和用户信息
      // 第一次调用获取access_token，第二次获取用户信息
      axiosGetMock
        .mockResolvedValueOnce({
          data: {
            access_token: 'test_access_token',
            expires_in: 7200,
          },
        })
        .mockResolvedValueOnce({
          data: {
            openid: 'oAPP9999',
            unionid: 'uAPP9999',
            nickname: '微信用户',
            headimgurl: 'https://wx.qlogo.cn/avatar.jpg',
            sex: 1,
          },
        });

      // Act
      const result = await service.appLogin(mockCode);

      // Assert
      expect(result).toMatchObject({
        openid: 'oAPP9999',
        unionid: 'uAPP9999',
        nickname: '微信用户',
        headimgurl: 'https://wx.qlogo.cn/avatar.jpg',
        sex: 1,
      });

      // 验证调用了获取access_token接口
      expect(axiosGetMock).toHaveBeenCalledWith(
        'https://api.weixin.qq.com/cgi-bin/token',
        {
          params: {
            grant_type: 'client_credential',
            appid: 'test-appid',
            secret: 'test-secret',
          },
        },
      );
    });

    it('应该缓存access_token', async () => {
      // Arrange
      axiosGetMock
        .mockResolvedValueOnce({
          data: {
            access_token: 'cached_token',
            expires_in: 7200,
          },
        })
        .mockResolvedValueOnce({
          data: {
            openid: 'oAPP9999',
            nickname: '用户',
          },
        });

      // Act - 第一次调用
      await service.appLogin(mockCode);

      // 第二次调用（应该使用缓存的token）
      axiosGetMock.mockClear();
      axiosGetMock.mockResolvedValueOnce({
        data: {
          openid: 'oAPP9999',
          nickname: '用户',
        },
      });

      await service.appLogin(mockCode);

      // Assert - 不应该再次调用获取access_token接口
      expect(axiosGetMock).toHaveBeenCalledTimes(1);
      expect(axiosGetMock).toHaveBeenCalledWith(
        'https://api.weixin.qq.com/sns/userinfo',
        expect.any(Object),
      );
    });

    it('应该在access_token过期时重新获取', async () => {
      // Arrange - 第一次调用获取token，但缓存已过期
      context.redisStore.delete('wechat:access_token:app');

      axiosGetMock
        .mockResolvedValueOnce({
          data: {
            access_token: 'new_token',
            expires_in: 7200,
          },
        })
        .mockResolvedValueOnce({
          data: {
            openid: 'oAPP9999',
            nickname: '用户',
          },
        });

      // Act
      await service.appLogin(mockCode);

      // Assert
      expect(axiosGetMock).toHaveBeenCalledWith(
        'https://api.weixin.qq.com/cgi-bin/token',
        expect.any(Object),
      );
    });

    it('应该处理access_token获取失败', async () => {
      // Arrange
      axiosGetMock.mockResolvedValue({
        data: {
          errcode: 40001,
          errmsg: 'invalid credential',
        },
      });

      // Act & Assert
      await expect(service.appLogin(mockCode)).rejects.toThrow();
    });
  });

  describe('session_key管理', () => {
    it('应该成功缓存session_key', async () => {
      // Arrange
      const openid = 'oXYZ1234567890';
      const sessionKey = 'Abc123Def456';

      // Act
      await service.cacheSessionKey(openid, sessionKey);

      // Assert
      expect(context.redisService.set).toHaveBeenCalledWith(
        `wechat:session_key:${openid}`,
        sessionKey,
        7200,
      );
    });

    it('应该成功获取缓存的session_key', async () => {
      // Arrange
      const openid = 'oXYZ1234567890';
      const sessionKey = 'Abc123Def456';
      context.redisStore.set(`wechat:session_key:${openid}`, sessionKey);

      // Act
      const result = await service.getSessionKey(openid);

      // Assert
      expect(result).toBe(sessionKey);
    });

    it('应该返回null当session_key不存在时', async () => {
      // Act
      const result = await service.getSessionKey('non-existent-openid');

      // Assert
      expect(result).toBeNull();
    });
  });
});
