import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { DailyHexagramService } from './daily-hexagram.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionGuard, RequireSubscription } from '../membership/guards/subscription.guard';
import { Public } from '../../common/decorators/public.decorator';

/**
 * 每日一卦控制器
 * 提供每日卦象API
 */
@Controller('daily-hexagram')
export class DailyHexagramController {
  constructor(private readonly dailyHexagramService: DailyHexagramService) {}

  /**
   * 获取今日卦象
   * 公开接口
   */
  @Public()
  @Get('today')
  async getTodayHexagram() {
    const todayHexagram = await this.dailyHexagramService.getTodayHexagram();

    return {
      success: true,
      data: todayHexagram,
      message: '获取今日卦象成功',
      timestamp: Date.now(),
    };
  }

  /**
   * 获取历史每日一卦
   * 需要登录并拥有有效会员订阅
   */
  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @RequireSubscription(true)
  @Get('history')
  async getHistory(@Query('days') days?: string) {
    const daysCount = days ? parseInt(days, 10) : 30;

    if (daysCount < 1 || daysCount > 365) {
      return {
        success: false,
        error: {
          code: 'INVALID_DAYS',
          message: '天数必须在1-365之间',
        },
        timestamp: Date.now(),
      };
    }

    const history = await this.dailyHexagramService.getHistory(daysCount);

    return {
      success: true,
      data: {
        history,
        summary: {
          total: history.length,
          days: daysCount,
        },
      },
      message: '获取历史记录成功',
      timestamp: Date.now(),
    };
  }

  /**
   * 点赞每日一卦
   * 需要登录
   */
  @UseGuards(JwtAuthGuard)
  @Post(':id/like')
  async likeDailyHexagram(@Param('id') id: string) {
    const result = await this.dailyHexagramService.likeDailyHexagram(id);

    return {
      success: true,
      data: result,
      message: '点赞成功',
      timestamp: Date.now(),
    };
  }

  /**
   * 分享每日一卦
   * 需要登录
   */
  @UseGuards(JwtAuthGuard)
  @Post(':id/share')
  async shareDailyHexagram(@Param('id') id: string) {
    const result = await this.dailyHexagramService.shareDailyHexagram(id);

    return {
      success: true,
      data: result,
      message: '分享成功',
      timestamp: Date.now(),
    };
  }

  /**
   * 手动触发每日一卦生成
   * 管理员接口（TODO: 添加管理员权限验证）
   */
  @Post('trigger')
  async triggerGeneration(@Query('date') dateStr?: string) {
    const targetDate = dateStr ? new Date(dateStr) : undefined;
    const result = await this.dailyHexagramService.triggerGeneration(targetDate);

    return {
      success: result.success,
      data: result.data,
      message: result.message,
      timestamp: Date.now(),
    };
  }
}
