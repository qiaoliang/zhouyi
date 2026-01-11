#!/bin/bash
# 回滚到指定备份

set -e

BACKUP_DIR="/app/backups/zhouyi-api"
PROJECT_DIR="/app/zhouyi-api"

echo "🔄 回滚脚本"

# 列出可用备份
echo "📋 可用备份:"
ls -lt $BACKUP_DIR | grep "^d" | head -10

# 选择备份
read -p "请输入要回滚的备份目录名: " BACKUP_NAME

if [ ! -d "$BACKUP_DIR/$BACKUP_NAME" ]; then
  echo "❌ 备份目录不存在: $BACKUP_DIR/$BACKUP_NAME"
  exit 1
fi

# 确认回滚
read -p "确认回滚到 $BACKUP_NAME? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "❌ 回滚已取消"
  exit 0
fi

# 停止服务
echo "🛑 停止服务..."
pm2 stop zhouyi-api || true

# 恢复备份
echo "📦 恢复备份..."
rm -rf $PROJECT_DIR
cp -r $BACKUP_DIR/$BACKUP_NAME $PROJECT_DIR

# 重启服务
echo "🔄 重启服务..."
cd $PROJECT_DIR
pm2 restart zhouyi-api

# 健康检查
echo "🏥 健康检查..."
sleep 10
if curl -f http://localhost:3000/api/v1/health > /dev/null 2>&1; then
  echo "✅ 回滚成功! 服务运行正常"
else
  echo "❌ 回滚后服务异常，请检查!"
  exit 1
fi
