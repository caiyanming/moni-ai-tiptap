#!/bin/bash

# 批量发布所有 TipTap 包到本地 registry

set -e

REGISTRY="http://registry.fufenxi.com:4873"

echo "开始发布所有 TipTap 包到 $REGISTRY..."

# 发布所有 packages 和 packages-deprecated 目录下的包
for dir in packages/*/ packages-deprecated/*/; do
    if [ -f "$dir/package.json" ]; then
        echo "发布包: $dir"
        cd "$dir"
        npm publish --registry "$REGISTRY" || echo "包 $dir 发布失败或已存在，继续下一个..."
        cd - > /dev/null
    fi
done

echo "所有包发布完成！"