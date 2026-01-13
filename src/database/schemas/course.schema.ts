import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * 课程内容块接口
 */
export interface IContentBlock {
  type: 'text' | 'image' | 'diagram' | 'quote';
  content: string;
  imageUrl?: string;
  caption?: string;
}

/**
 * 测验问题接口
 */
export interface IQuizQuestion {
  id: string;
  type: 'single' | 'multiple';
  question: string;
  options: Array<{
    id: string;
    text: string;
    correct: boolean;
  }>;
  explanation?: string; // 答案解释
  points: number;
}

/**
 * 课程数据接口
 */
export interface ICourseData {
  id: string;
  title: string;
  description: string;
  order: number;
  duration: number; // 预计阅读时间（分钟）
  difficulty: 1 | 2 | 3 | 4 | 5;
  tags: string[];

  // 课程内容
  content: IContentBlock[];

  // 测验
  quiz?: {
    passingScore: number; // 及格分数
    questions: IQuizQuestion[];
  };

  // 元数据
  metadata?: {
    author?: string;
    references?: string[];
    relatedHexagrams?: number[]; // 相关卦象序号
  };
}

/**
 * 课程模块接口
 */
export interface ICourseModule {
  id: string;
  name: string;
  title: string;
  description: string;
  order: number;
  icon?: string;
  estimatedTime: number; // 总预计时间（分钟）
  courses: ICourseData[];
}

/**
 * 课程文档类型
 */
export type CourseDocument = Course & Document;

/**
 * 课程Schema
 * 存储课程内容和结构
 */
@Schema({ timestamps: true, collection: 'courses' })
export class Course {
  /**
   * 主键ID
   */
  _id: Types.ObjectId;

  /**
   * 课程ID (唯一标识符)
   */
  @Prop({ type: String, required: true, unique: true })
  courseId: string;

  /**
   * 模块信息
   */
  @Prop({
    type: {
      id: { type: String, required: true },
      name: { type: String, required: true },
      title: { type: String, required: true },
      description: { type: String, required: true },
      order: { type: Number, required: true },
      icon: { type: String },
      estimatedTime: { type: Number, required: true },
    },
    _id: false,
    required: true,
  })
  module: {
    id: string;
    name: string;
    title: string;
    description: string;
    order: number;
    icon?: string;
    estimatedTime: number;
  };

  /**
   * 课程ID
   */
  @Prop({ type: String, required: true })
  courseDataId: string;

  /**
   * 课程标题
   */
  @Prop({ type: String, required: true })
  title: string;

  /**
   * 课程描述
   */
  @Prop({ type: String, required: true })
  description: string;

  /**
   * 课程顺序
   */
  @Prop({ type: Number, required: true })
  order: number;

  /**
   * 预计阅读时间（分钟）
   */
  @Prop({ type: Number, required: true })
  duration: number;

  /**
   * 难度等级 (1-5)
   */
  @Prop({ type: Number, required: true, min: 1, max: 5 })
  difficulty: number;

  /**
   * 标签
   */
  @Prop({ type: [String], default: [] })
  tags: string[];

  /**
   * 课程内容
   */
  @Prop({
    type: [
      {
        type: { type: String, enum: ['text', 'image', 'diagram', 'quote'], required: true },
        content: { type: String, required: true },
        imageUrl: { type: String },
        caption: { type: String },
      },
    ],
    _id: false,
    required: true,
  })
  content: IContentBlock[];

  /**
   * 测验数据
   */
  @Prop({
    type: {
      passingScore: { type: Number, required: true },
      questions: {
        type: [
          {
            id: { type: String, required: true },
            type: { type: String, enum: ['single', 'multiple'], required: true },
            question: { type: String, required: true },
            options: {
              type: [
                {
                  id: { type: String, required: true },
                  text: { type: String, required: true },
                  correct: { type: Boolean, required: true },
                },
              ],
              required: true,
            },
            explanation: { type: String },
            points: { type: Number, required: true },
          },
        ],
        required: true,
      },
    },
    _id: false,
  })
  quiz?: {
    passingScore: number;
    questions: IQuizQuestion[];
  };

  /**
   * 元数据
   */
  @Prop({
    type: {
      author: { type: String },
      references: { type: [String] },
      relatedHexagrams: { type: [Number] },
    },
    _id: false,
  })
  metadata?: {
    author?: string;
    references?: string[];
    relatedHexagrams?: number[];
  };

  /**
   * 是否发布
   */
  @Prop({ type: Boolean, default: false })
  published: boolean;

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
 * 创建Course Schema
 */
export const CourseSchema = SchemaFactory.createForClass(Course);

// 创建索引
CourseSchema.index({ courseId: 1, courseDataId: 1 }, { unique: true });
CourseSchema.index({ 'module.order': 1, order: 1 });
CourseSchema.index({ published: 1 });
CourseSchema.index({ tags: 1 });
