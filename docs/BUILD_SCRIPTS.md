# 周易通构建脚本说明

本项目提供了多个构建脚本，用于构建不同平台的应用。

## 构建脚本

### 1. `adrbuild.sh` - Android App 构建

构建 Android APK 文件。

**使用方法**：
```bash
# 构建 Release 版本
./adrbuild.sh

# 构建 Debug 版本
./adrbuild.sh --debug

# 查看帮助
./adrbuild.sh --help
```

**详细文档**：[docs/adrbuild.md](./adrbuild.md)

**构建产物**：`frontend/packages/app/android/app/build/outputs/apk/`

### 2. `mpbuild.sh` - 微信小程序构建

构建微信小程序，可在微信开发者工具中导入。

**使用方法**：
```bash
# 完整构建
./mpbuild.sh

# 跳过依赖检查
./mpbuild.sh --no-deps

# 清理后构建
./mpbuild.sh --clean
```

**构建产物**：`frontend/packages/mini/dist/`

### 3. `start.sh` - 启动开发服务器

启动后端和前端开发服务器。

**使用方法**：
```bash
./start.sh
```

### 4. `dev.sh` - 开发环境管理

管理开发环境和依赖。

**使用方法**：
```bash
./dev.sh
```

## 快速开始

### 首次构建

**Android App**：
```bash
# 1. 初始化 Android 项目（仅首次）
./adrbuild.sh --init

# 2. 构建 APK
./adrbuild.sh
```

**微信小程序**：
```bash
./mpbuild.sh
```

### 日常开发

```bash
# 启动开发服务器
./start.sh

# 或者分别启动
pnpm run app          # React Native App
pnpm run mini         # 微信小程序
pnpm run web          # Web 版本
```

## 项目结构

```
zhouyi/
├── adrbuild.sh              # Android 构建脚本
├── mpbuild.sh               # 微信小程序构建脚本
├── start.sh                 # 启动脚本
├── dev.sh                   # 开发环境脚本
├── frontend/                # 前端项目
│   ├── packages/
│   │   ├── app/             # React Native App
│   │   ├── mini/            # 微信小程序
│   │   ├── web/             # Web 版本
│   │   └── shared/          # 共享代码
│   └── package.json
├── src/                     # 后端源码
└── docs/                    # 文档
    ├── adrbuild.md          # Android 构建文档
    └── BUILD_SCRIPTS.md     # 本文档
```

## 环境要求

### 通用要求
- Node.js 16+
- pnpm

### Android 构建要求
- Java JDK 8+
- Android SDK
- Android SDK Build-Tools

### 微信小程序要求
- 微信开发者工具

## 常见问题

### 构建失败怎么办？

1. **清理缓存后重试**：
   ```bash
   ./adrbuild.sh --clean  # Android
   ./mpbuild.sh --clean   # 微信小程序
   ```

2. **重新安装依赖**：
   ```bash
   rm -rf frontend/node_modules
   rm -rf frontend/packages/*/node_modules
   pnpm install
   ```

3. **检查环境变量**：
   ```bash
   echo $JAVA_HOME        # Android 构建
   echo $ANDROID_HOME     # Android 构建
   ```

### 如何同时支持多平台？

本项目采用 monorepo 结构，共享代码在 `frontend/packages/shared/` 中，可以同时支持：
- React Native（iOS & Android）
- 微信小程序
- Web

## CI/CD 集成

构建脚本可在 CI/CD 管道中使用：

```yaml
# 示例：GitHub Actions
- name: Build Android
  run: ./adrbuild.sh --clean --no-deps

- name: Build Mini Program
  run: ./mpbuild.sh --clean --no-deps
```

## 相关文档

- [Android 构建指南](./adrbuild.md)
- [微信小程序开发指南](./wechat-mini-program.md)
- [项目 README](../README.md)
