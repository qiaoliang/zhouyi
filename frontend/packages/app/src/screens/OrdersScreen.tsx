/**
 * 订单管理页面
 */

import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  FlatList,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {membershipService, Order, OrderStatus, OrderType} from '@zhouyi/shared/services/membership';
import {useAuth} from '../contexts/AuthContext';
import {RootStackNavigationProp} from '../navigation/types';

/**
 * 订单状态配置
 */
const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  {label: string; color: string; bgColor: string; icon: string}
> = {
  [OrderStatus.CREATED]: {
    label: '待支付',
    color: '#FF9800',
    bgColor: '#FFF3E0',
    icon: 'ios-time',
  },
  [OrderStatus.PAID]: {
    label: '已支付',
    color: '#4CAF50',
    bgColor: '#E8F5E9',
    icon: 'ios-checkmark-circle',
  },
  [OrderStatus.CANCELLED]: {
    label: '已取消',
    color: '#9E9E9E',
    bgColor: '#F5F5F5',
    icon: 'ios-close-circle',
  },
  [OrderStatus.REFUNDED]: {
    label: '已退款',
    color: '#F44336',
    bgColor: '#FFEBEE',
    icon: 'ios-return-down-back',
  },
};

/**
 * 订单类型配置
 */
const ORDER_TYPE_CONFIG: Record<OrderType, {label: string; icon: string}> = {
  [OrderType.MEMBERSHIP_MONTHLY]: {
    label: '月度会员',
    icon: 'ios-calendar',
  },
  [OrderType.MEMBERSHIP_YEARLY]: {
    label: '年度会员',
    icon: 'ios-calendar-outline',
  },
  [OrderType.SINGLE_DIVINATION]: {
    label: '单次解卦',
    icon: 'ios-book-outline',
  },
};

interface Props {
  navigation: RootStackNavigationProp<'Orders'>;
}

/**
 * 订单卡片组件
 */
interface OrderCardProps {
  order: Order;
  onPress: (order: Order) => void;
  onCancel: (order: Order) => void;
  onPay: (order: Order) => void;
}

function OrderCard({order, onPress, onCancel, onPay}: OrderCardProps): React.JSX.Element {
  const statusConfig = ORDER_STATUS_CONFIG[order.status];
  const typeConfig = ORDER_TYPE_CONFIG[order.type];

  const canCancel = order.status === OrderStatus.CREATED;
  const canPay = order.status === OrderStatus.CREATED;

  /**
   * 格式化时间
   */
  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  };

  /**
   * 处理取消订单
   */
  const handleCancel = () => {
    Alert.alert('取消订单', '确定要取消此订单吗？', [
      {text: '取消', style: 'cancel'},
      {
        text: '确定',
        style: 'destructive',
        onPress: () => onCancel(order),
      },
    ]);
  };

  /**
   * 处理支付订单
   */
  const handlePay = () => {
    onPay(order);
  };

  return (
    <TouchableOpacity style={styles.orderCard} onPress={() => onPress(order)} activeOpacity={0.7}>
      <View style={styles.orderCardHeader}>
        <View style={styles.orderTypeContainer}>
          <Icon name={typeConfig.icon as any} size={20} color="#C8102E" />
          <Text style={styles.orderTypeText}>{typeConfig.label}</Text>
        </View>
        <View style={[styles.orderStatusBadge, {backgroundColor: statusConfig.bgColor}]}>
          <Icon name={statusConfig.icon as any} size={14} color={statusConfig.color} />
          <Text style={[styles.orderStatusText, {color: statusConfig.color}]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      <View style={styles.orderCardBody}>
        <View style={styles.orderInfoRow}>
          <Text style={styles.orderInfoLabel}>订单编号</Text>
          <Text style={styles.orderInfoValue} numberOfLines={1}>
            {order.id}
          </Text>
        </View>

        <View style={styles.orderInfoRow}>
          <Text style={styles.orderInfoLabel}>订单金额</Text>
          <Text style={styles.orderAmount}>¥{order.amount.toFixed(2)}</Text>
        </View>

        <View style={styles.orderInfoRow}>
          <Text style={styles.orderInfoLabel}>创建时间</Text>
          <Text style={styles.orderInfoValue}>{formatTime(order.createdAt)}</Text>
        </View>

        {order.paidAt && (
          <View style={styles.orderInfoRow}>
            <Text style={styles.orderInfoLabel}>支付时间</Text>
            <Text style={styles.orderInfoValue}>{formatTime(order.paidAt)}</Text>
          </View>
        )}

        {order.transactionId && (
          <View style={styles.orderInfoRow}>
            <Text style={styles.orderInfoLabel}>交易单号</Text>
            <Text style={styles.orderInfoValue} numberOfLines={1}>
              {order.transactionId}
            </Text>
          </View>
        )}
      </View>

      {(canCancel || canPay) && (
        <View style={styles.orderCardFooter}>
          {canCancel && (
            <TouchableOpacity
              style={[styles.orderActionButton, styles.orderCancelButton]}
              onPress={handleCancel}>
              <Text style={styles.orderCancelButtonText}>取消订单</Text>
            </TouchableOpacity>
          )}
          {canPay && (
            <TouchableOpacity
              style={[styles.orderActionButton, styles.orderPayButton]}
              onPress={handlePay}>
              <Text style={styles.orderPayButtonText}>立即支付</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

/**
 * 订单筛选选项
 */
interface FilterOption {
  label: string;
  value: OrderStatus | 'all';
}

const FILTER_OPTIONS: FilterOption[] = [
  {label: '全部', value: 'all'},
  {label: '待支付', value: OrderStatus.CREATED},
  {label: '已支付', value: OrderStatus.PAID},
  {label: '已取消', value: OrderStatus.CANCELLED},
  {label: '已退款', value: OrderStatus.REFUNDED},
];

/**
 * 订单管理页面组件
 */
function OrdersScreen({navigation}: Props): React.JSX.Element {
  const {user} = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<OrderStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: '我的订单',
    });
    loadOrders();
  }, []);

  /**
   * 加载订单列表
   */
  const loadOrders = async (page: number = 1, status?: OrderStatus | 'all') => {
    try {
      if (page === 1) {
        setLoading(true);
      }

      const params: {page: number; limit: number; status?: OrderStatus} = {
        page,
        limit: 20,
      };

      if (status && status !== 'all') {
        params.status = status;
      }

      const response = await membershipService.getUserOrders(params);

      if (page === 1) {
        setOrders(response.orders);
      } else {
        setOrders(prev => [...prev, ...response.orders]);
      }

      setTotal(response.total);
      setHasMore(response.orders.length === 20);
      setCurrentPage(page);
    } catch (error) {
      console.error('加载订单失败:', error);
      Alert.alert('错误', '加载订单失败，请稍后重试');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  /**
   * 下拉刷新
   */
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOrders(1, selectedFilter);
  };

  /**
   * 加载更多
   */
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) {
      return;
    }

    setLoadingMore(true);
    await loadOrders(currentPage + 1, selectedFilter);
  };

  /**
   * 筛选订单
   */
  const handleFilterChange = async (filter: OrderStatus | 'all') => {
    setSelectedFilter(filter);
    await loadOrders(1, filter);
  };

  /**
   * 查看订单详情
   */
  const handleOrderPress = (order: Order) => {
    Alert.alert('订单详情', `订单号：${order.id}\n金额：¥${order.amount}\n状态：${ORDER_STATUS_CONFIG[order.status].label}`);
  };

  /**
   * 取消订单
   */
  const handleCancelOrder = async (order: Order) => {
    try {
      await membershipService.cancelOrder(order.id);
      Alert.alert('成功', '订单已取消', [
        {
          text: '确定',
          onPress: () => loadOrders(1, selectedFilter),
        },
      ]);
    } catch (error: any) {
      console.error('取消订单失败:', error);
      Alert.alert('错误', error.response?.data?.message || '取消订单失败，请稍后重试');
    }
  };

  /**
   * 支付订单
   */
  const handlePayOrder = (order: Order) => {
    // TODO: 跳转到支付页面或显示支付模态框
    Alert.alert('支付', `即将支付订单 ${order.id}，金额 ¥${order.amount}`);
  };

  /**
   * 渲染筛选器
   */
  const renderFilter = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterContainer}
      contentContainerStyle={styles.filterContentContainer}>
      {FILTER_OPTIONS.map(option => {
        const isSelected = selectedFilter === option.value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.filterChip,
              isSelected && styles.filterChipSelected,
            ]}
            onPress={() => handleFilterChange(option.value)}>
            <Text
              style={[
                styles.filterChipText,
                isSelected && styles.filterChipTextSelected,
              ]}>
              {option.label}
            </Text>
            {isSelected && <View style={styles.filterChipIndicator} />}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  /**
   * 渲染订单项
   */
  const renderItem = useCallback(
    ({item}: {item: Order}) => (
      <OrderCard
        order={item}
        onPress={handleOrderPress}
        onCancel={handleCancelOrder}
        onPay={handlePayOrder}
      />
    ),
    [selectedFilter],
  );

  /**
   * 渲染列表头部
   */
  const ListHeader = useCallback(
    () => (
      <>
        {renderFilter()}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryText}>共 {total} 笔订单</Text>
        </View>
      </>
    ),
    [selectedFilter, total],
  );

  /**
   * 渲染列表尾部
   */
  const ListFooter = useCallback(() => {
    if (!loadingMore) {
      return null;
    }
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#C8102E" />
        <Text style={styles.footerLoaderText}>加载中...</Text>
      </View>
    );
  }, [loadingMore]);

  /**
   * 渲染空状态
   */
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon name="ios-document-text-outline" size={80} color="#E0E0E0" />
      <Text style={styles.emptyTitle}>暂无订单</Text>
      <Text style={styles.emptyDesc}>您还没有任何订单记录</Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => navigation.goBack()}>
        <Text style={styles.emptyButtonText}>去逛逛</Text>
      </TouchableOpacity>
    </View>
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
      <FlatList
        data={orders}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={!loading && orders.length === 0 ? renderEmptyState : null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#C8102E']}
            tintColor="#C8102E"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.2}
        contentContainerStyle={orders.length === 0 ? styles.emptyListContent : styles.listContent}
        showsVerticalScrollIndicator={false}
      />
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
  filterContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterContentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterChipSelected: {
    backgroundColor: '#FFF5F5',
    borderColor: '#C8102E',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  filterChipTextSelected: {
    color: '#C8102E',
    fontWeight: 'bold',
  },
  filterChipIndicator: {
    position: 'absolute',
    bottom: 2,
    left: '50%',
    transform: [{translateX: -50}],
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#C8102E',
  },
  summaryContainer: {
    backgroundColor: '#F5F5DC',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  emptyListContent: {
    flex: 1,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  orderTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderTypeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  orderStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  orderStatusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  orderCardBody: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  orderInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderInfoLabel: {
    fontSize: 14,
    color: '#666',
  },
  orderInfoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  orderAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#C8102E',
  },
  orderCardFooter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  orderActionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  orderCancelButton: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  orderCancelButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  orderPayButton: {
    backgroundColor: '#C8102E',
  },
  orderPayButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  footerLoaderText: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 24,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#999',
    marginBottom: 32,
  },
  emptyButton: {
    backgroundColor: '#C8102E',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default OrdersScreen;
