import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * 用户状态枚举
 */
export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
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
 * 会员等级枚举
 */
export enum MembershipLevel {
  FREE = 0,
  MONTHLY = 1,
  YEARLY = 2,
}

/**
 * 性别枚举
 */
export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  UNKNOWN = 'unknown',
}

/**
 * 会员信息接口
 */
export interface IMembership {
  type: MembershipType;
  level: MembershipLevel;
  expireAt: Date;
  autoRenew: boolean;
  activatedAt: Date;
}

/**
 * 用户统计数据接口
 */
export interface IUserStats {
  divinationCount: number;
  guestUsedCount: number;
  learningProgress: number;
  lastDivinationAt?: Date;
}

/**
 * 推送设置接口
 */
export interface IPushSettings {
  enabled: boolean;
  dailyHexagram: boolean;
  time: string;
}

/**
 * 用户文档类型
 */
export type UserDocument = User & Document;

/**
 * 用户Schema
 * 存储用户基本信息、会员状态和统计数据
 */
@Schema({ timestamps: true, collection: 'users' })
export class User {
  /**
   * 主键ID
   */
  _id: Types.ObjectId;

  /**
   * 微信开放平台UnionID (唯一标识)
   * 同一用户在不同应用下唯一
   */
  @Prop({ type: String, sparse: true, index: true })
  unionId?: string;

  /**
   * 微信小程序OpenID
   * 用户在某个小程序下的唯一标识
   */
  @Prop({ type: String, sparse: true, index: true })
  openId?: string;

  /**
   * 手机号 (加密存储)
   */
  @Prop({ type: String, sparse: true, index: true })
  phoneNumber?: string;

  /**
   * 昵称
   */
  @Prop({ type: String, default: '' })
  nickname: string;

  /**
   * 头像URL
   */
  @Prop({ type: String, default: '' })
  avatar: string;

  /**
   * 性别
   */
  @Prop({ type: String, enum: Gender, default: Gender.UNKNOWN })
  gender: Gender;

  /**
   * 会员信息
   */
  @Prop({
    type: {
      type: { type: String, enum: MembershipType, default: MembershipType.FREE },
      level: { type: Number, enum: MembershipLevel, default: MembershipLevel.FREE },
      expireAt: { type: Date, default: null },
      autoRenew: { type: Boolean, default: false },
      activatedAt: { type: Date, default: Date.now },
    },
    _id: false,
  })
  membership: IMembership;

  /**
   * 统计数据
   */
  @Prop({
    type: {
      divinationCount: { type: Number, default: 0 },
      guestUsedCount: { type: Number, default: 0 },
      learningProgress: { type: Number, default: 0 },
      lastDivinationAt: { type: Date, default: null },
    },
    _id: false,
  })
  stats: IUserStats;

  /**
   * 是否游客
   * true: 游客模式 (功能受限)
   * false: 正式用户
   */
  @Prop({ type: Boolean, default: false, index: true })
  isGuest: boolean;

  /**
   * 用户状态
   */
  @Prop({ type: String, enum: UserStatus, default: UserStatus.ACTIVE })
  status: UserStatus;

  /**
   * 推送设置
   */
  @Prop({
    type: {
      enabled: { type: Boolean, default: true },
      dailyHexagram: { type: Boolean, default: true },
      time: { type: String, default: '08:00' },
    },
    _id: false,
  })
  push: IPushSettings;

  /**
   * 最后登录时间
   */
  @Prop({ type: Date, default: Date.now })
  lastLoginAt: Date;

  /**
   * 软删除时间
   */
  @Prop({ type: Date, default: null })
  deletedAt?: Date;

  /**
   * 创建时间 (自动管理)
   */
  createdAt: Date;

  /**
   * 更新时间 (自动管理)
   */
  updatedAt: Date;
}

/**
 * 创建User Schema
 */
export const UserSchema = SchemaFactory.createForClass(User);

// 创建索引
UserSchema.index({ unionId: 1 }, { unique: true, sparse: true });
UserSchema.index({ openId: 1 }, { unique: true, sparse: true });
UserSchema.index({ phoneNumber: 1 }, { unique: true, sparse: true });
UserSchema.index({ membership: 1 });
UserSchema.index({ isGuest: 1 });
UserSchema.index({ createdAt: -1 });
UserSchema.index({ openId: 1, status: 1 });
