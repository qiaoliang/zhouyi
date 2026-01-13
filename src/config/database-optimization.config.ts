/**
 * 数据库连接池优化配置
 * 支持高并发场景,优化连接池参数
 */

import { registerDecorator, ValidationOptions } from 'class-validator';

/**
 * 数据库连接池配置
 */
export interface DatabasePoolConfig {
  // 连接池设置
  maxPoolSize: number; // 最大连接数
  minPoolSize: number; // 最小连接数
  maxIdleTimeMS: number; // 连接最大空闲时间(毫秒)
  waitQueueTimeoutMS: number; // 等待连接超时时间(毫秒)

  // 查询设置
  socketTimeoutMS: number; // Socket超时时间(毫秒)
  connectTimeoutMS: number; // 连接超时时间(毫秒)
  serverSelectionTimeoutMS: number; // 服务器选择超时时间(毫秒)

  // 重试设置
  retryWrites: boolean; // 是否重试写操作
  retryReads: boolean; // 是否重试读操作

  // 压缩设置
  compressors: string[]; // 压缩算法
}

/**
 * 根据环境获取数据库连接池配置
 */
export function getDatabasePoolConfig(): DatabasePoolConfig {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const envType = process.env.ENV_TYPE || 'production';

  // 测试环境使用小连接池
  if (envType === 'unit' || envType === 'test') {
    return {
      maxPoolSize: 5,
      minPoolSize: 1,
      maxIdleTimeMS: 10000,
      waitQueueTimeoutMS: 5000,
      socketTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
      retryWrites: false,
      retryReads: false,
      compressors: [],
    };
  }

  // 开发环境
  if (nodeEnv === 'development') {
    return {
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      waitQueueTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
      retryWrites: true,
      retryReads: true,
      compressors: ['zlib'],
    };
  }

  // 生产环境(根据负载调整)
  const cpuCount = require('os').cpus().length;

  return {
    // 最大连接数 = CPU核心数 * 2 + 1
    maxPoolSize: cpuCount * 2 + 1,
    // 最小连接数 = CPU核心数
    minPoolSize: cpuCount,
    // 最大空闲时间30秒
    maxIdleTimeMS: 30000,
    // 等待超时10秒
    waitQueueTimeoutMS: 10000,
    // Socket超时45秒
    socketTimeoutMS: 45000,
    // 连接超时10秒
    connectTimeoutMS: 10000,
    // 服务器选择超时10秒
    serverSelectionTimeoutMS: 10000,
    // 启用重试
    retryWrites: true,
    retryReads: true,
    // 启用压缩
    compressors: ['zlib'],
  };
}

/**
 * 构建MongoDB连接URI
 */
export function buildMongoUri(): string {
  const config = getDatabasePoolConfig();

  const host = process.env.MONGODB_HOST || 'localhost';
  const port = process.env.MONGODB_PORT || '27017';
  const database = process.env.MONGODB_DATABASE || 'zhouyi';
  const username = process.env.MONGODB_USERNAME;
  const password = process.env.MONGODB_PASSWORD;
  const authSource = process.env.MONGODB_AUTH_SOURCE || 'admin';

  let uri = `mongodb://`;

  if (username && password) {
    uri += `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`;
  }

  uri += `${host}:${port}/${database}?`;

  // 添加连接池参数
  const params = new URLSearchParams({
    maxPoolSize: config.maxPoolSize.toString(),
    minPoolSize: config.minPoolSize.toString(),
    maxIdleTimeMS: config.maxIdleTimeMS.toString(),
    waitQueueTimeoutMS: config.waitQueueTimeoutMS.toString(),
    socketTimeoutMS: config.socketTimeoutMS.toString(),
    connectTimeoutMS: config.connectTimeoutMS.toString(),
    serverSelectionTimeoutMS: config.serverSelectionTimeoutMS.toString(),
    retryWrites: config.retryWrites.toString(),
    retryReads: config.retryReads.toString(),
  });

  if (config.compressors.length > 0) {
    params.append('compressors', config.compressors.join(','));
  }

  if (authSource) {
    params.append('authSource', authSource);
  }

  uri += params.toString();

  return uri;
}

/**
 * 数据库连接健康检查配置
 */
export interface HealthCheckConfig {
  enabled: boolean;
  interval: number; // 检查间隔(毫秒)
  timeout: number; // 超时时间(毫秒)
  retryAttempts: number; // 重试次数
}

/**
 * 获取健康检查配置
 */
export function getHealthCheckConfig(): HealthCheckConfig {
  return {
    enabled: process.env.DB_HEALTH_CHECK_ENABLED !== 'false',
    interval: parseInt(process.env.DB_HEALTH_CHECK_INTERVAL || '30000', 10),
    timeout: parseInt(process.env.DB_HEALTH_CHECK_TIMEOUT || '5000', 10),
    retryAttempts: parseInt(process.env.DB_HEALTH_CHECK_RETRY || '3', 10),
  };
}

/**
 * 数据库监控配置
 */
export interface MonitoringConfig {
  slowQueryThreshold: number; // 慢查询阈值(毫秒)
  enableQueryLogging: boolean; // 是否启用查询日志
  enableMetrics: boolean; // 是否启用指标收集
  metricsRetentionDays: number; // 指标保留天数
}

/**
 * 获取监控配置
 */
export function getMonitoringConfig(): MonitoringConfig {
  return {
    slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD || '100', 10),
    enableQueryLogging: process.env.ENABLE_QUERY_LOGGING === 'true',
    enableMetrics: process.env.ENABLE_DB_METRICS !== 'false',
    metricsRetentionDays: parseInt(process.env.METRICS_RETENTION_DAYS || '7', 10),
  };
}

/**
 * 连接池状态监控
 */
export class PoolMonitor {
  private lastCheckTime: Date | null = null;
  private lastCheckStatus: 'healthy' | 'degraded' | 'down' = 'healthy';

  /**
   * 检查连接池状态
   */
  async checkPoolStatus(connection: any): Promise<{
    status: 'healthy' | 'degraded' | 'down';
    poolSize: number;
    activeConnections: number;
    waitingQueue: number;
  }> {
    try {
      const pool = connection?.db?.s?.client?.topology?.s?.pool;

      if (!pool) {
        return {
          status: 'degraded',
          poolSize: 0,
          activeConnections: 0,
          waitingQueue: 0,
        };
      }

      const config = getDatabasePoolConfig();
      const poolSize = pool.totalConnectionCount || 0;
      const activeConnections = pool.activeConnectionCount || 0;
      const waitingQueue = pool.pendingConnectionCount || 0;

      // 判断状态
      let status: 'healthy' | 'degraded' | 'down' = 'healthy';

      if (poolSize === 0) {
        status = 'down';
      } else if (
        activeConnections >= config.maxPoolSize * 0.9 ||
        waitingQueue > 0
      ) {
        status = 'degraded';
      }

      this.lastCheckTime = new Date();
      this.lastCheckStatus = status;

      return {
        status,
        poolSize,
        activeConnections,
        waitingQueue,
      };
    } catch (error) {
      console.error('检查连接池状态失败:', error);
      return {
        status: 'down',
        poolSize: 0,
        activeConnections: 0,
        waitingQueue: 0,
      };
    }
  }

  /**
   * 获取连接池建议
   */
  getRecommendation(): string {
    if (this.lastCheckStatus === 'healthy') {
      return '连接池运行正常';
    }

    if (this.lastCheckStatus === 'degraded') {
      return '连接池使用率过高,建议增加 maxPoolSize';
    }

    if (this.lastCheckStatus === 'down') {
      return '连接池不可用,请检查数据库连接';
    }

    return '无法确定连接池状态';
  }
}

// 导出单例
export const poolMonitor = new PoolMonitor();
