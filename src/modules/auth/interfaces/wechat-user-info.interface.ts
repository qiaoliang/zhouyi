/**
 * 微信登录用户信息接口
 */
export interface WechatLoginInfo {
  /**
   * openid（小程序）或 unionid（APP，如果应用已绑定到开放平台）
   */
  openid: string;

  /**
   * unionid（如果应用已绑定到微信开放平台）
   */
  unionid?: string;

  /**
   * 用户昵称
   */
  nickname?: string;

  /**
   * 用户头像
   */
  avatar?: string;

  /**
   * 性别：0-未知，1-男，2-女
   */
  gender?: number;

  /**
   * 省份
   */
  province?: string;

  /**
   * 城市
   */
  city?: string;

  /**
   * 国家
   */
  country?: string;

  /**
   * 登录类型：mini-program | app
   */
  loginType: 'mini-program' | 'app';
}
