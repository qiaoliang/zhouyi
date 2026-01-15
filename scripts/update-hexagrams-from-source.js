const fs = require('fs');
const path = require('path');

// 读取源数据
const sourceDataPath = path.join(__dirname, '../src/database/data/source_data.json');
const hexagramsDir = path.join(__dirname, '../src/database/data/hexagrams');

console.log('正在读取源数据...');
const sourceData = JSON.parse(fs.readFileSync(sourceDataPath, 'utf8'));

// 八卦数据映射
const trigramData = {
  '☰': { name: '乾', nature: '天', element: '金', direction: '南', season: '秋' },
  '☷': { name: '坤', nature: '地', element: '土', direction: '北', season: '冬' },
  '☳': { name: '震', nature: '雷', element: '木', direction: '东', season: '春' },
  '☴': { name: '巽', nature: '风', element: '木', direction: '东南', season: '春' },
  '☵': { name: '坎', nature: '水', element: '水', direction: '北', season: '冬' },
  '☲': { name: '离', nature: '火', element: '火', direction: '南', season: '夏' },
  '☶': { name: '艮', nature: '山', element: '土', direction: '东北', season: '冬末春初' },
  '☱': { name: '兑', nature: '泽', element: '金', direction: '西', season: '秋' }
};

// 家庭映射
const familyMap = {
  '☰': '父', '☷': '母', '☳': '长男', '☴': '长女',
  '☵': '中男', '☲': '中女', '☶': '少男', '☱': '少女'
};

// 身体部位映射
const bodyMap = {
  '☰': '首', '☷': '腹', '☳': '足', '☴': '股',
  '☵': '耳', '☲': '目', '☶': '手', '☱': '口'
};

// 动物映射
const animalMap = {
  '☰': '马', '☷': '牛', '☳': '龙', '☴': '鸡',
  '☵': '猪', '☲': '雉', '☶': '狗', '☱': '羊'
};

// 颜色映射
const colorMap = {
  '☰': '赤', '☷': '黄', '☳': '青', '☴': '青',
  '☵': '黑', '☲': '红', '☶': '黄', '☱': '白'
};

// 解析爻辞，提取阴阳属性
function parseLine(lineText) {
  // 支持两种格式：初九/上六 和 九二/六三
  const match1 = lineText.match(/^(初|上)(六|九)/);
  const match2 = lineText.match(/^(六|九)(二|三|四|五)/);

  if (match1) {
    // 格式：初九/上六
    const positionMap = { '初': 1, '上': 6 };
    return {
      position: positionMap[match1[1]] || 0,
      name: match1[0],
      yinYang: match1[2] === '六' ? 'yin' : 'yang',
      original: lineText,
      translation: '',
      xiang: '',
      annotation: ''
    };
  } else if (match2) {
    // 格式：九二/六三
    const positionMap = { '二': 2, '三': 3, '四': 4, '五': 5 };
    return {
      position: positionMap[match2[2]] || 0,
      name: match2[0],
      yinYang: match2[1] === '六' ? 'yin' : 'yang',
      original: lineText,
      translation: '',
      xiang: '',
      annotation: ''
    };
  }
  return null;
}

// 处理用九/用六
function parseYongGua(hexagram) {
  const lines = hexagram.lines;
  const yongLine = lines.find(line => line.startsWith('用'));
  if (yongLine) {
    return {
      original: yongLine,
      translation: '',
      annotation: ''
    };
  }
  return null;
}

// 从 image 字段提取上下卦
function parseTrigrams(image) {
  return {
    upper: trigramData[image[0]],
    lower: trigramData[image[1]]
  };
}

// 判断卦的阴阳性质
function getNature(hexagram) {
  let yangCount = 0;
  let yinCount = 0;
  hexagram.lines.forEach(line => {
    if (line.includes('九')) yangCount++;
    if (line.includes('六')) yinCount++;
  });
  return yangCount >= yinCount ? 'yang' : 'yin';
}

// 更新卦象文件
function updateHexagramFile(sourceHexagram) {
  const id = sourceHexagram.id.toString().padStart(3, '0');
  const filePath = path.join(hexagramsDir, `${id}.json`);

  console.log(`正在处理卦象 ${id}: ${sourceHexagram.hexagramName}`);

  // 读取现有文件
  let existingData;
  try {
    existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`无法读取文件 ${filePath}:`, err);
    return;
  }

  // 检查是否需要更新（强制更新爻辞）
  const hasMissingPositions = existingData.yaoci.some(y => !y.position || y.position === 0);
  const needsUpdate = !existingData.guaci || 
                       existingData.guaci.original === '卦辞待补充' ||
                       existingData.yaoci.length !== 6 ||
                       hasMissingPositions;

  if (needsUpdate) {
    // 解析爻辞
    const yaoci = [];
    sourceHexagram.lines.forEach((line) => {
      if (line.startsWith('用') && (sourceHexagram.id === 1 || sourceHexagram.id === 2)) {
        // 用九或用六
        existingData.yonggua = parseYongGua(sourceHexagram);
      } else {
        const parsed = parseLine(line);
        if (parsed) {
          yaoci.push(parsed);
        }
      }
    });

    // 解析上下卦
    const trigrams = parseTrigrams(sourceHexagram.image);

    // 判断阴阳
    const nature = getNature(sourceHexagram);

    // 构建新的卦象数据
    const newData = {
      symbol: existingData.symbol,
      name: sourceHexagram.hexagramName,
      pinyin: existingData.pinyin || sourceHexagram.pinyin + ' ' + sourceHexagram.image.split('').join(' '),
      sequence: sourceHexagram.id,
      guaci: {
        original: sourceHexagram.judge,
        translation: '',
        annotation: ''
      },
      tuanci: {
        original: '',
        translation: ''
      },
      xiangci: {
        original: '',
        translation: ''
      },
      yaoci: yaoci,
      metadata: {
        element: trigrams.upper.element,
        nature: trigrams.upper.nature,
        direction: trigrams.upper.direction,
        season: trigrams.upper.season,
        trigrams: {
          upper: {
            name: trigrams.upper.name,
            symbol: sourceHexagram.image[0],
            nature: trigrams.upper.nature,
            position: 'upper'
          },
          lower: {
            name: trigrams.lower.name,
            symbol: sourceHexagram.image[1],
            nature: trigrams.lower.nature,
            position: 'lower'
          }
        },
        family: familyMap[sourceHexagram.image[0]] || '待补充',
        body: bodyMap[sourceHexagram.image[0]] || '待补充',
        animal: animalMap[sourceHexagram.image[0]] || '待补充',
        color: colorMap[sourceHexagram.image[0]] || '待补充'
      },
      category: {
        nature: nature,
        quality: 'neutral',
        difficulty: 'simple'
      },
      tags: [sourceHexagram.hexagramName, sourceHexagram.name, trigrams.upper.nature, trigrams.lower.nature]
    };

    // 如果有用九/用六，添加到数据中
    if (existingData.yonggua) {
      newData.yonggua = existingData.yonggua;
    }

    // 写入文件
    fs.writeFileSync(filePath, JSON.stringify(newData, null, 2), 'utf8');
    console.log(`✓ 已更新 ${id}.json`);
  } else {
    console.log(`- 跳过 ${id}.json (已有完整数据)`);
  }
}

// 处理所有卦象
console.log('\n开始更新卦象文件...\n');
sourceData.hexagrams.forEach(hexagram => {
  updateHexagramFile(hexagram);
});

console.log('\n✓ 所有卦象文件更新完成！');