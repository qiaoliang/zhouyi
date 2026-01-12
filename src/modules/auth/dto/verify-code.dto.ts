import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 验证验证码 DTO
 */
export class VerifyCodeDto {
  @ApiProperty({ example: '13800138000', description: '手机号' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phoneNumber: string;

  @ApiProperty({ example: '123456', description: '验证码' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: '验证码必须是6位数字' })
  @Matches(/^\d{6}$/, { message: '验证码必须是6位数字' })
  code: string;
}
