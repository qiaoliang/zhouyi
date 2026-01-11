#!/bin/bash

# 周易通APP - 环境验证脚本

echo "🔍 验证周易通APP开发环境..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查命令是否存在
check_command() {
  if command -v $1 &> /dev/null; then
    echo -e "${GREEN}✅${NC} $2: $($1 $3 2>&1 | head -n 1)"
    return 0
  else
    echo -e "${RED}❌${NC} $1 未安装 $4"
    return 1
  fi
}

# 检查环境变量
check_env() {
  if [ -n "$2" ]; then
    echo -e "${GREEN}✅${NC} $1: $2"
    return 0
  else
    echo -e "${RED}❌${NC} $1 未设置"
    return 1
  fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 通用开发环境"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_command node "Node.js" "--version"
check_command npm "npm" "--version"
check_command pnpm "pnm" "--version" " (可选，推荐使用)" || check_command yarn "yarn" "--version" " (可选)" || true
check_command git "Git" "--version"
check_command code "VS Code" "--version" " (可选)" || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🍎 iOS开发环境"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_command xcodebuild "Xcode" "-version" " (iOS开发需要)"
check_command pod "CocoaPods" "--version" " (iOS开发需要)"
check_command watchman "Watchman" "--version" " (可选)" || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🤖 Android开发环境"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_command java "Java" "-version" " (Android开发需要)" || true
check_env "ANDROID_HOME" "$ANDROID_HOME" " (Android开发需要)"
check_env "JAVA_HOME" "$JAVA_HOME" " (可选)" || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 开发工具"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_command react-native "React Native CLI" "--version" " (可选)" || true
check_command taro "Taro CLI" "--version" " (小程序开发需要)" || true

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 项目配置检查"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 检查配置文件
config_files=(
  ".gitignore"
  "pnpm-workspace.yaml"
  "tsconfig.json"
  ".eslintrc.js"
  ".prettierrc"
)

for file in "${config_files[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✅${NC} $file"
  else
    echo -e "${YELLOW}⚠️${NC} $file 不存在"
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📂 项目结构检查"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 检查目录
dirs=("apps" "packages" "docs" "scripts")
for dir in "${dirs[@]}"; do
  if [ -d "$dir" ]; then
    echo -e "${GREEN}✅${NC} $dir/"
  else
    echo -e "${YELLOW}⚠️${NC} $dir/ 不存在"
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 环境验证完成!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 下一步:"
echo "  1. 如果有缺失的环境，请按照文档进行安装"
echo "  2. 运行 'pnpm install' 安装项目依赖"
echo "  3. 开始创建各个平台的项目"
echo ""
