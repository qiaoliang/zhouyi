# 本地开发一键启动脚本设计文档

## 概述

创建一个本地开发一键启动脚本 `dev.sh`，用于在本地运行前后台服务，方便调试，无需每次使用 Docker Compose。

## 设计目标

- 自动检查并启动 MongoDB 和 Redis 服务
- 启动后端 API 和 Web 前端
- 提供完整的启动/停止/重启/状态查看功能
- 检测本地安装，如果没有则提示用户安装
- 每个服务的日志分开显示（使用不同颜色或标签）

## 架构设计

### 文件结构

```
project-root/
├── dev.sh                    # 主脚本（可执行）
├── .dev/                     # 开发环境配置目录
│   ├── pids/                # PID 文件存储
│   ├── logs/                # 日志文件存储
│   └── config.sh            # 配置函数
└── .env                     # 环境变量配置
```

### 核心组件

1. **主脚本 `dev.sh`**：提供命令行界面，解析用户输入
2. **功能模块**：独立的功能函数，包括服务检测、启动、停止、状态检查
3. **配置管理**：从 `.env` 文件读取配置，支持环境变量覆盖
4. **日志系统**：使用不同颜色区分不同服务的日志输出

## 命令接口

```bash
./dev.sh start    # 启动所有服务
./dev.sh stop     # 停止所有服务
./dev.sh restart  # 重启所有服务
./dev.sh status   # 查看服务状态
./dev.sh logs [service]  # 查看日志
./dev.sh help     # 显示帮助信息
```

## 服务启动顺序

```
MongoDB (检查 mongod 命令)
  ↓
Redis (检查 redis-server 命令)
  ↓
Backend API (npm run start:dev)
  ↓
Web Frontend (cd frontend && npm run web)
```

## 颜色方案

- 后端日志：蓝色 `\033[0;34m`
- 前端日志：绿色 `\033[0;32m`
- MongoDB 日志：黄色 `\033[0;33m`
- Redis 日志：紫色 `\033[0;35m`
- 错误信息：红色 `\033[0;31m`
- 成功信息：青色 `\033[0;36m`

## 错误处理

### 前置检查

- Node.js 版本检查（要求 >= 18）
- .env 文件存在性检查
- MongoDB 和 Redis 安装检查

### 服务检测失败

如果 MongoDB 或 Redis 未安装，显示安装命令并退出：

```bash
# MongoDB
brew install mongodb-community

# Redis
brew install redis
```

### 端口冲突

检查端口占用：
- 3000 (Backend API)
- 27017 (MongoDB)
- 6379 (Redis)
- 5173 (Web Frontend)

如有冲突提示用户。

### 启动失败

如果某个服务启动失败：
- 立即停止已启动的服务
- 显示详细错误信息
- 清理 PID 文件

### 超时处理

每个服务启动设置超时时间：
- MongoDB: 30s
- Redis: 10s
- Backend: 20s
- Frontend: 15s

### 优雅停止

停止时发送 SIGTERM 信号，等待 5 秒后强制 SIGKILL。

## 状态信息格式

```
服务状态：
✓ MongoDB (PID: 12345) - 运行中
✓ Redis (PID: 12346) - 运行中
✓ Backend API (PID: 12347) - 运行中
✓ Web Frontend (PID: 12348) - 运行中

访问地址：
- Backend API: http://localhost:3000/api/v1
- Web Frontend: http://localhost:5173
```

## PID 管理

- 每个服务的 PID 存储在 `.dev/pids/{service}.pid`
- 启动时检查 PID 文件，如果进程存在则提示
- 停止时读取 PID 文件，发送信号后删除文件

## 日志管理

- 每个服务的日志同时输出到终端和文件 `.dev/logs/{service}.log`
- 使用 `tee` 命令实现双输出
- 日志文件按日期轮转（每天一个文件）

## 健康检查

- MongoDB: `mongosh --eval "db.adminCommand('ping')"`
- Redis: `redis-cli ping`
- Backend: `curl -s http://localhost:3000/health`
- Frontend: `curl -s http://localhost:5173`

## 性能优化

- 并行启动无依赖的服务（MongoDB 和 Redis 可以同时启动）
- 使用后台进程 + wait 等待关键服务就绪
- 延迟加载前端（等后端健康检查通过后再启动）
- 缓存服务检测结果（避免重复检查）

## 安全考虑

- 避免在日志中输出敏感信息（密码、密钥）
- PID 文件权限设置为 600（仅所有者可读写）
- 日志文件权限设置为 644
- 检查 .env 文件权限，警告过于开放的权限

## 用户体验优化

- 启动时显示进度条或步骤提示
- 使用 emoji 增强可读性（✓ ✗ ⏳ 🚀）
- 启动成功后显示访问地址和快捷命令
- 提供帮助信息（./dev.sh help）

## 边界情况处理

- .env 文件缺失或格式错误
- 端口被其他进程占用
- PID 文件存在但进程已死亡
- 服务启动超时
- 用户中断（Ctrl+C）处理
- 权限不足（无法创建 .dev 目录）

## 实施计划

1. 创建 `.dev` 目录结构
2. 实现配置函数模块
3. 实现服务检测功能
4. 实现服务启动/停止功能
5. 实现健康检查功能
6. 实现日志系统
7. 实现命令行接口
8. 测试和调试