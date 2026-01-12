import { Module } from '@nestjs/common';
import { SmsService } from './sms.service';

/**
 * 短信服务模块
 */
@Module({
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}
