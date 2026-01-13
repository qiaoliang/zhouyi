import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { LearningService, UpdateCourseProgressDto, SubmitQuizDto } from './learning.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * 学习控制器
 * 提供课程内容和学习进度API
 */
@Controller('learning')
export class LearningController {
  constructor(private readonly learningService: LearningService) {}

  /**
   * 获取所有课程模块
   * 公开接口
   */
  @Get('modules')
  async getAllModules() {
    const modules = await this.learningService.getAllModules();

    return {
      success: true,
      data: {
        modules,
        summary: {
          totalModules: modules.length,
          totalCourses: modules.reduce((sum, m) => sum + m.courses.length, 0),
          totalDuration: modules.reduce((sum, m) => sum + m.estimatedTime, 0),
        },
      },
      message: '获取课程列表成功',
      timestamp: Date.now(),
    };
  }

  /**
   * 获取课程详情
   * 公开接口
   */
  @Get('modules/:moduleId/courses/:courseId')
  async getCourseDetail(
    @Param('moduleId') moduleId: string,
    @Param('courseId') courseId: string,
  ) {
    const detail = await this.learningService.getCourseDetail(moduleId, courseId);

    return {
      success: true,
      data: detail,
      message: '获取课程详情成功',
      timestamp: Date.now(),
    };
  }

  /**
   * 获取课程测验
   * 需要登录
   */
  @UseGuards(JwtAuthGuard)
  @Get('modules/:moduleId/courses/:courseId/quiz')
  async getCourseQuiz(
    @Param('moduleId') moduleId: string,
    @Param('courseId') courseId: string,
  ) {
    const quiz = await this.learningService.getCourseQuiz(moduleId, courseId);

    return {
      success: true,
      data: quiz,
      message: '获取测验成功',
      timestamp: Date.now(),
    };
  }

  /**
   * 提交测验答案
   * 需要登录
   */
  @UseGuards(JwtAuthGuard)
  @Post('modules/:moduleId/courses/:courseId/quiz')
  async submitQuiz(
    @Param('moduleId') moduleId: string,
    @Param('courseId') courseId: string,
    @Body() dto: SubmitQuizDto,
    @CurrentUser() user: any,
  ) {
    const result = await this.learningService.submitQuiz(
      user.userId,
      moduleId,
      courseId,
      dto,
    );

    return {
      success: true,
      data: result,
      message: '提交测验成功',
      timestamp: Date.now(),
    };
  }

  /**
   * 获取用户学习进度
   * 需要登录
   */
  @UseGuards(JwtAuthGuard)
  @Get('progress')
  async getUserProgress(@CurrentUser() user: any) {
    const progress = await this.learningService.getUserProgress(user.userId);

    return {
      success: true,
      data: progress,
      message: '获取学习进度成功',
      timestamp: Date.now(),
    };
  }

  /**
   * 更新阅读进度
   * 需要登录
   */
  @UseGuards(JwtAuthGuard)
  @Put('progress/reading')
  async updateReadingProgress(
    @Body(ValidationPipe) dto: UpdateCourseProgressDto,
    @CurrentUser() user: any,
  ) {
    const progress = await this.learningService.updateReadingProgress(
      user.userId,
      dto,
    );

    return {
      success: true,
      data: progress,
      message: '更新阅读进度成功',
      timestamp: Date.now(),
    };
  }

  /**
   * 检查完成奖励状态
   * 需要登录
   */
  @UseGuards(JwtAuthGuard)
  @Get('rewards/completion')
  async checkCompletionReward(@CurrentUser() user: any) {
    const reward = await this.learningService.checkCompletionReward(user.userId);

    return {
      success: true,
      data: reward,
      message: '获取奖励状态成功',
      timestamp: Date.now(),
    };
  }

  /**
   * 使用完成奖励
   * 需要登录
   */
  @UseGuards(JwtAuthGuard)
  @Post('rewards/completion/use')
  async useCompletionReward(
    @Body('divinationId') divinationId: string,
    @CurrentUser() user: any,
  ) {
    await this.learningService.useCompletionReward(user.userId, divinationId);

    return {
      success: true,
      data: { used: true },
      message: '奖励使用成功',
      timestamp: Date.now(),
    };
  }
}
