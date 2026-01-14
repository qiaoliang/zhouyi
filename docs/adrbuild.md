# Android App 构建指南

本文档说明如何使用 `adrbuild.sh` 脚本一键构建周易通 Android 应用。

## 环境要求

### 必需环境

1. **Java JDK**
   - JDK 8 或更高版本
   - 设置 `JAVA_HOME` 环境变量

2. **Android SDK**
   - Android SDK Platform-Tools
   - Android SDK Build-Tools
   - 设置 `ANDROID_HOME` 或 `ANDROID_SDK_ROOT` 环境变量

3. **Node.js**
   - Node.js 16 或更高版本
   - pnpm 包管理器

### 验证环境

```bash
# 检查 Java 版本
java -version

# 检查 Android SDK
echo $ANDROID_HOME

# 检查 Node.js 版本
node -v

# 检查 pnpm 版本
pnpm -v
```

## 使用方法

### 基本用法

```bash
# 构建 Release 版本（推荐）
./adrbuild.sh

# 构建 Debug 版本
./adrbuild.sh --debug

# 清理后构建
./adrbuild.sh --clean

# 跳过依赖检查
./adrbuild.sh --no-deps
```

### 初始化 Android 项目（仅首次）

如果你的项目还没有 Android 目录，需要先初始化：

```bash
./adrbuild.sh --init
```

脚本会提示你选择初始化方式：
1. 从现有 React Native 项目复制（推荐）
2. 使用 npx 手动初始化
3. 取消

### 高级选项

```bash
# 构建特定变体
./adrbuild.sh --variant Release

# 查看帮助
./adrbuild.sh --help
```

## 构建流程

脚本会自动执行以下步骤：

1. **检查项目结构** - 验证所有必需的目录和文件存在
2. **检查依赖** - 自动安装缺失的 npm 依赖
3. **检查环境** - 验证 Java、Android SDK 等环境配置
4. **清理缓存**（可选）- 清理之前的构建文件
5. **执行构建** - 运行 Gradle 构建命令
6. **输出结果** - 显示 APK 文件位置和大小

## 构建产物

### Release 版本

构建成功后，APK 文件位于：
```
frontend/packages/app/android/app/build/outputs/apk/release/app-release.apk
```

### Debug 版本

```
frontend/packages/app/android/app/build/outputs/apk/debug/app-debug.apk
```

## 安装到设备

### 使用 adb

```bash
# 安装到连接的设备
adb install -r frontend/packages/app/android/app/build/outputs/apk/release/app-release.apk

# 查看连接的设备
adb devices
```

### 手动安装

1. 将 APK 文件传输到 Android 设备
2. 在设备上打开文件管理器
3. 点击 APK 文件进行安装

## 常见问题

### 1. 构建失败：找不到 Java

**错误信息**：`java: command not found`

**解决方案**：
- 安装 JDK 8 或更高版本
- 设置 `JAVA_HOME` 环境变量
- 确保 `java` 命令在 PATH 中

### 2. 构建失败：找不到 Android SDK

**错误信息**：`SDK location not found`

**解决方案**：
- 设置 `ANDROID_HOME` 或 `ANDROID_SDK_ROOT` 环境变量
- 或在 `frontend/packages/app/android/local.properties` 中指定：
  ```properties
  sdk.dir=/path/to/android/sdk
  ```

### 3. Gradle 构建失败

**解决方案**：
```bash
# 清理 Gradle 缓存
cd frontend/packages/app/android
./gradlew clean

# 删除 .gradle 目录
rm -rf ~/.gradle/caches/

# 重新构建
cd ../../../..
./adrbuild.sh --clean
```

### 4. Android 项目不存在

**错误信息**：`Android 目录不存在`

**解决方案**：
```bash
# 初始化 Android 项目
./adrbuild.sh --init
```

## 签名配置

Release 版本需要对 APK 进行签名。配置签名：

1. 创建 keystore 文件：
```bash
keytool -genkey -v -keystore zhouyi-release.keystore -alias zhouyi-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

2. 配置 `frontend/packages/app/android/app/build.gradle`：

```gradle
android {
    ...
    signingConfigs {
        release {
            storeFile file('../../zhouyi-release.keystore')
            storePassword 'your-store-password'
            keyAlias 'zhouyi-key-alias'
            keyPassword 'your-key-password'
        }
    }
    buildTypes {
        release {
            ...
            signingConfig signingConfigs.release
        }
    }
}
```

3. **重要**：将 keystore 文件添加到 `.gitignore`，不要提交到版本控制！

## 性能优化

### 加速构建

```bash
# 使用 Gradle 并行构建
cd frontend/packages/app/android
./gradlew assembleRelease --parallel

# 使用 Gradle 守护进程
./gradlew assembleRelease --daemon

# 配置堆内存
./gradlew assembleRelease -J-Xmx4096m
```

### 减小 APK 体积

1. 启用代码混淆和压缩
2. 启用资源压缩
3. 使用 APK Split 分离不同架构的 so 库

## 持续集成

在 CI/CD 管道中构建：

```bash
#!/bin/bash
# ci-build.sh

set -e

# 安装依赖
pnpm install

# 构建 Android APK
./adrbuild.sh --clean --no-deps

# 上传 APK 到存储服务
# cp frontend/packages/app/android/app/build/outputs/apk/release/*.apk /output/
```

## 相关文档

- [React Native Android 发布指南](https://reactnative.dev/docs/publishing-to-android)
- [Android App Bundle](https://developer.android.com/guide/app-bundle)
- [APK 签名最佳实践](https://developer.android.com/studio/publish/app-signing)
