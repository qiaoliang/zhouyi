import { Controller, Get, Param, Query, NotFoundException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HexagramService } from './hexagram.service';
import { Hexagram } from '../../database/schemas/hexagram.schema';

/**
 * 卦象控制器
 * 提供六十四卦数据查询API
 */
@ApiTags('hexagram')
@Controller('hexagram')
export class HexagramController {
  constructor(private readonly hexagramService: HexagramService) {}

  /**
   * 获取所有卦象列表
   * GET /hexagram
   */
  @Get()
  @ApiOperation({ summary: '获取所有卦象列表' })
  @ApiResponse({ status: 200, description: '成功返回卦象列表', type: [Object] })
  async findAll() {
    const hexagrams = await this.hexagramService.findAll();
    return {
      success: true,
      data: hexagrams,
      timestamp: Date.now(),
    };
  }

  /**
   * 根据序号获取卦象
   * GET /hexagram/sequence/:sequence
   */
  @Get('sequence/:sequence')
  @ApiOperation({ summary: '根据序号获取卦象' })
  @ApiParam({ name: 'sequence', description: '卦序 (1-64)', example: '1' })
  @ApiResponse({ status: 200, description: '成功返回卦象详情' })
  @ApiResponse({ status: 404, description: '卦象不存在' })
  async findBySequence(@Param('sequence') sequence: string) {
    const hexagram = await this.hexagramService.findBySequence(
      parseInt(sequence),
    );
    if (!hexagram) {
      throw new NotFoundException('卦象不存在');
    }
    return {
      success: true,
      data: hexagram,
      timestamp: Date.now(),
    };
  }

  /**
   * 根据卦象符号获取卦象
   * GET /hexagram/symbol/:symbol
   */
  @Get('symbol/:symbol')
  @ApiOperation({ summary: '根据卦象符号获取卦象' })
  @ApiParam({ name: 'symbol', description: '卦象符号 (如 ䷀)', example: '䷀' })
  @ApiResponse({ status: 200, description: '成功返回卦象详情' })
  @ApiResponse({ status: 404, description: '卦象不存在' })
  async findBySymbol(@Param('symbol') symbol: string) {
    const hexagram = await this.hexagramService.findBySymbol(symbol);
    if (!hexagram) {
      throw new NotFoundException('卦象不存在');
    }
    return {
      success: true,
      data: hexagram,
      timestamp: Date.now(),
    };
  }

  /**
   * 搜索卦象（按卦名）
   * GET /hexagram/search
   */
  @Get('search')
  @ApiOperation({ summary: '根据卦名搜索卦象' })
  @ApiQuery({ name: 'name', description: '卦名或简称', example: '乾' })
  @ApiResponse({ status: 200, description: '成功返回搜索结果' })
  async searchByName(@Query('name') name: string) {
    const hexagrams = await this.hexagramService.searchByName(name);
    return {
      success: true,
      data: hexagrams,
      total: hexagrams.length,
      timestamp: Date.now(),
    };
  }

  /**
   * 获取基础解卦内容
   * GET /hexagram/:sequence/basic
   */
  @Get(':sequence/basic')
  @ApiOperation({ summary: '获取基础解卦内容（免费功能）' })
  @ApiParam({ name: 'sequence', description: '卦序 (1-64)', example: '1' })
  @ApiResponse({ status: 200, description: '成功返回基础解卦内容' })
  @ApiResponse({ status: 404, description: '卦象不存在' })
  async getBasicInterpretation(@Param('sequence') sequence: string) {
    const hexagram = await this.hexagramService.getBasicInterpretation(
      parseInt(sequence),
    );
    if (!hexagram) {
      throw new NotFoundException('卦象不存在');
    }

    // 返回基础解卦所需的内容
    return {
      success: true,
      data: {
        sequence: hexagram.sequence,
        symbol: hexagram.symbol,
        name: hexagram.name,
        pinyin: hexagram.pinyin,
        guaci: hexagram.guaci, // 卦辞
        yaoci: hexagram.yaoci, // 六爻爻辞
      },
      timestamp: Date.now(),
    };
  }

  /**
   * 获取相关卦象
   * GET /hexagram/:sequence/related
   */
  @Get(':sequence/related')
  @ApiOperation({ summary: '获取相关卦象（对卦、相关卦、所生卦）' })
  @ApiParam({ name: 'sequence', description: '卦序 (1-64)', example: '1' })
  @ApiResponse({ status: 200, description: '成功返回相关卦象' })
  async getRelatedHexagrams(@Param('sequence') sequence: string) {
    const related = await this.hexagramService.getRelatedHexagrams(
      parseInt(sequence),
    );
    return {
      success: true,
      data: related,
      timestamp: Date.now(),
    };
  }

  /**
   * 随机起卦
   * GET /hexagram/random
   */
  @Get('random')
  @ApiOperation({ summary: '随机获取一个卦象（一键起卦）' })
  @ApiResponse({ status: 200, description: '成功返回随机卦象' })
  async getRandomHexagram() {
    const hexagram = await this.hexagramService.getRandomHexagram();
    if (!hexagram) {
      throw new NotFoundException('卦象数据尚未初始化');
    }
    return {
      success: true,
      data: hexagram,
      timestamp: Date.now(),
    };
  }

  /**
   * 根据标签获取卦象
   * GET /hexagram/by-tags
   */
  @Get('by-tags')
  @ApiOperation({ summary: '根据标签获取卦象' })
  @ApiQuery({ name: 'tags', description: '标签（逗号分隔）', example: '吉卦,阳卦' })
  @ApiResponse({ status: 200, description: '成功返回卦象列表' })
  async findByTags(@Query('tags') tags: string) {
    const tagArray = tags.split(',').map((t) => t.trim());
    const hexagrams = await this.hexagramService.findByTags(tagArray);
    return {
      success: true,
      data: hexagrams,
      total: hexagrams.length,
      timestamp: Date.now(),
    };
  }

  /**
   * 根据五行获取卦象
   * GET /hexagram/by-element/:element
   */
  @Get('by-element/:element')
  @ApiOperation({ summary: '根据五行获取卦象' })
  @ApiParam({ name: 'element', description: '五行 (金、木、水、火、土)', example: '金' })
  @ApiResponse({ status: 200, description: '成功返回卦象列表' })
  async findByElement(@Param('element') element: string) {
    const hexagrams = await this.hexagramService.findByElement(element);
    return {
      success: true,
      data: hexagrams,
      total: hexagrams.length,
      timestamp: Date.now(),
    };
  }

  /**
   * 获取卦象统计信息
   * GET /hexagram/statistics
   */
  @Get('statistics')
  @ApiOperation({ summary: '获取卦象统计信息' })
  @ApiResponse({ status: 200, description: '成功返回统计信息' })
  async getStatistics() {
    const stats = await this.hexagramService.getStatistics();
    return {
      success: true,
      data: stats,
      timestamp: Date.now(),
    };
  }
}
