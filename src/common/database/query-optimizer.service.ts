/**
 * 数据库查询优化服务
 * 提供查询优化、索引建议、慢查询分析等功能
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Document } from 'mongoose';

/**
 * 查询性能指标
 */
export interface QueryMetrics {
  operation: string;
  collection: string;
  executionTime: number;
  docsExamined: number;
  docsReturned: number;
  indexesUsed: string[];
  timestamp: Date;
}

/**
 * 慢查询日志
 */
export interface SlowQueryLog {
  query: string;
  collection: string;
  executionTime: number;
  threshold: number;
  timestamp: Date;
  suggestedIndexes?: string[];
}

/**
 * 索引建议
 */
export interface IndexSuggestion {
  collection: string;
  field: string;
  type: 'single' | 'compound' | 'text' | 'geospatial';
  priority: 'high' | 'medium' | 'low';
  reason: string;
}

@Injectable()
export class QueryOptimizerService {
  private readonly logger = new Logger(QueryOptimizerService.name);
  private readonly SLOW_QUERY_THRESHOLD = 100; // 100ms
  private queryMetrics: QueryMetrics[] = [];

  constructor() {}

  /**
   * 包装查询以记录性能指标
   */
  async trackQuery<T>(
    operation: string,
    collection: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    let result: T;

    try {
      result = await queryFn();
      return result;
    } finally {
      const executionTime = Date.now() - startTime;

      // 记录性能指标
      this.queryMetrics.push({
        operation,
        collection,
        executionTime,
        docsExamined: 0, // 需要从explain结果中获取
        docsReturned: 0,
        indexesUsed: [],
        timestamp: new Date(),
      });

      // 检查是否为慢查询
      if (executionTime > this.SLOW_QUERY_THRESHOLD) {
        this.logger.warn(
          `慢查询检测: ${collection}.${operation} 耗时 ${executionTime}ms`
        );
      }
    }
  }

  /**
   * 分析查询并获取执行计划
   */
  async analyzeQuery(model: Model<any>, filter: any): Promise<any> {
    try {
      const explainResult = await model.find(filter).explain('executionStats');

      return {
        executionTimeMillis: explainResult.executionTimeMillis,
        totalDocsExamined: explainResult.executionStats.totalDocsExamined,
        totalKeysExamined: explainResult.executionStats.totalKeysExamined,
        executionStages: explainResult.executionStats.executionStages,
        indexUsed: explainResult.executionStats.executionStages?.indexName,
      };
    } catch (error) {
      this.logger.error('查询分析失败:', error);
      return null;
    }
  }

  /**
   * 获取索引建议
   */
  getIndexSuggestions(
    collection: string,
    queryPatterns: any[]
  ): IndexSuggestion[] {
    const suggestions: IndexSuggestion[] = [];

    // 分析查询模式
    const fieldFrequency = new Map<string, number>();

    queryPatterns.forEach((pattern) => {
      Object.keys(pattern).forEach((field) => {
        const count = fieldFrequency.get(field) || 0;
        fieldFrequency.set(field, count + 1);
      });
    });

    // 生成索引建议
    fieldFrequency.forEach((frequency, field) => {
      if (frequency >= 5) {
        // 高频查询字段建议索引
        suggestions.push({
          collection,
          field,
          type: 'single',
          priority: frequency >= 10 ? 'high' : 'medium',
          reason: `字段 ${field} 在 ${frequency} 次查询中使用`,
        });
      }
    });

    return suggestions;
  }

  /**
   * 优化查询条件
   */
  optimizeQuery(filter: any): any {
    const optimized = { ...filter };

    // 1. 移除空值条件
    Object.keys(optimized).forEach((key) => {
      if (optimized[key] === null || optimized[key] === undefined) {
        delete optimized[key];
      }
    });

    // 2. 优化 $or 和 $and 查询
    if (optimized.$or && Array.isArray(optimized.$or)) {
      // 对 $or 条件进行排序,优先使用有索引的字段
      optimized.$or = optimized.$or.sort((a: any, b: any) => {
        const aKeys = Object.keys(a);
        const bKeys = Object.keys(b);
        return bKeys.length - aKeys.length;
      });
    }

    // 3. 优化正则表达式查询
    Object.keys(optimized).forEach((key) => {
      if (optimized[key] instanceof RegExp) {
        const regex = optimized[key] as RegExp;
        // 建议使用前缀查询而非正则
        if (!regex.ignoreCase && !regex.multiline) {
          const pattern = regex.source;
          if (pattern.startsWith('^') && !pattern.includes('$')) {
            this.logger.warn(
              `建议使用前缀查询替代正则: ${key} => ${pattern}`
            );
          }
        }
      }
    });

    return optimized;
  }

  /**
   * 创建分页查询
   */
  createPaginationQuery<T extends Document>(
    model: Model<T>,
    filter: any,
    options: {
      page?: number;
      limit?: number;
      sort?: any;
      projection?: any;
    } = {}
  ) {
    const { page = 1, limit = 10, sort = { _id: -1 }, projection } = options;

    // 优化:使用 skip + limit 分页,但对于大数据集建议使用基于键的分页
    return model
      .find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .select(projection || '');
  }

  /**
   * 创建基于键的分页查询(性能更好)
   */
  createKeyBasedPaginationQuery<T extends Document>(
    model: Model<T>,
    filter: any,
    options: {
      lastId?: string;
      limit?: number;
      sort?: any;
      projection?: any;
    } = {}
  ) {
    const { lastId, limit = 10, sort = { _id: 1 }, projection } = options;

    const queryFilter = { ...filter };

    // 如果有 lastId,添加范围查询
    if (lastId) {
      const sortField = Object.keys(sort)[0];
      const sortDirection = sort[sortField] === 1 ? '$gt' : '$lt';
      queryFilter[sortField] = { [sortDirection]: lastId };
    }

    return model
      .find(queryFilter)
      .sort(sort)
      .limit(limit)
      .select(projection || '');
  }

  /**
   * 批量查询优化
   */
  async batchFind<T extends Document>(
    model: Model<T>,
    ids: string[],
    options: {
      batchSize?: number;
      projection?: any;
    } = {}
  ): Promise<T[]> {
    const { batchSize = 100, projection } = options;
    const results: T[] = [];

    // 分批查询,避免内存溢出
    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      const batchResults = await model
        .find({ _id: { $in: batch } })
        .select(projection || '');
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 获取查询统计信息
   */
  getQueryStats(): {
    totalQueries: number;
    slowQueries: number;
    avgExecutionTime: number;
    collections: string[];
  } {
    const totalQueries = this.queryMetrics.length;
    const slowQueries = this.queryMetrics.filter(
      (m) => m.executionTime > this.SLOW_QUERY_THRESHOLD
    ).length;

    const avgExecutionTime =
      totalQueries > 0
        ? this.queryMetrics.reduce((sum, m) => sum + m.executionTime, 0) /
          totalQueries
        : 0;

    const collections = [
      ...new Set(this.queryMetrics.map((m) => m.collection)),
    ];

    return {
      totalQueries,
      slowQueries,
      avgExecutionTime: Math.round(avgExecutionTime),
      collections,
    };
  }

  /**
   * 清除查询指标
   */
  clearMetrics(): void {
    this.queryMetrics = [];
  }

  /**
   * 生成性能报告
   */
  generatePerformanceReport(): string {
    const stats = this.getQueryStats();
    const slowQueries = this.queryMetrics.filter(
      (m) => m.executionTime > this.SLOW_QUERY_THRESHOLD
    );

    let report = '\n=== 数据库查询性能报告 ===\n';
    report += `总查询数: ${stats.totalQueries}\n`;
    report += `慢查询数: ${slowQueries.length}\n`;
    report += `平均执行时间: ${stats.avgExecutionTime}ms\n`;
    report += `涉及集合: ${stats.collections.join(', ')}\n`;

    if (slowQueries.length > 0) {
      report += '\n=== 慢查询列表 ===\n';
      slowQueries.forEach((q) => {
        report += `- ${q.collection}.${q.operation}: ${q.executionTime}ms\n`;
      });
    }

    return report;
  }
}

/**
 * 查询优化装饰器
 */
export function OptimizeQuery(collectionName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const collection = collectionName || target.constructor.name;
      const optimizer: QueryOptimizerService = this.queryOptimizer;

      if (optimizer) {
        return optimizer.trackQuery(
          propertyKey,
          collection,
          () => originalMethod.apply(this, args)
        );
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
