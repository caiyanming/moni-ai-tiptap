#!/bin/bash

# 🎨 TipTap项目 - MoniAI设计系统安装脚本
# 
# 功能：
# 1. 构建设计系统包
# 2. 更新TipTap项目依赖
# 3. 安装依赖
# 4. 验证安装

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 打印函数
print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_header() { echo -e "${CYAN}[HEADER]${NC} $1"; }

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TIPTAP_DIR="$(dirname "$SCRIPT_DIR")"
DESIGN_SYSTEM_DIR="$TIPTAP_DIR/../moni-ai-design-system"

print_header "🎨 TipTap项目 - MoniAI设计系统安装"
print_info "📁 TipTap目录: $TIPTAP_DIR"
print_info "📁 设计系统目录: $DESIGN_SYSTEM_DIR"
echo ""

# 检查目录
if [ ! -d "$DESIGN_SYSTEM_DIR" ]; then
    print_error "设计系统目录不存在: $DESIGN_SYSTEM_DIR"
    exit 1
fi

if [ ! -f "$TIPTAP_DIR/package.json" ]; then
    print_error "TipTap package.json不存在"
    exit 1
fi

# 第一步：构建设计系统包
print_header "📦 第1步: 构建设计系统包"
cd "$DESIGN_SYSTEM_DIR"

print_info "正在构建设计系统..."
if pnpm build; then
    print_success "✅ 设计系统构建完成"
else
    print_error "❌ 设计系统构建失败"
    exit 1
fi

# 第二步：更新TipTap项目依赖
print_header "🔧 第2步: 更新TipTap项目依赖"
cd "$TIPTAP_DIR"

# 检查更新脚本是否存在
if [ ! -f "scripts/update-design-system-deps.cjs" ]; then
    print_error "更新脚本不存在: scripts/update-design-system-deps.cjs"
    print_info "正在创建更新脚本..."
    
    # 创建scripts目录
    mkdir -p scripts
    
    # 创建更新脚本
    cat > scripts/update-design-system-deps.cjs << 'EOF'
#!/usr/bin/env node

/**
 * 🎨 TipTap项目 - 设计系统依赖更新脚本
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 开始更新 TipTap 项目的设计系统依赖...\n');

// 读取 package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// 确保有dependencies字段
if (!packageJson.dependencies) {
  packageJson.dependencies = {};
}

// 添加/更新设计系统依赖
const oldVersion = packageJson.dependencies['@moni-ai-design-system'];
const newVersion = 'file:../moni-ai-design-system';

packageJson.dependencies['@moni-ai-design-system'] = newVersion;

// 写入更新后的 package.json
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

if (oldVersion) {
  console.log(`✅ 更新设计系统依赖: ${oldVersion} → ${newVersion}`);
} else {
  console.log(`✅ 添加设计系统依赖: ${newVersion}`);
}

console.log('\n🎉 TipTap 项目依赖更新完成!');
console.log('\n下一步请运行: pnpm install');
EOF
    
    chmod +x scripts/update-design-system-deps.cjs
    print_success "✅ 更新脚本已创建"
fi

print_info "正在更新依赖到设计系统..."
if node scripts/update-design-system-deps.cjs; then
    print_success "✅ 依赖更新完成"
else
    print_error "❌ 依赖更新失败"
    exit 1
fi

# 第三步：清理并安装依赖
if [ "$1" = "--clean" ]; then
    print_header "🧹 第3步: 清理旧的依赖"
    if [ -d "node_modules" ]; then
        print_info "正在删除 node_modules..."
        rm -rf node_modules
    fi

    if [ -f "pnpm-lock.yaml" ]; then
        print_info "正在删除 pnpm-lock.yaml..."
        rm -f pnpm-lock.yaml
    fi
fi

# 第四步：安装依赖
print_header "📥 第4步: 安装依赖"
print_info "正在执行 pnpm install..."
if pnpm install --no-frozen-lockfile; then
    print_success "✅ 依赖安装完成"
else
    print_error "❌ 依赖安装失败"
    exit 1
fi

# 第五步：验证安装
print_header "🔍 第5步: 验证安装结果"

# 检查设计系统依赖
if [ -d "node_modules/moni-ai-design-system" ]; then
    print_success "✅ moni-ai-design-system 已正确安装"
else
    print_warning "⚠️  moni-ai-design-system 可能未正确安装"
fi

# 检查PostCSS配置
if [ -f "postcss.config.js" ]; then
    print_success "✅ PostCSS 配置文件存在"
else
    print_warning "⚠️  PostCSS 配置文件不存在"
fi

# 完成
print_header "🎉 安装完成总结"
echo ""
print_success "🌟 TipTap项目设计系统安装完成！"
echo ""
print_info "📋 接下来的步骤:"
print_info "   1. 查看 design-system-import-example.css 了解如何导入"
print_info "   2. 在TipTap样式文件中导入设计系统CSS"
print_info "   3. 重点使用编辑器专用样式："
print_info "      @import 'moni-ai-design-system/editor';"
echo ""
print_info "🎯 TipTap特色功能："
print_info "   - 零!important的ProseMirror样式覆盖"
print_info "   - CSS Layers自动管理编辑器样式优先级"
print_info "   - 完美兼容现有TipTap扩展样式"
echo ""
print_info "🔗 更多信息："
print_info "   - 设计系统文档: ../moni-ai-design-system/README.md"
print_info "   - TipTap样式集成指南: design-system-import-example.css"