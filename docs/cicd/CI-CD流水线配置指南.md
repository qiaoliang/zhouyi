# 周易通APP - CI/CD流水线配置指南

## 文档信息

| 项目 | 内容 |
|------|------|
| 文档版本 | v1.0 |
| 创建日期 | 2026-01-11 |
| CI平台 | GitHub Actions / GitLab CI |

---

## 1. CI/CD架构概览

### 1.1 流程图

```
┌─────────────────────────────────────────────────────────────┐
│                    CI/CD 流程图                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  开发者提交代码                                               │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────────┐                                            │
│  │ Git Push    │                                            │
│  └──────┬──────┘                                            │
│         │                                                     │
│         ▼                                                     │
│  ┌─────────────┐     ┌──────────────┐                       │
│  │ 触发 CI/CD  │────►│ 代码检查     │                       │
│  │ (GitHub/GitLab)│ │ • ESLint      │                       │
│  └─────────────┘     │ • Prettier    │                       │
│         │            │ • TypeScript  │                       │
│         │            └──────┬───────┘                       │
│         │                   │                                │
│         ▼                   ▼                                │
│  ┌─────────────┐     ┌──────────────┐                       │
│  │ 单元测试    │◄────│ 代码质量检查 │                       │
│  │ • Jest      │     │ • SonarQube  │                       │
│  │ • Coverage │     └──────┬───────┘                       │
│  └──────┬──────┘            │                                │
│         │                   │                                │
│         ▼                   ▼                                │
│  ┌─────────────┐     ┌──────────────┐                       │
│  │ 构建项目    │◄────│ 安全扫描     │                       │
│  │ • NestJS    │     │ • npm audit  │                       │
│  │ • React Native│    │ • Snyk       │                       │
│  │ • Taro      │     └──────┬───────┘                       │
│  └──────┬──────┘            │                                │
│         │                   │                                │
│         ▼                   ▼                                │
│  ┌─────────────┐     ┌──────────────┐                       │
│  │ Docker构建  │◄────│ 依赖检查     │                       │
│  │ • 镜像构建  │     │ • 版本检查   │                       │
│  │ • 推送到仓库│     │ • 漏洞扫描   │                       │
│  └──────┬──────┘     └──────┬───────┘                       │
│         │                   │                                │
│         ▼                   ▼                                │
│  ┌─────────────────────────────┐                            │
│  │        部署阶段              │                            │
│  ├─────────────────────────────┤                            │
│  │ 开发环境 → 自动部署          │                            │
│  │ 测试环境 → 手动审批          │                            │
│  │ 生产环境 → 手动审批 + 脚本   │                            │
│  └─────────────────────────────┘                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. GitHub Actions配置

### 2.1 目录结构

```
.github/
└── workflows/
    ├── ci.yml                    # 持续集成
    ├── cd-dev.yml                # 部署到开发环境
    ├── cd-staging.yml            # 部署到测试环境
    └── cd-production.yml         # 部署到生产环境
```

---

### 2.2 CI流水线配置

```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  push:
    branches: [develop, main]
  pull_request:
    branches: [develop, main]

env:
  NODE_VERSION: '20.x'
  PNPM_VERSION: '8.x'

jobs:
  # 代码质量检查
  lint:
    name: Code Quality Check
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run ESLint
        run: pnpm lint

      - name: Check code formatting
        run: pnpm format:check

  # TypeScript类型检查
  type-check:
    name: TypeScript Check
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: TypeScript check
        run: pnpm tsc --noEmit

  # 单元测试
  test:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm test:ci

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella

  # 安全审计
  security:
    name: Security Audit
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Run npm audit
        run: pnpm audit --audit-level moderate
        continue-on-error: true

      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high

  # 构建项目
  build:
    name: Build Project
    runs-on: ubuntu-latest
    needs: [lint, type-check, test, security]
    strategy:
      matrix:
        project: [backend, frontend-native, frontend-miniprogram, frontend-h5]
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: ${{ env.PNPM_VERSION }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build ${{ matrix.project }}
        run: pnpm build:${{ matrix.project }}

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: ${{ matrix.project }}-build
          path: |
            apps/${{ matrix.project }}/dist
            apps/${{ matrix.project }}/build
          retention-days: 7

  # Docker镜像构建
  docker:
    name: Build Docker Images
    runs-on: ubuntu-latest
    needs: build
    if: github.event_name == 'push' && github.ref == 'refs/heads/develop'
    strategy:
      matrix:
        service: [api, worker]
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: ./apps/backend
          file: ./apps/backend/Dockerfile
          push: true
          tags: |
            zhouyi/${{ matrix.service }}:latest
            zhouyi/${{ matrix.service }}:${{ github.sha }}
          cache-from: type=registry,ref=zhouyi/${{ matrix.service }}:buildcache
          cache-to: type=registry,ref=zhouyi/${{ matrix.service }}:buildcache,mode=max
```

---

### 2.3 CD部署配置

#### 开发环境自动部署

```yaml
# .github/workflows/cd-dev.yml
name: CD - Development

on:
  push:
    branches: [develop]

jobs:
  deploy-backend:
    name: Deploy Backend to Dev
    runs-on: ubuntu-latest
    environment:
      name: development
      url: https://api-dev.zhouyi.example.com
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.DEV_HOST }}
          username: ${{ secrets.DEV_USERNAME }}
          key: ${{ secrets.DEV_SSH_KEY }}
          script: |
            cd /app/zhouyi-api
            git pull origin develop
            pnpm install
            pnpm build
            pm2 restart zhouyi-api

      - name: Health check
        run: |
          sleep 10
          curl -f https://api-dev.zhouyi.example.com/api/v1/health || exit 1

  deploy-frontend:
    name: Deploy Frontend to Dev
    runs-on: ubuntu-latest
    environment:
      name: development
      url: https://dev.zhouyi.example.com
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'

      - name: Install dependencies
        run: |
          cd apps/h5
          pnpm install

      - name: Build
        run: |
          cd apps/h5
          pnpm build

      - name: Deploy to OSS
        run: |
          npx ossutil cp -r -f apps/h5/dist oss://zhouyi-dev/h5/

      - name: Invalidate CDN cache
        run: |
          curl -X POST "https://cdn.aliyun.com/api/refresh" \
            -H "Authorization: Bearer ${{ secrets.CDN_TOKEN }}" \
            -d '{"dirs": ["https://dev.zhouyi.example.com/*"]}'
```

#### 生产环境手动审批部署

```yaml
# .github/workflows/cd-production.yml
name: CD - Production

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    environment:
      name: production
      url: https://api.zhouyi.example.com
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Deploy to production
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USERNAME }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            cd /app/zhouyi-api
            git fetch --tags
            git checkout ${{ github.ref_name }}
            pnpm install
            pnpm build
            pm2 restart zhouyi-api

      - name: Health check
        run: |
          sleep 15
          curl -f https://api.zhouyi.example.com/api/v1/health || exit 1

      - name: Notify team
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: |
            Production deployment ${{ job.status }}
            Tag: ${{ github.ref_name }}
            Commit: ${{ github.sha }}
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
        if: always()
```

---

## 3. GitLab CI配置

```yaml
# .gitlab-ci.yml
stages:
  - lint
  - test
  - build
  - deploy

variables:
  NODE_VERSION: "20"
  PNPM_VERSION: "8"
  DOCKER_DRIVER: overlay2
  DOCKER_TLS_CERTDIR: "/certs"

# 代码检查
lint:
  stage: lint
  image: node:20
  cache:
    key: ${CI_COMMIT_REF_SLUG}
    paths:
      - node_modules/
      - .pnpm-store/
  before_script:
    - npm install -g pnpm@${PNPM_VERSION}
    - pnpm install --frozen-lockfile
  script:
    - pnpm lint
    - pnpm format:check
  only:
    - merge_requests
    - develop
    - main

# 测试
test:
  stage: test
  image: node:20
  cache:
    key: ${CI_COMMIT_REF_SLUG}
    paths:
      - node_modules/
      - .pnpm-store/
    policy: pull
  before_script:
    - npm install -g pnpm@${PNPM_VERSION}
    - pnpm install --frozen-lockfile
  script:
    - pnpm test:ci
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
    paths:
      - coverage/
    expire_in: 30 days
  only:
    - merge_requests
    - develop
    - main

# 构建
build:
  stage: build
  image: node:20
  cache:
    key: ${CI_COMMIT_REF_SLUG}
    paths:
      - node_modules/
      - .pnpm-store/
    policy: pull
  before_script:
    - npm install -g pnpm@${PNPM_VERSION}
    - pnpm install --frozen-lockfile
  script:
    - pnpm build
  artifacts:
    paths:
      - dist/
    expire_in: 7 days
  only:
    - develop
    - main
  tags:
    - docker

# Docker构建
docker-build:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA -t $CI_REGISTRY_IMAGE:latest .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
    - docker push $CI_REGISTRY_IMAGE:latest
  only:
    - develop
    - main
  tags:
    - docker

# 部署到开发环境
deploy:dev:
  stage: deploy
  image: alpine:3.18
  before_script:
    - apk add --no-cache openssh-client
    - eval $(ssh-agent -s)
    - echo "$DEV_SSH_KEY" | tr -d '\r' | ssh-add -
    - mkdir -p ~/.ssh
    - chmod 700 ~/.ssh
    - echo "$DEV_SSH_HOST_KEY" >> ~/.ssh/known_hosts
  script:
    - ssh $DEV_USER@$DEV_HOST "cd /app/zhouyi-api && git pull origin develop && pnpm install && pnpm build && pm2 restart zhouyi-api"
  environment:
    name: development
    url: https://api-dev.zhouyi.example.com
  only:
    - develop
  tags:
    - docker

# 部署到生产环境
deploy:production:
  stage: deploy
  image: alpine:3.18
  before_script:
    - apk add --no-cache openssh-client
    - eval $(ssh-agent -s)
    - echo "$PROD_SSH_KEY" | tr -d '\r' | ssh-add -
    - mkdir -p ~/.ssh
    - chmod 700 ~/.ssh
    - echo "$PROD_SSH_HOST_KEY" >> ~/.ssh/known_hosts
  script:
    - ssh $PROD_USER@$PROD_HOST "cd /app/zhouyi-api && git fetch --tags && git checkout $CI_COMMIT_TAG && pnpm install && pnpm build && pm2 restart zhouyi-api"
  environment:
    name: production
    url: https://api.zhouyi.example.com
  when: manual
  only:
    - tags
  tags:
    - docker
```

---

## 4. Docker配置

### 4.1 后端Dockerfile

```dockerfile
# apps/backend/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# 安装pnpm
RUN npm install -g pnpm

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 构建项目
RUN pnpm build

# 生产环境镜像
FROM node:20-alpine AS production

WORKDIR /app

# 安装pnpm
RUN npm install -g pnpm

# 复制依赖文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# 仅安装生产依赖
RUN pnpm install --prod --frozen-lockfile

# 从构建阶段复制构建结果
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/v1/health', (r) => {if(r.statusCode !== 200) process.exit(1)})"

# 启动应用
CMD ["node", "dist/main.js"]
```

---

### 4.2 Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  # 后端API
  api:
    build:
      context: ./apps/backend
      dockerfile: Dockerfile
    container_name: zhouyi-api
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - MONGODB_URI=mongodb://mongodb:27017/zhouyi
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - mongodb
      - redis
    restart: unless-stopped
    networks:
      - zhouyi-network

  # MongoDB
  mongodb:
    image: mongo:7
    container_name: zhouyi-mongodb
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_DATABASE=zhouyi
    volumes:
      - mongodb-data:/data/db
      - mongodb-config:/data/configdb
    restart: unless-stopped
    networks:
      - zhouyi-network

  # Redis
  redis:
    image: redis:7-alpine
    container_name: zhouyi-redis
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis-data:/data
    restart: unless-stopped
    networks:
      - zhouyi-network

  # Nginx反向代理
  nginx:
    image: nginx:alpine
    container_name: zhouyi-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - api
    restart: unless-stopped
    networks:
      - zhouyi-network

volumes:
  mongodb-data:
  mongodb-config:
  redis-data:

networks:
  zhouyi-network:
    driver: bridge
```

---

## 5. 部署脚本

### 5.1 部署脚本

```bash
#!/bin/bash
# scripts/deploy.sh

set -e

# 配置
ENV=${1:-development}
PROJECT_DIR="/app/zhouyi-api"
BACKUP_DIR="/app/backups/zhouyi-api"

echo "🚀 开始部署到 $ENV 环境..."

# 备份当前版本
echo "📦 备份当前版本..."
mkdir -p $BACKUP_DIR
cp -r $PROJECT_DIR $BACKUP_DIR/$(date +%Y%m%d_%H%M%S)

# 拉取最新代码
echo "📥 拉取最新代码..."
cd $PROJECT_DIR
git fetch --tags
git checkout $BRANCH
git pull origin $BRANCH

# 安装依赖
echo "📦 安装依赖..."
pnpm install

# 构建项目
echo "🔨 构建项目..."
pnpm build

# 数据库迁移
echo "🗄️  运行数据库迁移..."
pnpm migrate

# 重启服务
echo "🔄 重启服务..."
pm2 restart zhouyi-api

# 健康检查
echo "🏥 健康检查..."
sleep 10
curl -f http://localhost:3000/api/v1/health || exit 1

echo "✅ 部署完成!"
```

---

### 5.2 回滚脚本

```bash
#!/bin/bash
# scripts/rollback.sh

set -e

BACKUP_DIR="/app/backups/zhouyi-api"
PROJECT_DIR="/app/zhouyi-api"

# 列出可用备份
echo "📋 可用备份:"
ls -lt $BACKUP_DIR

# 选择备份
read -p "请输入要回滚的备份目录名: " BACKUP_NAME

# 停止服务
pm2 stop zhouyi-api

# 恢复备份
rm -rf $PROJECT_DIR
cp -r $BACKUP_DIR/$BACKUP_NAME $PROJECT_DIR

# 重启服务
cd $PROJECT_DIR
pm2 restart zhouyi-api

echo "✅ 回滚完成!"
```

---

## 6. 环境变量管理

### 6.1 密钥配置

在GitHub/GitLab中配置以下Secrets：

```bash
# 服务器SSH密钥
DEV_HOST=dev.example.com
DEV_USERNAME=deploy
DEV_SSH_KEY=-----BEGIN OPENSSH PRIVATE KEY-----
DEV_SSH_HOST_KEY=dev.example.com ssh-rsa AAAAB3...

PROD_HOST=prod.example.com
PROD_USERNAME=deploy
PROD_SSH_KEY=-----BEGIN OPENSSH PRIVATE KEY-----
PROD_SSH_HOST_KEY=prod.example.com ssh-rsa AAAAB3...

# Docker Hub
DOCKER_USERNAME=username
DOCKER_PASSWORD=password

# 应用配置
JWT_SECRET=your-secret-key
MONGODB_URI=mongodb://...
REDIS_HOST=redis
```

---

## 7. 监控和通知

### 7.1 Slack通知配置

```yaml
# 在GitHub Actions中添加Slack通知
- name: Notify Slack
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: |
      Deployment ${{ job.status }}
      Environment: ${{ env.ENVIRONMENT }}
      Commit: ${{ github.sha }}
      Author: ${{ github.actor }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
  if: always()
```

---

## 8. 最佳实践

### 8.1 分支策略

```
main           # 生产环境，只接受merge request
  ├── develop  # 开发环境，日常开发分支
      ├── feature/*  # 功能分支
      ├── bugfix/*   # 修复分支
      └── hotfix/*   # 紧急修复分支
```

### 8.2 版本标签

```bash
# 创建版本标签
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# 标签格式
v1.0.0    # 主版本.次版本.修订版本
v1.0.0-beta.1    # 测试版本
v1.0.0-rc.1      # 候选版本
```

---

**文档编写**: Claude
**最后更新**: 2026-01-11
