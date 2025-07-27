# @tiptap/extension-hidden-block

[![Version](https://img.shields.io/npm/v/@tiptap/extension-hidden-block.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-hidden-block)
[![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-hidden-block.svg)](https://npmcharts.com/compare/@tiptap/extension-hidden-block?minimal=true)
[![License](https://img.shields.io/npm/l/@tiptap/extension-hidden-block.svg)](https://www.npmjs.com/package/@tiptap/extension-hidden-block)

This TipTap extension provides native support for hidden blocks with standardized NULL_UUID functionality, specifically designed for AI-driven Block Stream operations.

## Features

- 🔒 **Hidden Block Rendering**: Blocks with `hidden: true` and `isInitialBlock: true` are completely invisible to users
- 🎯 **NULL_UUID Support**: Standardized `13814000-1dd2-11b2-8080-808080808080` UUID for AI operation targeting
- 🤖 **AI Integration**: Provides operation targets for empty documents in Block Stream systems
- 📄 **JSON Preservation**: Hidden blocks remain in document JSON data structure
- 🔧 **DOM Filtering**: Uses ProseMirror plugins to filter hidden elements from DOM rendering
- 🛡️ **Interaction Prevention**: Blocks user interaction with hidden elements

## Installation

```bash
npm install @tiptap/extension-hidden-block
```

## Usage

### Basic Usage

```typescript
import { Editor } from '@tiptap/core'
import { HiddenBlock } from '@tiptap/extension-hidden-block'

const editor = new Editor({
  extensions: [
    HiddenBlock.configure({
      hideFromDOM: true, // Enable DOM filtering (default: true)
      nullUUID: '13814000-1dd2-11b2-8080-808080808080' // Custom NULL_UUID (optional)
    })
  ]
})

// Insert a hidden NULL_UUID block
editor.commands.insertHiddenBlock()
```

### With Utilities

```typescript
import { HiddenBlock, NULL_UUID, HiddenBlockUtils } from '@tiptap/extension-hidden-block'

// Create a hidden block manually
const hiddenBlock = HiddenBlockUtils.createNullUUIDBlock()

// Check if document has visible content
const hasContent = HiddenBlockUtils.hasVisibleContent(documentJSON)

// Filter hidden blocks for display
const displayContent = HiddenBlockUtils.filterHiddenBlocks(documentJSON)

// Restore hidden blocks for saving
const saveContent = HiddenBlockUtils.restoreHiddenBlocks(editedContent, originalContent)

// Initialize empty document with NULL_UUID block
const emptyDoc = HiddenBlockUtils.initializeEmptyDocument()
```

### Document-First Architecture Integration

```typescript
// Frontend - Filter hidden blocks for display
const DocumentEditor = () => {
  const displayContent = useMemo(() => {
    if (!documentContent) return null
    return HiddenBlockUtils.filterHiddenBlocks(documentContent)
  }, [documentContent])

  const handleSave = (editedContent) => {
    // Restore hidden blocks before saving
    const completeContent = HiddenBlockUtils.restoreHiddenBlocks(
      editedContent,
      originalDocumentContent
    )
    saveDocument(completeContent)
  }

  return <TipTapEditor content={displayContent} onChange={handleSave} />
}

// Backend - Generate default content with NULL_UUID block
const getDefaultDocumentContent = () => {
  return HiddenBlockUtils.initializeEmptyDocument()
}
```

## Configuration

```typescript
interface HiddenBlockOptions {
  /**
   * HTML attributes for hidden block nodes
   * @default {}
   */
  HTMLAttributes: Record<string, any>

  /**
   * Whether to completely remove hidden blocks from DOM rendering
   * @default true
   */
  hideFromDOM: boolean

  /**
   * NULL_UUID constant for standardized hidden block IDs
   * @default '00000000-0000-0000-0000-000000000000'
   */
  nullUUID: string
}
```

## Commands

### `insertHiddenBlock()`

Inserts a hidden block with NULL_UUID configuration.

```typescript
editor.commands.insertHiddenBlock()
```

## Storage API

Access utility methods via the extension's storage:

```typescript
// Check if document has NULL_UUID blocks
const hasNullBlock = editor.storage.hiddenBlock.hasNullUUIDBlock()

// Count hidden blocks
const hiddenCount = editor.storage.hiddenBlock.getHiddenBlockCount()

// Get all NULL_UUID block IDs
const nullBlocks = editor.storage.hiddenBlock.getNullUUIDBlocks()
```

## Architecture Design

### Hidden Block Structure

```json
{
  "type": "hiddenBlock",
  "attrs": {
    "id": "00000000-0000-0000-0000-000000000000",
    "moniBlockId": "00000000-0000-0000-0000-000000000000",
    "hidden": true,
    "isInitialBlock": true,
    "moniDragEnabled": false
  },
  "content": []
}
```

### DOM Filtering Process

1. **JSON Preservation**: Hidden blocks remain in document JSON structure
2. **DOM Filtering**: ProseMirror plugin filters hidden blocks from DOM rendering
3. **Interaction Prevention**: Mouse and keyboard events are blocked for hidden elements
4. **AI Accessibility**: AI can still target these blocks for operations

### Block Stream Integration

```typescript
// AI can target NULL_UUID blocks for operations
const streamOperation = {
  type: 'insert_after',
  blockId: '13814000-1dd2-11b2-8080-808080808080', // NULL_UUID - 零映射架构
  content: { type: 'paragraph', content: [{ type: 'text', text: 'New content' }] }
}
```

## Use Cases

1. **Empty Document Initialization**: Provide AI with operation targets in empty documents
2. **Block Stream Operations**: Enable AI to insert content into otherwise empty documents
3. **Document Architecture**: Maintain consistent document structure for AI processing
4. **User Experience**: Keep documents visually clean while maintaining AI functionality

## Browser Support

This extension supports all modern browsers that TipTap supports. The ProseMirror plugin approach ensures reliable DOM filtering across different environments.

## License

MIT
