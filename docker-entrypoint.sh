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

    # 创建一个临时包装脚本来运行 seed-hexagrams.js
    cat > /tmp/seed-wrapper.js << 'EOF'
const { spawn } = require('child_process');

const child = spawn('node', ['dist/scripts/seed-hexagrams.js'], {
    stdio: 'inherit',
    env: process.env
});

child.on('close', (code) => {
    process.exit(0); // 总是返回成功，即使 seed-hexagrams.js 失败
});
EOF

    node /tmp/seed-wrapper.js || {
        echo "[ENTRYPOINT] WARNING: 卦象数据导入失败，但服务将继续启动"
    }
else
    echo "[ENTRYPOINT] 数据库已初始化，跳过数据导入"
fi

# 启动应用
echo "[ENTRYPOINT] 启动应用..."
exec pm2-runtime start dist/src/main.js --name zhouyi-api