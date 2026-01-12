import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * 幸运信息接口
 */
export interface ILucky {
  direction: string;  // 幸运方位
  color: string;      // 幸运颜色
  number: number;     // 幸运数字
  time: string;       // 幸运时辰
}

/**
 * 每日内容接口
 */
export interface IDailyContent {
  guaci: string;      // 卦辞
  advice: string;     // 今日建议
  lucky: ILucky;      // 幸运信息
}

/**
 * 名言接口
 */
export interface IQuote {
  text: string;       // 名言内容
  source: string;     // 来源
}

/**
 * 统计数据接口
 */
export interface IDailyStats {
  views: number;      // 查看次数
  shares: number;     // 分享次数
  likes: number;      // 点赞次数
}

/**
 * 每日一卦文档类型
 */
export type DailyHexagramDocument = DailyHexagram & Document;

/**
 * 每日一卦Schema
 * 存储每日推送的卦象
 */
@Schema({ timestamps: true, collection: 'daily_hexagrams' })
export class DailyHexagram {
  /**
   * 主键ID
   */
  _id: Types.ObjectId;

  /**
   * 推送日期 (唯一)
   */
  @Prop({ type: Date, required: true, unique: true, index: true })
  date: Date;

  /**
   * 年份
   */
  @Prop({ type: Number, required: true })
  year: number;

  /**
   * 月份
   */
  @Prop({ type: Number, required: true })
  month: number;

  /**
   * 日期
   */
  @Prop({ type: Number, required: true })
  day: number;

  /**
   * 卦象ID (引用hexagrams表)
   */
  @Prop({ type: Types.ObjectId, required: true })
  hexagramId: Types.ObjectId;

  /**
   * 卦象信息 (冗余存储，提高查询性能)
   */
  @Prop({
    type: {
      name: { type: String, required: true },
      symbol: { type: String, required: true },
      sequence: { type: Number, required: true },
    },
    _id: false,
    required: true,
  })
  hexagram: {
    name: string;
    symbol: string;
    sequence: number;
  };

  /**
   * 推送内容
   */
  @Prop({
    type: {
      guaci: { type: String, required: true },
      advice: { type: String, required: true },
      lucky: {
        type: {
          direction: { type: String, required: true },
          color: { type: String, required: true },
          number: { type: Number, required: true },
          time: { type: String, required: true },
        },
        _id: false,
        required: true,
      },
    },
    _id: false,
    required: true,
  })
  content: IDailyContent;

  /**
   * 名言
   */
  @Prop({
    type: {
      text: { type: String, required: true },
      source: { type: String, required: true },
    },
    _id: false,
    required: true,
  })
  quote: IQuote;

  /**
   * 统计数据
   */
  @Prop({
    type: {
      views: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
    },
    _id: false,
    required: true,
  })
  stats: IDailyStats;

  /**
   * 创建时间 (自动管理)
   */
  createdAt: Date;

  /**
   * 推送计划时间
   */
  @Prop({ type: Date })
  pushScheduledAt?: Date;
}

/**
 * 创建DailyHexagram Schema
 */
export const DailyHexagramSchema = SchemaFactory.createForClass(DailyHexagram);

// 创建索引
DailyHexagramSchema.index({ date: 1 }, { unique: true });
DailyHexagramSchema.index({ year: 1, month: 1, day: 1 });
