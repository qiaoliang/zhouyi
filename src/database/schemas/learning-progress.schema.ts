import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * 课程进度接口
 */
export interface ICourseProgress {
  id: string;
  name: string;
  order: number;
  completed: boolean;
  completedAt?: Date;
  readingTime: number; // 阅读时长 (秒)
  quiz?: {
    score: number;       // 测验分数
    passed: boolean;
    attempts: number;
    completedAt?: Date;
  };
}

/**
 * 总体进度接口
 */
export interface IProgress {
  completed: number;     // 已完成数
  total: number;         // 总数
  percentage: number;    // 百分比
  lastCourseId?: string; // 最后学习的课程
  continueAt?: Date;     // 继续学习位置
}

/**
 * 奖励接口
 */
export interface IRewards {
  freeDetailedDivination?: {
    available: boolean;  // 是否已解锁
    used: boolean;
    usedAt?: Date;
    divinationId?: Types.ObjectId;
  };
}

/**
 * 统计数据接口
 */
export interface IStats {
  totalReadingTime: number;   // 总阅读时长 (秒)
  totalQuizScore: number;     // 总测验分
  averageQuizScore: number;   // 平均测验分
  quizAttempts: number;       // 总测验次数
}

/**
 * 学习进度文档类型
 */
export type LearningProgressDocument = LearningProgress & Document;

/**
 * 学习进度Schema
 * 存储用户的学习进度和完成记录
 */
@Schema({ timestamps: true, collection: 'learning_progress' })
export class LearningProgress {
  /**
   * 主键ID
   */
  _id: Types.ObjectId;

  /**
   * 用户ID (唯一)
   */
  @Prop({ type: Types.ObjectId, required: true, unique: true, index: true })
  userId: Types.ObjectId;

  /**
   * 课程进度列表
   */
  @Prop({
    type: [
      {
        id: { type: String, required: true },
        name: { type: String, required: true },
        order: { type: Number, required: true },
        completed: { type: Boolean, default: false },
        completedAt: { type: Date },
        readingTime: { type: Number, default: 0 },
        quiz: {
          type: {
            score: { type: Number },
            passed: { type: Boolean },
            attempts: { type: Number },
            completedAt: { type: Date },
          },
          _id: false,
        },
      },
    ],
    _id: false,
    default: [],
  })
  courses: ICourseProgress[];

  /**
   * 总体进度
   */
  @Prop({
    type: {
      completed: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
      percentage: { type: Number, default: 0 },
      lastCourseId: { type: String },
      continueAt: { type: Date },
    },
    _id: false,
    required: true,
  })
  progress: IProgress;

  /**
   * 奖励
   */
  @Prop({
    type: {
      freeDetailedDivination: {
        type: {
          available: { type: Boolean, default: false },
          used: { type: Boolean, default: false },
          usedAt: { type: Date },
          divinationId: { type: Types.ObjectId },
        },
        _id: false,
      },
    },
    _id: false,
  })
  rewards?: IRewards;

  /**
   * 统计数据
   */
  @Prop({
    type: {
      totalReadingTime: { type: Number, default: 0 },
      totalQuizScore: { type: Number, default: 0 },
      averageQuizScore: { type: Number, default: 0 },
      quizAttempts: { type: Number, default: 0 },
    },
    _id: false,
    required: true,
  })
  stats: IStats;

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
 * 创建LearningProgress Schema
 */
export const LearningProgressSchema = SchemaFactory.createForClass(LearningProgress);

// 创建索引
LearningProgressSchema.index({ userId: 1 }, { unique: true });
LearningProgressSchema.index({ 'progress.percentage': 1 });
