#!/bin/bash

# 本地开发环境配置函数模块

# 颜色定义
COLOR_RESET='\033[0m'
COLOR_BLUE='\033[0;34m'
COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[0;33m'
COLOR_PURPLE='\033[0;35m'
COLOR_RED='\033[0;31m'
COLOR_CYAN='\033[0;36m'

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# PID 目录
PID_DIR="$PROJECT_ROOT/.dev/pids"

# 日志目录
LOG_DIR="$PROJECT_ROOT/.dev/logs"

# 获取项目根目录
get_project_root() {
  echo "$PROJECT_ROOT"
}

# 获取 PID 文件路径
get_pid_file() {
  local service=$1
  echo "$PID_DIR/${service}.pid"
}

# 获取日志文件路径
get_log_file() {
  local service=$1
  echo "$LOG_DIR/${service}.log"
}

# 获取服务端口
get_service_port() {
  local service=$1
  case $service in
    mongodb) echo "27017" ;;
    redis) echo "6379" ;;
    backend) echo "3000" ;;
    frontend) echo "5173" ;;
    *) echo "" ;;
  esac
}

# 获取服务进程名
get_service_process() {
  local service=$1
  case $service in
    mongodb) echo "mongod" ;;
    redis) echo "redis-server" ;;
    backend) echo "node" ;;
    frontend) echo "node" ;;
    *) echo "" ;;
  esac
}

# 检查命令是否存在
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# 检查端口是否被占用
is_port_in_use() {
  local port=$1
  lsof -ti:$port >/dev/null 2>&1
}

# 获取占用端口的进程 PID
get_port_pid() {
  local port=$1
  lsof -ti:$port 2>/dev/null | head -1
}

# 检查端口是否被 Docker 容器占用
is_port_used_by_docker() {
  local port=$1
  local pid=$(get_port_pid "$port")
  
  if [[ -z "$pid" ]]; then
    return 1
  fi
  
  # 检查进程是否属于 Docker
  ps -p "$pid" -o command= 2>/dev/null | grep -q "docker"
}

# 获取占用端口的 Docker 容器名称
get_docker_container_for_port() {
  local port=$1
  local pid=$(get_port_pid "$port")
  
  if [[ -z "$pid" ]]; then
    echo ""
    return
  fi
  
  # 获取容器 ID
  local container_id=$(docker ps -q --filter "ancestor=$pid" 2>/dev/null)
  
  if [[ -z "$container_id" ]]; then
    # 尝试通过端口映射查找
    container_id=$(docker ps -q --filter "publish=$port" 2>/dev/null | head -1)
  fi
  
  if [[ -n "$container_id" ]]; then
    docker inspect --format='{{.Name}}' "$container_id" 2>/dev/null | sed 's/\///'
  fi
}

# 检查服务是否运行
is_service_running() {
  local service=$1
  local pid_file=$(get_pid_file "$service")
  
  if [[ ! -f "$pid_file" ]]; then
    return 1
  fi
  
  local pid=$(cat "$pid_file")
  ps -p "$pid" >/dev/null 2>&1
}

# 获取服务 PID
get_service_pid() {
  local service=$1
  local pid_file=$(get_pid_file "$service")
  
  if [[ -f "$pid_file" ]]; then
    cat "$pid_file"
  fi
}

# 保存服务 PID
save_pid() {
  local service=$1
  local pid=$2
  local pid_file=$(get_pid_file "$service")
  
  echo "$pid" > "$pid_file"
  chmod 600 "$pid_file"
}

# 删除服务 PID
remove_pid() {
  local service=$1
  local pid_file=$(get_pid_file "$service")
  
  rm -f "$pid_file"
}

# 打印带颜色的消息
print_info() {
  echo -e "${COLOR_BLUE}[INFO]${COLOR_RESET} $1"
}

print_success() {
  echo -e "${COLOR_GREEN}[SUCCESS]${COLOR_RESET} $1"
}

print_warning() {
  echo -e "${COLOR_YELLOW}[WARNING]${COLOR_RESET} $1"
}

print_error() {
  echo -e "${COLOR_RED}[ERROR]${COLOR_RESET} $1"
}

print_service() {
  local service=$1
  local message=$2
  
  case $service in
    mongodb)
      echo -e "${COLOR_YELLOW}[MongoDB]${COLOR_RESET} $message"
      ;;
    redis)
      echo -e "${COLOR_PURPLE}[Redis]${COLOR_RESET} $message"
      ;;
    backend)
      echo -e "${COLOR_BLUE}[Backend]${COLOR_RESET} $message"
      ;;
    frontend)
      echo -e "${COLOR_GREEN}[Frontend]${COLOR_RESET} $message"
      ;;
    *)
      echo "[${service}] $message"
      ;;
  esac
}

# 加载环境变量
load_env() {
  local env_file="$PROJECT_ROOT/.env"
  
  if [[ ! -f "$env_file" ]]; then
    print_error ".env 文件不存在，请先创建 .env 文件"
    exit 1
  fi
  
  # 检查 .env 文件权限
  local perms=$(stat -f "%Lp" "$env_file" 2>/dev/null || stat -c "%a" "$env_file" 2>/dev/null)
  if [[ -n "$perms" ]] && [[ "$perms" =~ ^[0-9]{3}$ ]]; then
    local others_perms="${perms: -1}"
    if [[ "$others_perms" -gt 0 ]]; then
      print_warning ".env 文件权限过于开放 ($perms)，建议设置为 600"
    fi
  fi
  
  # 导出环境变量
  set -a
  source "$env_file"
  set +a
}

# 检查 Node.js 版本
check_node_version() {
  if ! command_exists node; then
    print_error "Node.js 未安装，请先安装 Node.js >= 18"
    exit 1
  fi
  
  local node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
  if [[ "$node_version" -lt 18 ]]; then
    print_error "Node.js 版本过低 (当前: $node_version)，要求 >= 18"
    exit 1
  fi
}

# 检查 MongoDB 安装
check_mongodb() {
  if ! command_exists mongod; then
    print_error "MongoDB 未安装"
    echo ""
    echo "请使用以下命令安装 MongoDB："
    echo "  brew install mongodb-community"
    echo ""
    echo "或访问: https://www.mongodb.com/try/download/community"
    exit 1
  fi
}

# 检查 Redis 安装
check_redis() {
  if ! command_exists redis-server; then
    print_error "Redis 未安装"
    echo ""
    echo "请使用以下命令安装 Redis："
    echo "  brew install redis"
    echo ""
    echo "或访问: https://redis.io/download"
    exit 1
  fi
}

# 等待服务就绪
wait_for_service() {
  local service=$1
  local max_attempts=$2
  local check_command=$3
  
  print_service "$service" "等待服务启动..."
  
  for ((i=1; i<=max_attempts; i++)); do
    if eval "$check_command" >/dev/null 2>&1; then
      print_success "$service 服务已就绪"
      return 0
    fi
    
    sleep 1
  done
  
  print_error "$service 服务启动超时"
  return 1
}