import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import databaseConfig from '../config/database.config';

/**
 * 数据库模块
 * 提供 MongoDB 连接和 Schema 注册
 */
@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const config = configService.get('database');
        return {
          uri: config.uri,
          dbName: config.dbName,
          ...config.options,
        };
      },
      inject: [ConfigService],
    }),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
