/**
 * 卜卦页面 - 微信小程序
 */

import { useState, useEffect } from 'react'
import { View, Text, Button, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { divinationService } from '@zhouyi/shared/services/divination'
import { authService } from '@zhouyi/shared/services/auth'
import './index.scss'

function DivinationPage() {
  const [isDivining, setIsDivining] = useState(false)
  const [hexagram, setHexagram] = useState<any>(null)
  const [isGuest, setIsGuest] = useState(false)
  const [guestCount, setGuestCount] = useState(0)

  useEffect(() => {
    checkGuestStatus()
  }, [])

  /**
   * 检查游客状态
   */
  const checkGuestStatus = async () => {
    const guestStatus = await authService.isGuest()
    setIsGuest(guestStatus)

    if (guestStatus) {
      const count = await authService.getGuestDivinationCount()
      setGuestCount(count)
    }
  }

  /**
   * 执行起卦
   */
  const handleDivination = async () => {
    // 游客模式检查
    if (isGuest && guestCount >= 2) {
      Taro.showModal({
        title: '提示',
        content: '您的免费体验次数已用完，请登录注册',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            Taro.navigateTo({
              url: '/pages/login/index'
            })
          }
        }
      })
      return
    }

    setIsDivining(true)

    try {
      // 模拟摇卦动画
      await new Promise(resolve => setTimeout(resolve, 1500))

      const result = await divinationService.performDivination()
      setHexagram(result)

      // 更新游客卜卦次数
      if (isGuest) {
        const newCount = await authService.incrementGuestDivinationCount()
        setGuestCount(newCount)

        if (newCount >= 2) {
          setTimeout(() => {
            Taro.showModal({
              title: '提示',
              content: '您的免费体验次数已用完，请登录注册',
              confirmText: '去登录',
              success: (res) => {
                if (res.confirm) {
                  Taro.navigateTo({
                    url: '/pages/login/index'
                  })
                }
              }
            })
          }, 1000)
        }
      }

      Taro.showToast({
        title: '起卦成功',
        icon: 'success'
      })
    } catch (error: any) {
      console.error('起卦失败:', error)
      Taro.showToast({
        title: error.message || '起卦失败',
        icon: 'none'
      })
    } finally {
      setIsDivining(false)
    }
  }

  /**
   * 重置起卦
   */
  const handleReset = () => {
    setHexagram(null)
  }

  return (
    <View className='divination-page'>
      {/* 头部 */}
      <View className='header'>
        <Text className='header-title'>金钱课起卦</Text>
        <Text className='header-subtitle'>诚心所至，金石为开</Text>
        {isGuest && (
          <View className={`guest-hint ${guestCount >= 2 ? 'warning' : ''}`}>
            <Text className='guest-hint-text'>
              {guestCount >= 2
                ? '您的免费体验次数已用完，请登录注册'
                : `游客模式还可以卜卦 ${2 - guestCount} 次`}
            </Text>
          </View>
        )}
      </View>

      {/* 内容区 */}
      {!hexagram ? (
        <View className='content'>
          <View className='coin-container'>
            <Text className='coin-text'>?</Text>
          </View>
          <Button
            className={`divination-button ${isDivining || (isGuest && guestCount >= 2) ? 'disabled' : ''}`}
            onClick={handleDivination}
            disabled={isDivining || (isGuest && guestCount >= 2)}
            loading={isDivining}
          >
            <Text className='button-text'>
              {isGuest
                ? `游客还可卜卦 ${2 - guestCount} 次`
                : '诚心默念心中所问'}
            </Text>
          </Button>
        </View>
      ) : (
        <View className='result'>
          <View className='hexagram-header'>
            <Text className='hexagram-symbol'>{hexagram.hexagram.primary.symbol}</Text>
            <Text className='hexagram-name'>{hexagram.hexagram.primary.name}</Text>
            <Text className='hexagram-pinyin'>{hexagram.hexagram.primary.pinyin}</Text>
          </View>

          <Button
            className='reset-button'
            onClick={handleReset}
            disabled={isGuest && guestCount >= 2}
          >
            {isGuest && guestCount >= 2 ? '请先登录注册' : '再起一卦'}
          </Button>
        </View>
      )}
    </View>
  )
}

export default DivinationPage
