import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { DivinationRecord } from '../../database/schemas/divination-record.schema';
import { LearningProgress } from '../../database/schemas/learning-progress.schema';
import { DailyHexagram } from '../../database/schemas/daily-hexagram.schema';

/**
 * 用户服务
 * 提供用户相关的业务逻辑
 */
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectModel('User')
    private userModel: Model<User>,
    @InjectModel('DivinationRecord')
    private divinationRecordModel: Model<DivinationRecord>,
    @InjectModel('LearningProgress')
    private learningProgressModel: Model<LearningProgress>,
    @InjectModel('DailyHexagram')
    private dailyHexagramModel: Model<DailyHexagram>,
  ) {}

  /**
   * 根据ID查找用户
   */
  async findById(userId: string): Promise<UserDocument | null> {
    return this.userModel.findById(userId).exec();
  }

  /**
   * 根据手机号查找用户
   */
  async findByPhoneNumber(phoneNumber: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ phoneNumber }).exec();
  }

  /**
   * 根据微信OpenID查找用户
   */
  async findByWechatOpenId(openId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ 'wechat.openId': openId }).exec();
  }

  /**
   * 检查用户是否是有效会员
   */
  async isActiveMember(userId: string): Promise<boolean> {
    const user = await this.findById(userId);

    if (!user || !user.membership) {
      return false;
    }

    const { type, expireAt } = user.membership;

    // 检查会员类型是否为免费
    if (type === 'free') {
      return false;
    }

    // 检查会员是否过期
    if (expireAt && new Date(expireAt) < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * 获取用户会员信息
   */
  async getMembershipInfo(userId: string): Promise<User['membership'] | null> {
    const user = await this.findById(userId);

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return user.membership || null;
  }

  /**
   * 更新用户会员信息
   */
  async updateMembership(
    userId: string,
    membershipData: Partial<User['membership']>,
  ): Promise<UserDocument> {
    const user = await this.findById(userId);

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    user.membership = {
      ...user.membership,
      ...membershipData,
    } as any;

    return user.save();
  }

  /**
   * 用户注销
   * 删除用户及所有相关数据，符合隐私保护法要求
   */
  async deleteAccount(userId: string, confirmation: boolean): Promise<{
    success: boolean;
    deletedCounts: {
      user: number;
      divinationRecords: number;
      learningProgress: number;
      orders: number;
    };
    deletedAt: Date;
  }> {
    if (!confirmation) {
      throw new BadRequestException('需要确认才能删除账户');
    }

    this.logger.log(`开始删除用户账户: ${userId}`);

    const deletedCounts = {
      user: 0,
      divinationRecords: 0,
      learningProgress: 0,
      orders: 0,
    };

    try {
      // 1. 删除用户的卜卦记录
      const divinationResult = await this.divinationRecordModel.deleteMany({
        userId: new Types.ObjectId(userId),
      });
      deletedCounts.divinationRecords = divinationResult.deletedCount || 0;
      this.logger.log(`删除卜卦记录: ${deletedCounts.divinationRecords} 条`);

      // 2. 删除学习进度
      const learningResult = await this.learningProgressModel.deleteMany({
        userId: new Types.ObjectId(userId),
      });
      deletedCounts.learningProgress = learningResult.deletedCount || 0;
      this.logger.log(`删除学习进度: ${deletedCounts.learningProgress} 条`);

      // 3. 删除用户订单（如果有订单表）
      // TODO: 删除订单相关数据
      deletedCounts.orders = 0;

      // 4. 删除用户账户
      const userResult = await this.userModel.deleteOne({
        _id: new Types.ObjectId(userId),
      });
      deletedCounts.user = userResult.deletedCount || 0;
      this.logger.log(`删除用户账户: ${deletedCounts.user} 个`);

      this.logger.log(`用户账户删除完成: ${userId}`);

      return {
        success: true,
        deletedCounts,
        deletedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`删除用户账户失败: ${userId}`, error);
      throw new Error(`删除账户失败: ${error.message}`);
    }
  }

  /**
   * 请求用户注销（发送确认码）
   * 验证用户身份，防止误操作
   */
  async requestAccountDeletion(userId: string): Promise<{
    confirmationCode: string;
    expiresAt: Date;
    dataDeletionInfo: {
      divinationRecords: number;
      learningProgress: number;
      orders: number;
    };
  }> {
    const user = await this.findById(userId);

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 统计将要删除的数据量
    const [divinationCount, learningCount] = await Promise.all([
      this.divinationRecordModel.countDocuments({ userId: new Types.ObjectId(userId) }),
      this.learningProgressModel.countDocuments({ userId: new Types.ObjectId(userId) }),
    ]);

    // 生成确认码（实际应用中应该发送短信或邮件）
    const confirmationCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24小时后过期

    // TODO: 将确认码存储到Redis或数据库，并设置过期时间
    // await this.redis.set(`deletion:${userId}`, confirmationCode, 24 * 60 * 60);

    this.logger.log(`用户 ${userId} 请求注销，确认码: ${confirmationCode}`);

    return {
      confirmationCode, // 生产环境不应该返回确认码，应该通过短信/邮件发送
      expiresAt,
      dataDeletionInfo: {
        divinationRecords: divinationCount,
        learningProgress: learningCount,
        orders: 0, // TODO: 查询订单数量
      },
    };
  }
}
