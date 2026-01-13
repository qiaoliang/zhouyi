/**
 * 登录页面
 * 包含手机验证码登录、微信登录、游客模式
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {Theme} from '@zhouyi/shared/theme';
import {authService} from '@zhouyi/shared/services/auth';
import {loginWithWeChatApp, isWeChatInstalled} from '@zhouyi/shared/services/wechat';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../navigation/types';

type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;

type LoginTab = 'phone' | 'wechat';

/**
 * 登录屏幕组件
 */
function LoginScreen({navigation, route}: LoginScreenProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<LoginTab>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [codeSending, setCodeSending] = useState(false);

  const redirectTo = route.params?.redirectTo;

  /**
   * 发送验证码
   */
  const handleSendCode = async () => {
    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      Alert.alert('提示', '请输入正确的手机号');
      return;
    }

    try {
      setCodeSending(true);
      await authService.sendVerificationCode(phoneNumber);

      // 开始倒计时
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      Alert.alert('提示', '验证码已发送');
    } catch (error: any) {
      Alert.alert('发送失败', error.message || '验证码发送失败，请稍后重试');
    } finally {
      setCodeSending(false);
    }
  };

  /**
   * 手机验证码登录
   */
  const handlePhoneLogin = async () => {
    if (!phoneNumber) {
      Alert.alert('提示', '请输入手机号');
      return;
    }

    if (!verificationCode) {
      Alert.alert('提示', '请输入验证码');
      return;
    }

    try {
      setLoading(true);
      await authService.loginWithCode({
        phoneNumber,
        code: verificationCode,
      });

      // 登录成功，导航到主页或指定页面
      if (redirectTo) {
        navigation.reset({
          index: 0,
          routes: [{name: 'Main', params: {screen: redirectTo}}],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{name: 'Main'}],
        });
      }
    } catch (error: any) {
      Alert.alert('登录失败', error.message || '登录失败，请检查验证码是否正确');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 微信登录（APP端）
   */
  const handleWechatLogin = async () => {
    try {
      setLoading(true);

      // 检查微信是否已安装
      const isInstalled = await isWeChatInstalled();
      if (!isInstalled) {
        Alert.alert(
          '提示',
          '未检测到微信应用，请先安装微信后再使用微信登录',
          [
            {text: '知道了', style: 'default'},
          ]
        );
        return;
      }

      // 发起微信登录
      const result = await loginWithWeChatApp();

      if (result.success) {
        // 登录成功，导航到主页或指定页面
        if (redirectTo) {
          navigation.reset({
            index: 0,
            routes: [{name: 'Main', params: {screen: redirectTo}}],
          });
        } else {
          navigation.reset({
            index: 0,
            routes: [{name: 'Main'}],
          });
        }
      } else {
        Alert.alert('登录失败', result.error || '微信登录失败，请稍后重试');
      }
    } catch (error: any) {
      Alert.alert('登录失败', error.message || '微信登录失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 游客模式登录
   */
  const handleGuestLogin = async () => {
    Alert.alert(
      '游客模式',
      '游客模式下可以体验基础功能，但历史记录不会保存，且只能卜卦2次。建议注册登录以获得完整体验。',
      [
        {text: '取消', style: 'cancel'},
        {
          text: '继续体验',
          onPress: async () => {
            try {
              setLoading(true);
              await authService.loginAsGuest();

              navigation.reset({
                index: 0,
                routes: [{name: 'Main'}],
              });
            } catch (error: any) {
              Alert.alert('登录失败', error.message || '游客登录失败，请稍后重试');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  /**
   * 渲染手机验证码登录表单
   */
  const renderPhoneLoginForm = () => (
    <View style={styles.formContainer}>
      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <Icon name="ios-phone-portrait-outline" size={20} color={Theme.text.secondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="请输入手机号"
            placeholderTextColor={Theme.text.secondary}
            keyboardType="phone-pad"
            maxLength={11}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
          />
        </View>

        <View style={styles.inputWrapper}>
          <Icon name="ios-keypad-outline" size={20} color={Theme.text.secondary} style={styles.inputIcon} />
          <TextInput
            style={styles.codeInput}
            placeholder="请输入验证码"
            placeholderTextColor={Theme.text.secondary}
            keyboardType="number-pad"
            maxLength={6}
            value={verificationCode}
            onChangeText={setVerificationCode}
          />
          <TouchableOpacity
            style={[
              styles.sendCodeButton,
              countdown > 0 && styles.sendCodeButtonDisabled,
            ]}
            onPress={handleSendCode}
            disabled={countdown > 0 || codeSending}>
            {codeSending ? (
              <ActivityIndicator size="small" color={Theme.primary} />
            ) : (
              <Text style={styles.sendCodeButtonText}>
                {countdown > 0 ? `${countdown}秒后重试` : '获取验证码'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.loginButton, (!phoneNumber || !verificationCode) && styles.loginButtonDisabled]}
        onPress={handlePhoneLogin}
        disabled={!phoneNumber || !verificationCode || loading}>
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.loginButtonText}>登录</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  /**
   * 渲染微信登录
   */
  const renderWechatLogin = () => (
    <View style={styles.wechatContainer}>
      <View style={styles.wechatInfo}>
        <Icon name="ios-logo-wechat" size={60} color="#09BB07" />
        <Text style={styles.wechatTitle}>微信一键登录</Text>
        <Text style={styles.wechatDesc}>使用微信快速登录，无需记住密码</Text>
      </View>

      <TouchableOpacity style={styles.wechatButton} onPress={handleWechatLogin}>
        <Icon name="ios-logo-wechat" size={24} color="#FFFFFF" style={styles.wechatButtonIcon} />
        <Text style={styles.wechatButtonText}>微信登录</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* 顶部装饰 */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>周易</Text>
            <Text style={styles.logoSuffix}>通</Text>
          </View>
          <Text style={styles.slogan}>探究天地奥秘，洞察人生智慧</Text>
        </View>

        {/* Tab切换 */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'phone' && styles.tabActive]}
            onPress={() => setActiveTab('phone')}>
            <Text style={[styles.tabText, activeTab === 'phone' && styles.tabTextActive]}>
              手机号登录
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'wechat' && styles.tabActive]}
            onPress={() => setActiveTab('wechat')}>
            <Text style={[styles.tabText, activeTab === 'wechat' && styles.tabTextActive]}>
              微信登录
            </Text>
          </TouchableOpacity>
        </View>

        {/* 登录表单 */}
        {activeTab === 'phone' ? renderPhoneLoginForm() : renderWechatLogin()}

        {/* 游客模式 */}
        <View style={styles.guestContainer}>
          <TouchableOpacity style={styles.guestButton} onPress={handleGuestLogin}>
            <Text style={styles.guestButtonText}>游客模式体验</Text>
            <Text style={styles.guestButtonDesc}>无需注册，快速体验</Text>
          </TouchableOpacity>
        </View>

        {/* 协议 */}
        <View style={styles.agreement}>
          <Text style={styles.agreementText}>
            登录即表示同意
            <Text style={styles.agreementLink}>《用户协议》</Text>
            和
            <Text style={styles.agreementLink}>《隐私政策》</Text>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.background.light,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
    backgroundColor: Theme.primary,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  logo: {
    fontSize: 48,
    fontFamily: Theme.titleFont.bold,
    color: '#FFFFFF',
  },
  logoSuffix: {
    fontSize: 28,
    fontFamily: Theme.titleFont.medium,
    color: Theme.secondary,
    marginLeft: 4,
  },
  slogan: {
    fontSize: Theme.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: Theme.background.light,
  },
  tabText: {
    fontSize: Theme.fontSize.md,
    color: Theme.text.secondary,
  },
  tabTextActive: {
    color: Theme.primary,
    fontFamily: Theme.titleFont.medium,
  },
  formContainer: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: Theme.fontSize.md,
    color: Theme.text.primary,
  },
  codeInput: {
    flex: 1,
    fontSize: Theme.fontSize.md,
    color: Theme.text.primary,
  },
  sendCodeButton: {
    marginLeft: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Theme.primary,
    borderRadius: 8,
  },
  sendCodeButtonDisabled: {
    backgroundColor: Theme.background.light,
  },
  sendCodeButtonText: {
    fontSize: Theme.fontSize.sm,
    color: '#FFFFFF',
    fontFamily: Theme.titleFont.medium,
  },
  loginButton: {
    backgroundColor: Theme.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  loginButtonDisabled: {
    backgroundColor: Theme.background.light,
  },
  loginButtonText: {
    fontSize: Theme.fontSize.lg,
    fontFamily: Theme.titleFont.medium,
    color: '#FFFFFF',
  },
  wechatContainer: {
    padding: 20,
    alignItems: 'center',
  },
  wechatInfo: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  wechatTitle: {
    fontSize: Theme.fontSize.xl,
    fontFamily: Theme.titleFont.medium,
    color: Theme.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  wechatDesc: {
    fontSize: Theme.fontSize.sm,
    color: Theme.text.secondary,
    textAlign: 'center',
  },
  wechatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#09BB07',
    paddingVertical: 16,
    paddingHorizontal: 80,
    borderRadius: 12,
  },
  wechatButtonIcon: {
    marginRight: 8,
  },
  wechatButtonText: {
    fontSize: Theme.fontSize.lg,
    fontFamily: Theme.titleFont.medium,
    color: '#FFFFFF',
  },
  guestContainer: {
    padding: 20,
    paddingTop: 0,
  },
  guestButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Theme.border,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  guestButtonText: {
    fontSize: Theme.fontSize.md,
    fontFamily: Theme.titleFont.medium,
    color: Theme.text.primary,
    marginBottom: 4,
  },
  guestButtonDesc: {
    fontSize: Theme.fontSize.sm,
    color: Theme.text.secondary,
  },
  agreement: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  agreementText: {
    fontSize: Theme.fontSize.xs,
    color: Theme.text.secondary,
  },
  agreementLink: {
    color: Theme.primary,
  },
});

export default LoginScreen;
