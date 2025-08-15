#!/bin/bash

# 更新所有 TipTap 包的版本号
# 用于统一版本管理

set -e

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

# 检查当前目录
if [[ ! -f "package.json" ]] || [[ ! -d "packages" ]]; then
    log_error "请在 moni-ai-tiptap 根目录执行此脚本"
    exit 1
fi

log_info "开始更新所有包的版本号到 $VERSION..."

# 获取所有包
PACKAGES=($(find packages packages-deprecated -name "package.json" | sort))

log_info "找到 ${#PACKAGES[@]} 个包需要更新"

UPDATE_COUNT=0

# 更新每个包的版本号
for package_file in "${PACKAGES[@]}"; do
    PACKAGE_NAME=$(node -p "require('./$package_file').name" 2>/dev/null || echo "unknown")
    CURRENT_VERSION=$(node -p "require('./$package_file').version" 2>/dev/null || echo "unknown")
    
    if [[ "$CURRENT_VERSION" != "$VERSION" ]]; then
        log_info "更新 $PACKAGE_NAME: $CURRENT_VERSION -> $VERSION"
        
        # 使用 Node.js 更新版本号
        node -e "
            const fs = require('fs');
            const packageJson = JSON.parse(fs.readFileSync('$package_file', 'utf8'));
            packageJson.version = '$VERSION';
            fs.writeFileSync('$package_file', JSON.stringify(packageJson, null, 2) + '\n');
        "
        
        UPDATE_COUNT=$((UPDATE_COUNT + 1))
    fi
done

log_success "更新完成！共更新 $UPDATE_COUNT 个包的版本号"