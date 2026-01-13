# API 配置使用指南

## 环境配置

### 环境配置文件位置
`src/config/env.ts`

### 配置说明

```typescript
// 开发环境
{
  apiBaseUrl: 'http://localhost:3000/api',
  timeout: 15000,
  debug: true,
}

// 生产环境
{
  apiBaseUrl: 'https://api.yourdomain.com/api',  // 需要替换为实际域名
  timeout: 10000,
  debug: false,
}
```

### 修改生产环境 API 地址

在 `src/config/env.ts` 中修改生产环境的 `apiBaseUrl`：

```typescript
const production: EnvConfig = {
  apiBaseUrl: 'https://your-actual-domain.com/api',  // 替换这里
  timeout: 10000,
  debug: false,
  enableMock: false,
}
```

## 使用示例

### 1. 基本请求

```typescript
import request from '@/utils/request'

// GET 请求
const getData = () => {
  return request<UserInfo>({
    url: '/user/profile',
    method: 'GET',
  })
}

// POST 请求
const postData = (data: any) => {
  return request({
    url: '/user/create',
    method: 'POST',
    data,
    showLoading: true,
  })
}
```

### 2. 带加载提示的请求

```typescript
request({
  url: '/api/slow',
  method: 'GET',
  showLoading: true,
  loadingText: '加载中...',
})
```

### 3. 需要认证的请求

```typescript
import { setToken } from '@/utils/request'

// 先登录设置 Token
const login = async () => {
  const result = await request<LoginResult>({
    url: '/user/login',
    method: 'POST',
    data: { email, password },
  })

  setToken(result.token)
}

// 后续请求会自动携带 Token
request({
  url: '/user/profile',
  method: 'GET',
  needAuth: true,  // 默认为 true
})
```

### 4. 错误处理

```typescript
try {
  const data = await request({
    url: '/api/data',
    method: 'GET',
  })
} catch (error) {
  // 错误会自动显示 Toast 提示
  // 可以在这里进行额外的错误处理
  console.error('请求失败', error)
}
```

### 5. 不显示错误提示

```typescript
request({
  url: '/api/data',
  method: 'GET',
  showError: false,  // 不显示默认错误提示
})
```

## Token 管理

```typescript
import { setToken, removeToken, getToken } from '@/utils/request'

// 设置 Token（登录成功后）
setToken('your-jwt-token')

// 获取 Token
const token = getToken()

// 移除 Token（登出时）
removeToken()
```

## 创建新的 API 服务

### 步骤 1: 创建类型定义

在 `src/services/api/` 目录下创建新文件，例如 `article.ts`：

```typescript
// src/services/api/article.ts
import request from '@/utils/request'
import type { PageParams, PageData } from '@/types/request'

// 定义数据类型
export interface Article {
  id: string
  title: string
  content: string
  author: string
  createdAt: string
}

// 定义请求参数
export interface CreateArticleParams {
  title: string
  content: string
}

// 定义 API 方法
export const getArticleList = (params: PageParams) => {
  return request<PageData<Article>>({
    url: '/articles',
    method: 'GET',
    data: params,
  })
}

export const getArticleDetail = (id: string) => {
  return request<Article>({
    url: `/articles/${id}`,
    method: 'GET',
  })
}

export const createArticle = (data: CreateArticleParams) => {
  return request<Article>({
    url: '/articles',
    method: 'POST',
    data,
    needAuth: true,
    showLoading: true,
  })
}
```

### 步骤 2: 导出 API

在 `src/services/api/index.ts` 中添加导出：

```typescript
export * from './article'
```

### 步骤 3: 使用 API

```typescript
import { getArticleList, createArticle } from '@/services/api'

// 获取文章列表
const articles = await getArticleList({ page: 1, pageSize: 10 })

// 创建文章
await createArticle({
  title: '标题',
  content: '内容',
})
```

## 环境切换

### 开发环境构建

```bash
pnpm run build:weapp
```

### 生产环境构建

```bash
NODE_ENV=production pnpm run build:weapp
```

Taro 会自动根据 `NODE_ENV` 选择对应的配置。

## 微信小程序域名配置

### 开发阶段
在 `project.config.json` 中保持：
```json
{
  "setting": {
    "urlCheck": false  // 关闭域名校验
  }
}
```

### 生产环境

1. 登录 [微信公众平台](https://mp.weixin.qq.com)
2. 进入 **开发 > 开发管理 > 开发设置 > 服务器域名**
3. 在 **request 合法域名** 中添加：
   - `https://api.yourdomain.com`（替换为实际域名）
4. 将 `urlCheck` 改为 `true`

## 调试

### 开发环境

在开发环境下，所有请求都会在控制台输出详细日志：

```
【请求拦截器】 { url: '/user/profile', method: 'GET', ... }
【响应拦截器】 { statusCode: 200, data: {...} }
【请求错误】 { error: '...', code: 401 }
```

### 查看环境

```typescript
import { isDev, isProd, ENV } from '@/config/env'

console.log(isDev)     // 开发环境为 true
console.log(isProd)    // 生产环境为 true
console.log(ENV)       // 'development' 或 'production'
```

## 常见问题

### 1. 401 错误

Token 过期或无效，会自动跳转到登录页。

### 2. 网络错误

检查：
- 后端服务是否启动
- API 地址是否正确
- 手机/电脑是否联网
- 域名是否已配置（生产环境）

### 3. 类型错误

确保：
- 后端返回的数据结构与类型定义一致
- 正确使用泛型指定返回类型：`request<UserInfo>({...})`
