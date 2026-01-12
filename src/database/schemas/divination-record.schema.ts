import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * 阴阳类型
 */
export enum YinYang {
  YIN = 'yin',
  YANG = 'yang',
}

/**
 * 卦爻接口
 */
export interface IHexagramLine {
  position: number;       // 爻位 (1-6, 从下到上)
  yinYang: YinYang;       // 阴阳
  changing: boolean;      // 是否变爻
}

/**
 * 卦象信息接口
 */
export interface IHexagram {
  primary: {
    name: string;         // 主卦名称 (如 "乾为天")
    symbol: string;       // 主卦符号 (如 "䷀")
    pinyin: string;       // 拼音
    sequence: number;     // 序号 (1-64)
  };
  lines: IHexagramLine[]; // 六爻 (从下到上: 初爻到上爻)
  changed: {
    name: string;         // 变卦名称
    symbol: string;       // 变卦符号
    pinyin: string;       // 拼音
    sequence: number;     // 序号
  };
  mutual: {
    name: string;         // 互卦名称 (二三四爻为下卦，三四五爻为上卦)
    symbol: string;       // 互卦符号
    pinyin: string;       // 拼音
    sequence: number;     // 序号
  };
  changingLines: number[]; // 变爻位置
}

/**
 * 精准解卦信息接口
 */
export interface IPreciseInfo {
  name: string;           // 姓名
  gender: 'male' | 'female';
  birthDate: Date;        // 出生日期
  question: string;       // 占问事项
}

/**
 * 卦辞接口
 */
export interface IGuaCi {
  hexagramName: string;   // 卦名
  guaci: string;          // 卦辞原文
  guaciTranslation: string; // 卦辞白话
  yaoci: Array<{
    position: number;
    original: string;     // 爻辞原文
    translation: string;  // 爻辞白话
  }>;
}

/**
 * 解卦结果接口
 */
export interface IInterpretation {
  basic: IGuaCi;          // 基础解卦 (免费)
  detailed?: {
    changingAnalysis: string;  // 变卦分析
    mutualAnalysis: string;    // 互卦分析
    timingAnalysis: string;    // 应期分析
    advice: string;            // 综合建议
  };                        // 详细解卦 (付费)
  precise?: string;        // 精准解卦 (付费)
}

/**
 * 支付信息接口
 */
export interface IPayment {
  type: 'free' | 'single' | 'membership';
  orderId: Types.ObjectId;
  amount: number;
  status: 'unpaid' | 'paid' | 'refunded';
}

/**
 * 设备信息接口
 */
export interface IDevice {
  platform: 'ios' | 'android' | 'miniprogram' | 'h5';
  model: string;
}

/**
 * 卜卦记录文档类型
 */
export type DivinationRecordDocument = DivinationRecord & Document;

/**
 * 卜卦记录Schema
 * 存储用户的卜卦记录和结果
 */
@Schema({ timestamps: true, collection: 'divination_records' })
export class DivinationRecord {
  /**
   * 主键ID
   */
  _id: Types.ObjectId;

  /**
   * 用户ID (正式用户)
   */
  @Prop({ type: Types.ObjectId, index: true })
  userId?: Types.ObjectId;

  /**
   * 游客设备ID (游客模式)
   */
  @Prop({ type: String, index: true })
  guestId?: string;

  /**
   * 卦象信息
   */
  @Prop({
    type: {
      primary: {
        type: {
          name: { type: String, required: true },
          symbol: { type: String, required: true },
          pinyin: { type: String, required: true },
          sequence: { type: Number, required: true },
        },
        _id: false,
      },
      lines: {
        type: [
          {
            position: { type: Number, required: true },
            yinYang: { type: String, enum: YinYang, required: true },
            changing: { type: Boolean, default: false },
          },
        ],
        _id: false,
      },
      changed: {
        type: {
          name: { type: String, required: true },
          symbol: { type: String, required: true },
          pinyin: { type: String, required: true },
          sequence: { type: Number, required: true },
        },
        _id: false,
      },
      mutual: {
        type: {
          name: { type: String, required: true },
          symbol: { type: String, required: true },
          pinyin: { type: String, required: true },
          sequence: { type: Number, required: true },
        },
        _id: false,
      },
      changingLines: { type: [Number], default: [] },
    },
    _id: false,
    required: true,
  })
  hexagram: IHexagram;

  /**
   * 精准解卦信息 (可选)
   */
  @Prop({
    type: {
      name: { type: String },
      gender: { type: String, enum: ['male', 'female'] },
      birthDate: { type: Date },
      question: { type: String },
    },
    _id: false,
  })
  preciseInfo?: IPreciseInfo;

  /**
   * 解卦结果
   */
  @Prop({
    type: {
      basic: {
        type: {
          hexagramName: { type: String, required: true },
          guaci: { type: String, required: true },
          guaciTranslation: { type: String, required: true },
          yaoci: {
            type: [
              {
                position: { type: Number, required: true },
                original: { type: String, required: true },
                translation: { type: String, required: true },
              },
            ],
            _id: false,
          },
        },
        _id: false,
        required: true,
      },
      detailed: {
        type: {
          changingAnalysis: { type: String },
          mutualAnalysis: { type: String },
          timingAnalysis: { type: String },
          advice: { type: String },
        },
        _id: false,
      },
      precise: { type: String },
    },
    _id: false,
    required: true,
  })
  interpretation: IInterpretation;

  /**
   * 支付信息
   */
  @Prop({
    type: {
      type: { type: String, enum: ['free', 'single', 'membership'], default: 'free' },
      orderId: { type: Types.ObjectId },
      amount: { type: Number, default: 0 },
      status: { type: String, enum: ['unpaid', 'paid', 'refunded'], default: 'unpaid' },
    },
    _id: false,
  })
  payment?: IPayment;

  /**
   * 是否收藏
   */
  @Prop({ type: Boolean, default: false, index: true })
  isFavorite: boolean;

  /**
   * 设备信息
   */
  @Prop({
    type: {
      platform: { type: String, enum: ['ios', 'android', 'miniprogram', 'h5'] },
      model: { type: String },
    },
    _id: false,
  })
  device: IDevice;

  /**
   * 创建时间 (自动管理)
   */
  createdAt: Date;

  /**
   * 云端同步时间
   */
  @Prop({ type: Date, default: Date.now })
  syncAt: Date;
}

/**
 * 创建DivinationRecord Schema
 */
export const DivinationRecordSchema = SchemaFactory.createForClass(DivinationRecord);

// 创建索引
DivinationRecordSchema.index({ userId: 1, createdAt: -1 });
DivinationRecordSchema.index({ guestId: 1, createdAt: -1 });
DivinationRecordSchema.index({ 'hexagram.primary.sequence': 1 });
DivinationRecordSchema.index({ isFavorite: 1 });
DivinationRecordSchema.index({ userId: 1, isFavorite: 1 });
DivinationRecordSchema.index({ userId: 1, payment: 1 });

// TTL索引: 游客数据30天后自动删除
DivinationRecordSchema.index(
  { createdAt: 1 },
  {
    name: 'ttl_guest_records',
    expireAfterSeconds: 30 * 24 * 60 * 60, // 30天
    partialFilterExpression: { guestId: { $exists: true, $ne: null } },
  },
);
