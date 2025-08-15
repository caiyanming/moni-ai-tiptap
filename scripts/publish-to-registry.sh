#!/bin/bash

# moni-ai-tiptap 包发布脚本
# 用于发布所有 TipTap fork 包到本地 Verdaccio registry

set -e

# 配置
REGISTRY_URL="http://registry.fufenxi.com:4873/"
VERSION="3.0.0-beta.22.1"

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

# 检查当前目录
if [[ ! -f "package.json" ]] || [[ ! -d "packages" ]]; then
    log_error "请在 moni-ai-tiptap 根目录执行此脚本"
    exit 1
fi

log_info "开始发布 TipTap fork 包到本地 registry..."
log_info "Registry: $REGISTRY_URL"
log_info "版本: $VERSION"

# 第一步：确保构建已完成
log_info "检查构建状态..."
if [[ ! -d "packages/core/dist" ]]; then
    log_warning "未找到构建产物，正在执行构建..."
    if pnpm run build; then
        log_success "构建成功"
    else
        log_error "构建失败"
        exit 1
    fi
else
    log_success "构建产物已存在"
fi

# 获取所有需要发布的包
PACKAGES=($(find packages -name "package.json" -exec dirname {} \; | sort))

log_info "找到 ${#PACKAGES[@]} 个包准备发布"

# 统计
SUCCESS_COUNT=0
SKIP_COUNT=0
ERROR_COUNT=0

# 发布函数
publish_package() {
    local package_dir=$1
    cd "$package_dir"
    
    if [[ ! -f "package.json" ]]; then
        log_warning "跳过 $package_dir (没有 package.json)"
        SKIP_COUNT=$((SKIP_COUNT + 1))
        cd - > /dev/null
        return
    fi
    
    # 获取包名和版本
    local PACKAGE_NAME=$(node -p "require('./package.json').name" 2>/dev/null || echo "unknown")
    local PACKAGE_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "unknown")
    
    # 检查是否有构建产物
    if [[ ! -d "dist" ]]; then
        log_info "跳过 $PACKAGE_NAME (无构建产物)"
        SKIP_COUNT=$((SKIP_COUNT + 1))
        cd - > /dev/null
        return
    fi
    
    log_info "发布包: $PACKAGE_NAME@$PACKAGE_VERSION"
    
    # 尝试 unpublish (如果包已存在)
    npm unpublish "$PACKAGE_NAME@$PACKAGE_VERSION" --registry="$REGISTRY_URL" --force 2>/dev/null || true
    
    # 发布包
    if npm publish --registry="$REGISTRY_URL" 2>/dev/null; then
        log_success "发布成功: $PACKAGE_NAME@$PACKAGE_VERSION"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        log_error "发布失败: $PACKAGE_NAME@$PACKAGE_VERSION"
        ERROR_COUNT=$((ERROR_COUNT + 1))
    fi
    
    cd - > /dev/null
}

# 批量发布所有包
for package_dir in "${PACKAGES[@]}"; do
    publish_package "$package_dir"
done

# 输出总结
echo ""
log_info "发布完成统计:"
log_success "成功发布: $SUCCESS_COUNT 个包"
[[ $SKIP_COUNT -gt 0 ]] && log_warning "跳过: $SKIP_COUNT 个包"
[[ $ERROR_COUNT -gt 0 ]] && log_error "失败: $ERROR_COUNT 个包"

if [[ $ERROR_COUNT -eq 0 ]]; then
    echo ""
    log_success "🎉 所有包发布成功!"
    echo ""
    log_info "验证发布结果:"
    echo "npm view @tiptap/core@$VERSION --registry=$REGISTRY_URL"
    echo "npm view @tiptap/react@$VERSION --registry=$REGISTRY_URL"
    echo "npm view @tiptap/starter-kit@$VERSION --registry=$REGISTRY_URL"
else
    echo ""
    log_error "发布过程中有错误，请检查失败的包"
    exit 1
fi