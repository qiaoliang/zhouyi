/**
 * 卜卦页面
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {Theme} from '@zhouyi/shared/theme';
import {divinationService} from '@zhouyi/shared/services/divination';
import {authService} from '@zhouyi/shared/services/auth';
import {Hexagram} from '@zhouyi/shared/types';
import {useNavigation} from '@react-navigation/native';
import GuestGuideModal from '../components/GuestGuideModal';

const GUEST_LIMIT = 2; // 游客最多卜卦次数

/**
 * 卜卦屏幕组件
 */
function DivinationScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const [isDivining, setIsDivining] = useState(false);
  const [hexagram, setHexagram] = useState<Hexagram | null>(null);
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [isGuest, setIsGuest] = useState(false);
  const [guestCount, setGuestCount] = useState(0);
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    // 检查游客状态
    checkGuestStatus();
  }, []);

  /**
   * 检查游客状态
   */
  const checkGuestStatus = async () => {
    const guestStatus = await authService.isGuest();
    setIsGuest(guestStatus);

    if (guestStatus) {
      const count = await authService.getGuestDivinationCount();
      setGuestCount(count);
    }
  };

  /**
   * 执行起卦
   */
  const handleDivination = async () => {
    // 游客模式检查
    if (isGuest) {
      if (guestCount >= GUEST_LIMIT) {
        // 超过限制，显示引导注册弹窗
        setShowGuideModal(true);
        return;
      }
    }

    setIsDivining(true);
    setStep(1);

    try {
      // 模拟摇卦动画
      await new Promise(resolve => setTimeout(resolve, 1500));
      setStep(2);

      const result = await divinationService.performDivination({
        type: 'coin',
        question: '',
      });

      await new Promise(resolve => setTimeout(resolve, 1000));
      setStep(3);

      // 更新游客卜卦次数
      if (isGuest) {
        const newCount = await authService.incrementGuestDivinationCount();
        setGuestCount(newCount);

        // 如果用完次数，显示引导注册
        if (newCount >= GUEST_LIMIT) {
          setTimeout(() => {
            setShowGuideModal(true);
          }, 1000);
        }
      }

      setHexagram(result);
    } catch (error) {
      console.error('起卦失败:', error);
      Alert.alert('提示', '起卦失败，请稍后重试');
    } finally {
      setIsDivining(false);
    }
  };

  /**
   * 重置起卦
   */
  const handleReset = () => {
    setHexagram(null);
    setStep(0);
  };

  /**
   * 跳转到登录页
   */
  const handleLogin = () => {
    setShowGuideModal(false);
    navigation.navigate('Login' as never);
  };

  /**
   * 查看详细解卦
   */
  const handleViewDetailed = () => {
    if (!hexagram) return;

    navigation.navigate('DetailedDivination' as never, {
      recordId: hexagram.id || (hexagram as any).recordId,
    });
  };

  /**
   * 关闭引导弹窗
   */
  const handleCloseModal = () => {
    setShowGuideModal(false);
  };

  /**
   * 渲染游客提示
   */
  const renderGuestHint = () => {
    if (!isGuest) return null;

    const remainingCount = GUEST_LIMIT - guestCount;
    const isWarning = remainingCount === 0;

    return (
      <View style={[styles.guestHint, isWarning && styles.guestHintWarning]}>
        <Icon
          name={isWarning ? 'ios-warning' : 'ios-information-circle'}
          size={16}
          color={isWarning ? '#FF4444' : Theme.text.secondary}
        />
        <Text style={[styles.guestHintText, isWarning && styles.guestHintTextWarning]}>
          {isWarning
            ? '您的免费体验次数已用完，请登录注册'
            : `游客模式还可以卜卦 ${remainingCount} 次`}
        </Text>
      </View>
    );
  };

  /**
   * 渲染起卦按钮
   */
  const renderDivinationButton = () => (
    <View style={styles.buttonContainer}>
      <TouchableOpacity
        style={[
          styles.divinationButton,
          isDivining && styles.buttonDisabled,
          isGuest && guestCount >= GUEST_LIMIT && styles.buttonDisabled,
        ]}
        onPress={handleDivination}
        disabled={isDivining || (isGuest && guestCount >= GUEST_LIMIT)}>
        {isDivining ? (
          <ActivityIndicator size="large" color="#FFFFFF" />
        ) : (
          <>
            <Icon name="ios-compass" size={60} color="#FFFFFF" />
            <Text style={styles.buttonText}>摇一卦</Text>
            <Text style={styles.buttonSubtext}>
              {isGuest
                ? `游客还可卜卦 ${GUEST_LIMIT - guestCount} 次`
                : '诚心默念心中所问'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  /**
   * 渲染起卦过程动画
   */
  const renderDivinationProcess = () => {
    if (step === 0) return null;

    return (
      <View style={styles.processContainer}>
        <View style={styles.coinContainer}>
          {[1, 2, 3].map(i => (
            <View
              key={i}
              style={[
                styles.coin,
                step >= 2 && styles.coinRevealed,
                isDivining && styles.coinAnimating,
              ]}>
              <Text style={styles.coinText}>
                {step >= 2 ? (i % 2 === 0 ? '字' : '背') : '?'}
              </Text>
            </View>
          ))}
        </View>
        <Text style={styles.processText}>
          {step === 1 ? '正在起卦...' : '卦象已现'}
        </Text>
      </View>
    );
  };

  /**
   * 渲染卦象结果
   */
  const renderHexagramResult = () => {
    if (!hexagram) return null;

    return (
      <ScrollView style={styles.resultContainer}>
        <View style={styles.hexagramHeader}>
          <Text style={styles.hexagramSymbol}>{hexagram.primary.symbol}</Text>
          <Text style={styles.hexagramName}>{hexagram.primary.name}</Text>
          <Text style={styles.hexagramPinyin}>{hexagram.primary.pinyin}</Text>
        </View>

        {hexagram.changingLines.length > 0 && (
          <View style={styles.changedSection}>
            <Text style={styles.sectionTitle}>变卦</Text>
            <Text style={styles.changedSymbol}>{hexagram.changed.symbol}</Text>
            <Text style={styles.changedName}>{hexagram.changed.name}</Text>
          </View>
        )}

        <View style={styles.mutualSection}>
          <Text style={styles.sectionTitle}>互卦</Text>
          <Text style={styles.mutualSymbol}>{hexagram.mutual.symbol}</Text>
          <Text style={styles.mutualName}>{hexagram.mutual.name}</Text>
        </View>

        <View style={styles.linesSection}>
          <Text style={styles.sectionTitle}>六爻</Text>
          {hexagram.lines.map((line, index) => (
            <View key={index} style={styles.lineRow}>
              <Text style={styles.lineLabel}>
                六{['初', '二', '三', '四', '五', '上'][index]}
              </Text>
              <Text style={styles.lineSymbol}>{line.symbol}</Text>
              <Text style={styles.lineText}>
                {line.yinYang === 'yang' ? '阳爻' : '阴爻'}
                {hexagram.changingLines.includes(index + 1) && ' (变)'}
              </Text>
            </View>
          ))}
        </View>

        {/* 游客提示 */}
        {isGuest && (
          <View style={styles.guestResultTip}>
            <Icon name="ios-lock-closed" size={16} color={Theme.text.secondary} />
            <Text style={styles.guestResultTipText}>
              游客模式下结果不保存，登录后可查看历史记录
            </Text>
          </View>
        )}

        {/* 详细解卦按钮 */}
        <TouchableOpacity
          style={styles.detailedButton}
          onPress={handleViewDetailed}>
          <Icon name="ios-book" size={20} color="#FFFFFF" />
          <Text style={styles.detailedButtonText}>查看详细解卦</Text>
          <Text style={styles.detailedButtonSubtext}>会员专享</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.resetButton,
            isGuest && guestCount >= GUEST_LIMIT && styles.resetButtonDisabled,
          ]}
          onPress={handleReset}
          disabled={isGuest && guestCount >= GUEST_LIMIT}>
          <Text style={styles.resetButtonText}>
            {isGuest && guestCount >= GUEST_LIMIT ? '请先登录注册' : '再起一卦'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>金钱课起卦</Text>
        <Text style={styles.headerSubtitle}>诚心所至，金石为开</Text>
        {renderGuestHint()}
      </View>

      {!hexagram ? (
        <>
          {renderDivinationProcess()}
          {renderDivinationButton()}
        </>
      ) : (
        renderHexagramResult()
      )}

      {/* 游客引导注册弹窗 */}
      <GuestGuideModal
        visible={showGuideModal}
        onClose={handleCloseModal}
        onLogin={handleLogin}
        remainingCount={Math.max(0, GUEST_LIMIT - guestCount)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.background.light,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: Theme.primary,
  },
  headerTitle: {
    fontSize: Theme.fontSize.xxl,
    fontFamily: Theme.titleFont.bold,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: Theme.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  guestHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 12,
  },
  guestHintWarning: {
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
  },
  guestHintText: {
    fontSize: Theme.fontSize.xs,
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 6,
  },
  guestHintTextWarning: {
    color: '#FF4444',
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  divinationButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Theme.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: Theme.fontSize.xl,
    fontFamily: Theme.titleFont.bold,
    color: '#FFFFFF',
    marginTop: 12,
  },
  buttonSubtext: {
    fontSize: Theme.fontSize.xs,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  processContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  coinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 20,
  },
  coin: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Theme.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Theme.accent,
  },
  coinRevealed: {
    backgroundColor: Theme.background.card,
  },
  coinAnimating: {
    shadowColor: Theme.primary,
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  coinText: {
    fontSize: Theme.fontSize.lg,
    fontFamily: Theme.titleFont.bold,
    color: Theme.text.primary,
  },
  processText: {
    fontSize: Theme.fontSize.md,
    color: Theme.text.secondary,
  },
  resultContainer: {
    flex: 1,
    padding: 20,
  },
  hexagramHeader: {
    alignItems: 'center',
    paddingVertical: 30,
    borderBottomWidth: 1,
    borderBottomColor: Theme.border,
  },
  hexagramSymbol: {
    fontSize: 80,
    marginBottom: 16,
  },
  hexagramName: {
    fontSize: Theme.fontSize.xxl,
    fontFamily: Theme.titleFont.bold,
    color: Theme.text.primary,
    marginBottom: 8,
  },
  hexagramPinyin: {
    fontSize: Theme.fontSize.md,
    color: Theme.text.secondary,
  },
  changedSection: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Theme.border,
  },
  sectionTitle: {
    fontSize: Theme.fontSize.lg,
    fontFamily: Theme.titleFont.bold,
    color: Theme.primary,
    marginBottom: 12,
  },
  changedSymbol: {
    fontSize: 50,
    marginBottom: 8,
  },
  changedName: {
    fontSize: Theme.fontSize.md,
    color: Theme.text.secondary,
  },
  mutualSection: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Theme.border,
  },
  mutualSymbol: {
    fontSize: 50,
    marginBottom: 8,
  },
  mutualName: {
    fontSize: Theme.fontSize.md,
    color: Theme.text.secondary,
  },
  linesSection: {
    paddingVertical: 20,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.border,
  },
  lineLabel: {
    width: 60,
    fontSize: Theme.fontSize.md,
    fontFamily: Theme.titleFont.bold,
    color: Theme.text.primary,
  },
  lineSymbol: {
    flex: 1,
    fontSize: Theme.fontSize.xl,
    textAlign: 'center',
  },
  lineText: {
    width: 80,
    fontSize: Theme.fontSize.sm,
    color: Theme.text.secondary,
    textAlign: 'right',
  },
  guestResultTip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.background.light,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  guestResultTipText: {
    flex: 1,
    fontSize: Theme.fontSize.sm,
    color: Theme.text.secondary,
    marginLeft: 8,
  },
  resetButton: {
    backgroundColor: Theme.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 20,
  },
  resetButtonDisabled: {
    backgroundColor: Theme.background.light,
    opacity: 0.6,
  },
  resetButtonText: {
    fontSize: Theme.fontSize.md,
    fontFamily: Theme.titleFont.bold,
    color: '#FFFFFF',
  },
  detailedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.secondary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  detailedButtonText: {
    fontSize: Theme.fontSize.md,
    fontFamily: Theme.titleFont.bold,
    color: '#FFFFFF',
    marginHorizontal: 8,
  },
  detailedButtonSubtext: {
    fontSize: Theme.fontSize.xs,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});

export default DivinationScreen;
