const fs = require('fs');
const path = require('path');

// 配置
const sourceDir = path.join(__dirname, '../src/database/data');
const hexagramsDir = path.join(__dirname, '../src/database/data/hexagrams');

// 读取所有源文件
console.log('正在读取源数据文件...\n');

const allHexagrams = [];

// 读取 16 个分割的源文件
for (let i = 1; i <= 16; i++) {
  const sourceFile = path.join(sourceDir, `source_data-${i.toString().padStart(2, '0')}.json`);
  
  if (fs.existsSync(sourceFile)) {
    console.log(`读取 ${sourceFile}`);
    const data = JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
    allHexagrams.push(...data);
  }
}

console.log(`\n总共读取了 ${allHexagrams.length} 个卦象数据\n`);

// 更新每个卦象文件
let updatedCount = 0;
let skippedCount = 0;

allHexagrams.forEach(sourceHexagram => {
  const id = sourceHexagram.sequence.toString().padStart(3, '0');
  const targetFile = path.join(hexagramsDir, `${id}.json`);

  console.log(`处理卦象 ${id}: ${sourceHexagram.name}`);

  // 检查目标文件是否存在
  if (!fs.existsSync(targetFile)) {
    console.log(`  ✗ 文件不存在，跳过`);
    skippedCount++;
    return;
  }

  // 读取现有文件
  let existingData;
  try {
    existingData = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
  } catch (err) {
    console.error(`  ✗ 无法读取文件: ${err.message}`);
    skippedCount++;
    return;
  }

  // 检查是否需要更新
  const needsUpdate = !existingData.guaci || 
                       existingData.guaci.original === '卦辞待补充' ||
                       existingData.guaci.annotation === '注：此卦象数据为简化版本，后续需要补充完整的卦辞、爻辞等详细信息。';

  if (needsUpdate) {
    // 更新数据
    const updatedData = {
      ...existingData,
      symbol: sourceHexagram.symbol,
      name: sourceHexagram.name,
      pinyin: sourceHexagram.pinyin,
      sequence: sourceHexagram.sequence,
      guaci: sourceHexagram.guaci,
      tuanci: sourceHexagram.tuanci,
      xiangci: sourceHexagram.xiangci,
      yaoci: sourceHexagram.yaoci,
      metadata: sourceHexagram.metadata,
      category: sourceHexagram.category,
      tags: sourceHexagram.tags
    };

    // 写入文件
    fs.writeFileSync(targetFile, JSON.stringify(updatedData, null, 2), 'utf8');
    console.log(`  ✓ 已更新`);
    updatedCount++;
  } else {
    console.log(`  - 跳过（已有完整数据）`);
    skippedCount++;
  }
});

console.log(`\n=== 更新完成 ===`);
console.log(`更新: ${updatedCount} 个文件`);
console.log(`跳过: ${skippedCount} 个文件`);
console.log(`总计: ${updatedCount + skippedCount} 个文件`);