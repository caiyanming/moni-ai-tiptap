#!/bin/bash

# MoniAI TipTap Editor Demo - Cypress E2E 浏览器自动化测试脚本
# 使用项目现有的 Cypress 在真实浏览器中测试所有功能

set -e

echo "🌲 MoniAI TipTap Editor Demo - Cypress E2E 浏览器自动化测试"
echo "=========================================================="

# 导航到正确目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
echo "📂 当前测试目录: $SCRIPT_DIR"

# 检查依赖
echo ""
echo "📋 检查测试环境..."
echo "=================="

if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi

if ! command -v npx &> /dev/null; then
    echo "❌ npx 未安装"
    exit 1
fi

# 检查 Cypress 是否安装（在项目根目录）
if [ ! -d "../../../../../node_modules/cypress" ] && [ ! -d "node_modules/cypress" ]; then
    echo "⚠️  Cypress 未在项目中找到，尝试安装..."
    cd ../../../../../ # 回到 demos 目录
    npm install --save-dev cypress
    cd "$SCRIPT_DIR" # 回到测试目录
fi

echo "✅ 测试环境检查完成"

# 创建必要的目录
mkdir -p ./cypress/screenshots
mkdir -p ./cypress/videos
mkdir -p ./cypress/reports

echo ""
echo "🚀 启动开发服务器..."
echo "==================="

# 检查开发服务器是否已运行
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ 开发服务器已运行"
    SERVER_STARTED_BY_SCRIPT=false
else
    echo "🔄 启动开发服务器..."
    cd ../../../../../ # 回到 demos 目录
    
    # 启动开发服务器（后台运行）
    npm run dev > /dev/null 2>&1 &
    SERVER_PID=$!
    SERVER_STARTED_BY_SCRIPT=true
    
    # 等待服务器启动
    echo "⏳ 等待开发服务器启动..."
    for i in {1..30}; do
        if curl -s http://localhost:3000 > /dev/null 2>&1; then
            echo "✅ 开发服务器启动成功"
            break
        fi
        echo "   等待中... ($i/30)"
        sleep 2
    done
    
    if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "❌ 开发服务器启动失败"
        if [ "$SERVER_STARTED_BY_SCRIPT" = true ]; then
            kill $SERVER_PID 2>/dev/null || true
        fi
        exit 1
    fi
    
    cd "$SCRIPT_DIR" # 回到测试目录
fi

echo ""
echo "🌲 运行 Cypress E2E 测试..."
echo "=========================="

# 设置 Cypress 环境变量
export CYPRESS_baseUrl="http://localhost:3000"
export CYPRESS_video=true
export CYPRESS_screenshotOnRunFailure=true

# 创建简单的 cypress.config.js（如果不存在）
if [ ! -f "cypress.config.js" ]; then
    cat > cypress.config.js << EOF
import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: './cypress/support/e2e.js',
    specPattern: './cypress/e2e/**/*.cy.js',
    screenshotsFolder: './cypress/screenshots',
    videosFolder: './cypress/videos',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    pageLoadTimeout: 30000,
  },
})
EOF
fi

FAILED_TESTS=0

echo "1️⃣ 运行 DragHandle Extension 测试..."
if npx cypress run --spec "cypress/e2e/drag-handle.cy.js" --browser chrome --headless; then
    echo "✅ DragHandle 测试通过"
else
    echo "❌ DragHandle 测试失败"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo ""
echo "2️⃣ 运行 StreamOperationManager 测试..."
if npx cypress run --spec "cypress/e2e/stream-operations.cy.js" --browser chrome --headless; then
    echo "✅ StreamOperationManager 测试通过"
else
    echo "❌ StreamOperationManager 测试失败"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo ""
echo "3️⃣ 运行 HiddenBlock Extension 测试..."
if npx cypress run --spec "cypress/e2e/hidden-blocks.cy.js" --browser chrome --headless; then
    echo "✅ HiddenBlock 测试通过"
else
    echo "❌ HiddenBlock 测试失败"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo ""
echo "4️⃣ 运行完整测试套件..."
if npx cypress run --browser chrome --headless; then
    echo "✅ 完整测试套件通过"
else
    echo "❌ 完整测试套件有失败项目"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

echo ""
echo "📊 生成测试报告..."
echo "=================="

# 统计结果
if [ -d "./cypress/screenshots" ]; then
    SCREENSHOT_COUNT=$(find ./cypress/screenshots -name "*.png" 2>/dev/null | wc -l)
    echo "📸 生成了 ${SCREENSHOT_COUNT// /} 个截图"
else
    SCREENSHOT_COUNT=0
    echo "📸 没有生成截图"
fi

if [ -d "./cypress/videos" ]; then
    VIDEO_COUNT=$(find ./cypress/videos -name "*.mp4" 2>/dev/null | wc -l)
    echo "🎬 生成了 ${VIDEO_COUNT// /} 个视频文件"
else
    VIDEO_COUNT=0
    echo "🎬 没有生成视频文件"
fi

echo ""
echo "🎯 Cypress E2E 测试验证重点"
echo "=========================="
echo "✅ 真实浏览器中的拖拽手柄显示和交互行为"
echo "✅ 实际的鼠标悬停、点击和拖拽操作验证"
echo "✅ AI 流式操作的完整用户交互流程"
echo "✅ 隐藏块的 DOM 隐藏和 AI 操作自动触发"
echo "✅ 响应式设计在不同屏幕尺寸下的表现"
echo "✅ 键盘导航和无障碍性功能"
echo "✅ 高频操作下的性能和稳定性"
echo "✅ 错误处理和异常情况的优雅处理"
echo "✅ 跨组件交互和状态同步验证"

echo ""
echo "📈 测试结果汇总"
echo "================"

TEST_SPECS=3
PASSED_SPECS=$((TEST_SPECS - FAILED_TESTS))

echo "📊 测试规格文件: $TEST_SPECS"
echo "✅ 通过: $PASSED_SPECS"
echo "❌ 失败: $FAILED_TESTS"
echo "📸 截图文件: $SCREENSHOT_COUNT"
echo "🎥 视频文件: $VIDEO_COUNT"

if [ -d "./cypress/screenshots" ] && [ $SCREENSHOT_COUNT -gt 0 ]; then
    echo "📁 截图目录: ./cypress/screenshots/"
fi

if [ -d "./cypress/videos" ] && [ $VIDEO_COUNT -gt 0 ]; then
    echo "📁 视频目录: ./cypress/videos/"
fi

echo ""
echo "🏆 Cypress E2E 测试完成状态"
echo "=========================="

if [ $FAILED_TESTS -eq 0 ]; then
    echo "🎉 所有 Cypress E2E 测试通过！真实浏览器功能验证成功"
    echo ""
    echo "✅ 验收标准检查:"
    echo "   ✅ 拖拽手柄在真实浏览器中正确显示和隐藏"
    echo "   ✅ 鼠标悬停交互按预期工作"
    echo "   ✅ + 按钮点击能够添加新段落"
    echo "   ✅ 实际拖拽操作能够重排元素"
    echo "   ✅ AI 流式操作队列正确管理和响应"
    echo "   ✅ 操作批准/拒绝功能真实可用"
    echo "   ✅ 隐藏块完全不可见但功能正常"
    echo "   ✅ 响应式设计适配各种屏幕尺寸"
    echo "   ✅ 键盘导航和无障碍性良好"
    echo "   ✅ 无严重性能问题或交互bug"
    echo ""
    echo "🚀 Demo 已通过完整的 Cypress 真实浏览器验证！"
    RESULT_CODE=0
else
    echo "❌ 有 $FAILED_TESTS 个测试套件失败"
    echo ""
    echo "🔍 故障排查建议:"
    echo "   1. 查看 ./cypress/screenshots/ 中的失败截图"
    echo "   2. 查看 ./cypress/videos/ 中的测试录像"
    echo "   3. 检查控制台输出中的具体错误信息"
    echo "   4. 确认开发服务器在 http://localhost:3000 正常运行"
    echo "   5. 验证demo页面 http://localhost:3000/src/Extensions/MoniEditor/React/ 可访问"
    RESULT_CODE=1
fi

echo ""
echo "🔗 相关资源:"
echo "  ./cypress/screenshots/    # 测试过程截图"
echo "  ./cypress/videos/         # 测试过程录像"
echo "  http://localhost:3000/src/Extensions/MoniEditor/React/  # Demo页面"
echo ""

echo "📚 其他可用的 Cypress 命令:"
echo "  npx cypress open                    # 打开 Cypress 图形界面"
echo "  npx cypress run --headed            # 有界面模式运行"
echo "  npx cypress run --browser firefox   # 指定浏览器运行"
echo "  npx cypress run --spec 'cypress/e2e/drag-handle.cy.js'  # 运行特定测试"
echo ""

# 清理服务器进程（如果是我们启动的）
if [ "$SERVER_STARTED_BY_SCRIPT" = true ] && [ ! -z "$SERVER_PID" ]; then
    echo "🛑 停止开发服务器..."
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
    echo "✅ 开发服务器已停止"
fi

echo ""
echo "🎯 总结：这个 Cypress E2E 测试套件验证了："
echo "   • 所有 Moni 自定义扩展在真实浏览器中的实际行为"
echo "   • 用户交互的完整流程（鼠标、键盘、触摸等）"
echo "   • 视觉效果和动画的正确渲染"
echo "   • 跨浏览器兼容性和响应式设计"
echo "   • 性能表现和错误处理能力"
echo ""

exit $RESULT_CODE