# 微信登录 API 文档

## 概述

本文档描述了周易通APP后端的微信登录接口，供前端（APP和小程序）开发人员集成使用。

**基础URL**: `http://localhost:3000/api/v1`

**认证方式**: 微信登录为公开接口，无需预先认证

---

## 1. 微信小程序登录

### 1.1 接口信息

**端点**: `POST /auth/wechat/mini-login`

**描述**: 通过微信小程序code换取用户信息并完成登录

**权限**: 公开接口（无需JWT token）

### 1.2 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| code | string | 是 | 微信小程序 wx.login() 返回的 code |
| userInfo | object | 否 | 用户信息（可选） |

#### userInfo 对象结构（可选）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| nickname | string | 否 | 用户昵称 |
| avatar | string | 否 | 用户头像URL |
| gender | number | 否 | 用户性别（0=未知，1=男，2=女） |

### 1.3 请求示例

```bash
curl -X POST http://localhost:3000/api/v1/auth/wechat/mini-login \
  -H "Content-Type: application/json" \
  -d '{
    "code": "071Abc2def3GHI4jklm5no6pqr7stu8",
    "userInfo": {
      "nickname": "微信用户",
      "avatar": "https://wx.qlogo.cn/...",
      "gender": 1
    }
  }'
```

### 1.4 响应格式

#### 成功响应 (201 Created)

```json
{
  "success": true,
  "message": "微信登录成功",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900,
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "phoneNumber": "",
      "nickname": "微信用户",
      "avatar": "https://wx.qlogo.cn/...",
      "isGuest": false,
      "membership": {
        "type": "free",
        "level": 0,
        "expireAt": null,
        "autoRenew": false
      }
    }
  },
  "timestamp": 1705100000000
}
```

#### 错误响应

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "微信登录失败: invalid code"
  },
  "timestamp": 1705100000000
}
```

### 1.5 前端集成示例

#### 微信小程序端

```javascript
// 微信小程序登录示例
async function wechatLogin() {
  try {
    // 1. 获取微信登录code
    const { code } = await wx.login();

    // 2. 获取用户信息（可选）
    const userInfo = await getUserInfo();

    // 3. 调用后端登录接口
    const response = await wx.request({
      url: 'https://your-api.com/api/v1/auth/wechat/mini-login',
      method: 'POST',
      data: {
        code: code,
        userInfo: userInfo
      }
    });

    // 4. 保存token
    if (response.data.success) {
      const { accessToken, refreshToken } = response.data.data;
      wx.setStorageSync('accessToken', accessToken);
      wx.setStorageSync('refreshToken', refreshToken);

      // 5. 跳转到主页
      wx.switchTab({ url: '/pages/index/index' });
    } else {
      wx.showToast({ title: '登录失败', icon: 'none' });
    }
  } catch (error) {
    wx.showToast({ title: '登录失败', icon: 'none' });
  }
}

// 获取用户信息
async function getUserInfo() {
  return new Promise((resolve) => {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        resolve({
          nickname: res.userInfo.nickName,
          avatar: res.userInfo.avatarUrl,
          gender: res.userInfo.gender
        });
      },
      fail: () => resolve(null)
    });
  });
}
```

---

## 2. 微信APP登录

### 2.1 接口信息

**端点**: `POST /auth/wechat/app-login`

**描述**: 通过微信APP授权code获取用户信息并完成登录

**权限**: 公开接口（无需JWT token）

### 2.2 请求参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| code | string | 是 | 微信APP授权后获取的code |
| userInfo | object | 否 | 用户信息（可选） |

#### userInfo 对象结构（可选）

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| nickname | string | 否 | 用户昵称 |
| avatar | string | 否 | 用户头像URL |
| sex | number | 否 | 用户性别 |
| province | string | 否 | 省份 |
| city | string | 否 | 城市 |
| country | string | 否 | 国家 |

### 2.3 请求示例

```bash
curl -X POST http://localhost:3000/api/v1/auth/wechat/app-login \
  -H "Content-Type: application/json" \
  -d '{
    "code": "wechat-app-auth-code",
    "userInfo": {
      "nickname": "微信用户",
      "avatar": "https://wx.qlogo.cn/..."
    }
  }'
```

### 2.4 响应格式

#### 成功响应 (201 Created)

```json
{
  "success": true,
  "message": "微信登录成功",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900,
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "phoneNumber": "",
      "nickname": "微信用户",
      "avatar": "https://wx.qlogo.cn/...",
      "isGuest": false,
      "membership": {
        "type": "free",
        "level": 0,
        "expireAt": null,
        "autoRenew": false
      }
    }
  },
  "timestamp": 1705100000000
}
```

### 2.5 前端集成示例

#### React Native (iOS/Android)

```javascript
import { AccessToken, LoginManager } from 'react-native-fbsdk';
import { Wechat } from 'react-native-wechat-lib';

// 微信APP登录示例
async function wechatAppLogin() {
  try {
    // 1. 发起微信授权
    const isInstalled = await Wechat.isWXAppInstalled();
    if (!isInstalled) {
      Alert.alert('提示', '请先安装微信');
      return;
    }

    // 2. 获取授权code
    const scope = 'snsapi_userinfo';
    const state = 'app_login_' + Date.now();

    Wechat.sendAuthRequest(scope, state, (code, err) => {
      if (err) {
        console.error('微信授权失败', err);
        Alert.alert('授权失败', err.errStr);
        return;
      }

      // 3. 调用后端登录接口
      loginWithCode(code);
    });
  } catch (error) {
    console.error('登录失败', error);
    Alert.alert('登录失败', error.message);
  }
}

// 使用code登录
async function loginWithCode(code) {
  try {
    const response = await fetch('https://your-api.com/api/v1/auth/wechat/app-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    const result = await response.json();

    if (result.success) {
      // 保存token
      const { accessToken, refreshToken } = result.data;
      await AsyncStorage.setItem('accessToken', accessToken);
      await AsyncStorage.setItem('refreshToken', refreshToken);

      // 跳转到主页
      navigation.replace('MainTab');
    } else {
      Alert.alert('登录失败', result.error.message);
    }
  } catch (error) {
    console.error('登录请求失败', error);
    Alert.alert('登录失败', error.message);
  }
}
```

---

## 3. Token使用

### 3.1 访问令牌（Access Token）

登录成功后，后端返回 `accessToken`，用于后续API请求的认证。

**使用方式**：在请求头中添加 Authorization

```javascript
fetch('https://your-api.com/api/v1/user/profile', {
  headers: {
    'Authorization': 'Bearer ' + accessToken
  }
});
```

### 3.2 刷新令牌（Refresh Token）

当 `accessToken` 过期时，使用 `refreshToken` 获取新的访问令牌。

**端点**: `POST /auth/refresh`

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

### 3.3 Token有效期

- **Access Token**: 15分钟（900秒）
- **Refresh Token**: 7天

---

## 4. 错误处理

### 4.1 常见错误码

| HTTP状态码 | 错误类型 | 说明 |
|-----------|---------|------|
| 400 | BAD_REQUEST | 请求参数错误（如code格式不正确） |
| 401 | UNAUTHORIZED | 微信登录失败（如code无效、已过期） |
| 500 | INTERNAL_SERVER_ERROR | 服务器内部错误 |

### 4.2 错误处理示例

```javascript
// 小程序端错误处理
async function wechatLogin() {
  try {
    const { code } = await wx.login();

    const response = await wx.request({
      url: 'https://your-api.com/api/v1/auth/wechat/mini-login',
      method: 'POST',
      data: { code }
    });

    if (response.statusCode === 201) {
      // 登录成功
      handleLoginSuccess(response.data.data);
    } else if (response.statusCode === 401) {
      // 微信授权失败
      wx.showModal({
        title: '授权失败',
        content: response.data.error.message,
        showCancel: false
      });
    } else {
      // 其他错误
      wx.showToast({ title: '登录失败，请重试', icon: 'none' });
    }
  } catch (error) {
    wx.showToast({ title: '网络错误', icon: 'none' });
  }
}
```

---

## 5. 测试

### 5.1 本地测试

后端服务默认运行在 `http://localhost:3000`

### 5.2 测试账号

使用微信开发者工具或真机调试进行测试。

---

## 6. 配置说明

### 6.1 后端环境变量

确保后端项目配置了以下微信相关环境变量：

```env
# 微信小程序配置
WECHAT_MINI_PROGRAM_APPID=your_mini_appid
WECHAT_MINI_PROGRAM_APPSECRET=your_mini_secret

# 微信开放平台APP配置
WECHAT_APP_APPID=your_app_appid
WECHAT_APP_APPSECRET=your_app_secret
```

### 6.2 前端配置

#### 小程序端（project.config.json）

```json
{
  "appid": "your_mini_appid"
}
```

#### APP端

需要在微信开放平台注册应用并获取 AppID。

---

## 7. 注意事项

1. **Code有效期**: 微信code有效期为5分钟，请及时使用
2. **Code重用**: 每个code只能使用一次，重复使用会报错
3. **用户授权**: APP端需要用户主动授权才能获取用户信息
4. **网络环境**: 确保客户端能访问微信API服务器
5. **HTTPS**: 生产环境必须使用HTTPS

---

## 8. 支持与反馈

如有问题，请联系后端开发团队或提交Issue。
