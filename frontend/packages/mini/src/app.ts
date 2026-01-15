/**
 * 周易通微信小程序 - 主入口
 */

import { useLaunch } from '@tarojs/taro'
import { authService } from '@zhouyi/shared/services/auth'
import './app.scss'

function App(props) {
  const { children } = props

  useLaunch(async () => {
    console.log('App launched.')

    // 恢复用户的认证 token
    try {
      await authService.restoreToken()
      console.log('Token restored successfully')
    } catch (error) {
      console.error('Failed to restore token:', error)
    }
  })

  // children 是将要会渲染的页面
  return children
}

export default App
