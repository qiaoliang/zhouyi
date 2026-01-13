# 🚀 快速启动

## 一键启动 (推荐)

### Linux/macOS
```bash
./start.sh
```

### Windows
```cmd
start.bat
```

## 前置要求

- Docker (20.10+)
- Docker Compose (2.0+)

## 首次运行

脚本会自动创建 `.env` 配置文件,请修改其中的配置后重新运行。

## 访问地址

启动成功后访问:

- **后端API**: http://localhost:3000
- **API文档**: http://localhost:3000/api/docs
- **MongoDB管理**: http://localhost:8081 (admin/admin123)
- **Redis管理**: http://localhost:8082

## 常用命令

```bash
# 启动服务
./start.sh

# 查看日志
./docker-scripts/logs.sh

# 健康检查
./docker-scripts/health.sh

# 停止服务
./docker-scripts/stop.sh

# 重启服务
./docker-scripts/restart.sh

# 清理资源
./docker-scripts/clean.sh
```

## 详细文档

完整文档请查看: [DOCKER.md](./DOCKER.md)

---

## 目录结构

```
zhouyi/
├── start.sh                    # 一键启动脚本 (Linux/macOS)
├── start.bat                   # 一键启动脚本 (Windows)
├── docker-compose.app.yml      # 应用服务配置
├── Dockerfile.backend          # 后端Dockerfile
├── docker-scripts/             # Docker管理脚本
│   ├── stop.sh                # 停止服务
│   ├── restart.sh             # 重启服务
│   ├── logs.sh                # 查看日志
│   ├── health.sh              # 健康检查
│   └── clean.sh               # 清理资源
└── DOCKER.md                   # 详细文档
```
