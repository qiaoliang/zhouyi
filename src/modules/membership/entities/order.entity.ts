/**
 * 订单状态枚举
 */
export enum OrderStatus {
  PENDING = 'pending',       // 待支付
  PAID = 'paid',            // 已支付
  CANCELLED = 'cancelled',  // 已取消
  REFUNDED = 'refunded',    // 已退款
  FAILED = 'failed',        // 支付失败
}

/**
 * 订单类型枚举
 */
export enum OrderType {
  SINGLE = 'single',    // 按次详细解卦 ¥10
  MONTHLY = 'monthly',  // 月卡 ¥30
  YEARLY = 'yearly',    // 年卡 ¥300
}

/**
 * 订单实体接口
 */
export interface Order {
  id: string;
  userId: string;
  type: OrderType;
  amount: number;
  status: OrderStatus;
  createdAt: Date;
  paidAt?: Date;
  expiresAt?: Date;
  paymentMethod?: string;
  transactionId?: string;
  metadata?: Record<string, any>;
}

/**
 * 订单类型对应的金额和有效期配置
 */
export const ORDER_CONFIG: Record<OrderType, { amount: number; duration: number }> = {
  [OrderType.SINGLE]: { amount: 10, duration: 0 }, // 按次，无有效期
  [OrderType.MONTHLY]: { amount: 30, duration: 30 * 24 * 60 * 60 * 1000 }, // 30天
  [OrderType.YEARLY]: { amount: 300, duration: 365 * 24 * 60 * 60 * 1000 }, // 365天
};

/**
 * 订单仓储接口
 */
export interface IOrderRepository {
  create(order: Omit<Order, 'id' | 'createdAt'>): Promise<Order>;
  findById(id: string): Promise<Order | null>;
  findByUserId(userId: string, page?: number, limit?: number): Promise<Order[]>;
  updateStatus(id: string, status: OrderStatus, updateData?: Partial<Order>): Promise<Order | null>;
  findByUserIdAndStatus(userId: string, status: OrderStatus): Promise<Order[]>;
}

/**
 * 订单创建参数
 */
export interface CreateOrderParams {
  userId: string;
  type: OrderType;
  paymentMethod?: string;
}

/**
 * 订单查询参数
 */
export interface OrderQueryParams {
  userId?: string;
  status?: OrderStatus;
  type?: OrderType;
  page?: number;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
}

/**
 * 订单统计信息
 */
export interface OrderStatistics {
  totalOrders: number;
  paidOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  refundedOrders: number;
}
