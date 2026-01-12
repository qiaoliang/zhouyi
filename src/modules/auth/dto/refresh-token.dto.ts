import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 刷新Token DTO
 */
export class RefreshTokenDto {
  @ApiProperty({ description: '刷新Token' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
