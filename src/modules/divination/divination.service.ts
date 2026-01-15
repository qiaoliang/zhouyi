import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Hexagram } from '../../database/schemas/hexagram.schema';
import {
  DivinationRecord,
  IHexagram,
  IHexagramLine,
  YinYang,
} from '../../database/schemas/divination-record.schema';

/**
 * 铜钱结果
 */
export interface CoinToss {
  heads: number;  // 字（正面）
  tails: number;  // 背（反面）
}

/**
 * 爻的类型
 */
export enum LineType {
  YOUNG_YANG = 'young_yang',   // 少阳（不变）
  YOUNG_YIN = 'young_yin',     // 少阴（不变）
  OLD_YANG = 'old_yang',       // 老阳（变阴）
  OLD_YIN = 'old_yin',         // 老阴（变阳）
}

/**
 * 八卦的二进制表示和属性
 */
interface TrigramInfo {
  binary: string;      // 3位二进制（从上到下）
  name: string;
  symbol: string;
  pinyin: string;
}

/**
 * 八卦定义
 * 按先天八卦数序排列
 */
const TRIGRAMS: Record<string, TrigramInfo> = {
  '111': { binary: '111', name: '乾', symbol: '☰', pinyin: 'qián' },
  '011': { binary: '011', name: '兑', symbol: '☱', pinyin: 'duì' },
  '101': { binary: '101', name: '离', symbol: '☲', pinyin: 'lí' },
  '001': { binary: '001', name: '震', symbol: '☳', pinyin: 'zhèn' },
  '000': { binary: '000', name: '坤', symbol: '☷', pinyin: 'kūn' },
  '010': { binary: '010', name: '艮', symbol: '☶', pinyin: 'gèn' },
  '100': { binary: '100', name: '坎', symbol: '☵', pinyin: 'kǎn' },
  '110': { binary: '110', name: '巽', symbol: '☴', pinyin: 'xùn' },
};

/**
 * 金钱课起卦服务
 * 实现传统金钱课起卦算法
 */
@Injectable()
export class DivinationService {
  private readonly logger = new Logger(DivinationService.name);

  constructor(
    @InjectModel('Hexagram')
    private hexagramModel: Model<Hexagram>,
    @InjectModel('DivinationRecord')
    private divinationRecordModel: Model<DivinationRecord>,
  ) {}

  /**
   * 模拟掷一次铜钱（三个铜钱）
   * @returns 铜钱结果
   */
  private tossCoins(): CoinToss {
    let heads = 0;
    let tails = 0;

    for (let i = 0; i < 3; i++) {
      if (Math.random() < 0.5) {
        heads++;
      } else {
        tails++;
      }
    }

    return { heads, tails };
  }

  /**
   * 根据铜钱结果确定爻的类型
   * @param toss 铜钱结果
   * @returns 爻的类型
   */
  private getLineType(toss: CoinToss): LineType {
    // 1字2背 = 少阳（阳，不变）
    if (toss.heads === 1 && toss.tails === 2) {
      return LineType.YOUNG_YANG;
    }
    // 2字1背 = 少阴（阴，不变）
    if (toss.heads === 2 && toss.tails === 1) {
      return LineType.YOUNG_YIN;
    }
    // 3字 = 老阳（变阴）
    if (toss.heads === 3) {
      return LineType.OLD_YANG;
    }
    // 3背 = 老阴（变阳）
    if (toss.tails === 3) {
      return LineType.OLD_YIN;
    }

    throw new BadRequestException('Invalid coin toss result');
  }

  /**
   * 将爻的类型转换为阴/阳
   * @param lineType 爻的类型
   * @returns 阴阳
   */
  private lineTypeToYinYang(lineType: LineType): YinYang {
    return [LineType.YOUNG_YANG, LineType.OLD_YANG].includes(lineType)
      ? YinYang.YANG
      : YinYang.YIN;
  }

  /**
   * 判断爻是否为变爻
   * @param lineType 爻的类型
   * @returns 是否变爻
   */
  private isChangingLine(lineType: LineType): boolean {
    return lineType === LineType.OLD_YANG || lineType === LineType.OLD_YIN;
  }

  /**
   * 生成一个爻（掷一次铜钱）
   * @param position 爻位 (1-6, 从下到上)
   * @returns 爻
   */
  private async generateLine(position: number): Promise<IHexagramLine> {
    const toss = this.tossCoins();
    const lineType = this.getLineType(toss);

    return {
      position,
      yinYang: this.lineTypeToYinYang(lineType),
      changing: this.isChangingLine(lineType),
    };
  }

  /**
   * 将六爻转换为二进制字符串数组
   * @param lines 六爻数组（从下到上）
   * @returns [上卦二进制, 下卦二进制]
   */
  private linesToTrigrams(lines: IHexagramLine[]): [string, string] {
    // 下卦：初、二、三爻（索引0,1,2），从上到下排列需要反转
    const lowerTrigram = lines
      .slice(0, 3)
      .reverse()
      .map((line) => (line.yinYang === YinYang.YANG ? '1' : '0'))
      .join('');

    // 上卦：四、五、上爻（索引3,4,5），从上到下排列需要反转
    const upperTrigram = lines
      .slice(3, 6)
      .reverse()
      .map((line) => (line.yinYang === YinYang.YANG ? '1' : '0'))
      .join('');

    return [upperTrigram, lowerTrigram];
  }

  /**
   * 根据上下卦查找卦象
   * @param upperTrigram 上卦二进制
   * @param lowerTrigram 下卦二进制
   * @returns 卦象信息
   */
  private async findHexagramByTrigrams(
    upperTrigram: string,
    lowerTrigram: string,
  ): Promise<{
    name: string;
    symbol: string;
    pinyin: string;
    sequence: number;
  } | null> {
    const upperInfo = TRIGRAMS[upperTrigram];
    const lowerInfo = TRIGRAMS[lowerTrigram];

    if (!upperInfo || !lowerInfo) {
      this.logger.error(`Invalid trigrams: upper=${upperTrigram}, lower=${lowerTrigram}`);
      return null;
    }

    // 在数据库中查找匹配的卦象
    const hexagram = await this.hexagramModel
      .findOne({
        'metadata.trigrams.upper.name': upperInfo.name,
        'metadata.trigrams.lower.name': lowerInfo.name,
      })
      .exec();

    if (!hexagram) {
      this.logger.warn(`No hexagram found for upper=${upperInfo.name}, lower=${lowerInfo.name}`);
      // 当找不到匹配的卦象时，随机返回一个已有的卦象
      // TODO: 补充完整的 64 个卦象数据
      const allHexagrams = await this.hexagramModel.find().exec();
      if (!allHexagrams || allHexagrams.length === 0) {
        this.logger.error('No hexagrams found in database');
        return null;
      }
      const randomHexagram = allHexagrams[Math.floor(Math.random() * allHexagrams.length)];
      this.logger.warn(`Using random hexagram: ${randomHexagram.name} (sequence: ${randomHexagram.sequence})`);
      return {
        name: randomHexagram.name,
        symbol: randomHexagram.symbol,
        pinyin: randomHexagram.pinyin,
        sequence: randomHexagram.sequence,
      };
    }

    return {
      name: hexagram.name,
      symbol: hexagram.symbol,
      pinyin: hexagram.pinyin,
      sequence: hexagram.sequence,
    };
  }

  /**
   * 计算互卦
   * 互卦：二三四爻为下卦，三四五爻为上卦
   * @param lines 六爻（从下到上）
   * @returns 互卦信息
   */
  private async calculateMutualHexagram(
    lines: IHexagramLine[],
  ): Promise<{
    name: string;
    symbol: string;
    pinyin: string;
    sequence: number;
  } | null> {
    // 互卦的下卦：原卦的二、三、四爻（索引1,2,3）
    const mutualLowerLines = lines.slice(1, 4);
    const mutualLowerBinary = mutualLowerLines
      .reverse()
      .map((line) => (line.yinYang === YinYang.YANG ? '1' : '0'))
      .join('');

    // 互卦的上卦：原卦的三、四、五爻（索引2,3,4）
    const mutualUpperLines = lines.slice(2, 5);
    const mutualUpperBinary = mutualUpperLines
      .reverse()
      .map((line) => (line.yinYang === YinYang.YANG ? '1' : '0'))
      .join('');

    return this.findHexagramByTrigrams(mutualUpperBinary, mutualLowerBinary);
  }

  /**
   * 执行金钱课起卦
   * 连续掷6次铜钱，生成卦象
   * @returns 卦象信息
   */
  async performDivination(): Promise<IHexagram> {
    // 生成六爻（从下到上：初爻到上爻）
    const lines: IHexagramLine[] = [];
    for (let i = 1; i <= 6; i++) {
      const line = await this.generateLine(i);
      lines.push(line);
    }

    // 计算上下卦
    const [upperTrigram, lowerTrigram] = this.linesToTrigrams(lines);

    // 查找主卦
    const primary = await this.findHexagramByTrigrams(upperTrigram, lowerTrigram);

    if (!primary) {
      this.logger.error(`Failed to find primary hexagram for upper=${upperTrigram}, lower=${lowerTrigram}`);
      throw new BadRequestException('Failed to determine primary hexagram');
    }

    // 计算变卦
    let changed: { name: string; symbol: string; pinyin: string; sequence: number };
    const changingLines = lines
      .filter((line) => line.changing)
      .map((line) => line.position);

    if (changingLines.length > 0) {
      // 将变爻取反
      const changedLines = lines.map((line) => ({
        ...line,
        yinYang: line.changing
          ? line.yinYang === YinYang.YANG
            ? YinYang.YIN
            : YinYang.YANG
          : line.yinYang,
        changing: false,
      }));

      const [changedUpper, changedLower] = this.linesToTrigrams(changedLines);
      const changedHexagram = await this.findHexagramByTrigrams(changedUpper, changedLower);

      if (!changedHexagram) {
        // 如果找不到变卦，使用主卦
        changed = primary;
      } else {
        changed = changedHexagram;
      }
    } else {
      // 没有变爻，变卦就是主卦
      changed = primary;
    }

    // 计算互卦
    const mutual = await this.calculateMutualHexagram(lines);

    if (!mutual) {
      this.logger.warn('Failed to calculate mutual hexagram');
      // 如果找不到互卦，使用主卦
      return {
        primary: {
          name: primary.name,
          symbol: primary.symbol,
          pinyin: primary.pinyin,
          sequence: primary.sequence,
        },
        lines,
        changed: {
          name: changed.name,
          symbol: changed.symbol,
          pinyin: changed.pinyin,
          sequence: changed.sequence,
        },
        mutual: {
          name: primary.name,
          symbol: primary.symbol,
          pinyin: primary.pinyin,
          sequence: primary.sequence,
        },
        changingLines,
      };
    }

    return {
      primary: {
        name: primary.name,
        symbol: primary.symbol,
        pinyin: primary.pinyin,
        sequence: primary.sequence,
      },
      lines,
      changed: {
        name: changed.name,
        symbol: changed.symbol,
        pinyin: changed.pinyin,
        sequence: changed.sequence,
      },
      mutual: {
        name: mutual.name,
        symbol: mutual.symbol,
        pinyin: mutual.pinyin,
        sequence: mutual.sequence,
      },
      changingLines,
    };
  }

  /**
   * 保存卜卦记录
   * @param hexagram 卦象信息
   * @param userId 用户ID（可选）
   * @param guestId 游客ID（可选）
   * @param device 设备信息
   * @returns 保存的记录
   */
  async saveDivinationRecord(
    hexagram: IHexagram,
    userId?: string,
    guestId?: string,
    device?: { platform?: string; model?: string },
  ): Promise<DivinationRecord> {
    // 获取主卦数据以填充基础解卦
    const hexagramData = await this.hexagramModel
      .findOne({ sequence: hexagram.primary.sequence })
      .exec();

    if (!hexagramData) {
      throw new BadRequestException('Hexagram data not found');
    }

    const record = new this.divinationRecordModel({
      userId,
      guestId,
      hexagram,
      device: device
        ? {
            platform: device.platform as any,
            model: device.model || '',
          }
        : undefined,
      interpretation: {
        basic: {
          hexagramName: hexagramData.name,
          guaci: hexagramData.guaci.original,
          guaciTranslation: hexagramData.guaci.translation,
          yaoci: hexagramData.yaoci.map((yao) => ({
            position: yao.position,
            original: yao.original,
            translation: yao.translation,
          })),
        },
      },
      payment: {
        type: 'free',
        amount: 0,
        status: 'unpaid',
      },
    });

    return record.save();
  }

  /**
   * 获取用户的卜卦历史
   * @param userId 用户ID
   * @param page 页码
   * @param limit 每页数量
   * @returns 卜卦记录列表
   */
  async getUserDivinationHistory(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ records: DivinationRecord[]; total: number }> {
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      this.divinationRecordModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.divinationRecordModel.countDocuments({ userId }),
    ]);

    return { records, total };
  }

  /**
   * 获取游客的卜卦历史
   * @param guestId 游客ID
   * @param page 页码
   * @param limit 每页数量
   * @returns 卜卦记录列表
   */
  async getGuestDivinationHistory(
    guestId: string,
    page = 1,
    limit = 20,
  ): Promise<{ records: DivinationRecord[]; total: number }> {
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      this.divinationRecordModel
        .find({ guestId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.divinationRecordModel.countDocuments({ guestId }),
    ]);

    return { records, total };
  }

  /**
   * 获取单个卜卦记录
   * @param recordId 记录ID
   * @param userId 用户ID（用于权限验证）
   * @returns 卜卦记录
   */
  async getDivinationRecord(
    recordId: string,
    userId?: string,
  ): Promise<DivinationRecord | null> {
    const query: any = { _id: recordId };

    if (userId) {
      query.userId = userId;
    }

    return this.divinationRecordModel.findOne(query).exec();
  }

  /**
   * 保存精准信息到卜卦记录
   * @param recordId 记录ID
   * @param preciseInfo 精准信息
   * @param userId 用户ID
   */
  async savePreciseInfo(
    recordId: string,
    preciseInfo: {
      name: string;
      gender: 'male' | 'female';
      birthDate: Date;
      question: string;
    },
    userId: string,
  ): Promise<DivinationRecord | null> {
    const query: any = { _id: recordId, userId };

    const record = await this.divinationRecordModel
      .findOneAndUpdate(
        query,
        { preciseInfo },
        { new: true },
      )
      .exec();

    return record;
  }

  /**
   * 生成精准解卦
   * 基于用户的个人信息生成更个性化的解读
   * @param recordId 记录ID
   * @param userId 用户ID
   * @returns 精准解卦结果
   */
  async generatePreciseInterpretation(
    recordId: string,
    userId: string,
  ): Promise<{
    precise: string;
    personalizedAdvice: string;
  } | null> {
    const record = await this.getDivinationRecord(recordId, userId);

    if (!record || !record.preciseInfo) {
      return null;
    }

    const { name, gender, birthDate, question } = record.preciseInfo;
    const hexagram = record.hexagram;

    // 计算年龄
    const age = this.calculateAge(new Date(birthDate));
    const birthYear = new Date(birthDate).getFullYear();

    // 生成个性化解读
    const precise = this.generatePersonalizedInterpretation(
      name,
      gender,
      age,
      birthYear,
      question,
      hexagram,
    );

    const personalizedAdvice = this.generatePersonalizedAdvice(
      name,
      question,
      hexagram,
    );

    return {
      precise,
      personalizedAdvice,
    };
  }

  /**
   * 计算年龄
   */
  private calculateAge(birthDate: Date): number {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  }

  /**
   * 生成个性化解读
   */
  private generatePersonalizedInterpretation(
    name: string,
    gender: string,
    age: number,
    birthYear: number,
    question: string,
    hexagram: IHexagram,
  ): string {
    let interpretation = `【精准解卦 - 为${name}先生/女士量身定制】\n\n`;
    interpretation += `占问事项：${question}\n\n`;
    interpretation += `所得卦象：${hexagram.primary.name}（${hexagram.primary.symbol}）\n\n`;

    // 根据年龄给出建议
    if (age < 30) {
      interpretation += `您正值青春年华，${hexagram.primary.name}之卦提示您`;
    } else if (age < 50) {
      interpretation += `您处于人生黄金时期，${hexagram.primary.name}之卦预示`;
    } else {
      interpretation += `您阅历丰富，${hexagram.primary.name}之卦为您揭示`;
    }

    // 根据卦象性质给出建议
    const nature = hexagram.primary.sequence <= 32 ? '阳卦' : '阴卦';
    if (nature === '阳卦') {
      interpretation += `事业发展较为顺利，宜积极进取。`;
    } else {
      interpretation += `宜守不宜攻，稳中求进。`;
    }

    interpretation += `\n\n针对您所问"${question}"一事，`;

    // 根据变爻给出具体建议
    if (hexagram.changingLines.length > 0) {
      interpretation += `卦中有${hexagram.changingLines.length}个变爻，说明事情处于变化之中，需要把握时机。`;
    } else {
      interpretation += `卦象稳定，建议按既定计划稳步推进。`;
    }

    return interpretation;
  }

  /**
   * 生成个性化建议
   */
  private generatePersonalizedAdvice(
    name: string,
    question: string,
    hexagram: IHexagram,
  ): string {
    let advice = `【致${name}的建议】\n\n`;
    advice += `关于"${question}"这个问题，根据卦象分析：\n\n`;

    // 根据卦序给出建议
    const sequence = hexagram.primary.sequence;

    if (sequence <= 8) {
      advice += `当前卦象属于先天八卦之一，能量较为纯粹。建议您保持初心，坚持方向。`;
    } else if (sequence <= 32) {
      advice += `卦象显示事物发展较为顺利，但需要注意细节。建议您谨慎行事，把握机会。`;
    } else {
      advice += `卦象提示需要更多耐心和智慧。建议您冷静分析，等待时机成熟。`;
    }

    advice += `\n\n温馨提示：卦象仅供参考，最终决策还需结合实际情况。`;

    return advice;
  }
}
