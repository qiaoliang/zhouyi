/**
 * 个人中心页面 - 微信小程序
 */

import { useState, useEffect } from 'react'
import { View, Text, Button, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { authService } from '@zhouyi/shared/services/auth'
import './index.scss'

function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [isGuest, setIsGuest] = useState(false)

  useEffect(() => {
    loadUserInfo()
  }, [])

  /**
   * 加载用户信息
   */
  const loadUserInfo = async () => {
    try {
      const userInfo = await authService.getCurrentUser()
      setUser(userInfo)

      if (userInfo) {
        const guestStatus = await authService.isGuest()
        setIsGuest(guestStatus)
      }
    } catch (error) {
      console.error('加载用户信息失败:', error)
    }
  }

  /**
   * 跳转到登录页
   */
  const handleLogin = () => {
    Taro.navigateTo({
      url: '/pages/login/index'
    })
  }

  /**
   * 退出登录
   */
  const handleLogout = async () => {
    try {
      await Taro.showModal({
        title: '退出登录',
        content: '确定要退出登录吗？',
      }).then(async (res) => {
        if (res.confirm) {
          await authService.logout()
          setUser(null)
          Taro.showToast({
            title: '已退出登录',
            icon: 'success'
          })
        }
      })
    } catch (error) {
      console.error('退出登录失败:', error)
    }
  }

  return (
    <View className='profile-page'>
      {/* 用户信息卡片 */}
      <View className='user-card'>
        {!user ? (
          <View className='user-info'>
            <View className='avatar-placeholder'>
              <Text className='avatar-text'>?</Text>
            </View>
            <View className='user-details'>
              <Text className='user-name'>未登录</Text>
              <Text className='user-phone'>登录后享受更多功能</Text>
            </View>
            <Button className='login-button' onClick={handleLogin}>
              立即登录
            </Button>
          </View>
        ) : (
          <View className='user-info'>
            <View className='avatar-placeholder'>
              <Text className='avatar-text'>
                {user.nickname?.charAt(0) || user.phone?.slice(-4) || '用'}
              </Text>
            </View>
            <View className='user-details'>
              <Text className='user-name'>
                {isGuest ? '游客用户' : (user.nickname || '周易学人')}
              </Text>
              <Text className='user-phone'>
                {user.phone
                  ? `${user.phone.slice(0, 3)}****${user.phone.slice(-4)}`
                  : isGuest
                  ? '游客模式'
                  : '未绑定手机'}
              </Text>
            </View>
            {isGuest && (
              <Button className='upgrade-button' onClick={handleLogin}>
                注册登录
              </Button>
            )}
          </View>
        )}
      </View>

      {/* 功能列表 */}
      <View className='menu-section'>
        <Text className='section-title'>账号设置</Text>
        <View className='menu-item'>
          <Text className='menu-item-text'>个人资料</Text>
        </View>
        <View className='menu-item'>
          <Text className='menu-item-text'>账号安全</Text>
        </View>
      </View>

      {user && !isGuest && (
        <View className='menu-section'>
          <Text className='section-title'>会员服务</Text>
          <View className='menu-item'>
            <Text className='menu-item-text'>会员中心</Text>
          </View>
        </View>
      )}

      <View className='menu-section'>
        <Text className='section-title'>其他</Text>
        <View className='menu-item'>
          <Text className='menu-item-text'>意见反馈</Text>
        </View>
        <View className='menu-item'>
          <Text className='menu-item-text'>关于我们</Text>
        </View>
      </View>

      {user && !isGuest && (
        <Button className='logout-button' onClick={handleLogout}>
          退出登录
        </Button>
      )}

      <Text className='version-text'>周易通 v1.0.0</Text>
    </View>
  )
}

export default ProfilePage
