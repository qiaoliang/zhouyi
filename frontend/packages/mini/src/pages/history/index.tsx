/**
 * 历史记录页面 - 微信小程序
 * 展示用户的卜卦历史记录
 */

import { useState, useEffect } from 'react'
import { View, Text, ScrollView, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { divinationService } from '@zhouyi/shared/services/divination'
import { authService } from '@zhouyi/shared/services/auth'
import dayjs from 'dayjs'
import './index.scss'

interface DivinationRecord {
  _id: string
  userId: string
  hexagram: {
    primary: {
      symbol: string
      name: string
      pinyin: string
    }
    changed?: {
      symbol: string
      name: string
    }
    changingLines?: number[]
  }
  interpretation?: {
    basic?: {
      hexagramName: string
    }
  }
  createdAt: string
  isFavorite: boolean
}

function HistoryPage() {
  const [records, setRecords] = useState<DivinationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [isGuest, setIsGuest] = useState(false)

  useEffect(() => {
    checkGuestStatus()
  }, [])

  /**
   * 检查游客状态
   */
  const checkGuestStatus = async () => {
    const guestStatus = await authService.isGuest()
    setIsGuest(guestStatus)

    if (!guestStatus) {
      loadRecords()
    }
  }

  /**
   * 加载历史记录
   */
  const loadRecords = async (pageNum: number = 1) => {
    try {
      if (pageNum === 1) {
        setLoading(true)
      }

      const result = await divinationService.getHistory(pageNum, 20)

      if (pageNum === 1) {
        setRecords(result.records)
      } else {
        setRecords(prev => [...prev, ...result.records])
      }

      setHasMore(pageNum < result.pagination.totalPages)
      setPage(pageNum)
    } catch (error: any) {
      console.error('加载历史记录失败:', error)

      // 根据错误类型显示不同的提示
      let message = '加载失败'
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        message = '请先登录'
      }

      Taro.showToast({
        title: message,
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  /**
   * 加载更多
   */
  const handleLoadMore = () => {
    if (!hasMore || loading) return
    loadRecords(page + 1)
  }

  /**
   * 切换收藏状态
   */
  const handleToggleFavorite = async (recordId: string) => {
    try {
      await divinationService.toggleFavorite(recordId)
      setRecords(prev =>
        prev.map(r => {
          const id = r._id || r.id
          if (id === recordId) {
            return {...r, isFavorite: !r.isFavorite}
          }
          return r
        })
      )
      Taro.showToast({
        title: '操作成功',
        icon: 'success'
      })
    } catch (error) {
      console.error('切换收藏失败:', error)
    }
  }

  /**
   * 删除记录
   */
  const handleDelete = async (recordId: string) => {
    try {
      await Taro.showModal({
        title: '删除记录',
        content: '确定要删除这条起卦记录吗？',
      }).then(async (res) => {
        if (res.confirm) {
          // TODO: 调用删除API
          setRecords(prev => prev.filter(r => {
            const id = r._id || r.id
            return id !== recordId
          }))
          Taro.showToast({
            title: '删除成功',
            icon: 'success'
          })
        }
      })
    } catch (error) {
      console.error('删除记录失败:', error)
    }
  }

  /**
   * 渲染游客提示
   */
  const renderGuestHint = () => (
    <View className='guest-hint'>
      <Text className='hint-icon'>🔒</Text>
      <Text className='hint-title'>请先登录</Text>
      <Text className='hint-text'>登录后可以查看起卦历史记录</Text>
      <Button
        className='login-button'
        onClick={() => Taro.navigateTo({url: '/pages/login/index'})}
      >
        立即登录
      </Button>
    </View>
  )

  /**
   * 渲染历史记录项
   */
  const renderRecord = (record: DivinationRecord) => (
    <View key={record._id} className='record-item'>
      <View className='record-header'>
        <Text className='record-symbol'>{record.hexagram.primary.symbol}</Text>
        <View className='record-info'>
          <Text className='record-name'>
            {record.interpretation?.basic?.hexagramName || record.hexagram.primary.name}
          </Text>
          <Text className='record-time'>
            {dayjs(record.createdAt).format('YYYY-MM-DD HH:mm')}
          </Text>
        </View>
      </View>

      {record.hexagram.changingLines && record.hexagram.changingLines.length > 0 && (
        <View className='record-changing'>
          <Text className='changing-text'>
            变爻：第{record.hexagram.changingLines.join('、')}爻
          </Text>
        </View>
      )}

      <View className='record-actions'>
        <Button
          className='action-button'
          onClick={() => handleToggleFavorite(record._id)}
        >
          <Text className='action-icon'>{record.isFavorite ? '❤️' : '🤍'}</Text>
          <Text className='action-text'>{record.isFavorite ? '已收藏' : '收藏'}</Text>
        </Button>
        <Button
          className='action-button delete'
          onClick={() => handleDelete(record._id)}
        >
          <Text className='action-icon'>🗑️</Text>
          <Text className='action-text'>删除</Text>
        </Button>
      </View>
    </View>
  )

  // 游客模式
  if (isGuest) {
    return (
      <View className='history-page'>
        <View className='header'>
          <Text className='header-title'>起卦历史</Text>
          <Text className='header-subtitle'>回顾过往，鉴往知来</Text>
        </View>
        {renderGuestHint()}
      </View>
    )
  }

  // 加载中
  if (loading) {
    return (
      <View className='history-page loading'>
        <Text>加载中...</Text>
      </View>
    )
  }

  // 空状态
  if (records.length === 0) {
    return (
      <View className='history-page'>
        <View className='header'>
          <Text className='header-title'>起卦历史</Text>
          <Text className='header-subtitle'>回顾过往，鉴往知来</Text>
        </View>
        <View className='empty-state'>
          <Text className='empty-icon'>📜</Text>
          <Text className='empty-text'>暂无历史记录</Text>
          <Text className='empty-subtext'>起卦后会在这里显示</Text>
        </View>
      </View>
    )
  }

  return (
    <View className='history-page'>
      <View className='header'>
        <Text className='header-title'>起卦历史</Text>
        <Text className='header-subtitle'>回顾过往，鉴往知来</Text>
      </View>

      <ScrollView
        className='record-list'
        scrollY
        onScrollToLower={handleLoadMore}
      >
        {records.map(record => renderRecord(record))}

        {hasMore && (
          <View className='load-more'>
            <Text className='load-more-text'>加载更多...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

export default HistoryPage
