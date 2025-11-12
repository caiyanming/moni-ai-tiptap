#!/bin/bash

# TipTap 统一管理脚本
# 用法: ./scripts/tiptap.sh [command] [options]

set -e

# 配置
DEFAULT_REGISTRY="https://registry-zonbov-5xySne-raqbot.fufenxi.com"
REGISTRY="${REGISTRY:-$DEFAULT_REGISTRY}"
VERSION="3.0.0-beta.22.3"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

show_help() {
    echo "TipTap 统一管理脚本"
    echo ""
    echo "用法: ./scripts/tiptap.sh [command] [options]"
    echo ""
    echo "命令:"
    echo "  version [VERSION]     更新所有包版本号"
    echo "  build                 构建所有包"
    echo "  publish [options]     发布包到 verdaccio"
    echo "  clean                 清理所有包的 dist 和 node_modules"
    echo "  help                  显示此帮助信息"
    echo ""
    echo "publish 选项:"
    echo "  --all                 发布所有包 (默认)"
    echo "  --packages            只发布 packages/ 目录"
    echo "  --deprecated          只发布 packages-deprecated/ 目录"
    echo "  --force               强制重新发布 (先 unpublish)"
    echo "  --skip-build          跳过构建步骤"
    echo ""
    echo "示例:"
    echo "  ./scripts/tiptap.sh version 3.0.0-beta.22.3"
    echo "  ./scripts/tiptap.sh publish --force"
    echo "  ./scripts/tiptap.sh publish --packages --skip-build"
}

update_versions() {
    local new_version=${1:-$VERSION}

    log_info "更新所有包版本号到 $new_version..."

    # 更新脚本中的版本
    sed -i.bak "s/VERSION=\".*\"/VERSION=\"$new_version\"/" "$0"
    rm -f "$0.bak"

    # 获取所有包
    local packages=($(find packages packages-deprecated -name "package.json" | sort))
    local update_count=0

    for package_file in "${packages[@]}"; do
        local package_name=$(node -p "require('./$package_file').name" 2>/dev/null || echo "unknown")
        local current_version=$(node -p "require('./$package_file').version" 2>/dev/null || echo "unknown")

        if [[ "$current_version" != "$new_version" ]]; then
            log_info "更新 $package_name: $current_version -> $new_version"

            node -e "
                const fs = require('fs');
                const packageJson = JSON.parse(fs.readFileSync('$package_file', 'utf8'));

                // 更新包版本
                packageJson.version = '$new_version';

                // 更新依赖中的 @tiptap 包版本
                const updateDeps = (deps) => {
                    if (!deps) return;
                    for (const [name, version] of Object.entries(deps)) {
                        if (name.startsWith('@tiptap/') && version !== 'workspace:*') {
                            deps[name] = '$new_version';
                        }
                    }
                };

                updateDeps(packageJson.dependencies);
                updateDeps(packageJson.devDependencies);
                updateDeps(packageJson.peerDependencies);

                fs.writeFileSync('$package_file', JSON.stringify(packageJson, null, 2) + '\n');
            "

            update_count=$((update_count + 1))
        fi
    done

    log_success "更新完成！共更新 $update_count 个包"
}

build_packages() {
    log_info "构建所有包..."

    # 使用 npm run build 如果存在
    if grep -q '"build"' package.json; then
        npm run build
        log_success "构建完成"
    else
        log_warning "没有找到构建脚本"
    fi
}

publish_packages() {
    local publish_all=true
    local publish_packages=false
    local publish_deprecated=false
    local force_publish=false
    local skip_build=false

    # 解析选项
    while [[ $# -gt 0 ]]; do
        case $1 in
            --all)
                publish_all=true
                publish_packages=false
                publish_deprecated=false
                shift
                ;;
            --packages)
                publish_all=false
                publish_packages=true
                shift
                ;;
            --deprecated)
                publish_all=false
                publish_deprecated=true
                shift
                ;;
            --force)
                force_publish=true
                shift
                ;;
            --skip-build)
                skip_build=true
                shift
                ;;
            *)
                shift
                ;;
        esac
    done

log_info "开始发布包到 $REGISTRY"

    # 确定要发布的目录
    local dirs=()
    if [[ "$publish_all" == "true" ]]; then
        dirs=(packages packages-deprecated)
    elif [[ "$publish_packages" == "true" ]]; then
        dirs=(packages)
    elif [[ "$publish_deprecated" == "true" ]]; then
        dirs=(packages-deprecated)
    fi

    # 获取所有包
    local packages=()
    for dir in "${dirs[@]}"; do
        if [[ -d "$dir" ]]; then
            while IFS= read -r -d '' pkg_dir; do
                packages+=("$pkg_dir")
            done < <(find "$dir" -maxdepth 1 -type d -name "*" ! -name "$dir" -print0 2>/dev/null)
        fi
    done

    log_info "找到 ${#packages[@]} 个包准备发布"

    local success_count=0
    local error_count=0

    # 确认已登录目标 registry
    if ! npm whoami --registry="$REGISTRY" >/dev/null 2>&1; then
        log_error "未检测到 $REGISTRY 登录状态，请先执行: npm login --registry=$REGISTRY"
        exit 1
    fi

    get_dist_tag() {
        local version="$1"
        if [[ "$version" == *"-"* ]]; then
            local suffix="${version#*-}"
            local tag="${suffix%%.*}"
            [[ -z "$tag" ]] && tag="beta"
            echo "$tag"
        else
            echo "latest"
        fi
    }

    for package_dir in "${packages[@]}"; do
        if [[ ! -f "$package_dir/package.json" ]]; then
            continue
        fi

        local package_name=$(node -p "require('./$package_dir/package.json').name" 2>/dev/null || echo "")
        local package_version=$(node -p "require('./$package_dir/package.json').version" 2>/dev/null || echo "")

        if [[ -z "$package_name" || -z "$package_version" ]]; then
            continue
        fi

        log_info "发布包: $package_name@$package_version"

        local dist_tag
        dist_tag=$(get_dist_tag "$package_version")

        # 如果检测到已发布的版本（或强制模式），先尝试删除旧版本
        if [[ "$force_publish" == "true" ]] || npm view "$package_name@$package_version" --registry="$REGISTRY" >/dev/null 2>&1; then
            log_warning "检测到 $package_name@$package_version 已存在，正在执行 unpublish..."
            if npm unpublish "$package_name@$package_version" --registry="$REGISTRY" --force; then
                log_info "已删除旧版本 $package_name@$package_version"
            else
                log_warning "unpublish 失败（可能包不存在），继续尝试发布"
            fi
        fi

        # 发布包
        publish_cmd=(npm publish --registry="$REGISTRY" --access public --ignore-scripts)
        if [[ "$dist_tag" != "latest" ]]; then
            publish_cmd+=(--tag "$dist_tag")
        fi

        if (cd "$package_dir" && "${publish_cmd[@]}"); then
            log_success "发布成功: $package_name@$package_version"
            success_count=$((success_count + 1))
        else
            log_error "发布失败: $package_name@$package_version"
            error_count=$((error_count + 1))
        fi
    done

    # 输出总结
    echo ""
    log_info "发布完成统计:"
    log_success "成功发布: $success_count 个包"
    [[ $error_count -gt 0 ]] && log_error "失败: $error_count 个包"

    if [[ $success_count -gt 0 ]]; then
        log_success "🎉 发布完成!"
    fi
}

clean_packages() {
    log_info "清理所有包..."

    # 清理根目录
    rm -rf node_modules dist

    # 清理所有子包
    find packages packages-deprecated -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true
    find packages packages-deprecated -name "dist" -type d -exec rm -rf {} + 2>/dev/null || true

    log_success "清理完成"
}

# 主逻辑
case "${1:-help}" in
    version)
        update_versions "$2"
        ;;
    build)
        build_packages
        ;;
    publish)
        shift
        publish_packages "$@"
        ;;
    clean)
        clean_packages
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "未知命令: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
