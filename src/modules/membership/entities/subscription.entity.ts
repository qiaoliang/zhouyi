/**
 * 会员类型枚举
 */
export enum MembershipType {
  FREE = 'free',       // 免费用户
  SINGLE = 'single',   // 按次购买
  MONTHLY = 'monthly', // 月卡会员
  YEARLY = 'yearly',   // 年卡会员
}

/**
 * 会员权益配置
 */
export const MEMBERSHIP_PRIVILEGES: Record<MembershipType, {
  dailyDivinations: number;      // 每日起卦次数
  detailedInterpretation: boolean; // 详细解卦
  preciseInterpretation: boolean; // 精准解卦
  learningAccess: boolean;        // 学习中心访问
  adFree: boolean;                // 无广告
}> = {
  [MembershipType.FREE]: {
    dailyDivinations: 3,
    detailedInterpretation: false,
    preciseInterpretation: false,
    learningAccess: true,
    adFree: false,
  },
  [MembershipType.SINGLE]: {
    dailyDivinations: 10,
    detailedInterpretation: true,
    preciseInterpretation: false,
    learningAccess: true,
    adFree: false,
  },
  [MembershipType.MONTHLY]: {
    dailyDivinations: -1, // -1 表示无限次
    detailedInterpretation: true,
    preciseInterpretation: true,
    learningAccess: true,
    adFree: true,
  },
  [MembershipType.YEARLY]: {
    dailyDivinations: -1,
    detailedInterpretation: true,
    preciseInterpretation: true,
    learningAccess: true,
    adFree: true,
  },
};

/**
 * 订阅实体接口
 */
export interface Subscription {
  id: string;
  userId: string;
  type: MembershipType;
  startDate: Date;
  expireAt: Date;
  isActive: boolean;
  autoRenew: boolean;
  remainingQuota?: number; // 按次购买时的剩余次数
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 订阅创建参数
 */
export interface CreateSubscriptionParams {
  userId: string;
  type: MembershipType;
  autoRenew?: boolean;
}

/**
 * 订阅更新参数
 */
export interface UpdateSubscriptionParams {
  type?: MembershipType;
  expireAt?: Date;
  autoRenew?: boolean;
  isActive?: boolean;
  remainingQuota?: number;
}

/**
 * 订阅仓储接口
 */
export interface ISubscriptionRepository {
  create(subscription: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subscription>;
  findById(id: string): Promise<Subscription | null>;
  findByUserId(userId: string): Promise<Subscription | null>;
  update(id: string, params: UpdateSubscriptionParams): Promise<Subscription | null>;
  setActive(id: string, isActive: boolean): Promise<Subscription | null>;
  findActiveByUserId(userId: string): Promise<Subscription | null>;
}

/**
 * 用户会员信息接口
 */
export interface UserMembershipInfo {
  hasMembership: boolean;
  type: MembershipType;
  expireAt: Date | null;
  remainingQuota: number | null;
  privileges: typeof MEMBERSHIP_PRIVILEGES[MembershipType];
  isExpired: boolean;
  daysUntilExpiry: number | null;
}
