#!/bin/bash

# 周易通 - 一键启动脚本
# 自动启动所有Docker服务

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目信息
PROJECT_NAME="zhouyi"
COMPOSE_FILE="docker-compose.app.yml"

# 打印带颜色的信息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 打印标题
print_title() {
    echo -e "${BLUE}"
    echo "========================================"
    echo "  周易通 - ZhouYi Tong"
    echo "  一键启动脚本"
    echo "========================================"
    echo -e "${NC}"
}

# 检查Docker是否安装
check_docker() {
    print_info "检查Docker环境..."

    if ! command -v docker &> /dev/null; then
        print_error "Docker未安装，请先安装Docker"
        echo "安装指南: https://docs.docker.com/get-docker/"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose未安装，请先安装Docker Compose"
        exit 1
    fi

    print_success "Docker环境检查通过"
}

# 检查环境变量文件
check_env_file() {
    print_info "检查环境变量文件..."

    if [ ! -f ".env" ]; then
        print_warning ".env文件不存在，创建默认配置..."

        cat > .env << EOF
# 微信小程序配置
WECHAT_APP_ID=your_wechat_app_id
WECHAT_APP_SECRET=your_wechat_app_secret

# JWT密钥 (请修改为随机字符串)
JWT_SECRET=$(openssl rand -hex 32)

# 端口配置
BACKEND_PORT=3000
MONGODB_PORT=27017
REDIS_PORT=6379

# 数据库配置
MONGODB_USERNAME=admin
MONGODB_PASSWORD=admin123

# Redis配置
REDIS_PASSWORD=redis123
EOF

        print_success ".env文件已创建"
        print_warning "请修改.env文件中的配置后重新运行脚本"
        exit 0
    fi

    print_success "环境变量文件检查通过"
}

# 创建必要的目录
create_directories() {
    print_info "创建必要的目录..."

    mkdir -p logs
    mkdir -p uploads

    print_success "目录创建完成"
}

# 拉取最新镜像
pull_images() {
    print_info "拉取Docker镜像..."

    if docker compose version &> /dev/null; then
        docker compose -f $COMPOSE_FILE pull
    else
        docker-compose -f $COMPOSE_FILE pull
    fi

    print_success "镜像拉取完成"
}

# 构建应用镜像
build_images() {
    print_info "构建应用镜像..."

    if docker compose version &> /dev/null; then
        docker compose -f $COMPOSE_FILE build
    else
        docker-compose -f $COMPOSE_FILE build
    fi

    print_success "镜像构建完成"
}

# 启动服务
start_services() {
    print_info "启动Docker服务..."

    if docker compose version &> /dev/null; then
        docker compose -f $COMPOSE_FILE up -d
    else
        docker-compose -f $COMPOSE_FILE up -d
    fi

    print_success "服务启动完成"
}

# 等待服务就绪
wait_for_services() {
    print_info "等待服务启动..."

    # 等待MongoDB
    print_info "等待MongoDB启动..."
    max_attempts=30
    attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if docker exec zhouyi-mongodb mongosh --eval "db.adminCommand('ping')" &> /dev/null; then
            print_success "MongoDB已就绪"
            break
        fi
        attempt=$((attempt + 1))
        sleep 2
    done

    if [ $attempt -eq $max_attempts ]; then
        print_error "MongoDB启动超时"
        exit 1
    fi

    # 等待Redis
    print_info "等待Redis启动..."
    attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if docker exec zhouyi-redis redis-cli -a redis123 ping &> /dev/null; then
            print_success "Redis已就绪"
            break
        fi
        attempt=$((attempt + 1))
        sleep 2
    done

    if [ $attempt -eq $max_attempts ]; then
        print_error "Redis启动超时"
        exit 1
    fi

    # 等待后端API
    print_info "等待后端API启动..."
    attempt=0

    while [ $attempt -lt $max_attempts ]; do
        if curl -s http://localhost:3000/health &> /dev/null; then
            print_success "后端API已就绪"
            break
        fi
        attempt=$((attempt + 1))
        sleep 2
    done

    if [ $attempt -eq $max_attempts ]; then
        print_warning "后端API可能还在启动中，请稍后检查"
    fi
}

# 显示服务状态
show_status() {
    echo ""
    print_info "服务状态:"

    if docker compose version &> /dev/null; then
        docker compose -f $COMPOSE_FILE ps
    else
        docker-compose -f $COMPOSE_FILE ps
    fi
}

# 显示访问信息
show_access_info() {
    echo ""
    echo -e "${GREEN}========================================"
    echo "  服务启动成功！"
    echo "========================================${NC}"
    echo ""
    echo -e "${BLUE}服务访问地址:${NC}"
    echo -e "  后端 API:        ${GREEN}http://localhost:3000${NC}"
    echo -e "  API文档:         ${GREEN}http://localhost:3000/api/docs${NC}"
    echo -e "  MongoDB Express: ${GREEN}http://localhost:8081${NC}"
    echo -e "  Redis Commander: ${GREEN}http://localhost:8082${NC}"
    echo ""
    echo -e "${BLUE}数据库连接信息:${NC}"
    echo -e "  MongoDB:         ${GREEN}mongodb://localhost:27017${NC}"
    echo -e "  Redis:           ${GREEN}redis://localhost:6379${NC}"
    echo ""
    echo -e "${BLUE}默认账号密码:${NC}"
    echo -e "  MongoDB:         admin / admin123"
    echo -e "  Mongo Express:   admin / admin123"
    echo ""
    echo -e "${YELLOW}常用命令:${NC}"
    echo "  查看日志: ./docker-scripts/logs.sh"
    echo "  停止服务: ./docker-scripts/stop.sh"
    echo "  重启服务: ./docker-scripts/restart.sh"
    echo ""
}

# 主函数
main() {
    print_title

    # 检查环境
    check_docker
    check_env_file
    create_directories

    # 询问是否重新构建
    echo ""
    read -p "$(echo -e ${YELLOW}是否重新构建镜像? [y/N]: ${NC})" rebuild

    if [ "$rebuild" = "y" ] || [ "$rebuild" = "Y" ]; then
        pull_images
        build_images
    fi

    # 启动服务
    start_services

    # 等待服务就绪
    wait_for_services

    # 显示状态和访问信息
    show_status
    show_access_info
}

# 运行主函数
main
