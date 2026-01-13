import { User, UserDocument } from '../../database/schemas/user.schema';
import { MembershipType, MembershipLevel, Gender, UserStatus } from '../../database/schemas/user.schema';

/**
 * 测试数据构建器
 * 使用Builder模式构建测试数据，避免在测试中创建大量对象
 *
 * 反模式避免：
 * - 不使用硬编码的魔法数字
 * - 提供有意义的默认值
 * - 支持链式调用提高可读性
 */
export class UserDataBuilder {
  private data: Partial<User> = {
    nickname: '测试用户',
    avatar: 'https://example.com/avatar.jpg',
    gender: Gender.UNKNOWN,
    isGuest: false,
    membership: {
      type: MembershipType.FREE,
      level: MembershipLevel.FREE,
      expireAt: null,
      autoRenew: false,
      activatedAt: new Date(),
    },
    stats: {
      divinationCount: 0,
      guestUsedCount: 0,
      learningProgress: 0,
    },
    status: UserStatus.ACTIVE,
    push: {
      enabled: true,
      dailyHexagram: true,
      time: '08:00',
    },
  };

  /**
   * 设置用户ID
   */
  withId(id: string): this {
    this.data._id = id as any;
    return this;
  }

  /**
   * 设置手机号
   */
  withPhoneNumber(phone: string): this {
    this.data.phoneNumber = phone;
    return this;
  }

  /**
   * 设置微信OpenID
   */
  withOpenId(openId: string): this {
    this.data.openId = openId;
    return this;
  }

  /**
   * 设置微信UnionID
   */
  withUnionId(unionId: string): this {
    this.data.unionId = unionId;
    return this;
  }

  /**
   * 设置昵称
   */
  withNickname(nickname: string): this {
    this.data.nickname = nickname;
    return this;
  }

  /**
   * 设置为会员用户
   */
  withMembership(type: MembershipType = MembershipType.MONTHLY): this {
    this.data.membership = {
      type,
      level: type === MembershipType.YEARLY ? MembershipLevel.YEARLY : MembershipLevel.MONTHLY,
      expireAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天后过期
      autoRenew: false,
      activatedAt: new Date(),
    };
    return this;
  }

  /**
   * 设置为游客用户
   */
  asGuest(): this {
    this.data.isGuest = true;
    this.data.nickname = '游客用户';
    return this;
  }

  /**
   * 设置卜卦次数
   */
  withDivinationCount(count: number): this {
    if (!this.data.stats) {
      this.data.stats = {
        divinationCount: 0,
        guestUsedCount: 0,
        learningProgress: 0,
      };
    }
    this.data.stats.divinationCount = count;
    return this;
  }

  /**
   * 设置最后登录时间
   */
  withLastLoginAt(date: Date): this {
    this.data.lastLoginAt = date;
    return this;
  }

  /**
   * 构建用户对象
   */
  build(): Partial<User> {
    return { ...this.data };
  }

  /**
   * 构建用户文档对象（包含Mongoose方法）
   */
  buildDocument(): UserDocument {
    const user = this.build() as UserDocument;
    // 确保 _id 存在
    if (!user._id) {
      user._id = '507f1f77bcf86cd7994390' + Math.floor(Math.random() * 10000) as any;
    }
    // 添加Mongoose文档的模拟方法
    user.save = jest.fn().mockResolvedValue(user);
    return user;
  }

  /**
   * 创建预设的测试用户
   */
  static aTestUser(): UserDataBuilder {
    return new UserDataBuilder()
      .withPhoneNumber('13800138000')
      .withId('507f1f77bcf86cd799439011');
  }

  /**
   * 创建微信用户
   */
  static aWechatUser(): UserDataBuilder {
    return new UserDataBuilder()
      .withOpenId('oXYZ1234567890')
      .withUnionId('uABC1234567890')
      .withNickname('微信用户')
      .withId('507f1f77bcf86cd799439012');
  }

  /**
   * 创建游客用户
   */
  static aGuestUser(): UserDataBuilder {
    return new UserDataBuilder()
      .asGuest()
      .withId('507f1f77bcf86cd799439013');
  }

  /**
   * 创建会员用户
   */
  static aMemberUser(): UserDataBuilder {
    return new UserDataBuilder()
      .withMembership(MembershipType.MONTHLY)
      .withPhoneNumber('13900139000')
      .withId('507f1f77bcf86cd799439014');
  }
}

/**
 * 验证码数据构建器
 */
export class VerificationCodeDataBuilder {
  private code: string = '123456';
  private createdAt: number = Math.floor(Date.now() / 1000);
  private expiresAt: number = this.createdAt + 300; // 5分钟后
  private attempts: string = '0';

  withCode(code: string): this {
    this.code = code;
    return this;
  }

  withExpiresInSeconds(seconds: number): this {
    this.expiresAt = this.createdAt + seconds;
    return this;
  }

  expired(): this {
    this.expiresAt = this.createdAt - 100; // 已过期
    return this;
  }

  withAttempts(attempts: number): this {
    this.attempts = attempts.toString();
    return this;
  }

  buildAsHash(): Record<string, string> {
    return {
      code: this.code,
      createdAt: this.createdAt.toString(),
      expiresAt: this.expiresAt.toString(),
      attempts: this.attempts,
    };
  }

  static aValidCode(): VerificationCodeDataBuilder {
    return new VerificationCodeDataBuilder();
  }

  static anExpiredCode(): VerificationCodeDataBuilder {
    return new VerificationCodeDataBuilder().expired();
  }
}
