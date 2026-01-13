import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Hexagram } from '../../database/schemas/hexagram.schema';
import { IHexagram, IHexagramLine, YinYang } from '../../database/schemas/divination-record.schema';

/**
 * 详细解卦结果接口
 */
export interface DetailedAnalysis {
  changingAnalysis: string;  // 变卦分析
  mutualAnalysis: string;    // 互卦分析
  timingAnalysis: string;    // 应期分析
  advice: string;            // 综合建议
}

/**
 * 卦象分析服务
 * 提供变卦、互卦、应期等高级分析功能
 */
@Injectable()
export class HexagramAnalysisService {
  private readonly logger = new Logger(HexagramAnalysisService.name);

  constructor(
    @InjectModel('Hexagram')
    private hexagramModel: Model<Hexagram>,
  ) {}

  /**
   * 生成详细解卦分析
   * @param hexagram 卦象信息
   * @returns 详细分析结果
   */
  async generateDetailedAnalysis(hexagram: IHexagram): Promise<DetailedAnalysis> {
    const [primaryHexagram, changedHexagram, mutualHexagram] = await Promise.all([
      this.hexagramModel.findOne({ sequence: hexagram.primary.sequence }).exec(),
      this.hexagramModel.findOne({ sequence: hexagram.changed.sequence }).exec(),
      this.hexagramModel.findOne({ sequence: hexagram.mutual.sequence }).exec(),
    ]);

    if (!primaryHexagram) {
      this.logger.warn(`Primary hexagram not found: ${hexagram.primary.sequence}`);
    }

    const changingAnalysis = this.analyzeChanging(
      hexagram,
      primaryHexagram,
      changedHexagram,
    );

    const mutualAnalysis = this.analyzeMutual(
      hexagram,
      mutualHexagram,
    );

    const timingAnalysis = this.analyzeTiming(
      hexagram,
      primaryHexagram,
    );

    const advice = this.generateAdvice(
      changingAnalysis,
      mutualAnalysis,
      timingAnalysis,
    );

    return {
      changingAnalysis,
      mutualAnalysis,
      timingAnalysis,
      advice,
    };
  }

  /**
   * 分析变卦
   */
  private analyzeChanging(
    hexagram: IHexagram,
    primaryHexagram: Hexagram | null,
    changedHexagram: Hexagram | null,
  ): string {
    const lines = hexagram.changingLines;

    // 无变爻
    if (lines.length === 0) {
      return `本卦${hexagram.primary.name}无变爻，卦象稳定。${primaryHexagram?.tuanci.translation || ''}`;
    }

    let analysis = `本卦${hexagram.primary.name}有${lines.length}个变爻（${this.getLineNames(lines)}），变卦为${hexagram.changed.name}。\n\n`;

    // 单个变爻
    if (lines.length === 1) {
      const position = lines[0];
      const line = primaryHexagram?.yaoci.find((y) => y.position === position);
      analysis += `爻辞：${line?.original || ''}\n`;
      analysis += `白话：${line?.translation || ''}\n\n`;
      analysis += `单爻变动，卦象由${hexagram.primary.name}变为${hexagram.changed.name}，`;
      analysis += `表示事物处于转折点，应把握时机，顺势而为。`;
      return analysis;
    }

    // 两个变爻
    if (lines.length === 2) {
      analysis += `两爻变动，情况较为复杂。需要综合考虑两个变爻的影响。`;
      analysis += `建议以本卦为主，变卦为辅，审慎行事。`;
      return analysis;
    }

    // 三个变爻
    if (lines.length === 3) {
      analysis += `三爻变动，处于过渡阶段。本卦与变卦力量相当，`;
      analysis += `应参考互卦${hexagram.mutual.name}来综合判断。`;
      return analysis;
    }

    // 四个或更多变爻
    analysis += `${lines.length}个爻变动，说明事物处于大变动时期。`;
    analysis += `应以变卦${hexagram.changed.name}为主，本卦为辅，`;
    analysis += `顺应大势，灵活应变。`;

    return analysis;
  }

  /**
   * 分析互卦
   */
  private analyzeMutual(
    hexagram: IHexagram,
    mutualHexagram: Hexagram | null,
  ): string {
    let analysis = `互卦为${hexagram.mutual.name}，由本卦的二三四爻和三四五爻组成。\n\n`;

    analysis += `互卦揭示事物发展的中间过程和内在本质。`;
    analysis += `${mutualHexagram?.tuanci.translation || ''}\n\n`;

    // 根据互卦的性质给出建议
    const nature = mutualHexagram?.metadata?.nature;
    if (nature) {
      analysis += `互卦之德为${nature}，`;
      analysis += `提示在处理事情时应保持${nature}的态度。`;
    }

    return analysis;
  }

  /**
   * 分析应期
   */
  private analyzeTiming(
    hexagram: IHexagram,
    primaryHexagram: Hexagram | null,
  ): string {
    let analysis = '应期分析：\n\n';

    // 根据卦象的五行属性推断时间
    const element = primaryHexagram?.metadata?.element;
    if (element) {
      const seasonMap: Record<string, string> = {
        '金': '秋季（七、八月）',
        '木': '春季（一、二月）',
        '水': '冬季（十、十一月）',
        '火': '夏季（四、五月）',
        '土': '四季月（三、六、九、十二月）',
      };
      analysis += `卦象五行属${element}，应期可能在${seasonMap[element]}。\n`;
    }

    // 根据变爻位置推断
    const lines = hexagram.changingLines;
    if (lines.length > 0) {
      const positionMap: Record<number, string> = {
        1: '初爻发动，应期较近，约七日内',
        2: '二爻发动，应期半月内',
        3: '三爻发动，应期一个月内',
        4: '四爻发动，应期两个月内',
        5: '五爻发动，应期三个月内',
        6: '上爻发动，应期较远，半年以上',
      };

      if (lines.length === 1) {
        analysis += positionMap[lines[0]] || '具体时间需结合实际情况判断';
      } else {
        analysis += `多个变爻，应期取最早的${Math.min(...lines)}爻对应的参考时间。`;
      }
    } else {
      analysis += '本卦无变爻，事情发展平稳，无需急于求成。';
    }

    return analysis;
  }

  /**
   * 生成综合建议
   */
  private generateAdvice(
    changingAnalysis: string,
    mutualAnalysis: string,
    timingAnalysis: string,
  ): string {
    let advice = '【综合建议】\n\n';

    advice += '根据卦象分析，建议如下：\n\n';
    advice += '1. 心态方面：保持冷静和客观，避免盲目决策。\n';
    advice += '2. 行动方面：根据卦象启示，把握时机，顺势而为。\n';
    advice += '3. 注意事项：关注变爻所提示的关键节点。\n';
    advice += '4. 时间安排：参考应期分析，合理安排计划。\n\n';

    advice += '温馨提示：卦象仅供参考，最终决定还需结合实际情况和个人判断。';

    return advice;
  }

  /**
   * 获取爻位名称列表
   */
  private getLineNames(positions: number[]): string {
    const names: Record<number, string> = {
      1: '初爻',
      2: '二爻',
      3: '三爻',
      4: '四爻',
      5: '五爻',
      6: '上爻',
    };

    return positions.map((p) => names[p]).join('、');
  }
}
