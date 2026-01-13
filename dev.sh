#!/bin/bash

# 本地开发一键启动脚本
# 用于在本地运行前后台服务，方便调试

set -e

# 加载配置和服务模块
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/.dev/config.sh"
source "$SCRIPT_DIR/.dev/services.sh"

# 显示帮助信息
show_help() {
  cat << EOF
本地开发一键启动脚本

用法: ./dev.sh [命令] [选项]

命令:
  start       启动所有服务
  stop        停止所有服务
  restart     重启所有服务
  status      查看服务状态
  logs        查看日志
  help        显示此帮助信息

日志命令:
  ./dev.sh logs [service]  查看指定服务的日志
  可用服务: mongodb, redis, backend, frontend

示例:
  ./dev.sh start           # 启动所有服务
  ./dev.sh stop            # 停止所有服务
  ./dev.sh logs backend    # 查看后端日志
  ./dev.sh status          # 查看服务状态

快捷键:
  Ctrl+C                    # 停止所有服务

EOF
}

# 启动所有服务
start_all() {
  print_info "开始启动所有服务..."
  echo ""
  
  # 检查 Docker 容器
  local docker_containers=($(check_docker_containers))
  if [[ ${#docker_containers[@]} -gt 0 ]]; then
    print_warning "检测到 Docker 容器正在运行："
    for item in "${docker_containers[@]}"; do
      local service=$(echo "$item" | cut -d'|' -f1)
      local container=$(echo "$item" | cut -d'|' -f2)
      echo "  - $service: $container"
    done
    echo ""
    read -p "是否停止 Docker 容器并启动本地服务? [y/N]: " choice
    
    if [[ "$choice" == "y" ]] || [[ "$choice" == "Y" ]]; then
      stop_docker_containers
    else
      print_info "使用 Docker 容器模式"
      echo ""
      echo "提示：使用 Docker Compose 管理 Docker 容器"
      echo "  启动: docker-compose -f docker-compose.app.yml up -d"
      echo "  停止: docker-compose -f docker-compose.app.yml down"
      exit 0
    fi
  fi
  
  # 前置检查
  check_node_version
  check_mongodb
  check_redis
  load_env
  
  # 创建数据目录
  mkdir -p "$PROJECT_ROOT/.dev/data/mongodb"
  mkdir -p "$PROJECT_ROOT/.dev/data/redis"
  
  # 启动服务
  local failed=0
  
  # 启动 MongoDB
  if ! start_mongodb; then
    failed=1
  fi
  
  # 启动 Redis
  if ! start_redis; then
    failed=1
  fi
  
  # 启动后端 API
  if ! start_backend; then
    failed=1
  fi
  
  # 启动前端 Web
  if ! start_frontend; then
    failed=1
  fi
  
  echo ""
  
  if [[ $failed -eq 0 ]]; then
    print_success "所有服务启动成功！"
    echo ""
    show_status
  else
    print_error "部分服务启动失败，正在停止已启动的服务..."
    stop_all
    exit 1
  fi
}

# 停止所有服务
stop_all() {
  print_info "停止所有服务..."
  echo ""
  
  # 按相反顺序停止服务
  stop_frontend
  stop_backend
  stop_redis
  stop_mongodb
  
  echo ""
  print_success "所有服务已停止"
}

# 重启所有服务
restart_all() {
  print_info "重启所有服务..."
  echo ""
  
  stop_all
  sleep 2
  start_all
}

# 查看日志
show_logs() {
  local service=$1
  
  if [[ -z "$service" ]]; then
    print_error "请指定要查看的服务日志"
    echo ""
    echo "可用服务: mongodb, redis, backend, frontend"
    echo ""
    echo "示例: ./dev.sh logs backend"
    exit 1
  fi
  
  local log_file=$(get_log_file "$service")
  
  if [[ ! -f "$log_file" ]]; then
    print_error "日志文件不存在: $log_file"
    exit 1
  fi
  
  echo "显示 $service 服务日志 (Ctrl+C 退出):"
  echo ""
  
  tail -f "$log_file"
}

# 处理 Ctrl+C 信号
handle_interrupt() {
  echo ""
  echo ""
  print_warning "收到中断信号，正在停止所有服务..."
  stop_all
  exit 0
}

# 主函数
main() {
  local command=$1
  
  # 设置信号处理
  trap handle_interrupt INT TERM
  
  case $command in
    start)
      start_all
      ;;
    stop)
      stop_all
      ;;
    restart)
      restart_all
      ;;
    status)
      show_status
      ;;
    logs)
      show_logs "$2"
      ;;
    help|--help|-h)
      show_help
      ;;
    "")
      show_help
      ;;
    *)
      print_error "未知命令: $command"
      echo ""
      show_help
      exit 1
      ;;
  esac
}

# 运行主函数
main "$@"