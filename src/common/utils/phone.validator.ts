/**
 * 手机号验证工具
 */

/**
 * 验证中国大陆手机号
 * @param phone 手机号
 * @returns 是否有效
 */
export function isValidChinesePhoneNumber(phone: string): boolean {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
}

/**
 * 脱敏手机号
 * @param phone 手机号
 * @returns 脱敏后的手机号 (如: 138****8000)
 */
export function maskPhone(phone: string): string {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}
