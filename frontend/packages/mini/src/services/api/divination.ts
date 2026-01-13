/**
 * 占卜相关 API
 */

import request from '@/utils/request'
import type { PageParams, PageData } from '@/types/request'

/**
 * 六爻卦象
 */
export interface Hexagram {
  id: string
  name: string
  upperTrigram: string // 上卦
  lowerTrigram: string // 下卦
  description: string
  interpretation: string
}

/**
 * 占卜记录
 */
export interface DivinationRecord {
  id: string
  userId: string
  hexagramId: string
  hexagram?: Hexagram
  question?: string
  method: string // 占卜方法：金钱、蓍草等
  createdAt: string
}

/**
 * 占卜请求参数
 */
export interface DivinationParams {
  question?: string
  method: 'coin' | 'yarrow' // 金钱卦 / 蓍草卦
  birthDate?: string // 起卦参考的生辰八字
  location?: string // 起卦参考的地点
}

/**
 * 占卜结果
 */
export interface DivinationResult {
  record: DivinationRecord
  hexagram: Hexagram
  changingLines?: number[] // 动爻位置
}

/**
 * 起卦
 */
export const castHexagram = (data: DivinationParams) => {
  return request<DivinationResult>({
    url: '/divination/cast',
    method: 'POST',
    data,
    needAuth: true,
    showLoading: true,
    loadingText: '起卦中...',
  })
}

/**
 * 获取占卜历史
 */
export const getDivinationHistory = (params: PageParams) => {
  return request<PageData<DivinationRecord>>({
    url: '/divination/history',
    method: 'GET',
    data: params,
    needAuth: true,
  })
}

/**
 * 获取占卜详情
 */
export const getDivinationDetail = (id: string) => {
  return request<DivinationResult>({
    url: `/divination/${id}`,
    method: 'GET',
    needAuth: true,
  })
}

/**
 * 获取六十四卦列表
 */
export const getAllHexagrams = () => {
  return request<Hexagram[]>({
    url: '/divination/hexagrams',
    method: 'GET',
  })
}

/**
 * 获取单个卦象详情
 */
export const getHexagramDetail = (id: string) => {
  return request<Hexagram>({
    url: `/divination/hexagrams/${id}`,
    method: 'GET',
  })
}
