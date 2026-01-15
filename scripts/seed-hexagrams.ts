/**
 * 六十四卦数据种子脚本
 * 用于将卦象数据导入数据库
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Hexagram } from 'src/database/schemas/hexagram.schema';
import { HEXAGRAMS_DATA } from 'src/database/data/hexagrams-data';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('SeedHexagrams');

  try {
    logger.log('🌱 开始导入六十四卦数据...');

    // 创建 NestJS 应用上下文
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: false, // 禁用默认日志
    });

    // 获取 Hexagram 模型
    const hexagramModel = app.get<Model<Hexagram>>(getModelToken('Hexagram'));

    // 检查现有数据
    const existingCount = await hexagramModel.countDocuments();
    if (existingCount > 0) {
      logger.warn(`⚠️  数据库中已存在 ${existingCount} 个卦象数据`);
      logger.log('如需重新导入，请先清空数据库：');
      logger.log('  npm run seed:hexagrams:clean');
      await app.close();
      process.exit(0);
    }

    // 批量插入数据
    logger.log(`📥 准备导入 ${HEXAGRAMS_DATA.length} 个卦象...`);

    const result = await hexagramModel.insertMany(HEXAGRAMS_DATA);

    logger.log(`✅ 成功导入 ${result.length} 个卦象数据！`);
    logger.log('');
    logger.log('已导入的卦象：');
    result.forEach((hexagram) => {
      logger.log(`  ${hexagram.sequence}. ${hexagram.name} (${hexagram.symbol})`);
    });

    // 验证数据
    const totalCount = await hexagramModel.countDocuments();
    logger.log('');
    logger.log(`📊 数据库统计：`);
    logger.log(`  总卦象数：${totalCount}`);
    logger.log(`  已导入：${result.length}个`);
    logger.log(`  完成度：${((result.length / 64) * 100).toFixed(1)}% (完整64卦)`);

    if (totalCount < 64) {
      logger.log('');
      logger.warn(`⚠️  当前仅录入了前 ${result.length} 个卦象`);
      logger.log('   建议继续录入剩余卦象数据，以提供完整的功能体验。');
    }

    await app.close();
    process.exit(0);
  } catch (error) {
    logger.error('❌ 导入失败：', error.message);
    logger.error(error.stack);
    process.exit(1);
  }
}

// 清空数据
async function clean() {
  const logger = new Logger('SeedHexagrams');

  try {
    logger.log('🗑️  清空卦象数据...');

    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
    });

    const hexagramModel = app.get<Model<Hexagram>>(getModelToken('Hexagram'));

    const result = await hexagramModel.deleteMany({});
    logger.log(`✅ 已删除 ${result.deletedCount} 条记录`);

    await app.close();
    process.exit(0);
  } catch (error) {
    logger.error('❌ 清空失败：', error.message);
    process.exit(1);
  }
}

// 根据命令行参数执行不同操作
const command = process.argv[2];

if (command === 'clean') {
  clean();
} else {
  bootstrap();
}
