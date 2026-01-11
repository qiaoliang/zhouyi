#!/bin/bash
# 部署到开发环境

set -e

echo "🚀 部署到开发环境..."

# 配置
ENV="development"
PROJECT_DIR="/app/zhouyi-api"
BACKUP_DIR="/app/backups/zhouyi-api"
BRANCH="develop"

# 备份当前版本
echo "📦 备份当前版本..."
mkdir -p $BACKUP_DIR
BACKUP_NAME=$(date +%Y%m%d_%H%M%S)
cp -r $PROJECT_DIR $BACKUP_DIR/$BACKUP_NAME

# 拉取最新代码
echo "📥 拉取最新代码..."
cd $PROJECT_DIR
git fetch origin
git checkout $BRANCH
git pull origin $BRANCH

# 安装依赖
echo "📦 安装依赖..."
pnpm install

# 构建项目
echo "🔨 构建项目..."
pnpm build

# 运行数据库迁移
echo "🗄️  运行数据库迁移..."
pnpm migrate || echo "⚠️  数据库迁移跳过"

# 重启服务
echo "🔄 重启服务..."
pm2 restart zhouyi-api || pm2 start dist/main.js --name zhouyi-api

# 健康检查
echo "🏥 健康检查..."
sleep 10
for i in {1..30}; do
  if curl -f http://localhost:3000/api/v1/health > /dev/null 2>&1; then
    echo "✅ 服务健康检查通过!"
    break
  fi
  echo "⏳ 等待服务启动... ($i/30)"
  sleep 2
done

echo "✅ 部署完成!"
echo "📍 访问: http://api-dev.zhouyi.example.com"
