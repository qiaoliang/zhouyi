/**
 * 每日一卦页面 - 微信小程序
 * 展示今日推荐的卦象和解读
 */

import { useState, useEffect } from 'react'
import { View, Text, ScrollView, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { dailyHexagramService, DailyHexagram } from '@zhouyi/shared/services/daily-hexagram'
import { authService } from '@zhouyi/shared/services/auth'
import dayjs from 'dayjs'
import './index.scss'

function DailyPage() {
  const [dailyHexagram, setDailyHexagram] = useState<DailyHexagram | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  /**
   * 加载数据
   */
  const loadData = async () => {
    try {
      setLoading(true)

      // 检查登录状态
      const user = await authService.getCurrentUser()
      setIsLoggedIn(!!user)

      // 获取今日卦象
      const today = await dailyHexagramService.getToday()
      setDailyHexagram(today)
      setIsLiked(today.likedByUser || false)
      setLikeCount(today.likes || 0)
    } catch (error) {
      console.error('加载今日卦象失败:', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  /**
   * 点赞
   */
  const handleLike = async () => {
    if (!isLoggedIn) {
      Taro.showModal({
        title: '提示',
        content: '请先登录',
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

    if (!dailyHexagram) return

    try {
      const result = await dailyHexagramService.like(dailyHexagram.id)
      setIsLiked(result.liked)
      setLikeCount(result.likes)
    } catch (error) {
      console.error('点赞失败:', error)
    }
  }

  /**
   * 分享
   */
  const handleShare = async () => {
    if (!isLoggedIn) {
      Taro.showModal({
        title: '提示',
        content: '请先登录',
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

    if (!dailyHexagram) return

    try {
      await dailyHexagramService.share(dailyHexagram.id)
      Taro.showShareMenu({
        withShareTicket: true
      })
    } catch (error) {
      console.error('分享失败:', error)
    }
  }

  if (loading) {
    return (
      <View className='daily-page loading'>
        <Text>加载中...</Text>
      </View>
    )
  }

  if (!dailyHexagram) {
    return (
      <View className='daily-page empty'>
        <Text>暂无今日卦象</Text>
      </View>
    )
  }

  return (
    <View className='daily-page'>
      {/* 头部 */}
      <View className='header'>
        <Text className='header-date'>{dayjs().format('YYYY年MM月DD日')}</Text>
        <Text className='header-title'>每日一卦</Text>
        <Text className='header-subtitle'>每日智慧，指引人生</Text>
      </View>

      <ScrollView className='content' scrollY>
        {/* 卦象卡片 */}
        <View className='hexagram-card'>
          <View className='hexagram-symbol'>
            <Text className='symbol-text'>{dailyHexagram.hexagram.symbol}</Text>
          </View>
          <Text className='hexagram-name'>{dailyHexagram.hexagram.name}</Text>
        </View>

        {/* 解读 */}
        <View className='interpretation-section'>
          <View className='section-title'>
            <Text className='title-text'>整体运势</Text>
          </View>
          <View className='interpretation-card'>
            <Text className='interpretation-text'>{dailyHexagram.interpretation.overall}</Text>
          </View>
        </View>

        {/* 各方面运势 */}
        <View className='fortune-section'>
          <View className='fortune-item'>
            <View className='fortune-icon'>💼</View>
            <View className='fortune-content'>
              <Text className='fortune-title'>事业</Text>
              <Text className='fortune-text'>{dailyHexagram.interpretation.career}</Text>
            </View>
          </View>

          <View className='fortune-item'>
            <View className='fortune-icon'>❤️</View>
            <View className='fortune-content'>
              <Text className='fortune-title'>感情</Text>
              <Text className='fortune-text'>{dailyHexagram.interpretation.relationships}</Text>
            </View>
          </View>

          <View className='fortune-item'>
            <View className='fortune-icon'>💪</View>
            <View className='fortune-content'>
              <Text className='fortune-title'>健康</Text>
              <Text className='fortune-text'>{dailyHexagram.interpretation.health}</Text>
            </View>
          </View>

          <View className='fortune-item'>
            <View className='fortune-icon'>💰</View>
            <View className='fortune-content'>
              <Text className='fortune-title'>财运</Text>
              <Text className='fortune-text'>{dailyHexagram.interpretation.wealth}</Text>
            </View>
          </View>
        </View>

        {/* 互动 */}
        <View className='interaction-section'>
          <Button
            className={`like-button ${isLiked ? 'liked' : ''}`}
            onClick={handleLike}
          >
            <Text className='like-icon'>{isLiked ? '❤️' : '🤍'}</Text>
            <Text className='like-text'>{isLiked ? '已点赞' : '点赞'}</Text>
            <Text className='like-count'>{likeCount}</Text>
          </Button>

          <Button
            className='share-button'
            onClick={handleShare}
            openType='share'
          >
            <Text className='share-icon'>📤</Text>
            <Text className='share-text'>分享</Text>
          </Button>
        </View>
      </ScrollView>
    </View>
  )
}

export default DailyPage
