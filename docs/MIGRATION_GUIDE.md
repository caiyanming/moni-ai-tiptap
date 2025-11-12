# Migration Guide: fileChildrenBlock → HiddenBlock

## 📋 改动摘要

将 `@tiptap/extension-file-children-block` 替换为精简版的 `@tiptap/extension-hidden-block`。

### 核心变更

| 项目 | 旧设计 (fileChildrenBlock) | 新设计 (hiddenBlock) |
|------|----------------------------|----------------------|
| **可见性** | 可见（蓝色边框 + 图标） | 完全隐藏 (display:none) |
| **交互性** | 可展开/折叠、可拖拽 | 不可交互 |
| **UI 属性** | displayMode, title, fileCount, collapsed | 无（仅锚点必需属性） |
| **节点名称** | `fileChildrenBlock` | `hiddenBlock` |
| **插入方式** | ❌ 自动插入（复杂） | ✅ **手动调用（简洁）** |
| **维护职责** | ❌ 底层自动维护 | ✅ **上层显式控制** |

### 设计哲学

> **"Theory and practice sometimes clash. Theory loses. Every single time."** - Linus Torvalds

- **NO 底层自动化**: 避免与其他扩展冲突，保持简洁
- **YES 上层控制**: moni-ai-web 和 moni-ai-agent 显式管理 hiddenBlock
- **好品味**: 消除特殊情况，而不是增加条件判断

---

## 🔧 前端改动指南 (moni-ai-web)

### ⚠️ 核心职责变化

**旧设计**: 依赖底层自动插入 hiddenBlock
**新设计**: **前端负责在合适时机手动插入**

### 1. 更新依赖

**package.json**

```diff
{
  "dependencies": {
-   "@tiptap/extension-file-children-block": "workspace:*",
+   "@tiptap/extension-hidden-block": "workspace:*"
  }
}
```

### 2. 更新扩展导入

```diff
- import { FileChildrenBlock } from '@tiptap/extension-file-children-block'
+ import { HiddenBlock } from '@tiptap/extension-hidden-block'

const editor = new Editor({
  extensions: [
-   FileChildrenBlock,
+   HiddenBlock,
  ]
})
```

### 3. ⚠️ 手动插入 HiddenBlock（重要！）

**方式 1: onCreate 钩子（推荐用于新文档）**

```typescript
const editor = new Editor({
  extensions: [Document, Paragraph, Text, HiddenBlock],
  onCreate({ editor }) {
    // 新文档自动插入 hiddenBlock
    if (!editor.storage.hiddenBlock.hasHiddenBlock(editor)) {
      editor.commands.insertHiddenBlock()
    }
  },
})
```

**方式 2: 加载文档时检查**

```typescript
async function loadDocument(docId: string) {
  const content = await fetchDocumentContent(docId)

  editor.commands.setContent(content)

  // 确保有 hiddenBlock
  if (!editor.storage.hiddenBlock.hasHiddenBlock(editor)) {
    editor.commands.insertHiddenBlock()
  }
}
```

**方式 3: 创建新文档时立即插入**

```typescript
function createNewDocument() {
  // 先插入 hiddenBlock，再添加其他内容
  editor.commands.insertHiddenBlock()
  editor.commands.insertContentAt(editor.state.doc.content.size, '<p></p>')
}
```

### 4. 更新节点类型判断

```diff
- if (node.type.name === 'fileChildrenBlock') {
+ if (node.type.name === 'hiddenBlock') {
    // 处理锚点逻辑
  }
```

**或使用 moniBlockId 判断（推荐）**

```typescript
import { NULL_UUID } from '@tiptap/extension-hidden-block'

// 更通用的锚点判断方式
if (node.attrs.moniBlockId === NULL_UUID) {
  // 这是AI锚点
}
```

### 5. 删除 UI 相关代码

```diff
- const displayMode = node.attrs.displayMode  // ❌ 不再存在
- const isCollapsed = node.attrs.collapsed    // ❌ 不再存在
- const title = node.attrs.title              // ❌ 不再存在
```

**删除相关 CSS 样式**

```diff
- .file-children-block-container { ... }      // ❌ 删除
- .file-children-block-header { ... }         // ❌ 删除
```

### 6. 更新工具函数

```diff
- import { FileChildrenBlockUtils } from '@tiptap/extension-file-children-block'
+ import { HiddenBlockUtils } from '@tiptap/extension-hidden-block'

- FileChildrenBlockUtils.isFileChildrenBlock(node)
+ HiddenBlockUtils.isHiddenBlock(node)

- FileChildrenBlockUtils.createFileChildrenBlock()
+ HiddenBlockUtils.createHiddenBlock()
```

---

## 🖥️ 后端改动指南 (moni-ai-agent)

### 1. JSON 解析更新

```diff
- if ("fileChildrenBlock".equals(nodeType)) {
+ if ("hiddenBlock".equals(nodeType)) {
    // 处理锚点
  }
```

### 2. NULL_UUID 定位不变（零改动）

**后端只依赖 moniBlockId，无需改动：**

```java
// ✅ 这段代码不需要修改
public class StreamOperation {
    private static final String ANCHOR_ID = "13814000-1dd2-11b2-8080-808080808080";

    public void insertAfterAnchor(List<Block> blocks) {
        // 始终插入到 NULL_UUID 后面
        Position pos = findBlockPosition(ANCHOR_ID);
        insert(pos, blocks);
    }
}
```

### 3. 文档生成

**确保生成的文档包含 hiddenBlock**

```java
public TipTapDocument createNewDocument() {
    TipTapDocument doc = new TipTapDocument();

    // 新文档必须以 hiddenBlock 开头
    HiddenBlockNode anchor = new HiddenBlockNode();
    anchor.setId(NULL_UUID);
    anchor.setMoniBlockId(NULL_UUID);
    anchor.setHidden(true);
    anchor.setIsInitialBlock(true);
    anchor.setMoniDragEnabled(false);

    doc.addNode(anchor);
    return doc;
}
```

---

## 🔍 搜索清单（前端必做）

在 **moni-ai-web** 中搜索以下关键词：

```bash
# 1. 扩展导入
rg "FileChildrenBlock" --type ts --type tsx

# 2. 节点类型
rg "fileChildrenBlock" --type ts --type tsx

# 3. UI 属性
rg "displayMode|collapsed|title.*fileCount" --type ts --type tsx

# 4. CSS 类名
rg "file-children-block" --type css --type scss
```

---

## 📝 关键注意事项

### ⚠️ 破坏性变更

1. **节点类型改变**: `fileChildrenBlock` → `hiddenBlock`
2. **UI 属性移除**: displayMode、collapsed、title、fileCount 不再存在
3. **手动插入**: 需要在 onCreate 或创建文档时调用 `insertHiddenBlock()`

### ✅ 向后兼容（保持不变）

1. **NULL_UUID 不变**: 仍为 `13814000-1dd2-11b2-8080-808080808080`
2. **核心属性不变**: id、moniBlockId 保持一致
3. **定位逻辑不变**: 后端仍通过 moniBlockId 定位锚点

---

## 🚀 迁移步骤总结

### 前端（moni-ai-web）

1. ✅ 更新 package.json 依赖
2. ✅ 全局替换 `FileChildrenBlock` → `HiddenBlock`
3. ✅ 在 Editor 的 `onCreate` 中添加 `insertHiddenBlock()`
4. ✅ 删除 UI 属性相关代码（displayMode/collapsed/title）
5. ✅ 更新节点类型判断
6. ✅ 删除相关 CSS 样式
7. ✅ 运行测试验证

### 后端（moni-ai-agent）

1. ✅ 搜索并替换 `"fileChildrenBlock"` → `"hiddenBlock"`
2. ✅ 验证 NULL_UUID 定位逻辑未破坏
3. ✅ 更新文档生成逻辑（使用 hiddenBlock）
4. ✅ 运行集成测试验证

---

**生成时间**: 2025-10-15
**moni-ai-tiptap 版本**: 3.0.0-beta.22.3
