import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DailyHexagram, DailyHexagramDocument } from '../../database/schemas/daily-hexagram.schema';
import { DailyHexagramJob } from '../jobs/daily-hexagram.job';

/**
 * 每日一卦服务
 * 提供每日卦象查询和管理功能
 */
@Injectable()
export class DailyHexagramService {
  private readonly logger = new Logger(DailyHexagramService.name);

  constructor(
    @InjectModel('DailyHexagram')
    private dailyHexagramModel: Model<DailyHexagramDocument>,
    private dailyHexagramJob: DailyHexagramJob,
  ) {}

  /**
   * 获取今日卦象
   */
  async getTodayHexagram(): Promise<any> {
    const todayHexagram = await this.dailyHexagramJob.getTodayHexagram() as any;

    if (!todayHexagram) {
      throw new Error('无法获取今日卦象');
    }

    return {
      id: todayHexagram._id?.toString() || '',
      date: todayHexagram.date,
      hexagram: todayHexagram.hexagram,
      interpretation: {
        overall: todayHexagram.content?.guaci || '',
        career: todayHexagram.content?.advice || '',
        relationships: todayHexagram.content?.advice || '',
        health: todayHexagram.content?.advice || '',
        wealth: todayHexagram.content?.advice || '',
      },
      likes: todayHexagram.stats?.likes || 0,
      shares: todayHexagram.stats?.shares || 0,
      likedByUser: false,
    };
  }

  /**
   * 获取历史每日一卦（需要会员权限）
   */
  async getHistory(days: number = 30): Promise<any[]> {
    const history = await this.dailyHexagramJob.getHistory(days);

    return history.map((item) => ({
      date: item.date,
      hexagram: item.hexagram,
      content: item.content,
      quote: item.quote,
      stats: item.stats,
    }));
  }

  /**
   * 点赞每日一卦
   */
  async likeDailyHexagram(id: string): Promise<any> {
    const dailyHexagram = await this.dailyHexagramModel.findById(id);

    if (!dailyHexagram) {
      throw new Error('每日一卦不存在');
    }

    dailyHexagram.stats.likes += 1;
    await dailyHexagram.save();

    return {
      liked: true,
      likes: dailyHexagram.stats.likes,
    };
  }

  /**
   * 分享每日一卦
   */
  async shareDailyHexagram(id: string): Promise<any> {
    const dailyHexagram = await this.dailyHexagramModel.findById(id);

    if (!dailyHexagram) {
      throw new Error('每日一卦不存在');
    }

    dailyHexagram.stats.shares += 1;
    await dailyHexagram.save();

    return {
      shared: true,
      shares: dailyHexagram.stats.shares,
    };
  }

  /**
   * 手动触发每日一卦生成（仅用于测试或管理）
   */
  async triggerGeneration(targetDate?: Date): Promise<any> {
    this.logger.log('手动触发每日一卦生成...');

    const dailyHexagram = await this.dailyHexagramJob.generateDailyHexagram(
      targetDate,
    );

    if (!dailyHexagram) {
      return {
        success: false,
        message: '该日期的卦象已存在',
      };
    }

    return {
      success: true,
      data: {
        date: dailyHexagram.date,
        hexagram: dailyHexagram.hexagram,
      },
      message: '生成成功',
    };
  }
}
