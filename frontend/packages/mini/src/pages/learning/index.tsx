/**
 * 学习页面 - 微信小程序
 * 展示课程模块列表和学习进度
 */

import { useState, useEffect } from 'react'
import { View, Text, ScrollView, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { learningService } from '@zhouyi/shared/services/learning'
import { authService } from '@zhouyi/shared/services/auth'
import './index.scss'

interface CourseModule {
  id: string
  title: string
  description: string
  order: number
  icon: string
  estimatedTime: number
  courses: {
    id: string
    title: string
    description: string
    order: number
    duration: number
  }[]
}

function LearningPage() {
  const [modules, setModules] = useState<CourseModule[]>([])
  const [loading, setLoading] = useState(true)
  const [progress, setProgress] = useState<any>(null)
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

      // 获取课程列表
      const result = await learningService.getAllModules()
      setModules(result.modules || [])

      // 如果已登录，获取学习进度
      if (user) {
        const userProgress = await learningService.getProgress()
        setProgress(userProgress)
      }
    } catch (error) {
      console.error('加载数据失败:', error)
      Taro.showToast({
        title: '加载失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  /**
   * 跳转到课程详情
   */
  const handleCourseClick = async (moduleId: string, courseId: string) => {
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

    Taro.navigateTo({
      url: `/pages/course-reader/index?moduleId=${moduleId}&courseId=${courseId}`
    })
  }

  /**
   * 渲染学习进度卡片
   */
  const renderProgressCard = () => {
    if (!isLoggedIn || !progress) return null

    const completedCount = progress.completedCourses || 0
    const totalCount = progress.totalCourses || 0
    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

    return (
      <View className='progress-card'>
        <View className='progress-header'>
          <Text className='progress-title'>学习进度</Text>
          <Text className='progress-percentage'>{percentage}%</Text>
        </View>
        <View className='progress-bar'>
          <View
            className='progress-fill'
            style={{ width: `${percentage}%` }}
          />
        </View>
        <View className='progress-stats'>
          <View className='stat-item'>
            <Text className='stat-value'>{completedCount}</Text>
            <Text className='stat-label'>已完成</Text>
          </View>
          <View className='stat-item'>
            <Text className='stat-value'>{totalCount}</Text>
            <Text className='stat-label'>总课程</Text>
          </View>
          <View className='stat-item'>
            <Text className='stat-value'>{progress.xp || 0}</Text>
            <Text className='stat-label'>经验值</Text>
          </View>
        </View>
      </View>
    )
  }

  /**
   * 渲染课程模块
   */
  const renderModule = (module: CourseModule) => (
    <View key={module.id} className='module-card'>
      <View className='module-header'>
        <View className='module-icon'>
          <Text className='module-icon-text'>{module.icon}</Text>
        </View>
        <View className='module-info'>
          <Text className='module-title'>{module.title}</Text>
          <Text className='module-desc'>{module.description}</Text>
          <Text className='module-time'>预计 {module.estimatedTime} 分钟</Text>
        </View>
      </View>
      <View className='course-list'>
        {module.courses.map(course => (
          <View
            key={course.id}
            className='course-item'
            onClick={() => handleCourseClick(module.id, course.id)}
          >
            <View className='course-info'>
              <Text className='course-title'>{course.title}</Text>
              <Text className='course-desc'>{course.description}</Text>
              <Text className='course-duration'>⏱ {course.duration} 分钟</Text>
            </View>
            <View className='course-arrow'>
              <Text className='arrow'>›</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  )

  if (loading) {
    return (
      <View className='learning-page loading'>
        <Text>加载中...</Text>
      </View>
    )
  }

  return (
    <View className='learning-page'>
      {/* 头部 */}
      <View className='header'>
        <Text className='header-title'>周易学习</Text>
        <Text className='header-subtitle'>循序渐进，掌握易经智慧</Text>
      </View>

      {/* 学习进度 */}
      {renderProgressCard()}

      {/* 课程列表 */}
      <ScrollView className='module-list' scrollY>
        {modules.map(module => renderModule(module))}

        {/* 未登录提示 */}
        {!isLoggedIn && (
          <View className='login-tip'>
            <Text className='tip-text'>登录后记录学习进度</Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

export default LearningPage
