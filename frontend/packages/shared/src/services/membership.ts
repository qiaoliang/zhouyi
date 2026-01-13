import { apiClient } from './api';

/**
 * 订单类型枚举
 */
export enum OrderType {
  MEMBERSHIP_MONTHLY = 'membership_monthly',
  MEMBERSHIP_YEARLY = 'membership_yearly',
  SINGLE_DIVINATION = 'single_divination',
}

/**
 * 订单状态枚举
 */
export enum OrderStatus {
  CREATED = 'created',
  PAID = 'paid',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

/**
 * 会员类型枚举
 */
export enum MembershipType {
  FREE = 'free',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

/**
 * 会员权益接口
 */
export interface MembershipPrivileges {
  dailyDivinations: number;
  detailedInterpretation: boolean;
  preciseInterpretation: boolean;
  learningAccess: boolean;
  adFree: boolean;
}

/**
 * 会员套餐接口
 */
export interface MembershipPlan {
  type: OrderType;
  name: string;
  price: number;
  duration: string;
  privileges: MembershipPrivileges;
  recommended: boolean;
}

/**
 * 订单接口
 */
export interface Order {
  id: string;
  userId: string;
  type: OrderType;
  amount: number;
  status: OrderStatus;
  createdAt: string;
  paidAt?: string;
  expiresAt?: string;
  paymentMethod?: string;
  transactionId?: string;
}

/**
 * 用户会员信息接口
 */
export interface UserMembershipInfo {
  hasMembership: boolean;
  type: MembershipType;
  expireAt?: string | null;
  privileges: MembershipPrivileges;
  isExpired: boolean;
  daysUntilExpiry?: number | null;
  autoRenew: boolean;
}

/**
 * 创建订单参数
 */
export interface CreateOrderParams {
  type: OrderType;
  paymentMethod?: 'wechat' | 'alipay';
}

/**
 * 模拟支付参数
 */
export interface MockPaymentParams {
  orderId: string;
  scenario?: 'success' | 'fail' | 'cancel' | 'timeout' | 'network_error';
  delay?: number;
  autoConfirm?: boolean;
}

/**
 * 会员服务
 */
export const membershipService = {
  /**
   * 获取会员套餐列表
   */
  async getPlans(): Promise<MembershipPlan[]> {
    return apiClient.get<MembershipPlan[]>('/membership/plans');
  },

  /**
   * 创建订单
   */
  async createOrder(params: CreateOrderParams): Promise<Order> {
    return apiClient.post<Order>('/membership/orders', params);
  },

  /**
   * 获取订单详情
   */
  async getOrder(orderId: string): Promise<Order> {
    return apiClient.get<Order>(`/membership/orders/${orderId}`);
  },

  /**
   * 获取用户订单列表
   */
  async getUserOrders(params?: {
    page?: number;
    limit?: number;
    status?: OrderStatus;
  }): Promise<{ orders: Order[]; total: number }> {
    // 简化处理，将参数作为查询字符串
    const queryString = params ? `?${new URLSearchParams(params as any).toString()}` : '';
    return apiClient.get<{ orders: Order[]; total: number }>(`/membership/orders${queryString}`);
  },

  /**
   * 取消订单
   */
  async cancelOrder(orderId: string): Promise<Order> {
    return apiClient.post<Order>(`/membership/orders/${orderId}/cancel`);
  },

  /**
   * 获取用户会员信息
   */
  async getUserMembership(): Promise<UserMembershipInfo> {
    return apiClient.get<UserMembershipInfo>('/membership/info');
  },

  /**
   * 发起模拟支付
   */
  async initiateMockPayment(params: MockPaymentParams): Promise<{
    paymentId: string;
    scenario: string;
    estimatedDelay: number;
    message: string;
    note: string;
  }> {
    return apiClient.post('/membership/payments/mock', params);
  },

  /**
   * 确认模拟支付
   */
  async confirmMockPayment(paymentId: string): Promise<{
    success: boolean;
    orderId: string;
    transactionId?: string;
    status: string;
    message: string;
    paidAt?: string;
  }> {
    return apiClient.post(`/membership/payments/mock/${paymentId}/confirm`);
  },

  /**
   * 取消模拟支付
   */
  async cancelMockPayment(paymentId: string): Promise<{
    success: boolean;
    orderId: string;
    status: string;
    message: string;
  }> {
    return apiClient.post(`/membership/payments/mock/${paymentId}/cancel`);
  },
};
