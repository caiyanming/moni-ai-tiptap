# Schema 设计规范

## 核心原则

遵循 HTML 的设计哲学：**没有设置就不序列化**。

## 三层数据分离

### 1. 持久化属性（Schema attrs）

**定义在**: `addAttributes()`
**生命周期**: 随文档保存/加载

**重要说明**：

- ProseMirror 要求所有 attrs 必须有 `default` 值（这是框架限制）
- 我们的策略：**Schema 保留 default，但序列化时不输出等于 default 的值**
- 这样既满足 ProseMirror 运行时需求，又达成"清洁序列化"目标

**规则**:

- ✅ 设置合理的 `default` 值（满足 ProseMirror 要求）
- ✅ 序列化时过滤等于 `default` 的值（由 `Node.toJSON` 自动处理）
- ✅ 只在 `renderHTML` 里输出非默认值

```typescript
// ✅ 正确示例
addAttributes() {
  return {
    moniBlockId: {
      default: null,  // ← ProseMirror 需要
      parseHTML: el => el.getAttribute('data-block-id'),
      renderHTML: attrs => {
        // 只在非默认值时渲染
        if (attrs.moniBlockId !== null) {
          return { 'data-block-id': attrs.moniBlockId }
        }
        return null
      }
    },

    moniLevel: {
      default: 0,  // ← ProseMirror 需要
      parseHTML: el => {
        const level = el.getAttribute('data-level')
        return level !== null ? parseInt(level, 10) : 0
      },
      renderHTML: attrs => {
        // 只在非默认值时渲染
        if (attrs.moniLevel !== 0) {
          return { 'data-level': attrs.moniLevel }
        }
        return null
      }
    }
  }
}

// ❌ 错误示例（不设置 default 会导致 ProseMirror 报错）
addAttributes() {
  return {
    moniBlockId: {
      // 缺少 default！ProseMirror 会报错
      parseHTML: el => el.getAttribute('data-block-id'),
    }
  }
}
```

---

### 2. 运行时状态（Runtime Storage）

**定义在**: `editor.storage.runtimeState`
**生命周期**: 编辑器实例存在期间
**用途**: 拖拽、UI 状态、临时标记

```typescript
// ✅ 正确示例
editor.storage.runtimeState.dragEnabled.set(nodeId, true)
const enabled = editor.storage.runtimeState.dragEnabled.get(nodeId) ?? false

// ❌ 错误示例
node.attrs.moniDragEnabled = true // ← 禁止！
```

---

### 3. 临时状态（Transaction Meta）

**定义在**: `tr.setMeta()`
**生命周期**: 单个事务
**用途**: Diff、Stream 操作的中间数据

```typescript
// ✅ 正确示例
tr.setMeta('diffOperation', { tempId: '...', blocks: [...] })

// ❌ 错误示例
node.attrs.moniDiffTempId = '...'  // ← 禁止！
```

---

## 读取默认值

使用 `getNodeAttr` 辅助函数：

```typescript
import { getNodeAttr } from '@/helpers/nodeAttrs'

// ✅ 正确
const level = getNodeAttr(node, 'moniLevel', 0)

// ❌ 错误
const level = node.attrs.moniLevel // 可能是 undefined
```

---

## 数组/对象型属性

如果默认值是数组或对象，必须：

1. **返回 undefined 表示"未设置"**
2. **只在非空时序列化**

```typescript
addAttributes() {
  return {
    moniCanNestIn: {
      parseHTML: el => {
        const value = el.getAttribute('data-can-nest-in')
        if (!value) return undefined  // ← 关键

        try {
          const parsed = JSON.parse(value)
          return parsed.length > 0 ? parsed : undefined
        } catch {
          return undefined
        }
      },

      renderHTML: attrs => {
        if (attrs.moniCanNestIn?.length > 0) {
          return { 'data-can-nest-in': JSON.stringify(attrs.moniCanNestIn) }
        }
        return null
      }
    }
  }
}

// 读取时
const nestIn = getNodeAttr(node, 'moniCanNestIn', [])
```

---

## 迁移检查清单

从旧设计迁移扩展时，检查：

- [ ] 删除所有 `default` 字段
- [ ] `renderHTML` 只在有值时输出
- [ ] `parseHTML` 无值时返回 `undefined`
- [ ] 运行时属性（drag/stream 等）移到 `storage`
- [ ] 临时属性（diff/temp 等）移到 `tr.meta`
- [ ] 读取属性改用 `getNodeAttr`
- [ ] 测试验证"未设置 = 不序列化"

---

## 为什么这样设计？

### 对比 HTML

```html
<!-- HTML 不会输出默认值 -->
<div>content</div>

<!-- 而不是 -->
<div class="null" id="null" draggable="false">content</div>
```

### 对比当前问题

```json
// ❌ 旧设计：每个节点都携带 10+ 个默认值
{
  "type": "paragraph",
  "attrs": {
    "moniParentId": null,
    "moniLevel": 0,
    "moniStreamMode": "replace",
    "moniDragEnabled": false
    // ...
  }
}

// ✅ 新设计：只序列化真正设置的值
{
  "type": "paragraph"
}
```

### 收益

- **存储占用**: 减少 60-80%
- **Yjs 补丁**: 减少 70-90%（协同更快）
- **内存占用**: 减少运行时冗余数据
- **架构清晰**: 持久化/运行时/临时 明确分离

---

## 参考

- [ProseMirror Schema Guide](https://prosemirror.net/docs/guide/#schema)
- [TipTap Node Extensions](https://tiptap.dev/guide/custom-extensions)
- [HTML Attribute Specification](https://html.spec.whatwg.org/multipage/syntax.html#attributes-2)
