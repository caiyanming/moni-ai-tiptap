#!/bin/bash

# 为所有子包安装依赖的脚本
# 在非workspace模式下，每个包需要自己的依赖

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 获取所有包目录
PACKAGES=($(find packages packages-deprecated -name "package.json" -exec dirname {} \; 2>/dev/null | sort))

log_info "为 ${#PACKAGES[@]} 个包安装依赖..."

SUCCESS_COUNT=0
SKIP_COUNT=0
ERROR_COUNT=0

# 安装依赖函数
install_package_deps() {
    local package_dir=$1
    cd "$package_dir"
    
    if [[ ! -f "package.json" ]]; then
        log_warning "跳过 $package_dir (没有 package.json)"
        SKIP_COUNT=$((SKIP_COUNT + 1))
        cd - > /dev/null
        return
    fi
    
    # 获取包名
    local PACKAGE_NAME=$(node -p "require('./package.json').name" 2>/dev/null || echo "unknown")
    
    # 检查是否已有node_modules
    if [[ -d "node_modules" ]]; then
        log_info "跳过 $PACKAGE_NAME (依赖已安装)"
        SKIP_COUNT=$((SKIP_COUNT + 1))
        cd - > /dev/null
        return
    fi
    
    log_info "为包安装依赖: $PACKAGE_NAME"
    
    # 使用npm安装依赖（避免pnpm workspace问题）
    if npm install --no-package-lock 2>/dev/null; then
        log_success "依赖安装成功: $PACKAGE_NAME"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        log_error "依赖安装失败: $PACKAGE_NAME"
        ERROR_COUNT=$((ERROR_COUNT + 1))
    fi
    
    cd - > /dev/null
}

# 批量安装所有包的依赖
for package_dir in "${PACKAGES[@]}"; do
    install_package_deps "$package_dir"
done

# 输出总结
echo ""
log_info "依赖安装完成统计:"
log_success "成功安装: $SUCCESS_COUNT 个包"
[[ $SKIP_COUNT -gt 0 ]] && log_warning "跳过: $SKIP_COUNT 个包"
[[ $ERROR_COUNT -gt 0 ]] && log_error "失败: $ERROR_COUNT 个包"

if [[ $ERROR_COUNT -eq 0 ]]; then
    echo ""
    log_success "🎉 所有包依赖安装完成!"
else
    echo ""
    log_error "部分包依赖安装失败，请检查失败的包"
    exit 1
fi