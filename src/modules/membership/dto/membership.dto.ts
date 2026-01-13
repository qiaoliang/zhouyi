import { IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { MembershipType } from '../entities/subscription.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 会员权益响应DTO
 */
export class MembershipPrivilegesDto {
  @ApiProperty({ description: '每日起卦次数（-1表示无限）', example: -1 })
  dailyDivinations: number;

  @ApiProperty({ description: '是否可详细解卦', example: true })
  detailedInterpretation: boolean;

  @ApiProperty({ description: '是否可精准解卦', example: true })
  preciseInterpretation: boolean;

  @ApiProperty({ description: '是否可访问学习中心', example: true })
  learningAccess: boolean;

  @ApiProperty({ description: '是否无广告', example: true })
  adFree: boolean;
}

/**
 * 用户会员信息响应DTO
 */
export class UserMembershipResponseDto {
  @ApiProperty({ description: '是否拥有会员', example: true })
  hasMembership: boolean;

  @ApiProperty({
    description: '会员类型',
    enum: MembershipType,
    example: MembershipType.MONTHLY,
  })
  type: MembershipType;

  @ApiPropertyOptional({ description: '过期时间', example: '2024-02-13T12:00:00.000Z' })
  expireAt?: Date | null;

  @ApiPropertyOptional({ description: '剩余次数（按次购买）', example: 5 })
  remainingQuota?: number | null;

  @ApiProperty({ description: '会员权益', type: MembershipPrivilegesDto })
  privileges: MembershipPrivilegesDto;

  @ApiProperty({ description: '是否已过期', example: false })
  isExpired: boolean;

  @ApiPropertyOptional({ description: '距离过期天数', example: 25 })
  daysUntilExpiry?: number | null;

  @ApiProperty({ description: '是否自动续费', example: false })
  autoRenew: boolean;
}

/**
 * 会员套餐列表响应DTO
 */
export class MembershipPlanDto {
  @ApiProperty({
    description: '套餐类型',
    enum: MembershipType,
  })
  type: MembershipType;

  @ApiProperty({ description: '套餐名称', example: '月卡会员' })
  name: string;

  @ApiProperty({ description: '价格（元）', example: 30 })
  price: number;

  @ApiProperty({ description: '有效期描述', example: '30天' })
  duration: string;

  @ApiProperty({ description: '会员权益', type: MembershipPrivilegesDto })
  privileges: MembershipPrivilegesDto;

  @ApiProperty({ description: '是否推荐', example: false })
  recommended: boolean;
}

/**
 * 更新自动续费DTO
 */
export class UpdateAutoRenewDto {
  @ApiProperty({
    description: '是否自动续费',
    example: true,
  })
  @IsBoolean()
  autoRenew: boolean;
}

/**
 * 订阅历史响应DTO
 */
export class SubscriptionHistoryDto {
  @ApiProperty({ description: '订阅ID' })
  id: string;

  @ApiProperty({
    description: '会员类型',
    enum: MembershipType,
  })
  type: MembershipType;

  @ApiProperty({ description: '开始时间' })
  startDate: Date;

  @ApiProperty({ description: '过期时间' })
  expireAt: Date;

  @ApiProperty({ description: '是否激活' })
  isActive: boolean;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;
}
