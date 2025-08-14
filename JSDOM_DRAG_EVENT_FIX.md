# JSDOM 事件对象兼容性问题修复方案

## 问题描述

在运行 Vitest 单元测试时遇到以下错误：

```
TypeError: Failed to execute 'dispatchEvent' on 'EventTarget': parameter 1 is not of type 'Event'.
```

错误发生在使用标准 `new DragEvent()` 构造函数创建事件并尝试使用 `dispatchEvent()` 分发时。

## 根本原因分析

### 技术根源

1. **JSDOM 版本兼容性**: 项目使用 `jsdom@25.0.1`，较新版本的 JSDOM 对事件对象的类型检查更加严格
2. **事件验证机制**: JSDOM 使用内部符号键（Symbol keys）进行事件对象验证，标准构造函数创建的对象可能缺少这些内部标识符
3. **DataTransfer 实现差异**: JSDOM 的 DataTransfer 实现与原生浏览器 API 存在差异

### 影响范围

- 项目中约 25+ 个测试文件使用了 `new DragEvent()`
- 主要影响单元测试和集成测试
- 阻碍了拖拽功能的自动化测试

## 解决方案

### 方案1: CustomEvent + Object.assign（推荐）

使用 `CustomEvent` 作为基础事件，通过 `Object.assign` 添加拖拽相关属性：

```typescript
function createCompatibleDragEvent(type: string, options = {}) {
  const customEvent = new CustomEvent(type, {
    bubbles: options.bubbles ?? true,
    cancelable: options.cancelable ?? true,
  })

  return Object.assign(customEvent, {
    dataTransfer: options.dataTransfer || new DataTransfer(),
    clientX: options.clientX ?? 0,
    clientY: options.clientY ?? 0,
    // ... 其他拖拽属性
  })
}
```

**优势:**

- ✅ 完全兼容 JSDOM
- ✅ 保持原有 API 接口不变
- ✅ 支持所有拖拽事件属性
- ✅ 类型安全

### 方案2: Event Polyfill

在 `setup.ts` 中重写全局事件构造函数：

```typescript
global.DragEvent = class DragEvent extends Event {
  constructor(type, eventInitDict) {
    super(type, eventInitDict)
    this.dataTransfer = eventInitDict?.dataTransfer || new DataTransfer()
  }
}
```

**优势:**

- ✅ 无需修改现有测试代码
- ✅ 全局统一处理

**劣势:**

- ❌ 可能与其他测试环境冲突
- ❌ 维护复杂度较高

## 实施步骤

### 1. 更新测试环境配置

已修改 `tests/configs/setup.ts`：

- 添加 JSDOM 兼容的 DataTransfer mock
- 实现 `createDragEvent` 全局函数
- 增强 TypeScript 类型声明

### 2. 创建工具函数

创建 `tests/utils/drag-event-helpers.ts`：

- `createCompatibleDragEvent()` - 创建兼容事件
- `createDragEventSequence()` - 创建完整拖拽序列
- `createMockDataTransfer()` - 创建模拟数据传输对象

### 3. 代码迁移

#### 旧代码模式:

```typescript
const dragStartEvent = new DragEvent('dragstart', {
  dataTransfer: new DataTransfer(),
  clientX: 100,
  clientY: 120,
})
element.dispatchEvent(dragStartEvent)
```

#### 新代码模式:

```typescript
import { createCompatibleDragEvent } from '../utils/drag-event-helpers'

const dragStartEvent = createCompatibleDragEvent('dragstart', {
  dataTransfer: new DataTransfer(),
  clientX: 100,
  clientY: 120,
})
element.dispatchEvent(dragStartEvent)
```

### 4. 自动化迁移脚本

创建 `scripts/fix-drag-event-compatibility.js` 自动化处理：

```bash
node scripts/fix-drag-event-compatibility.js
```

## 验证步骤

### 1. 运行单元测试

```bash
npm run test:unit
```

### 2. 运行拖拽相关测试

```bash
npm run test:drag
```

### 3. 完整测试套件

```bash
npm run test
```

## 性能影响

- **内存影响**: 新的事件创建方式内存占用相近
- **执行时间**: CustomEvent 创建时间与 DragEvent 基本一致
- **兼容性**: 完全向后兼容现有测试逻辑

## 维护建议

### 1. 代码规范

- 统一使用 `createCompatibleDragEvent` 创建拖拽事件
- 在 ESLint 中添加规则禁止直接使用 `new DragEvent()`

### 2. 文档更新

- 更新测试编写指南
- 在 README 中添加拖拽测试最佳实践

### 3. 持续监控

- 监控 JSDOM 版本更新
- 关注上游修复进展

## 相关资源

- [JSDOM Issue #3331](https://github.com/jsdom/jsdom/issues/3331)
- [JSDOM Issue #2949](https://github.com/jsdom/jsdom/issues/2949)
- [Testing Library User Event Discussion #1209](https://github.com/testing-library/user-event/discussions/1209)

## 备选方案

如果推荐方案不可行，可考虑：

1. **降级 JSDOM 版本** - 回到兼容版本（不推荐）
2. **使用 Happy DOM** - 替换测试环境（需要验证兼容性）
3. **Mock 全部拖拽逻辑** - 避免真实事件分发（测试覆盖度降低）

---

**修复状态**: ✅ 完成  
**最后更新**: 2024年3月  
**负责人**: MoniAI 开发团队
