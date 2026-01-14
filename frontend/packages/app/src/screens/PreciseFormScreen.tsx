/**
 * 精准解卦信息收集表单 - React Native (APP)
 * 收集用户个人信息以进行精准解读
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Theme } from '@zhouyi/shared/theme';
import { divinationService } from '@zhouyi/shared/services/divination';

interface FormData {
  name: string;
  gender: 'male' | 'female';
  birthYear: string;
  birthMonth: string;
  birthDay: string;
  birthHour: string;
  question: string;
}

interface FormErrors {
  name?: string;
  birthDate?: string;
  birthHour?: string;
  question?: string;
}

/**
 * 精准表单页面组件
 */
function PreciseFormScreen(): React.JSX.Element {
  const route = useRoute();
  const navigation = useNavigation();

  const { recordId } = (route.params as any) || {};

  const [formData, setFormData] = useState<FormData>({
    name: '',
    gender: 'male',
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    birthHour: '',
    question: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<{[key: string]: boolean}>({});
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [showHourPicker, setShowHourPicker] = useState(false);

  // 生成选项数据
  const years = Array.from({length: 100}, (_, i) => new Date().getFullYear() - i);
  const months = Array.from({length: 12}, (_, i) => i + 1);
  const days = Array.from({length: 31}, (_, i) => i + 1);
  const hours = [
    {label: '子时 (23:00-01:00)', value: '0'},
    {label: '丑时 (01:00-03:00)', value: '1'},
    {label: '寅时 (03:00-05:00)', value: '2'},
    {label: '卯时 (05:00-07:00)', value: '3'},
    {label: '辰时 (07:00-09:00)', value: '4'},
    {label: '巳时 (09:00-11:00)', value: '5'},
    {label: '午时 (11:00-13:00)', value: '6'},
    {label: '未时 (13:00-15:00)', value: '7'},
    {label: '申时 (15:00-17:00)', value: '8'},
    {label: '酉时 (17:00-19:00)', value: '9'},
    {label: '戌时 (19:00-21:00)', value: '10'},
    {label: '亥时 (21:00-23:00)', value: '11'},
  ];

  /**
   * 更新表单数据
   */
  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({...prev, [field]: value}));
    if (errors[field]) {
      setErrors(prev => ({...prev, [field]: undefined}));
    }
    validateField(field, value);
  };

  /**
   * 标记字段为已触摸
   */
  const handleBlur = (field: string) => {
    setTouched(prev => ({...prev, [field]: true}));
    validateField(field, formData[field as keyof FormData]);
  };

  /**
   * 验证单个字段
   */
  const validateField = (field: string, value: string): boolean => {
    let error = '';

    switch (field) {
      case 'name':
        if (!value.trim()) {
          error = '请输入姓名';
        } else if (value.length < 2) {
          error = '姓名至少2个字符';
        } else if (value.length > 20) {
          error = '姓名最多20个字符';
        }
        break;
      case 'birthYear':
      case 'birthMonth':
      case 'birthDay':
        if (!formData.birthYear || !formData.birthMonth || !formData.birthDay) {
          error = '请选择完整的出生日期';
        }
        break;
      case 'birthHour':
        if (!value) {
          error = '请选择出生时辰';
        }
        break;
      case 'question':
        if (!value.trim()) {
          error = '请输入占问事项';
        } else if (value.length < 5) {
          error = '请详细描述您的问题（至少5个字符）';
        } else if (value.length > 200) {
          error = '占问事项最多200个字符';
        }
        break;
    }

    setErrors(prev => ({...prev, [field]: error}));
    return !error;
  };

  /**
   * 表单验证
   */
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    if (!formData.name.trim()) {
      newErrors.name = '请输入姓名';
      isValid = false;
    } else if (formData.name.length < 2) {
      newErrors.name = '姓名至少2个字符';
      isValid = false;
    }

    if (!formData.birthYear || !formData.birthMonth || !formData.birthDay) {
      newErrors.birthDate = '请选择完整的出生日期';
      isValid = false;
    }

    if (!formData.birthHour) {
      newErrors.birthHour = '请选择出生时辰';
      isValid = false;
    }

    if (!formData.question.trim()) {
      newErrors.question = '请输入占问事项';
      isValid = false;
    } else if (formData.question.length < 5) {
      newErrors.question = '请详细描述您的问题（至少5个字符）';
      isValid = false;
    }

    setErrors(newErrors);
    setTouched({
      name: true,
      birthDate: true,
      birthHour: true,
      question: true,
    });

    if (!isValid) {
      Alert.alert('提示', '请检查表单填写');
    }

    return isValid;
  };

  /**
   * 提交表单
   */
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // 保存精准信息
      await divinationService.savePreciseInfo(recordId, {
        name: formData.name,
        gender: formData.gender,
        birthDate: `${formData.birthYear}-${formData.birthMonth}-${formData.birthDay}`,
        question: formData.question,
      });

      Alert.alert('成功', '信息保存成功', [
        {
          text: '确定',
          onPress: () => {
            navigation.navigate('DetailedDivination' as any, { recordId });
          },
        },
      ]);
    } catch (error: any) {
      console.error('提交失败:', error);
      Alert.alert('错误', error.message || '提交失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 渲染选择器
   */
  const renderPicker = (
    visible: boolean,
    items: any[],
    selectedValue: string,
    onSelect: (value: string) => void,
    onClose: () => void,
  ) => {
    if (!visible) return null;

    return (
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerContainer}>
          <View style={styles.pickerHeader}>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.pickerCancel}>取消</Text>
            </TouchableOpacity>
            <Text style={styles.pickerTitle}>请选择</Text>
            <TouchableOpacity
              onPress={() => {
                onSelect(selectedValue);
                onClose();
              }}>
              <Text style={styles.pickerConfirm}>确定</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.pickerScroll}>
            {items.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.pickerItem,
                  selectedValue === (item.value || item) && styles.pickerItemSelected,
                ]}
                onPress={() => onSelect(String(item.value || item))}>
                <Text
                  style={[
                    styles.pickerItemText,
                    selectedValue === (item.value || item) && styles.pickerItemTextSelected,
                  ]}>
                  {item.label || item}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>精准解卦</Text>
          <Text style={styles.headerSubtitle}>填写个人信息，获得更精准的解读</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* 姓名 */}
          <View style={styles.formItem}>
            <Text style={styles.formLabel}>姓名 *</Text>
            <TextInput
              style={[
                styles.formInput,
                touched.name && errors.name ? styles.formInputError : {},
                touched.name && !errors.name ? styles.formInputSuccess : {},
              ]}
              placeholder="请输入您的姓名"
              value={formData.name}
              onChangeText={text => handleChange('name', text)}
              onBlur={() => handleBlur('name')}
              placeholderTextColor={styles.placeholder.color}
              accessibilityLabel="姓名输入框"
              accessibilityHint="请输入您的真实姓名"
            />
            {touched.name && errors.name && (
              <Text style={styles.errorText}>{errors.name}</Text>
            )}
          </View>

          {/* 性别 */}
          <View style={styles.formItem}>
            <Text style={styles.formLabel}>性别 *</Text>
            <TouchableOpacity
              style={styles.formPicker}
              onPress={() => setShowGenderPicker(true)}>
              <Text style={formData.gender ? styles.pickerValue : styles.placeholder}>
                {formData.gender === 'male' ? '男' : '女'}
              </Text>
              <Icon name="chevron-forward" size={20} color={styles.placeholder.color} />
            </TouchableOpacity>
          </View>

          {/* 出生日期 */}
          <View style={styles.formItem}>
            <Text style={styles.formLabel}>出生日期 *</Text>
            <View style={styles.datePickerGroup}>
              <TouchableOpacity
                style={[
                  styles.datePicker,
                  touched.birthDate && errors.birthDate ? styles.pickerError : {},
                ]}
                onPress={() => setShowYearPicker(true)}>
                <Text style={formData.birthYear ? styles.pickerValue : styles.placeholder}>
                  {formData.birthYear || '年'}
                </Text>
                <Icon name="chevron-down" size={16} color={styles.placeholder.color} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.datePicker,
                  touched.birthDate && errors.birthDate ? styles.pickerError : {},
                ]}
                onPress={() => setShowMonthPicker(true)}>
                <Text style={formData.birthMonth ? styles.pickerValue : styles.placeholder}>
                  {formData.birthMonth || '月'}
                </Text>
                <Icon name="chevron-down" size={16} color={styles.placeholder.color} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.datePicker,
                  touched.birthDate && errors.birthDate ? styles.pickerError : {},
                ]}
                onPress={() => setShowDayPicker(true)}>
                <Text style={formData.birthDay ? styles.pickerValue : styles.placeholder}>
                  {formData.birthDay || '日'}
                </Text>
                <Icon name="chevron-down" size={16} color={styles.placeholder.color} />
              </TouchableOpacity>
            </View>
            {touched.birthDate && errors.birthDate && (
              <Text style={styles.errorText}>{errors.birthDate}</Text>
            )}
          </View>

          {/* 出生时辰 */}
          <View style={styles.formItem}>
            <Text style={styles.formLabel}>出生时辰 *</Text>
            <TouchableOpacity
              style={[
                styles.formPicker,
                touched.birthHour && errors.birthHour ? styles.pickerError : {},
              ]}
              onPress={() => setShowHourPicker(true)}>
              <Text style={formData.birthHour ? styles.pickerValue : styles.placeholder}>
                {formData.birthHour !== ''
                  ? hours[parseInt(formData.birthHour)].label
                  : '请选择时辰'}
              </Text>
              <Icon name="chevron-forward" size={20} color={styles.placeholder.color} />
            </TouchableOpacity>
            {touched.birthHour && errors.birthHour && (
              <Text style={styles.errorText}>{errors.birthHour}</Text>
            )}
          </View>

          {/* 占问事项 */}
          <View style={styles.formItem}>
            <Text style={styles.formLabel}>占问事项 *</Text>
            <View style={styles.textareaWrapper}>
              <TextInput
                style={[
                  styles.formTextarea,
                  touched.question && errors.question ? styles.formInputError : {},
                  touched.question && !errors.question ? styles.formInputSuccess : {},
                ]}
                placeholder="请详细描述您想要咨询的问题（至少5个字符）"
                value={formData.question}
                onChangeText={text => handleChange('question', text)}
                onBlur={() => handleBlur('question')}
                multiline
                numberOfLines={6}
                maxLength={200}
                textAlignVertical="top"
                placeholderTextColor={styles.placeholder.color}
                accessibilityLabel="占问事项输入框"
                accessibilityHint="请详细描述您想要咨询的问题"
              />
              <View style={styles.textareaFooter}>
                <Text style={styles.charCount}>{formData.question.length}/200</Text>
                {touched.question && !errors.question && formData.question.length >= 5 && (
                  <Icon name="checkmark-circle" size={20} color="#52C41A" />
                )}
              </View>
            </View>
            {touched.question && errors.question && (
              <Text style={styles.errorText}>{errors.question}</Text>
            )}
          </View>

          {/* 说明 */}
          <View style={styles.formNote}>
            <Icon name="information-circle" size={20} color="#F5A623" />
            <Text style={styles.noteText}>
              您的个人信息将仅用于生辰八字分析，严格保密
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          accessibilityLabel="提交表单按钮"
          accessibilityHint="提交个人信息并获取精准解读">
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>提交并获取解读</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Pickers */}
      {renderPicker(
        showGenderPicker,
        [{label: '男', value: 'male'}, {label: '女', value: 'female'}],
        formData.gender,
        value => handleChange('gender', value),
        () => setShowGenderPicker(false),
      )}

      {renderPicker(
        showYearPicker,
        years,
        formData.birthYear,
        value => {
          handleChange('birthYear', value);
          handleBlur('birthDate');
        },
        () => setShowYearPicker(false),
      )}

      {renderPicker(
        showMonthPicker,
        months,
        formData.birthMonth,
        value => {
          handleChange('birthMonth', value);
          handleBlur('birthDate');
        },
        () => setShowMonthPicker(false),
      )}

      {renderPicker(
        showDayPicker,
        days,
        formData.birthDay,
        value => {
          handleChange('birthDay', value);
          handleBlur('birthDate');
        },
        () => setShowDayPicker(false),
      )}

      {renderPicker(
        showHourPicker,
        hours,
        formData.birthHour,
        value => {
          handleChange('birthHour', value);
          handleBlur('birthHour');
        },
        () => setShowHourPicker(false),
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5DC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    backgroundColor: '#C8102E',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'STKaiti',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  form: {
    padding: 20,
  },
  formItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
  },
  formInput: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#333333',
  },
  formInputError: {
    borderColor: '#FF4444',
    backgroundColor: '#FFF5F5',
  },
  formInputSuccess: {
    borderColor: '#52C41A',
    backgroundColor: '#F6FFED',
  },
  formPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 50,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  pickerError: {
    borderColor: '#FF4444',
    backgroundColor: '#FFF5F5',
  },
  pickerValue: {
    fontSize: 16,
    color: '#333333',
  },
  placeholder: {
    color: '#999999',
    fontSize: 16,
  },
  datePickerGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  datePicker: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 50,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  textareaWrapper: {
    position: 'relative',
  },
  formTextarea: {
    width: '100%',
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333333',
    lineHeight: 22,
  },
  textareaFooter: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  charCount: {
    fontSize: 12,
    color: '#999999',
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    color: '#FF4444',
    lineHeight: 16,
  },
  formNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    borderRadius: 8,
    padding: 12,
    marginTop: 20,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: '#999999',
    lineHeight: 18,
    marginLeft: 8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  submitButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#C8102E',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  pickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  pickerCancel: {
    fontSize: 16,
    color: '#999999',
  },
  pickerConfirm: {
    fontSize: 16,
    color: '#C8102E',
    fontWeight: 'bold',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  pickerScroll: {
    maxHeight: 400,
  },
  pickerItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  pickerItemSelected: {
    backgroundColor: '#FFF5F5',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#333333',
    textAlign: 'center',
  },
  pickerItemTextSelected: {
    color: '#C8102E',
    fontWeight: 'bold',
  },
});

export default PreciseFormScreen;
