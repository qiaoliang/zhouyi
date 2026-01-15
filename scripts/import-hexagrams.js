/**
 * 六十四卦数据导入脚本（JavaScript版本）
 * 用于将卦象数据导入数据库
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// MongoDB 连接配置
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://admin:admin123@zhouyi-mongodb:27017/zhouyi?authSource=admin';

// Hexagram Schema
const hexagramSchema = new mongoose.Schema({
  symbol: { type: String, required: true },
  name: { type: String, required: true },
  pinyin: { type: String, required: true },
  sequence: { type: Number, required: true, unique: true },
  guaci: {
    original: String,
    translation: String,
    annotation: String
  },
  tuanci: {
    original: String,
    translation: String,
    annotation: String
  },
  xiangci: {
    original: String,
    translation: String,
    annotation: String
  },
  yaoci: [{
    position: Number,
    name: String,
    yinYang: { type: String, enum: ['yin', 'yang'] },
    original: String,
    translation: String,
    xiang: String,
    annotation: String
  }],
  yonggua: {
    original: String,
    translation: String,
    annotation: String
  },
  metadata: {
    element: String,
    nature: String,
    direction: String,
    season: String,
    trigrams: {
      upper: {
        name: String,
        symbol: String,
        nature: String,
        position: String
      },
      lower: {
        name: String,
        symbol: String,
        nature: String,
        position: String
      }
    },
    family: String,
    body: String,
    animal: String,
    color: String
  },
  category: {
    nature: { type: String, enum: ['yang', 'yin', 'mixed'] },
    quality: { type: String, enum: ['lucky', 'unlucky', 'neutral', 'positive', 'negative'] },
    difficulty: { type: String, enum: ['simple', 'complex', 'medium'] }
  },
  tags: [String]
});

const Hexagram = mongoose.model('Hexagram', hexagramSchema);

/**
 * 从JSON文件加载卦象数据
 */
function loadHexagramsFromFiles() {
  const hexagrams = [];
  
  // 确定 hexagrams 目录的路径
  const hexagramsDir = path.join(__dirname, '../src/database/data/hexagrams');

  if (!fs.existsSync(hexagramsDir)) {
    console.error('❌ 无法找到 hexagrams 目录:', hexagramsDir);
    process.exit(1);
  }

  console.log(`📁 从目录加载卦象数据: ${hexagramsDir}`);

  // 读取所有JSON文件
  const files = fs.readdirSync(hexagramsDir)
    .filter(file => file.endsWith('.json') && /^\d{3}\.json$/.test(file))
    .sort();

  console.log(`📄 找到 ${files.length} 个卦象文件`);

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

  return hexagrams;
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('🌱 开始导入六十四卦数据...');

    // 连接数据库
    console.log('🔧 正在连接数据库...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ 数据库连接成功');

    // 检查现有数据
    console.log('🔍 检查数据库中现有数据...');
    const existingCount = await Hexagram.countDocuments();
    console.log(`📊 现有数据数量: ${existingCount}`);
    
    if (existingCount > 0) {
      console.warn(`⚠️  数据库中已存在 ${existingCount} 个卦象数据`);
      console.log('正在清空现有数据...');
      await Hexagram.deleteMany({});
      console.log('✅ 现有数据已清空');
    }

    // 从JSON文件加载卦象数据
    console.log('📂 开始从JSON文件加载卦象数据...');
    const hexagramsData = loadHexagramsFromFiles();
    console.log(`✅ 成功从文件加载 ${hexagramsData.length} 个卦象数据`);

    // 批量插入数据
    console.log(`📥 准备导入 ${hexagramsData.length} 个卦象...`);

    const result = await Hexagram.insertMany(hexagramsData);

    console.log(`✅ 成功导入 ${result.length} 个卦象数据！`);
    console.log('');
    console.log('已导入的卦象：');
    result.forEach((hexagram) => {
      console.log(`  ${hexagram.sequence}. ${hexagram.name} (${hexagram.symbol})`);
    });

    // 验证数据
    const totalCount = await Hexagram.countDocuments();
    console.log('');
    console.log(`📊 数据库统计：`);
    console.log(`  总卦象数：${totalCount}`);
    console.log(`  已导入：${result.length}个`);
    console.log(`  完成度：${((result.length / 64) * 100).toFixed(1)}% (完整64卦)`);

    if (totalCount < 64) {
      console.log('');
      console.warn(`⚠️  当前仅录入了 ${result.length} 个卦象`);
      console.log('   建议继续录入剩余卦象数据，以提供完整的功能体验。');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ 导入失败：', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// 运行主函数
main();