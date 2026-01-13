#!/bin/bash

# 周易通 - 清理脚本
# 用于清理Docker资源

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

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示使用说明
show_usage() {
    echo "用法: ./docker-scripts/clean.sh [选项]"
    echo ""
    echo "选项:"
    echo "  --volumes        同时删除数据卷 (危险操作!)"
    echo "  --images         同时删除镜像"
    echo "  --all            清理所有资源 (最危险!)"
    echo "  -h, --help       显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  ./docker-scripts/clean.sh              # 停止并删除容器"
    echo "  ./docker-scripts/clean.sh --volumes    # 同时删除数据"
    echo "  ./docker-scripts/clean.sh --all        # 清理所有"
}

# 清理容器
clean_containers() {
    print_info "停止并删除容器..."

    if docker compose version &> /dev/null; then
        docker compose -f $COMPOSE_FILE --env-file ../.env down -v --remove-orphans
    else
        docker-compose -f $COMPOSE_FILE --env-file ../.env down -v --remove-orphans
    fi

    print_success "容器已清理"
}

# 清理数据卷
clean_volumes() {
    print_warning "即将删除所有数据卷,此操作不可恢复!"
    read -p "确认删除? [yes/NO]: " confirm

    if [ "$confirm" = "yes" ]; then
        print_info "删除数据卷..."

        docker volume rm zhouyi_mongodb_data 2>/dev/null || true
        docker volume rm zhouyi_mongodb_config 2>/dev/null || true
        docker volume rm zhouyi_redis_data 2>/dev/null || true

        print_success "数据卷已删除"
    else
        print_info "已取消删除数据卷"
    fi
}

# 清理镜像
clean_images() {
    print_info "删除项目相关镜像..."

    # 删除项目镜像
    docker rmi zhouyi-backend 2>/dev/null || true

    print_success "镜像已删除"
}

# 清理所有
clean_all() {
    print_warning "警告: 这将删除所有相关资源!"
    read -p "确认执行? [yes/NO]: " confirm

    if [ "$confirm" = "yes" ]; then
        clean_containers
        clean_volumes
        clean_images

        # 清理悬空镜像
        print_info "清理悬空镜像..."
        docker image prune -f

        # 清理未使用的网络
        print_info "清理未使用的网络..."
        docker network prune -f

        print_success "所有资源已清理"
    else
        print_info "已取消清理"
    fi
}

# 显示清理后的磁盘空间
show_disk_space() {
    echo ""
    print_info "Docker磁盘使用情况:"
    docker system df
}

# 主函数
main() {
    echo -e "${BLUE}"
    echo "========================================"
    echo "  周易通 - 清理Docker资源"
    echo "========================================"
    echo -e "${NC}"

    if [ $# -eq 0 ]; then
        # 默认只清理容器
        clean_containers
    else
        case "$1" in
            --volumes)
                clean_containers
                clean_volumes
                ;;
            --images)
                clean_containers
                clean_images
                ;;
            --all)
                clean_all
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                print_error "未知选项: $1"
                show_usage
                exit 1
                ;;
        esac
    fi

    show_disk_space

    echo ""
    print_info "使用 ./start.sh 重新启动服务"
    echo ""
}

main "$@"
