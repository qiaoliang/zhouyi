/**
 * 网络请求类型定义
 */

/**
 * HTTP 请求方法
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

/**
 * 请求配置
 */
export interface RequestConfig<T = any> {
  /** 请求路径 */
  url: string
  /** 请求方法 */
  method?: HttpMethod
  /** 请求数据 */
  data?: T
  /** 请求头 */
  header?: Record<string, string>
  /** API 基础地址（可选，默认使用环境配置） */
  apiBaseUrl?: string
  /** 请求超时时间（毫秒，可选，默认使用环境配置） */
  timeout?: number
  /** 是否显示加载提示 */
  showLoading?: boolean
  /** 加载提示文字 */
  loadingText?: string
  /** 是否显示错误提示 */
  showError?: boolean
  /** 是否需要认证 */
  needAuth?: boolean
}

/**
 * 响应数据结构
 */
export interface ResponseData<T = any> {
  /** 状态码 */
  code: number
  /** 响应消息 */
  message: string
  /** 响应数据 */
  data: T
}

/**
 * 分页请求参数
 */
export interface PageParams {
  /** 页码（从 1 开始） */
  page: number
  /** 每页数量 */
  pageSize: number
}

/**
 * 分页响应数据
 */
export interface PageData<T = any> {
  /** 数据列表 */
  list: T[]
  /** 总数 */
  total: number
  /** 当前页码 */
  page: number
  /** 每页数量 */
  pageSize: number
}

/**
 * 错误对象
 */
export interface RequestError extends Error {
  /** 错误码 */
  code?: number
  /** 错误数据 */
  data?: any
  /** 是否为网络错误 */
  isNetworkError?: boolean
}
