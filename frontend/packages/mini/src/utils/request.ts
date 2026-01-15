/**
 * 小程序网络请求工具
 * 支持请求拦截、响应拦截、错误处理、Token 管理
 */

import { config as envConfig } from '@/config/env'
import type { RequestConfig, ResponseData, RequestError } from '@/types/request'

/**
 * Token 存储键
 */
const TOKEN_KEY = 'auth_token'

/**
 * 获取 Token
 */
const getToken = (): string | null => {
  try {
    // 检查 wx 对象是否存在
    if (typeof wx === 'undefined' || !wx.getStorageSync) {
      console.warn('wx.getStorageSync is not available')
      return null
    }
    const token = wx.getStorageSync(TOKEN_KEY)
    // 检查返回值是否为 undefined（游客模式下可能返回 undefined）
    return token !== undefined ? token : null
  } catch (error) {
    console.error('获取 Token 失败:', error)
    return null
  }
}

/**
 * 设置 Token
 */
export const setToken = (token: string): void => {
  try {
    // 检查 wx 对象是否存在
    if (typeof wx === 'undefined' || !wx.setStorageSync) {
      console.warn('wx.setStorageSync is not available')
      return
    }
    wx.setStorageSync(TOKEN_KEY, token)
  } catch (error) {
    console.error('设置 Token 失败:', error)
  }
}

/**
 * 移除 Token
 */
export const removeToken = (): void => {
  try {
    // 检查 wx 对象是否存在
    if (typeof wx === 'undefined' || !wx.removeStorageSync) {
      console.warn('wx.removeStorageSync is not available')
      return
    }
    wx.removeStorageSync(TOKEN_KEY)
  } catch (error) {
    console.error('移除 Token 失败:', error)
  }
}

/**
 * 请求拦截器
 */
const requestInterceptor = (config: RequestConfig): RequestConfig => {
  // 添加 Token
  const token = getToken()
  if (token && config.needAuth !== false) {
    config.header = {
      ...config.header,
      Authorization: `Bearer ${token}`,
    }
  }

  // 显示加载提示
  if (config.showLoading) {
    wx.showLoading({
      title: config.loadingText || '加载中...',
      mask: true,
    })
  }

  // 调试日志
  if (process.env.NODE_ENV === 'development') {
    console.log('【请求拦截器】', {
      url: config.url,
      method: config.method,
      data: config.data,
      header: config.header,
    })
  }

  return config
}

/**
 * 响应拦截器
 */
const responseInterceptor = <T>(response: any, config: RequestConfig): T => {
  // 关闭加载提示
  if (config.showLoading) {
    wx.hideLoading()
  }

  const { statusCode, data } = response

  // 调试日志
  if (process.env.NODE_ENV === 'development') {
    console.log('【响应拦截器】', {
      url: config.url,
      statusCode,
      data,
    })
  }

  // HTTP 状态码检查
  if (statusCode >= 200 && statusCode < 300) {
    // 业务状态码检查
    if (data.code === 0 || data.code === 200) {
      return data.data as T
    }

    // 业务错误
    const error: RequestError = new Error(data.message || '请求失败')
    error.code = data.code
    error.data = data
    throw error
  }

  // HTTP 错误
  const error: RequestError = new Error(data?.message || `请求失败: ${statusCode}`)
  error.code = statusCode
  error.data = data
  throw error
}

/**
 * 错误处理
 */
const errorHandler = (error: RequestError, config: RequestConfig): void => {
  // 关闭加载提示
  if (config.showLoading) {
    wx.hideLoading()
  }

  // 网络错误
  if (!error.code) {
    error.isNetworkError = true
  }

  // 调试日志
  if (process.env.NODE_ENV === 'development') {
    console.error('【请求错误】', {
      url: config.url,
      error: error.message,
      code: error.code,
      data: error.data,
    })
  }

  // 显示错误提示
  if (config.showError !== false) {
    let message = error.message

    // 根据错误码显示不同提示
    if (error.code === 401) {
      message = '请先登录'
      // 不自动跳转到登录页，让用户自己决定
    } else if (error.code === 403) {
      message = '没有权限访问'
    } else if (error.code === 404) {
      message = '请求的资源不存在'
    } else if (error.code === 500) {
      message = '服务器错误，请稍后重试'
    } else if (error.isNetworkError) {
      message = '网络连接失败，请检查网络'
    }

    wx.showToast({
      title: message,
      icon: 'none',
      duration: 2000,
    })
  }

  throw error
}

/**
 * 网络请求封装
 */
function request<T = any>(config: RequestConfig): Promise<T> {
  // 请求拦截
  const interceptedConfig = requestInterceptor(config)

  return new Promise<T>((resolve, reject) => {
    wx.request({
      url: `${interceptedConfig.apiBaseUrl || envConfig.apiBaseUrl}${interceptedConfig.url}`,
      method: interceptedConfig.method || 'GET',
      data: interceptedConfig.data,
      header: {
        'Content-Type': 'application/json',
        ...interceptedConfig.header,
      },
      timeout: interceptedConfig.timeout || envConfig.timeout,
      success: (res) => {
        try {
          const data = responseInterceptor<T>(res, interceptedConfig)
          resolve(data)
        } catch (error) {
          errorHandler(error as RequestError, interceptedConfig)
          reject(error)
        }
      },
      fail: (err) => {
        const error: RequestError = new Error(err.errMsg || '网络请求失败')
        error.isNetworkError = true
        errorHandler(error, interceptedConfig)
        reject(error)
      },
    })
  })
}

/**
 * 导出请求工具
 */
export default request
