/**
 * 环境配置
 */

export interface EnvConfig {
  /** API 基础地址 */
  apiBaseUrl: string
  /** 请求超时时间（毫秒） */
  timeout: number
  /** 是否启用调试模式 */
  debug: boolean
  /** 是否启用 mock 数据 */
  enableMock: boolean
}

/**
 * 开发环境配置
 */
const development: EnvConfig = {
  apiBaseUrl: 'http://localhost:3000/api',
  timeout: 15000,
  debug: true,
  enableMock: false,
}

/**
 * 生产环境配置
 */
const production: EnvConfig = {
  // TODO: 替换为实际的生产环境 API 地址
  apiBaseUrl: 'https://api.yourdomain.com/api',
  timeout: 10000,
  debug: false,
  enableMock: false,
}

/**
 * 获取当前环境
 */
const getEnv = (): 'development' | 'production' => {
  // Taro 构建时会注入 NODE_ENV 环境变量
  // 开发环境: development, 生产环境: production
  return process.env.NODE_ENV === 'production' ? 'production' : 'development'
}

/**
 * 当前环境配置
 */
const currentEnv = getEnv()

/**
 * 导出当前环境的配置
 */
export const config: EnvConfig = currentEnv === 'production' ? production : development

/**
 * 导出当前环境名称
 */
export const ENV = currentEnv

/**
 * 是否为开发环境
 */
export const isDev = currentEnv === 'development'

/**
 * 是否为生产环境
 */
export const isProd = currentEnv === 'production'
