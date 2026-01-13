import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Course } from '../../database/schemas/course.schema';
import { LearningProgress, LearningProgressDocument } from '../../database/schemas/learning-progress.schema';
import {
  ICourseProgress,
  IProgress,
  IRewards,
  IStats,
} from '../../database/schemas/learning-progress.schema';

/**
 * 更新课程进度DTO
 */
export interface UpdateCourseProgressDto {
  courseId: string;
  completed: boolean;
  readingTime: number;
}

/**
 * 提交测验DTO
 */
export interface SubmitQuizDto {
  courseId: string;
  answers: Array<{
    questionId: string;
    answers: string[];
  }>;
}

/**
 * 测验结果
 */
export interface QuizResult {
  score: number;
  totalScore: number;
  percentage: number;
  passed: boolean;
  correctAnswers: number;
  totalQuestions: number;
  answers: Array<{
    questionId: string;
    correct: boolean;
    correctAnswer?: string[];
  }>;
}

/**
 * 学习服务
 * 处理课程内容和学习进度
 */
@Injectable()
export class LearningService {
  private readonly logger = new Logger(LearningService.name);

  constructor(
    @InjectModel('Course')
    private courseModel: Model<Course>,
    @InjectModel('LearningProgress')
    private progressModel: Model<LearningProgress>,
  ) {}

  /**
   * 获取所有课程模块和课程
   */
  async getAllModules(): Promise<any[]> {
    const courses = await this.courseModel.find({ published: true }).sort({
      'module.order': 1,
      order: 1,
    });

    // 按模块分组
    const modulesMap = new Map<string, any>();

    courses.forEach((course) => {
      const moduleId = course.module.id;

      if (!modulesMap.has(moduleId)) {
        modulesMap.set(moduleId, {
          id: course.module.id,
          name: course.module.name,
          title: course.module.title,
          description: course.module.description,
          order: course.module.order,
          icon: course.module.icon,
          estimatedTime: course.module.estimatedTime,
          courses: [],
        });
      }

      modulesMap.get(moduleId).courses.push({
        id: course.courseDataId,
        title: course.title,
        description: course.description,
        order: course.order,
        duration: course.duration,
        difficulty: course.difficulty,
        tags: course.tags,
        hasQuiz: !!course.quiz,
      });
    });

    return Array.from(modulesMap.values()).sort((a, b) => a.order - b.order);
  }

  /**
   * 获取单个课程详情
   */
  async getCourseDetail(moduleId: string, courseId: string): Promise<any> {
    const course = await this.courseModel.findOne({
      'module.id': moduleId,
      courseDataId: courseId,
      published: true,
    });

    if (!course) {
      throw new NotFoundException('课程不存在');
    }

    return {
      module: course.module,
      course: {
        id: course.courseDataId,
        title: course.title,
        description: course.description,
        order: course.order,
        duration: course.duration,
        difficulty: course.difficulty,
        tags: course.tags,
        content: course.content,
        quiz: course.quiz ? {
          hasQuiz: true,
          questionCount: course.quiz.questions.length,
          passingScore: course.quiz.passingScore,
        } : { hasQuiz: false },
      },
    };
  }

  /**
   * 获取课程测验
   */
  async getCourseQuiz(moduleId: string, courseId: string): Promise<any> {
    const course = await this.courseModel.findOne({
      'module.id': moduleId,
      courseDataId: courseId,
      published: true,
    });

    if (!course || !course.quiz) {
      throw new NotFoundException('测验不存在');
    }

    // 返回问题（不包含正确答案）
    const questions = course.quiz.questions.map((q) => ({
      id: q.id,
      type: q.type,
      question: q.question,
      options: q.options.map((opt) => ({
        id: opt.id,
        text: opt.text,
      })),
      points: q.points,
    }));

    return {
      courseId: course.courseDataId,
      passingScore: course.quiz.passingScore,
      questions,
    };
  }

  /**
   * 提交测验答案
   */
  async submitQuiz(
    userId: string,
    moduleId: string,
    courseId: string,
    dto: SubmitQuizDto,
  ): Promise<QuizResult> {
    const course = await this.courseModel.findOne({
      'module.id': moduleId,
      courseDataId: courseId,
      published: true,
    });

    if (!course || !course.quiz) {
      throw new NotFoundException('测验不存在');
    }

    let totalScore = 0;
    let correctAnswers = 0;
    const answers: QuizResult['answers'] = [];

    // 批改答案
    dto.answers.forEach((submission) => {
      const question = course.quiz.questions.find((q) => q.id === submission.questionId);
      if (!question) return;

      const selectedOptions = question.options.filter((opt) =>
        submission.answers.includes(opt.id),
      );

      const allCorrect = selectedOptions.every((opt) => opt.correct);
      const correctCount = selectedOptions.filter((opt) => opt.correct).length;
      const correctOptionIds = question.options.filter((opt) => opt.correct).map((opt) => opt.id);

      const isCorrect = allCorrect && selectedOptions.length === correctOptionIds.length;

      if (isCorrect) {
        totalScore += question.points;
        correctAnswers++;
      }

      answers.push({
        questionId: submission.questionId,
        correct: isCorrect,
        correctAnswer: isCorrect ? undefined : correctOptionIds,
      });
    });

    const totalQuestions = course.quiz.questions.length;
    const percentage = Math.round((totalScore / this.calculateMaxScore(course.quiz.questions)) * 100);
    const passed = percentage >= course.quiz.passingScore;

    // 更新用户学习进度
    await this.updateQuizProgress(userId, courseId, {
      score: percentage,
      passed,
      attempts: 1, // 简化处理
    });

    this.logger.log(`用户 ${userId} 完成课程 ${courseId} 测验，得分：${percentage}%`);

    return {
      score: totalScore,
      totalScore: this.calculateMaxScore(course.quiz.questions),
      percentage,
      passed,
      correctAnswers,
      totalQuestions,
      answers,
    };
  }

  /**
   * 获取用户学习进度
   */
  async getUserProgress(userId: string): Promise<LearningProgressDocument> {
    let progress = await this.progressModel.findOne({ userId });

    if (!progress) {
      // 初始化学习进度
      const courses = await this.courseModel.find({ published: true }).sort({
        'module.order': 1,
        order: 1,
      });

      const courseProgressList: ICourseProgress[] = courses.map((c) => ({
        id: c.courseDataId,
        name: c.title,
        order: c.order,
        completed: false,
        readingTime: 0,
      }));

      progress = new this.progressModel({
        userId,
        courses: courseProgressList,
        progress: {
          completed: 0,
          total: courses.length,
          percentage: 0,
        },
        stats: {
          totalReadingTime: 0,
          totalQuizScore: 0,
          averageQuizScore: 0,
          quizAttempts: 0,
        },
      });

      await progress.save();
    }

    return progress;
  }

  /**
   * 更新课程阅读进度
   */
  async updateReadingProgress(
    userId: string,
    dto: UpdateCourseProgressDto,
  ): Promise<LearningProgressDocument> {
    const progress = await this.getUserProgress(userId);

    const courseProgress = progress.courses.find((c) => c.id === dto.courseId);

    if (!courseProgress) {
      throw new NotFoundException('课程不存在');
    }

    // 更新阅读时间
    courseProgress.readingTime += dto.readingTime;

    // 如果标记为完成且之前未完成
    if (dto.completed && !courseProgress.completed) {
      courseProgress.completed = true;
      courseProgress.completedAt = new Date();
      progress.progress.completed += 1;
      progress.progress.percentage = Math.round(
        (progress.progress.completed / progress.progress.total) * 100,
      );

      // 更新最后学习位置
      progress.progress.lastCourseId = dto.courseId;

      // 检查是否全部完成
      if (progress.progress.completed === progress.progress.total) {
        await this.unlockCompletionReward(userId);
      }
    }

    // 更新统计
    progress.stats.totalReadingTime += dto.readingTime;

    await progress.save();
    return progress;
  }

  /**
   * 解锁完成奖励
   */
  private async unlockCompletionReward(userId: string): Promise<void> {
    await this.progressModel.findOneAndUpdate(
      { userId },
      {
        $set: {
          'rewards.freeDetailedDivination.available': true,
        },
      },
    );

    this.logger.log(`用户 ${userId} 完成所有课程，解锁免费详细解卦奖励`);
  }

  /**
   * 更新测验进度
   */
  private async updateQuizProgress(
    userId: string,
    courseId: string,
    quizResult: { score: number; passed: boolean; attempts: number },
  ): Promise<void> {
    const progress = await this.getUserProgress(userId);

    const courseProgress = progress.courses.find((c) => c.id === courseId);

    if (!courseProgress) {
      throw new NotFoundException('课程不存在');
    }

    // 更新测验信息
    courseProgress.quiz = {
      score: quizResult.score,
      passed: quizResult.passed,
      attempts: (courseProgress.quiz?.attempts || 0) + quizResult.attempts,
      completedAt: quizResult.passed ? new Date() : undefined,
    };

    // 更新统计
    progress.stats.totalQuizScore += quizResult.score;
    progress.stats.quizAttempts += quizResult.attempts;
    progress.stats.averageQuizScore = Math.round(
      progress.stats.totalQuizScore / progress.stats.quizAttempts,
    );

    await progress.save();
  }

  /**
   * 计算测验最高分
   */
  private calculateMaxScore(questions: any[]): number {
    return questions.reduce((sum, q) => sum + q.points, 0);
  }

  /**
   * 使用完成奖励（免费详细解卦）
   */
  async useCompletionReward(userId: string, divinationId: string): Promise<boolean> {
    const progress = await this.progressModel.findOne({ userId });

    if (!progress || !progress.rewards?.freeDetailedDivination?.available) {
      throw new BadRequestException('奖励不可用');
    }

    if (progress.rewards.freeDetailedDivination.used) {
      throw new BadRequestException('奖励已使用');
    }

    progress.rewards.freeDetailedDivination.used = true;
    progress.rewards.freeDetailedDivination.usedAt = new Date();
    progress.rewards.freeDetailedDivination.divinationId = new Types.ObjectId(divinationId);

    await progress.save();

    this.logger.log(`用户 ${userId} 使用完成奖励，卜卦ID：${divinationId}`);

    return true;
  }

  /**
   * 检查用户是否有可用奖励
   */
  async checkCompletionReward(userId: string): Promise<{ available: boolean; used: boolean }> {
    const progress = await this.progressModel.findOne({ userId });

    if (!progress || !progress.rewards?.freeDetailedDivination) {
      return { available: false, used: false };
    }

    return {
      available: progress.rewards.freeDetailedDivination.available,
      used: progress.rewards.freeDetailedDivination.used || false,
    };
  }
}
