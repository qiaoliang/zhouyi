/**
 * 六十四卦数据种子脚本
 * 用于将卦象数据导入数据库
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Hexagram } from 'src/database/schemas/hexagram.schema';
import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface IHexagramData {
  symbol: string;
  name: string;
  pinyin: string;
  sequence: number;
  guaci: {
    original: string;
    translation: string;
    annotation?: string;
  };
  tuanci: {
    original: string;
    translation: string;
    annotation?: string;
  };
  xiangci: {
    original: string;
    translation: string;
    annotation?: string;
  };
  yaoci: Array<{
    position: number;
    name: string;
    yinYang: 'yin' | 'yang';
    original: string;
    translation: string;
    xiang: string;
    annotation?: string;
  }>;
  yonggua?: {
    original: string;
    translation: string;
    annotation?: string;
  };
  metadata?: {
    element: string;
    nature: string;
    direction: string;
    season: string;
    trigrams: {
      upper: {
        name: string;
        symbol: string;
        nature: string;
        position: string;
      };
      lower: {
        name: string;
        symbol: string;
        nature: string;
        position: string;
      };
    };
    family: string;
    body: string;
    animal: string;
    color: string;
  };
  category?: {
    nature: 'yang' | 'yin';
    quality: 'lucky' | 'unlucky' | 'neutral';
    difficulty: 'simple' | 'complex';
  };
  tags: string[];
}

/**
 * 从JSON文件加载卦象数据
 */
function loadHexagramsFromFiles(): IHexagramData[] {
  const logger = new Logger('SeedHexagrams');
  const hexagrams: IHexagramData[] = [];
  
  // 确定hexagrams目录的路径
  // 在开发环境和Docker环境中路径不同
  const possibleDirs = [
    path.join(__dirname, '../src/database/data/hexagrams'),
    path.join(process.cwd(), 'src/database/data/hexagrams'),
    '/app/src/database/data/hexagrams',
    path.join(os.homedir(), 'working/code/zhouyi/src/database/data/hexagrams'),
  ];

  let hexagramsDir = '';
  for (const dir of possibleDirs) {
    if (fs.existsSync(dir)) {
      hexagramsDir = dir;
      break;
    }
  }

  if (!hexagramsDir) {
    logger.error('❌ 无法找到 hexagrams 目录');
    logger.error('尝试的路径：');
    possibleDirs.forEach(dir => logger.error(`  - ${dir}`));
    process.exit(1);
  }

  logger.log(`📁 从目录加载卦象数据: ${hexagramsDir}`);

  // 读取所有JSON文件
  const files = fs.readdirSync(hexagramsDir)
    .filter(file => file.endsWith('.json'))
    .sort();

  logger.log(`📄 找到 ${files.length} 个卦象文件`);

  for (const file of files) {
    const filepath = path.join(hexagramsDir, file);
    try {
      const content = fs.readFileSync(filepath, 'utf-8');
      const hexagram = JSON.parse(content) as IHexagramData;
      hexagrams.push(hexagram);
    } catch (error) {
      logger.error(`❌ 读取文件失败: ${file}`, error.message);
    }
  }

  // 按sequence排序
  hexagrams.sort((a, b) => a.sequence - b.sequence);

  logger.log(`✅ 成功加载 ${hexagrams.length} 个卦象数据`);

  return hexagrams;
}

async function bootstrap() {
  const logger = new Logger('SeedHexagrams');

  try {
    logger.log('🌱 开始导入六十四卦数据...');

    logger.log('🔧 正在创建 NestJS 应用上下文...');
    // 创建 NestJS 应用上下文
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: false, // 禁用默认日志
    });
    logger.log('✅ NestJS 应用上下文创建成功');

    logger.log('🔧 正在获取 Hexagram 模型...');
    // 获取 Hexagram 模型
    const hexagramModel = app.get<Model<Hexagram>>(getModelToken('Hexagram'));
    logger.log('✅ Hexagram 模型获取成功');

    // 检查现有数据
    logger.log('🔍 检查数据库中现有数据...');
    const existingCount = await hexagramModel.countDocuments();
    logger.log(`📊 现有数据数量: ${existingCount}`);
    
    if (existingCount > 0) {
      logger.warn(`⚠️  数据库中已存在 ${existingCount} 个卦象数据`);
      logger.log('如需重新导入，请先清空数据库：');
      logger.log('  npm run seed:hexagrams:clean');
      await app.close();
      process.exit(0);
    }

    // 从JSON文件加载卦象数据
    logger.log('📂 开始从JSON文件加载卦象数据...');
    const hexagramsData = loadHexagramsFromFiles();
    logger.log(`✅ 成功从文件加载 ${hexagramsData.length} 个卦象数据`);

    // 批量插入数据
    logger.log(`📥 准备导入 ${hexagramsData.length} 个卦象...`);

    const result = await hexagramModel.insertMany(hexagramsData);

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
      logger.warn(`⚠️  当前仅录入了 ${result.length} 个卦象`);
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
