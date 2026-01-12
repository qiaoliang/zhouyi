import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * 微信APP登录DTO
 */
export class WechatAppLoginDto {
  @ApiProperty({
    description: '微信APP授权后获取的code',
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
      sex: 1,
      province: '广东',
      city: '深圳',
      country: '中国',
    },
  })
  userInfo?: {
    nickname?: string;
    avatar?: string;
    sex?: number;
    province?: string;
    city?: string;
    country?: string;
  };
}
