# 🎯 拖拽系统E2E测试套件

## 📋 测试架构（整理后）

### 🎪 核心功能测试 (drag-behavior/)

- **basic-drag-operations.spec.ts** - 基础拖拽操作验证（段落重排序）

### ⚡ 性能测试 (performance/)

- **drag-performance.spec.ts** - 拖拽性能、流畅度、内存泄漏检测
- **appflowy-algorithm-test.spec.ts** - AppFlowy位置算法精确性验证
- **notion-drag-verification.spec.ts** - Notion级别拖拽体验验证

### 🔧 UI和集成测试

- **ui-positioning/handle-visibility.spec.ts** - 拖拽手柄显示和隐藏逻辑
- **react-hooks/useMultiBlockSelection.e2e.spec.ts** - React Hooks集成测试
- **drag-fluidity-real.spec.ts** - 真实拖拽流畅度验证

### 🌐 跨浏览器测试 (cross-browser/)

- 预留目录，用于未来跨浏览器兼容性测试

## 🎯 测试原则

### 可靠性原则

- 每个测试独立运行
- 稳定的选择器策略
- 合理的等待和重试机制

### 可维护性原则

- 使用Page Object模式
- 统一的测试工具函数
- 清晰的错误信息

### 性能原则

- 最小化测试执行时间
- 并行执行非冲突测试
- 智能的测试数据管理

## 🛠️ 辅助工具

### DragTestHelper

统一的拖拽测试助手，提供：

- 标准化的拖拽操作
- 智能等待机制
- 详细的错误报告
- 性能指标收集

### 环境配置

- **Chrome**: 主要测试环境
- **Firefox**: 兼容性验证
- **Safari**: macOS兼容性（可选）
- **Mobile**: 移动端适配（未来）

## 🏃 运行指南

```bash
# 运行所有e2e测试
pnpm test:e2e

# 运行特定测试分类
pnpm test:e2e:core
pnpm test:e2e:performance
pnpm test:e2e:integration

# 调试模式
pnpm test:e2e:debug
```
