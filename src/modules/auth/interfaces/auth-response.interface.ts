/**
 * 用户信息响应接口
 */
export interface UserInfoResponse {
  id: string;
  phoneNumber: string;
  nickname: string;
  avatar: string;
  membership: {
    type: 'free' | 'monthly' | 'yearly';
    level: number;
    expireAt: Date | null;
    autoRenew: boolean;
  };
  isGuest: boolean;
}

/**
 * 认证响应接口
 */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserInfoResponse;
}
