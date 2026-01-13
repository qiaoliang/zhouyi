/**
 * 导航类型定义
 */

import type {NavigatorScreenParams} from '@react-navigation/native';
import type {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

/**
 * 主标签导航参数
 */
export interface MainTabParamList {
  Divination: undefined;
  Learning: undefined;
  Daily: undefined;
  History: undefined;
  Profile: undefined;
}

/**
 * 栈导航参数
 */
export interface RootStackParamList {
  Login: {
    redirectTo?: keyof MainTabParamList;
  };
  Main: NavigatorScreenParams<MainTabParamList>;
  DivinationDetail: {
    hexagramId: string;
    hexagramName: string;
  };
  DetailedDivination: {
    recordId: string;
  };
  CourseReader: {
    courseId: string;
    lessonId?: string;
  };
  Quiz: {
    courseId: string;
    quizId: string;
  };
  Settings: undefined;
  Orders: undefined;
  Membership: undefined;
}

/**
 * 导航类型
 */
export type MainTabNavigationProp<T extends keyof MainTabParamList> =
  BottomTabNavigationProp<MainTabParamList, T>;

export type RootStackNavigationProp<T extends keyof RootStackParamList> =
  NativeStackNavigationProp<RootStackParamList, T>;
