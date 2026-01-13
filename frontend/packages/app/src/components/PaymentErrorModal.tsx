import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { membershipService } from '@zhouyi/shared/services/membership';

/**
 * 支付错误类型
 */
export enum PaymentErrorType {
  NETWORK_ERROR = 'network_error',
  TIMEOUT = 'timeout',
  INSUFFICIENT_BALANCE = 'insufficient_balance',
  DUPLICATE_ORDER = 'duplicate_order',
  INVALID_PARAMS = 'invalid_params',
  PAYMENT_GATEWAY_ERROR = 'payment_gateway_error',
  UNKNOWN_ERROR = 'unknown_error',
}

/**
 * 支付错误信息
 */
export interface PaymentError {
  type: PaymentErrorType;
  message: string;
  code?: string;
  retryable: boolean;
  timestamp: Date;
}

/**
 * 支付错误模态框属性
 */
export interface PaymentErrorModalProps {
  visible: boolean;
  error: PaymentError | null;
  orderId?: string;
  onRetry?: () => void;
  onCancel?: () => void;
  onDismiss?: () => void;
}

/**
 * 支付错误模态框组件
 * 显示支付失败信息，提供重试选项
 */
export function PaymentErrorModal({
  visible,
  error,
  orderId,
  onRetry,
  onCancel,
  onDismiss,
}: PaymentErrorModalProps): React.JSX.Element | null {
  const [retrying, setRetrying] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(0);

  useEffect(() => {
    let countdownInterval: NodeJS.Timeout;

    if (retryCountdown > 0) {
      countdownInterval = setInterval(() => {
        setRetryCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, [retryCountdown]);

  /**
   * 获取错误类型显示文本
   */
  const getErrorTypeText = (type: PaymentErrorType): string => {
    const errorTypeTexts: Record<PaymentErrorType, string> = {
      [PaymentErrorType.NETWORK_ERROR]: '网络错误',
      [PaymentErrorType.TIMEOUT]: '支付超时',
      [PaymentErrorType.INSUFFICIENT_BALANCE]: '余额不足',
      [PaymentErrorType.DUPLICATE_ORDER]: '重复订单',
      [PaymentErrorType.INVALID_PARAMS]: '参数错误',
      [PaymentErrorType.PAYMENT_GATEWAY_ERROR]: '支付网关错误',
      [PaymentErrorType.UNKNOWN_ERROR]: '未知错误',
    };

    return errorTypeTexts[type] || '支付失败';
  };

  /**
   * 获取错误图标
   */
  const getErrorIcon = (type: PaymentErrorType): string => {
    const icons: Record<PaymentErrorType, string> = {
      [PaymentErrorType.NETWORK_ERROR]: '📡',
      [PaymentErrorType.TIMEOUT]: '⏰',
      [PaymentErrorType.INSUFFICIENT_BALANCE]: '💰',
      [PaymentErrorType.DUPLICATE_ORDER]: '📋',
      [PaymentErrorType.INVALID_PARAMS]: '⚠️',
      [PaymentErrorType.PAYMENT_GATEWAY_ERROR]: '💳',
      [PaymentErrorType.UNKNOWN_ERROR]: '❌',
    };

    return icons[type] || '❌';
  };

  /**
   * 获取错误建议
   */
  const getErrorSuggestion = (type: PaymentErrorType): string => {
    const suggestions: Record<PaymentErrorType, string> = {
      [PaymentErrorType.NETWORK_ERROR]: '请检查网络连接后重试',
      [PaymentErrorType.TIMEOUT]: '支付请求超时，请重试',
      [PaymentErrorType.INSUFFICIENT_BALANCE]: '账户余额不足，请充值后重试',
      [PaymentErrorType.DUPLICATE_ORDER]: '该订单已存在，请勿重复支付',
      [PaymentErrorType.INVALID_PARAMS]: '订单参数错误，请联系客服',
      [PaymentErrorType.PAYMENT_GATEWAY_ERROR]: '支付系统异常，请稍后重试',
      [PaymentErrorType.UNKNOWN_ERROR]: '支付失败，请重试或联系客服',
    };

    return suggestions[type] || '请重试或联系客服';
  };

  /**
   * 处理重试
   */
  const handleRetry = async () => {
    if (retrying || retryCountdown > 0) return;

    if (onRetry) {
      setRetrying(true);
      try {
        await onRetry();
      } finally {
        setRetrying(false);
      }
    } else if (orderId) {
      setRetrying(true);
      try {
        // 使用模拟支付重试
        const result = await membershipService.initiateMockPayment({
          orderId,
          scenario: 'success',
          autoConfirm: true,
        });

        // 设置重试倒计时
        setRetryCountdown(Math.ceil(result.estimatedDelay / 1000));
      } catch (err) {
        console.error('重试支付失败:', err);
      } finally {
        setRetrying(false);
      }
    }
  };

  /**
   * 处理取消
   */
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    if (onDismiss) {
      onDismiss();
    }
  };

  if (!visible || !error) {
    return null;
  }

  const canRetry = error.retryable;
  const errorTitle = getErrorTypeText(error.type);
  const errorIcon = getErrorIcon(error.type);
  const suggestion = getErrorSuggestion(error.type);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* 错误图标 */}
          <View style={styles.iconContainer}>
            <Text style={styles.errorIcon}>{errorIcon}</Text>
          </View>

          {/* 错误标题 */}
          <Text style={styles.errorTitle}>{errorTitle}</Text>

          {/* 错误信息 */}
          <Text style={styles.errorMessage}>{error.message}</Text>

          {/* 建议 */}
          <View style={styles.suggestionContainer}>
            <Text style={styles.suggestionText}>💡 {suggestion}</Text>
          </View>

          {/* 订单信息 */}
          {orderId && (
            <View style={styles.orderInfoContainer}>
              <Text style={styles.orderInfoLabel}>订单号：</Text>
              <Text style={styles.orderInfoValue}>{orderId}</Text>
            </View>
          )}

          {/* 操作按钮 */}
          <View style={styles.buttonContainer}>
            {/* 取消按钮 */}
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
              disabled={retrying}
            >
              <Text style={styles.cancelButtonText}>取消</Text>
            </TouchableOpacity>

            {/* 重试按钮 */}
            {canRetry && (
              <TouchableOpacity
                style={[styles.button, styles.retryButton]}
                onPress={handleRetry}
                disabled={retrying || retryCountdown > 0}
              >
                {retrying ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.retryButtonText}>
                    {retryCountdown > 0 ? `请等待 ${retryCountdown}s` : '重试'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* 客服提示 */}
          <Text style={styles.supportText}>如有问题，请联系客服</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  errorIcon: {
    fontSize: 64,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  suggestionContainer: {
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    marginBottom: 16,
  },
  suggestionText: {
    fontSize: 14,
    color: '#C8102E',
    lineHeight: 20,
  },
  orderInfoContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    marginBottom: 16,
  },
  orderInfoLabel: {
    fontSize: 12,
    color: '#666',
    marginRight: 4,
  },
  orderInfoValue: {
    fontSize: 12,
    color: '#333',
    flex: 1,
    flexWrap: 'wrap',
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginBottom: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#C8102E',
  },
  retryButtonText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: 'bold',
  },
  supportText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});
