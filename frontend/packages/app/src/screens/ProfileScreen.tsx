/**
 * 个人中心页面
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {Theme} from '@zhouyi/shared/theme';
import {authService} from '@zhouyi/shared/services/auth';
import {User} from '@zhouyi/shared/types';
import {useNavigation} from '@react-navigation/native';

/**
 * 菜单项组件
 */
interface MenuItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showArrow?: boolean;
  rightElement?: React.ReactNode;
}

function MenuItem({
  icon,
  title,
  subtitle,
  onPress,
  showArrow = true,
  rightElement,
}: MenuItemProps): React.JSX.Element {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <View style={styles.menuIcon}>
          <Icon name={icon as any} size={24} color={Theme.primary} />
        </View>
        <View style={styles.menuContent}>
          <Text style={styles.menuTitle}>{title}</Text>
          {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      <View style={styles.menuItemRight}>
        {rightElement || (showArrow && <Icon name="ios-chevron-forward" size={20} color={Theme.text.secondary} />)}
      </View>
    </TouchableOpacity>
  );
}

/**
 * 个人中心页面组件
 */
function ProfileScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  useEffect(() => {
    loadUserInfo();
  }, []);

  /**
   * 加载用户信息
   */
  const loadUserInfo = async () => {
    try {
      setLoading(true);
      const userInfo = await authService.getCurrentUser();
      setUser(userInfo);

      if (userInfo) {
        const guestStatus = await authService.isGuest();
        setIsGuest(guestStatus);
      }
    } catch (error) {
      console.error('加载用户信息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 跳转到登录页
   */
  const handleLogin = () => {
    navigation.navigate('Login' as never);
  };

  /**
   * 退出登录
   */
  const handleLogout = () => {
    Alert.alert('退出登录', '确定要退出登录吗？', [
      {text: '取消', style: 'cancel'},
      {
        text: '确定',
        style: 'destructive',
        onPress: async () => {
          try {
            await authService.logout();
            // 重新加载用户信息
            await loadUserInfo();
          } catch (error) {
            console.error('退出登录失败:', error);
          }
        },
      },
    ]);
  };

  /**
   * 删除账户
   */
  const handleDeleteAccount = () => {
    Alert.alert(
      '删除账户',
      '删除账户将清空所有数据且无法恢复，确定要删除吗？',
      [
        {text: '取消', style: 'cancel'},
        {
          text: '确定删除',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              '二次确认',
              '此操作不可撤销，请再次确认是否删除账户',
              [
                {text: '取消', style: 'cancel'},
                {
                  text: '确认删除',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await authService.confirmAccountDeletion(true);
                      await authService.logout();
                      await loadUserInfo();
                      Alert.alert('提示', '账户已注销');
                    } catch (error: any) {
                      console.error('删除账户失败:', error);
                      Alert.alert('提示', error.message || '删除账户失败，请稍后重试');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  /**
   * 渲染用户信息卡片
   */
  const renderUserCard = () => {
    if (loading) {
      return (
        <View style={[styles.userCard, styles.loadingCard]}>
          <View style={styles.avatarPlaceholder} />
          <View style={styles.userInfoPlaceholder}>
            <View style={styles.placeholderLine} />
            <View style={[styles.placeholderLine, styles.placeholderShort]} />
          </View>
        </View>
      );
    }

    // 未登录状态
    if (!user) {
      return (
        <View style={styles.userCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarPlaceholder}>
              <Icon name="ios-person" size={40} color={Theme.text.secondary} />
            </View>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>未登录</Text>
            <Text style={styles.userPhone}>登录后享受更多功能</Text>
          </View>
          <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
            <Text style={styles.loginButtonText}>立即登录</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // 已登录状态
    return (
      <View style={styles.userCard}>
        <View style={styles.avatarContainer}>
          {user.avatar ? (
            <Image source={{uri: user.avatar}} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {user.nickname?.charAt(0) || user.phone?.slice(-4) || '用'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {isGuest ? '游客用户' : (user.nickname || '周易学人')}
          </Text>
          <Text style={styles.userPhone}>
            {user.phone
              ? `${user.phone.slice(0, 3)}****${user.phone.slice(-4)}`
              : isGuest
              ? '游客模式'
              : '未绑定手机'}
          </Text>
          <View style={styles.userStats}>
            <View style={styles.userStat}>
              <Text style={styles.userStatValue}>{user.level || 1}</Text>
              <Text style={styles.userStatLabel}>等级</Text>
            </View>
            <View style={styles.userStat}>
              <Text style={styles.userStatValue}>{user.xp || 0}</Text>
              <Text style={styles.userStatLabel}>经验</Text>
            </View>
            <View style={styles.userStat}>
              <Text style={styles.userStatValue}>{user.divinationCount || 0}</Text>
              <Text style={styles.userStatLabel}>起卦</Text>
            </View>
          </View>
        </View>
        {isGuest && (
          <TouchableOpacity style={styles.upgradeButton} onPress={handleLogin}>
            <Text style={styles.upgradeButtonText}>注册登录</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  /**
   * 渲染会员卡片
   */
  const renderMembershipCard = () => {
    // 游客或非会员显示引导开通
    if (!user || isGuest || !user.isMember) {
      return (
        <View style={styles.membershipCard}>
          <View style={styles.membershipInfo}>
            <Icon name="ios-diamond" size={24} color={Theme.secondary} />
            <View style={styles.membershipText}>
              <Text style={styles.membershipTitle}>开通会员</Text>
              <Text style={styles.membershipDesc}>解锁全部功能，享受无限起卦</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.membershipButton} onPress={() => navigation.navigate('Membership' as never)}>
            <Text style={styles.membershipButtonText}>立即开通</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // 会员显示会员信息
    return (
      <TouchableOpacity
        style={[styles.membershipCard, styles.membershipActiveCard]}
        onPress={() => navigation.navigate('Membership' as never)}>
        <View style={styles.membershipInfo}>
          <Icon name="ios-diamond" size={24} color={Theme.secondary} />
          <View style={styles.membershipText}>
            <Text style={styles.membershipTitle}>尊贵会员</Text>
            <Text style={styles.membershipDesc}>
              {user.membershipType === 'year' ? '年度会员' : '月度会员'}
            </Text>
          </View>
        </View>
        <View style={styles.membershipButtonActive}>
          <Text style={styles.membershipButtonTextActive}>查看权益</Text>
          <Icon name="ios-chevron-forward" size={16} color={Theme.secondary} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {renderUserCard()}
      {renderMembershipCard()}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>账号设置</Text>
        {user ? (
          <>
            <MenuItem
              icon="ios-person-outline"
              title="个人资料"
              onPress={() => console.log('个人资料')}
            />
            <MenuItem
              icon="ios-phone-portrait-outline"
              title={user.phone ? '已绑定手机' : '绑定手机'}
              subtitle={user.phone ? `${user.phone.slice(0, 3)}****${user.phone.slice(-4)}` : '未绑定'}
              onPress={() => console.log('手机号')}
            />
            <MenuItem
              icon="ios-shield-checkmark-outline"
              title="账号安全"
              onPress={() => console.log('账号安全')}
            />
          </>
        ) : (
          <MenuItem
            icon="ios-log-in-outline"
            title="登录/注册"
            subtitle="登录后享受更多功能"
            onPress={handleLogin}
          />
        )}
      </View>

      {user && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>会员服务</Text>
          <MenuItem
            icon="ios-receipt-outline"
            title="我的订单"
            subtitle="查看订单记录"
            onPress={() => navigation.navigate('Orders' as never)}
          />
          <MenuItem
            icon="ios-diamond-outline"
            title="会员中心"
            subtitle="开通会员享特权"
            onPress={() => navigation.navigate('Membership' as never)}
          />
        </View>
      )}

      {user && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>应用设置</Text>
          <MenuItem
            icon="ios-notifications-outline"
            title="消息通知"
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{false: Theme.border, true: Theme.primary}}
              />
            }
            onPress={() => setNotificationsEnabled(!notificationsEnabled)}
            showArrow={false}
          />
          <MenuItem
            icon="ios-moon-outline"
            title="深色模式"
            rightElement={
              <Switch
                value={darkModeEnabled}
                onValueChange={setDarkModeEnabled}
                trackColor={{false: Theme.border, true: Theme.primary}}
              />
            }
            onPress={() => setDarkModeEnabled(!darkModeEnabled)}
            showArrow={false}
          />
          <MenuItem
            icon="ios-text-outline"
            title="字体大小"
            subtitle="标准"
            onPress={() => console.log('字体大小')}
          />
          <MenuItem
            icon="ios-language-outline"
            title="语言"
            subtitle="简体中文"
            onPress={() => console.log('语言')}
          />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>其他</Text>
        <MenuItem
          icon="ios-chatbubble-outline"
          title="意见反馈"
          onPress={() => console.log('意见反馈')}
        />
        <MenuItem
          icon="ios-information-circle-outline"
          title="关于我们"
          onPress={() => console.log('关于我们')}
        />
        <MenuItem
          icon="ios-star-outline"
          title="给个好评"
          onPress={() => console.log('给个好评')}
        />
      </View>

      {user && !isGuest && (
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>退出登录</Text>
        </TouchableOpacity>
      )}

      {user && !isGuest && (
        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
          <Text style={styles.deleteButtonText}>注销账户</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.versionText}>周易通 v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.background.light,
  },
  userCard: {
    flexDirection: 'row',
    backgroundColor: Theme.primary,
    padding: 20,
    alignItems: 'center',
  },
  loadingCard: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: Theme.fontSize.xxl,
    fontFamily: Theme.titleFont.bold,
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: Theme.fontSize.xl,
    fontFamily: Theme.titleFont.bold,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userPhone: {
    fontSize: Theme.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 12,
  },
  userStats: {
    flexDirection: 'row',
  },
  userStat: {
    marginRight: 24,
  },
  userStatValue: {
    fontSize: Theme.fontSize.lg,
    fontFamily: Theme.titleFont.bold,
    color: Theme.secondary,
  },
  userStatLabel: {
    fontSize: Theme.fontSize.xs,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  loginButton: {
    backgroundColor: Theme.secondary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  loginButtonText: {
    fontSize: Theme.fontSize.sm,
    fontFamily: Theme.titleFont.medium,
    color: '#FFFFFF',
  },
  upgradeButton: {
    backgroundColor: Theme.secondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginLeft: 12,
  },
  upgradeButtonText: {
    fontSize: Theme.fontSize.sm,
    fontFamily: Theme.titleFont.medium,
    color: '#FFFFFF',
  },
  userInfoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
  },
  placeholderLine: {
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 6,
    marginBottom: 8,
  },
  placeholderShort: {
    width: '60%',
  },
  membershipCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF8DC',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  membershipActiveCard: {
    backgroundColor: Theme.background.light,
    borderWidth: 1,
    borderColor: Theme.secondary,
  },
  membershipInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  membershipText: {
    marginLeft: 12,
  },
  membershipTitle: {
    fontSize: Theme.fontSize.md,
    fontFamily: Theme.titleFont.medium,
    color: Theme.text.primary,
  },
  membershipDesc: {
    fontSize: Theme.fontSize.xs,
    color: Theme.text.secondary,
    marginTop: 2,
  },
  membershipButton: {
    backgroundColor: Theme.secondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  membershipButtonText: {
    fontSize: Theme.fontSize.sm,
    fontFamily: Theme.titleFont.medium,
    color: '#FFFFFF',
  },
  membershipButtonActive: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  membershipButtonTextActive: {
    fontSize: Theme.fontSize.sm,
    fontFamily: Theme.titleFont.medium,
    color: Theme.secondary,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Theme.border,
  },
  sectionTitle: {
    fontSize: Theme.fontSize.sm,
    color: Theme.text.secondary,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Theme.background.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: Theme.fontSize.md,
    color: Theme.text.primary,
  },
  menuSubtitle: {
    fontSize: Theme.fontSize.xs,
    color: Theme.text.secondary,
    marginTop: 2,
  },
  menuItemRight: {
    marginLeft: 12,
  },
  logoutButton: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Theme.border,
  },
  logoutButtonText: {
    fontSize: Theme.fontSize.md,
    color: Theme.text.primary,
  },
  deleteButton: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 0,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  deleteButtonText: {
    fontSize: Theme.fontSize.md,
    color: '#FF4444',
  },
  versionText: {
    fontSize: Theme.fontSize.xs,
    color: Theme.text.secondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default ProfileScreen;
