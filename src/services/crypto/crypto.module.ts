import { Module, Global } from '@nestjs/common';
import { CryptoService } from './crypto.service';

/**
 * 加密服务模块
 * 提供敏感数据加密解密功能
 */
@Global()
@Module({
  providers: [CryptoService],
  exports: [CryptoService],
})
export class CryptoModule {}
