import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { membershipService, MembershipPlan, OrderType } from '@zhouyi/shared/services/membership';
import { useAuth } from '../contexts/AuthContext';
import { PaymentErrorModal, PaymentErrorType } from '../components/PaymentErrorModal';

/**
 * 会员购买页面
 */
function MembershipScreen(): React.JSX.Element {
  const { user } = useAuth();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<MembershipPlan | null>(null);
  const [orderCreating, setOrderCreating] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // 错误处理状态
  const [paymentError, setPaymentError] = useState<{
    type: PaymentErrorType;
    message: string;
    retryable: boolean;
  } | null>(null);
  const [errorModalVisible, setErrorModalVisible] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  /**
   * 加载会员套餐
   */
  const loadPlans = async () => {
    try {
      setLoading(true);
      const data = await membershipService.getPlans();
      setPlans(data);
    } catch (error) {
      console.error('加载套餐失败:', error);
      Alert.alert('错误', '加载套餐失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 选择套餐
   */
  const handleSelectPlan = (plan: MembershipPlan) => {
    setSelectedPlan(plan);

    if (!user || !user.userId) {
      Alert.alert('提示', '请先登录');
      return;
    }

    Alert.alert(
      '确认购买',
      `您选择了${plan.name}\n价格：¥${plan.price}\n\n确认购买吗？`,
      [
        { text: '取消', style: 'cancel' },
        { text: '确认', onPress: () => handleCreateOrder(plan) },
      ],
    );
  };

  /**
   * 创建订单
   */
  const handleCreateOrder = async (plan: MembershipPlan) => {
    try {
      setOrderCreating(true);

      const order = await membershipService.createOrder({
        type: plan.type,
        paymentMethod: 'wechat',
      });

      setCurrentOrder(order);
      setPaymentModalVisible(true);

      // 自动发起模拟支付
      await handleInitiatePayment(order.id);
    } catch (error: any) {
      console.error('创建订单失败:', error);
      Alert.alert('错误', error.response?.data?.message || '创建订单失败，请稍后重试');
    } finally {
      setOrderCreating(false);
    }
  };

    /**
   * 发起模拟支付
   */
  const handleInitiatePayment = async (orderId: string) => {
    try {
      setPaymentProcessing(true);

      const result = await membershipService.initiateMockPayment({
        orderId,
        scenario: 'success',
        autoConfirm: true,
      });

      console.log('支付发起成功:', result);

      // 等待支付完成（模拟）
      setTimeout(async () => {
        Alert.alert(
          '支付成功',
          '您已成功购买会员，权益已生效',
          [
            {
              text: '确定',
              onPress: () => {
                setPaymentModalVisible(false);
                setCurrentOrder(null);
              },
            },
          ],
        );
        setPaymentProcessing(false);
      }, 3000);
    } catch (error: any) {
      console.error('支付失败:', error);
      setPaymentProcessing(false);

      // 解析错误类型
      const errorMessage = error.response?.data?.message || error.message || '支付失败';
      let errorType = PaymentErrorType.UNKNOWN_ERROR;
      let retryable = true;

      if (errorMessage.includes('network') || errorMessage.includes('网络')) {
        errorType = PaymentErrorType.NETWORK_ERROR;
      } else if (errorMessage.includes('timeout') || errorMessage.includes('超时')) {
        errorType = PaymentErrorType.TIMEOUT;
      } else if (errorMessage.includes('balance') || errorMessage.includes('余额')) {
        errorType = PaymentErrorType.INSUFFICIENT_BALANCE;
        retryable = false;
      } else if (errorMessage.includes('duplicate') || errorMessage.includes('重复')) {
        errorType = PaymentErrorType.DUPLICATE_ORDER;
        retryable = false;
      }

      // 显示错误模态框
      setPaymentError({
        type: errorType,
        message: errorMessage,
        retryable,
      });
      setErrorModalVisible(true);
    }
  };

    /**
   * 处理重试支付
   */
  const handleRetryPayment = async () => {
    if (currentOrder) {
      setErrorModalVisible(false);
      await handleInitiatePayment(currentOrder.id);
    }
  };

  /**
   * 处理关闭错误模态框
   */
  const handleDismissError = () => {
    setErrorModalVisible(false);
    setPaymentError(null);
    setPaymentModalVisible(false);
    setCurrentOrder(null);
  };

  /**
   * 渲染套餐卡片
   */
  const renderPlanCard = (plan: MembershipPlan) => {
    const isSelected = selectedPlan?.type === plan.type;

    return (
      <TouchableOpacity
        key={plan.type}
        style={[
          styles.planCard,
          isSelected && styles.planCardSelected,
          plan.recommended && styles.planCardRecommended,
        ]}
        onPress={() => handleSelectPlan(plan)}
        disabled={orderCreating}
      >
        {plan.recommended && (
          <View style={styles.recommendedBadge}>
            <Text style={styles.recommendedBadgeText}>推荐</Text>
          </View>
        )}

        <Text style={styles.planName}>{plan.name}</Text>
        <Text style={styles.planPrice}>¥{plan.price}</Text>
        <Text style={styles.planDuration}>{plan.duration}</Text>

        <View style={styles.privilegesContainer}>
          <Text style={styles.privilegesTitle}>会员权益：</Text>
          {plan.privileges.dailyDivinations === -1 ? (
            <Text style={styles.privilegeItem}>✓ 无限次起卦</Text>
          ) : (
            <Text style={styles.privilegeItem}>
              ✓ 每日{plan.privileges.dailyDivinations}次起卦
            </Text>
          )}
          {plan.privileges.detailedInterpretation && (
            <Text style={styles.privilegeItem}>✓ 详细解卦</Text>
          )}
          {plan.privileges.preciseInterpretation && (
            <Text style={styles.privilegeItem}>✓ 精准解卦</Text>
          )}
          {plan.privileges.learningAccess && (
            <Text style={styles.privilegeItem}>✓ 学习中心访问</Text>
          )}
          {plan.privileges.adFree && <Text style={styles.privilegeItem}>✓ 无广告体验</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  /**
   * 渲染支付模态框
   */
  const renderPaymentModal = () => (
    <Modal
      visible={paymentModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setPaymentModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>支付中...</Text>

          {paymentProcessing ? (
            <View style={styles.paymentProcessingContainer}>
              <ActivityIndicator size="large" color="#C8102E" />
              <Text style={styles.paymentProcessingText}>正在处理支付，请稍候...</Text>
            </View>
          ) : (
            <View style={styles.paymentSuccessContainer}>
              <Text style={styles.paymentSuccessText}>✓</Text>
              <Text style={styles.paymentSuccessMessage}>支付成功！</Text>
            </View>
          )}

          {currentOrder && (
            <View style={styles.orderInfoContainer}>
              <Text style={styles.orderInfoText}>订单号: {currentOrder.id}</Text>
              <Text style={styles.orderInfoText}>金额: ¥{currentOrder.amount}</Text>
            </View>
          )}

          {!paymentProcessing && (
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setPaymentModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>确定</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C8102E" />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>会员中心</Text>
        <Text style={styles.headerSubtitle}>解锁全部功能，享受完整体验</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.plansContainer}>{plans.map(renderPlanCard)}</View>

        <View style={styles.noticeContainer}>
          <Text style={styles.noticeTitle}>购买须知：</Text>
          <Text style={styles.noticeItem}>• 会员购买后立即生效</Text>
          <Text style={styles.noticeItem}>• 月卡/年卡会员期内可无限次起卦</Text>
          <Text style={styles.noticeItem}>• 按次购买详细解卦，单次有效</Text>
          <Text style={styles.noticeItem}>• 会员权益不支持转让</Text>
        </View>
      </ScrollView>

      {renderPaymentModal()}

      {/* 支付错误模态框 */}
      {paymentError && (
        <PaymentErrorModal
          visible={errorModalVisible}
          error={{
            type: paymentError.type,
            message: paymentError.message,
            retryable: paymentError.retryable,
            timestamp: new Date(),
          }}
          orderId={currentOrder?.id}
          onRetry={handleRetryPayment}
          onDismiss={handleDismissError}
        />
      )}

      {orderCreating && (
        <View style={styles.globalLoadingOverlay}>
          <ActivityIndicator size="large" color="#C8102E" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5DC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#333',
  },
  header: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#C8102E',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFF',
    marginTop: 8,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  plansContainer: {
    gap: 16,
  },
  planCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    position: 'relative',
  },
  planCardSelected: {
    borderColor: '#C8102E',
    backgroundColor: '#FFF5F5',
  },
  planCardRecommended: {
    borderColor: '#D4AF37',
    shadowColor: '#D4AF37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  recommendedBadge: {
    position: 'absolute',
    top: -1,
    right: 20,
    backgroundColor: '#D4AF37',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  recommendedBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#C8102E',
    marginBottom: 4,
  },
  planDuration: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  privilegesContainer: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
  },
  privilegesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  privilegeItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  noticeContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginBottom: 20,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  noticeItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 320,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  paymentProcessingContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  paymentProcessingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  paymentSuccessContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  paymentSuccessText: {
    fontSize: 48,
    color: '#4CAF50',
    marginBottom: 12,
  },
  paymentSuccessMessage: {
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
  },
  orderInfoContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    marginTop: 16,
  },
  orderInfoText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  modalButton: {
    backgroundColor: '#C8102E',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginTop: 20,
  },
  modalButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  globalLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MembershipScreen;
