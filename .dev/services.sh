#!/bin/bash

# 服务管理函数模块

# 加载配置
source "$(dirname "${BASH_SOURCE[0]}")/config.sh"

# 检查 Docker 容器是否正在运行
check_docker_containers() {
  local services=("mongodb" "redis" "backend")
  local docker_containers=()
  
  for service in "${services[@]}"; do
    local port=$(get_service_port "$service")
    if is_port_in_use "$port" && is_port_used_by_docker "$port"; then
      local container_name=$(get_docker_container_for_port "$port")
      docker_containers+=("$service|$container_name")
    fi
  done
  
  echo "${docker_containers[@]}"
}

# 停止 Docker 容器
stop_docker_containers() {
  print_info "检测到 Docker 容器正在运行，正在停止..."
  
  local docker_containers=($(check_docker_containers))
  
  if [[ ${#docker_containers[@]} -eq 0 ]]; then
    return 0
  fi
  
  echo ""
  echo "以下 Docker 容器正在运行："
  for item in "${docker_containers[@]}"; do
    local service=$(echo "$item" | cut -d'|' -f1)
    local container=$(echo "$item" | cut -d'|' -f2)
    echo "  - $service: $container"
  done
  echo ""
  
  # 停止 Docker 容器
  docker-compose -f "$PROJECT_ROOT/docker-compose.app.yml" down
  
  echo ""
  print_success "Docker 容器已停止"
  sleep 2
}

# 启动 MongoDB
start_mongodb() {
  local pid_file=$(get_pid_file "mongodb")
  local log_file=$(get_log_file "mongodb")
  
  # 检查是否已运行
  if is_service_running "mongodb"; then
    print_service "mongodb" "服务已在运行 (PID: $(get_service_pid "mongodb"))"
    return 0
  fi
  
  # 检查端口占用
  if is_port_in_use "27017"; then
    local pid=$(get_port_pid "27017")
    
    # 检查是否是 Docker 容器
    if is_port_used_by_docker "27017"; then
      local container=$(get_docker_container_for_port "27017")
      print_error "MongoDB 端口 27017 被 Docker 容器占用 ($container)"
      echo ""
      echo "请选择操作："
      echo "  1. 停止 Docker 容器并启动本地服务"
      echo "  2. 使用 Docker 容器（取消本地启动）"
      echo ""
      read -p "请输入选择 [1/2]: " choice
      
      case $choice in
        1)
          stop_docker_containers
          # 重新检查端口
          if is_port_in_use "27017"; then
            print_error "端口仍被占用，请手动处理"
            return 1
          fi
          ;;
        2)
          print_info "使用 Docker 容器模式"
          return 1
          ;;
        *)
          print_error "无效选择"
          return 1
          ;;
      esac
    else
      print_error "MongoDB 端口 27017 已被占用 (PID: $pid)"
      return 1
    fi
  fi
  
  print_service "mongodb" "启动服务..."
  
  # 启动 MongoDB
  mongod --dbpath "$PROJECT_ROOT/.dev/data/mongodb" \
         --logpath "$log_file" \
         --fork \
         --bind_ip 127.0.0.1 \
         --port 27017 \
         >/dev/null 2>&1
  
  if [[ $? -eq 0 ]]; then
    # 获取 PID
    local pid=$(pgrep mongod | head -1)
    save_pid "mongodb" "$pid"
    
    # 等待服务就绪
    wait_for_service "mongodb" 30 "mongosh --eval 'db.adminCommand(\"ping\")'"
    
    if [[ $? -eq 0 ]]; then
      print_success "MongoDB 启动成功 (PID: $pid)"
      return 0
    else
      print_error "MongoDB 启动失败"
      remove_pid "mongodb"
      return 1
    fi
  else
    print_error "MongoDB 启动失败"
    return 1
  fi
}

# 启动 Redis
start_redis() {
  local pid_file=$(get_pid_file "redis")
  local log_file=$(get_log_file "redis")
  
  # 检查是否已运行
  if is_service_running "redis"; then
    print_service "redis" "服务已在运行 (PID: $(get_service_pid "redis"))"
    return 0
  fi
  
  # 检查端口占用
  if is_port_in_use "6379"; then
    local pid=$(get_port_pid "6379")
    
    # 检查是否是 Docker 容器
    if is_port_used_by_docker "6379"; then
      local container=$(get_docker_container_for_port "6379")
      print_error "Redis 端口 6379 被 Docker 容器占用 ($container)"
      return 1
    else
      print_error "Redis 端口 6379 已被占用 (PID: $pid)"
      return 1
    fi
  fi
  
  print_service "redis" "启动服务..."
  
  # 启动 Redis
  redis-server --daemonize yes \
               --port 6379 \
               --bind 127.0.0.1 \
               --logfile "$log_file" \
               --dir "$PROJECT_ROOT/.dev/data/redis" \
               --appendonly yes \
               >/dev/null 2>&1
  
  if [[ $? -eq 0 ]]; then
    # 获取 PID
    local pid=$(pgrep redis-server | head -1)
    save_pid "redis" "$pid"
    
    # 等待服务就绪
    wait_for_service "redis" 10 "redis-cli ping"
    
    if [[ $? -eq 0 ]]; then
      print_success "Redis 启动成功 (PID: $pid)"
      return 0
    else
      print_error "Redis 启动失败"
      remove_pid "redis"
      return 1
    fi
  else
    print_error "Redis 启动失败"
    return 1
  fi
}

# 启动后端 API
start_backend() {
  local pid_file=$(get_pid_file "backend")
  local log_file=$(get_log_file "backend")
  
  # 检查是否已运行
  if is_service_running "backend"; then
    print_service "backend" "服务已在运行 (PID: $(get_service_pid "backend"))"
    return 0
  fi
  
  # 检查端口占用
  if is_port_in_use "3000"; then
    local pid=$(get_port_pid "3000")
    
    # 检查是否是 Docker 容器
    if is_port_used_by_docker "3000"; then
      local container=$(get_docker_container_for_port "3000")
      print_error "Backend 端口 3000 被 Docker 容器占用 ($container)"
      return 1
    else
      print_error "Backend 端口 3000 已被占用 (PID: $pid)"
      return 1
    fi
  fi
  
  print_service "backend" "启动服务..."
  
  # 创建数据目录
  mkdir -p "$PROJECT_ROOT/.dev/data/mongodb"
  mkdir -p "$PROJECT_ROOT/.dev/data/redis"
  
  # 启动后端
  cd "$PROJECT_ROOT"
  nohup npm run start:dev >"$log_file" 2>&1 &
  local pid=$!
  save_pid "backend" "$pid"
  
  # 等待服务就绪
  wait_for_service "backend" 20 "curl -s http://localhost:3000/health"
  
  if [[ $? -eq 0 ]]; then
    print_success "Backend API 启动成功 (PID: $pid)"
    return 0
  else
    print_error "Backend API 启动失败"
    remove_pid "backend"
    return 1
  fi
}

# 启动前端 Web
start_frontend() {
  local pid_file=$(get_pid_file "frontend")
  local log_file=$(get_log_file "frontend")
  
  # 检查是否已运行
  if is_service_running "frontend"; then
    print_service "frontend" "服务已在运行 (PID: $(get_service_pid "frontend"))"
    return 0
  fi
  
  # 检查端口占用
  if is_port_in_use "5173"; then
    local pid=$(get_port_pid "5173")
    print_error "Frontend 端口 5173 已被占用 (PID: $pid)"
    return 1
  fi
  
  print_service "frontend" "启动服务..."
  
  # 启动前端
  cd "$PROJECT_ROOT/frontend"
  nohup npm run web >"$log_file" 2>&1 &
  local pid=$!
  save_pid "frontend" "$pid"
  
  # 等待服务就绪
  wait_for_service "frontend" 15 "curl -s http://localhost:5173"
  
  if [[ $? -eq 0 ]]; then
    print_success "Web Frontend 启动成功 (PID: $pid)"
    return 0
  else
    print_error "Web Frontend 启动失败"
    remove_pid "frontend"
    return 1
  fi
}

# 停止 MongoDB
stop_mongodb() {
  if ! is_service_running "mongodb"; then
    print_service "mongodb" "服务未运行"
    return 0
  fi
  
  local pid=$(get_service_pid "mongodb")
  
  print_service "mongodb" "停止服务 (PID: $pid)..."
  
  # 发送 SIGTERM
  kill -TERM "$pid" 2>/dev/null
  
  # 等待进程结束
  local count=0
  while ps -p "$pid" >/dev/null 2>&1 && [[ $count -lt 5 ]]; do
    sleep 1
    ((count++))
  done
  
  # 如果还在运行，强制杀死
  if ps -p "$pid" >/dev/null 2>&1; then
    kill -KILL "$pid" 2>/dev/null
  fi
  
  remove_pid "mongodb"
  print_success "MongoDB 已停止"
}

# 停止 Redis
stop_redis() {
  if ! is_service_running "redis"; then
    print_service "redis" "服务未运行"
    return 0
  fi
  
  local pid=$(get_service_pid "redis")
  
  print_service "redis" "停止服务 (PID: $pid)..."
  
  # 发送 SIGTERM
  kill -TERM "$pid" 2>/dev/null
  
  # 等待进程结束
  local count=0
  while ps -p "$pid" >/dev/null 2>&1 && [[ $count -lt 5 ]]; do
    sleep 1
    ((count++))
  done
  
  # 如果还在运行，强制杀死
  if ps -p "$pid" >/dev/null 2>&1; then
    kill -KILL "$pid" 2>/dev/null
  fi
  
  remove_pid "redis"
  print_success "Redis 已停止"
}

# 停止后端 API
stop_backend() {
  if ! is_service_running "backend"; then
    print_service "backend" "服务未运行"
    return 0
  fi
  
  local pid=$(get_service_pid "backend")
  
  print_service "backend" "停止服务 (PID: $pid)..."
  
  # 发送 SIGTERM
  kill -TERM "$pid" 2>/dev/null
  
  # 等待进程结束
  local count=0
  while ps -p "$pid" >/dev/null 2>&1 && [[ $count -lt 5 ]]; do
    sleep 1
    ((count++))
  done
  
  # 如果还在运行，强制杀死
  if ps -p "$pid" >/dev/null 2>&1; then
    kill -KILL "$pid" 2>/dev/null
  fi
  
  remove_pid "backend"
  print_success "Backend API 已停止"
}

# 停止前端 Web
stop_frontend() {
  if ! is_service_running "frontend"; then
    print_service "frontend" "服务未运行"
    return 0
  fi
  
  local pid=$(get_service_pid "frontend")
  
  print_service "frontend" "停止服务 (PID: $pid)..."
  
  # 发送 SIGTERM
  kill -TERM "$pid" 2>/dev/null
  
  # 等待进程结束
  local count=0
  while ps -p "$pid" >/dev/null 2>&1 && [[ $count -lt 5 ]]; do
    sleep 1
    ((count++))
  done
  
  # 如果还在运行，强制杀死
  if ps -p "$pid" >/dev/null 2>&1; then
    kill -KILL "$pid" 2>/dev/null
  fi
  
  remove_pid "frontend"
  print_success "Web Frontend 已停止"
}

# 获取服务状态
get_service_status() {
  local service=$1
  local status="stopped"
  local pid=""
  
  if is_service_running "$service"; then
    status="running"
    pid=$(get_service_pid "$service")
  fi
  
  echo "$status|$pid"
}

# 显示所有服务状态
show_status() {
  echo ""
  echo "服务状态："
  echo ""
  
  local services=("mongodb" "redis" "backend" "frontend")
  
  for service in "${services[@]}"; do
    local status_info=$(get_service_status "$service")
    local status=$(echo "$status_info" | cut -d'|' -f1)
    local pid=$(echo "$status_info" | cut -d'|' -f2)
    
    if [[ "$status" == "running" ]]; then
      echo -e "  ✓ $service (PID: $pid) - 运行中"
    else
      echo -e "  ✗ $service - 未运行"
    fi
  done
  
  echo ""
  
  # 显示访问地址
  if is_service_running "backend"; then
    echo "访问地址："
    echo "  - Backend API: http://localhost:3000/api/v1"
  fi
  
  if is_service_running "frontend"; then
    echo "  - Web Frontend: http://localhost:5173"
  fi
  
  echo ""
}