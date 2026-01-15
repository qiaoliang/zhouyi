import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn } from 'class-validator';

export class DeviceInfoDto {
  @ApiProperty({ description: '平台类型', enum: ['ios', 'android', 'web', 'mini'] })
  @IsString()
  @IsIn(['ios', 'android', 'web', 'mini'])
  platform: string;

  @ApiProperty({ description: '设备唯一标识' })
  @IsString()
  deviceId: string;

  @ApiProperty({ description: '应用版本', required: false })
  @IsOptional()
  @IsString()
  appVersion?: string;
}

export class GuestDivinateDto {
  @ApiProperty({ description: '设备信息', type: DeviceInfoDto })
  device: DeviceInfoDto;
}