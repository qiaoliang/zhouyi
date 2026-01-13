import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MembershipService } from './membership.service';
import { PaymentStatus } from '../../database/schemas/order.schema';

/**
 * 模拟支付场景配置
 */
export enum MockPaymentScenario {
  SUCCESS = 'success',           // 支付成功
  FAIL = 'fail',                 // 支付失败
  CANCEL = 'cancel',             // 用户取消
  TIMEOUT = 'timeout',           // 支付超时
  NETWORK_ERROR = 'network_error', // 网络错误
}

/**
 * 模拟支付参数
 */
export interface MockPaymentParams {
  orderId: string;
  scenario?: MockPaymentScenario;
  delay?: number; // 延迟时间（毫秒）
  autoConfirm?: boolean; // 是否自动确认支付
}

/**
 * 支付结果
 */
export interface PaymentResult {
  success: boolean;
  orderId: string;
  transactionId?: string;
  status: PaymentStatus;
  message?: string;
  paidAt?: Date;
}

/**
 * 模拟支付服务
 * 用于开发测试阶段模拟真实支付流程
 */
@Injectable()
export class MockPaymentService {
  private readonly logger = new Logger(MockPaymentService.name);

  // 存储待确认的支付
  private pendingPayments = new Map<string, {
    orderId: string;
    scenario: MockPaymentScenario;
    createdAt: Date;
    expiresAt: Date;
  }>();

  // 开发者模式：默认快速成功
  private developerMode = true;
  private developerScenario = MockPaymentScenario.SUCCESS;

  constructor(private readonly membershipService: MembershipService) {}

  /**
   * 发起模拟支付
   */
  async initiatePayment(params: MockPaymentParams): Promise<{
    paymentId: string;
    scenario: MockPaymentScenario;
    estimatedDelay: number;
    message: string;
  }> {
    const { orderId, scenario = this.developerScenario, delay = this.getRandomDelay() } = params;

    // 检查订单是否存在
    const order = await this.membershipService.getOrder(orderId);

    // 生成支付ID
    const paymentId = `MOCK_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // 存储待确认支付
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟后过期
    this.pendingPayments.set(paymentId, {
      orderId,
      scenario,
      createdAt: new Date(),
      expiresAt,
    });

    this.logger.log(`发起模拟支付: paymentId=${paymentId}, orderId=${orderId}, scenario=${scenario}`);

    // 如果是自动确认模式，立即执行支付
    if (params.autoConfirm || this.developerMode) {
      setTimeout(() => {
        this.confirmPayment(paymentId);
      }, delay);
    }

    return {
      paymentId,
      scenario,
      estimatedDelay: delay,
      message: this.getScenarioMessage(scenario),
    };
  }

  /**
   * 确认支付（模拟支付回调）
   */
  async confirmPayment(paymentId: string): Promise<PaymentResult> {
    const pendingPayment = this.pendingPayments.get(paymentId);

    if (!pendingPayment) {
      this.logger.warn(`支付记录不存在或已过期: paymentId=${paymentId}`);
      return {
        success: false,
        orderId: '',
        status: PaymentStatus.FAILED,
        message: '支付记录不存在或已过期',
      };
    }

    // 检查是否过期
    if (new Date() > pendingPayment.expiresAt) {
      this.pendingPayments.delete(paymentId);
      return {
        success: false,
        orderId: pendingPayment.orderId,
        status: PaymentStatus.FAILED,
        message: '支付已过期',
      };
    }

    const { orderId, scenario } = pendingPayment;

    // 删除待确认支付
    this.pendingPayments.delete(paymentId);

    // 根据场景执行支付
    return this.executePayment(orderId, scenario);
  }

  /**
   * 取消支付
   */
  async cancelPayment(paymentId: string): Promise<PaymentResult> {
    const pendingPayment = this.pendingPayments.get(paymentId);

    if (!pendingPayment) {
      return {
        success: false,
        orderId: '',
        status: PaymentStatus.FAILED,
        message: '支付记录不存在',
      };
    }

    this.pendingPayments.delete(paymentId);

    // 更新订单状态为取消
    await this.membershipService.updateOrderPaymentStatus(
      pendingPayment.orderId,
      PaymentStatus.CANCELLED,
    );

    this.logger.log(`支付已取消: paymentId=${paymentId}, orderId=${pendingPayment.orderId}`);

    return {
      success: false,
      orderId: pendingPayment.orderId,
      status: PaymentStatus.CANCELLED,
      message: '用户取消支付',
    };
  }

  /**
   * 执行支付逻辑
   */
  private async executePayment(orderId: string, scenario: MockPaymentScenario): Promise<PaymentResult> {
    try {
      // 模拟网络延迟
      await this.sleep(1000);

      switch (scenario) {
        case MockPaymentScenario.SUCCESS:
          return await this.processSuccessPayment(orderId);

        case MockPaymentScenario.FAIL:
          return await this.processFailPayment(orderId, '余额不足');

        case MockPaymentScenario.CANCEL:
          return await this.processCancelPayment(orderId);

        case MockPaymentScenario.TIMEOUT:
          return await this.processTimeoutPayment(orderId);

        case MockPaymentScenario.NETWORK_ERROR:
          return await this.processNetworkError(orderId);

        default:
          return await this.processSuccessPayment(orderId);
      }
    } catch (error) {
      this.logger.error(`支付执行失败: orderId=${orderId}, error=${error.message}`);
      return {
        success: false,
        orderId,
        status: PaymentStatus.FAILED,
        message: '支付执行失败',
      };
    }
  }

  /**
   * 处理支付成功
   */
  private async processSuccessPayment(orderId: string): Promise<PaymentResult> {
    const transactionId = `MOCK_TXN_${Date.now()}`;
    const paidAt = new Date();

    await this.membershipService.updateOrderPaymentStatus(
      orderId,
      PaymentStatus.PAID,
      transactionId,
      paidAt,
    );

    this.logger.log(`支付成功: orderId=${orderId}, transactionId=${transactionId}`);

    return {
      success: true,
      orderId,
      transactionId,
      status: PaymentStatus.PAID,
      message: '支付成功',
      paidAt,
    };
  }

  /**
   * 处理支付失败
   */
  private async processFailPayment(orderId: string, reason: string): Promise<PaymentResult> {
    await this.membershipService.updateOrderPaymentStatus(orderId, PaymentStatus.FAILED);

    this.logger.log(`支付失败: orderId=${orderId}, reason=${reason}`);

    return {
      success: false,
      orderId,
      status: PaymentStatus.FAILED,
      message: reason,
    };
  }

  /**
   * 处理支付取消
   */
  private async processCancelPayment(orderId: string): Promise<PaymentResult> {
    await this.membershipService.updateOrderPaymentStatus(orderId, PaymentStatus.CANCELLED);

    this.logger.log(`支付取消: orderId=${orderId}`);

    return {
      success: false,
      orderId,
      status: PaymentStatus.CANCELLED,
      message: '用户取消支付',
    };
  }

  /**
   * 处理支付超时
   */
  private async processTimeoutPayment(orderId: string): Promise<PaymentResult> {
    await this.sleep(3000); // 模拟超时延迟

    await this.membershipService.updateOrderPaymentStatus(orderId, PaymentStatus.FAILED);

    this.logger.log(`支付超时: orderId=${orderId}`);

    return {
      success: false,
      orderId,
      status: PaymentStatus.FAILED,
      message: '支付超时',
    };
  }

  /**
   * 处理网络错误
   */
  private async processNetworkError(orderId: string): Promise<PaymentResult> {
    // 模拟网络错误，不做任何操作
    this.logger.log(`网络错误: orderId=${orderId}`);

    return {
      success: false,
      orderId,
      status: PaymentStatus.PAID, // 实际上是未知状态，但用PAID表示未完成
      message: '网络错误，请检查网络连接',
    };
  }

  /**
   * 获取随机延迟（2-5秒）
   */
  private getRandomDelay(): number {
    return Math.floor(Math.random() * 3000) + 2000;
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取场景说明
   */
  private getScenarioMessage(scenario: MockPaymentScenario): string {
    const messages = {
      [MockPaymentScenario.SUCCESS]: '模拟支付成功场景',
      [MockPaymentScenario.FAIL]: '模拟支付失败场景（余额不足）',
      [MockPaymentScenario.CANCEL]: '模拟用户取消支付场景',
      [MockPaymentScenario.TIMEOUT]: '模拟支付超时场景',
      [MockPaymentScenario.NETWORK_ERROR]: '模拟网络错误场景',
    };

    return messages[scenario] || '未知场景';
  }

  /**
   * 设置开发者模式
   */
  setDeveloperMode(enabled: boolean, scenario?: MockPaymentScenario): void {
    this.developerMode = enabled;
    if (scenario) {
      this.developerScenario = scenario;
    }
    this.logger.log(`开发者模式: ${enabled ? '开启' : '关闭'}, 场景: ${scenario || this.developerScenario}`);
  }

  /**
   * 获取支付状态
   */
  getPaymentStatus(paymentId: string): {
    exists: boolean;
    orderId?: string;
    scenario?: MockPaymentScenario;
    remainingTime?: number;
  } {
    const pendingPayment = this.pendingPayments.get(paymentId);

    if (!pendingPayment) {
      return { exists: false };
    }

    const remainingTime = Math.max(0, pendingPayment.expiresAt.getTime() - Date.now());

    return {
      exists: true,
      orderId: pendingPayment.orderId,
      scenario: pendingPayment.scenario,
      remainingTime,
    };
  }

  /**
   * 定时清理过期支付
   */
  @Cron(CronExpression.EVERY_MINUTE)
  cleanExpiredPayments(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [paymentId, payment] of this.pendingPayments.entries()) {
      if (now > payment.expiresAt) {
        this.pendingPayments.delete(paymentId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`清理过期支付: ${cleanedCount} 条`);
    }
  }

  /**
   * 获取待处理支付列表（仅用于开发调试）
   */
  getPendingPayments(): Array<{
    paymentId: string;
    orderId: string;
    scenario: MockPaymentScenario;
    createdAt: Date;
    expiresAt: Date;
  }> {
    return Array.from(this.pendingPayments.entries()).map(([paymentId, payment]) => ({
      paymentId,
      orderId: payment.orderId,
      scenario: payment.scenario,
      createdAt: payment.createdAt,
      expiresAt: payment.expiresAt,
    }));
  }
}
