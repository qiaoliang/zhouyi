#!/bin/bash

# 周易通 - 停止服务脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 项目配置
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

# 停止服务
stop_services() {
    print_info "停止所有服务..."

    if docker compose version &> /dev/null; then
        docker compose -f $COMPOSE_FILE --env-file ../.env down
    else
        docker-compose -f $COMPOSE_FILE --env-file ../.env down
    fi

    print_success "所有服务已停止"
}

# 主函数
main() {
    echo -e "${BLUE}"
    echo "========================================"
    echo "  周易通 - 停止服务"
    echo "========================================"
    echo -e "${NC}"

    stop_services

    echo ""
    print_info "使用以下命令重新启动:"
    echo "  ./start.sh"
    echo ""
}

main
