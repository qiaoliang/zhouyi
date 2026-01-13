#!/bin/bash

# 周易通 - 查看日志脚本

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

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# 显示使用说明
show_usage() {
    echo "用法: ./docker-scripts/logs.sh [选项] [服务名]"
    echo ""
    echo "选项:"
    echo "  -f, --follow     持续跟踪日志输出"
    echo "  -n, --lines N    显示最后N行日志 (默认: 100)"
    echo "  -h, --help       显示此帮助信息"
    echo ""
    echo "服务名:"
    echo "  backend          后端API服务"
    echo "  mongodb          MongoDB数据库"
    echo "  redis            Redis缓存"
    echo "  mongo-express    MongoDB管理界面"
    echo "  redis-commander  Redis管理界面"
    echo ""
    echo "示例:"
    echo "  ./docker-scripts/logs.sh                    # 查看所有服务日志"
    echo "  ./docker-scripts/logs.sh -f backend         # 持续查看后端日志"
    echo "  ./docker-scripts/logs.sh -n 50 mongodb      # 查看MongoDB最后50行"
}

# 查看日志
view_logs() {
    local service=""
    local follow=false
    local lines=100

    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -f|--follow)
                follow=true
                shift
                ;;
            -n|--lines)
                lines="$2"
                shift 2
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            backend|mongodb|redis|mongo-express|redis-commander)
                service="$1"
                shift
                ;;
            *)
                print_warning "未知参数: $1"
                show_usage
                exit 1
                ;;
        esac
    done

    # 构建docker-compose logs命令
    local cmd="docker compose -f $COMPOSE_FILE logs"

    if [ "$follow" = true ]; then
        cmd="$cmd --follow"
    fi

    cmd="$cmd --tail $lines"

    if [ -n "$service" ]; then
        cmd="$cmd $service"
    fi

    echo -e "${BLUE}========================================${NC}"
    print_info "查看服务日志"
    echo -e "${BLUE}========================================${NC}"

    # 执行命令
    eval $cmd
}

# 主函数
main() {
    if [ $# -eq 0 ]; then
        view_logs
    else
        view_logs "$@"
    fi
}

main "$@"
