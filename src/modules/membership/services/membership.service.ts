import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument, OrderType, OrderStatus, PaymentStatus } from '../../../database/schemas/order.schema';
import { User, UserDocument } from '../../../database/schemas/user.schema';
import { MembershipType } from '../../../database/schemas/user.schema';

/**
 * 订单创建参数接口
 */
export interface CreateOrderParams {
  userId: string;
  type: OrderType;
  paymentMethod: 'wechat' | 'alipay';
  paymentChannel: 'app' | 'miniprogram' | 'h5';
  platform: 'ios' | 'android' | 'miniprogram' | 'h5';
  ip: string;
  userAgent?: string;
}

/**
 * 会员服务
 * 负责会员订单管理和会员权益
 */
@Injectable()
export class MembershipService {
  constructor(
    @InjectModel('Order') private orderModel: Model<OrderDocument>,
    @InjectModel('User') private userModel: Model<UserDocument>,
  ) {}

  /**
   * 创建会员订单
   */
  async createOrder(params: CreateOrderParams): Promise<Order> {
    const { userId, type, paymentMethod, paymentChannel, platform, ip, userAgent } = params;

    // 验证用户存在
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 生成订单号
    const orderNo = this.generateOrderNo();

    // 获取商品信息
    const product = this.getProductInfo(type);

    // 计算过期时间（30分钟后）
    const expiredAt = new Date(Date.now() + 30 * 60 * 1000);

    // 创建订单
    const order = await this.orderModel.create({
      userId: new Types.ObjectId(userId),
      orderNo,
      type,
      amount: product.price * 100, // 转换为分
      product: {
        name: product.name,
        description: product.description,
        duration: product.duration,
      },
      payment: {
        method: paymentMethod,
        channel: paymentChannel,
        status: PaymentStatus.PENDING,
      },
      client: {
        platform,
        ip,
        userAgent,
      },
      expiredAt,
    });

    // 如果是会员订单，预先计算会员信息
    if (type === OrderType.MEMBERSHIP_MONTHLY || type === OrderType.MEMBERSHIP_YEARLY) {
      const membershipType = type === OrderType.MEMBERSHIP_MONTHLY ? 'monthly' : 'yearly';
      const duration = product.duration;
      const startAt = new Date();
      const endAt = new Date(startAt.getTime() + duration * 30 * 24 * 60 * 60 * 1000);

      order.membership = {
        type: membershipType,
        duration,
        startAt,
        endAt,
      };
    }

    await order.save();
    return order;
  }

  /**
   * 获取订单详情
   */
  async getOrder(orderId: string): Promise<Order> {
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    return order;
  }

  /**
   * 根据订单号获取订单
   */
  async getOrderByOrderNo(orderNo: string): Promise<Order> {
    const order = await this.orderModel.findOne({ orderNo });
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    return order;
  }

  /**
   * 获取用户订单列表
   */
  async getUserOrders(
    userId: string,
    page: number = 1,
    limit: number = 20,
    status?: OrderStatus,
  ): Promise<{ orders: Order[]; total: number }> {
    const query: any = { userId: new Types.ObjectId(userId) };

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      this.orderModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.orderModel.countDocuments(query),
    ]);

    return { orders, total };
  }

  /**
   * 更新订单支付状态
   */
  async updateOrderPaymentStatus(
    orderId: string,
    status: PaymentStatus,
    transactionId?: string,
    paidAt?: Date,
  ): Promise<Order> {
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    // 更新支付状态
    order.payment.status = status;
    if (transactionId) {
      order.payment.transactionId = transactionId;
    }
    if (paidAt) {
      order.payment.paidAt = paidAt;
      order.paidAt = paidAt;
    }

    // 更新订单状态
    if (status === PaymentStatus.PAID) {
      order.status = OrderStatus.PAID;
      order.paidAmount = order.amount;

      // 激活用户会员
      await this.activateUserMembership(order.userId.toString(), order);
    } else if (status === PaymentStatus.FAILED || status === PaymentStatus.CANCELLED) {
      order.status = OrderStatus.CANCELLED;
      if (status === PaymentStatus.FAILED) {
        order.payment.failedReason = '支付失败';
      }
    }

    await order.save();
    return order;
  }

  /**
   * 取消订单
   */
  async cancelOrder(orderId: string, userId: string): Promise<Order> {
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.userId.toString() !== userId) {
      throw new BadRequestException('无权操作此订单');
    }

    if (order.status !== OrderStatus.CREATED) {
      throw new BadRequestException('订单状态不允许取消');
    }

    order.status = OrderStatus.CANCELLED;
    order.payment.status = PaymentStatus.CANCELLED;
    await order.save();

    return order;
  }

  /**
   * 获取用户会员信息
   */
  async getUserMembershipInfo(userId: string): Promise<{
    hasMembership: boolean;
    type: MembershipType;
    expireAt: Date | null;
    privileges: any;
    isExpired: boolean;
    daysUntilExpiry: number | null;
  }> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const membership = user.membership;
    const hasMembership = membership.type !== MembershipType.FREE;
    const isExpired = membership.expireAt ? new Date(membership.expireAt) < new Date() : false;
    const daysUntilExpiry = membership.expireAt
      ? Math.ceil((new Date(membership.expireAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      hasMembership,
      type: membership.type,
      expireAt: membership.expireAt || null,
      privileges: this.getMembershipPrivileges(membership.type),
      isExpired,
      daysUntilExpiry,
    };
  }

  /**
   * 获取会员套餐列表
   */
  async getMembershipPlans(): Promise<Array<{
    type: MembershipType;
    name: string;
    price: number;
    duration: string;
    privileges: any;
    recommended: boolean;
  }>> {
    return [
      {
        type: MembershipType.MONTHLY,
        name: '月卡会员',
        price: 30,
        duration: '30天',
        privileges: this.getMembershipPrivileges(MembershipType.MONTHLY),
        recommended: false,
      },
      {
        type: MembershipType.YEARLY,
        name: '年卡会员',
        price: 300,
        duration: '365天',
        privileges: this.getMembershipPrivileges(MembershipType.YEARLY),
        recommended: true,
      },
      {
        type: MembershipType.FREE,
        name: '按次详细解卦',
        price: 10,
        duration: '单次',
        privileges: this.getSingleDivinationPrivileges(),
        recommended: false,
      },
    ];
  }

  /**
   * 生成订单号
   */
  private generateOrderNo(): string {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');
    return `ZY${timestamp}${random}`;
  }

  /**
   * 获取商品信息
   */
  private getProductInfo(type: OrderType): { name: string; description: string; duration: number; price: number } {
    const products = {
      [OrderType.MEMBERSHIP_MONTHLY]: {
        name: '月卡会员',
        description: '30天会员权益',
        duration: 1,
        price: 30,
      },
      [OrderType.MEMBERSHIP_YEARLY]: {
        name: '年卡会员',
        description: '365天会员权益',
        duration: 12,
        price: 300,
      },
      [OrderType.SINGLE_DIVINATION]: {
        name: '按次详细解卦',
        description: '单次详细解卦服务',
        duration: 0,
        price: 10,
      },
    };

    return products[type];
  }

  /**
   * 激活用户会员
   */
  private async activateUserMembership(userId: string, order: Order): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 如果是会员订单
    if (order.membership) {
      const { type, startAt, endAt } = order.membership;
      user.membership.type = type === 'monthly' ? MembershipType.MONTHLY : MembershipType.YEARLY;
      user.membership.level = type === 'monthly' ? 1 : 2;
      user.membership.expireAt = endAt;
      user.membership.activatedAt = startAt;
    }
    // 如果是按次解卦订单
    else if (order.type === OrderType.SINGLE_DIVINATION) {
      // 可以在这里添加按次解卦的逻辑
      // 比如增加用户的解卦次数等
    }

    await user.save();
  }

  /**
   * 获取会员权益配置
   */
  private getMembershipPrivileges(type: MembershipType): {
    dailyDivinations: number;
    detailedInterpretation: boolean;
    preciseInterpretation: boolean;
    learningAccess: boolean;
    adFree: boolean;
  } {
    const privileges = {
      [MembershipType.FREE]: {
        dailyDivinations: 3,
        detailedInterpretation: false,
        preciseInterpretation: false,
        learningAccess: true,
        adFree: false,
      },
      [MembershipType.MONTHLY]: {
        dailyDivinations: -1,
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

    return privileges[type];
  }

  /**
   * 获取按次解卦权益
   */
  private getSingleDivinationPrivileges(): {
    dailyDivinations: number;
    detailedInterpretation: boolean;
    preciseInterpretation: boolean;
    learningAccess: boolean;
    adFree: boolean;
  } {
    return {
      dailyDivinations: 10,
      detailedInterpretation: true,
      preciseInterpretation: false,
      learningAccess: true,
      adFree: false,
    };
  }
}
