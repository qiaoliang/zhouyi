#!/bin/bash

# 周易通APP - 项目初始化脚本

set -e  # 遇到错误时退出

echo "🚀 初始化周易通APP项目..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 创建项目目录
echo -e "${BLUE}📁 创建项目目录结构...${NC}"
mkdir -p apps/native
mkdir -p apps/miniprogram
mkdir -a apps/h5
mkdir -p packages/shared
mkdir -p packages/ui
mkdir -p packages/utils
mkdir -p packages/constants
mkdir -p packages/types

echo -e "${GREEN}✅ 项目目录结构创建完成${NC}"
echo ""

# 创建根 package.json
echo -e "${BLUE}📦 创建 package.json...${NC}"
cat > package.json << 'JSON'
{
  "name": "zhouyi-app",
  "version": "1.0.0",
  "private": true,
  "description": "周易通APP - React Native + Taro + React.js",
  "scripts": {
    "verify-env": "bash scripts/verify-env.sh",
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx",
    "lint:fix": "eslint . --ext .ts,.tsx,.js,.jsx --fix",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\""
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.50.0",
    "eslint-config-prettier": "^9.0.0",
    "eslint-plugin-prettier": "^5.0.0",
    "eslint-plugin-react": "^7.33.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "prettier": "^3.0.0",
    "typescript": "^5.2.0"
  },
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=8.0.0"
  }
}
JSON

echo -e "${GREEN}✅ package.json 创建完成${NC}"
echo ""

# 安装根依赖
echo -e "${BLUE}📥 安装根依赖...${NC}"
pnpm install || {
  echo -e "${YELLOW}⚠️ pnpm 未安装，尝试使用 npm...${NC}"
  npm install
}
echo ""

# 初始化 React Native 项目
echo -e "${BLUE"📱 初始化 React Native 项目...${NC}"
cd apps/native
if [ ! -d "ZhouYiApp" ]; then
  npx react-native@latest init ZhouYiApp --pm pnpm
  echo -e "${GREEN}✅ React Native 项目初始化完成${NC}"
else
  echo -e "${YELLOW}⚠️ React Native 项目已存在${NC}"
fi
cd ../..
echo ""

# 初始化 Taro 小程序项目
echo -e "${BLUE}💬 初始化 Taro 小程序项目...${NC}"
cd apps/miniprogram
if [ ! -d "zhouyi-miniprogram" ]; then
  taro init zhouyi-miniprogram --typescript
  echo -e "${GREEN}✅ Taro 项目初始化完成${NC}"
else
  echo -e "${YELLOW}⚠️ Taro 项目已存在${NC}"
fi
cd ../..
echo ""

# 初始化 React H5 项目
echo -e "${BLUE}🌐 初始化 React H5 项目...${NC}"
cd apps/h5
if [ ! -d "zhouyi-h5" ]; then
  pnpm create vite zhouyi-h5 --template react-ts
  echo -e "${GREEN}✅ React H5 项目初始化完成${NC}"
else
  echo -e "${YELLOW}⚠️ React H5 项目已存在${NC}"
fi
cd ../..
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}🎉 项目初始化完成!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 项目结构:"
echo "  apps/"
echo "    ├── native/ZhouYiApp/        # React Native 项目"
echo "    ├── miniprogram/zhouyi-miniprogram/  # Taro 小程序"
echo "    └── h5/zhouyi-h5/            # React H5 项目"
echo "  packages/"
echo "    ├── shared/                  # 共享业务逻辑"
echo "    ├── ui/                      # 共享 UI 组件"
echo "    ├── utils/                   # 工具函数"
echo "    ├── constants/               # 常量定义"
echo "    └── types/                   # TypeScript 类型"
echo ""
echo "💡 下一步:"
echo "  1. 进入各项目目录安装依赖"
echo "  2. 配置环境变量 (cp docs/env/.env.example .env)"
echo "  3. 启动开发服务器"
echo ""
