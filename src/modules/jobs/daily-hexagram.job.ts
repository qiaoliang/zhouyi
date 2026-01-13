import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { DailyHexagram, DailyHexagramDocument } from '../../database/schemas/daily-hexagram.schema';
import { Hexagram } from '../../database/schemas/hexagram.schema';

/**
 * 每日一卦定时任务
 * 每天早上8点生成当日卦象
 */
@Injectable()
export class DailyHexagramJob {
  private readonly logger = new Logger(DailyHexagramJob.name);

  constructor(
    @InjectModel('DailyHexagram')
    private dailyHexagramModel: Model<DailyHexagramDocument>,
    @InjectModel('Hexagram')
    private hexagramModel: Model<Hexagram>,
  ) {}

  /**
   * 每天早上8点执行
   * Cron表达式: 秒 分 时 日 月 周
   * 0 0 8 * * * 表示每天8点0分0秒执行
   */
  @Cron('0 0 8 * * *', {
    timeZone: 'Asia/Shanghai',
    name: 'generateDailyHexagram',
  })
  async handleDailyHexagramGeneration() {
    this.logger.log('📅 开始生成每日一卦...');

    try {
      const today = new Date();
      const dailyHexagram = await this.generateDailyHexagram(today);

      if (dailyHexagram) {
        this.logger.log(
          `✅ 每日一卦生成成功：${dailyHexagram.hexagram.name}（${dailyHexagram.hexagram.symbol}）`,
        );

        // TODO: 触发推送服务
        // await this.triggerPushNotification(dailyHexagram);
      } else {
        this.logger.warn('⚠️  今日卦象已存在，跳过生成');
      }
    } catch (error) {
      this.logger.error('❌ 生成每日一卦失败：', error.message);
    }
  }

  /**
   * 生成每日一卦
   * @param targetDate 目标日期
   */
  async generateDailyHexagram(
    targetDate: Date = new Date(),
  ): Promise<DailyHexagramDocument | null> {
    // 获取日期信息（使用本地时区）
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth() + 1;
    const day = targetDate.getDate();

    // 设置为当天0点
    const dateStart = new Date(year, month - 1, day, 0, 0, 0);
    const dateEnd = new Date(year, month - 1, day, 23, 59, 59);

    // 检查是否已存在
    const existing = await this.dailyHexagramModel.findOne({
      date: { $gte: dateStart, $lte: dateEnd },
    });

    if (existing) {
      return existing;
    }

    // 随机选择一个卦象
    const hexagramCount = await this.hexagramModel.countDocuments();
    const skip = Math.floor(Math.random() * hexagramCount);
    const hexagram = await this.hexagramModel.findOne().skip(skip);

    if (!hexagram) {
      throw new Error('没有可用的卦象数据');
    }

    // 生成每日内容
    const content = this.generateDailyContent(hexagram);
    const quote = this.selectQuote();
    const lucky = this.generateLuckyInfo(hexagram);

    // 创建每日一卦记录
    const dailyHexagram = new this.dailyHexagramModel({
      date: dateStart,
      year,
      month,
      day,
      hexagramId: hexagram._id,
      hexagram: {
        name: hexagram.name,
        symbol: hexagram.symbol,
        sequence: hexagram.sequence,
      },
      content: {
        guaci: content.guaci,
        advice: content.advice,
        lucky,
      },
      quote,
      stats: {
        views: 0,
        shares: 0,
        likes: 0,
      },
      pushScheduledAt: new Date(),
    });

    await dailyHexagram.save();

    return dailyHexagram;
  }

  /**
   * 生成每日内容
   */
  private generateDailyContent(hexagram: Hexagram): {
    guaci: string;
    advice: string;
  } {
    // 卦辞截取（取前100字）
    const guaci =
      hexagram.guaci.translation.length > 100
        ? hexagram.guaci.translation.substring(0, 100) + '...'
        : hexagram.guaci.translation;

    // 根据卦象性质生成建议
    let advice = '';
    const sequence = hexagram.sequence;

    if (sequence <= 8) {
      advice = `今天是${hexagram.name}卦，此卦能量纯正。建议保持初心，坚持方向，会有意想不到的收获。`;
    } else if (sequence <= 32) {
      advice = `今日得${hexagram.name}卦，事物发展较为顺利。建议把握机会，积极行动，注意细节。`;
    } else if (sequence <= 48) {
      advice = `今日${hexagram.name}卦，提示需要更多耐心。建议冷静分析，稳中求进，等待时机。`;
    } else {
      advice = `今日${hexagram.name}卦，预示变化即将来临。建议保持开放心态，顺应变化，灵活应对。`;
    }

    return { guaci, advice };
  }

  /**
   * 选择每日名言
   */
  private selectQuote(): { text: string; source: string } {
    const quotes = [
      { text: '天行健，君子以自强不息。', source: '《周易·乾卦》' },
      { text: '地势坤，君子以厚德载物。', source: '《周易·坤卦》' },
      { text: '君子藏器于身，待时而动。', source: '《周易·系辞下》' },
      { text: '穷则变，变则通，通则久。', source: '《周易·系辞下》' },
      { text: '同声相应，同气相求。', source: '《周易·乾卦》' },
      { text: '积善之家，必有余庆。', source: '《周易·坤卦》' },
      { text: '君子进德修业。', source: '《周易·乾卦》' },
      { text: '知几其神乎！', source: '《周易·系辞下》' },
      { text: '君子安而不忘危，存而不忘亡。', source: '《周易·系辞下》' },
      { text: '一阴一阳之谓道。', source: '《周易·系辞上》' },
    ];

    const index = Math.floor(Math.random() * quotes.length);
    return quotes[index];
  }

  /**
   * 生成幸运信息
   */
  private generateLuckyInfo(hexagram: Hexagram): {
    direction: string;
    color: string;
    number: number;
    time: string;
  } {
    // 根据卦象序号生成幸运数字
    const number = ((hexagram.sequence * 7) % 9) + 1;

    // 方位数组
    const directions = ['东', '南', '西', '北', '东南', '西南', '东北', '西北'];
    const direction = directions[(hexagram.sequence - 1) % directions.length];

    // 颜色数组
    const colors = ['红色', '黄色', '蓝色', '绿色', '白色', '黑色', '紫色', '橙色'];
    const color = colors[(hexagram.sequence - 1) % colors.length];

    // 时辰数组
    const times = ['子时', '丑时', '寅时', '卯时', '辰时', '巳时', '午时', '未时', '申时', '酉时', '戌时', '亥时'];
    const time = times[(hexagram.sequence - 1) % times.length];

    return {
      direction,
      color,
      number,
      time,
    };
  }

  /**
   * 获取今日卦象
   */
  async getTodayHexagram(): Promise<DailyHexagramDocument | null> {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    const dateStart = new Date(year, month - 1, day, 0, 0, 0);
    const dateEnd = new Date(year, month - 1, day, 23, 59, 59);

    let dailyHexagram: any = await this.dailyHexagramModel.findOne({
      date: { $gte: dateStart, $lte: dateEnd },
    });

    // 如果不存在，立即生成
    if (!dailyHexagram) {
      this.logger.log('今日卦象尚未生成，立即生成...');
      dailyHexagram = await this.generateDailyHexagram(today);
    }

    // 更新查看次数
    if (dailyHexagram) {
      dailyHexagram.stats.views += 1;
      await dailyHexagram.save();
    }

    return dailyHexagram;
  }

  /**
   * 获取历史每日一卦
   */
  async getHistory(days: number = 7): Promise<DailyHexagramDocument[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.dailyHexagramModel
      .find({
        date: { $gte: startDate, $lte: endDate },
      })
      .sort({ date: -1 })
      .exec();
  }
}
