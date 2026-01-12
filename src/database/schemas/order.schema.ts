import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * 订单类型枚举
 */
export enum OrderType {
  MEMBERSHIP_MONTHLY = 'membership_monthly',
  MEMBERSHIP_YEARLY = 'membership_yearly',
  SINGLE_DIVINATION = 'single_divination',
}

/**
 * 支付方式枚举
 */
export enum PaymentMethod {
  WECHAT = 'wechat',
  ALIPAY = 'alipay',
}

/**
 * 支付渠道枚举
 */
export enum PaymentChannel {
  APP = 'app',
  MINIPROGRAM = 'miniprogram',
  H5 = 'h5',
}

/**
 * 支付状态枚举
 */
export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
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
 * 平台枚举
 */
export enum Platform {
  IOS = 'ios',
  ANDROID = 'android',
  MINIPROGRAM = 'miniprogram',
  H5 = 'h5',
}

/**
 * 商品信息接口
 */
export interface IProduct {
  name: string;
  description: string;
  duration: number; // 月数
}

/**
 * 支付信息接口
 */
export interface IPayment {
  method: PaymentMethod;
  channel: PaymentChannel;
  transactionId?: string; // 第三方交易号
  prepayId?: string;      // 预支付ID
  status: PaymentStatus;
  paidAt?: Date;
  failedReason?: string;
}

/**
 * 会员信息接口
 */
export interface IMembership {
  type: 'monthly' | 'yearly';
  duration: number;       // 月数
  startAt: Date;
  endAt: Date;
}

/**
 * 退款信息接口
 */
export interface IRefund {
  amount: number;
  reason?: string;
  refundId?: string;
  refundedAt?: Date;
}

/**
 * 客户端信息接口
 */
export interface IClient {
  platform: Platform;
  ip: string;
  userAgent?: string;
}

/**
 * 订单文档类型
 */
export type OrderDocument = Order & Document;

/**
 * 订单Schema
 * 存储用户订单和支付信息
 */
@Schema({ timestamps: true, collection: 'orders' })
export class Order {
  /**
   * 主键ID
   */
  _id: Types.ObjectId;

  /**
   * 用户ID
   */
  @Prop({ type: Types.ObjectId, required: true, index: true })
  userId: Types.ObjectId;

  /**
   * 订单号 (唯一)
   */
  @Prop({ type: String, required: true, unique: true })
  orderNo: string;

  /**
   * 订单类型
   */
  @Prop({
    type: String,
    enum: OrderType,
    required: true,
    index: true,
  })
  type: OrderType;

  /**
   * 金额 (单位: 分)
   */
  @Prop({ type: Number, required: true })
  amount: number;

  /**
   * 实付金额
   */
  @Prop({ type: Number, default: 0 })
  paidAmount: number;

  /**
   * 优惠金额
   */
  @Prop({ type: Number, default: 0 })
  discountAmount: number;

  /**
   * 退款金额
   */
  @Prop({ type: Number, default: 0 })
  refundAmount: number;

  /**
   * 商品信息
   */
  @Prop({
    type: {
      name: { type: String, required: true },
      description: { type: String, required: true },
      duration: { type: Number, required: true },
    },
    _id: false,
    required: true,
  })
  product: IProduct;

  /**
   * 支付信息
   */
  @Prop({
    type: {
      method: { type: String, enum: PaymentMethod, required: true },
      channel: { type: String, enum: PaymentChannel, required: true },
      transactionId: { type: String },
      prepayId: { type: String },
      status: { type: String, enum: PaymentStatus, required: true },
      paidAt: { type: Date },
      failedReason: { type: String },
    },
    _id: false,
    required: true,
  })
  payment: IPayment;

  /**
   * 会员信息 (仅会员订单)
   */
  @Prop({
    type: {
      type: { type: String, enum: ['monthly', 'yearly'] },
      duration: { type: Number },
      startAt: { type: Date },
      endAt: { type: Date },
    },
    _id: false,
  })
  membership?: IMembership;

  /**
   * 订单状态
   */
  @Prop({
    type: String,
    enum: OrderStatus,
    default: OrderStatus.CREATED,
    index: true,
  })
  status: OrderStatus;

  /**
   * 退款信息
   */
  @Prop({
    type: {
      amount: { type: Number, default: 0 },
      reason: { type: String },
      refundId: { type: String },
      refundedAt: { type: Date },
    },
    _id: false,
  })
  refund?: IRefund;

  /**
   * 客户端信息
   */
  @Prop({
    type: {
      platform: { type: String, enum: Platform },
      ip: { type: String, required: true },
      userAgent: { type: String },
    },
    _id: false,
    required: true,
  })
  client: IClient;

  /**
   * 创建时间 (自动管理)
   */
  createdAt: Date;

  /**
   * 支付时间
   */
  paidAt?: Date;

  /**
   * 订单过期时间
   */
  @Prop({ type: Date, required: true })
  expiredAt: Date;

  /**
   * 备注
   */
  @Prop({ type: String })
  remark?: string;
}

/**
 * 创建Order Schema
 */
export const OrderSchema = SchemaFactory.createForClass(Order);

// 创建索引
OrderSchema.index({ orderNo: 1 }, { unique: true });
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ 'payment.transactionId': 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ type: 1 });
