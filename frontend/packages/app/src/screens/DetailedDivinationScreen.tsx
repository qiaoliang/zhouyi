import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Theme } from '@zhouyi/shared/theme';
import { divinationService } from '@zhouyi/shared/services/divination';
import { authService } from '@zhouyi/shared/services/auth';
import { useAuth } from '../contexts/AuthContext';

/**
 * 详细解卦页面
 * 展示变卦、互卦、应期等高级分析内容（会员专享）
 */
function DetailedDivinationScreen(): React.JSX.Element {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [hasMembership, setHasMembership] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [divinationData, setDivinationData] = useState<any>(null);

  // 从路由参数获取recordId
  const { recordId } = (route.params as any) || {};

  useEffect(() => {
    checkMembershipAndLoadData();
  }, [recordId]);

  /**
   * 检查会员状态并加载数据
   */
  const checkMembershipAndLoadData = async () => {
    try {
      setLoading(true);

      // 检查会员状态
      const membership = await authService.getMembershipInfo();
      const isMember = membership.type !== 'free' && !membership.isExpired;
      setHasMembership(isMember);

      if (!isMember) {
        // 非会员，显示升级引导
        setShowUpgradeModal(true);
        return;
      }

      // 会员用户，加载详细解卦数据
      await loadDetailedDivination();
    } catch (error) {
      console.error('加载数据失败:', error);
      Alert.alert('错误', '加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 加载详细解卦数据
   */
  const loadDetailedDivination = async () => {
    if (!recordId) {
      Alert.alert('提示', '缺少卜卦记录ID');
      return;
    }

    try {
      const data = await divinationService.getDetailedDivination(recordId);
      setDivinationData(data);
    } catch (error: any) {
      console.error('加载详细解卦失败:', error);

      // 如果是403错误，说明权限不足
      if (error.response?.status === 403) {
        setShowUpgradeModal(true);
      } else {
        Alert.alert('错误', error.response?.data?.message || '加载失败');
      }
    }
  };

  /**
   * 跳转到会员购买页面
   */
  const handleUpgrade = () => {
    setShowUpgradeModal(false);
    navigation.navigate('Membership' as never);
  };

  /**
   * 渲染加载状态
   */
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Theme.primary} />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </View>
    );
  }

  /**
   * 渲染升级引导模态框
   */
  const renderUpgradeModal = () => (
    <Modal visible={showUpgradeModal} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalIconContainer}>
            <Icon name="ios-lock-closed" size={60} color={Theme.primary} />
          </View>

          <Text style={styles.modalTitle}>开通会员查看详细解卦</Text>

          <Text style={styles.modalDescription}>
            详细解卦包含变卦分析、互卦分析、应期预测等专业内容，需要会员权限才能查看
          </Text>

          <View style={styles.privilegesContainer}>
            <Text style={styles.privilegesTitle}>会员权益：</Text>
            <View style={styles.privilegeItem}>
              <Icon name="ios-checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.privilegeText}>无限次详细解卦</Text>
            </View>
            <View style={styles.privilegeItem}>
              <Icon name="ios-checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.privilegeText}>精准解卦预测</Text>
            </View>
            <View style={styles.privilegeItem}>
              <Icon name="ios-checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.privilegeText}>无广告体验</Text>
            </View>
            <View style={styles.privilegeItem}>
              <Icon name="ios-checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.privilegeText}>学习中心访问</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
            <Text style={styles.upgradeButtonText}>立即开通会员</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
            <Text style={styles.closeButtonText}>稍后再说</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  /**
   * 渲染变卦分析
   */
  const renderChangedHexagram = () => {
    if (!divinationData?.analysis?.changedHexagram) return null;

    const analysis = divinationData.analysis.changedHexagram;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="ios-swap" size={24} color={Theme.primary} />
          <Text style={styles.sectionTitle}>变卦分析</Text>
        </View>

        <View style={styles.hexagramComparison}>
          <View style={styles.hexagramCard}>
            <Text style={styles.cardLabel}>本卦</Text>
            <Text style={styles.hexagramSymbol}>{divinationData.primary.symbol}</Text>
            <Text style={styles.hexagramName}>{divinationData.primary.name}</Text>
          </View>

          <Icon name="ios-arrow-forward" size={24} color={Theme.text.secondary} />

          <View style={styles.hexagramCard}>
            <Text style={styles.cardLabel}>变卦</Text>
            <Text style={styles.hexagramSymbol}>{analysis.changedSymbol}</Text>
            <Text style={styles.hexagramName}>{analysis.changedName}</Text>
          </View>
        </View>

        {analysis.changingLines && analysis.changingLines.length > 0 && (
          <View style={styles.changingLinesContainer}>
            <Text style={styles.subsectionTitle}>动爻说明：</Text>
            {analysis.changingLines.map((line: any, index: number) => (
              <View key={index} style={styles.changingLineItem}>
                <Text style={styles.changingLineLabel}>
                  {['初', '二', '三', '四', '五', '上'][line.position - 1]}爻
                </Text>
                <Text style={styles.changingLineText}>{line.description}</Text>
              </View>
            ))}
          </View>
        )}

        {analysis.interpretation && (
          <View style={styles.interpretationContainer}>
            <Text style={styles.subsectionTitle}>卦义解读：</Text>
            <Text style={styles.interpretationText}>{analysis.interpretation}</Text>
          </View>
        )}
      </View>
    );
  };

  /**
   * 渲染互卦分析
   */
  const renderMutualHexagram = () => {
    if (!divinationData?.analysis?.mutualHexagram) return null;

    const analysis = divinationData.analysis.mutualHexagram;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="ios-repeat" size={24} color={Theme.primary} />
          <Text style={styles.sectionTitle}>互卦分析</Text>
        </View>

        <View style={styles.mutualContainer}>
          <Text style={styles.mutualSymbol}>{analysis.symbol}</Text>
          <Text style={styles.mutualName}>{analysis.name}</Text>
          <Text style={styles.mutualPinyin}>{analysis.pinyin}</Text>
        </View>

        {analysis.position && (
          <View style={styles.positionContainer}>
            <Text style={styles.subsectionTitle}>互卦位置：</Text>
            <Text style={styles.positionText}>{analysis.position}</Text>
          </View>
        )}

        {analysis.meaning && (
          <View style={styles.meaningContainer}>
            <Text style={styles.subsectionTitle}>互卦含义：</Text>
            <Text style={styles.meaningText}>{analysis.meaning}</Text>
          </View>
        )}

        {analysis.advice && (
          <View style={styles.adviceContainer}>
            <Text style={styles.adviceLabel}>💡 建议：</Text>
            <Text style={styles.adviceText}>{analysis.advice}</Text>
          </View>
        )}
      </View>
    );
  };

  /**
   * 渲染应期分析
   */
  const renderTiming = () => {
    if (!divinationData?.analysis?.timing) return null;

    const timing = divinationData.analysis.timing;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="ios-time" size={24} color={Theme.primary} />
          <Text style={styles.sectionTitle}>应期分析</Text>
        </View>

        <View style={styles.timingContainer}>
          <View style={styles.timingItem}>
            <Text style={styles.timingLabel}>预测时间：</Text>
            <Text style={styles.timingValue}>{timing.period}</Text>
          </View>

          {timing.elements && timing.elements.length > 0 && (
            <View style={styles.elementsContainer}>
              <Text style={styles.subsectionTitle}>参考要素：</Text>
              <View style={styles.elementsList}>
                {timing.elements.map((element: string, index: number) => (
                  <View key={index} style={styles.elementTag}>
                    <Text style={styles.elementText}>{element}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {timing.analysis && (
            <View style={styles.timingAnalysisContainer}>
              <Text style={styles.subsectionTitle}>时间推断：</Text>
              <Text style={styles.timingAnalysisText}>{timing.analysis}</Text>
            </View>
          )}

          {timing.note && (
            <View style={styles.noteContainer}>
              <Text style={styles.noteLabel}>📌 注意：</Text>
              <Text style={styles.noteText}>{timing.note}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  /**
   * 渲染综合建议
   */
  const renderOverallAdvice = () => {
    if (!divinationData?.analysis?.overallAdvice) return null;

    const advice = divinationData.analysis.overallAdvice;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="ios-bulb" size={24} color={Theme.primary} />
          <Text style={styles.sectionTitle}>综合建议</Text>
        </View>

        <View style={styles.adviceContainer}>
          <Text style={styles.overallAdviceText}>{advice}</Text>
        </View>

        {divinationData.analysis?.lucky && (
          <View style={styles.luckyContainer}>
            <Text style={styles.subsectionTitle}>吉祥指数：</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map(star => (
                <Icon
                  key={star}
                  name={star <= (divinationData.analysis.lucky.level || 3) ? 'ios-star' : 'ios-star-outline'}
                  size={20}
                  color={Theme.secondary}
                />
              ))}
            </View>
            <Text style={styles.luckyText}>{divinationData.analysis.lucky.description}</Text>
          </View>
        )}
      </View>
    );
  };

  /**
   * 渲染详细解卦内容
   */
  const renderContent = () => {
    if (!divinationData) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="ios-document-outline" size={60} color={Theme.text.secondary} />
          <Text style={styles.emptyText}>暂无详细解卦数据</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backButtonText}>返回</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 基础卦象信息 */}
        <View style={styles.basicInfo}>
          <Text style={styles.basicSymbol}>{divinationData.primary.symbol}</Text>
          <Text style={styles.basicName}>{divinationData.primary.name}</Text>
          <Text style={styles.basicPinyin}>{divinationData.primary.pinyin}</Text>
        </View>

        {/* 高级分析内容 */}
        {renderChangedHexagram()}
        {renderMutualHexagram()}
        {renderTiming()}
        {renderOverallAdvice()}

        {/* 底部提示 */}
        <View style={styles.footerTip}>
          <Icon name="ios-information-circle" size={16} color={Theme.text.secondary} />
          <Text style={styles.footerTipText}>
            以上内容仅供参考，如需更精准的解读请结合实际情况
          </Text>
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="ios-arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>详细解卦</Text>
        <View style={styles.placeholder} />
      </View>

      {/* 内容 */}
      {renderContent()}

      {/* 升级引导模态框 */}
      {renderUpgradeModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.background.light,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: Theme.fontSize.md,
    color: Theme.text.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Theme.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Theme.fontSize.lg,
    fontFamily: Theme.titleFont.bold,
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  basicInfo: {
    alignItems: 'center',
    paddingVertical: 30,
    borderBottomWidth: 1,
    borderBottomColor: Theme.border,
  },
  basicSymbol: {
    fontSize: 72,
    marginBottom: 12,
  },
  basicName: {
    fontSize: Theme.fontSize.xxl,
    fontFamily: Theme.titleFont.bold,
    color: Theme.text.primary,
    marginBottom: 6,
  },
  basicPinyin: {
    fontSize: Theme.fontSize.md,
    color: Theme.text.secondary,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Theme.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: Theme.fontSize.xl,
    fontFamily: Theme.titleFont.bold,
    color: Theme.text.primary,
    marginLeft: 8,
  },
  hexagramComparison: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginVertical: 20,
  },
  hexagramCard: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: Theme.background.card,
    borderRadius: 12,
    width: 120,
  },
  cardLabel: {
    fontSize: Theme.fontSize.sm,
    color: Theme.text.secondary,
    marginBottom: 8,
  },
  hexagramSymbol: {
    fontSize: 48,
    marginBottom: 8,
  },
  hexagramName: {
    fontSize: Theme.fontSize.md,
    color: Theme.text.primary,
    textAlign: 'center',
  },
  changingLinesContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: Theme.background.card,
    borderRadius: 12,
  },
  subsectionTitle: {
    fontSize: Theme.fontSize.lg,
    fontFamily: Theme.titleFont.bold,
    color: Theme.text.primary,
    marginBottom: 12,
  },
  changingLineItem: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Theme.border,
  },
  changingLineLabel: {
    width: 60,
    fontSize: Theme.fontSize.md,
    color: Theme.primary,
    fontFamily: Theme.titleFont.bold,
  },
  changingLineText: {
    flex: 1,
    fontSize: Theme.fontSize.sm,
    color: Theme.text.primary,
    lineHeight: 20,
  },
  interpretationContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: Theme.background.card,
    borderRadius: 12,
  },
  interpretationText: {
    fontSize: Theme.fontSize.sm,
    color: Theme.text.primary,
    lineHeight: 24,
  },
  mutualContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: Theme.background.card,
    borderRadius: 12,
    marginBottom: 16,
  },
  mutualSymbol: {
    fontSize: 60,
    marginBottom: 8,
  },
  mutualName: {
    fontSize: Theme.fontSize.xl,
    fontFamily: Theme.titleFont.bold,
    color: Theme.text.primary,
    marginBottom: 4,
  },
  mutualPinyin: {
    fontSize: Theme.fontSize.md,
    color: Theme.text.secondary,
  },
  positionContainer: {
    marginTop: 16,
  },
  positionText: {
    fontSize: Theme.fontSize.sm,
    color: Theme.text.primary,
    lineHeight: 20,
  },
  meaningContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: Theme.background.card,
    borderRadius: 12,
  },
  meaningText: {
    fontSize: Theme.fontSize.sm,
    color: Theme.text.primary,
    lineHeight: 22,
  },
  adviceContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Theme.primary,
  },
  adviceLabel: {
    fontSize: Theme.fontSize.md,
    fontFamily: Theme.titleFont.bold,
    color: Theme.primary,
    marginBottom: 4,
  },
  adviceText: {
    fontSize: Theme.fontSize.sm,
    color: Theme.text.primary,
    lineHeight: 20,
  },
  timingContainer: {
    padding: 16,
    backgroundColor: Theme.background.card,
    borderRadius: 12,
  },
  timingItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timingLabel: {
    fontSize: Theme.fontSize.md,
    color: Theme.text.secondary,
    width: 80,
  },
  timingValue: {
    flex: 1,
    fontSize: Theme.fontSize.md,
    color: Theme.primary,
    fontFamily: Theme.titleFont.bold,
  },
  elementsContainer: {
    marginBottom: 16,
  },
  elementsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  elementTag: {
    backgroundColor: Theme.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  elementText: {
    fontSize: Theme.fontSize.sm,
    color: '#FFFFFF',
    fontFamily: Theme.titleFont.bold,
  },
  timingAnalysisContainer: {
    marginBottom: 16,
  },
  timingAnalysisText: {
    fontSize: Theme.fontSize.sm,
    color: Theme.text.primary,
    lineHeight: 22,
  },
  noteContainer: {
    padding: 12,
    backgroundColor: '#FFF9E6',
    borderRadius: 8,
  },
  noteLabel: {
    fontSize: Theme.fontSize.sm,
    fontFamily: Theme.titleFont.bold,
    color: Theme.accent,
  },
  noteText: {
    fontSize: Theme.fontSize.xs,
    color: Theme.text.secondary,
    lineHeight: 18,
  },
  adviceContainer: {
    padding: 16,
    backgroundColor: Theme.background.card,
    borderRadius: 12,
  },
  overallAdviceText: {
    fontSize: Theme.fontSize.sm,
    color: Theme.text.primary,
    lineHeight: 24,
  },
  luckyContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    marginVertical: 12,
  },
  luckyText: {
    fontSize: Theme.fontSize.sm,
    color: Theme.text.secondary,
    textAlign: 'center',
  },
  footerTip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Theme.background.light,
  },
  footerTipText: {
    flex: 1,
    fontSize: Theme.fontSize.xs,
    color: Theme.text.secondary,
    marginLeft: 8,
    lineHeight: 18,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: Theme.fontSize.md,
    color: Theme.text.secondary,
    marginTop: 16,
  },
  // 模态框样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: Theme.titleFont.bold,
    color: Theme.text.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 14,
    color: Theme.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  privilegesContainer: {
    width: '100%',
    marginBottom: 24,
  },
  privilegesTitle: {
    fontSize: 16,
    fontFamily: Theme.titleFont.bold,
    color: Theme.text.primary,
    marginBottom: 12,
  },
  privilegeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  privilegeText: {
    fontSize: 14,
    color: Theme.text.primary,
    marginLeft: 8,
  },
  upgradeButton: {
    width: '100%',
    backgroundColor: Theme.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  upgradeButtonText: {
    fontSize: 16,
    fontFamily: Theme.titleFont.bold,
    color: '#FFFFFF',
  },
  closeButton: {
    paddingVertical: 12,
  },
  closeButtonText: {
    fontSize: 14,
    color: Theme.text.secondary,
  },
});

export default DetailedDivinationScreen;
