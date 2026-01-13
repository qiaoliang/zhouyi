/**
 * 周易通APP主入口
 */

import React, {useEffect, useState} from 'react';
import {StatusBar, useColorScheme, View, StyleSheet} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';

// 主题
import {Theme, Colors} from '@zhouyi/shared/theme';

// 配置
import {WECHAT_CONFIG} from './config/app.config';

// 服务
import {authService} from '@zhouyi/shared/services/auth';
import {initWeChat} from '@zhouyi/shared/services/wechat';

// 屏幕
import LoginScreen from './screens/LoginScreen';
import DivinationScreen from './screens/DivinationScreen';
import LearningScreen from './screens/LearningScreen';
import DailyHexagramScreen from './screens/DailyHexagramScreen';
import HistoryScreen from './screens/HistoryScreen';
import ProfileScreen from './screens/ProfileScreen';
import OrdersScreen from './screens/OrdersScreen';
import MembershipScreen from './screens/MembershipScreen';
import DetailedDivinationScreen from './screens/DetailedDivinationScreen';

// 类型
import {RootStackParamList, MainTabParamList} from './navigation/types';

/**
 * 堆栈导航器
 */
const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * 底部标签导航器
 */
const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * 主标签导航
 */
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        tabBarIcon: ({focused, color, size}) => {
          let iconName: string;

          if (route.name === 'Divination') {
            iconName = focused ? 'ios-compass' : 'ios-compass-outline';
          } else if (route.name === 'Learning') {
            iconName = focused ? 'ios-book' : 'ios-book-outline';
          } else if (route.name === 'Daily') {
            iconName = focused ? 'ios-sunny' : 'ios-sunny-outline';
          } else if (route.name === 'History') {
            iconName = focused ? 'ios-time' : 'ios-time-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'ios-person' : 'ios-person-outline';
          } else {
            iconName = 'ios-circle';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: Theme.primary,
        tabBarInactiveTintColor: Colors.text.secondary,
        tabBarStyle: {
          backgroundColor: Theme.background.card,
          borderTopColor: Theme.border,
          borderTopWidth: 1,
          paddingBottom: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: Theme.fontSize.xs,
          fontWeight: '500',
        },
        headerShown: false,
      })}>
      <Tab.Screen
        name="Divination"
        component={DivinationScreen}
        options={{tabBarLabel: '卜卦'}}
      />
      <Tab.Screen
        name="Learning"
        component={LearningScreen}
        options={{tabBarLabel: '学习'}}
      />
      <Tab.Screen
        name="Daily"
        component={DailyHexagramScreen}
        options={{tabBarLabel: '每日一卦'}}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{tabBarLabel: '历史'}}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{tabBarLabel: '我的'}}
      />
    </Tab.Navigator>
  );
}

/**
 * 根导航器
 */
function RootStack(): React.JSX.Element {
  return (
    <Stack.Navigator
      initialRouteName="Main"
      screenOptions={{
        headerStyle: {
          backgroundColor: Theme.primary,
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontFamily: Theme.titleFont.regular,
          fontSize: Theme.fontSize.md,
        },
        headerBackTitle: '返回',
      }}>
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{headerShown: false, gestureEnabled: false}}
      />
      <Stack.Screen
        name="Main"
        component={MainTabs}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          headerTitle: '我的订单',
          headerBackTitle: '返回',
        }}
      />
      <Stack.Screen
        name="Membership"
        component={MembershipScreen}
        options={{
          headerTitle: '会员中心',
          headerBackTitle: '返回',
        }}
      />
      <Stack.Screen
        name="DetailedDivination"
        component={DetailedDivinationScreen}
        options={{
          headerTitle: '详细解卦',
          headerBackTitle: '返回',
        }}
      />
    </Stack.Navigator>
  );
}

/**
 * 应用主组件
 */
function App(): React.JSX.Element {
  const colorScheme = useColorScheme();
  const [isReady, setIsReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<'Login' | 'Main'>('Main');

  useEffect(() => {
    // 初始化应用
    initializeApp();
  }, []);

  /**
   * 初始化应用
   */
  const initializeApp = async () => {
    // 初始化微信SDK（APP端）
    if (WECHAT_CONFIG.APP_ID) {
      await initWeChat(WECHAT_CONFIG.APP_ID);
    }

    // 检查认证状态
    await checkAuthStatus();
  };

  /**
   * 检查认证状态
   */
  const checkAuthStatus = async () => {
    try {
      const token = await authService.restoreToken();
      // 如果有token，直接进入主页；否则进入登录页
      setInitialRoute(token ? 'Main' : 'Login');
    } catch (error) {
      console.error('检查认证状态失败:', error);
      setInitialRoute('Login');
    } finally {
      setIsReady(true);
    }
  };

  if (!isReady) {
    // 显示加载状态
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>周易通</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar
            barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
            backgroundColor={Theme.primary}
          />
          <RootStack />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.primary,
  },
  loadingText: {
    fontSize: 32,
    fontFamily: Theme.titleFont.bold,
    color: '#FFFFFF',
  },
});

export default App;
