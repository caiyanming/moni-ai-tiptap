# 🎯 拖拽实现管理策略

## 当前状况

- 主要优化实现: `packages/extension-drag-handle/` (包含 AppFlowy 算法)
- 实验性实现: `demos/src/Experiments/GlobalDragHandle/` (简单自定义实现)
- React/Vue 包装: `packages/extension-drag-handle-{react,vue}/`

## 推荐策略：软隔离

### 1. 🏷️ 明确标记实验性代码

```javascript
// demos/src/Experiments/GlobalDragHandle/Vue/DragHandle.js
/**
 * ⚠️  EXPERIMENTAL DRAG IMPLEMENTATION
 *
 * This is a simple experimental drag implementation for learning purposes.
 *
 * For production use, please use the optimized implementation:
 * @tiptap/extension-drag-handle (with AppFlowy-style algorithm)
 *
 * DO NOT use this implementation in production or tests.
 */
```

### 2. 📁 重构演示结构

```
demos/src/
├── Extensions/DragHandle/          # 使用我们的优化实现
│   ├── React/index.jsx            # ✅ 使用 @tiptap/extension-drag-handle
│   └── Vue/index.vue              # ✅ 使用优化算法
├── Experiments/
│   └── LegacyDragHandle/          # 重命名，明确标记为遗留代码
│       └── Vue/DragHandle.js      # ⚠️  标记为实验性，不用于测试
```

### 3. 🧪 创建专门的对比演示

创建一个对比演示页面，同时展示：

- 我们的优化实现 (AppFlowy 算法)
- 简单实现 (用作对比基准)
- 性能和精确度对比

### 4. 🔒 隔离测试环境

确保所有自动化测试只使用我们的优化实现：

```javascript
// 测试配置
const DRAG_DEMOS = {
  optimized: '/preview/Extensions/DragHandle', // ✅ 用于测试
  experimental: '/preview/Experiments/LegacyDragHandle', // ❌ 仅用于对比
}
```

## 优势

1. ✅ 保持 upstream 兼容性
2. ✅ 提供明确的实现区分
3. ✅ 避免开发时的混淆
4. ✅ 保留对比基准
5. ✅ 便于性能验证

## 具体执行步骤

1. 重命名实验性目录
2. 添加明确的警告注释
3. 修复主要演示页面的拖拽配置
4. 确保测试只使用优化实现
5. 创建对比演示页面
