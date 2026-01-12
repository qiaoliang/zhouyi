/**
 * 微信配置
 */
export const wechatConfig = {
  // 微信开放平台APP配置
  app: {
    appId: process.env.WECHAT_APP_APPID || '',
    appSecret: process.env.WECHAT_APP_APPSECRET || '',
  },

  // 微信小程序配置
  miniProgram: {
    appId: process.env.WECHAT_MINI_PROGRAM_APPID || '',
    appSecret: process.env.WECHAT_MINI_PROGRAM_APPSECRET || '',
  },

  // 微信API端点
  api: {
    // APP端获取access_token
    appAccessToken: 'https://api.weixin.qq.com/cgi-bin/token',
    // APP端获取用户信息
    appUserInfo: 'https://api.weixin.qq.com/sns/userinfo',
    // 小程序登录凭证校验
    jscode2session: 'https://api.weixin.qq.com/sns/jscode2session',
  },

  // Token缓存前缀
  cachePrefix: {
    accessToken: 'wechat:access_token:',
    sessionKey: 'wechat:session_key:',
  },
};
