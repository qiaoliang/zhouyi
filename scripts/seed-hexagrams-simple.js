/**
 * 简化的六十四卦数据种子脚本
 * 直接使用MongoDB客户端导入数据，不依赖NestJS
 */

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin123@mongodb:27017';
const DB_NAME = process.env.MONGODB_DB_NAME || 'zhouyi';

async function seed() {
  console.log('🌱 开始导入六十四卦数据（简化版）...');

  // 连接MongoDB
  console.log('📡 连接MongoDB...');
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  console.log('✅ MongoDB连接成功');

  const db = client.db(DB_NAME);
  const collection = db.collection('hexagrams');

  // 检查现有数据
  const existingCount = await collection.countDocuments();
  if (existingCount > 0) {
    console.log(`⚠️  数据库中已存在 ${existingCount} 个卦象数据`);
    await client.close();
    process.exit(0);
  }

  // 读取JSON文件
  console.log('📂 读取卦象数据文件...');
  const hexagramsDir = '/app/src/database/data/hexagrams';
  const files = fs.readdirSync(hexagramsDir)
    .filter(file => file.endsWith('.json'))
    .sort();

  console.log(`📄 找到 ${files.length} 个卦象文件`);

  const hexagrams = [];
  for (const file of files) {
    const filepath = path.join(hexagramsDir, file);
    try {
      const content = fs.readFileSync(filepath, 'utf-8');
      const hexagram = JSON.parse(content);
      hexagrams.push(hexagram);
    } catch (error) {
      console.error(`❌ 读取文件失败: ${file}`, error.message);
    }
  }

  // 按sequence排序
  hexagrams.sort((a, b) => a.sequence - b.sequence);

  console.log(`✅ 成功加载 ${hexagrams.length} 个卦象数据`);

  // 插入数据
  console.log(`📥 准备导入 ${hexagrams.length} 个卦象...`);
  const result = await collection.insertMany(hexagrams);
  console.log(`✅ 成功导入 ${result.insertedCount} 个卦象数据！`);

  console.log('');
  console.log('已导入的卦象：');
  hexagrams.forEach((hexagram) => {
    console.log(`  ${hexagram.sequence}. ${hexagram.name} (${hexagram.symbol})`);
  });

  // 验证数据
  const totalCount = await collection.countDocuments();
  console.log('');
  console.log(`📊 数据库统计：`);
  console.log(`  总卦象数：${totalCount}`);
  console.log(`  已导入：${result.insertedCount}个`);
  console.log(`  完成度：${((result.insertedCount / 64) * 100).toFixed(1)}% (完整64卦)`);

  await client.close();
  console.log('');
  console.log('✅ 导入完成！');
  process.exit(0);
}

seed().catch(error => {
  console.error('❌ 导入失败：', error);
  process.exit(1);
});