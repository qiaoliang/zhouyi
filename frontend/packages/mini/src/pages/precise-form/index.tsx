/**
 * 精准解卦信息收集表单 - 微信小程序
 * 收集用户个人信息以进行精准解读
 */

import { useState } from 'react'
import { View, Text, Input, Button, Picker, Textarea, Switch } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useRouter } from '@tarojs/taro'
import { divinationService } from '@zhouyi/shared/services/divination'
import { LunarUtils, LunarDatePicker } from '@zhouyi/shared/utils/lunar'
import './index.scss'

interface FormData {
  name: string
  gender: 'male' | 'female'
  birthYear: string
  birthMonth: string
  birthDay: string
  birthHour: string
  question: string
  isLunar: boolean // 是否农历
}

interface FormErrors {
  name?: string
  birthDate?: string
  birthHour?: string
  question?: string
}

function PreciseFormPage() {
  const router = useRouter()
  const recordId = router.params.recordId

  const [formData, setFormData] = useState<FormData>({
    name: '',
    gender: 'male',
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    birthHour: '',
    question: '',
    isLunar: false, // 默认公历
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<{[key: string]: boolean}>({})
  const [showGenderPicker, setShowGenderPicker] = useState(false)
  const [showYearPicker, setShowYearPicker] = useState(false)
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [showDayPicker, setShowDayPicker] = useState(false)
  const [showHourPicker, setShowHourPicker] = useState(false)

  // 生成选项数据
  const years = Array.from({length: 100}, (_, i) => new Date().getFullYear() - i)
  const months = Array.from({length: 12}, (_, i) => i + 1)
  const days = Array.from({length: 31}, (_, i) => i + 1)
  const hours = Array.from({length: 12}, (_, i) => `${i === 0 ? '子' : ['丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'][i - 1]}时`)

  // 农历选项
  const lunarMonths = LunarDatePicker.generateMonths()
  const lunarDays = LunarDatePicker.generateDays()

  /**
   * 更新表单数据
   */
  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({...prev, [field]: value}))
    // 实时清除错误提示
    if (errors[field]) {
      setErrors(prev => ({...prev, [field]: undefined}))
    }
    // 实时验证（对于字符串类型）
    if (typeof value === 'string') {
      validateField(field, value)
    }
  }

  /**
   * 切换农历/公历
   */
  const handleCalendarTypeChange = (isLunar: boolean) => {
    handleChange('isLunar', isLunar)
    // 清空日期选择
    setFormData(prev => ({
      ...prev,
      birthYear: '',
      birthMonth: '',
      birthDay: '',
      isLunar
    }))
    Taro.showToast({
      title: isLunar ? '已切换至农历' : '已切换至公历',
      icon: 'none'
    })
  }

  /**
   * 标记字段为已触摸
   */
  const handleBlur = (field: string) => {
    setTouched(prev => ({...prev, [field]: true}))
    validateField(field, formData[field as keyof FormData])
  }

  /**
   * 验证单个字段
   */
  const validateField = (field: string, value: string): boolean => {
    let error = ''

    switch (field) {
      case 'name':
        if (!value.trim()) {
          error = '请输入姓名'
        } else if (value.length < 2) {
          error = '姓名至少2个字符'
        } else if (value.length > 20) {
          error = '姓名最多20个字符'
        }
        break
      case 'birthYear':
      case 'birthMonth':
      case 'birthDay':
        if (!formData.birthYear || !formData.birthMonth || !formData.birthDay) {
          error = '请选择完整的出生日期'
        }
        break
      case 'birthHour':
        if (!value) {
          error = '请选择出生时辰'
        }
        break
      case 'question':
        if (!value.trim()) {
          error = '请输入占问事项'
        } else if (value.length < 5) {
          error = '请详细描述您的问题（至少5个字符）'
        } else if (value.length > 200) {
          error = '占问事项最多200个字符'
        }
        break
    }

    setErrors(prev => ({...prev, [field]: error}))
    return !error
  }

  /**
   * 表单验证
   */
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}
    let isValid = true

    if (!formData.name.trim()) {
      newErrors.name = '请输入姓名'
      isValid = false
    } else if (formData.name.length < 2) {
      newErrors.name = '姓名至少2个字符'
      isValid = false
    }

    if (!formData.birthYear || !formData.birthMonth || !formData.birthDay) {
      newErrors.birthDate = '请选择完整的出生日期'
      isValid = false
    }

    if (!formData.birthHour) {
      newErrors.birthHour = '请选择出生时辰'
      isValid = false
    }

    if (!formData.question.trim()) {
      newErrors.question = '请输入占问事项'
      isValid = false
    } else if (formData.question.length < 5) {
      newErrors.question = '请详细描述您的问题（至少5个字符）'
      isValid = false
    }

    setErrors(newErrors)
    setTouched({
      name: true,
      birthDate: true,
      birthHour: true,
      question: true
    })

    if (!isValid) {
      Taro.showToast({
        title: '请检查表单填写',
        icon: 'none'
      })
    }

    return isValid
  }

  /**
   * 提交表单
   */
  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    try {
      setLoading(true)

      // 如果是农历，转换为公历日期
      let birthDateToSubmit: string
      if (formData.isLunar) {
        // 农历转公历
        const solarDate = LunarUtils.lunarToSolar({
          year: parseInt(formData.birthYear),
          month: parseInt(formData.birthMonth),
          day: parseInt(formData.birthDay),
          leap: false
        })
        birthDateToSubmit = LunarUtils.formatSolar(solarDate)

        Taro.showToast({
          title: `农历已转换为公历: ${birthDateToSubmit}`,
          icon: 'none',
          duration: 2000
        })
      } else {
        birthDateToSubmit = `${formData.birthYear}-${formData.birthMonth}-${formData.birthDay}`
      }

      // 保存精准信息
      await divinationService.savePreciseInfo(recordId, {
        name: formData.name,
        gender: formData.gender,
        birthDate: birthDateToSubmit,
        question: formData.question,
      })

      Taro.showToast({
        title: '保存成功',
        icon: 'success'
      })

      // 跳转到详细解卦页面
      setTimeout(() => {
        Taro.redirectTo({
          url: `/pages/detailed-divination/index?recordId=${recordId}`
        })
      }, 1500)
    } catch (error: any) {
      console.error('提交失败:', error)
      Taro.showToast({
        title: error.message || '提交失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='precise-form-page'>
      <View className='header'>
        <Text className='header-title'>精准解卦</Text>
        <Text className='header-subtitle'>填写个人信息，获得更精准的解读</Text>
      </View>

      <View className='form-content'>
        {/* 姓名 */}
        <View className='form-item'>
          <Text className='form-label'>姓名 *</Text>
          <Input
            className={`form-input ${touched.name && errors.name ? 'input-error' : ''} ${touched.name && !errors.name ? 'input-success' : ''}`}
            placeholder='请输入您的姓名'
            value={formData.name}
            onInput={e => handleChange('name', e.detail.value)}
            onBlur={() => handleBlur('name')}
            focusable
            aria-label="姓名输入框"
            aria-placeholder="请输入您的真实姓名"
          />
          {touched.name && errors.name && (
            <Text className='error-text' role="alert">{errors.name}</Text>
          )}
        </View>

        {/* 性别 */}
        <View className='form-item'>
          <Text className='form-label'>性别 *</Text>
          <Picker
            mode='selector'
            range={[{label: '男', value: 'male'}, {label: '女', value: 'female'}]}
            onChange={e => handleChange('gender', e.detail.value === 0 ? 'male' : 'female')}
            aria-label="性别选择器"
            aria-hint="请选择您的性别"
          >
            <View className='form-picker'>
              <Text className={formData.gender ? '' : 'placeholder'}>
                {formData.gender === 'male' ? '男' : '女'}
              </Text>
              <Text className='picker-arrow'>›</Text>
            </View>
          </Picker>
        </View>

        {/* 出生日期 */}
        <View className='form-item'>
          <View className='form-label-row'>
            <Text className='form-label'>出生日期 *</Text>
            <View className='calendar-type-switch'>
              <Text className='calendar-type-label'>{formData.isLunar ? '农历' : '公历'}</Text>
              <Switch
                checked={formData.isLunar}
                onChange={e => handleCalendarTypeChange(e.detail.value)}
                color='#C8102E'
              />
            </View>
          </View>

          {formData.isLunar ? (
            // 农历选择器
            <View className='date-picker-group'>
              <Picker
                mode='selector'
                range={years}
                onChange={e => {
                  handleChange('birthYear', String(years[e.detail.value]))
                  handleBlur('birthDate')
                }}
              >
                <View className={`date-picker ${touched.birthDate && errors.birthDate ? 'picker-error' : ''}`}>
                  <Text className={formData.birthYear ? '' : 'placeholder'}>
                    {formData.birthYear || '年'}
                  </Text>
                  <Text className='picker-arrow'>›</Text>
                </View>
              </Picker>

              <Picker
                mode='selector'
                range={lunarMonths.map(m => m.label)}
                onChange={e => {
                  handleChange('birthMonth', String(lunarMonths[e.detail.value].value))
                  handleBlur('birthDate')
                }}
              >
                <View className={`date-picker ${touched.birthDate && errors.birthDate ? 'picker-error' : ''}`}>
                  <Text className={formData.birthMonth ? '' : 'placeholder'}>
                    {formData.birthMonth ? lunarMonths.find(m => m.value === parseInt(formData.birthMonth))?.label : '月'}
                  </Text>
                  <Text className='picker-arrow'>›</Text>
                </View>
              </Picker>

              <Picker
                mode='selector'
                range={lunarDays.map(d => d.label)}
                onChange={e => {
                  handleChange('birthDay', String(lunarDays[e.detail.value].value))
                  handleBlur('birthDate')
                }}
              >
                <View className={`date-picker ${touched.birthDate && errors.birthDate ? 'picker-error' : ''}`}>
                  <Text className={formData.birthDay ? '' : 'placeholder'}>
                    {formData.birthDay ? lunarDays.find(d => d.value === parseInt(formData.birthDay))?.label : '日'}
                  </Text>
                  <Text className='picker-arrow'>›</Text>
                </View>
              </Picker>
            </View>
          ) : (
            // 公历选择器
            <View className='date-picker-group'>
              <Picker
                mode='selector'
                range={years}
                onChange={e => {
                  handleChange('birthYear', String(years[e.detail.value]))
                  handleBlur('birthDate')
                }}
              >
                <View className={`date-picker ${touched.birthDate && errors.birthDate ? 'picker-error' : ''}`}>
                  <Text className={formData.birthYear ? '' : 'placeholder'}>
                    {formData.birthYear || '年'}
                  </Text>
                  <Text className='picker-arrow'>›</Text>
                </View>
              </Picker>

              <Picker
                mode='selector'
                range={months}
                onChange={e => {
                  handleChange('birthMonth', String(months[e.detail.value]))
                  handleBlur('birthDate')
                }}
              >
                <View className={`date-picker ${touched.birthDate && errors.birthDate ? 'picker-error' : ''}`}>
                  <Text className={formData.birthMonth ? '' : 'placeholder'}>
                    {formData.birthMonth || '月'}
                  </Text>
                  <Text className='picker-arrow'>›</Text>
                </View>
              </Picker>

              <Picker
                mode='selector'
                range={days}
                onChange={e => {
                  handleChange('birthDay', String(days[e.detail.value]))
                  handleBlur('birthDate')
                }}
              >
                <View className={`date-picker ${touched.birthDate && errors.birthDate ? 'picker-error' : ''}`}>
                  <Text className={formData.birthDay ? '' : 'placeholder'}>
                    {formData.birthDay || '日'}
                  </Text>
                  <Text className='picker-arrow'>›</Text>
                </View>
              </Picker>
            </View>
          )}
          {touched.birthDate && errors.birthDate && (
            <Text className='error-text'>{errors.birthDate}</Text>
          )}
        </View>

        {/* 出生时辰 */}
        <View className='form-item'>
          <Text className='form-label'>出生时辰 *</Text>
          <Picker
            mode='selector'
            range={hours}
            onChange={e => {
              handleChange('birthHour', String(e.detail.value))
              handleBlur('birthHour')
            }}
          >
            <View className={`form-picker ${touched.birthHour && errors.birthHour ? 'picker-error' : ''}`}>
              <Text className={formData.birthHour ? '' : 'placeholder'}>
                {formData.birthHour ? hours[parseInt(formData.birthHour)] : '请选择时辰'}
              </Text>
              <Text className='picker-arrow'>›</Text>
            </View>
          </Picker>
          {touched.birthHour && errors.birthHour && (
            <Text className='error-text'>{errors.birthHour}</Text>
          )}
        </View>

        {/* 占问事项 */}
        <View className='form-item'>
          <Text className='form-label'>占问事项 *</Text>
          <View className='textarea-wrapper'>
            <Textarea
              className={`form-textarea ${touched.question && errors.question ? 'input-error' : ''} ${touched.question && !errors.question ? 'input-success' : ''}`}
              placeholder='请详细描述您想要咨询的问题（至少5个字符）'
              value={formData.question}
              onInput={e => handleChange('question', e.detail.value)}
              onBlur={() => handleBlur('question')}
              maxlength={200}
              showConfirmBar={false}
              autoHeight
              aria-label="占问事项输入框"
              aria-placeholder="请详细描述您想要咨询的问题，至少5个字符"
            />
            <View className='textarea-footer'>
              <Text className='char-count'>{formData.question.length}/200</Text>
              {touched.question && !errors.question && formData.question.length >= 5 && (
                <Text className='success-icon'>✓</Text>
              )}
            </View>
          </View>
          {touched.question && errors.question && (
            <Text className='error-text'>{errors.question}</Text>
          )}
        </View>

        {/* 说明 */}
        <View className='form-note'>
          <Text className='note-icon'>ℹ️</Text>
          <Text className='note-text'>
            您的个人信息将仅用于生辰八字分析，严格保密
          </Text>
        </View>
      </View>

      {/* 提交按钮 */}
      <View className='form-footer'>
        <Button
          className='submit-button'
          onClick={handleSubmit}
          disabled={loading}
          aria-label={loading ? '正在提交中，请稍候' : '提交表单并获取精准解读'}
        >
          {loading ? '提交中...' : '提交并获取解读'}
        </Button>
      </View>
    </View>
  )
}

export default PreciseFormPage
