# @tiptap/extension-file-children-block

[![Version](https://img.shields.io/npm/v/@tiptap/extension-file-children-block.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-file-children-block)

This extension provides a FileChildrenBlock node that serves dual purpose:

1. **AI Operation Anchor**: Uses NULL_UUID (`13814000-1dd2-11b2-8080-808080808080`) for reliable AI targeting
2. **Sub-document Manager**: Provides visual interface for managing child documents

## Design Philosophy

**Simplicity First**: Unlike complex hidden block implementations, this extension follows Linus Torvalds' "good taste" principle:

- No configuration options (zero special cases)
- Always visible (no hiding logic)
- Fixed NULL_UUID identity (no variability)
- UI state only (collapsed/expanded, display mode)

## Installation

```bash
npm install @tiptap/extension-file-children-block
```

## Usage

### Basic Setup

```js
import { Editor } from '@tiptap/core'
import { FileChildrenBlock } from '@tiptap/extension-file-children-block'

const editor = new Editor({
  extensions: [
    FileChildrenBlock.configure({
      // No configuration needed - it just works
    }),
  ],
})
```

### Commands

```js
// Insert file children block
editor.commands.insertFileChildrenBlock()
```

### Storage API

```js
// Check if document has file children block
const hasBlock = editor.storage.fileChildrenBlock.hasFileChildrenBlock()

// Get block information
const info = editor.storage.fileChildrenBlock.getFileChildrenBlockInfo()

// Update UI state
editor.storage.fileChildrenBlock.updateFileChildrenBlockState({
  collapsed: false,
  displayMode: 'grid'
})
```

### Utility Functions

```js
import { FileChildrenBlockUtils, NULL_UUID } from '@tiptap/extension-file-children-block'

// Check if node is file children block
const isFileChildrenBlock = FileChildrenBlockUtils.isFileChildrenBlock(node)

// Check if node is the NULL_UUID block
const isNullUUIDBlock = FileChildrenBlockUtils.isNullUUIDFileChildrenBlock(node)

// Create block content
const blockContent = FileChildrenBlockUtils.createFileChildrenBlock({
  displayMode: 'cards'
})
```

## AI Integration

The block automatically uses NULL_UUID for AI targeting:

```js
// AI can target this block using:
const targetBlockId = "13814000-1dd2-11b2-8080-808080808080"
```

## Data Structure

The block stores minimal state:

```js
{
  type: 'fileChildrenBlock',
  attrs: {
    id: '13814000-1dd2-11b2-8080-808080808080',           // Fixed NULL_UUID
    moniBlockId: '13814000-1dd2-11b2-8080-808080808080',  // Moni compatibility
    collapsed: true,                                       // UI state
    displayMode: 'list',                                  // 'list' | 'grid' | 'cards'
    moniDragEnabled: false                                // Always disabled
  }
}
```

## HTML Output

```html
<div
  data-file-children-block="true"
  data-ai-target="13814000-1dd2-11b2-8080-808080808080"
  data-id="13814000-1dd2-11b2-8080-808080808080"
  data-moni-block-id="13814000-1dd2-11b2-8080-808080808080"
  data-collapsed="true"
  data-display-mode="list"
  data-moni-drag-enabled="false"
  class="file-children-block-container"
>
  <!-- Content -->
</div>
```

## License

MIT