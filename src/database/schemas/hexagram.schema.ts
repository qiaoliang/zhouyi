import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * 卦爻数据接口
 */
export interface IYaoCi {
  position: number;       // 爻位 (1-6)
  name: string;           // 爻名 (如 "初九", "六二")
  yinYang: 'yin' | 'yang'; // 阴阳
  original: string;       // 爻辞原文
  translation: string;    // 白话解释
  xiang: string;          // 小象辞
  annotation?: string;    // 注释
}

/**
 * 卦辞接口
 */
export interface IGuaCi {
  original: string;       // 原文
  translation: string;    // 白话解释
  annotation?: string;    // 注释
}

/**
 * 彖辞接口
 */
export interface ITuanCi {
  original: string;       // 原文
  translation: string;    // 白话解释
  annotation?: string;    // 注释
}

/**
 * 象辞接口
 */
export interface IXiangCi {
  original: string;       // 原文
  translation: string;    // 白话解释
  annotation?: string;    // 注释
}

/**
 * 高级分析接口
 */
export interface IAnalysis {
  changing: {
    principles: string[];
    examples: string[];
  };
  mutual: {
    principles: string[];
    examples: string[];
  };
  timing: {
    principles: string[];
    examples: string[];
  };
}

/**
 * 经卦信息接口
 */
export interface ITrigram {
  name: string;           // 卦名 (乾、坤等)
  symbol: string;         // 卦符 (☰、☷等)
  nature: string;         // 卦德 (天、地等)
  position: 'upper' | 'lower';
}

/**
 * 元数据接口
 */
export interface IHexagramMetadata {
  element: string;        // 五行
  nature: string;         // 卦德
  direction: string;      // 方位
  season: string;         // 季节
  trigrams: {
    upper: ITrigram;
    lower: ITrigram;
  };
  family: string;         // 八卦家庭
  body: string;           // 对应身体部位
  animal: string;         // 对应动物
  color: string;          // 对应颜色
}

/**
 * 学习相关接口
 */
export interface ILearning {
  courseId: string;
  order: number;
  difficulty: number;     // 难度 1-5
  readingTime: number;    // 预计阅读时间 (分钟)
}

/**
 * 分类接口
 */
export interface ICategory {
  nature: 'yang' | 'yin'; // 阳卦/阴卦
  quality: 'lucky' | 'unlucky' | 'neutral'; // 吉凶
  difficulty: 'simple' | 'complex';
}

/**
 * 六十四卦数据文档类型
 */
export type HexagramDocument = Hexagram & Document;

/**
 * 六十四卦数据Schema
 * 存储六十四卦的完整内容
 */
@Schema({ timestamps: true, collection: 'hexagrams' })
export class Hexagram {
  /**
   * 主键ID
   */
  _id: Types.ObjectId;

  /**
   * 卦象符号 (如 ䷀)
   */
  @Prop({ type: String, required: true, unique: true })
  symbol: string;

  /**
   * 卦名 (如 "乾为天")
   */
  @Prop({ type: String, required: true })
  name: string;

  /**
   * 拼音 (如 "qián wéi tiān")
   */
  @Prop({ type: String, required: true })
  pinyin: string;

  /**
   * 序号 (1-64)
   */
  @Prop({ type: Number, required: true, unique: true })
  sequence: number;

  /**
   * 卦辞
   */
  @Prop({
    type: {
      original: { type: String, required: true },
      translation: { type: String, required: true },
      annotation: { type: String },
    },
    _id: false,
    required: true,
  })
  guaci: IGuaCi;

  /**
   * 彖辞
   */
  @Prop({
    type: {
      original: { type: String, required: true },
      translation: { type: String, required: true },
      annotation: { type: String },
    },
    _id: false,
    required: true,
  })
  tuanci: ITuanCi;

  /**
   * 象辞
   */
  @Prop({
    type: {
      original: { type: String, required: true },
      translation: { type: String, required: true },
      annotation: { type: String },
    },
    _id: false,
    required: true,
  })
  xiangci: IXiangCi;

  /**
   * 六爻
   */
  @Prop({
    type: [
      {
        position: { type: Number, required: true },
        name: { type: String, required: true },
        yinYang: { type: String, enum: ['yin', 'yang'], required: true },
        original: { type: String, required: true },
        translation: { type: String, required: true },
        xiang: { type: String, required: true },
        annotation: { type: String },
      },
    ],
    _id: false,
    required: true,
  })
  yaoci: IYaoCi[];

  /**
   * 用卦 (部分卦有，如乾卦有用九)
   */
  @Prop({
    type: {
      original: { type: String },
      translation: { type: String },
      annotation: { type: String },
    },
    _id: false,
  })
  yonggua?: {
    original: string;
    translation: string;
    annotation?: string;
  };

  /**
   * 高级分析模板
   */
  @Prop({
    type: {
      changing: {
        principles: { type: [String], default: [] },
        examples: { type: [String], default: [] },
      },
      mutual: {
        principles: { type: [String], default: [] },
        examples: { type: [String], default: [] },
      },
      timing: {
        principles: { type: [String], default: [] },
        examples: { type: [String], default: [] },
      },
    },
    _id: false,
  })
  analysis?: IAnalysis;

  /**
   * 元数据
   */
  @Prop({
    type: {
      element: { type: String },
      nature: { type: String },
      direction: { type: String },
      season: { type: String },
      trigrams: {
        type: {
          upper: {
            type: {
              name: { type: String },
              symbol: { type: String },
              nature: { type: String },
              position: { type: String },
            },
            _id: false,
          },
          lower: {
            type: {
              name: { type: String },
              symbol: { type: String },
              nature: { type: String },
              position: { type: String },
            },
            _id: false,
          },
        },
        _id: false,
      },
      family: { type: String },
      body: { type: String },
      animal: { type: String },
      color: { type: String },
    },
    _id: false,
  })
  metadata?: IHexagramMetadata;

  /**
   * 相对的卦 (如乾的相对是坤)
   */
  @Prop({ type: [Number], default: [] })
  opposites?: number[];

  /**
   * 相似的卦
   */
  @Prop({ type: [Number], default: [] })
  related?: number[];

  /**
   * 所生的卦 (如乾所生的是姤)
   */
  @Prop({ type: [Number], default: [] })
  derived?: number[];

  /**
   * 标签
   */
  @Prop({ type: [String], default: [] })
  tags: string[];

  /**
   * 分类
   */
  @Prop({
    type: {
      nature: { type: String, enum: ['yang', 'yin'] },
      quality: { type: String, enum: ['lucky', 'unlucky', 'neutral'] },
      difficulty: { type: String, enum: ['simple', 'complex'] },
    },
    _id: false,
  })
  category?: ICategory;

  /**
   * 学习相关
   */
  @Prop({
    type: {
      courseId: { type: String },
      order: { type: Number },
      difficulty: { type: Number },
      readingTime: { type: Number },
    },
    _id: false,
  })
  learning?: ILearning;

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
 * 创建Hexagram Schema
 */
export const HexagramSchema = SchemaFactory.createForClass(Hexagram);

// 创建索引
HexagramSchema.index({ sequence: 1 }, { unique: true });
HexagramSchema.index({ symbol: 1 }, { unique: true });
HexagramSchema.index({ name: 'text', pinyin: 'text' });
HexagramSchema.index({ 'metadata.element': 1 });
HexagramSchema.index({ tags: 1 });
