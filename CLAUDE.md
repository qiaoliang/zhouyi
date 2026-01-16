# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

周易通APP 是一个基于周易文化的多功能应用，包含后端 API 服务和三个前端应用：
- **后端**: NestJS + MongoDB + Redis 的 RESTful API 服务
- **小程序**: 基于 Taro 的微信小程序
- **APP**: 基于 React Native 的移动应用（支持 Android/iOS）
- **Shared**: 前端共享代码库（API 客户端、类型定义、工具函数）

## 常用命令

### 后端开发
```bash
# 开发模式启动（热重载）
pnpm run start:dev

# 构建项目
pnpm run build

# 运行测试
pnpm run test                              # 运行所有测试
pnpm run test:watch                        # 监听模式运行测试
pnpm run test:cov                          # 运行测试并生成覆盖率报告
pnpm run test -- --testNamePattern="验证码" # 运行匹配特定名称的测试
pnpm run test -- src/modules/auth/auth.service.spec.ts # 运行特定测试文件

# 数据库种子数据
pnpm run seed:hexagrams                    # 初始化64卦数据
pnpm run seed:hexagrams:clean              # 清理并重新初始化卦象数据
```

### 前端开发
```bash
cd frontend

# 安装依赖
pnpm install

# 开发模式
pnpm run app     # 启动 React Native APP
pnpm run mini    # 启动微信小程序开发模式

# 构建
pnpm run build:app     # 构建 APP
pnpm run build:mini    # 构建微信小程序

# 微信小程序一键构建（从项目根目录）
./mpbuild.sh           # 完整构建（包含依赖检查）
./mpbuild.sh --no-deps # 跳过依赖检查
./mpbuild.sh --clean   # 清理后构建
```

### 测试相关
**重要**: 后端的所有单元测试和集成测试使用独立的测试数据库 (`zhouyi_test`)，确保与开发数据库隔离。

在编写集成测试时：
1. 使用提供的随机测试数据生成方法（`src/test/helpers/test-data.builder.ts`）
2. 如果增加新的数据模型，首先分析是否需要创建新的 helper 方法
3. 确保有可用的 Helper 方法后，再开始编写自动化测试用例

## 项目架构

### 后端架构 (NestJS)

```
src/
├── main.ts                    # 应用入口
├── app.module.ts              # 根模块
├── common/                    # 通用模块（拦截器、过滤器、装饰器）
│   ├── interceptors/          # 响应拦截器
│   ├── filters/               # 异常过滤器
│   └── database/              # 数据库优化服务
├── config/                    # 配置文件
├── database/                  # 数据库模块
│   ├── database.module.ts     # MongoDB 连接配置
│   └── schemas/               # Mongoose Schemas
├── modules/                   # 业务模块
│   ├── auth/                  # 认证模块（JWT、验证码、微信登录）
│   ├── divination/            # 卜卦模块
│   ├── hexagram/              # 卦象模块（64卦数据）
│   ├── daily-hexagram/        # 每日一卦模块
│   ├── learning/              # 学习模块
│   ├── membership/            # 会员模块
│   └── redis/                 # Redis 缓存模块
├── services/                  # 服务模块
│   ├── sms/                   # 短信服务（支持 Mock 和阿里云）
│   ├── wechat/                # 微信 API 服务
│   ├── crypto/                # 加密服务
│   └── user/                  # 用户服务
└── test/                      # 测试工具
    ├── setup.ts               # Jest 全局设置
    ├── helpers/               # 测试辅助工具
    │   ├── test-data.builder.ts    # 测试数据生成器
    │   └── mock.factory.ts         # Mock 工厂
```

**关键架构模式**:
- 全局路由前缀: `/api/v1`
- 全局 ValidationPipe: 自动 DTO 验证和类型转换
- 响应拦截器: 统一返回格式 `{ code, message, data }`
- 异常过滤器: 统一错误处理
- JWT 双 Token 机制: access_token (15分钟) + refresh_token (7天)
- Redis 用于: 验证码存储、Token 黑名单、缓存、频率限制

### 前端架构 (Monorepo)

```
frontend/
├── packages/
│   ├── app/                   # React Native APP (iOS/Android)
│   ├── mini/                  # Taro 微信小程序
│   └── shared/                # 共享代码库
│       ├── services/          # API 客户端（auth、divination、learning 等）
│       ├── types/             # TypeScript 类型定义
│       ├── theme/             # 主题配置
│       └── utils/             # 工具函数
└── package.json               # 根 package.json（workspace 配置）
```

**共享代码库 (@zhouyi/shared)**:
- 所有前端应用共享的 API 客户端
- 统一的类型定义（避免重复）
- 主题和样式系统
- 工具函数（如农历转换）

**API 基础 URL 配置**: 在各个应用的 `src/services/api.ts` 中配置

### 数据库设计

**MongoDB Collections**:
- `users`: 用户信息（手机号、微信 unionid、会员信息）
- `divinations`: 卜卦记录（卦象、日期、解读）
- `hexagrams`: 64卦数据（卦名、卦辞、爻辞）
- `daily_hexagrams`: 每日一卦缓存

**Redis Keys**:
- `sms:code:{phone}`: 验证码（Hash: code, createdAt, expiresAt, attempts）
- `sms:rate:{phone}`: 发送频率限制
- `sms:attempts:{phone}`: 验证失败次数
- `auth:blacklist:{tokenId}`: Token 黑名单
- `daily:hexagram:{date}`: 每日一卦缓存

## 环境配置

### 必需环境变量（.env）

```bash
# 数据库
MONGODB_URI=mongodb://localhost:27017/zhouyi

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key

# 微信（至少配置一个）
WECHAT_MINI_PROGRAM_APPID=xxx
WECHAT_MINI_PROGRAM_APPSECRET=xxx
WECHAT_APP_APPID=xxx
WECHAT_APP_APPSECRET=xxx

# 短信（开发环境可用 mock）
SMS_MODE=mock  # 或 aliyun
```

完整配置参考 `.env.example`

## 开发工作流

### 添加新功能

1. **后端**:
   - 在 `src/modules/` 创建新模块
   - 定义 Schema（`src/database/schemas/`）
   - 创建 DTO（请求数据对象）
   - 实现 Controller 和 Service
   - 在 `app.module.ts` 中导入

2. **前端**:
   - 在 `@zhouyi/shared/services/` 添加 API 客户端方法
   - 在 `@zhouyi/shared/types/` 添加类型定义
   - 在各应用中调用共享的服务方法

### 测试驱动开发

1. 使用 `test-data.builder.ts` 生成测试数据
2. 编写测试用例（参考 `auth.service.spec.ts`）
3. 运行测试验证功能
4. 确保 MongoDB 服务正在运行（测试使用 `zhouyi_test` 数据库）

### 微信小程序开发流程

1. 修改代码后运行 `./mpbuild.sh`
2. 在微信开发者工具中导入 `frontend/packages/mini/dist` 目录
3. 测试功能
4. 提交代码

### 部署相关

- Docker 配置: `Dockerfile.backend`, `docker-compose.yml`
- 构建脚本: `adrbuild.sh` (Android), `mpbuild.sh` (小程序)
- 部署脚本: `scripts/deploy-dev.sh`

## 重要约定

1. **所有响应使用统一格式**: 通过 `ResponseInterceptor` 自动包装
2. **所有请求使用 DTO 验证**: 利用 `ValidationPipe` 和 `class-validator`
3. **敏感信息不记录**: 手机号脱敏、Token 不打印
4. **错误处理统一**: 使用 `HttpException` 和自定义异常
5. **测试使用独立数据库**: 测试环境使用 `zhouyi_test` 数据库
6. **前端共享代码优先**: 避免在多个前端应用中重复代码

## 调试技巧

### 后端调试
```bash
# 启动调试模式
pnpm run start:debug

# 运行特定测试并查看输出
pnpm run test -- --verbose --testNamePattern="应该成功登录"
```

### 前端调试
```bash
# 小程序：在微信开发者工具中查看 console
# APP：使用 React Native Debugger 或 Chrome DevTools
```

### 查看日志
```bash
# 后端日志通常输出到控制台
# 生产环境可能配置了日志文件（见 logs/ 目录）
```

## 常见问题

**Q: 测试失败并提示数据库连接错误？**
A: 确保本地 MongoDB 服务正在运行，测试使用 `zhouyi_test` 数据库。

**Q: 微信登录失败？**
A: 检查 `.env` 中的微信 APPID 和 APPSECRET 是否正确配置。

**Q: 小程序构建后无法在开发者工具中打开？**
A: 确保 `frontend/packages/mini/project.config.json` 存在且配置正确。

**Q: 前端 API 请求失败？**
A: 检查各应用中的 API 基础 URL 配置，以及后端服务是否正在运行。

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md
