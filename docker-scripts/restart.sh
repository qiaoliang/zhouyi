#!/bin/bash

# 周易通 - 重启服务脚本

set -e

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# 打印带颜色的信息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# 主函数
main() {
    echo -e "${BLUE}"
    echo "========================================"
    echo "  周易通 - 重启服务"
    echo "========================================"
    echo -e "${NC}"

    print_info "停止服务..."
    ./docker-scripts/stop.sh

    print_info "启动服务..."
    ./start.sh

    print_success "服务重启完成"
}

main
