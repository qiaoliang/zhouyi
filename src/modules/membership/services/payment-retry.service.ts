import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Order, OrderDocument, OrderStatus, PaymentStatus } from '../../../database/schemas/order.schema';

/**
 * 支付异常类型
 */
export enum PaymentErrorType {
  NETWORK_ERROR = 'network_error',         // 网络错误
  TIMEOUT = 'timeout',                      // 超时
  INSUFFICIENT_BALANCE = 'insufficient_balance', // 余额不足
  DUPLICATE_ORDER = 'duplicate_order',     // 重复订单
  INVALID_PARAMS = 'invalid_params',       // 参数错误
  PAYMENT_GATEWAY_ERROR = 'payment_gateway_error', // 支付网关错误
  UNKNOWN_ERROR = 'unknown_error',         // 未知错误
}

/**
 * 支付异常信息
 */
export interface PaymentError {
  type: PaymentErrorType;
  message: string;
  code?: string;
  details?: any;
  timestamp: Date;
  retryable: boolean;
}

/**
 * 重试配置
 */
export interface RetryConfig {
  maxRetries: number;           // 最大重试次数
  retryInterval: number;         // 重试间隔（毫秒）
  backoffMultiplier: number;    // 退避乘数
  maxRetryInterval: number;     // 最大重试间隔
}

/**
 * 重试记录
 */
export interface RetryRecord {
  orderId: string;
  attemptCount: number;
  lastAttemptAt: Date;
  nextRetryAt: Date;
  error: PaymentError;
  status: 'pending' | 'in_progress' | 'success' | 'failed';
}

/**
 * 支付重试服务
 * 负责处理支付失败后的重试逻辑
 */
@Injectable()
export class PaymentRetryService {
  private readonly logger = new Logger(PaymentRetryService.name);

  // 存储待重试的订单
  private pendingRetries = new Map<string, RetryRecord>();

  // 默认重试配置
  private readonly defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    retryInterval: 5000, // 5秒
    backoffMultiplier: 2,
    maxRetryInterval: 60000, // 60秒
  };

  // 不同错误类型的重试配置
  private readonly errorTypeConfigs: Map<PaymentErrorType, Partial<RetryConfig>> = new Map([
    [PaymentErrorType.NETWORK_ERROR, { maxRetries: 5, retryInterval: 3000 }],
    [PaymentErrorType.TIMEOUT, { maxRetries: 3, retryInterval: 5000 }],
    [PaymentErrorType.PAYMENT_GATEWAY_ERROR, { maxRetries: 3, retryInterval: 10000 }],
    [PaymentErrorType.INSUFFICIENT_BALANCE, { maxRetries: 0 }], // 不重试
    [PaymentErrorType.DUPLICATE_ORDER, { maxRetries: 0 }], // 不重试
    [PaymentErrorType.INVALID_PARAMS, { maxRetries: 0 }], // 不重试
  ]);

  constructor(@InjectModel('Order') private orderModel: Model<OrderDocument>) {}

  /**
   * 处理支付异常
   */
  async handlePaymentError(
    orderId: string,
    error: Error,
    context?: any,
  ): Promise<PaymentError> {
    const paymentError = this.classifyError(error, context);

    this.logger.error(
      `支付异常: orderId=${orderId}, type=${paymentError.type}, message=${paymentError.message}`,
    );

    // 如果可以重试，添加到重试队列
    if (paymentError.retryable) {
      await this.addToRetryQueue(orderId, paymentError);
    }

    // 更新订单状态
    await this.updateOrderWithError(orderId, paymentError);

    return paymentError;
  }

  /**
   * 分类错误类型
   */
  private classifyError(error: Error, context?: any): PaymentError {
    const errorMessage = error.message.toLowerCase();
    let errorType: PaymentErrorType;
    let retryable = true;

    // 根据错误信息分类
    if (errorMessage.includes('network') || errorMessage.includes('econnrefused')) {
      errorType = PaymentErrorType.NETWORK_ERROR;
    } else if (errorMessage.includes('timeout')) {
      errorType = PaymentErrorType.TIMEOUT;
    } else if (errorMessage.includes('insufficient') || errorMessage.includes('balance')) {
      errorType = PaymentErrorType.INSUFFICIENT_BALANCE;
      retryable = false;
    } else if (errorMessage.includes('duplicate')) {
      errorType = PaymentErrorType.DUPLICATE_ORDER;
      retryable = false;
    } else if (errorMessage.includes('invalid') || errorMessage.includes('params')) {
      errorType = PaymentErrorType.INVALID_PARAMS;
      retryable = false;
    } else if (errorMessage.includes('gateway') || errorMessage.includes('payment')) {
      errorType = PaymentErrorType.PAYMENT_GATEWAY_ERROR;
    } else {
      errorType = PaymentErrorType.UNKNOWN_ERROR;
    }

    return {
      type: errorType,
      message: error.message,
      code: (error as any).code,
      details: context,
      timestamp: new Date(),
      retryable,
    };
  }

  /**
   * 添加到重试队列
   */
  private async addToRetryQueue(orderId: string, error: PaymentError): Promise<void> {
    const config = this.getRetryConfig(error.type);
    const now = new Date();
    const nextRetryAt = new Date(now.getTime() + config.retryInterval);

    const retryRecord: RetryRecord = {
      orderId,
      attemptCount: 1,
      lastAttemptAt: now,
      nextRetryAt,
      error,
      status: 'pending',
    };

    this.pendingRetries.set(orderId, retryRecord);

    this.logger.log(
      `订单加入重试队列: orderId=${orderId}, nextRetryAt=${nextRetryAt.toISOString()}`,
    );
  }

  /**
   * 执行重试
   */
  async executeRetry(orderId: string): Promise<boolean> {
    const retryRecord = this.pendingRetries.get(orderId);

    if (!retryRecord) {
      this.logger.warn(`重试记录不存在: orderId=${orderId}`);
      return false;
    }

    if (retryRecord.status === 'in_progress') {
      this.logger.warn(`重试正在执行中: orderId=${orderId}`);
      return false;
    }

    retryRecord.status = 'in_progress';
    retryRecord.lastAttemptAt = new Date();

    try {
      // 这里调用实际的支付逻辑
      // TODO: 集成真实的支付服务
      const success = await this.retryPayment(orderId);

      if (success) {
        retryRecord.status = 'success';
        this.pendingRetries.delete(orderId);
        this.logger.log(`重试成功: orderId=${orderId}`);
        return true;
      } else {
        return await this.handleRetryFailure(retryRecord);
      }
    } catch (error) {
      this.logger.error(`重试失败: orderId=${orderId}, error=${error.message}`);
      return await this.handleRetryFailure(retryRecord);
    }
  }

  /**
   * 处理重试失败
   */
  private async handleRetryFailure(retryRecord: RetryRecord): Promise<boolean> {
    const config = this.getRetryConfig(retryRecord.error.type);

    if (retryRecord.attemptCount >= config.maxRetries) {
      // 达到最大重试次数，放弃重试
      retryRecord.status = 'failed';
      this.pendingRetries.delete(retryRecord.orderId);
      this.logger.error(
        `达到最大重试次数，放弃重试: orderId=${retryRecord.orderId}, attempts=${retryRecord.attemptCount}`,
      );
      return false;
    }

    // 计算下次重试时间（指数退避）
    retryRecord.attemptCount++;
    const nextInterval = Math.min(
      config.retryInterval * Math.pow(config.backoffMultiplier, retryRecord.attemptCount - 1),
      config.maxRetryInterval,
    );
    retryRecord.nextRetryAt = new Date(Date.now() + nextInterval);
    retryRecord.status = 'pending';

    this.logger.log(
      `计划下次重试: orderId=${retryRecord.orderId}, attempt=${retryRecord.attemptCount}, nextRetryAt=${retryRecord.nextRetryAt.toISOString()}`,
    );

    return false;
  }

  /**
   * 重试支付（模拟）
   */
  private async retryPayment(orderId: string): Promise<boolean> {
    // 这里应该调用实际的支付服务
    // 目前返回随机结果模拟
    return Math.random() > 0.3; // 70%成功率
  }

  /**
   * 更新订单错误信息
   */
  private async updateOrderWithError(orderId: string, error: PaymentError): Promise<void> {
    try {
      await this.orderModel.findByIdAndUpdate(orderId, {
        $set: {
          'payment.status': PaymentStatus.FAILED,
          'payment.failedReason': `${error.type}: ${error.message}`,
          updatedAt: new Date(),
        },
      });
    } catch (err) {
      this.logger.error(`更新订单失败: orderId=${orderId}, error=${err.message}`);
    }
  }

  /**
   * 获取重试配置
   */
  private getRetryConfig(errorType: PaymentErrorType): RetryConfig {
    const typeConfig = this.errorTypeConfigs.get(errorType) || {};
    return { ...this.defaultRetryConfig, ...typeConfig };
  }

  /**
   * 定时检查并执行重试
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  async checkAndExecuteRetries(): Promise<void> {
    const now = new Date();

    for (const [orderId, retryRecord] of this.pendingRetries.entries()) {
      if (retryRecord.status === 'pending' && now >= retryRecord.nextRetryAt) {
        this.executeRetry(orderId);
      }
    }
  }

  /**
   * 清理过期的重试记录
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredRetries(): Promise<void> {
    const now = new Date();
    const expiredThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24小时

    for (const [orderId, retryRecord] of this.pendingRetries.entries()) {
      if (retryRecord.nextRetryAt < expiredThreshold) {
        this.pendingRetries.delete(orderId);
        this.logger.log(`清理过期重试记录: orderId=${orderId}`);
      }
    }
  }

  /**
   * 获取重试状态
   */
  getRetryStatus(orderId: string): {
    exists: boolean;
    record?: RetryRecord;
  } {
    const record = this.pendingRetries.get(orderId);

    if (!record) {
      return { exists: false };
    }

    return {
      exists: true,
      record,
    };
  }

  /**
   * 手动触发重试
   */
  async manualRetry(orderId: string): Promise<boolean> {
    const retryRecord = this.pendingRetries.get(orderId);

    if (!retryRecord) {
      throw new Error('订单不在重试队列中');
    }

    return await this.executeRetry(orderId);
  }

  /**
   * 取消重试
   */
  cancelRetry(orderId: string): boolean {
    return this.pendingRetries.delete(orderId);
  }

  /**
   * 获取所有待重试的订单（用于监控）
  */
  getAllPendingRetries(): RetryRecord[] {
    return Array.from(this.pendingRetries.values());
  }

  /**
   * 获取重试统计信息
   */
  getRetryStats(): {
    total: number;
    pending: number;
    inProgress: number;
    success: number;
    failed: number;
  } {
    const records = Array.from(this.pendingRetries.values());

    return {
      total: records.length,
      pending: records.filter(r => r.status === 'pending').length,
      inProgress: records.filter(r => r.status === 'in_progress').length,
      success: records.filter(r => r.status === 'success').length,
      failed: records.filter(r => r.status === 'failed').length,
    };
  }
}
