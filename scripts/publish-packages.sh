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

# 第一步：安装 design-system 依赖
log_info "安装 moni-ai-design-system 依赖..."
if npm install moni-ai-design-system@^1.0.0 --registry="$REGISTRY_URL"; then
    log_success "design-system 依赖安装成功"
else
    log_error "design-system 依赖安装失败，请确保已发布到 registry"
    exit 1
fi

# 获取所有需要发布的包
PACKAGES=($(find packages -name "package.json" -exec dirname {} \; | sort))

log_info "找到 ${#PACKAGES[@]} 个包准备发布"

# 统计
SUCCESS_COUNT=0
SKIP_COUNT=0
ERROR_COUNT=0

for package_dir in "${PACKAGES[@]}"; do
    cd "$package_dir"
    
    if [[ ! -f "package.json" ]]; then
        log_warning "跳过 $package_dir (没有 package.json)"
        SKIP_COUNT=$((SKIP_COUNT + 1))
        cd - > /dev/null
        continue
    fi
    
    # 获取包名
    PACKAGE_NAME=$(node -p "require('./package.json').name")
    PACKAGE_VERSION=$(node -p "require('./package.json').version")
    
    log_info "处理包: $PACKAGE_NAME@$PACKAGE_VERSION"
    
    # 检查是否需要构建
    if [[ -f "tsup.config.ts" ]] && [[ -d "src" ]]; then
        log_info "构建包: $PACKAGE_NAME"
        if npm run build > /dev/null 2>&1; then
            log_success "构建成功: $PACKAGE_NAME"
        else
            log_error "构建失败: $PACKAGE_NAME"
            ERROR_COUNT=$((ERROR_COUNT + 1))
            cd - > /dev/null
            continue
        fi
    fi
    
    # 尝试 unpublish (如果包已存在)
    log_info "检查并清理已存在的版本: $PACKAGE_NAME@$PACKAGE_VERSION"
    npm unpublish "$PACKAGE_NAME@$PACKAGE_VERSION" --registry="$REGISTRY_URL" 2>/dev/null || true
    
    # 发布包
    log_info "发布包: $PACKAGE_NAME@$PACKAGE_VERSION"
    if npm publish --registry="$REGISTRY_URL" 2>/dev/null; then
        log_success "发布成功: $PACKAGE_NAME@$PACKAGE_VERSION"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        log_error "发布失败: $PACKAGE_NAME@$PACKAGE_VERSION"
        ERROR_COUNT=$((ERROR_COUNT + 1))
    fi
    
    cd - > /dev/null
done

# 输出总结
echo ""
log_info "发布完成统计:"
log_success "成功发布: $SUCCESS_COUNT 个包"
[[ $SKIP_COUNT -gt 0 ]] && log_warning "跳过: $SKIP_COUNT 个包"
[[ $ERROR_COUNT -gt 0 ]] && log_error "失败: $ERROR_COUNT 个包" || log_success "所有包发布成功!"

echo ""
log_info "验证发布结果:"
echo "npm view @tiptap/core@$VERSION --registry=$REGISTRY_URL"
echo "npm view @tiptap/react@$VERSION --registry=$REGISTRY_URL"

exit $ERROR_COUNT