import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { maskPhone } from '../../common/utils/phone.validator';

/**
 * 模拟短信服务
 * 开发环境使用，验证码输出到控制台
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private configService: ConfigService) {}

  /**
   * 发送验证码
   * 模拟模式：将验证码输出到控制台
   */
  async sendVerificationCode(phoneNumber: string, code: string): Promise<void> {
    const mode = this.configService.get('SMS_MODE', 'mock');

    if (mode === 'mock') {
      // 模拟模式：输出到控制台
      this.logger.log(`
┌─────────────────────────────────────────┐
│                                         │
│   📱 模拟短信发送                        │
│                                         │
│   手机号: ${maskPhone(phoneNumber)}
│   验证码: ${code}
│   有效期: 5分钟                          │
│                                         │
└─────────────────────────────────────────┘
      `);
      return;
    }

    // TODO: 后续集成真实短信服务
    throw new Error(`短信服务模式 ${mode} 尚未实现`);
  }

  /**
   * 验证手机号格式
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phoneNumber);
  }
}
