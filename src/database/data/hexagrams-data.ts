/**
 * 六十四卦基础数据
 * 包含卦名、卦辞、爻辞等核心内容
 */

export interface IHexagramData {
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
 * 六十四卦数据
 * 注：此为示例数据，包含部分重要卦象
 * 完整的64卦数据需要从易经古籍中录入
 */
export const HEXAGRAMS_DATA: IHexagramData[] = [
  {
    symbol: '䷀',
    name: '乾为天',
    pinyin: 'qián wéi tiān',
    sequence: 1,
    guaci: {
      original: '元，亨，利，贞。',
      translation: '元始，亨通，和谐有利，正固持久。',
      annotation: '乾卦象征天，代表刚健、进取、创造。元亨利贞是乾卦四德，表示事物发展的四个阶段。'
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
  },
  // 水雷屯卦
  {
    symbol: '䷂',
    name: '水雷屯',
    pinyin: 'shuǐ léi zhūn',
    sequence: 3,
    guaci: {
      original: '元，亨，利，贞。勿用有攸往，利建侯。',
      translation: '元始，亨通，和谐有利，正固。不宜有所前往，利于建立诸侯。',
      annotation: '屯卦象征万物初生之时的艰难，但也蕴含生机。'
    },
    tuanci: {
      original: '屯，刚柔始交而难生。动乎险中，大亨贞。雷雨之动满盈，天造草昧，宜建侯而不宁。',
      translation: '屯卦，刚柔开始交接而艰难产生。在险难中运动，大为亨通正固。雷雨动荡充满，天地创造草昧，宜建立诸侯而不得安宁。'
    },
    xiangci: {
      original: '云雷，屯。君子以经纶。',
      translation: '云雷相交，屯卦。君子应以此经纶天下大事。'
    },
    yaoci: [
      {
        position: 1,
        name: '初九',
        yinYang: 'yang',
        original: '磐桓，利居贞，利建侯。',
        translation: '徘徊不进，利于安居守正，利于建立诸侯。',
        xiang: '虽磐桓，志行正也。以贵下贱，大得民也。',
        annotation: '比喻初创业时应当稳重，积蓄力量。'
      },
      {
        position: 2,
        name: '六二',
        yinYang: 'yin',
        original: '屯如邅如，乘马班如。匪寇，婚媾。女子贞不字，十年乃字。',
        translation: '艰难前进，骑着马盘旋不前。不是寇盗，是求婚的。女子守贞不嫁，十年后才嫁。',
        xiang: '六二之难，乘刚也。十年乃字，反常也。',
        annotation: '比喻处境困难，需要耐心等待时机。'
      },
      {
        position: 3,
        name: '六三',
        yinYang: 'yin',
        original: '即鹿无虞，惟入于林中。君子几，不如舍。往吝。',
        translation: '追鹿没有虞人引导，只有进入林中。君子见机，不如放弃。前往会有困难。',
        xiang: '即鹿无虞，以从禽也。君子舍之，往吝穷也。',
        annotation: '比喻盲目冒进会陷入困境。'
      },
      {
        position: 4,
        name: '六四',
        yinYang: 'yin',
        original: '乘马班如，求婚媾。往吉，无不利。',
        translation: '骑着马盘旋不前，是去求婚。前往吉利，没有什么不利。',
        xiang: '求而往，明也。',
        annotation: '比喻寻求合作，共同发展。'
      },
      {
        position: 5,
        name: '九五',
        yinYang: 'yang',
        original: '屯其膏，小贞吉，大贞凶。',
        translation: '积聚恩泽，小的正固吉利，大的正固凶险。',
        xiang: '屯其膏，施未光也。',
        annotation: '比喻恩泽未广，应当小步前进。'
      },
      {
        position: 6,
        name: '上六',
        yinYang: 'yin',
        original: '乘马班如，泣血涟如。',
        translation: '骑着马盘旋不前，哭得血泪涟涟。',
        xiang: '泣血涟如，何可长也。',
        annotation: '比喻陷入绝境，悲痛欲绝。'
      }
    ],
    metadata: {
      element: '水',
      nature: '雷',
      direction: '北',
      season: '春',
      trigrams: {
        upper: { name: '坎', symbol: '☵', nature: '水', position: 'upper' },
        lower: { name: '震', symbol: '☳', nature: '雷', position: 'lower' }
      },
      family: '中男',
      body: '耳',
      animal: '猪',
      color: '黑'
    },
    category: {
      nature: 'yin',
      quality: 'neutral',
      difficulty: 'complex'
    },
    tags: ['水', '雷', '艰难', '初生', '创业']
  },
  // 山水蒙卦
  {
    symbol: '䷃',
    name: '山水蒙',
    pinyin: 'shān shuǐ méng',
    sequence: 4,
    guaci: {
      original: '亨。匪我求童蒙，童蒙求我。初筮告，再三渎，渎则不告。利贞。',
      translation: '亨通。不是我求蒙昧的儿童，是蒙昧的儿童求我。初次占筮告诉他，再三占筮就亵渎了，亵渎就不告诉。利于正固。',
      annotation: '蒙卦象征启蒙、教育。强调主动学习的重要性。'
    },
    tuanci: {
      original: '蒙，山下有险，险而止，蒙。蒙亨，以亨行，时中也。匪我求童蒙，童蒙求我，志应也。初筮告，以刚中也。再三渎，渎则不告，渎蒙也。蒙以养正，圣功也。',
      translation: '蒙卦，山下有险阻，险阻而停止，就是蒙。蒙卦亨通，以亨通行，是时机适中。不是我求童蒙，童蒙求我，是志向相应。初次占筮告诉，是因为刚健居中。再三占筮亵渎，亵渎就不告诉，是亵渎蒙昧。蒙卦用来培养正气，是圣人的功业。'
    },
    xiangci: {
      original: '山下出泉，蒙。君子以果行育德。',
      translation: '山下流出泉水，蒙卦。君子应果断行动培育品德。'
    },
    yaoci: [
      {
        position: 1,
        name: '初六',
        yinYang: 'yin',
        original: '发蒙，利用刑人，用说桎梏，以往吝。',
        translation: '启发蒙昧，利于使用刑法，用来脱去桎梏，前往会有困难。',
        xiang: '利用刑人，以正法也。',
        annotation: '比喻教育需要严格的方法。'
      },
      {
        position: 2,
        name: '九二',
        yinYang: 'yang',
        original: '包蒙，吉。纳妇，吉。子克家。',
        translation: '包容蒙昧，吉利。接纳妇人，吉利。儿子能够持家。',
        xiang: '子克家，刚柔接也。',
        annotation: '比喻包容和耐心教育的重要性。'
      },
      {
        position: 3,
        name: '六三',
        yinYang: 'yin',
        original: '勿用娶女，见金夫，不有躬，无攸利。',
        translation: '不要娶这个女子，看见有钱的男子，就失去了自己，没有什么有利。',
        xiang: '勿用娶女，行不顺也。',
        annotation: '比喻被诱惑而迷失自己。'
      },
      {
        position: 4,
        name: '六四',
        yinYang: 'yin',
        original: '困蒙，吝。',
        translation: '被困在蒙昧中，困难。',
        xiang: '困蒙之吝，独远实也。',
        annotation: '比喻缺乏正确的指导。'
      },
      {
        position: 5,
        name: '六五',
        yinYang: 'yin',
        original: '童蒙，吉。',
        translation: '儿童般的蒙昧，吉利。',
        xiang: '童蒙之吉，顺以巽也。',
        annotation: '比喻保持谦虚学习的态度。'
      },
      {
        position: 6,
        name: '上九',
        yinYang: 'yang',
        original: '击蒙，不利为寇，利御寇。',
        translation: '打击蒙昧，不利于做寇盗，利于抵御寇盗。',
        xiang: '利用御寇，上下顺也。',
        annotation: '比喻教育要严厉，但要讲究方法。'
      }
    ],
    metadata: {
      element: '土',
      nature: '水',
      direction: '东北',
      season: '冬',
      trigrams: {
        upper: { name: '艮', symbol: '☶', nature: '山', position: 'upper' },
        lower: { name: '坎', symbol: '☵', nature: '水', position: 'lower' }
      },
      family: '少男',
      body: '手',
      animal: '狗',
      color: '白'
    },
    category: {
      nature: 'yin',
      quality: 'neutral',
      difficulty: 'complex'
    },
    tags: ['山', '水', '教育', '启蒙', '学习']
  }
  // 注：此处仅录入4个卦象作为示例
  // 完整的64卦数据需要继续录入，包括：
  // 序号5-64的卦象，每个卦象需要包含完整的卦辞、彖辞、象辞、爻辞等
  // 建议通过专门的易经研究团队协助完成内容录入和校对工作
];

/**
 * 获取所有卦象数据
 */
export function getAllHexagrams(): IHexagramData[] {
  return HEXAGRAMS_DATA;
}

/**
 * 根据序号获取卦象
 */
export function getHexagramBySequence(sequence: number): IHexagramData | undefined {
  return HEXAGRAMS_DATA.find(h => h.sequence === sequence);
}

/**
 * 根据卦名搜索卦象
 */
export function searchHexagramsByName(keyword: string): IHexagramData[] {
  return HEXAGRAMS_DATA.filter(h =>
    h.name.includes(keyword) || h.pinyin.includes(keyword)
  );
}

/**
 * 根据标签搜索卦象
 */
export function searchHexagramsByTag(tag: string): IHexagramData[] {
  return HEXAGRAMS_DATA.filter(h => h.tags.includes(tag));
}
