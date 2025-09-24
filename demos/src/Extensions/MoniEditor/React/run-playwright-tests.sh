#!/bin/bash

# 🎭 Playwright 测试运行脚本
# MoniAI TipTap Editor - 从 Cypress 迁移到 Playwright

echo "🎭 启动 MoniAI TipTap Editor Playwright 测试套件"
echo "======================================================="

# 检查开发服务器是否运行
echo "🔍 检查开发服务器状态..."
if curl -s --max-time 5 "http://localhost:3668/src/Extensions/MoniEditor/React/" | grep -q "html"; then
    echo "✅ 开发服务器正在运行 (http://localhost:3668)"
else
    echo "❌ 开发服务器未运行，请先启动服务器："
    echo "   npm start"
    exit 1
fi

# 创建测试结果目录
mkdir -p test-results

echo ""
echo "🎯 可选择的测试套件："
echo "1. 🚀 POC 测试 - 验证真实拖拽功能"
echo "2. 🎯 DragHandle 迁移测试 - 完整的拖拽手柄功能"
echo "3. 🔄 StreamOperations 迁移测试 - AI 流式操作"
echo "5. 🌟 所有迁移测试"
echo "6. 🔄 跨浏览器测试 (Chrome, Firefox, Safari)"
echo ""

# 如果提供了参数，直接运行对应的测试
if [ "$1" ]; then
    TEST_SUITE="$1"
else
    read -p "请选择要运行的测试套件 (1-6): " TEST_SUITE
fi

case $TEST_SUITE in
    1|poc)
        echo "🚀 运行 POC 测试..."
        npx playwright test drag-handle-poc.spec.js --project=chromium
        ;;
    2|drag)
        echo "🎯 运行 DragHandle 迁移测试..."
        npx playwright test drag-handle-migrated.spec.js --project=chromium
        ;;
    3|stream)
        echo "🔄 运行 StreamOperations 迁移测试..."
        npx playwright test stream-operations-migrated.spec.js --project=chromium
        ;;
    4|hidden)
        ;;
    5|all)
        echo "🌟 运行所有迁移测试..."
        npx playwright test *-migrated.spec.js --project=chromium
        ;;
    6|cross)
        echo "🔄 运行跨浏览器测试..."
        npx playwright test *-migrated.spec.js
        ;;
    *)
        echo "❌ 无效选择，请重新运行脚本"
        exit 1
        ;;
esac

echo ""
echo "📊 测试完成！"
echo "📁 测试结果保存在: ./test-results/"
echo "🎯 HTML 报告: npx playwright show-report"
echo ""

# 显示测试结果统计
if [ -f "test-results/results.json" ]; then
    echo "📈 测试统计:"
    echo "   详见 test-results/results.json"
fi

echo "✨ Playwright 迁移完成！"
echo "🎉 相比 Cypress，Playwright 提供了："
echo "   ✅ 真实的拖拽操作验证"
echo "   ✅ 更精确的DOM可见性检测"
echo "   ✅ 更好的异步操作处理"
echo "   ✅ 跨浏览器兼容性测试"
echo "   ✅ 内存和性能监控"
echo "   ✅ 更稳定的测试执行"