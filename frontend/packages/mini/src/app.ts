/**
 * 周易通微信小程序 - 主入口
 */

import { useLaunch } from '@tarojs/taro'
import './app.scss'

function App(props) {
  const { children } = props

  useLaunch(() => {
    console.log('App launched.')
  })

  // children 是将要会渲染的页面
  return children
}

export default App
