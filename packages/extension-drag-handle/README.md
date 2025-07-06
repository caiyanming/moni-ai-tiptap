# @tiptap/extension-drag-handle

🎯 **Notion风格的拖拽手柄扩展，支持块拖拽和快速添加功能**

## ✨ 功能特性

- 🎨 **Notion风格UI**：6个网格点的拖拽手柄 + 加号按钮
- 🖱️ **拖拽重排**：支持块级元素的拖拽重新排序
- ➕ **快速添加**：点击+号按钮快速在当前块下方插入新块
- 🎯 **精确定位**：准确计算插入位置，支持复杂嵌套结构
- ♿ **无障碍支持**：完整的键盘导航和屏幕阅读器支持
- 🔧 **高度可定制**：提供丰富的回调函数支持自定义行为
- 📱 **响应式设计**：适配各种屏幕尺寸
- 🧪 **完整测试**：包含单元测试和集成测试

## 🚀 快速开始

### 安装

```bash
npm install @tiptap/extension-drag-handle
```

### 基础使用

```typescript
import { Editor } from '@tiptap/core'
import { DragHandle } from '@tiptap/extension-drag-handle'

const editor = new Editor({
  extensions: [
    // ... 其他扩展
    DragHandle.configure({
      onAddBlock: ({ node, editor, position }) => {
        // 处理添加新块的逻辑
        editor.chain().focus().insertContentAt(position, '<p></p>').run()
      },
    }),
  ],
})
```

### 完整配置

```typescript
const editor = new Editor({
  extensions: [
    DragHandle.configure({
      // 🎯 添加新块的回调函数
      onAddBlock: ({ node, editor, position }) => {
        console.log('添加新块', { node, position })
        editor.chain().focus().insertContentAt(position, '<p></p>').run()
      },

      // 🖱️ 拖拽开始事件
      onDragStart: (event, editor) => {
        console.log('开始拖拽', event)
        // 可以在这里设置拖拽数据
      },

      // 📍 拖拽经过事件
      onDragOver: (event, dropInfo, editor) => {
        console.log('拖拽经过', { event, dropInfo })
        // 可以在这里显示拖拽指示器
      },

      // 🎯 拖拽放下事件
      onDrop: (event, dropInfo, editor) => {
        console.log('拖拽放下', { event, dropInfo })
        // 处理拖拽放下的逻辑
      },
    }),
  ],
})
```

## 🎨 UI设计

### 拖拽手柄样式
- **容器**：flex布局，居中对齐，4px间距
- **拖拽手柄**：18×18像素，6个网格点排列
- **加号按钮**：18×18像素，圆角按钮
- **悬停效果**：背景色变化，点颜色加深

### 颜色方案
```css
/* 默认状态 */
--dot-color: #9ca3af;
--bg-color: transparent;

/* 悬停状态 */
--dot-color-hover: #6b7280;
--bg-color-hover: #f3f4f6;
```

## 📱 响应式设计

扩展支持各种屏幕尺寸：
- **桌面端**：完整功能，悬停效果
- **平板端**：触摸友好的按钮尺寸
- **移动端**：长按拖拽，点击添加

## ♿ 无障碍支持

### 键盘导航
- `Tab`: 聚焦到拖拽手柄
- `Enter/Space`: 触发添加块操作
- `Escape`: 取消当前操作

### 屏幕阅读器
- 拖拽手柄：`aria-label="Drag to reorder"`
- 加号按钮：`aria-label="Add block"`
- 语义化的HTML结构

## 🔧 高级用法

### 自定义渲染函数

如果需要完全自定义UI，可以覆盖默认的render函数：

```typescript
DragHandle.configure({
  render: () => {
    const container = document.createElement('div')
    container.className = 'my-custom-drag-handle'
    // 自定义实现...
    return container
  },
  onAddBlock: ({ node, editor, position }) => {
    // 自定义添加块逻辑
  },
})
```

### 集成QuickInsert菜单

```typescript
DragHandle.configure({
  onAddBlock: ({ node, editor, position }) => {
    // 显示QuickInsert菜单
    showQuickInsertMenu({
      position,
      onSelect: (blockType) => {
        const content = getBlockContent(blockType)
        editor.chain().focus().insertContentAt(position, content).run()
      },
    })
  },
})
```

### 拖拽数据处理

```typescript
DragHandle.configure({
  onDragStart: (event, editor) => {
    // 设置拖拽数据
    event.dataTransfer?.setData('text/plain', 'block-data')
    event.dataTransfer?.setData('application/json', JSON.stringify({
      type: 'block',
      data: '...',
    }))
  },

  onDrop: (event, dropInfo, editor) => {
    // 处理拖拽数据
    const data = event.dataTransfer?.getData('application/json')
    if (data) {
      const blockData = JSON.parse(data)
      // 处理块数据...
    }
  },
})
```

## 🧪 测试

### 运行测试

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage

# CI模式
npm run test:ci
```

### 测试覆盖范围

- ✅ 扩展配置和注册
- ✅ Notion风格UI渲染
- ✅ 事件处理（点击、拖拽）
- ✅ 回调函数调用
- ✅ DOM结构验证
- ✅ 无障碍属性检查
- ✅ 错误处理
- ✅ 性能测试
- ✅ 集成测试

### 测试文件结构

```
src/__tests__/
├── setup.ts              # 测试环境配置
├── drag-handle.spec.ts   # 主扩展测试
├── drag-handle-plugin.spec.ts # 插件层测试
└── integration.spec.ts   # 集成测试
```

## 📚 API参考

### DragHandleOptions

```typescript
interface DragHandleOptions {
  /**
   * 点击+号按钮的回调函数
   */
  onAddBlock?: (options: {
    node: Node | null
    editor: Editor
    position: number
  }) => void

  /**
   * 拖拽开始事件
   */
  onDragStart?: (event: DragEvent, editor: Editor) => void

  /**
   * 拖拽经过事件
   */
  onDragOver?: (event: DragEvent, dropInfo: DropInfo, editor: Editor) => void

  /**
   * 拖拽放下事件
   */
  onDrop?: (event: DragEvent, dropInfo: DropInfo, editor: Editor) => void

  /**
   * 自定义渲染函数
   */
  render?: () => HTMLElement
}
```

### DropInfo

```typescript
interface DropInfo {
  clientX: number
  clientY: number
  // 其他拖拽相关信息...
}
```

## 🏗️ 架构设计

### 层次结构

```
DragHandle Extension
├── DragHandleOptions (配置接口)
├── render() (默认Notion风格渲染)
└── DragHandlePlugin (ProseMirror插件)
    ├── DOM事件处理
    ├── 位置计算
    └── 回调函数调用
```

### 设计原则

1. **向后兼容**：现有代码无需修改
2. **可选功能**：所有功能都是可选的
3. **扩展性好**：为未来功能预留接口
4. **性能优先**：最小化DOM操作和事件监听
5. **类型安全**：完整的TypeScript类型定义

## 🔄 版本历史

### 3.0.0-beta.22
- ✨ 新增Notion风格+号按钮功能
- 🎨 重新设计UI，采用6个网格点的拖拽手柄
- ♿ 增强无障碍支持
- 🧪 添加完整的单元测试和集成测试
- 📝 完善文档和示例

### 3.0.0-beta.21
- 🐛 修复拖拽事件处理问题
- 🔧 优化性能和内存使用

## 🤝 贡献指南

1. Fork项目
2. 创建feature分支 (`git checkout -b feature/amazing-feature`)
3. 提交改动 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

### 开发环境

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 运行测试
npm test

# 构建
npm run build
```

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🔗 相关链接

- [TipTap官网](https://tiptap.dev/)
- [GitHub仓库](https://github.com/ueberdosis/tiptap)
- [在线Demo](https://tiptap.dev/docs/editor/extensions/functionality/drag-handle)
- [问题反馈](https://github.com/ueberdosis/tiptap/issues)

---

⭐ 如果这个扩展对你有帮助，请给项目点个星星！
