# 🎯 拖拽系统E2E测试套件

## 📋 测试架构

### 🎪 核心功能测试 (Core Features)
- **drag-operations.spec.ts** - 基础拖拽操作验证
- **handle-visibility.spec.ts** - 手柄显示和隐藏逻辑

### ⚡ 性能测试 (Performance)  
- **drag-performance.spec.ts** - 拖拽性能和响应时间
- **appflowy-algorithm.spec.ts** - 位置算法准确性验证

### 🔧 集成测试 (Integration)
- **cross-browser.spec.ts** - 跨浏览器兼容性
- **real-world-scenarios.spec.ts** - 真实使用场景

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