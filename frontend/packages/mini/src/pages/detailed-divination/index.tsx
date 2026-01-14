/**
 * 详细解卦页面 - 微信小程序
 * 展示变卦、互卦、应期等详细分析（会员专享）
 */

import { useState, useEffect } from 'react'
import { View, Text, ScrollView, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { divinationService } from '@zhouyi/shared/services/divination'
import { authService } from '@zhouyi/shared/services/auth'
import { useRouter } from '@tarojs/taro'
import './index.scss'

interface DetailedDivinationData {
  hexagram: {
    primary: {
      symbol: string
      name: string
      pinyin: string
    }
    changed: {
      symbol: string
      name: string
    }
    mutual: {
      symbol: string
      name: string
      description: string
    }
    changingLines: number[]
    lines: Array<{
      position: number
      symbol: string
      text: string
      isChanging: boolean
    }>
  }
  analysis: {
    changed: {
      name: string
      meaning: string
      advice: string
    }
    mutual: {
      name: string
      position: string
      meaning: string
    }
    timing: {
      period: string
      elements: string[]
      advice: string
    }
    overall: {
      summary: string
      advice: string
      luckyRating: number
    }
  }
  precise?: {
    personalizedAdvice: string
    precise: string
  }
}

function DetailedDivinationPage() {
  const router = useRouter()
  const recordId = router.params.recordId

  const [data, setData] = useState<DetailedDivinationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasMembership, setHasMembership] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  useEffect(() => {
    checkMembershipAndLoadData()
  }, [])

  /**
   * 检查会员资格并加载数据
   */
  const checkMembershipAndLoadData = async () => {
    try {
      setLoading(true)

      // 检查会员状态
      const membership = await authService.getMembershipInfo()
      const isMember = membership.type !== 'free' && !membership.isExpired
      setHasMembership(isMember)

      if (!isMember) {
        setShowUpgradeModal(true)
        return
      }

      // 加载详细解卦数据
      const detailedData = await divinationService.getDetailedDivination(recordId)

      // 尝试加载精准解读数据
      try {
        const preciseData = await divinationService.getPreciseInterpretation(recordId)
        detailedData.precise = preciseData
      } catch (preciseError) {
        // 精准解读未填写或加载失败，不阻塞主流程
        console.log('精准解读数据未填写或加载失败:', preciseError)
        detailedData.precise = undefined
      }

      setData(detailedData)
    } catch (error: any) {
      console.error('加载详细解卦失败:', error)
      Taro.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  /**
   * 跳转到会员页面
   */
  const handleUpgrade = () => {
    setShowUpgradeModal(false)
    Taro.navigateTo({
      url: '/pages/membership/index'
    })
  }

  /**
   * 关闭升级弹窗
   */
  const handleCloseModal = () => {
    setShowUpgradeModal(false)
    Taro.navigateBack()
  }

  if (loading) {
    return (
      <View className='detailed-divination-page loading'>
        <Text>加载中...</Text>
      </View>
    )
  }

  return (
    <View className='detailed-divination-page'>
      {/* 升级弹窗 */}
      {showUpgradeModal && (
        <View className='upgrade-modal'>
          <View className='modal-content'>
            <Text className='modal-icon'>👑</Text>
            <Text className='modal-title'>会员专享功能</Text>
            <Text className='modal-desc'>
              详细解卦包含变卦分析、互卦分析、应期分析等专业内容，需要会员权限才能查看
            </Text>
            <View className='modal-features'>
              <Text className='feature-item'>✓ 变卦深度分析</Text>
              <Text className='feature-item'>✓ 互卦含义解读</Text>
              <Text className='feature-item'>✓ 应期时间预测</Text>
              <Text className='feature-item'>✓ 综合运势分析</Text>
            </View>
            <Button
              className='upgrade-button'
              onClick={handleUpgrade}
            >
              立即开通会员
            </Button>
            <Button
              className='close-button'
              onClick={handleCloseModal}
            >
              返回
            </Button>
          </View>
        </View>
      )}

      {data && (
        <ScrollView className='content' scrollY>
          {/* 卦象对比 */}
          <View className='hexagram-comparison'>
            <View className='comparison-item'>
              <Text className='comparison-label'>本卦</Text>
              <Text className='comparison-symbol'>{data.hexagram.primary.symbol}</Text>
              <Text className='comparison-name'>{data.hexagram.primary.name}</Text>
            </View>
            <Text className='comparison-arrow'>→</Text>
            <View className='comparison-item'>
              <Text className='comparison-label'>变卦</Text>
              <Text className='comparison-symbol'>{data.hexagram.changed.symbol}</Text>
              <Text className='comparison-name'>{data.hexagram.changed.name}</Text>
            </View>
          </View>

          {/* 变卦分析 */}
          <View className='analysis-section'>
            <Text className='section-title'>变卦分析</Text>
            <View className='analysis-card'>
              <Text className='analysis-subtitle'>{data.analysis.changed.name}</Text>
              <Text className='analysis-text'>{data.analysis.changed.meaning}</Text>
              <View className='analysis-advice'>
                <Text className='advice-label'>建议：</Text>
                <Text className='advice-text'>{data.analysis.changed.advice}</Text>
              </View>
            </View>
          </View>

          {/* 互卦分析 */}
          <View className='analysis-section'>
            <Text className='section-title'>互卦分析</Text>
            <View className='analysis-card'>
              <View className='mutual-header'>
                <Text className='mutual-symbol'>{data.hexagram.mutual.symbol}</Text>
                <View className='mutual-info'>
                  <Text className='mutual-name'>{data.hexagram.mutual.name}</Text>
                  <Text className='mutual-position'>{data.analysis.mutual.position}</Text>
                </View>
              </View>
              <Text className='analysis-text'>{data.analysis.mutual.meaning}</Text>
            </View>
          </View>

          {/* 应期分析 */}
          <View className='analysis-section'>
            <Text className='section-title'>应期分析</Text>
            <View className='analysis-card timing-card'>
              <View className='timing-period'>
                <Text className='period-label'>预测时期：</Text>
                <Text className='period-value'>{data.analysis.timing.period}</Text>
              </View>
              <View className='timing-elements'>
                <Text className='elements-label'>关键要素：</Text>
                {data.analysis.timing.elements.map((element, index) => (
                  <Text key={index} className='element-tag'>{element}</Text>
                ))}
              </View>
              <View className='timing-advice'>
                <Text className='advice-label'>时机建议：</Text>
                <Text className='advice-text'>{data.analysis.timing.advice}</Text>
              </View>
            </View>
          </View>

          {/* 综合建议 */}
          <View className='analysis-section'>
            <Text className='section-title'>综合建议</Text>
            <View className='analysis-card overall-card'>
              <Text className='overall-summary'>{data.analysis.overall.summary}</Text>
              <View className='overall-advice'>
                <Text className='advice-label'>行动建议：</Text>
                <Text className='advice-text'>{data.analysis.overall.advice}</Text>
              </View>
              <View className='lucky-rating'>
                <Text className='rating-label'>吉祥指数：</Text>
                <Text className='rating-stars'>
                  {'★'.repeat(data.analysis.overall.luckyRating)}
                  {'☆'.repeat(5 - data.analysis.overall.luckyRating)}
                </Text>
              </View>
            </View>
          </View>

          {/* 精准解读部分 */}
          {data.precise ? (
            <View className='analysis-section precise-section'>
              <Text className='section-title'>✨ 精准解读</Text>
              <View className='analysis-card precise-card'>
                <View className='precise-header'>
                  <Text className='precise-icon'>🎯</Text>
                  <Text className='precise-title'>基于您个人信息的专属解读</Text>
                </View>
                <View className='precise-content'>
                  <Text className='precise-text'>{data.precise.precise}</Text>
                </View>
                <View className='precise-advice'>
                  <Text className='advice-label'>个性化建议：</Text>
                  <Text className='advice-text'>{data.precise.personalizedAdvice}</Text>
                </View>
              </View>
            </View>
          ) : (
            <View className='analysis-section precise-section'>
              <View className='analysis-card precise-upsell-card'>
                <View className='upsell-header'>
                  <Text className='upsell-icon'>🎁</Text>
                  <Text className='upsell-title'>获取精准解读</Text>
                </View>
                <Text className='upsell-desc'>
                  填写您的个人信息，获得基于生辰八字的专属精准解读
                </Text>
                <View className='upsell-features'>
                  <Text className='feature-item'>✓ 基于您的生辰八字</Text>
                  <Text className='feature-item'>✓ 针对您的问题量身定制</Text>
                  <Text className='feature-item'>✓ 更精准的解读和建议</Text>
                </View>
                <Button
                  className='upsell-button'
                  onClick={() => {
                    Taro.navigateTo({
                      url: `/pages/precise-form/index?recordId=${recordId}`
                    })
                  }}
                >
                  填写信息获取精准解读
                </Button>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  )
}

export default DetailedDivinationPage
