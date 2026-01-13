import { api } from './api';

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
    const response = await api.get<MembershipPlan[]>('/membership/plans');
    return response.data;
  },

  /**
   * 创建订单
   */
  async createOrder(params: CreateOrderParams): Promise<Order> {
    const response = await api.post<Order>('/membership/orders', params);
    return response.data;
  },

  /**
   * 获取订单详情
   */
  async getOrder(orderId: string): Promise<Order> {
    const response = await api.get<Order>(`/membership/orders/${orderId}`);
    return response.data;
  },

  /**
   * 获取用户订单列表
   */
  async getUserOrders(params?: {
    page?: number;
    limit?: number;
    status?: OrderStatus;
  }): Promise<{ orders: Order[]; total: number }> {
    const response = await api.get<{ orders: Order[]; total: number }>('/membership/orders', {
      params,
    });
    return response.data;
  },

  /**
   * 取消订单
   */
  async cancelOrder(orderId: string): Promise<Order> {
    const response = await api.post<Order>(`/membership/orders/${orderId}/cancel`);
    return response.data;
  },

  /**
   * 获取用户会员信息
   */
  async getUserMembership(): Promise<UserMembershipInfo> {
    const response = await api.get<UserMembershipInfo>('/membership/info');
    return response.data;
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
    const response = await api.post('/membership/payments/mock', params);
    return response.data;
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
    const response = await api.post(`/membership/payments/mock/${paymentId}/confirm`);
    return response.data;
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
    const response = await api.post(`/membership/payments/mock/${paymentId}/cancel`);
    return response.data;
  },
};
