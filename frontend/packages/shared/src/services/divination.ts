/**
 * 卜卦服务
 * 处理起卦、历史记录等
 */

import { apiClient } from './api';
import { Hexagram, DivinationRecord } from '../types';

/**
 * 卜卦服务类
 */
class DivinationService {
  /**
   * 金钱课起卦
   */
  async performDivination(device?: { platform: string; model?: string }): Promise<{
    hexagram: Hexagram;
    recordId: string;
    timestamp: string;
  }> {
    return apiClient.post('/divination/divinate', { device });
  }

  /**
   * 获取卜卦历史
   */
  async getHistory(page = 1, limit = 20): Promise<{
    records: DivinationRecord[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    return apiClient.get(`/divination/history?page=${page}&limit=${limit}`);
  }

  /**
   * 获取卜卦记录详情
   */
  async getRecord(recordId: string): Promise<DivinationRecord> {
    return apiClient.get(`/divination/record/${recordId}`);
  }

  /**
   * 收藏/取消收藏记录
   */
  async toggleFavorite(recordId: string): Promise<{ isFavorite: boolean }> {
    return apiClient.post(`/divination/record/${recordId}/favorite`, {});
  }

  /**
   * 获取基础解卦
   */
  async getBasicInterpretation(recordId: string): Promise<DivinationRecord> {
    return apiClient.get(`/divination/record/${recordId}`);
  }

  /**
   * 获取详细解卦（付费）
   */
  async getDetailedInterpretation(recordId: string): Promise<any> {
    return apiClient.get(`/divination/record/${recordId}/detailed`);
  }

  /**
   * 购买详细解卦（单次付费）
   */
  async purchaseDetailedInterpretation(recordId: string): Promise<any> {
    return apiClient.post(`/divination/record/${recordId}/purchase-detailed`, {});
  }

  /**
   * 保存精准信息
   */
  async savePreciseInfo(
    recordId: string,
    info: {
      name: string;
      gender: 'male' | 'female';
      birthDate: string;
      question: string;
    }
  ): Promise<any> {
    return apiClient.post(`/divination/record/${recordId}/precise-info`, info);
  }

  /**
   * 获取精准解卦（付费）
   */
  async getPreciseInterpretation(recordId: string): Promise<{
    precise: string;
    personalizedAdvice: string;
  }> {
    return apiClient.post(`/divination/record/${recordId}/precise`, {});
  }

  /**
   * 获取详细解卦（付费，包含变卦、互卦、应期分析）
   */
  async getDetailedDivination(recordId: string): Promise<any> {
    return apiClient.get(`/divination/record/${recordId}/detailed`);
  }

  /**
   * 获取 AI 深度解读
   * @param recordId 卜卦记录 ID
   * @param question 用户的问题（可选）
   * @returns AI 解读结果
   */
  async getAIInterpretation(
    recordId: string,
    question?: string,
  ): Promise<{
    success: boolean;
    data: {
      recordId: string;
      aiInterpretation: {
        summary: string;
        detailedAnalysis: string;
        advice: string;
        createdAt: Date;
      };
      cached: boolean;
    };
    message: string;
    timestamp: number;
  }> {
    return apiClient.post(`/divination/record/${recordId}/ai-interpretation`, { question });
  }
}

export const divinationService = new DivinationService();
