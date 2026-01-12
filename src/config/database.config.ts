/**
 * 数据库配置
 */

export interface DatabaseConfig {
  /**
   * MongoDB 连接 URI
   */
  uri: string;

  /**
   * 数据库名称
   */
  dbName: string;

  /**
   * 连接选项
   */
  options: MongooseConnectOptions;
}

/**
 * Mongoose 连接选项
 */
export interface MongooseConnectOptions {
  /**
   * 自动创建索引
   */
  autoIndex: boolean;

  /**
   * 连接池大小
   */
  maxPoolSize: number;

  /**
   * 最小连接池大小
   */
  minPoolSize: number;

  /**
   * 连接超时时间 (ms)
   */
  serverSelectionTimeoutMS: number;

  /**
   * Socket 超时时间 (ms)
   */
  socketTimeoutMS: number;

  /**
   * 心跳频率 (ms)
   */
  heartbeatFrequencyMS: number;
}

export default () => ({
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/zhouyi',
  dbName: process.env.MONGODB_DB_NAME || 'zhouyi',
  options: {
    autoIndex: process.env.NODE_ENV !== 'production',
    maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE || '10', 10),
    minPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE || '2', 10),
    serverSelectionTimeoutMS: parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT || '5000', 10),
    socketTimeoutMS: parseInt(process.env.MONGO_SOCKET_TIMEOUT || '45000', 10),
    heartbeatFrequencyMS: parseInt(process.env.MONGO_HEARTBEAT_FREQUENCY || '10000', 10),
  },
});
