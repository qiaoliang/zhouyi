import { Injectable, Logger } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

/**
 * 加密服务
 * 提供敏感数据加密解密功能
 */
@Injectable()
export class CryptoService {
  private readonly logger = new Logger(CryptoService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly saltLength = 32;
  private readonly authTagLength = 16;

  /**
   * 从环境变量获取或生成密钥
   */
  private getEncryptionKey(): Buffer {
    const secretKey = process.env.ENCRYPTION_KEY;

    if (!secretKey) {
      this.logger.warn('未设置ENCRYPTION_KEY环境变量，使用临时密钥（不适用于生产环境）');
      return randomBytes(this.keyLength);
    }

    // 使用scrypt从密钥派生固定长度的key
    const salt = Buffer.from(secretKey.substring(0, this.saltLength), 'utf8').slice(0, this.saltLength);
    return scryptSync(secretKey, salt, this.keyLength);
  }

  /**
   * 加密文本
   * @param plaintext 明文
   * @returns 加密后的文本（Base64编码）
   */
  encrypt(plaintext: string): string {
    try {
      const key = this.getEncryptionKey();
      const iv = randomBytes(this.ivLength);

      const cipher = createCipheriv(this.algorithm, key, iv);

      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      // 组合: iv + authTag + encrypted
      const combined = Buffer.concat([
        iv,
        authTag,
        Buffer.from(encrypted, 'hex'),
      ]);

      return combined.toString('base64');
    } catch (error) {
      this.logger.error('加密失败：', error.message);
      throw new Error('数据加密失败');
    }
  }

  /**
   * 解密文本
   * @param ciphertext 密文（Base64编码）
   * @returns 解密后的明文
   */
  decrypt(ciphertext: string): string {
    try {
      const key = this.getEncryptionKey();
      const combined = Buffer.from(ciphertext, 'base64');

      // 提取iv、authTag和encrypted
      const iv = combined.slice(0, this.ivLength);
      const authTag = combined.slice(this.ivLength, this.ivLength + this.authTagLength);
      const encrypted = combined.slice(this.ivLength + this.authTagLength);

      const decipher = createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error('解密失败：', error.message);
      throw new Error('数据解密失败');
    }
  }

  /**
   * 加密手机号（保留前3后4位明文，中间加密）
   * @param phoneNumber 手机号
   * @returns 部分加密的手机号
   */
  encryptPhoneNumber(phoneNumber: string): string {
    if (!phoneNumber || phoneNumber.length < 11) {
      throw new Error('无效的手机号格式');
    }

    const prefix = phoneNumber.substring(0, 3);
    const suffix = phoneNumber.substring(7);
    const middle = phoneNumber.substring(3, 7);

    const encryptedMiddle = this.encrypt(middle);

    return `${prefix}${encryptedMiddle}${suffix}`;
  }

  /**
   * 解密手机号
   * @param encryptedPhoneNumber 加密的手机号
   * @returns 明文手机号
   */
  decryptPhoneNumber(encryptedPhoneNumber: string): string {
    if (!encryptedPhoneNumber || encryptedPhoneNumber.length < 8) {
      throw new Error('无效的加密手机号格式');
    }

    const prefix = encryptedPhoneNumber.substring(0, 3);
    const suffix = encryptedPhoneNumber.substring(encryptedPhoneNumber.length - 4);
    const encryptedMiddle = encryptedPhoneNumber.substring(3, encryptedPhoneNumber.length - 4);

    const middle = this.decrypt(encryptedMiddle);

    return `${prefix}${middle}${suffix}`;
  }

  /**
   * 生成哈希（用于不可逆加密，如密码）
   * @param data 数据
   * @param salt 盐值（可选）
   * @returns 哈希值
   */
  hash(data: string, salt?: string): string {
    const crypto = require('crypto');
    const actualSalt = salt || randomBytes(16).toString('hex');
    const hash = crypto
      .createHmac('sha256', actualSalt)
      .update(data)
      .digest('hex');

    return `${actualSalt}:${hash}`;
  }

  /**
   * 验证哈希
   * @param data 原始数据
   * @param hashed 哈希值
   * @returns 是否匹配
   */
  verifyHash(data: string, hashed: string): boolean {
    const [salt, hash] = hashed.split(':');
    const newHash = this.hash(data, salt);
    return newHash === hashed;
  }
}
