import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 微信用户信息DTO
 */
export class WechatUserInfoDto {
  @ApiProperty({ description: '昵称', required: false })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiProperty({ description: '头像URL', required: false })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiProperty({ description: '性别', required: false })
  @IsOptional()
  @IsNumber()
  gender?: number;
}

/**
 * 微信小程序登录DTO
 */
export class WechatMiniLoginDto {
  @ApiProperty({
    description: '微信小程序wx.login返回的code',
    example: '071Abc2def3GHI4jklm5no6pqr7stu8',
  })
  @IsNotEmpty({ message: 'code不能为空' })
  @IsString()
  code: string;

  @ApiProperty({
    description: '用户信息（可选）',
    required: false,
    type: WechatUserInfoDto,
    example: {
      nickname: '微信用户',
      avatar: 'https://wx.qlogo.cn/...',
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => WechatUserInfoDto)
  userInfo?: WechatUserInfoDto;
}
