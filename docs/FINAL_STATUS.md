# ✅ HiddenBlock 迁移最终状态

## 完成时间
2025-10-15 13:50

## 设计决策

### 最终方案：手动插入 hiddenBlock

经过技术分析和参考旧版实现，决定采用**手动插入**策略：

1. **HiddenBlock 扩展**：提供节点定义和 `insertHiddenBlock()` 命令
2. **前端（moni-ai-web）**：在创建编辑器时调用 `editor.commands.insertHiddenBlock()`
3. **后端（moni-ai-agent）**：生成文档时第一个节点设为 hiddenBlock

### 为什么不自动插入？

参考 Linus 的"实用主义"哲学：

> **"Theory and practice sometimes clash. Theory loses. Every single time."**

1. **旧版设计验证**：原始 HiddenBlock 实现就是手动插入，证明这个方案可行
2. **职责分离**：扩展提供能力，应用层控制时机
3. **复杂度控制**：自动插入需要 plugin state + appendTransaction，增加复杂度但没解决真问题
4. **调试友好**：手动插入更容易追踪和调试

---

## ✅ 完成清单

### 1. 核心文件

| 文件 | 状态 | 说明 |
|------|------|------|
| **packages/extension-hidden-block/src/hidden-block.ts** | ✅ | 节点定义 + 命令 |
| **packages/extension-hidden-block/src/types.ts** | ✅ | NULL_UUID + 类型定义 |
| **packages/extension-hidden-block/src/index.ts** | ✅ | 导出 + HiddenBlockUtils |
| **packages/extension-hidden-block/package.json** | ✅ | 包配置 |
| **packages/extension-hidden-block/tsup.config.ts** | ✅ | 构建配置 |
| **packages/extension-hidden-block/README.md** | ✅ | API 文档 |

### 2. 测试文件

| 文件 | 测试数量 | 状态 |
|------|----------|------|
| **tests/unit/extensions/hidden-block.test.ts** | 18 | ✅ 全部通过 |

### 3. 构建产物

```
dist/
├── index.js          # 6.2 KB (ESM)
├── index.cjs         # 7.4 KB (CommonJS)
├── index.d.ts        # 3.1 KB (TypeScript 定义 - ESM)
├── index.d.cts       # 3.1 KB (TypeScript 定义 - CJS)
├── index.js.map      # 12 KB (Source map)
└── index.cjs.map     # 12 KB (Source map)
```

✅ **双格式输出**：支持 ESM + CommonJS
✅ **TypeScript 支持**：完整类型定义
✅ **Source maps**：方便调试

### 4. 配置文件

| 文件 | 改动 | 状态 |
|------|------|------|
| **vitest.config.ts** | 更新 alias | ✅ |
| **packages/constants/src/index.ts** | 更新常量 | ✅ |
| **packages/extensions/src/index.ts** | 添加注释 | ✅ |
| **pnpm-lock.yaml** | 添加新扩展条目 | ✅ |

### 5. 归档文件

| 文件 | 位置 | 状态 |
|------|------|------|
| **extension-file-children-block/** | packages-deprecated/ | ✅ |
| **file-children-block.test.ts** | packages-deprecated/ | ✅ |

---

## 📋 核心 API

### 命令

```typescript
// 插入 hiddenBlock（手动）
editor.commands.insertHiddenBlock()
```

### Storage 方法

```typescript
// 检查是否存在 hiddenBlock
editor.storage.hiddenBlock.hasHiddenBlock(editor)  // boolean

// 获取 hiddenBlock 信息
editor.storage.hiddenBlock.getHiddenBlockInfo(editor)
// { exists: boolean, moniBlockId: string | null, isValid: boolean, position: number }

// 确保存在（自动插入）
editor.storage.hiddenBlock.ensureHiddenBlock(editor)
```

### 工具函数

```typescript
import { HiddenBlockUtils } from '@tiptap/extension-hidden-block'

// 检查节点类型
HiddenBlockUtils.isHiddenBlock(node)
HiddenBlockUtils.isNullUUIDHiddenBlock(node)

// 创建 hiddenBlock JSON
HiddenBlockUtils.createHiddenBlock()

// 文档迁移
HiddenBlockUtils.migrateDocument(doc)

// 过滤/恢复
HiddenBlockUtils.filterHiddenBlocks(content)
HiddenBlockUtils.restoreHiddenBlock(content)
```

---

## 🔧 前后端集成指南

### 前端（moni-ai-web）

#### 1. 新建文档

```typescript
const editor = new Editor({
  extensions: [Document, Paragraph, Text, HiddenBlock],
  onCreate({ editor }) {
    // 确保新文档有 hiddenBlock
    if (!editor.storage.hiddenBlock.hasHiddenBlock(editor)) {
      editor.commands.insertHiddenBlock()
    }
  },
})
```

#### 2. 加载旧文档

```typescript
import { HiddenBlockUtils } from '@tiptap/extension-hidden-block'

async function loadDocument(docId: string) {
  const rawDoc = await fetchDocumentJSON(docId)

  // 迁移：移除 fileChildrenBlock，添加 hiddenBlock
  const migratedDoc = HiddenBlockUtils.migrateDocument(rawDoc)

  editor.commands.setContent(migratedDoc)

  // 确保有 hiddenBlock
  if (!editor.storage.hiddenBlock.hasHiddenBlock(editor)) {
    editor.commands.insertHiddenBlock()
  }
}
```

### 后端（moni-ai-agent）

#### 1. 生成新文档

```java
import static com.moni.ai.constants.TipTapConstants.NULL_UUID;

public TipTapDocument createNewDocument() {
    TipTapDocument doc = new TipTapDocument();

    // 第一个节点：hiddenBlock
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

#### 2. 解析文档

```java
if ("hiddenBlock".equals(nodeType)) {
    // 处理锚点节点
} else if ("paragraph".equals(nodeType)) {
    // 处理段落节点
}
```

---

## 🧪 测试验证

### 运行测试

```bash
cd /Users/caiym/Source/ffx/moni.root/moni-agent/moni-ai-tiptap

# 运行 hidden-block 测试
pnpm vitest run tests/unit/extensions/hidden-block.test.ts

# 预期结果
✓ tests/unit/extensions/hidden-block.test.ts (18 tests) 54ms
  ✓ HiddenBlock Extension (18)
    ✓ Node Creation (3)
    ✓ Attributes (2)
    ✓ Commands (1)
    ✓ Storage Methods (3)
    ✓ HiddenBlockUtils (7)
    ✓ NULL_UUID Constant (2)

Test Files  1 passed (1)
Tests  18 passed (18)
```

### 测试覆盖

- ✅ 节点创建和属性
- ✅ 命令执行
- ✅ Storage 方法
- ✅ 工具函数（创建、迁移、过滤、恢复）
- ✅ NULL_UUID 常量

---

## 📚 文档清单

| 文档 | 路径 | 用途 |
|------|------|------|
| **MIGRATION_GUIDE.md** | moni-ai-tiptap/ | 前后端迁移步骤 |
| **CHANGELOG_HIDDEN_BLOCK.md** | moni-ai-tiptap/ | 设计哲学和技术细节 |
| **BUILD_MIGRATION_SUMMARY.md** | moni-ai-tiptap/ | 构建系统改动 |
| **BUILD_SYSTEM_CHECKLIST.md** | moni-ai-tiptap/ | 验证清单 |
| **README.md** | extension-hidden-block/ | API 使用文档 |
| **FINAL_STATUS.md** | moni-ai-tiptap/ | 本文档 |

---

## ⚠️ 关键注意事项

### 破坏性变更

1. **节点类型**: `fileChildrenBlock` → `hiddenBlock`
2. **UI 属性删除**: `displayMode`, `collapsed`, `title`, `fileCount`
3. **不自动插入**: 需要手动调用 `insertHiddenBlock()`

### 向后兼容

1. **NULL_UUID 不变**: `13814000-1dd2-11b2-8080-808080808080`
2. **核心属性保持**: `id`, `moniBlockId`
3. **定位逻辑不变**: 后端仍通过 `moniBlockId === NULL_UUID` 定位

### 前端必做

```bash
# 在 moni-ai-web 中搜索
rg "FileChildrenBlock" --type ts --type tsx
rg "fileChildrenBlock" --type ts --type tsx
rg "displayMode|collapsed" --type ts --type tsx
```

### 后端必做

```bash
# 在 moni-ai-agent 中搜索
rg "fileChildrenBlock" --type java
```

---

## 🎯 下一步行动

### 1. moni-ai-web

- [ ] 更新 package.json 依赖
- [ ] 全局替换 `FileChildrenBlock` → `HiddenBlock`
- [ ] 在 Editor 的 `onCreate` 钩子中添加 `insertHiddenBlock()`
- [ ] 删除 UI 相关代码（displayMode/collapsed）
- [ ] 添加文档迁移逻辑
- [ ] 运行测试验证

### 2. moni-ai-agent

- [ ] 搜索并替换 `"fileChildrenBlock"` → `"hiddenBlock"`
- [ ] 验证 NULL_UUID 定位逻辑
- [ ] 更新文档生成逻辑（使用 hiddenBlock）
- [ ] 运行集成测试

### 3. 数据迁移（可选）

```sql
-- 如果数据库存储了节点类型
UPDATE documents
SET content = REPLACE(content, '"type":"fileChildrenBlock"', '"type":"hiddenBlock"')
WHERE content LIKE '%fileChildrenBlock%';
```

---

## 🏆 成果总结

### 技术成就

- ✅ 恢复隐形锚点机制，消除可见 UI 复杂度
- ✅ 节点属性从 9 个减少到 5 个（-44%）
- ✅ 删除 displayMode 等 5 个 UI 属性
- ✅ 提供完整的工具函数和迁移支持
- ✅ 18 个单元测试全部通过
- ✅ 双格式输出（ESM + CJS）+ 完整类型定义

### Linus 式"好品味"

> **"Good taste means removing special cases, not adding conditions."**

**旧设计（fileChildrenBlock）**：
- ❌ 可见 UI + AI 锚点混合职责
- ❌ 需要在拖拽/渲染逻辑中特殊处理
- ❌ 5 个 UI 属性增加维护成本

**新设计（hiddenBlock）**：
- ✅ 纯锚点，零 UI 逻辑
- ✅ 完全隐形，不需要特殊处理
- ✅ 简洁设计，易于理解和维护

---

**状态**: ✅ **moni-ai-tiptap 改动完成，等待前后端集成**

**生成时间**: 2025-10-15 13:50
**作者**: MoniAI 开发团队
**审核**: Linus Torvalds（精神指导）
