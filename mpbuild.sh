#!/bin/bash

# 微信小程序一键构建脚本
# 用于生成可在微信开发者工具中直接导入的编译结果

set -e

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
MINI_DIR="$FRONTEND_DIR/packages/mini"
DIST_DIR="$MINI_DIR/dist"
PROJECT_CONFIG="$DIST_DIR/project.config.json"

# 颜色定义
readonly COLOR_RED='\033[0;31m'
readonly COLOR_GREEN='\033[0;32m'
readonly COLOR_YELLOW='\033[0;33m'
readonly COLOR_BLUE='\033[0;34m'
readonly COLOR_RESET='\033[0m'

# 打印函数
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

# 显示帮助信息
show_help() {
    cat << EOF
微信小程序一键构建脚本

用法: ./mpbuild.sh [选项]

选项:
  -h, --help          显示此帮助信息
  --no-deps           跳过依赖检查和安装
  --clean             构建前清理 dist 目录

示例:
  ./mpbuild.sh                    # 完整构建（包含依赖检查）
  ./mpbuild.sh --no-deps          # 跳过依赖检查
  ./mpbuild.sh --clean            # 清理后构建

EOF
}

# 检查项目结构
check_project_structure() {
    print_info "检查项目结构..."

    if [[ ! -d "$FRONTEND_DIR" ]]; then
        print_error "frontend 目录不存在: $FRONTEND_DIR"
        exit 1
    fi

    if [[ ! -d "$MINI_DIR" ]]; then
        print_error "小程序目录不存在: $MINI_DIR"
        exit 1
    fi

    if [[ ! -f "$MINI_DIR/package.json" ]]; then
        print_error "小程序 package.json 不存在: $MINI_DIR/package.json"
        exit 1
    fi

    print_success "项目结构检查通过"
}

# 检查并安装依赖
check_and_install_dependencies() {
    print_info "检查依赖..."

    local mini_node_modules="$MINI_DIR/node_modules"

    if [[ ! -d "$mini_node_modules" ]]; then
        print_warning "小程序依赖未安装，正在安装..."
        cd "$FRONTEND_DIR"
        pnpm install
        cd "$SCRIPT_DIR"
        print_success "依赖安装完成"
    else
        print_success "依赖已存在，跳过安装"
    fi
}

# 清理 dist 目录
clean_dist() {
    if [[ -d "$DIST_DIR" ]]; then
        print_info "清理 dist 目录..."
        rm -rf "$DIST_DIR"
        print_success "清理完成"
    fi
}

# 构建小程序
build_miniprogram() {
    print_info "开始构建微信小程序..."
    echo ""

    cd "$FRONTEND_DIR"

    # 执行构建
    if pnpm run build:mini; then
        cd "$SCRIPT_DIR"
        echo ""
        print_success "构建完成！"
    else
        cd "$SCRIPT_DIR"
        echo ""
        print_error "构建失败"
        exit 1
    fi
}

# 显示构建结果
show_build_result() {
    echo ""
    echo "=========================================="
    print_success "构建成功！"
    echo "=========================================="
    echo ""
    echo "📦 构建产物位置:"
    echo "   $DIST_DIR"
    echo ""
    echo "📝 在微信开发者工具中打开:"
    echo "   1. 打开微信开发者工具"
    echo "   2. 选择「导入项目」"
    echo "   3. 选择目录: $DIST_DIR"
    echo ""

    # 检查 project.config.json
    if [[ -f "$PROJECT_CONFIG" ]]; then
        echo "✅ project.config.json 已生成"
        echo ""
    else
        print_warning "project.config.json 未找到，可能需要手动配置"
        echo ""
    fi

    # 显示构建内容
    if [[ -d "$DIST_DIR" ]]; then
        echo "📂 构建内容:"
        ls -lh "$DIST_DIR" | tail -n +2 | awk '{print "   " $9 " (" $5 ")"}'
    fi
    echo ""
}

# 主函数
main() {
    local skip_deps=false
    local clean=false

    # 解析参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            --no-deps)
                skip_deps=true
                shift
                ;;
            --clean)
                clean=true
                shift
                ;;
            *)
                print_error "未知参数: $1"
                echo ""
                show_help
                exit 1
                ;;
        esac
    done

    echo ""
    echo "=========================================="
    echo "  微信小程序一键构建脚本"
    echo "=========================================="
    echo ""

    # 执行构建流程
    check_project_structure

    if [[ "$skip_deps" = false ]]; then
        check_and_install_dependencies
    else
        print_info "跳过依赖检查"
    fi

    if [[ "$clean" = true ]]; then
        clean_dist
    fi

    build_miniprogram
    show_build_result
}

# 运行主函数
main "$@"
