#!/bin/bash

# 简化的TipTap包发布脚本
# 基于成功的@moni-ai-y-tiptap经验，使用workspace模式

set -e

# 配置
REGISTRY_URL="http://registry.fufenxi.com:4873/"
VERSION="3.0.0-beta.22"

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

log_info "开始发布 TipTap 包到本地 registry..."
log_info "Registry: $REGISTRY_URL"

# 跳过构建步骤，直接使用已有的构建产物
log_info "使用现有构建产物进行发布..."

# 获取所有有构建产物的包（包括 packages 和 packages-deprecated）
log_info "查找可发布的包..."
PACKAGES=($(find packages packages-deprecated -maxdepth 2 -name "package.json" -exec dirname {} \; 2>/dev/null | sort))

log_info "找到 ${#PACKAGES[@]} 个包准备发布"

# 统计
SUCCESS_COUNT=0
ERROR_COUNT=0

# 发布函数 - 从根目录使用pnpm发布
publish_package() {
    local package_dir=$1
    
    # 确保在正确的目录下读取package.json
    local PACKAGE_NAME=$(node -p "require('./$package_dir/package.json').name" 2>/dev/null || echo "")
    local PACKAGE_VERSION=$(node -p "require('./$package_dir/package.json').version" 2>/dev/null || echo "")
    
    # 检查包信息是否有效
    if [[ -z "$PACKAGE_NAME" || -z "$PACKAGE_VERSION" ]]; then
        log_warning "跳过 $package_dir (无效的package.json)"
        return
    fi
    
    # 检查是否有构建产物
    if [[ ! -d "$package_dir/dist" ]]; then
        log_warning "跳过 $PACKAGE_NAME (无构建产物)"
        return
    fi
    
    log_info "发布包: $PACKAGE_NAME@$PACKAGE_VERSION"
    
    # 清理可能存在的版本（静默处理）
    npm unpublish "$PACKAGE_NAME@$PACKAGE_VERSION" --registry="$REGISTRY_URL" --force 2>/dev/null || true
    
    # 使用pnpm从根目录发布包（处理beta版本tag）
    if [[ "$PACKAGE_VERSION" =~ (beta|alpha|rc) ]]; then
        if pnpm publish "$package_dir" --registry="$REGISTRY_URL" --ignore-scripts --tag beta --no-git-checks; then
            log_success "发布成功: $PACKAGE_NAME@$PACKAGE_VERSION (tag: beta)"
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        else
            log_error "发布失败: $PACKAGE_NAME@$PACKAGE_VERSION"
            ERROR_COUNT=$((ERROR_COUNT + 1))
        fi
    else
        if pnpm publish "$package_dir" --registry="$REGISTRY_URL" --ignore-scripts --no-git-checks; then
            log_success "发布成功: $PACKAGE_NAME@$PACKAGE_VERSION"
            SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        else
            log_error "发布失败: $PACKAGE_NAME@$PACKAGE_VERSION"
            ERROR_COUNT=$((ERROR_COUNT + 1))
        fi
    fi
}

# 批量发布
for package_dir in "${PACKAGES[@]}"; do
    publish_package "$package_dir"
done

# 输出总结
echo ""
log_info "发布完成统计:"
log_success "成功发布: $SUCCESS_COUNT 个包"
[[ $ERROR_COUNT -gt 0 ]] && log_error "失败: $ERROR_COUNT 个包"

if [[ $SUCCESS_COUNT -gt 0 ]]; then
    echo ""
    log_success "🎉 发布完成!"
    echo ""
    log_info "验证发布结果:"
    echo "npm view @tiptap/core@$VERSION --registry=$REGISTRY_URL"
else
    echo ""
    log_error "没有包发布成功"
    exit 1
fi