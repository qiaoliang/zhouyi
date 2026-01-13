/**
 * 数据库索引管理服务
 * 管理数据库索引,提供索引创建、删除、分析等功能
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

/**
 * 索引信息
 */
export interface IndexInfo {
  name: string;
  keys: any;
  unique: boolean;
  sparse: boolean;
  background: boolean;
  version: number;
}

/**
 * 索引统计
 */
export interface IndexStats {
  collection: string;
  indexCount: number;
  indexes: IndexInfo[];
  totalSize: number;
}

/**
 * 索引使用统计
 */
export interface IndexUsageStats {
  indexName: string;
  usageCount: number;
  avgAccessTime: number;
  lastAccessed: Date;
}

@Injectable()
export class IndexManagerService {
  private readonly logger = new Logger(IndexManagerService.name);
  private indexUsageStats = new Map<string, IndexUsageStats>();

  constructor() {}

  /**
   * 获取集合的所有索引
   */
  async getIndexes(model: Model<any>): Promise<IndexInfo[]> {
    try {
      const indexes = await model.collection.getIndexes();
      return Object.entries(indexes).map(([name, keys]: [string, any]) => ({
        name,
        keys,
        unique: false, // 需要从详细信息中获取
        sparse: false,
        background: true,
        version: 1,
      }));
    } catch (error) {
      this.logger.error('获取索引失败:', error);
      return [];
    }
  }

  /**
   * 创建单字段索引
   */
  async createSingleFieldIndex(
    model: Model<any>,
    field: string,
    options: {
      unique?: boolean;
      sparse?: boolean;
      background?: boolean;
      name?: string;
    } = {}
  ): Promise<string> {
    try {
      const indexName = options.name || `${field}_1`;
      const indexSpec = { [field]: 1 };

      await model.collection.createIndex(indexSpec, {
        unique: options.unique || false,
        sparse: options.sparse || false,
        background: options.background !== false,
        name: indexName,
      });

      this.logger.log(`创建索引成功: ${model.collection.name}.${field}`);
      return indexName;
    } catch (error) {
      this.logger.error(`创建索引失败: ${model.collection.name}.${field}`, error);
      throw error;
    }
  }

  /**
   * 创建复合索引
   */
  async createCompoundIndex(
    model: Model<any>,
    fields: Record<string, 1 | -1>,
    options: {
      unique?: boolean;
      sparse?: boolean;
      background?: boolean;
      name?: string;
    } = {}
  ): Promise<string> {
    const fieldNames = Object.keys(fields).join('_');
    try {
      const indexName = options.name || `${fieldNames}_compound`;

      await model.collection.createIndex(fields, {
        unique: options.unique || false,
        sparse: options.sparse || false,
        background: options.background !== false,
        name: indexName,
      });

      this.logger.log(
        `创建复合索引成功: ${model.collection.name}.${fieldNames}`
      );
      return indexName;
    } catch (error) {
      this.logger.error(
        `创建复合索引失败: ${model.collection.name}.${fieldNames}`,
        error
      );
      throw error;
    }
  }

  /**
   * 创建文本索引
   */
  async createTextIndex(
    model: Model<any>,
    fields: string[],
    options: {
      weights?: Record<string, number>;
      background?: boolean;
      name?: string;
    } = {}
  ): Promise<string> {
    try {
      const indexSpec: any = {};
      fields.forEach((field) => {
        indexSpec[field] = 'text';
      });

      const indexName = options.name || `${fields.join('_')}_text`;

      await model.collection.createIndex(indexSpec, {
        weights: options.weights,
        background: options.background !== false,
        name: indexName,
      });

      this.logger.log(`创建文本索引成功: ${model.collection.name}.${fields.join(', ')}`);
      return indexName;
    } catch (error) {
      this.logger.error(
        `创建文本索引失败: ${model.collection.name}.${fields.join(', ')}`,
        error
      );
      throw error;
    }
  }

  /**
   * 创建TTL索引(自动过期)
   */
  async createTTLIndex(
    model: Model<any>,
    field: string,
    expireAfterSeconds: number,
    options: {
      background?: boolean;
      name?: string;
    } = {}
  ): Promise<string> {
    try {
      const indexName = options.name || `${field}_ttl`;

      await model.collection.createIndex(
        { [field]: 1 },
        {
          expireAfterSeconds,
          background: options.background !== false,
          name: indexName,
        }
      );

      this.logger.log(
        `创建TTL索引成功: ${model.collection.name}.${field} (${expireAfterSeconds}s)`
      );
      return indexName;
    } catch (error) {
      this.logger.error(
        `创建TTL索引失败: ${model.collection.name}.${field}`,
        error
      );
      throw error;
    }
  }

  /**
   * 删除索引
   */
  async dropIndex(model: Model<any>, indexName: string): Promise<boolean> {
    try {
      await model.collection.dropIndex(indexName);
      this.logger.log(`删除索引成功: ${model.collection.name}.${indexName}`);
      return true;
    } catch (error) {
      this.logger.error(`删除索引失败: ${model.collection.name}.${indexName}`, error);
      return false;
    }
  }

  /**
   * 删除所有索引(除了_id)
   */
  async dropAllIndexes(model: Model<any>): Promise<boolean> {
    try {
      await model.collection.dropIndexes();
      this.logger.log(`删除所有索引成功: ${model.collection.name}`);
      return true;
    } catch (error) {
      this.logger.error(`删除所有索引失败: ${model.collection.name}`, error);
      return false;
    }
  }

  /**
   * 重建索引
   */
  async rebuildIndex(model: Model<any>, indexName: string): Promise<boolean> {
    try {
      await (model.collection as any).reIndex();
      this.logger.log(`重建索引成功: ${model.collection.name}.${indexName}`);
      return true;
    } catch (error) {
      this.logger.error(`重建索引失败: ${model.collection.name}.${indexName}`, error);
      return false;
    }
  }

  /**
   * 获取索引大小
   */
  async getIndexStats(model: Model<any>): Promise<IndexStats> {
    try {
      const indexes = await this.getIndexes(model);
      const stats = await (model.collection as any).stats();

      return {
        collection: model.collection.name,
        indexCount: indexes.length,
        indexes,
        totalSize: stats.totalIndexSize || 0,
      };
    } catch (error) {
      this.logger.error(`获取索引统计失败: ${model.collection.name}`, error);
      return {
        collection: model.collection.name,
        indexCount: 0,
        indexes: [],
        totalSize: 0,
      };
    }
  }

  /**
   * 分析索引使用情况
   */
  analyzeIndexUsage(model: Model<any>, queryPatterns: any[]): void {
    queryPatterns.forEach((pattern) => {
      // 分析查询中使用的字段
      const fields = Object.keys(pattern);

      // 更新索引使用统计
      fields.forEach((field) => {
        const key = `${model.collection.name}.${field}`;
        const stats = this.indexUsageStats.get(key) || {
          indexName: key,
          usageCount: 0,
          avgAccessTime: 0,
          lastAccessed: new Date(),
        };

        stats.usageCount++;
        stats.lastAccessed = new Date();
        this.indexUsageStats.set(key, stats);
      });
    });
  }

  /**
   * 获取未使用的索引
   */
  getUnusedIndexes(model: Model<any>): Promise<string[]> {
    // TODO: 实现
    return Promise.resolve([]);
  }

  /**
   * 获取索引使用报告
   */
  getIndexUsageReport(): string {
    let report = '\n=== 索引使用报告 ===\n';

    this.indexUsageStats.forEach((stats, key) => {
      report += `${key}:\n`;
      report += `  使用次数: ${stats.usageCount}\n`;
      report += `  最后访问: ${stats.lastAccessed.toISOString()}\n`;
    });

    return report;
  }

  /**
   * 为常用查询创建索引
   */
  async ensureCommonIndexes(model: Model<any>): Promise<void> {
    const collectionName = model.collection.name;

    // 根据集合名称创建常用索引
    switch (collectionName) {
      case 'divination_records':
        await this.createCompoundIndex(model, { userId: 1, createdAt: -1 });
        await this.createCompoundIndex(model, { guestId: 1, createdAt: -1 });
        await this.createSingleFieldIndex(model, 'hexagram.primary.sequence');
        await this.createSingleFieldIndex(model, 'isFavorite');
        break;

      case 'users':
        await this.createSingleFieldIndex(model, 'unionId', { unique: true, sparse: true });
        await this.createSingleFieldIndex(model, 'openId', { unique: true, sparse: true });
        await this.createSingleFieldIndex(model, 'phoneNumber', { unique: true, sparse: true });
        await this.createSingleFieldIndex(model, 'email', { unique: true, sparse: true });
        break;

      case 'courses':
        await this.createCompoundIndex(model, { 'module.order': 1, order: 1 });
        await this.createSingleFieldIndex(model, 'published');
        await this.createSingleFieldIndex(model, 'tags');
        break;

      default:
        this.logger.warn(`未定义集合 ${collectionName} 的常用索引`);
    }
  }
}
