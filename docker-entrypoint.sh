#!/bin/sh
set -e

echo "[ENTRYPOINT] 启动后端服务..."

# 等待 MongoDB 就绪
echo "[ENTRYPOINT] 等待 MongoDB 连接..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if node -e "
        const { MongoClient } = require('mongodb');
        const client = new MongoClient('mongodb://admin:admin123@mongodb:27017');
        client.connect().then(() => {
            console.log('MongoDB connected');
            process.exit(0);
        }).catch(() => {
            process.exit(1);
        });
    " 2>/dev/null; then
        echo "[ENTRYPOINT] MongoDB 已就绪"
        break
    fi
    attempt=$((attempt + 1))
    echo "[ENTRYPOINT] 等待 MongoDB... ($attempt/$max_attempts)"
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo "[ENTRYPOINT] ERROR: MongoDB 连接超时"
    exit 1
fi

# 检查是否需要刷新数据库
if [ "${ZHOUYI_DB_REFRESH}" = "TRUE" ] || [ "${ZHOUYI_DB_REFRESH}" = "true" ]; then
    echo "[ENTRYPOINT] 检测到 ZHOUYI_DB_REFRESH=TRUE，开始刷新数据库..."
    
    # 删除整个数据库
    if node -e "
        const { MongoClient } = require('mongodb');
        const client = new MongoClient('mongodb://admin:admin123@mongodb:27017');
        client.connect().then(async () => {
            await client.db('zhouyi').dropDatabase();
            console.log('Database dropped successfully');
            process.exit(0);
        }).catch((error) => {
            console.error('Error dropping database:', error.message);
            process.exit(1);
        });
    " 2>/dev/null; then
        echo "[ENTRYPOINT] ✅ 数据库已删除"
    else
        echo "[ENTRYPOINT] ❌ 删除数据库失败"
        exit 1
    fi
fi

# 检查数据库是否需要初始化
echo "[ENTRYPOINT] 检查数据库初始化状态..."
if node -e "
    const { MongoClient } = require('mongodb');
    const client = new MongoClient('mongodb://admin:admin123@mongodb:27017');
    client.connect().then(async () => {
        const db = client.db('zhouyi');
        const count = await db.collection('hexagrams').countDocuments();
        console.log(count);
        process.exit(count > 0 ? 0 : 1);
    }).catch(() => {
        process.exit(1);
    });
" 2>/dev/null | grep -q "^0$"; then
    echo "[ENTRYPOINT] 数据库未初始化，开始导入卦象数据..."

    # 使用简化的seed脚本
    node scripts/seed-hexagrams-simple.js || {
        echo "[ENTRYPOINT] WARNING: 卦象数据导入失败，但服务将继续启动"
    }
else
    echo "[ENTRYPOINT] 数据库已初始化，跳过数据导入"
fi

# 启动应用
echo "[ENTRYPOINT] 启动应用..."
exec pm2-runtime start dist/src/main.js --name zhouyi-api