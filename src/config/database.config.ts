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

export default () => {
  // 构建 MongoDB 连接 URI
  let uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/zhouyi';

  // 如果没有提供 MONGODB_URI，则使用单独的环境变量构建
  if (!process.env.MONGODB_URI) {
    const host = process.env.MONGODB_HOST || 'localhost';
    const port = process.env.MONGODB_PORT || '27017';
    const database = process.env.MONGODB_DATABASE || 'zhouyi';
    const username = process.env.MONGODB_USERNAME;
    const password = process.env.MONGODB_PASSWORD;

    if (username && password) {
      uri = `mongodb://${username}:${password}@${host}:${port}/${database}`;
    } else {
      uri = `mongodb://${host}:${port}/${database}`;
    }
  }

  return {
    uri,
    dbName: process.env.MONGODB_DB_NAME || process.env.MONGODB_DATABASE || 'zhouyi',
    options: {
      autoIndex: process.env.NODE_ENV !== 'production',
      maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE || '10', 10),
      minPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE || '2', 10),
      serverSelectionTimeoutMS: parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT || '5000', 10),
      socketTimeoutMS: parseInt(process.env.MONGO_SOCKET_TIMEOUT || '45000', 10),
      heartbeatFrequencyMS: parseInt(process.env.MONGO_HEARTBEAT_FREQUENCY || '10000', 10),
    },
  };
};
