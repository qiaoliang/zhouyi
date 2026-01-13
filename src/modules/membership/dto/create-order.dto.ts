import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { OrderType } from '../../../database/schemas/order.schema';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 创建订单DTO
 */
export class CreateOrderDto {
  @ApiProperty({
    description: '订单类型',
    enum: OrderType,
    example: OrderType.MEMBERSHIP_MONTHLY,
  })
  @IsEnum(OrderType)
  @IsNotEmpty()
  type: OrderType;

  @ApiPropertyOptional({
    description: '支付方式',
    example: 'wechat',
  })
  @IsString()
  @IsOptional()
  paymentMethod?: 'wechat' | 'alipay';
}

/**
 * 订单响应DTO
 */
export class OrderResponseDto {
  @ApiProperty({ description: '订单ID' })
  id: string;

  @ApiProperty({ description: '用户ID' })
  userId: string;

  @ApiProperty({
    description: '订单类型',
    enum: OrderType,
  })
  type: OrderType;

  @ApiProperty({ description: '订单金额', example: 30 })
  amount: number;

  @ApiProperty({ description: '订单状态', example: 'pending' })
  status: string;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiPropertyOptional({ description: '支付时间' })
  paidAt?: Date;

  @ApiPropertyOptional({ description: '过期时间' })
  expiresAt?: Date;

  @ApiPropertyOptional({ description: '支付方式' })
  paymentMethod?: string;

  @ApiPropertyOptional({ description: '交易ID' })
  transactionId?: string;
}

/**
 * 订单查询DTO
 */
export class QueryOrdersDto {
  @ApiPropertyOptional({
    description: '页码',
    example: 1,
    default: 1,
  })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({
    description: '每页数量',
    example: 20,
    default: 20,
  })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({
    description: '订单状态',
    example: 'paid',
  })
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    description: '订单类型',
    enum: OrderType,
  })
  @IsOptional()
  type?: OrderType;
}
