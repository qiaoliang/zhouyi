#!/bin/bash

# 周易通 - 一键启动脚本
# 自动启动所有Docker服务

# 先检查帮助参数
for arg in "$@"; do
    case $arg in
        --help|-h)
            echo "用法: $0 [选项]"
            echo ""
            echo "选项:"
            echo "  --auto-cleanup    自动清理端口冲突和容器冲突，无需手动确认"
            echo "  --help, -h        显示此帮助信息"
            echo ""
            echo "示例:"
            echo "  $0                # 交互模式启动"
            echo "  $0 --auto-cleanup # 自动清理并启动"
            exit 0
            ;;
    esac
done

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

# 检查端口是否被占用
check_port() {
    local port=$1
    local service_name=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "端口 $port ($service_name) 已被占用"
        
        # 检查是否被 Docker 容器占用
        local container_name=$(docker ps -q --filter "publish=$port" 2>/dev/null | head -1)
        
        if [ -n "$container_name" ]; then
            local container_info=$(docker inspect --format='{{.Name}}' $container_name 2>/dev/null | sed 's/\///')
            print_warning "端口被 Docker 容器占用: $container_info"
            return 1
        else
            # 检查是否被本地进程占用
            local pid=$(lsof -ti:$port 2>/dev/null | head -1)
            if [ -n "$pid" ]; then
                local process_info=$(ps -p $pid -o command= 2>/dev/null)
                print_warning "端口被进程占用 (PID: $pid): $process_info"
                return 2
            fi
        fi
        
        return 0
    fi
    
    return 0
}

# 清理端口占用
cleanup_port() {
    local port=$1
    local service_name=$2
    
    print_info "清理端口 $port ($service_name) 的占用..."
    
    # 先尝试停止 Docker 容器
    local container_name=$(docker ps -q --filter "publish=$port" 2>/dev/null | head -1)
    if [ -n "$container_name" ]; then
        local container_info=$(docker inspect --format='{{.Name}}' $container_name 2>/dev/null | sed 's/\///')
        print_info "停止 Docker 容器: $container_info"
        docker stop $container_name >/dev/null 2>&1
        sleep 2
        
        # 检查端口是否释放
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            print_warning "Docker 容器停止后端口仍被占用"
        else
            print_success "端口已释放"
            return 0
        fi
    fi
    
    # 如果端口仍被占用，尝试终止进程
    local pid=$(lsof -ti:$port 2>/dev/null | head -1)
    if [ -n "$pid" ]; then
        print_warning "终止占用端口的进程 (PID: $pid)"
        kill -9 $pid >/dev/null 2>&1
        sleep 2
        
        # 检查端口是否释放
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            print_error "无法释放端口 $port"
            return 1
        else
            print_success "端口已释放"
            return 0
        fi
    fi
    
    return 0
}

# 检查并清理端口冲突
check_and_cleanup_ports() {
    print_info "检查端口冲突..."
    
    local ports_to_check=(
        "3000:后端API"
        "27017:MongoDB"
        "6379:Redis"
        "8081:MongoDB Express"
        "8082:Redis Commander"
    )
    
    local conflicts_found=0
    local auto_cleanup=false
    
    # 检查是否传入自动清理参数
    if [ "$1" = "--auto-cleanup" ]; then
        auto_cleanup=true
        print_info "自动清理模式已启用"
    fi
    
    for port_info in "${ports_to_check[@]}"; do
        IFS=':' read -r port service_name <<< "$port_info"
        
        check_port $port "$service_name"
        local status=$?
        
        if [ $status -eq 1 ]; then
            # Docker 容器占用
            conflicts_found=1
            if [ "$auto_cleanup" = true ]; then
                print_info "自动停止占用端口的 Docker 容器..."
                cleanup_port $port "$service_name"
            else
                read -p "$(echo -e ${YELLOW}是否停止占用端口的 Docker 容器? [y/N]: ${NC})" stop_container
                if [ "$stop_container" = "y" ] || [ "$stop_container" = "Y" ]; then
                    cleanup_port $port "$service_name"
                else
                    print_error "端口冲突未解决，无法启动服务"
                    exit 1
                fi
            fi
        elif [ $status -eq 2 ]; then
            # 本地进程占用
            conflicts_found=1
            if [ "$auto_cleanup" = true ]; then
                print_info "自动终止占用端口的进程..."
                cleanup_port $port "$service_name"
            else
                read -p "$(echo -e ${YELLOW}是否终止占用端口的进程? [y/N]: ${NC})" kill_process
                if [ "$kill_process" = "y" ] || [ "$kill_process" = "Y" ]; then
                    cleanup_port $port "$service_name"
                else
                    print_error "端口冲突未解决，无法启动服务"
                    exit 1
                fi
            fi
        fi
    done
    
    if [ $conflicts_found -eq 0 ]; then
        print_success "所有端口可用"
    fi
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

# 检查并停止冲突的 Docker 容器
check_and_stop_conflicting_containers() {
    print_info "检查 Docker 容器冲突..."
    
    # 定义需要检查的容器名称
    local containers=(
        "zhouyi-mongodb"
        "zhouyi-redis"
        "zhouyi-backend"
        "zhouyi-mongo-express"
        "zhouyi-redis-commander"
    )
    
    local conflicts_found=0
    
    for container in "${containers[@]}"; do
        if docker ps -a --format '{{.Names}}' | grep -q "^${container}$"; then
            if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
                print_warning "发现运行中的容器: $container"
                conflicts_found=1
            fi
        fi
    done
    
    if [ $conflicts_found -eq 1 ]; then
        echo ""
        read -p "$(echo -e ${YELLOW}检测到有 Docker 容器正在运行，是否停止它们? [y/N]: ${NC})" stop_containers
        
        if [ "$stop_containers" = "y" ] || [ "$stop_containers" = "Y" ]; then
            print_info "停止所有相关容器..."
            
            if docker compose version &> /dev/null; then
                docker compose -f $COMPOSE_FILE down 2>/dev/null || true
            else
                docker-compose -f $COMPOSE_FILE down 2>/dev/null || true
            fi
            
            # 手动停止可能残留的容器
            for container in "${containers[@]}"; do
                if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
                    print_info "停止容器: $container"
                    docker stop $container >/dev/null 2>&1
                fi
            done
            
            sleep 2
            print_success "所有容器已停止"
        else
            print_error "容器冲突未解决，无法启动服务"
            exit 1
        fi
    else
        print_success "无容器冲突"
    fi
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
    local auto_cleanup=false
    
    # 检查命令行参数
    for arg in "$@"; do
        case $arg in
            --auto-cleanup)
                auto_cleanup=true
                ;;
        esac
    done
    
    print_title

    # 检查环境
    check_docker
    check_env_file
    create_directories

    # 检查并清理端口冲突
    if [ "$auto_cleanup" = true ]; then
        check_and_cleanup_ports --auto-cleanup
    else
        check_and_cleanup_ports
    fi
    
    # 检查并停止冲突的容器
    if [ "$auto_cleanup" = true ]; then
        print_info "自动停止冲突的容器..."
        if docker compose version &> /dev/null; then
            docker compose -f $COMPOSE_FILE down 2>/dev/null || true
        else
            docker-compose -f $COMPOSE_FILE down 2>/dev/null || true
        fi
    else
        check_and_stop_conflicting_containers
    fi

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
