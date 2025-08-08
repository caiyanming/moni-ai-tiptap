# 🎯 拖拽系统测试套件

## 📋 测试架构

本测试套件采用分层架构，确保拖拽功能的各个层面都得到充分测试：

### 🧱 第一层：组件测试 (Component Tests)

- **drag-handle.test.ts** - 拖拽手柄渲染和交互
- **modern-drag-indicator.test.ts** - 拖拽指示器显示和动画

### ⚙️ 第二层：算法测试 (Algorithm Tests)

- **drop-position-calculator.test.ts** - AppFlowy算法位置计算
- **drag-handle-plugin.test.ts** - TipTap插件集成逻辑

### 🔗 第三层：集成测试 (Integration Tests)

- **integration.test.ts** - 完整拖拽流程测试
- **drag-smoothness-integration.test.ts** - 拖拽平滑度和性能
- **memory-leak.test.ts** - 内存泄漏和资源管理

## ✅ 质量标准

### 测试覆盖率要求

- **单元测试覆盖率**: > 90%
- **分支覆盖率**: > 85%
- **功能覆盖率**: 100%

### 性能标准

- 拖拽响应时间: < 50ms
- 内存泄漏: 0 tolerance
- 测试执行时间: < 2s per suite

### 维护性标准

- 每个测试文件 < 500行
- 测试用例描述清晰
- Mock和Spy使用规范

## 🏃 运行测试

```bash
# 运行所有拖拽测试
pnpm test:drag

# 运行特定类别
pnpm test:drag:unit
pnpm test:drag:integration
pnpm test:drag:performance

# 运行覆盖率报告
pnpm test:drag:coverage
```

## 📊 测试报告

测试结果会自动生成到 `tests/reports/drag-handle/` 目录。
