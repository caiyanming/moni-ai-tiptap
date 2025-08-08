# 🧪 E2E 拖拽验证脚本集合

本目录包含各种拖拽功能验证和调试脚本，用于开发和问题排查。

## 📝 脚本说明

### 基础验证脚本

- **`quick-drag-test.js`** - 快速验证拖拽功能基本可用性
- **`quick-drag-check.js`** - 快速检查拖拽手柄显示
- **`quick-validation.js`** - 快速全面验证

### 功能验证脚本

- **`simple-drag-verification.js`** - 简单拖拽功能验证
- **`correct-drag-verification.js`** - 校验拖拽功能正确性
- **`real-drag-verification.js`** - 真实场景拖拽验证
- **`final-drag-verification.js`** - 最终完整功能验证
- **`drag-function-verification.js`** - 详细拖拽功能分析

### 调试分析脚本

- **`debug-drag.js`** - 拖拽行为调试工具
- **`debug-drag-loading.js`** - 调试拖拽组件加载问题
- **`patient-drag-verification.js`** - 耐心等待式验证(处理加载延迟)

## 🚀 使用方法

```bash
# 快速验证拖拽功能
node tests/e2e/scripts/quick-drag-test.js

# 调试拖拽问题
node tests/e2e/scripts/debug-drag.js

# 完整验证流程
node tests/e2e/scripts/final-drag-verification.js
```

## 📋 注意事项

1. **运行前提**: 确保开发服务器已启动 (`pnpm run dev`)
2. **浏览器要求**: 需要安装 Playwright 浏览器 (`pnpm exec playwright install`)
3. **调试模式**: 设置 `headless: false` 可视化调试过程
4. **性能监控**: 部分脚本包含性能监控功能

## 🔧 开发指南

这些脚本主要用于：

- 功能开发过程中的快速验证
- 问题排查和调试分析
- 发布前的功能确认
- 性能和兼容性测试

建议使用标准的 E2E 测试套件 (`pnpm run test:e2e`) 进行正式测试。
