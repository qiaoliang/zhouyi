#!/bin/bash

# 周易通 - 健康检查脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 打印带颜色的信息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✔]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✘]${NC} $1"
}

# 检查服务健康状态
check_service() {
    local service_name="$1"
    local service_url="$2"
    local container_name="$3"

    # 检查容器是否运行
    if ! docker ps | grep -q "$container_name"; then
        print_error "$service_name: 容器未运行"
        return 1
    fi

    # 检查HTTP服务
    if [ -n "$service_url" ]; then
        if curl -sf "$service_url" > /dev/null 2>&1; then
            print_success "$service_name: 服务正常"
            return 0
        else
            print_error "$service_name: 服务无响应"
            return 1
        fi
    fi

    # 对于数据库服务
    print_success "$service_name: 容器运行中"
    return 0
}

# 检查MongoDB
check_mongodb() {
    if docker exec zhouyi-mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
        print_success "MongoDB: 数据库连接正常"

        # 显示数据库统计
        local stats=$(docker exec zhouyi-mongodb mongosh --quiet --eval "
            db.getMongo().getDBNames().forEach(function(name) {
                const count = db.getSiblingDB(name).countDocuments();
                print(name + ': ' + count + ' documents');
            });
        ")
        print_info "数据库统计:\n$stats"
        return 0
    else
        print_error "MongoDB: 无法连接"
        return 1
    fi
}

# 检查Redis
check_redis() {
    if docker exec zhouyi-redis redis-cli -a redis123 ping > /dev/null 2>&1; then
        print_success "Redis: 缓存服务正常"

        # 显示Redis信息
        local info=$(docker exec zhouyi-redis redis-cli -a redis123 INFO server | grep -E "redis_version|uptime_in_days")
        print_info "Redis信息:\n$info"
        return 0
    else
        print_error "Redis: 无法连接"
        return 1
    fi
}

# 检查后端API
check_backend() {
    if curl -sf http://localhost:3000/health > /dev/null 2>&1; then
        print_success "后端API: 服务正常"

        # 显示API信息
        local health=$(curl -s http://localhost:3000/health)
        print_info "API健康检查:\n$health"
        return 0
    else
        print_error "后端API: 无法连接"
        return 1
    fi
}

# 显示容器资源使用情况
show_resources() {
    echo ""
    print_info "容器资源使用情况:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

    echo ""
    print_info "磁盘使用情况:"
    docker system df
}

# 主函数
main() {
    echo -e "${BLUE}"
    echo "========================================"
    echo "  周易通 - 健康检查"
    echo "========================================"
    echo -e "${NC}"

    local all_healthy=true

    # 检查各个服务
    check_service "MongoDB" "" "zhouyi-mongodb" || all_healthy=false
    check_service "Redis" "" "zhouyi-redis" || all_healthy=false
    check_backend || all_healthy=false

    # 详细检查
    echo ""
    echo -e "${BLUE}========================================${NC}"
    print_info "详细检查"
    echo -e "${BLUE}========================================${NC}"

    check_mongodb || all_healthy=false
    echo ""
    check_redis || all_healthy=false
    echo ""
    check_backend || all_healthy=false

    # 显示资源使用
    show_resources

    # 总结
    echo ""
    echo -e "${BLUE}========================================${NC}"

    if [ "$all_healthy" = true ]; then
        print_success "所有服务运行正常"
        echo ""
        echo "访问地址:"
        echo -e "  后端API: ${GREEN}http://localhost:3000${NC}"
        echo -e "  API文档: ${GREEN}http://localhost:3000/api/docs${NC}"
    else
        print_error "部分服务存在问题,请查看日志"
        echo ""
        echo "查看日志:"
        echo "  ./docker-scripts/logs.sh"
        echo ""
        echo "重启服务:"
        echo "  ./docker-scripts/restart.sh"
    fi

    echo ""
}

main
