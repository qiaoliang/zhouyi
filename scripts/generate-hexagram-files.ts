/**
 * 生成64卦JSON文件
 */

import * as fs from 'fs';
import * as path from 'path';

interface HexagramData {
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
  metadata: {
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
  category: {
    nature: 'yang' | 'yin';
    quality: 'lucky' | 'unlucky' | 'neutral';
    difficulty: 'simple' | 'complex';
  };
  tags: string[];
}

// 64卦基础数据
const HEXAGRAMS: HexagramData[] = [
  {
    symbol: '䷀',
    name: '乾为天',
    pinyin: 'qián wéi tiān',
    sequence: 1,
    guaci: {
      original: '元，亨，利，贞。',
      translation: '元始，亨通，和谐有利，正固持久。',
      annotation: '乾卦象征天，代表刚健、进取、创造。'
    },
    tuanci: {
      original: '大哉乾元，万物资始，乃统天。云行雨施，品物流形。大明始终，六位时成，时乘六龙以御天。乾道变化，各正性命，保合太和，乃利贞。首出庶物，万国咸宁。',
      translation: '伟大啊乾元！万物赖此而始，乃统帅天道。云行雨降，万物成形。太阳终而复始，六爻按时位而成，时乘六龙以驾御天道。乾道变化，万物各正性命，保持太和之气，乃利于正固。为首的创造万物，万国都安宁。'
    },
    xiangci: {
      original: '天行健，君子以自强不息。',
      translation: '天道运行刚健有力，君子应效法天道，自我力求进步，永不停止。'
    },
    yaoci: [
      {
        position: 1,
        name: '初九',
        yinYang: 'yang',
        original: '潜龙，勿用。',
        translation: '龙潜伏在深渊，暂时不宜有所作为。',
        xiang: '潜龙勿用，阳在下也。',
        annotation: '比喻时机未到，应当积蓄力量，等待时机。'
      },
      {
        position: 2,
        name: '九二',
        yinYang: 'yang',
        original: '见龙在田，利见大人。',
        translation: '龙出现在田野上，有利于拜见大人。',
        xiang: '见龙在田，德施普也。',
        annotation: '比喻才华初露，应当积极展现，寻求贵人相助。'
      },
      {
        position: 3,
        name: '九三',
        yinYang: 'yang',
        original: '君子终日乾乾，夕惕若，厉，无咎。',
        translation: '君子整天勤奋努力，夜晚警惕戒惧，虽处危境，也无灾祸。',
        xiang: '终日乾乾，反复道也。',
        annotation: '比喻处于上升期，必须持续努力，保持谨慎。'
      },
      {
        position: 4,
        name: '九四',
        yinYang: 'yang',
        original: '或跃在渊，无咎。',
        translation: '或者跃进深渊，没有灾祸。',
        xiang: '或跃在渊，进无咎也。',
        annotation: '比喻面临抉择，需要审时度势，抓住时机。'
      },
      {
        position: 5,
        name: '九五',
        yinYang: 'yang',
        original: '飞龙在天，利见大人。',
        translation: '龙飞在天上，有利于拜见大人。',
        xiang: '飞龙在天，大人造也。',
        annotation: '比喻事业达到顶峰，大展宏图的好时机。'
      },
      {
        position: 6,
        name: '上九',
        yinYang: 'yang',
        original: '亢龙有悔。',
        translation: '龙飞得太高，会有悔恨。',
        xiang: '亢龙有悔，盈不可久也。',
        annotation: '比喻事物达到极点后会走向反面，应当知进退。'
      }
    ],
    yonggua: {
      original: '用九，见群龙无首，吉。',
      translation: '用九爻辞：出现群龙没有首领，吉利。',
      annotation: '比喻群龙共治，各尽其责，不用强求统一领导。'
    },
    metadata: {
      element: '金',
      nature: '天',
      direction: '南',
      season: '秋',
      trigrams: {
        upper: { name: '乾', symbol: '☰', nature: '天', position: 'upper' },
        lower: { name: '乾', symbol: '☰', nature: '天', position: 'lower' }
      },
      family: '父',
      body: '首',
      animal: '马',
      color: '赤'
    },
    category: {
      nature: 'yang',
      quality: 'lucky',
      difficulty: 'simple'
    },
    tags: ['天', '阳', '刚健', '创造', '进取', '领导', '父卦']
  },
  {
    symbol: '䷁',
    name: '坤为地',
    pinyin: 'kūn wéi dì',
    sequence: 2,
    guaci: {
      original: '元，亨，利牝马之贞。君子有攸往，先迷后得主。利西南得朋，东北丧朋。安贞吉。',
      translation: '元始，亨通，利于像母马那样坚守正道。君子有所前往，起初迷路，后来找到主人。利于在西南方得到朋友，在东北方失去朋友。安于正道吉利。',
      annotation: '坤卦象征地，代表柔顺、包容、承载。牝马象征柔顺而有耐力。'
    },
    tuanci: {
      original: '至哉坤元，万物资生，乃顺承天。坤厚载物，德合无疆。含弘光大，品物咸亨。牝马地类，行地无疆，柔顺利贞。君子攸行，先迷失道，后顺得常。西南得朋，乃与类行。东北丧朋，乃终有庆。安贞之吉，应地无疆。',
      translation: '至极啊坤元！万物赖此而生，乃顺承天道。大地深厚承载万物，德性广大无边。包含弘大光大，万物都亨通。母马与地同类，行地无疆，柔顺利于正固。君子有所前往，起初迷失道路，后来顺应得到常道。西南得朋，是与同类同行。东北丧朋，是终有喜庆。安于正道的吉利，应合大地无疆。'
    },
    xiangci: {
      original: '地势坤，君子以厚德载物。',
      translation: '地势柔顺，君子应效法大地，以深厚的德行承载万物。'
    },
    yaoci: [
      {
        position: 1,
        name: '初六',
        yinYang: 'yin',
        original: '履霜，坚冰至。',
        translation: '踩到霜，坚冰就要到来。',
        xiang: '履霜坚冰，阴始凝也。驯致其道，至坚冰也。',
        annotation: '比喻见微知著，防患于未然。'
      },
      {
        position: 2,
        name: '六二',
        yinYang: 'yin',
        original: '直，方，大，不习无不利。',
        translation: '正直，方正，广大，不需要学习也没有什么不利的。',
        xiang: '六二之动，直以方也。不习无不利，地道光也。',
        annotation: '比喻具备良好品德，自然能够顺利。'
      },
      {
        position: 3,
        name: '六三',
        yinYang: 'yin',
        original: '含章可贞。或从王事，无成有终。',
        translation: '蕴含美德，可以保持正固。或者从事君王的事业，虽然不能居功，但会有好的结果。',
        xiang: '含章可贞，以时发也。或从王事，知光大也。',
        annotation: '比喻内敛含蓄，尽职尽责，不求虚名。'
      },
      {
        position: 4,
        name: '六四',
        yinYang: 'yin',
        original: '括囊，无咎无誉。',
        translation: '束紧口袋，没有灾祸也没有赞誉。',
        xiang: '括囊无咎，慎不害也。',
        annotation: '比喻谨言慎行，明哲保身。'
      },
      {
        position: 5,
        name: '六五',
        yinYang: 'yin',
        original: '黄裳，元吉。',
        translation: '黄色的下裳，大吉大利。',
        xiang: '黄裳元吉，文在中也。',
        annotation: '比喻居高位而谦虚，保持中庸之道。'
      },
      {
        position: 6,
        name: '上六',
        yinYang: 'yin',
        original: '龙战于野，其血玄黄。',
        translation: '龙在野外战斗，其血是黑黄色的。',
        xiang: '龙战于野，其道穷也。',
        annotation: '比喻阴阳相争，两败俱伤。'
      }
    ],
    yonggua: {
      original: '用六，利永贞。',
      translation: '用六爻辞：利于永远坚守正道。',
      annotation: '比喻始终柔顺，保持正固。'
    },
    metadata: {
      element: '土',
      nature: '地',
      direction: '北',
      season: '冬',
      trigrams: {
        upper: { name: '坤', symbol: '☷', nature: '地', position: 'upper' },
        lower: { name: '坤', symbol: '☷', nature: '地', position: 'lower' }
      },
      family: '母',
      body: '腹',
      animal: '牛',
      color: '黄'
    },
    category: {
      nature: 'yin',
      quality: 'lucky',
      difficulty: 'simple'
    },
    tags: ['地', '阴', '柔顺', '包容', '母卦', '承载']
  }
];

// 生成剩余62个卦的基础数据（简化版本）
const HEXAGRAM_NAMES = [
  '水雷屯', '山水蒙', '水天需', '天水讼', '地水师', '水地比', '风天小畜', '天泽履',
  '地天泰', '天地否', '天火同人', '火天大有', '地山谦', '雷地豫', '泽雷随', '山风蛊',
  '地泽临', '风地观', '火雷噬嗑', '山火贲', '山地剥', '地雷复', '天雷无妄', '山天大畜',
  '山雷颐', '泽风大过', '坎为水', '离为火', '泽山咸', '雷风恒', '天山遁', '雷天大壮',
  '火地晋', '地火明夷', '风火家人', '火泽睽', '水山蹇', '雷水解', '山泽损', '风雷益',
  '泽天夬', '天风姤', '泽地萃', '地风升', '泽水困', '水风井', '泽火革', '火风鼎',
  '震为雷', '艮为山', '风山渐', '雷泽归妹', '雷火丰', '火山旅', '巽为风', '兑为泽',
  '风水涣', '水泽节', '风泽中孚', '雷山小过', '水火既济', '火水未济'
];

const HEXAGRAM_SYMBOLS = [
  '䷂', '䷃', '䷄', '䷅', '䷆', '䷇', '䷈', '䷉', '䷊', '䷋', '䷌', '䷍', '䷎', '䷏', '䷐', '䷑',
  '䷒', '䷓', '䷔', '䷕', '䷖', '䷗', '䷘', '䷙', '䷚', '䷛', '䷜', '䷝', '䷞', '䷟', '䷠', '䷡',
  '䷢', '䷣', '䷤', '䷥', '䷦', '䷧', '䷨', '䷩', '䷪', '䷫', '䷬', '䷭', '䷮', '䷯', '䷰', '䷱',
  '䷲', '䷳', '䷴', '䷵', '䷶', '䷷', '䷸', '䷹', '䷺', '䷻', '䷼', '䷽', '䷾', '䷿'
];

// 创建基础卦象数据
for (let i = 3; i <= 64; i++) {
  const hexagram: HexagramData = {
    symbol: HEXAGRAM_SYMBOLS[i - 3],
    name: HEXAGRAM_NAMES[i - 3],
    pinyin: '', // 简化版本，后续可以补充
    sequence: i,
    guaci: {
      original: '卦辞待补充',
      translation: '卦辞翻译待补充',
      annotation: '注：此卦象数据为简化版本，后续需要补充完整的卦辞、爻辞等详细信息。'
    },
    tuanci: {
      original: '彖辞待补充',
      translation: '彖辞翻译待补充'
    },
    xiangci: {
      original: '象辞待补充',
      translation: '象辞翻译待补充'
    },
    yaoci: Array.from({ length: 6 }, (_, idx) => ({
      position: idx + 1,
      name: idx < 3 ? `初${['六', '六', '六'][idx]}` : `上${['六', '六', '六'][idx - 3]}`,
      yinYang: 'yin' as 'yin' | 'yang',
      original: '爻辞待补充',
      translation: '爻辞翻译待补充',
      xiang: '象辞待补充'
    })),
    metadata: {
      element: '待补充',
      nature: '待补充',
      direction: '待补充',
      season: '待补充',
      trigrams: {
        upper: { name: '待补充', symbol: '☰', nature: '待补充', position: 'upper' },
        lower: { name: '待补充', symbol: '☰', nature: '待补充', position: 'lower' }
      },
      family: '待补充',
      body: '待补充',
      animal: '待补充',
      color: '待补充'
    },
    category: {
      nature: i <= 32 ? 'yang' : 'yin',
      quality: 'neutral',
      difficulty: 'complex'
    },
    tags: ['待补充']
  };

  HEXAGRAMS.push(hexagram);
}

// 生成所有JSON文件
const outputDir = path.join(__dirname, '../src/database/data/hexagrams');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

HEXAGRAMS.forEach(hexagram => {
  const filename = `${hexagram.sequence.toString().padStart(3, '0')}.json`;
  const filepath = path.join(outputDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(hexagram, null, 2), 'utf-8');
  console.log(`✅ 已创建: ${filename}`);
});

console.log(`\n🎉 成功创建 ${HEXAGRAMS.length} 个卦象JSON文件！`);
console.log(`📁 文件位置: ${outputDir}`);
