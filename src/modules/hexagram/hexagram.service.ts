import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Hexagram } from '../../database/schemas/hexagram.schema';

/**
 * 卦象服务
 * 提供六十四卦数据查询功能
 */
@Injectable()
export class HexagramService {
  constructor(
    @InjectModel('Hexagram')
    private hexagramModel: Model<Hexagram>,
  ) {}

  /**
   * 获取所有卦象列表
   */
  async findAll(): Promise<Hexagram[]> {
    return this.hexagramModel.find().sort({ sequence: 1 }).exec();
  }

  /**
   * 根据序号获取卦象
   * @param sequence 卦序 (1-64)
   */
  async findBySequence(sequence: number): Promise<Hexagram | null> {
    return this.hexagramModel.findOne({ sequence }).exec();
  }

  /**
   * 根据卦象符号获取卦象
   * @param symbol 卦象符号 (如 "䷀")
   */
  async findBySymbol(symbol: string): Promise<Hexagram | null> {
    return this.hexagramModel.findOne({ symbol }).exec();
  }

  /**
   * 根据卦名搜索卦象（模糊匹配）
   * @param name 卦名或简称
   */
  async searchByName(name: string): Promise<Hexagram[]> {
    return this.hexagramModel
      .find({
        $or: [
          { name: { $regex: name, $options: 'i' } },
          { pinyin: { $regex: name, $options: 'i' } },
        ],
      })
      .sort({ sequence: 1 })
      .exec();
  }

  /**
   * 获取基础解卦内容
   * @param sequence 卦序 (1-64)
   */
  async getBasicInterpretation(sequence: number): Promise<Hexagram | null> {
    const hexagram = await this.findBySequence(sequence);
    if (!hexagram) {
      return null;
    }

    // 返回基础解卦所需的内容
    return hexagram;
  }

  /**
   * 随机获取一个卦象（用于一键起卦）
   */
  async getRandomHexagram(): Promise<Hexagram | null> {
    const count = await this.hexagramModel.countDocuments();
    const random = Math.floor(Math.random() * count) + 1;
    return this.findBySequence(random);
  }

  /**
   * 根据六爻获取卦象
   * @param lines 六爻数组 [0,0,0,1,1,1] (0=阴, 1=阳，从下到上)
   */
  async findByLines(lines: number[]): Promise<Hexagram | null> {
    // 将六爻转换为卦象符号
    // 这里简化处理，实际需要根据六爻规则匹配
    return this.hexagramModel.findOne({}).exec();
  }

  /**
   * 获取相关卦象
   * @param sequence 卦序
   */
  async getRelatedHexagrams(sequence: number): Promise<{
    opposites?: Hexagram[];
    related?: Hexagram[];
    derived?: Hexagram[];
  }> {
    const hexagram = await this.findBySequence(sequence);
    if (!hexagram) {
      return {};
    }

    const result: any = {};

    if (hexagram.opposites && hexagram.opposites.length > 0) {
      result.opposites = await this.hexagramModel
        .find({ sequence: { $in: hexagram.opposites } })
        .sort({ sequence: 1 })
        .exec();
    }

    if (hexagram.related && hexagram.related.length > 0) {
      result.related = await this.hexagramModel
        .find({ sequence: { $in: hexagram.related } })
        .sort({ sequence: 1 })
        .exec();
    }

    if (hexagram.derived && hexagram.derived.length > 0) {
      result.derived = await this.hexagramModel
        .find({ sequence: { $in: hexagram.derived } })
        .sort({ sequence: 1 })
        .exec();
    }

    return result;
  }

  /**
   * 检查数据库中是否有卦象数据
   */
  async hasData(): Promise<boolean> {
    const count = await this.hexagramModel.countDocuments();
    return count > 0;
  }

  /**
   * 初始化卦象数据（用于种子数据）
   * @param hexagrams 卦象数据数组
   */
  async initializeData(hexagrams: Partial<Hexagram>[]): Promise<void> {
    const existingCount = await this.hexagramModel.countDocuments();
    if (existingCount > 0) {
      return; // 已有数据，不重复初始化
    }

    await this.hexagramModel.insertMany(hexagrams);
  }

  /**
   * 根据标签获取卦象
   * @param tags 标签数组
   */
  async findByTags(tags: string[]): Promise<Hexagram[]> {
    return this.hexagramModel
      .find({ tags: { $in: tags } })
      .sort({ sequence: 1 })
      .exec();
  }

  /**
   * 根据五行获取卦象
   * @param element 五行 (金、木、水、火、土)
   */
  async findByElement(element: string): Promise<Hexagram[]> {
    return this.hexagramModel
      .find({ 'metadata.element': element })
      .sort({ sequence: 1 })
      .exec();
  }

  /**
   * 获取卦象统计信息
   */
  async getStatistics(): Promise<{
    total: number;
    byElement: Record<string, number>;
    byNature: Record<string, number>;
  }> {
    const hexagrams = await this.findAll();

    const byElement: Record<string, number> = {};
    const byNature: Record<string, number> = {};

    for (const hexagram of hexagrams) {
      if (hexagram.metadata?.element) {
        byElement[hexagram.metadata.element] =
          (byElement[hexagram.metadata.element] || 0) + 1;
      }
      if (hexagram.metadata?.nature) {
        byNature[hexagram.metadata.nature] =
          (byNature[hexagram.metadata.nature] || 0) + 1;
      }
    }

    return {
      total: hexagrams.length,
      byElement,
      byNature,
    };
  }
}
