/**
 * Jest测试设置文件
 * 在所有测试运行前执行
 */

// 设置测试超时
jest.setTimeout(10000);

// 模拟环境变量
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.REDIS_PASSWORD = '';
process.env.REDIS_DB = '1';
process.env.CODE_LENGTH = '6';
process.env.CODE_EXPIRES_IN = '300';
process.env.CODE_SEND_INTERVAL = '60';
process.env.CODE_MAX_ATTEMPTS = '5';
process.env.MONGODB_URI = 'mongodb://localhost:27017/zhouyi_test';
