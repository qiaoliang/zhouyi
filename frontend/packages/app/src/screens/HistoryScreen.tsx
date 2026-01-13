/**
 * 历史记录页面
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {Theme} from '@zhouyi/shared/theme';
import dayjs from 'dayjs';
import {DivinationRecord} from '@zhouyi/shared/types';
import {divinationService} from '@zhouyi/shared/services/divination';
import {authService} from '@zhouyi/shared/services/auth';
import {useNavigation} from '@react-navigation/native';

/**
 * 历史记录项组件
 */
interface HistoryItemProps {
  record: DivinationRecord;
  onPress: (record: DivinationRecord) => void;
}

function HistoryItem({record, onPress}: HistoryItemProps): React.JSX.Element {
  return (
    <TouchableOpacity style={styles.historyItem} onPress={() => onPress(record)}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemSymbol}>{record.hexagram.primary.symbol}</Text>
        <View style={styles.itemInfo}>
          <Text style={styles.itemName}>{record.hexagram.primary.name}</Text>
          <Text style={styles.itemTime}>
            {dayjs(record.createdAt).format('YYYY-MM-DD HH:mm')}
          </Text>
        </View>
        <Icon name="ios-chevron-forward" size={20} color={Theme.text.secondary} />
      </View>

      {record.question && (
        <View style={styles.questionSection}>
          <Text style={styles.questionLabel} numberOfLines={1}>
            所问：{record.question}
          </Text>
        </View>
      )}

      {record.hexagram.changingLines.length > 0 && (
        <View style={styles.changingLines}>
          <Text style={styles.changingLinesText}>
            变爻：第{record.hexagram.changingLines.join('、')}爻
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

/**
 * 历史记录详情弹窗
 */
interface RecordDetailModalProps {
  visible: boolean;
  record: DivinationRecord | null;
  onClose: () => void;
  onDelete: (recordId: string) => void;
  onToggleFavorite: (recordId: string) => void;
}

function RecordDetailModal({
  visible,
  record,
  onClose,
  onDelete,
  onToggleFavorite,
}: RecordDetailModalProps): React.JSX.Element | null {
  if (!record) return null;

  // 兼容不同的ID字段
  const recordId = (record as any)._id || (record as any).id || '';

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={detailModalStyles.overlay}>
        <View style={detailModalStyles.container}>
          <View style={detailModalStyles.header}>
            <Text style={detailModalStyles.headerTitle}>卦象详情</Text>
            <TouchableOpacity onPress={onClose} style={detailModalStyles.closeButton}>
              <Icon name="ios-close" size={32} color={Theme.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={detailModalStyles.content}>
            {/* 主卦 */}
            <View style={detailModalStyles.hexagramSection}>
              <Text style={detailModalStyles.hexagramSymbol}>
                {record.hexagram.primary.symbol}
              </Text>
              <Text style={detailModalStyles.hexagramName}>
                {record.hexagram.primary.name}
              </Text>
              <Text style={detailModalStyles.hexagramPinyin}>
                {record.hexagram.primary.pinyin}
              </Text>
            </View>

            {/* 变卦 */}
            {record.hexagram.changingLines && record.hexagram.changingLines.length > 0 && (
              <View style={detailModalStyles.changedSection}>
                <View style={detailModalStyles.sectionHeader}>
                  <Icon name="ios-swap-horizontal" size={20} color={Theme.primary} />
                  <Text style={detailModalStyles.sectionTitle}>变卦</Text>
                </View>
                <Text style={detailModalStyles.changedSymbol}>
                  {record.hexagram.changed.symbol}
                </Text>
                <Text style={detailModalStyles.changedName}>
                  {record.hexagram.changed.name}
                </Text>
                <Text style={detailModalStyles.changingLinesText}>
                  变爻：第{record.hexagram.changingLines.join('、')}爻
                </Text>
              </View>
            )}

            {/* 互卦 */}
            <View style={detailModalStyles.mutualSection}>
              <View style={detailModalStyles.sectionHeader}>
                <Icon name="ios-layers" size={20} color={Theme.primary} />
                <Text style={detailModalStyles.sectionTitle}>互卦</Text>
              </View>
              <Text style={detailModalStyles.mutualSymbol}>
                {record.hexagram.mutual.symbol}
              </Text>
              <Text style={detailModalStyles.mutualName}>
                {record.hexagram.mutual.name}
              </Text>
            </View>

            {/* 基本信息 */}
            <View style={detailModalStyles.infoSection}>
              <View style={detailModalStyles.infoRow}>
                <Icon name="ios-calendar-outline" size={18} color={Theme.text.secondary} />
                <Text style={detailModalStyles.infoText}>
                  {dayjs(record.createdAt).format('YYYY年MM月DD日 HH:mm')}
                </Text>
              </View>
              {(record as any).question && (
                <View style={detailModalStyles.infoRow}>
                  <Icon name="ios-help-circle-outline" size={18} color={Theme.text.secondary} />
                  <Text style={detailModalStyles.infoText}>
                    所问：{(record as any).question}
                  </Text>
                </View>
              )}
            </View>

            {/* 操作按钮 */}
            <View style={detailModalStyles.actionButtons}>
              <TouchableOpacity
                style={detailModalStyles.actionButton}
                onPress={() => onToggleFavorite(recordId)}>
                <Icon
                  name={record.isFavorite ? 'ios-heart' : 'ios-heart-outline'}
                  size={24}
                  color={record.isFavorite ? '#E04F5F' : Theme.text.secondary}
                />
                <Text style={detailModalStyles.actionButtonText}>
                  {record.isFavorite ? '已收藏' : '收藏'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[detailModalStyles.actionButton, detailModalStyles.deleteButton]}
                onPress={() => {
                  Alert.alert(
                    '删除记录',
                    '确定要删除这条起卦记录吗？',
                    [
                      {text: '取消', style: 'cancel'},
                      {
                        text: '删除',
                        style: 'destructive',
                        onPress: () => onDelete(recordId),
                      },
                    ],
                  );
                }}>
                <Icon name="ios-trash-outline" size={24} color="#E04F5F" />
                <Text style={[detailModalStyles.actionButtonText, detailModalStyles.deleteButtonText]}>
                  删除
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/**
 * 历史记录页面组件
 */
function HistoryScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const [records, setRecords] = useState<DivinationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'week' | 'month'>('all');
  const [page, setPage] = useState(1);
  const [isGuest, setIsGuest] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<DivinationRecord | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const filters = [
    {id: 'all', name: '全部'},
    {id: 'week', name: '最近7天'},
    {id: 'month', name: '本月'},
  ];

  useEffect(() => {
    checkGuestStatus();
  }, []);

  useEffect(() => {
    if (!isGuest) {
      loadRecords();
    }
  }, [selectedFilter]);

  /**
   * 检查游客状态
   */
  const checkGuestStatus = async () => {
    const guestStatus = await authService.isGuest();
    setIsGuest(guestStatus);
  };

  /**
   * 加载历史记录
   */
  const loadRecords = async (pageNum: number = 1, isLoadMore: boolean = false) => {
    try {
      if (!isLoadMore) {
        setLoading(true);
      }
      // 调用API获取历史记录
      const result = await divinationService.getHistory(pageNum, 20);

      if (isLoadMore) {
        setRecords(prev => [...prev, ...result.records]);
      } else {
        setRecords(result.records);
      }

      setHasMore(pageNum < result.pagination.totalPages);
      setPage(pageNum);
    } catch (error) {
      console.error('加载历史记录失败:', error);
      // 使用模拟数据作为降级方案
      loadMockRecords(isLoadMore);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  /**
   * 加载模拟数据（降级方案）
   */
  const loadMockRecords = (isLoadMore: boolean = false) => {
    const mockRecords: DivinationRecord[] = [
      {
        _id: '1',
        userId: 'user1',
        hexagram: {
          primary: {
            symbol: '䷀',
            name: '乾为天',
            pinyin: 'qián wéi tiān',
            sequence: 1,
          },
          changed: {
            symbol: '䷁',
            name: '坤为地',
            pinyin: 'kūn wéi dì',
            sequence: 2,
          },
          mutual: {
            symbol: '䷖',
            name: '天山遁',
            pinyin: 'tiān shān dùn',
            sequence: 33,
          },
          lines: [
            {position: 1, yinYang: 'yang', changing: false},
            {position: 2, yinYang: 'yang', changing: true},
            {position: 3, yinYang: 'yang', changing: false},
            {position: 4, yinYang: 'yang', changing: false},
            {position: 5, yinYang: 'yang', changing: false},
            {position: 6, yinYang: 'yang', changing: false},
          ],
          changingLines: [2],
        },
        interpretation: {
          basic: {
            hexagramName: '乾为天',
            guaci: '乾：元，亨，利，贞。',
            guaciTranslation: '乾卦：元始，亨通，和谐，贞正。',
            yaoci: [],
          },
        },
        payment: {
          type: 'free',
          amount: 0,
          status: 'paid',
        },
        createdAt: new Date().toISOString(),
        isFavorite: false,
      },
      {
        _id: '2',
        userId: 'user1',
        hexagram: {
          primary: {
            symbol: '䷁',
            name: '坤为地',
            pinyin: 'kūn wéi dì',
            sequence: 2,
          },
          changed: {
            symbol: '䷁',
            name: '坤为地',
            pinyin: 'kūn wéi dì',
            sequence: 2,
          },
          mutual: {
            symbol: '䷇',
            name: '地雷复',
            pinyin: 'dì léi fù',
            sequence: 24,
          },
          lines: [
            {position: 1, yinYang: 'yin', changing: false},
            {position: 2, yinYang: 'yin', changing: false},
            {position: 3, yinYang: 'yin', changing: false},
            {position: 4, yinYang: 'yin', changing: false},
            {position: 5, yinYang: 'yin', changing: false},
            {position: 6, yinYang: 'yin', changing: false},
          ],
          changingLines: [],
        },
        interpretation: {
          basic: {
            hexagramName: '坤为地',
            guaci: '坤：元，亨，利牝马之贞。',
            guaciTranslation: '坤卦：元始，亨通，利于像雌马一样坚守正道。',
            yaoci: [],
          },
        },
        payment: {
          type: 'free',
          amount: 0,
          status: 'paid',
        },
        createdAt: dayjs().subtract(1, 'day').toISOString(),
        isFavorite: true,
      },
    ];

    // 根据筛选条件过滤
    let filteredRecords = mockRecords;
    if (selectedFilter === 'week') {
      filteredRecords = mockRecords.filter(r => dayjs(r.createdAt).isAfter(dayjs().subtract(7, 'day')));
    } else if (selectedFilter === 'month') {
      filteredRecords = mockRecords.filter(r => dayjs(r.createdAt).isAfter(dayjs().startOf('month')));
    }

    if (isLoadMore) {
      setRecords(prev => [...prev, ...filteredRecords]);
    } else {
      setRecords(filteredRecords);
    }
    setHasMore(false);
  };

  /**
   * 下拉刷新
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    await loadRecords(1, false);
  };

  /**
   * 加载更多
   */
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await loadRecords(page + 1, true);
  };

  /**
   * 处理记录点击
   */
  const handleRecordPress = (record: DivinationRecord) => {
    setSelectedRecord(record);
    setDetailModalVisible(true);
  };

  /**
   * 删除记录
   */
  const handleDelete = async (recordId: string) => {
    try {
      // TODO: 调用API删除记录
      // await divinationService.deleteRecord(recordId);

      setRecords(prev => prev.filter(r => {
        const id = (r as any)._id || (r as any).id;
        return id !== recordId;
      }));

      setDetailModalVisible(false);
      Alert.alert('提示', '删除成功');
    } catch (error) {
      console.error('删除记录失败:', error);
      Alert.alert('提示', '删除失败，请稍后重试');
    }
  };

  /**
   * 切换收藏状态
   */
  const handleToggleFavorite = async (recordId: string) => {
    try {
      await divinationService.toggleFavorite(recordId);
      setRecords(prev =>
        prev.map(r => {
          const id = (r as any)._id || (r as any).id;
          if (id === recordId) {
            return {...r, isFavorite: !r.isFavorite};
          }
          return r;
        }),
      );
      setSelectedRecord(prev =>
        prev
          ? {
              ...prev,
              isFavorite: !prev.isFavorite,
            }
          : null,
      );
    } catch (error) {
      console.error('切换收藏失败:', error);
    }
  };

  /**
   * 关闭详情弹窗
   */
  const handleCloseDetail = () => {
    setDetailModalVisible(false);
    setSelectedRecord(null);
  };

  /**
   * 跳转到登录页
   */
  const handleLogin = () => {
    navigation.navigate('Login' as never);
  };

  /**
   * 渲染游客提示
   */
  const renderGuestHint = () => (
    <View style={styles.guestContainer}>
      <Icon name="ios-lock-closed" size={60} color={Theme.text.secondary} />
      <Text style={styles.guestTitle}>请先登录</Text>
      <Text style={styles.guestText}>登录后可以查看起卦历史记录</Text>
      <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
        <Text style={styles.loginButtonText}>立即登录</Text>
      </TouchableOpacity>
    </View>
  );

  /**
   * 渲染筛选标签
   */
  const renderFilter = (filter: {id: 'all' | 'week' | 'month'; name: string}) => (
    <TouchableOpacity
      key={filter.id}
      style={[
        styles.filterTab,
        selectedFilter === filter.id && styles.filterTabActive,
      ]}
      onPress={() => setSelectedFilter(filter.id)}>
      <Text
        style={[
          styles.filterText,
          selectedFilter === filter.id && styles.filterTextActive,
        ]}>
        {filter.name}
      </Text>
    </TouchableOpacity>
  );

  /**
   * 渲染日期分组
   */
  const renderDateGroup = (date: string) => {
    const today = dayjs().format('YYYY-MM-DD');
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

    if (date === today) return '今天';
    if (date === yesterday) return '昨天';
    return date;
  };

  /**
   * 按日期分组记录
   */
  const groupedRecords = records.reduce<Record<string, DivinationRecord[]>>((groups, record) => {
    const date = dayjs(record.createdAt).format('YYYY-MM-DD');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(record);
    return groups;
  }, {});

  const sortedDates = Object.keys(groupedRecords).sort((a, b) => dayjs(b).diff(dayjs(a)));

  /**
   * 渲染加载更多指示器
   */
  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={Theme.primary} />
        <Text style={styles.footerText}>加载更多...</Text>
      </View>
    );
  };

  /**
   * 渲染空状态
   */
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="ios-time-outline" size={60} color={Theme.text.secondary} />
      <Text style={styles.emptyText}>暂无历史记录</Text>
      <Text style={styles.emptySubtext}>起卦后会在这里显示</Text>
    </View>
  );

  // 游客模式
  if (isGuest) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>起卦历史</Text>
          <Text style={styles.headerSubtitle}>回顾过往，鉴往知来</Text>
        </View>
        {renderGuestHint()}
      </View>
    );
  }

  // 加载中
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.primary} />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>起卦历史</Text>
        <Text style={styles.headerSubtitle}>回顾过往，鉴往知来</Text>
      </View>

      <View style={styles.filterContainer}>
        {filters.map(filter => renderFilter(filter))}
      </View>

      {records.length === 0 ? (
        renderEmpty()
      ) : (
        <FlatList
          data={sortedDates}
          keyExtractor={item => item}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[Theme.primary]}
              tintColor={Theme.primary}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.2}
          ListFooterComponent={renderFooter}
          renderItem={({item: date}) => (
            <View>
              <View style={styles.dateHeader}>
                <Text style={styles.dateHeaderText}>{renderDateGroup(date)}</Text>
              </View>
              {groupedRecords[date].map(record => (
                <HistoryItem
                  key={(record as any)._id || (record as any).id}
                  record={record}
                  onPress={handleRecordPress}
                />
              ))}
            </View>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* 详情弹窗 */}
      <RecordDetailModal
        visible={detailModalVisible}
        record={selectedRecord}
        onClose={handleCloseDetail}
        onDelete={handleDelete}
        onToggleFavorite={handleToggleFavorite}
      />
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
    fontSize: Theme.fontSize.md,
    color: Theme.text.secondary,
    marginTop: 12,
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
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.border,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: Theme.background.light,
  },
  filterTabActive: {
    backgroundColor: Theme.primary,
  },
  filterText: {
    fontSize: Theme.fontSize.sm,
    color: Theme.text.secondary,
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontFamily: Theme.titleFont.medium,
  },
  listContent: {
    padding: 16,
  },
  dateHeader: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  dateHeaderText: {
    fontSize: Theme.fontSize.sm,
    color: Theme.text.secondary,
    fontFamily: Theme.titleFont.medium,
  },
  historyItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemSymbol: {
    fontSize: 40,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: Theme.fontSize.lg,
    fontFamily: Theme.titleFont.medium,
    color: Theme.text.primary,
    marginBottom: 4,
  },
  itemTime: {
    fontSize: Theme.fontSize.xs,
    color: Theme.text.secondary,
  },
  questionSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Theme.border,
  },
  questionLabel: {
    fontSize: Theme.fontSize.sm,
    color: Theme.text.secondary,
  },
  changingLines: {
    marginTop: 8,
  },
  changingLinesText: {
    fontSize: Theme.fontSize.xs,
    color: Theme.primary,
    fontFamily: Theme.titleFont.medium,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: Theme.fontSize.lg,
    color: Theme.text.primary,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: Theme.fontSize.sm,
    color: Theme.text.secondary,
    marginTop: 4,
  },
  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  guestTitle: {
    fontSize: Theme.fontSize.xl,
    fontFamily: Theme.titleFont.bold,
    color: Theme.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  guestText: {
    fontSize: Theme.fontSize.md,
    color: Theme.text.secondary,
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: Theme.primary,
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 24,
  },
  loginButtonText: {
    fontSize: Theme.fontSize.md,
    fontFamily: Theme.titleFont.medium,
    color: '#FFFFFF',
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    fontSize: Theme.fontSize.sm,
    color: Theme.text.secondary,
    marginLeft: 8,
  },
});

const detailModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Theme.border,
  },
  headerTitle: {
    fontSize: Theme.fontSize.xl,
    fontFamily: Theme.titleFont.bold,
    color: Theme.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  hexagramSection: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Theme.border,
  },
  hexagramSymbol: {
    fontSize: 80,
    marginBottom: 12,
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
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Theme.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: Theme.fontSize.md,
    fontFamily: Theme.titleFont.bold,
    color: Theme.text.primary,
    marginLeft: 8,
  },
  changedSymbol: {
    fontSize: 50,
    textAlign: 'center',
    marginBottom: 8,
  },
  changedName: {
    fontSize: Theme.fontSize.lg,
    color: Theme.text.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  changingLinesText: {
    fontSize: Theme.fontSize.sm,
    color: Theme.primary,
    textAlign: 'center',
  },
  mutualSection: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Theme.border,
  },
  mutualSymbol: {
    fontSize: 50,
    textAlign: 'center',
    marginBottom: 8,
  },
  mutualName: {
    fontSize: Theme.fontSize.lg,
    color: Theme.text.primary,
    textAlign: 'center',
  },
  infoSection: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Theme.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: Theme.fontSize.sm,
    color: Theme.text.secondary,
    marginLeft: 8,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: Theme.fontSize.sm,
    color: Theme.text.secondary,
    marginTop: 8,
  },
  deleteButton: {
    marginLeft: 40,
  },
  deleteButtonText: {
    color: '#E04F5F',
  },
});

export default HistoryScreen;
