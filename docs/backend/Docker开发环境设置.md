# Docker 开发环境设置指南

本文档介绍如何使用 Docker Compose 快速搭建周易通APP后端的本地开发环境，包括 MongoDB 和 Redis 服务。

---

## 前置要求

确保您的系统已安装以下软件：

- **Docker**: 版本 20.10 或更高
- **Docker Compose**: 版本 2.0 或更高

### 安装 Docker

#### macOS
```bash
# 使用 Homebrew 安装
brew install --cask docker

# 或下载 Docker Desktop
# https://www.docker.com/products/docker-desktop
```

#### Linux (Ubuntu/Debian)
```bash
# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装 Docker Compose
sudo apt-get install docker-compose-plugin
```

#### Windows
下载并安装 Docker Desktop for Windows：
https://www.docker.com/products/docker-desktop

---

## 快速开始

### 1. 配置环境变量

复制 `.env.example` 文件并重命名为 `.env`：

```bash
cp .env.example .env
```

根据需要修改 `.env` 文件中的配置。对于 Docker 环境，建议修改以下配置：

```env
# MongoDB 配置（使用 Docker 服务名）
MONGODB_URI="mongodb://admin:admin123@mongodb:27017/zhouyi?authSource=admin"

# Redis 配置（使用 Docker 服务名）
REDIS_HOST="redis"
REDIS_PORT="6379"
REDIS_PASSWORD="redis123"
```

### 2. 启动服务

在项目根目录运行：

```bash
# 启动所有服务（后台运行）
docker-compose up -d

# 或仅启动数据库服务
docker-compose up -d mongodb redis

# 查看服务状态
docker-compose ps
```

### 3. 验证服务

#### 检查容器状态

```bash
docker-compose ps
```

预期输出：
```
NAME                   STATUS         PORTS
zhouyi-mongodb         Up (healthy)   0.0.0.0:27017->27017/tcp
zhouyi-redis           Up (healthy)   0.0.0.0:6379->6379/tcp
zhouyi-mongo-express   Up             0.0.0.0:8081->8081/tcp
zhouyi-redis-commander Up             0.0.0.0:8082->8081/tcp
```

#### 测试 MongoDB 连接

```bash
# 使用 mongosh 连接
docker exec -it zhouyi-mongodb mongosh -u admin -p admin123 --authenticationDatabase admin

# 在 mongosh 中运行测试命令
> db.adminCommand('ping')
> show dbs
> use zhouyi
> show collections
```

#### 测试 Redis 连接

```bash
# 使用 redis-cli 连接
docker exec -it zhouyi-redis redis-cli -a redis123

# 在 redis-cli 中运行测试命令
> PING
> SET test "hello"
> GET test
> exit
```

### 4. 访问 Web 管理界面（可选）

#### MongoDB Express
- URL: http://localhost:8081
- 用户名: `admin`
- 密码: `admin123`

#### Redis Commander
- URL: http://localhost:8082
- 已自动配置连接到本地 Redis

---

## 常用命令

### 启动和停止

```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose stop

# 停止并删除容器
docker-compose down

# 停止并删除容器及数据卷（⚠️ 会删除数据）
docker-compose down -v
```

### 查看日志

```bash
# 查看所有服务日志
docker-compose logs

# 查看 MongoDB 日志
docker-compose logs mongodb

# 查看 Redis 日志
docker-compose logs redis

# 实时跟踪日志
docker-compose logs -f mongodb
```

### 重启服务

```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart mongodb
docker-compose restart redis
```

### 进入容器

```bash
# 进入 MongoDB 容器
docker exec -it zhouyi-mongodb sh

# 进入 Redis 容器
docker exec -it zhouyi-redis sh
```

---

## 数据持久化

### 数据卷位置

Docker Compose 使用命名卷来持久化数据：

- `mongodb_data`: MongoDB 数据文件
- `mongodb_config`: MongoDB 配置文件
- `redis_data`: Redis AOF 文件

### 查看数据卷

```bash
# 列出所有卷
docker volume ls | grep zhouyi

# 查看卷详细信息
docker volume inspect zhouyi_mongodb_data
docker volume inspect zhouyi_redis_data
```

### 备份数据

#### 备份 MongoDB

```bash
# 创建备份目录
mkdir -p backups/mongodb

# 导出所有数据库
docker exec zhouyi-mongodb mongodump -u admin -p admin123 --authenticationDatabase admin -o /tmp/backup

# 从容器复制备份到主机
docker cp zhouyi-mongodb:/tmp/backup backups/mongodb/$(date +%Y%m%d_%H%M%S)
```

#### 备份 Redis

```bash
# 触发 Redis 保存
docker exec zhouyi-redis redis-cli -a redis123 BGSAVE

# 复制 RDB/AOF 文件
docker cp zhouyi-redis:/data/dump.rdb backups/redis/
```

### 恢复数据

#### 恢复 MongoDB

```bash
# 将备份文件复制到容器
docker cp backups/mongodb/20250113_120000 zhouyi-mongodb:/tmp/restore

# 恢复数据
docker exec zhouyi-mongodb mongorestore -u admin -p admin123 --authenticationDatabase admin /tmp/restore
```

#### 恢复 Redis

```bash
# 停止 Redis 容器
docker-compose stop redis

# 复制备份文件到数据卷
docker cp backups/redis/dump.rpb /var/lib/docker/volumes/zhouyi_redis_data/_data/

# 重新启动 Redis
docker-compose start redis
```

---

## 连接字符串配置

### 应用程序连接

在 `.env` 文件中使用以下连接字符串：

```env
# MongoDB 连接字符串
MONGODB_URI="mongodb://admin:admin123@mongodb:27017/zhouyi?authSource=admin"

# Redis 连接配置
REDIS_HOST="redis"
REDIS_PORT="6379"
REDIS_PASSWORD="redis123"
```

### 外部工具连接

#### MongoDB Compass
```
mongodb://admin:admin123@localhost:27017/zhouyi?authSource=admin
```

#### Studio 3T
```
mongodb://admin:admin123@localhost:27017/zhouyi?authSource=admin
```

#### Redis Desktop Manager
```
Host: localhost
Port: 6379
Password: redis123
```

---

## 性能优化

### MongoDB

在 `docker-compose.yml` 中调整配置：

```yaml
mongodb:
  # ... 其他配置
  command:
    - mongod
    - --wiredTigerCacheSizeGB=2  # 调整缓存大小
    - --maxConns=1000             # 最大连接数
```

### Redis

在 `docker-compose.yml` 中调整配置：

```yaml
redis:
  # ... 其他配置
  command:
    - redis-server
    - --maxmemory 512mb          # 最大内存
    - --maxmemory-policy allkeys-lru  # 内存淘汰策略
    - --save ""                  # 禁用 RDB（可选）
```

---

## 故障排除

### 端口冲突

如果端口已被占用，修改 `docker-compose.yml` 中的端口映射：

```yaml
services:
  mongodb:
    ports:
      - "27018:27017"  # 使用 27018 而不是 27017

  redis:
    ports:
      - "6380:6379"    # 使用 6380 而不是 6379
```

### 容器无法启动

```bash
# 查看详细日志
docker-compose logs mongodb
docker-compose logs redis

# 检查端口占用
lsof -i :27017
lsof -i :6379

# 重启 Docker
sudo systemctl restart docker  # Linux
# 或重启 Docker Desktop（macOS/Windows）
```

### 数据丢失

```bash
# 检查数据卷状态
docker volume ls

# 查看数据卷详细信息
docker volume inspect zhouyi_mongodb_data

# 数据未持久化检查
# 确保使用正确的卷挂载路径
docker inspect zhouyi-mongodb | grep -A 10 Mounts
```

### 内存不足

```bash
# 限制容器内存使用
docker-compose up -d --scale mongodb=1 --scale redis=1

# 清理未使用的资源
docker system prune -a
```

---

## 生产环境部署

### 安全配置

对于生产环境，请务必：

1. **修改默认密码**
   ```env
   MONGO_INITDB_ROOT_PASSWORD=<strong_password>
   ```

2. **使用环境变量文件**
   ```bash
   docker-compose --env-file .env.prod up -d
   ```

3. **禁用 Web 管理界面**
   - 删除或注释 `mongo-express` 和 `redis-commander` 服务

4. **配置防火墙**
   - 仅允许内部网络访问数据库端口

### 资源限制

在 `docker-compose.yml` 中添加资源限制：

```yaml
services:
  mongodb:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

---

## 附录

### 修改默认配置

#### 修改 MongoDB 密码

1. 编辑 `.env` 文件
2. 更新 `MONGODB_URI` 中的密码
3. 重新创建容器：

```bash
docker-compose down -v
docker-compose up -d
```

#### 修改 Redis 密码

1. 编辑 `docker-compose.yml`
2. 更新 `redis` 服务的 `--requirepass` 参数
3. 重新创建容器：

```bash
docker-compose down -v
docker-compose up -d
```

### 更新镜像

```bash
# 拉取最新镜像
docker-compose pull

# 重新创建容器
docker-compose up -d --force-recreate
```

---

## 参考资源

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [MongoDB Docker 镜像](https://hub.docker.com/_/mongo)
- [Redis Docker 镜像](https://hub.docker.com/_/redis)
