/**
 * 用户相关 API
 */

import request from '@/utils/request'
import type { PageParams, PageData } from '@/types/request'

/**
 * 用户信息
 */
export interface UserInfo {
  id: string
  nickname: string
  avatar: string
  email?: string
  createdAt: string
}

/**
 * 登录参数
 */
export interface LoginParams {
  email: string
  password: string
}

/**
 * 登录响应
 */
export interface LoginResult {
  token: string
  userInfo: UserInfo
}

/**
 * 用户登录
 */
export const login = (data: LoginParams) => {
  return request<LoginResult>({
    url: '/user/login',
    method: 'POST',
    data,
    showLoading: true,
    loadingText: '登录中...',
  })
}

/**
 * 获取用户信息
 */
export const getUserInfo = () => {
  return request<UserInfo>({
    url: '/user/profile',
    method: 'GET',
    needAuth: true,
  })
}

/**
 * 更新用户信息
 */
export const updateUserInfo = (data: Partial<UserInfo>) => {
  return request<UserInfo>({
    url: '/user/profile',
    method: 'PUT',
    data,
    needAuth: true,
    showLoading: true,
  })
}

/**
 * 用户登出
 */
export const logout = () => {
  return request<void>({
    url: '/user/logout',
    method: 'POST',
    needAuth: true,
  })
}
