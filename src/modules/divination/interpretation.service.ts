import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Hexagram } from '../../database/schemas/hexagram.schema';

export interface Interpretation {
  overall: string;
  career: string;
  relationships: string;
  health: string;
  wealth: string;
}

@Injectable()
export class InterpretationService {
  private readonly logger = new Logger(InterpretationService.name);

  constructor(
    @InjectModel('Hexagram')
    private hexagramModel: Model<Hexagram>,
  ) {}

  /**
   * 生成基础解读
   */
  async generateBasicInterpretation(hexagram: Hexagram): Promise<Interpretation> {
    return {
      overall: this.generateOverall(hexagram),
      career: this.generateCareer(hexagram),
      relationships: this.generateRelationships(hexagram),
      health: this.generateHealth(hexagram),
      wealth: this.generateWealth(hexagram),
    };
  }

  /**
   * 生成卦象概述
   */
  private generateOverall(hexagram: Hexagram): string {
    const { guaci, tuanci, xiangci } = hexagram;

    // 基于卦辞和彖辞生成概述
    let overview = guaci.translation || guaci.original;

    if (tuanci && tuanci.translation) {
      overview += ' ' + tuanci.translation;
    }

    return overview;
  }

  /**
   * 生成事业运势
   */
  private generateCareer(hexagram: Hexagram): string {
    const { yaoci, metadata } = hexagram;

    // 基于爻辞和卦象属性生成事业运势
    const careerLines = yaoci.filter(line =>
      line.original.includes('事业') ||
      line.original.includes('官') ||
      line.original.includes('进')
    );

    if (careerLines.length > 0) {
      return careerLines[0].translation || careerLines[0].original;
    }

    // 默认基于卦象性质
    return `${hexagram.name}之象，事业运势${metadata?.nature?.includes('吉') ? '亨通' : '需谨慎'}。`;
  }

  /**
   * 生成感情运势
   */
  private generateRelationships(hexagram: Hexagram): string {
    const { yaoci, category } = hexagram;

    // 基于爻辞生成感情运势
    const relationshipLines = yaoci.filter(line =>
      line.original.includes('婚') ||
      line.original.includes('娶') ||
      line.original.includes('配')
    );

    if (relationshipLines.length > 0) {
      return relationshipLines[0].translation || relationshipLines[0].original;
    }

    return `${hexagram.name}之象，感情运势${category?.quality === 'lucky' ? '顺利' : '需经营'}。`;
  }

  /**
   * 生成健康运势
   */
  private generateHealth(hexagram: Hexagram): string {
    const { metadata } = hexagram;

    // 基于卦象对应的身体部位
    return `${hexagram.name}之象，应注意${metadata?.body || '整体'}健康，保持平和心态。`;
  }

  /**
   * 生成财运运势
   */
  private generateWealth(hexagram: Hexagram): string {
    const { yaoci, category } = hexagram;

    // 基于爻辞生成财运运势
    const wealthLines = yaoci.filter(line =>
      line.original.includes('财') ||
      line.original.includes('利') ||
      line.original.includes('得')
    );

    if (wealthLines.length > 0) {
      return wealthLines[0].translation || wealthLines[0].original;
    }

    return `${hexagram.name}之象，财运运势${category?.quality === 'lucky' ? '亨通' : '需谨慎'}。`;
  }
}