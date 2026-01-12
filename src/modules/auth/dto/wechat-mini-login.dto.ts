import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

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
    example: {
      nickname: '微信用户',
      avatar: 'https://wx.qlogo.cn/...',
    },
  })
  userInfo?: {
    nickname?: string;
    avatar?: string;
    gender?: number;
  };
}
