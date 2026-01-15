import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 设备信息DTO
 */
export class DeviceInfoDto {
  @ApiProperty({ description: '平台类型（如：weapp、web、rn等）', required: false })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiProperty({ description: '设备型号（可选）', required: false })
  @IsOptional()
  @IsString()
  model?: string;
}

/**
 * 起卦请求DTO
 */
export class DivinateDto {
  @ApiProperty({
    description: '设备信息（可选）',
    required: false,
    type: DeviceInfoDto,
    example: {
      platform: 'weapp',
      model: 'iPhone 14',
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceInfoDto)
  device?: DeviceInfoDto;
}