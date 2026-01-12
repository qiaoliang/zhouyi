/**
 * JWT Payload 接口
 */
export interface JwtPayload {
  sub: string;      // 用户ID
  type: string;     // token 类型: access | refresh
  iat?: number;     // 签发时间
  exp?: number;     // 过期时间
}
