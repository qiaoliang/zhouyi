import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * AI 解读请求 DTO
 */
export class RequestAIInterpretationDto {
  @ApiProperty({
    description: '用户的问题（可选，用于个性化解读）',
    required: false,
  })
  @IsOptional()
  @IsString()
  question?: string;
}

/**
 * AI 解读响应 DTO
 */
export class AIInterpretationResponseDto {
  @ApiProperty({ description: '记录ID' })
  @IsString()
  recordId: string;

  @ApiProperty({ description: 'AI 解读结果' })
  aiInterpretation: AIInterpretationContentDto;

  @ApiProperty({ description: '是否来自缓存' })
  @IsBoolean()
  cached: boolean;
}

/**
 * AI 解读内容 DTO
 */
export class AIInterpretationContentDto {
  @ApiProperty({ description: '核心解读摘要' })
  summary: string;

  @ApiProperty({ description: '详细分析' })
  detailedAnalysis: string;

  @ApiProperty({ description: '行动建议' })
  advice: string;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;
}
