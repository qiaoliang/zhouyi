/**
 * 学习服务
 * 处理课程、学习进度等
 */

import { apiClient } from './api';
import { CourseModule, CourseContent, Quiz, QuizSubmission, LearningProgress } from '../types';

/**
 * 学习服务类
 */
class LearningService {
  /**
   * 获取所有课程模块
   */
  async getAllModules(): Promise<{
    modules: CourseModule[];
    summary: {
      totalModules: number;
      totalCourses: number;
      totalDuration: number;
    };
  }> {
    return apiClient.get('/learning/modules');
  }

  /**
   * 获取课程详情
   */
  async getCourseDetail(moduleId: string, courseId: string): Promise<CourseContent> {
    return apiClient.get(`/learning/modules/${moduleId}/courses/${courseId}`);
  }

  /**
   * 获取课程测验
   */
  async getCourseQuiz(moduleId: string, courseId: string): Promise<Quiz> {
    return apiClient.get(`/learning/modules/${moduleId}/courses/${courseId}/quiz`);
  }

  /**
   * 提交测验答案
   */
  async submitQuiz(
    moduleId: string,
    courseId: string,
    submission: QuizSubmission
  ): Promise<{
    score: number;
    totalScore: number;
    percentage: number;
    passed: boolean;
    correctAnswers: number;
    totalQuestions: number;
    answers: any[];
  }> {
    return apiClient.post(
      `/learning/modules/${moduleId}/courses/${courseId}/quiz`,
      submission
    );
  }

  /**
   * 获取学习进度
   */
  async getProgress(): Promise<LearningProgress> {
    return apiClient.get('/learning/progress');
  }

  /**
   * 更新阅读进度
   */
  async updateReadingProgress(courseId: string, completed: boolean, readingTime: number): Promise<LearningProgress> {
    return apiClient.put('/learning/progress/reading', {
      courseId,
      completed,
      readingTime,
    });
  }

  /**
   * 检查完成奖励状态
   */
  async checkCompletionReward(): Promise<{ available: boolean; used: boolean }> {
    return apiClient.get('/learning/rewards/completion');
  }

  /**
   * 使用完成奖励
   */
  async useCompletionReward(divinationId: string): Promise<{ used: boolean }> {
    return apiClient.post('/learning/rewards/completion/use', {
      divinationId,
    });
  }
}

export const learningService = new LearningService();
