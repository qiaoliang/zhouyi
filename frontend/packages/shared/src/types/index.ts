/**
 * 用户类型定义
 */

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  UNKNOWN = 'unknown',
}

export enum MembershipType {
  FREE = 'free',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  LIFETIME = 'lifetime',
}

export enum MembershipLevel {
  NORMAL = 'normal',
  VIP = 'vip',
  SVIP = 'svip',
}

export interface User {
  id: string;
  phoneNumber?: string;
  nickname: string;
  avatar: string;
  gender?: Gender;  // 改为可选，因为服务器可能不总是返回
  isGuest: boolean;
  membership?: {
    type: MembershipType;
    level: MembershipLevel;
    expireAt?: string;
  };
  createdAt?: string;  // 改为可选
  lastLoginAt?: string;  // 改为可选
}

/**
 * 卦象类型
 */

export interface HexagramSymbol {
  position: number;
  yinYang: 'yin' | 'yang';
  changing: boolean;
}

export interface Hexagram {
  primary: {
    name: string;
    symbol: string;
    pinyin: string;
    sequence: number;
  };
  changed: {
    name: string;
    symbol: string;
    pinyin: string;
    sequence: number;
  };
  mutual: {
    name: string;
    symbol: string;
    pinyin: string;
    sequence: number;
  };
  lines: HexagramSymbol[];
  changingLines: number[];
}

/**
 * 卜卦记录类型
 */

export interface DivinationRecord {
  _id: string;
  userId?: string;
  guestId?: string;
  hexagram: Hexagram;
  interpretation: {
    basic: {
      hexagramName: string;
      guaci: string;
      guaciTranslation: string;
      yaoci: Array<{
        position: number;
        original: string;
        translation: string;
      }>;
    };
    detailed?: any;
    precise?: {
      personalizedAdvice: string;
      precise: string;
    };
  };
  payment: {
    type: 'free' | 'single' | 'subscription';
    amount: number;
    status: 'paid' | 'unpaid';
  };
  createdAt: string;
  isFavorite?: boolean;
}

/**
 * 学习课程类型
 */

export interface CourseModule {
  id: string;
  name: string;
  title: string;
  description: string;
  order: number;
  icon?: string;
  estimatedTime: number;
  courses: Course[];
}

export interface Course {
  id: string;
  title: string;
  description: string;
  order: number;
  duration: number;
  difficulty: number;
  tags: string[];
  hasQuiz: boolean;
}

export interface CourseContent {
  module: {
    id: string;
    name: string;
    title: string;
  };
  course: {
    id: string;
    title: string;
    description: string;
    content: Array<{
      type: 'text' | 'image' | 'diagram' | 'quote';
      content: string;
      imageUrl?: string;
      caption?: string;
    }>;
    quiz?: {
      hasQuiz: true;
      questionCount: number;
      passingScore: number;
    };
  };
}

export interface Quiz {
  courseId: string;
  passingScore: number;
  questions: Array<{
    id: string;
    type: 'single' | 'multiple';
    question: string;
    options: Array<{
      id: string;
      text: string;
    }>;
    points: number;
  }>;
}

export interface QuizSubmission {
  courseId: string;
  answers: Array<{
    questionId: string;
    answers: string[];
  }>;
}

/**
 * 学习进度类型
 */

export interface LearningProgress {
  userId: string;
  courses: Array<{
    id: string;
    name: string;
    order: number;
    completed: boolean;
    completedAt?: string;
    readingTime: number;
    quiz?: {
      score: number;
      passed: boolean;
      attempts: number;
      completedAt?: string;
    };
  }>;
  progress: {
    completed: number;
    total: number;
    percentage: number;
    lastCourseId?: string;
  };
  rewards?: {
    freeDetailedDivination?: {
      available: boolean;
      used: boolean;
      usedAt?: string;
      divinationId?: string;
    };
  };
  stats: {
    totalReadingTime: number;
    totalQuizScore: number;
    averageQuizScore: number;
    quizAttempts: number;
  };
}

/**
 * 每日一卦类型
 */

export interface DailyHexagram {
  date: string;
  hexagram: {
    name: string;
    symbol: string;
    sequence: number;
  };
  content: {
    guaci: string;
    advice: string;
    lucky: {
      direction: string;
      color: string;
      number: number;
      time: string;
    };
  };
  quote: {
    text: string;
    source: string;
  };
  stats: {
    views: number;
    shares: number;
    likes: number;
  };
}

/**
 * API响应类型
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  message: string;
  timestamp: number;
}

/**
 * 认证响应类型
 */

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    phoneNumber: string;
    nickname: string;
    avatar: string;
    membership?: any;
    isGuest: boolean;
  };
}
