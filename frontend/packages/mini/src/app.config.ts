/**
 * 小程序页面路由配置
 */

export default {
  pages: [
    'pages/divination/index',
    'pages/learning/index',
    'pages/daily/index',
    'pages/history/index',
    'pages/profile/index',
    'pages/login/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#C8102E',
    navigationBarTitleText: '周易通',
    navigationBarTextStyle: 'white',
    backgroundColor: '#F5F5DC',
  },
  tabBar: {
    color: '#999999',
    selectedColor: '#C8102E',
    backgroundColor: '#FFFFFF',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/divination/index',
        text: '卜卦',
        iconPath: 'assets/icons/divination.png',
        selectedIconPath: 'assets/icons/divination-active.png',
      },
      {
        pagePath: 'pages/learning/index',
        text: '学习',
        iconPath: 'assets/icons/learning.png',
        selectedIconPath: 'assets/icons/learning-active.png',
      },
      {
        pagePath: 'pages/daily/index',
        text: '每日',
        iconPath: 'assets/icons/daily.png',
        selectedIconPath: 'assets/icons/daily-active.png',
      },
      {
        pagePath: 'pages/history/index',
        text: '历史',
        iconPath: 'assets/icons/history.png',
        selectedIconPath: 'assets/icons/history-active.png',
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'assets/icons/profile.png',
        selectedIconPath: 'assets/icons/profile-active.png',
      },
    ],
  },
  permission: {
    'scope.userLocation': {
      desc: '您的位置信息将用于起卦参考'
    }
  }
}
