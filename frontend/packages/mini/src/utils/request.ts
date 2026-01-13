/**
 * 小程序网络请求工具
 */

const BASE_URL = 'http://localhost:3000/api' // 开发环境API地址

/**
 * 网络请求封装
 */
function request<T>(options: {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: any
  header?: any
}): Promise<T> {
  const { url, method = 'GET', data, header } = options

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        ...header,
      },
      success: (res: any) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T)
        } else {
          reject(new Error(res.data?.message || '请求失败'))
        }
      },
      fail: (err) => {
        reject(err)
      },
    })
  })
}

export default request
