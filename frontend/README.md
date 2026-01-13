# 周易通前端

周易通APP的前端项目，使用React Native开发的跨平台移动应用。

## 项目结构

```
frontend/
├── packages/
│   ├── app/           # React Native APP
│   ├── web/           # Web应用 (Next.js)
│   ├── mini-program/  # 微信小程序
│   └── shared/        # 共享代码
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## 技术栈

### React Native APP
- **React Native** - 跨平台移动应用框架
- **TypeScript** - 类型安全的JavaScript
- **React Navigation** - 导航管理
- **AsyncStorage** - 本地数据持久化
- **vector-icons** - 图标库

### 共享包 (Shared)
- **API Client** - 统一的API请求封装
- **类型定义** - TypeScript类型定义
- **主题配置** - 中国风设计主题
- **服务层** - 认证、卜卦、学习等服务

### Web应用
- **Next.js** - React框架
- **React Navigation Web** - Web导航

### 小程序
- **Taro** - 微信小程序框架

## 开发环境设置

### 前置要求

- Node.js >= 18
- pnpm >= 8
- React Native CLI

### 安装依赖

```bash
# 在项目根目录安装所有依赖
pnpm install

# 或者在各包目录单独安装
cd packages/app
pnpm install
```

### 开发命令

```bash
# APP开发 (需要在app目录)
cd packages/app
pnpm ios          # 启动iOS模拟器
pnpm android      # 启动Android模拟器
pnpm start        # 启动Metro bundler

# Web开发
cd packages/web
pnpm dev          # 启动开发服务器

# 小程序开发
cd packages/mini-program
pnpm dev:weapp    # 启动微信小程序开发工具
```

## 主要功能

### 1. 用户认证
- 手机验证码登录
- 微信授权登录（APP端）
- 游客模式
- 用户信息管理

### 2. 卜卦功能
- 金钱课起卦
- 卦象展示
- 基础解卦
- 详细解卦（付费）
- 精准解卦（付费）

### 3. 每日一卦
- 每日运势
- 分享功能
- 运势详解

### 4. 学习中心
- 周易学习路径
- 课程阅读器
- 互动测试
- 学习进度追踪

### 5. 历史记录
- 起卦历史
- 记录详情
- 收藏功能
- 删除功能

## 设计主题

### 中国风设计
- **色彩**: 传统中国色（朱红、墨黑、古铜）
- **字体**: 方正楷体、宋体
- **图标**: 传统卦象符号
- **布局**: 对称、留白、典雅

### 主题配置

```typescript
{
  primary: '#C8102E',      // 朱红
  secondary: '#D4AF37',    // 金色
  accent: '#8B4513',       // 古铜
  background: {
    light: '#F5F5DC',      // 米色
    dark: '#1A1A1A',       // 墨黑
  },
  titleFont: {
    bold: 'PingFangSC-Bold',
    medium: 'PingFangSC-Medium',
  }
}
```

## 目录结构

### APP包 (packages/app)

```
app/
├── src/
│   ├── components/     # 通用组件
│   ├── screens/        # 页面组件
│   ├── navigation/     # 导航配置
│   ├── hooks/          # 自定义Hook
│   ├── utils/          # 工具函数
│   └── App.tsx         # 应用入口
├── android/            # Android原生代码
├── ios/                # iOS原生代码
└── package.json
```

### 共享包 (packages/shared)

```
shared/
├── src/
│   ├── theme/          # 主题配置
│   ├── types/          # 类型定义
│   ├── services/       # 服务层
│   ├── utils/          # 工具函数
│   └── index.ts
└── package.json
```

## API集成

### 认证服务

```typescript
import { authService } from '@zhouyi/shared/services/auth';

// 发送验证码
await authService.sendVerificationCode(phoneNumber);

// 手机号登录
await authService.loginWithPhone({
  phoneNumber,
  verificationCode,
});

// 游客登录
await authService.loginAsGuest();

// 获取当前用户
const user = await authService.getCurrentUser();
```

### 卜卦服务

```typescript
import { divinationService } from '@zhouyi/shared/services/divination';

// 执行起卦
const result = await divinationService.performDivination({
  type: 'coin',
  question: '',
});

// 获取历史记录
const history = await divinationService.getHistory(1, 20);

// 获取记录详情
const record = await divinationService.getRecord(recordId);
```

## 用户体验优化

### 游客模式
- 未登录用户可体验2次起卦
- 引导游客注册登录
- 登录后数据迁移

### 加载状态
- 异步操作显示加载指示器
- 网络请求超时处理
- 友好的错误提示

### 本地缓存
- AsyncStorage缓存用户Token
- 本地存储游客卜卦次数
- 离线数据支持

## 构建部署

### iOS

```bash
cd packages/app
# 构建Release版本
npx react-native run-ios --configuration Release
```

### Android

```bash
cd packages/app/android
./gradlew assembleRelease
```

## 开发规范

### 代码风格
- 使用ESLint + Prettier
- 遵循Airbnb JavaScript规范
- 使用TypeScript严格模式

### 组件命名
- 组件文件使用PascalCase
- 工具函数使用camelCase
- 常量使用UPPER_SNAKE_CASE

### 注释规范
```typescript
/**
 * 函数功能描述
 * @param param1 参数1说明
 * @returns 返回值说明
 */
function functionName(param1: string): ReturnType {
  // 实现
}
```

## 测试

```bash
# 运行单元测试
pnpm test

# 运行测试并生成覆盖率报告
pnpm test:coverage
```

## 相关文档

- [微信登录集成指南](./docs/微信登录集成指南.md)
- [API文档](../docs/API.md)
- [设计规范](../docs/DESIGN.md)

## 许可证

Copyright © 2025 周易通
