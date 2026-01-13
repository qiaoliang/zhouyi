/**
 * 精准解卦信息收集表单 - 微信小程序
 * 收集用户个人信息以进行精准解读
 */

import { useState } from 'react'
import { View, Text, Input, Button, Picker } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useRouter } from '@tarojs/taro'
import { divinationService } from '@zhouyi/shared/services/divination'
import './index.scss'

interface FormData {
  name: string
  gender: 'male' | 'female'
  birthYear: string
  birthMonth: string
  birthDay: string
  birthHour: string
  question: string
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
  })
  const [loading, setLoading] = useState(false)
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

  /**
   * 更新表单数据
   */
  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({...prev, [field]: value}))
  }

  /**
   * 表单验证
   */
  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      Taro.showToast({title: '请输入姓名', icon: 'none'})
      return false
    }

    if (!formData.birthYear || !formData.birthMonth || !formData.birthDay) {
      Taro.showToast({title: '请选择出生日期', icon: 'none'})
      return false
    }

    if (!formData.birthHour) {
      Taro.showToast({title: '请选择出生时辰', icon: 'none'})
      return false
    }

    if (!formData.question.trim()) {
      Taro.showToast({title: '请输入占问事项', icon: 'none'})
      return false
    }

    return true
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

      // 保存精准信息
      await divinationService.savePreciseInfo(recordId, {
        name: formData.name,
        gender: formData.gender,
        birthDate: `${formData.birthYear}-${formData.birthMonth}-${formData.birthDay}`,
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
            className='form-input'
            placeholder='请输入您的姓名'
            value={formData.name}
            onInput={e => handleChange('name', e.detail.value)}
          />
        </View>

        {/* 性别 */}
        <View className='form-item'>
          <Text className='form-label'>性别 *</Text>
          <Picker
            mode='selector'
            range={[{label: '男', value: 'male'}, {label: '女', value: 'female'}]}
            onChange={e => handleChange('gender', e.detail.value === 0 ? 'male' : 'female')}
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
          <Text className='form-label'>出生日期 *</Text>
          <View className='date-picker-group'>
            <Picker
              mode='selector'
              range={years}
              onChange={e => handleChange('birthYear', String(years[e.detail.value]))}
            >
              <View className='date-picker'>
                <Text className={formData.birthYear ? '' : 'placeholder'}>
                  {formData.birthYear || '年'}
                </Text>
                <Text className='picker-arrow'>›</Text>
              </View>
            </Picker>

            <Picker
              mode='selector'
              range={months}
              onChange={e => handleChange('birthMonth', String(months[e.detail.value]))}
            >
              <View className='date-picker'>
                <Text className={formData.birthMonth ? '' : 'placeholder'}>
                  {formData.birthMonth || '月'}
                </Text>
                <Text className='picker-arrow'>›</Text>
              </View>
            </Picker>

            <Picker
              mode='selector'
              range={days}
              onChange={e => handleChange('birthDay', String(days[e.detail.value]))}
            >
              <View className='date-picker'>
                <Text className={formData.birthDay ? '' : 'placeholder'}>
                  {formData.birthDay || '日'}
                </Text>
                <Text className='picker-arrow'>›</Text>
              </View>
            </Picker>
          </View>
        </View>

        {/* 出生时辰 */}
        <View className='form-item'>
          <Text className='form-label'>出生时辰 *</Text>
          <Picker
            mode='selector'
            range={hours}
            onChange={e => handleChange('birthHour', String(e.detail.value))}
          >
            <View className='form-picker'>
              <Text className={formData.birthHour ? '' : 'placeholder'}>
                {formData.birthHour ? hours[parseInt(formData.birthHour)] : '请选择时辰'}
              </Text>
              <Text className='picker-arrow'>›</Text>
            </View>
          </Picker>
        </View>

        {/* 占问事项 */}
        <View className='form-item'>
          <Text className='form-label'>占问事项 *</Text>
          <View className='textarea-wrapper'>
            <Textarea
              className='form-textarea'
              placeholder='请详细描述您想要咨询的问题'
              value={formData.question}
              onInput={e => handleChange('question', e.detail.value)}
              maxlength={200}
              showConfirmBar={false}
            />
            <Text className='char-count'>{formData.question.length}/200</Text>
          </View>
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
        >
          {loading ? '提交中...' : '提交并获取解读'}
        </Button>
      </View>
    </View>
  )
}

export default PreciseFormPage
