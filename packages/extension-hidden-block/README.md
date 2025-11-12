# @tiptap/extension-hidden-block

**Hidden Block Extension - Invisible AI Anchor Point**

## Design Philosophy

> "Good programmers worry about data structures and their relationships."
> — Linus Torvalds

The hidden block is NOT a UI element. It's a **data structure anchor point** for AI stream operations.

### Core Principles

1. **Zero Visibility**: Completely invisible to users (display:none, no DOM footprint)
2. **Zero Configuration**: Immutable attributes locked to `NULL_UUID`
3. **Zero Special Cases**: Always at position 0, always present, always the same

### What It Replaces

This extension replaces the old `fileChildrenBlock` which had:

- ❌ UI attributes (displayMode, title, fileCount)
- ❌ User interaction (expandable, draggable)
- ❌ Visual rendering (colored border, icon)

The hidden block has:

- ✅ Single purpose: AI insertion anchor
- ✅ Zero UI logic
- ✅ Automatic self-repair

## Installation

```bash
pnpm add @tiptap/extension-hidden-block
```

## Basic Usage

```typescript
import { Editor } from '@tiptap/core'
import { HiddenBlock } from '@tiptap/extension-hidden-block'

const editor = new Editor({
  extensions: [
    HiddenBlock,
    // ... other extensions
  ],
})

// The hidden block is automatically inserted at document start
// No configuration needed!
```

## API

### Storage Methods

```typescript
// Check if hidden block exists
editor.storage.hiddenBlock.hasHiddenBlock(editor)
// Returns: boolean

// Get hidden block information
editor.storage.hiddenBlock.getHiddenBlockInfo(editor)
// Returns: { exists: boolean, moniBlockId: string | null, isValid: boolean, position: number }

// Ensure hidden block exists (auto-insert if missing)
editor.storage.hiddenBlock.ensureHiddenBlock(editor)
```

### Commands

```typescript
// Manually insert hidden block (rarely needed)
editor.commands.insertHiddenBlock()
```

### Utilities

```typescript
import { HiddenBlockUtils, NULL_UUID } from '@tiptap/extension-hidden-block'

// Check if node is hidden block
HiddenBlockUtils.isHiddenBlock(node)

// Check if node is the NULL_UUID anchor
HiddenBlockUtils.isNullUUIDHiddenBlock(node)

// Create hidden block JSON
const block = HiddenBlockUtils.createHiddenBlock()

// Migrate from old fileChildrenBlock
const migratedDoc = HiddenBlockUtils.migrateDocument(doc)

// Filter hidden blocks (for export)
const visibleContent = HiddenBlockUtils.filterHiddenBlocks(content)

// Restore hidden block (for import)
const fullContent = HiddenBlockUtils.restoreHiddenBlock(content)
```

## How It Works

### Guardian Plugin

The extension includes a ProseMirror plugin that enforces three rules:

1. **Existence Rule**: Document must start with a hidden block
2. **Immutability Rule**: Attributes must always be `DEFAULT_HIDDEN_BLOCK_ATTRS`
3. **Protection Rule**: Hidden block cannot be deleted

Any violation triggers automatic repair:

```typescript
// User tries to delete hidden block
editor.commands.deleteRange({ from: 0, to: 10 })
// → Transaction blocked by guardian plugin

// User modifies attributes
editor.commands.updateAttributes('hiddenBlock', { id: 'custom-id' })
// → Auto-reset to NULL_UUID on next transaction
```

### NULL_UUID

The constant `13814000-1dd2-11b2-8080-808080808080` serves as the permanent anchor identifier.

AI stream operations can always target this ID without checking document structure:

```typescript
// Backend always inserts after NULL_UUID
const operation = {
  type: 'insert_after',
  targetId: '13814000-1dd2-11b2-8080-808080808080',
  content: [...newBlocks],
}
```

## Migration from fileChildrenBlock

### Automatic Migration

```typescript
import { HiddenBlockUtils } from '@tiptap/extension-hidden-block'

// Old document with fileChildrenBlock
const oldDoc = {
  type: 'doc',
  content: [
    { type: 'fileChildrenBlock', attrs: { displayMode: 'list', ... } },
    { type: 'paragraph', content: [...] }
  ]
}

// Migrate to hidden block
const newDoc = HiddenBlockUtils.migrateDocument(oldDoc)
// Result:
// {
//   type: 'doc',
//   content: [
//     { type: 'hiddenBlock', attrs: { id: NULL_UUID, ... } },
//     { type: 'paragraph', content: [...] }
//   ]
// }
```

### Code Migration

Replace all references:

```diff
- import { FileChildrenBlock } from '@tiptap/extension-file-children-block'
+ import { HiddenBlock } from '@tiptap/extension-hidden-block'

- extensions: [FileChildrenBlock]
+ extensions: [HiddenBlock]

- node.type.name === 'fileChildrenBlock'
+ node.type.name === 'hiddenBlock'

- node.attrs.displayMode
+ // Delete this - hidden blocks have no UI attributes
```

## Technical Details

### Node Attributes

| Attribute         | Value       | Purpose                  |
| ----------------- | ----------- | ------------------------ |
| `id`              | `NULL_UUID` | Block identifier         |
| `moniBlockId`     | `NULL_UUID` | Moni system identifier   |
| `hidden`          | `true`      | Hide from rendering      |
| `isInitialBlock`  | `true`      | Mark as anchor point     |
| `moniDragEnabled` | `false`     | Disable drag interaction |

### HTML Output

```html
<div
  data-hidden-block="true"
  data-ai-target="anchor"
  data-id="13814000-1dd2-11b2-8080-808080808080"
  data-moni-block-id="13814000-1dd2-11b2-8080-808080808080"
  data-initial-block="true"
  data-moni-drag-enabled="false"
  style="display:none;height:0;width:0;overflow:hidden;position:absolute;"
></div>
```

### Performance

- **Zero visual cost**: No DOM rendering in viewport
- **Zero interaction cost**: Cannot be selected/dragged
- **Minimal memory**: 5 attributes, no content, no children

## License

MIT
