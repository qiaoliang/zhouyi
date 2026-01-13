/**
 * 登录页面 - 微信小程序
 * 实现微信授权登录和手机号登录
 */

import { useState, useEffect } from 'react'
import { View, Text, Button, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useRouter } from '@tarojs/taro'
import { authService } from '@zhouyi/shared/services/auth'
import { Theme } from '@zhouyi/shared/theme'
import './index.scss'

function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [userInfo, setUserInfo] = useState<any>(null)

  useEffect(() => {
    // 检查是否已登录
    checkLoginStatus()
  }, [])

  /**
   * 检查登录状态
   */
  const checkLoginStatus = async () => {
    try {
      const user = await authService.getCurrentUser()
      if (user && !user.isGuest) {
        // 已登录，返回上一页或首页
        redirectToTarget()
      }
    } catch (error) {
      console.error('检查登录状态失败:', error)
    }
  }

  /**
   * 跳转到目标页面
   */
  const redirectToTarget = () => {
    const redirect = router.params.redirect
    if (redirect) {
      Taro.switchTab({
        url: `/pages/${redirect}/index`
      })
    } else {
      Taro.switchTab({
        url: '/pages/divination/index'
      })
    }
  }

  /**
   * 微信授权登录
   */
  const handleWechatLogin = async () => {
    try {
      setLoading(true)

      // 调用微信登录获取code
      const loginRes = await Taro.login()
      if (!loginRes.code) {
        throw new Error('获取微信授权码失败')
      }

      // 调用后端登录接口
      await authService.loginWithWechatMini({
        code: loginRes.code,
      })

      Taro.showToast({
        title: '登录成功',
        icon: 'success'
      })

      // 延迟跳转，让用户看到成功提示
      setTimeout(() => {
        redirectToTarget()
      }, 1500)
    } catch (error: any) {
      console.error('微信登录失败:', error)
      Taro.showToast({
        title: error.message || '登录失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  /**
   * 获取微信用户信息
   */
  const handleGetUserInfo = async (e: any) => {
    if (e.detail.errMsg !== 'getUserProfile:ok') {
      Taro.showToast({
        title: '需要授权才能继续',
        icon: 'none'
      })
      return
    }

    try {
      setLoading(true)
      setUserInfo(e.detail.userInfo)

      // 获取用户信息后再进行登录
      await handleWechatLogin()
    } catch (error) {
      console.error('获取用户信息失败:', error)
    } finally {
      setLoading(false)
    }
  }

  /**
   * 游客模式登录
   */
  const handleGuestLogin = async () => {
    try {
      setLoading(true)

      await Taro.showModal({
        title: '游客模式',
        content: '游客模式下可以体验基础功能，但历史记录不会保存，且只能卜卦2次。建议注册登录以获得完整体验。',
        confirmText: '继续体验',
        cancelText: '取消'
      }).then(async (res) => {
        if (res.confirm) {
          await authService.loginAsGuest()
          Taro.showToast({
            title: '进入游客模式',
            icon: 'success'
          })
          setTimeout(() => {
            redirectToTarget()
          }, 1500)
        }
      })
    } catch (error: any) {
      console.error('游客登录失败:', error)
      Taro.showToast({
        title: error.message || '游客登录失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='login-page'>
      {/* 顶部装饰 */}
      <View className='login-header'>
        <View className='logo-container'>
          <Text className='logo'>周易</Text>
          <Text className='logo-suffix'>通</Text>
        </View>
        <Text className='slogan'>探究天地奥秘，洞察人生智慧</Text>
      </View>

      {/* 登录方式 */}
      <View className='login-content'>
        <View className='login-info'>
          <Image
            src='https://img.icons8.com/color/96/wechat-new.png'
            className='wechat-icon'
          />
          <Text className='login-title'>微信一键登录</Text>
          <Text className='login-desc'>使用微信快速登录，无需记住密码</Text>
        </View>

        {/* 微信授权登录按钮 */}
        <Button
          className='wechat-button'
          onClick={handleWechatLogin}
          loading={loading}
          disabled={loading}
        >
          微信登录
        </Button>

        {/* 获取用户信息按钮（可选） */}
        <Button
          className='userinfo-button'
          openType='getUserInfo'
          onGetUserInfo={handleGetUserInfo}
          loading={loading}
          disabled={loading}
        >
          授权获取用户信息
        </Button>

        {/* 游客模式 */}
        <View className='guest-section'>
          <Button
            className='guest-button'
            onClick={handleGuestLogin}
            disabled={loading}
          >
            <Text className='guest-button-text'>游客模式体验</Text>
            <Text className='guest-button-desc'>无需注册，快速体验</Text>
          </Button>
        </View>

        {/* 协议 */}
        <View className='agreement'>
          <Text className='agreement-text'>
            登录即表示同意
            <Text className='agreement-link'>《用户协议》</Text>
            和
            <Text className='agreement-link'>《隐私政策》</Text>
          </Text>
        </View>
      </View>
    </View>
  )
}

export default LoginPage
