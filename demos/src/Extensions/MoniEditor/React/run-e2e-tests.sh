#!/bin/bash

# MoniAI TipTap Editor Demo - E2E 浏览器自动化测试脚本
# 使用 Playwright 在真实浏览器中测试所有功能

set -e

echo "🎭 MoniAI TipTap Editor Demo - E2E 浏览器自动化测试"
echo "====================================================="

# 检查依赖
echo "📋 检查 E2E 测试依赖..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi

if ! command -v npx &> /dev/null; then
    echo "❌ npx 未安装"
    exit 1
fi

# 导航到正确目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "📂 当前测试目录: $SCRIPT_DIR"

# 创建必要的目录
mkdir -p ./test-results
mkdir -p ./test-results/screenshots
mkdir -p ./playwright-report

echo ""
echo "🔧 安装 Playwright 依赖..."
echo "========================="

# 检查是否已安装 Playwright
if [ ! -d "node_modules/@playwright" ]; then
    echo "📦 安装 Playwright..."
    npm install --save-dev @playwright/test
    
    echo "🌐 安装浏览器..."
    npx playwright install
else
    echo "✅ Playwright 已安装"
fi

echo ""
echo "🚀 启动开发服务器..."
echo "==================="

# 检查开发服务器是否已运行
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ 开发服务器已运行"
else
    echo "🔄 启动开发服务器..."
    cd ../../../../../ # 回到 demos 目录
    npm run dev &
    SERVER_PID=$!
    
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
        kill $SERVER_PID 2>/dev/null || true
        exit 1
    fi
    
    cd "$SCRIPT_DIR" # 回到测试目录
fi

echo ""
echo "🎭 运行 E2E 测试套件..."
echo "======================"

# 设置测试环境变量
export PLAYWRIGHT_BROWSERS_PATH=0
export NODE_ENV=test

echo "1️⃣ 运行 DragHandle Extension 测试..."
if npx playwright test e2e-tests/drag-handle.spec.js --reporter=list; then
    echo "✅ DragHandle 测试通过"
else
    echo "❌ DragHandle 测试失败"
    FAILED_TESTS=1
fi

echo ""
echo "2️⃣ 运行 StreamOperationManager 测试..."
if npx playwright test e2e-tests/stream-operations.spec.js --reporter=list; then
    echo "✅ StreamOperationManager 测试通过"  
else
    echo "❌ StreamOperationManager 测试失败"
    FAILED_TESTS=1
fi

echo ""
echo "3️⃣ 运行 HiddenBlock Extension 测试..."
if npx playwright test e2e-tests/hidden-blocks.spec.js --reporter=list; then
    echo "✅ HiddenBlock 测试通过"
else
    echo "❌ HiddenBlock 测试失败"
    FAILED_TESTS=1
fi

echo ""
echo "4️⃣ 运行完整测试套件（所有浏览器）..."
if npx playwright test --reporter=html; then
    echo "✅ 完整测试套件通过"
else
    echo "❌ 完整测试套件失败"
    FAILED_TESTS=1
fi

echo ""
echo "📊 生成测试报告..."
echo "=================="

# 生成详细的HTML报告
echo "📄 生成 HTML 报告..."
npx playwright show-report --host=127.0.0.1 --port=9323 &
REPORT_PID=$!

echo "🎥 生成测试录像和截图报告..."
if [ -d "./test-results/screenshots" ]; then
    SCREENSHOT_COUNT=$(ls -1 ./test-results/screenshots/*.png 2>/dev/null | wc -l)
    echo "   📸 生成了 ${SCREENSHOT_COUNT// /} 个截图"
else
    echo "   📸 没有生成截图"
fi

if [ -d "./test-results" ]; then
    VIDEO_COUNT=$(ls -1 ./test-results/*.webm 2>/dev/null | wc -l)
    echo "   🎬 生成了 ${VIDEO_COUNT// /} 个视频文件"
else
    echo "   🎬 没有生成视频文件"
fi

echo ""
echo "🎯 E2E 测试验证重点"
echo "=================="
echo "✅ 真实浏览器中的拖拽手柄显示和交互"
echo "✅ 实际的鼠标悬停和拖拽操作"
echo "✅ AI 流式操作的视觉反馈和状态管理"
echo "✅ 隐藏块的DOM隐藏和AI操作触发"
echo "✅ 跨浏览器兼容性 (Chrome, Firefox, Safari)"
echo "✅ 响应式设计在不同屏幕尺寸下的表现"
echo "✅ 键盘导航和无障碍性"
echo "✅ 性能和稳定性（高频操作下）"
echo "✅ 错误处理和异常情况"

echo ""
echo "📈 测试结果汇总"
echo "================"

# 统计测试结果
if [ -f "./test-results/e2e-results.json" ]; then
    echo "📊 详细测试结果: ./test-results/e2e-results.json"
fi

if [ -f "./test-results/test-summary.json" ]; then
    echo "📋 测试总结: ./test-results/test-summary.json"
fi

echo "🌐 HTML 报告: http://127.0.0.1:9323"
echo "📁 截图目录: ./test-results/screenshots/"
echo "🎥 视频文件: ./test-results/"

echo ""
echo "🏆 E2E 测试完成状态"
echo "=================="

if [ -z "$FAILED_TESTS" ]; then
    echo "🎉 所有 E2E 测试通过！真实浏览器功能验证成功"
    echo ""
    echo "✅ 验收标准检查:"
    echo "   ✅ 拖拽手柄在真实浏览器中正确显示和隐藏"
    echo "   ✅ 实际拖拽操作能够重排段落"
    echo "   ✅ + 按钮点击能够添加新段落"
    echo "   ✅ AI 流式操作队列正确显示和管理"
    echo "   ✅ 操作批准/拒绝功能真实可用"
    echo "   ✅ 隐藏块完全不可见但功能正常"
    echo "   ✅ 多浏览器兼容性验证通过"
    echo "   ✅ 响应式设计在各尺寸下正常"
    echo "   ✅ 无严重性能问题或内存泄漏"
    echo ""
    echo "🚀 Demo 已通过完整的真实浏览器验证，可以放心使用！"
    RESULT_CODE=0
else
    echo "❌ 部分 E2E 测试失败，请检查上面的错误信息"
    echo ""
    echo "🔍 故障排查建议:"
    echo "   1. 查看 ./test-results/screenshots/ 中的失败截图"
    echo "   2. 检查 ./test-results/ 中的视频录像"
    echo "   3. 查看 HTML 报告了解详细错误信息"
    echo "   4. 确认开发服务器正常运行"
    echo "   5. 检查浏览器版本和 Playwright 兼容性"
    RESULT_CODE=1
fi

echo ""
echo "🔗 相关资源:"
echo "  ./playwright-report/index.html    # 详细 HTML 测试报告"
echo "  ./test-results/screenshots/       # 测试过程截图"
echo "  ./test-results/                   # 视频录像和trace文件"
echo "  http://127.0.0.1:9323            # 实时报告查看"
echo ""

echo "⚠️  注意: HTML 报告服务器正在后台运行 (PID: $REPORT_PID)"
echo "       使用 kill $REPORT_PID 来停止服务器"

# 清理服务器进程（如果我们启动的话）
if [ ! -z "$SERVER_PID" ]; then
    echo ""
    echo "🛑 停止开发服务器..."
    kill $SERVER_PID 2>/dev/null || true
fi

echo ""
echo "📚 其他可用命令:"
echo "  npx playwright test --ui          # 打开 Playwright UI 模式"
echo "  npx playwright test --headed      # 有界面模式运行测试"
echo "  npx playwright test --debug       # Debug 模式逐步执行"
echo "  npx playwright codegen URL        # 录制新的测试用例"
echo ""

exit $RESULT_CODE