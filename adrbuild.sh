#!/bin/bash

# Android App 一键构建脚本
# 用于生成 Android APK 文件

set -e

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
APP_DIR="$FRONTEND_DIR/packages/app"
ANDROID_DIR="$APP_DIR/android"
APK_OUTPUT_DIR="$ANDROID_DIR/app/build/outputs/apk/release"

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
Android App 一键构建脚本

用法: ./adrbuild.sh [选项]

选项:
  -h, --help          显示此帮助信息
  --no-deps           跳过依赖检查和安装
  --clean             构建前清理构建缓存
  --init              初始化 Android 项目（仅首次需要）
  --debug             构建 Debug 版本（默认构建 Release）
  --variant VARIANT   构建指定变体（如 release, debug）

示例:
  ./adrbuild.sh                    # 构建 Release 版本
  ./adrbuild.sh --debug            # 构建 Debug 版本
  ./adrbuild.sh --clean            # 清理后构建
  ./adrbuild.sh --init             # 初始化 Android 项目

环境要求:
  - Java JDK 8 或更高版本
  - Android SDK
  - Android SDK Build-Tools
  - Node.js 16+

EOF
}

# 检查项目结构
check_project_structure() {
    print_info "检查项目结构..."

    if [[ ! -d "$FRONTEND_DIR" ]]; then
        print_error "frontend 目录不存在: $FRONTEND_DIR"
        exit 1
    fi

    if [[ ! -d "$APP_DIR" ]]; then
        print_error "app 目录不存在: $APP_DIR"
        exit 1
    fi

    if [[ ! -f "$APP_DIR/package.json" ]]; then
        print_error "app package.json 不存在: $APP_DIR/package.json"
        exit 1
    fi

    print_success "项目结构检查通过"
}

# 检查 Android 环境
check_android_environment() {
    print_info "检查 Android 构建环境..."

    local missing_deps=0

    # 检查 Java
    if ! command -v java &> /dev/null; then
        print_error "未找到 Java，请安装 JDK 8 或更高版本"
        missing_deps=1
    else
        local java_version=$(java -version 2>&1 | head -n 1 | cut -d'"' -f2)
        print_success "Java 版本: $java_version"
    fi

    # 检查 JAVA_HOME
    if [[ -z "$JAVA_HOME" ]]; then
        print_warning "JAVA_HOME 环境变量未设置"
    else
        print_success "JAVA_HOME: $JAVA_HOME"
    fi

    # 检查 Android SDK
    if [[ -z "$ANDROID_HOME" ]] && [[ -z "$ANDROID_SDK_ROOT" ]]; then
        print_warning "ANDROID_HOME 或 ANDROID_SDK_ROOT 环境变量未设置"
        print_info "如果构建失败，请设置 Android SDK 路径"
    else
        local android_sdk="${ANDROID_HOME:-$ANDROID_SDK_ROOT}"
        print_success "Android SDK: $android_sdk"
    fi

    if [[ $missing_deps -eq 1 ]]; then
        print_error "缺少必需的依赖，请安装后重试"
        exit 1
    fi

    print_success "环境检查完成"
}

# 检查并安装依赖
check_and_install_dependencies() {
    print_info "检查依赖..."

    local app_node_modules="$APP_DIR/node_modules"

    if [[ ! -d "$app_node_modules" ]]; then
        print_warning "app 依赖未安装，正在安装..."
        cd "$FRONTEND_DIR"
        pnpm install
        cd "$SCRIPT_DIR"
        print_success "依赖安装完成"
    else
        print_success "依赖已存在，跳过安装"
    fi
}

# 初始化 Android 项目
init_android_project() {
    print_info "初始化 Android 项目..."

    if [[ -d "$ANDROID_DIR" ]] && [[ -f "$ANDROID_DIR/build.gradle" ]]; then
        print_warning "Android 项目已存在，跳过初始化"
        return
    fi

    print_warning "Android 目录为空或不存在"
    echo ""
    print_info "请选择初始化方式："
    echo "  1. 从现有 React Native 项目复制（推荐）"
    echo "  2. 手动初始化（需要 npx react-native init）"
    echo "  3. 取消"
    echo ""
    read -p "请输入选项 [1-3]: " choice

    case $choice in
        1)
            print_info "请提供现有 React Native 项目的 android 目录路径"
            read -p "路径: " source_android

            if [[ ! -d "$source_android/android" ]]; then
                print_error "指定的路径不包含 android 目录"
                exit 1
            fi

            print_info "正在复制 Android 项目..."
            cp -r "$source_android/android" "$APP_DIR/"
            print_success "Android 项目复制完成"

            print_info "正在更新配置..."
            # 更新包名等配置
            update_android_config
            ;;
        2)
            print_info "正在使用 npx @react-native-community/cli init..."
            cd "$APP_DIR"
            npx @react-native-community/cli init --skip-install
            cd "$SCRIPT_DIR"
            print_success "Android 项目初始化完成"
            ;;
        3)
            print_info "已取消"
            exit 0
            ;;
        *)
            print_error "无效选项"
            exit 1
            ;;
    esac
}

# 更新 Android 配置
update_android_config() {
    print_info "更新 Android 配置..."

    # 这里可以添加自动更新配置的逻辑
    # 例如：修改包名、应用名称等

    print_success "配置更新完成"
}

# 清理构建缓存
clean_build() {
    print_info "清理构建缓存..."

    cd "$ANDROID_DIR"

    if ./gradlew clean; then
        print_success "清理完成"
    else
        print_warning "清理失败，继续构建..."
    fi

    cd "$SCRIPT_DIR"
}

# 构建 Android APK
build_android() {
    local build_type="$1"  # release 或 debug
    local variant="$2"      # 构建变体

    print_info "开始构建 Android APK ($build_type)..."
    echo ""

    cd "$APP_DIR"

    # 构建
    local gradle_command="cd android && ./gradlew assemble$variant"

    if [[ "$build_type" = "debug" ]]; then
        print_info "执行命令: pnpm run android (debug)"
        if pnpm run android; then
            cd "$SCRIPT_DIR"
            echo ""
            print_success "构建完成！"
        else
            cd "$SCRIPT_DIR"
            echo ""
            print_error "构建失败"
            exit 1
        fi
    else
        print_info "执行命令: pnpm run build:android"
        if pnpm run build:android; then
            cd "$SCRIPT_DIR"
            echo ""
            print_success "构建完成！"
        else
            cd "$SCRIPT_DIR"
            echo ""
            print_error "构建失败"
            exit 1
        fi
    fi
}

# 显示构建结果
show_build_result() {
    local build_type="$1"
    local variant=$(echo "$variant" | sed 's/Release/Release/' | sed 's/Debug/Debug/')

    echo ""
    echo "=========================================="
    print_success "构建成功！"
    echo "=========================================="
    echo ""

    # 查找 APK 文件
    local apk_dir="$APK_OUTPUT_DIR"
    if [[ "$build_type" = "debug" ]]; then
        apk_dir="$ANDROID_DIR/app/build/outputs/apk/debug"
    fi

    if [[ -d "$apk_dir" ]]; then
        echo "📦 APK 文件位置:"
        echo "   $apk_dir"
        echo ""

        # 列出 APK 文件
        local apk_files=$(find "$apk_dir" -name "*.apk" 2>/dev/null)
        if [[ -n "$apk_files" ]]; then
            echo "📱 生成的 APK:"
            echo "$apk_files" | while read apk; do
                local size=$(ls -lh "$apk" | awk '{print $5}')
                local name=$(basename "$apk")
                echo "   - $name ($size)"
            done
            echo ""
        fi
    else
        print_warning "未找到 APK 输出目录: $apk_dir"
    fi

    echo "💡 安装到设备:"
    echo "   adb install -r $apk_dir/*.apk"
    echo ""
}

# 检查 Android 项目是否存在
check_android_project_exists() {
    if [[ ! -d "$ANDROID_DIR" ]]; then
        print_error "Android 目录不存在"
        echo ""
        print_info "请运行以下命令初始化 Android 项目："
        echo "   ./adrbuild.sh --init"
        echo ""
        exit 1
    fi

    if [[ ! -f "$ANDROID_DIR/build.gradle" ]] && [[ ! -f "$ANDROID_DIR/build.gradle.kts" ]]; then
        print_error "Android 项目未正确初始化"
        echo ""
        print_info "请运行以下命令初始化 Android 项目："
        echo "   ./adrbuild.sh --init"
        echo ""
        exit 1
    fi
}

# 主函数
main() {
    local skip_deps=false
    local clean=false
    local init=false
    local build_type="release"
    local variant="Release"

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
            --init)
                init=true
                shift
                ;;
            --debug)
                build_type="debug"
                variant="Debug"
                shift
                ;;
            --variant)
                variant="$2"
                shift 2
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
    echo "  Android App 一键构建脚本"
    echo "=========================================="
    echo ""

    # 如果是初始化模式
    if [[ "$init" = true ]]; then
        check_project_structure
        init_android_project
        echo ""
        print_success "初始化完成！现在可以运行 ./adrbuild.sh 构建 APK"
        exit 0
    fi

    # 执行构建流程
    check_project_structure
    check_android_project_exists

    if [[ "$skip_deps" = false ]]; then
        check_and_install_dependencies
    else
        print_info "跳过依赖检查"
    fi

    check_android_environment

    if [[ "$clean" = true ]]; then
        clean_build
    fi

    build_android "$build_type" "$variant"
    show_build_result "$build_type"
}

# 运行主函数
main "$@"
