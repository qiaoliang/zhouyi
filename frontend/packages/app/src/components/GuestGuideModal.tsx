/**
 * 游客模式引导注册弹窗
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {Theme} from '@zhouyi/shared/theme';

interface GuestGuideModalProps {
  visible: boolean;
  onClose: () => void;
  onLogin: () => void;
  remainingCount?: number;
}

/**
 * 游客引导注册弹窗组件
 */
function GuestGuideModal({
  visible,
  onClose,
  onLogin,
  remainingCount = 0,
}: GuestGuideModalProps): React.JSX.Element {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.container}>
          <View style={styles.content}>
            {/* 图标 */}
            <View style={styles.iconContainer}>
              <Icon name="ios-lock-closed" size={48} color={Theme.primary} />
            </View>

            {/* 标题 */}
            <Text style={styles.title}>注册提示</Text>

            {/* 描述 */}
            <Text style={styles.description}>
              {remainingCount > 0
                ? `您还可以免费卜卦 ${remainingCount} 次`
                : '您的免费体验次数已用完'}
            </Text>

            {/* 权益列表 */}
            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <Icon name="ios-checkmark-circle" size={20} color={Theme.primary} />
                <Text style={styles.benefitText}>保存卜卦历史记录</Text>
              </View>
              <View style={styles.benefitItem}>
                <Icon name="ios-checkmark-circle" size={20} color={Theme.primary} />
                <Text style={styles.benefitText}>无限制卜卦次数</Text>
              </View>
              <View style={styles.benefitItem}>
                <Icon name="ios-checkmark-circle" size={20} color={Theme.primary} />
                <Text style={styles.benefitText}>解锁详细解卦功能</Text>
              </View>
              <View style={styles.benefitItem}>
                <Icon name="ios-checkmark-circle" size={20} color={Theme.primary} />
                <Text style={styles.benefitText}>同步多设备数据</Text>
              </View>
            </View>

            {/* 按钮 */}
            <TouchableOpacity style={styles.loginButton} onPress={onLogin}>
              <Text style={styles.loginButtonText}>立即登录/注册</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>暂时不了</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: Dimensions.get('window').width * 0.85,
    maxWidth: 400,
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Theme.background.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: Theme.fontSize.xxl,
    fontFamily: Theme.titleFont.bold,
    color: Theme.text.primary,
    marginBottom: 12,
  },
  description: {
    fontSize: Theme.fontSize.md,
    color: Theme.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  benefitsList: {
    width: '100%',
    marginBottom: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  benefitText: {
    fontSize: Theme.fontSize.sm,
    color: Theme.text.primary,
    marginLeft: 12,
  },
  loginButton: {
    width: '100%',
    backgroundColor: Theme.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  loginButtonText: {
    fontSize: Theme.fontSize.md,
    fontFamily: Theme.titleFont.medium,
    color: '#FFFFFF',
  },
  closeButton: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: Theme.fontSize.sm,
    color: Theme.text.secondary,
  },
});

export default GuestGuideModal;
