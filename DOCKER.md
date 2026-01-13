# Docker 部署指南

本文档说明如何使用Docker一键启动周易通项目。

## 前置要求

1. **Docker** (20.10+)
2 **Docker Compose** (2.0+)

### 安装Docker

#### macOS
```bash
brew install --cask docker
```

#### Linux (Ubuntu/Debian)
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

#### Windows
下载并安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/)

---

## 快速开始

### 一键启动

```bash
./start.sh
```

这个脚本会自动:
1. 检查Docker环境
2. 创建环境配置文件
3. 拉取Docker镜像
4. 构建应用镜像
5. 启动所有服务
6. 等待服务就绪
7. 显示访问地址

### 首次运行

首次运行时,脚本会创建 `.env` 文件,请修改其中的配置:

```bash
# 编辑环境变量
vim .env

# 重新启动
./start.sh
```

---

## 服务说明

启动后会运行以下服务:

| 服务 | 端口 | 说明 |
|-----|------|------|
| 后端API | 3000 | NestJS API服务 |
| MongoDB | 27017 | 数据库 |
| Redis | 6379 | 缓存服务 |
| Mongo Express | 8081 | MongoDB管理界面 |
| Redis Commander | 8082 | Redis管理界面 |

### 访问地址

- **后端API**: http://localhost:3000
- **API文档**: http://localhost:3000/api/docs
- **MongoDB**: mongodb://localhost:27017
- **Redis**: redis://localhost:6379
- **Mongo Express**: http://localhost:8081 (admin/admin123)
- **Redis Commander**: http://localhost:8082

---

## 常用命令

### 启动服务

```bash
# 一键启动(包含重新构建选项)
./start.sh

# 仅启动(不重新构建)
docker compose -f docker-compose.app.yml up -d
```

### 停止服务

```bash
# 使用停止脚本
./docker-scripts/stop.sh

# 或使用docker compose
docker compose -f docker-compose.app.yml down
```

### 重启服务

```bash
# 使用重启脚本
./docker-scripts/restart.sh

# 或手动操作
./docker-scripts/stop.sh && ./start.sh
```

### 查看日志

```bash
# 查看所有服务日志
./docker-scripts/logs.sh

# 持续跟踪日志
./docker-scripts/logs.sh -f

# 查看特定服务日志
./docker-scripts/logs.sh backend
./docker-scripts/logs.sh mongodb
./docker-scripts/logs.sh redis

# 查看最后50行
./docker-scripts/logs.sh -n 50 backend
```

### 健康检查

```bash
# 检查所有服务状态
./docker-scripts/health.sh
```

### 清理资源

```bash
# 停止并删除容器(保留数据)
./docker-scripts/clean.sh

# 删除容器和数据卷
./docker-scripts/clean.sh --volumes

# 删除容器和镜像
./docker-scripts/clean.sh --images

# 清理所有资源
./docker-scripts/clean.sh --all
```

---

## Docker Compose 命令

除了提供的脚本,你也可以直接使用docker compose命令:

```bash
# 启动服务
docker compose -f docker-compose.app.yml up -d

# 查看服务状态
docker compose -f docker-compose.app.yml ps

# 查看日志
docker compose -f docker-compose.app.yml logs -f

# 重启服务
docker compose -f docker-compose.app.yml restart

# 停止服务
docker compose -f docker-compose.app.yml down

# 重新构建并启动
docker compose -f docker-compose.app.yml up -d --build

# 扩展服务(例如运行3个后端实例)
docker compose -f docker-compose.app.yml up -d --scale backend=3
```

---

## 配置说明

### 环境变量

在 `.env` 文件中配置以下变量:

```bash
# 微信小程序配置
WECHAT_APP_ID=your_wechat_app_id
WECHAT_APP_SECRET=your_wechat_app_secret

# JWT密钥 (请修改为随机字符串)
JWT_SECRET=your-random-secret-key

# 端口配置
BACKEND_PORT=3000
MONGODB_PORT=27017
REDIS_PORT=6379

# 数据库配置
MONGODB_USERNAME=admin
MONGODB_PASSWORD=admin123

# Redis配置
REDIS_PASSWORD=redis123
```

### 数据持久化

以下目录会被持久化到Docker卷:

- `mongodb_data`: MongoDB数据
- `mongodb_config`: MongoDB配置
- `redis_data`: Redis数据

本地目录:
- `./logs`: 应用日志

---

## 故障排查

### 服务无法启动

1. **检查端口占用**
```bash
# 检查端口是否被占用
lsof -i :3000
lsof -i :27017
lsof -i :6379

# 或修改.env中的端口配置
```

2. **查看日志**
```bash
./docker-scripts/logs.sh backend
```

3. **检查服务状态**
```bash
docker compose -f docker-compose.app.yml ps
```

### 数据库连接失败

1. **检查MongoDB是否就绪**
```bash
docker exec zhouyi-mongodb mongosh --eval "db.adminCommand('ping')"
```

2. **检查Redis是否就绪**
```bash
docker exec zhouyi-redis redis-cli -a redis123 ping
```

3. **查看数据库日志**
```bash
./docker-scripts/logs.sh mongodb
./docker-scripts/logs.sh redis
```

### 镜像构建失败

1. **清理Docker缓存**
```bash
docker builder prune -a
```

2. **重新构建**
```bash
docker compose -f docker-compose.app.yml build --no-cache
```

### 性能问题

1. **查看资源使用**
```bash
docker stats
```

2. **增加资源限制**
在 `docker-compose.app.yml` 中添加:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
```

---

## 生产环境部署

### 安全建议

1. **修改默认密码**
```bash
# 生成随机密码
openssl rand -hex 32

# 更新.env文件
MONGODB_PASSWORD=your_secure_password
REDIS_PASSWORD=your_secure_password
```

2. **使用HTTPS**
配置反向代理(Nginx)并启用SSL

3. **限制网络访问**
```yaml
# 在docker-compose.app.yml中
services:
  mongodb:
    ports:
      - "127.0.0.1:27017:27017"  # 仅本地访问
```

4. **启用防火墙**
```bash
# 只开放必要端口
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### 性能优化

1. **调整连接池**
```bash
# .env
MAX_POOL_SIZE=50
MIN_POOL_SIZE=10
```

2. **启用Redis持久化**
```yaml
# 已在docker-compose.app.yml中配置
command: redis-server --appendonly yes --requirepass redis123
```

3. **配置MongoDB副本集**
用于生产环境的高可用部署

### 监控

建议集成以下监控工具:

- **Prometheus**: 指标收集
- **Grafana**: 可视化监控
- **Sentry**: 错误追踪

---

## 开发环境

如果需要在开发环境中使用Docker:

```bash
# 使用开发配置
docker compose -f docker-compose.dev.yml up -d

# 开发配置会挂载本地代码卷,支持热重载
```

---

## 更新部署

```bash
# 1. 备份数据(可选)
./docker-scripts/backup.sh

# 2. 拉取最新代码
git pull

# 3. 重新构建并启动
./start.sh

# 4. 检查服务状态
./docker-scripts/health.sh
```

---

## 技术支持

遇到问题?

1. 查看 [Docker文档](https://docs.docker.com/)
2. 检查日志: `./docker-scripts/logs.sh`
3. 运行健康检查: `./docker-scripts/health.sh`
4. 提交Issue到项目仓库

---

## 许可证

MIT License
