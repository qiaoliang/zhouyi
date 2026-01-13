/**
 * 每日卦象服务
 * 处理每日一卦相关功能
 */

import { apiClient } from './api';
import { Hexagram } from '../types';

/**
 * 每日卦象数据
 */
export interface DailyHexagram {
  id: string;
  date: string;
  hexagram: Hexagram;
  interpretation: {
    overall: string;
    career: string;
    relationships: string;
    health: string;
    wealth: string;
  };
  likes: number;
  shares: number;
  likedByUser?: boolean;
}

/**
 * 每日卦象服务类
 */
class DailyHexagramService {
  /**
   * 获取今日卦象
   */
  async getToday(): Promise<DailyHexagram> {
    return apiClient.get('/daily-hexagram/today');
  }

  /**
   * 获取历史每日一卦（需要会员）
   */
  async getHistory(days: number = 30): Promise<{
    history: DailyHexagram[];
    summary: {
      total: number;
      days: number;
    };
  }> {
    return apiClient.get(`/daily-hexagram/history?days=${days}`);
  }

  /**
   * 点赞每日一卦
   */
  async like(id: string): Promise<{ liked: boolean; likes: number }> {
    return apiClient.post(`/daily-hexagram/${id}/like`, {});
  }

  /**
   * 分享每日一卦
   */
  async share(id: string): Promise<{ shared: boolean; shares: number }> {
    return apiClient.post(`/daily-hexagram/${id}/share`, {});
  }
}

export const dailyHexagramService = new DailyHexagramService();
