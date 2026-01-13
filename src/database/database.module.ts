import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * 数据库模块
 * 提供 MongoDB 连接和 Schema 注册
 */
@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('MONGODB_HOST', 'localhost');
        const port = configService.get<number>('MONGODB_PORT', 27017);
        const database = configService.get<string>('MONGODB_DATABASE', 'zhouyi');
        const username = configService.get<string>('MONGODB_USERNAME');
        const password = configService.get<string>('MONGODB_PASSWORD');
        
        // 构建连接字符串
        let uri = `mongodb://`;
        if (username && password) {
          uri += `${username}:${password}@`;
        }
        uri += `${host}:${port}/${database}`;
        
        return {
          uri,
          autoIndex: configService.get<string>('NODE_ENV') !== 'production',
          maxPoolSize: configService.get<number>('MONGO_MAX_POOL_SIZE', 10),
          minPoolSize: configService.get<number>('MONGO_MIN_POOL_SIZE', 2),
          serverSelectionTimeoutMS: configService.get<number>('MONGO_SERVER_SELECTION_TIMEOUT', 5000),
          socketTimeoutMS: configService.get<number>('MONGO_SOCKET_TIMEOUT', 45000),
          heartbeatFrequencyMS: configService.get<number>('MONGO_HEARTBEAT_FREQUENCY', 10000),
        };
      },
      inject: [ConfigService],
    }),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
