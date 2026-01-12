import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 发送验证码 DTO
 */
export class SendCodeDto {
  @ApiProperty({ example: '13800138000', description: '手机号' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phoneNumber: string;
}
