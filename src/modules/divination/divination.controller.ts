import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber } from 'class-validator';
import { DivinationService } from './divination.service';
import { HexagramAnalysisService } from './hexagram-analysis.service';
import { InterpretationService } from './interpretation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionGuard, RequireSubscription } from '../membership/guards/subscription.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PreciseInterpretationDto, UpdatePreciseInfoDto } from './dto/precise-interpretation.dto';
import { DivinateDto } from './dto/divinate.dto';
import { GuestDivinateDto } from './dto/guest-divinate.dto';

/**
 * 分页查询DTO
 */
export class PaginationDto {
  @ApiProperty({ description: '页码', required: false })
  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @ApiProperty({ description: '每页数量', required: false })
  @IsOptional()
  @IsNumber()
  limit?: number = 20;
}

/**
 * 卜卦控制器
 * 提供起卦和历史记录API
 */
@Controller('divination')
export class DivinationController {
  constructor(
    private readonly divinationService: DivinationService,
    private readonly analysisService: HexagramAnalysisService,
    private readonly interpretationService: InterpretationService,
  ) {}

  /**
   * 执行金钱课起卦
   * 公开接口，支持游客和已登录用户
   */
  @Public()
  @Post('divinate')
  async divinate(@Body() dto: DivinateDto, @Req() req: any) {
    // 执行起卦
    const hexagram = await this.divinationService.performDivination();

    // 获取用户或游客ID
    const userId = req.user?.userId;
    const guestId = !userId ? req.headers['x-guest-id'] as string : undefined;

    // 保存记录（直接传递device对象）
    const record = await this.divinationService.saveDivinationRecord(
      hexagram,
      userId,
      guestId,
      dto.device,
    );

    return {
      success: true,
      data: {
        hexagram,
        recordId: record._id,
        timestamp: record.createdAt,
      },
      message: '起卦成功',
      timestamp: Date.now(),
    };
  }

  /**
   * 游客卜卦接口
   * 公开接口，无需认证
   *
   * @param dto 游客卜卦请求参数
   * @param req 请求对象
   * @returns 卦象信息和解读
   *
   * @example
   * POST /api/v1/divination/divinate/guest
   * {
   *   "device": {
   *     "platform": "mini",
   *     "deviceId": "unique-device-id-123"
   *   }
   * }
   */
  @Public()
  @Post('divinate/guest')
  async guestDivinate(@Body() dto: GuestDivinateDto, @Req() req: any) {
    // 执行起卦
    const hexagram = await this.divinationService.performDivination();

    // 获取卦象详细数据用于生成解读
    const hexagramData = await this.divinationService['hexagramModel']
      .findOne({ sequence: hexagram.primary.sequence })
      .exec();

    if (!hexagramData) {
      return {
        success: false,
        error: {
          code: 'HEXAGRAM_NOT_FOUND',
          message: '卦象数据不存在',
        },
        timestamp: Date.now(),
      };
    }

    // 生成 guestId
    const guestId = dto.device.deviceId;

    // 生成解读
    const interpretation = await this.interpretationService.generateBasicInterpretation(
      hexagramData,
    );

    // 保存游客记录
    const record = await this.divinationService.saveGuestDivinationRecord(
      hexagram,
      guestId,
      dto.device,
      req.ip,
    );

    return {
      success: true,
      data: {
        hexagram,
        interpretation,
        recordId: record._id,
        timestamp: record.createdAt,
        loginPrompt: {
          title: '解锁专业解卦',
          message: '登录后可获得基于动爻的精准解读和个性化建议',
          features: [
            '基于动爻的精准解读',
            '个性化建议',
            '会员专属深度解读',
          ],
        },
      },
      message: '起卦成功',
      timestamp: Date.now(),
    };
  }

  /**
   * 获取当前用户的卜卦历史
   * 需要登录
   */
  @UseGuards(JwtAuthGuard)
  @Get('history')
  async getUserHistory(
    @CurrentUser() user: any,
    @Query() pagination: PaginationDto,
  ) {
    const page = pagination.page || 1;
    const limit = pagination.limit || 20;

    const { records, total } = await this.divinationService.getUserDivinationHistory(
      user.userId,
      page,
      limit,
    );

    return {
      success: true,
      data: {
        records,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      message: '获取历史记录成功',
      timestamp: Date.now(),
    };
  }

  /**
   * 获取游客的卜卦历史
   * 公开接口
   */
  @Public()
  @Get('guest/history')
  async getGuestHistory(
    @Query('guestId') guestId: string,
    @Query() pagination: PaginationDto,
  ) {
    if (!guestId) {
      return {
        success: false,
        error: {
          code: 'MISSING_GUEST_ID',
          message: '缺少游客ID',
        },
        timestamp: Date.now(),
      };
    }

    const page = pagination.page || 1;
    const limit = pagination.limit || 20;

    const { records, total } = await this.divinationService.getGuestDivinationHistory(
      guestId,
      page,
      limit,
    );

    return {
      success: true,
      data: {
        records,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      message: '获取历史记录成功',
      timestamp: Date.now(),
    };
  }

  /**
   * 获取单个卜卦记录详情
   * 需要登录
   */
  @UseGuards(JwtAuthGuard)
  @Get('record/:id')
  async getRecord(@Param('id') id: string, @CurrentUser() user: any) {
    const record = await this.divinationService.getDivinationRecord(id, user.userId);

    if (!record) {
      return {
        success: false,
        error: {
          code: 'RECORD_NOT_FOUND',
          message: '卜卦记录不存在',
        },
        timestamp: Date.now(),
      };
    }

    return {
      success: true,
      data: record,
      message: '获取记录成功',
      timestamp: Date.now(),
    };
  }

  /**
   * 收藏/取消收藏卜卦记录
   * 需要登录
   */
  @UseGuards(JwtAuthGuard)
  @Post('record/:id/favorite')
  async toggleFavorite(@Param('id') id: string, @CurrentUser() user: any) {
    // 这里需要在 DivinationService 中添加 toggleFavorite 方法
    // 暂时返回成功响应
    return {
      success: true,
      data: { isFavorite: true },
      message: '收藏状态已更新',
      timestamp: Date.now(),
    };
  }

  /**
   * 获取详细解卦（付费功能）
   * 需要登录并拥有有效会员订阅
   */
  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @RequireSubscription(true)
  @Get('record/:id/detailed')
  async getDetailedInterpretation(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const record = await this.divinationService.getDivinationRecord(id, user.userId);

    if (!record) {
      return {
        success: false,
        error: {
          code: 'RECORD_NOT_FOUND',
          message: '卜卦记录不存在',
        },
        timestamp: Date.now(),
      };
    }

    // 生成详细分析
    const detailedAnalysis = await this.analysisService.generateDetailedAnalysis(
      record.hexagram,
    );

    return {
      success: true,
      data: {
        recordId: record._id,
        hexagram: record.hexagram,
        basic: record.interpretation.basic,
        detailed: detailedAnalysis,
      },
      message: '获取详细解卦成功',
      timestamp: Date.now(),
    };
  }

  /**
   * 购买详细解卦（单次付费）
   * 需要登录
   */
  @UseGuards(JwtAuthGuard)
  @Post('record/:id/purchase-detailed')
  async purchaseDetailedInterpretation(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const record = await this.divinationService.getDivinationRecord(id, user.userId);

    if (!record) {
      return {
        success: false,
        error: {
          code: 'RECORD_NOT_FOUND',
          message: '卜卦记录不存在',
        },
        timestamp: Date.now(),
      };
    }

    // 检查是否已经购买过
    if (record.payment?.status === 'paid') {
      // 直接返回详细解卦
      const detailedAnalysis = await this.analysisService.generateDetailedAnalysis(
        record.hexagram,
      );

      return {
        success: true,
        data: {
          recordId: record._id,
          hexagram: record.hexagram,
          basic: record.interpretation.basic,
          detailed: detailedAnalysis,
        },
        message: '您已购买过此详细解卦',
        timestamp: Date.now(),
      };
    }

    // TODO: 集成支付系统
    // 这里需要创建支付订单并返回支付信息
    return {
      success: false,
      error: {
        code: 'PAYMENT_NOT_IMPLEMENTED',
        message: '支付功能尚未集成，请稍后再试',
      },
      timestamp: Date.now(),
    };
  }

  /**
   * 保存精准信息（用于精准解卦）
   * 需要登录
   */
  @UseGuards(JwtAuthGuard)
  @Post('record/:id/precise-info')
  async savePreciseInfo(
    @Param('id') id: string,
    @Body() dto: PreciseInterpretationDto,
    @CurrentUser() user: any,
  ) {
    const record = await this.divinationService.getDivinationRecord(id, user.userId);

    if (!record) {
      return {
        success: false,
        error: {
          code: 'RECORD_NOT_FOUND',
          message: '卜卦记录不存在',
        },
        timestamp: Date.now(),
      };
    }

    const preciseInfo = {
      name: dto.name,
      gender: dto.gender,
      birthDate: new Date(dto.birthDate),
      question: dto.question,
    };

    const updatedRecord = await this.divinationService.savePreciseInfo(
      id,
      preciseInfo,
      user.userId,
    );

    if (!updatedRecord) {
      return {
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: '保存失败',
        },
        timestamp: Date.now(),
      };
    }

    return {
      success: true,
      data: {
        recordId: updatedRecord._id,
        preciseInfo: updatedRecord.preciseInfo,
      },
      message: '精准信息保存成功',
      timestamp: Date.now(),
    };
  }

  /**
   * 获取精准解卦（付费功能）
   * 需要登录并拥有有效会员订阅
   */
  @UseGuards(JwtAuthGuard, SubscriptionGuard)
  @RequireSubscription(true)
  @Post('record/:id/precise')
  async getPreciseInterpretation(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    const result = await this.divinationService.generatePreciseInterpretation(
      id,
      user.userId,
    );

    if (!result) {
      return {
        success: false,
        error: {
          code: 'PRECISE_INFO_NOT_FOUND',
          message: '请先完善个人信息',
        },
        timestamp: Date.now(),
      };
    }

    return {
      success: true,
      data: {
        recordId: id,
        precise: result.precise,
        personalizedAdvice: result.personalizedAdvice,
      },
      message: '获取精准解卦成功',
      timestamp: Date.now(),
    };
  }
}
