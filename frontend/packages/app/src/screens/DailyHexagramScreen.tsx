/**
 * 每日一卦页面
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {Theme} from '@zhouyi/shared/theme';
import dayjs from 'dayjs';
import {DailyHexagram} from '@zhouyi/shared/types';

/**
 * 每日一卦页面组件
 */
function DailyHexagramScreen(): React.JSX.Element {
  const [dailyHexagram, setDailyHexagram] = useState<DailyHexagram | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    loadDailyHexagram();
  }, []);

  /**
   * 加载今日卦象
   */
  const loadDailyHexagram = async () => {
    try {
      setLoading(true);
      // TODO: 调用API获取今日卦象
      // const result = await divinationService.getDailyHexagram();

      // 模拟今日卦象数据
      await new Promise(resolve => setTimeout(resolve, 1000));
      setDailyHexagram({
        date: new Date().toISOString(),
        hexagramId: '1',
        hexagramName: '乾为天',
        symbol: '䷀',
        pinyin: 'qián wéi tiān',
        interpretation: {
          overall: '今日运势亨通，有利于开展新计划。保持积极心态，勇往直前，但需注意不要过于刚强，柔中带刚更佳。',
          career: '工作顺利，可能有新的机会出现，把握时机，展现才华。但要注意与同事的关系，不要过于强势。',
          wealth: '财运平稳，宜稳健理财，避免投机。今日不宜进行大额投资，小财可进。',
          relationship: '人际关系和谐，适合拓展社交圈。单身者可能有桃花运，有伴侣者感情更上一层楼。',
          health: '注意劳逸结合，保持良好作息。多进行户外运动，呼吸新鲜空气，对健康有益。',
        },
      });
    } catch (error) {
      console.error('加载每日一卦失败:', error);
      Alert.alert('提示', '加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 分享今日卦象
   */
  const handleShare = async () => {
    if (!dailyHexagram) return;

    setSharing(true);
    try {
      const shareContent = `周易通·每日一卦\n\n${dayjs(dailyHexagram.date).format('YYYY年MM月DD日')}\n${dailyHexagram.symbol} ${dailyHexagram.hexagramName}\n\n${dailyHexagram.interpretation.overall}\n\n下载周易通APP，每日一卦指点迷津`;

      await Share.share({
        message: shareContent,
        title: '每日一卦',
      });
    } catch (error) {
      console.error('分享失败:', error);
    } finally {
      setSharing(false);
    }
  };

  /**
   * 渲染加载状态
   */
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.primary} />
        <Text style={styles.loadingText}>正在为您起卦...</Text>
      </View>
    );
  }

  /**
   * 渲染卦象卡片
   */
  const renderHexagramCard = () => (
    <View style={styles.hexagramCard}>
      <View style={styles.dateRow}>
        <Icon name="ios-calendar-outline" size={20} color={Theme.text.secondary} />
        <Text style={styles.dateText}>
          {dayjs(dailyHexagram!.date).format('YYYY年MM月DD日')}
        </Text>
        <Text style={styles.weekdayText}>
          {
            ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][
              dayjs(dailyHexagram!.date).day()
            ]
          }
        </Text>
      </View>

      <View style={styles.hexagramHeader}>
        <Text style={styles.hexagramSymbol}>{dailyHexagram!.symbol}</Text>
        <Text style={styles.hexagramName}>{dailyHexagram!.hexagramName}</Text>
        <Text style={styles.hexagramPinyin}>{dailyHexagram!.pinyin}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.overallSection}>
        <View style={styles.sectionHeader}>
          <Icon name="ios-bulb-outline" size={24} color={Theme.primary} />
          <Text style={styles.sectionTitle}>整体运势</Text>
        </View>
        <Text style={styles.overallText}>{dailyHexagram!.interpretation.overall}</Text>
      </View>
    </View>
  );

  /**
   * 渲染运势详情卡片
   */
  const renderFortuneCard = (
    title: string,
    icon: string,
    content: string,
    color: string,
  ) => (
    <View style={[styles.fortuneCard, {borderLeftColor: color}]}>
      <View style={styles.fortuneHeader}>
        <View style={[styles.fortuneIcon, {backgroundColor: color + '20'}]}>
          <Icon name={icon as any} size={24} color={color} />
        </View>
        <Text style={styles.fortuneTitle}>{title}</Text>
      </View>
      <Text style={styles.fortuneText}>{content}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>每日一卦</Text>
        <Text style={styles.headerSubtitle}>每日一卦，指点迷津</Text>
      </View>

      {renderHexagramCard()}

      <View style={styles.fortuneSection}>
        <Text style={styles.fortuneSectionTitle}>运势详解</Text>

        {renderFortuneCard(
          '事业运势',
          'ios-briefcase-outline',
          dailyHexagram!.interpretation.career,
          '#4A90E2',
        )}

        {renderFortuneCard(
          '财富运势',
          'ios-cash-outline',
          dailyHexagram!.interpretation.wealth,
          '#F5A623',
        )}

        {renderFortuneCard(
          '人际运势',
          'ios-people-outline',
          dailyHexagram!.interpretation.relationship,
          '#7ED321',
        )}

        {renderFortuneCard(
          '健康运势',
          'ios-heart-outline',
          dailyHexagram!.interpretation.health,
          '#E04F5F',
        )}
      </View>

      <View style={styles.tipCard}>
        <View style={styles.tipHeader}>
          <Icon name="ios-information-circle-outline" size={20} color={Theme.secondary} />
          <Text style={styles.tipTitle}>温馨提示</Text>
        </View>
        <Text style={styles.tipText}>
          每日一卦仅供参考，命运掌握在自己手中。积极向上，努力奋斗，方能改变人生。
        </Text>
      </View>

      <View style={styles.shareCard}>
        <Text style={styles.shareTitle}>分享今日卦象</Text>
        <View style={styles.shareButtons}>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => Alert.alert('提示', '微信分享功能需要集成微信SDK')}>
            <Icon name="ios-logo-wechat" size={24} color="#09BB07" />
            <Text style={styles.shareButtonText}>微信</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Icon name="ios-share-outline" size={24} color={Theme.primary} />
            <Text style={styles.shareButtonText}>更多</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.refreshButton} onPress={loadDailyHexagram}>
        <Icon name="ios-refresh-outline" size={20} color={Theme.primary} />
        <Text style={styles.refreshButtonText}>刷新</Text>
      </TouchableOpacity>
    </ScrollView>
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
    backgroundColor: Theme.background.light,
  },
  loadingText: {
    marginTop: 12,
    fontSize: Theme.fontSize.md,
    color: Theme.text.secondary,
  },
  header: {
    padding: 20,
    backgroundColor: Theme.primary,
  },
  headerTitle: {
    fontSize: Theme.fontSize.xxl,
    fontFamily: Theme.titleFont.bold,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: Theme.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  hexagramCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dateText: {
    fontSize: Theme.fontSize.md,
    color: Theme.text.primary,
    marginLeft: 8,
    marginRight: 12,
  },
  weekdayText: {
    fontSize: Theme.fontSize.sm,
    color: Theme.text.secondary,
    marginLeft: 'auto',
  },
  hexagramHeader: {
    alignItems: 'center',
    paddingVertical: 20,
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
  divider: {
    height: 1,
    backgroundColor: Theme.border,
    marginVertical: 20,
  },
  overallSection: {
    backgroundColor: Theme.background.light,
    borderRadius: 8,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: Theme.fontSize.lg,
    fontFamily: Theme.titleFont.medium,
    color: Theme.text.primary,
    marginLeft: 8,
  },
  overallText: {
    fontSize: Theme.fontSize.md,
    color: Theme.text.secondary,
    lineHeight: 24,
  },
  fortuneSection: {
    paddingHorizontal: 16,
  },
  fortuneSectionTitle: {
    fontSize: Theme.fontSize.lg,
    fontFamily: Theme.titleFont.medium,
    color: Theme.text.primary,
    marginBottom: 12,
    marginLeft: 4,
  },
  fortuneCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  fortuneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  fortuneIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fortuneTitle: {
    fontSize: Theme.fontSize.lg,
    fontFamily: Theme.titleFont.medium,
    color: Theme.text.primary,
  },
  fortuneText: {
    fontSize: Theme.fontSize.md,
    color: Theme.text.secondary,
    lineHeight: 22,
  },
  tipCard: {
    backgroundColor: '#FFF8DC',
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipTitle: {
    fontSize: Theme.fontSize.md,
    fontFamily: Theme.titleFont.medium,
    color: Theme.accent,
    marginLeft: 8,
  },
  tipText: {
    fontSize: Theme.fontSize.sm,
    color: Theme.text.secondary,
    lineHeight: 20,
  },
  shareCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  shareTitle: {
    fontSize: Theme.fontSize.lg,
    fontFamily: Theme.titleFont.medium,
    color: Theme.text.primary,
    marginBottom: 16,
  },
  shareButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  shareButton: {
    alignItems: 'center',
    padding: 12,
    flex: 1,
  },
  shareButtonText: {
    fontSize: Theme.fontSize.sm,
    color: Theme.text.secondary,
    marginTop: 8,
  },
  refreshButton: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 0,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButtonText: {
    fontSize: Theme.fontSize.md,
    fontFamily: Theme.titleFont.medium,
    color: Theme.primary,
    marginLeft: 8,
  },
});

export default DailyHexagramScreen;
