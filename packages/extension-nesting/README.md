# @tiptap/extension-nesting

Block-level nesting management extension for TipTap.

## Features

- **Nesting Level Management**: Update and calculate block nesting levels
- **Parent-Child Relationships**: Set and query block parent relationships
- **Batch Operations**: Update multiple blocks at once
- **Consistency Validation**: Validate nesting structure consistency
- **Utility Functions**: Standalone utilities for hierarchy operations

## Installation

```bash
npm install @tiptap/extension-nesting
```

## Usage

```typescript
import { Editor } from '@tiptap/core'
import { Nesting } from '@tiptap/extension-nesting'

const editor = new Editor({
  extensions: [
    Nesting.configure({
      maxNestingLevel: 6,
    }),
  ],
})

// Update nesting level
editor.commands.updateNestingLevel('block-1', 2)

// Set parent
editor.commands.setBlockParent('block-1', 'parent-1')

// Query children
const children = editor.storage.nesting.getBlockChildren(editor.state, 'parent-1')
```

## Commands

- `updateNestingLevel(blockId: string, level: number)` - Update block nesting level
- `setBlockParent(blockId: string, parentId: string | null)` - Set block parent
- `batchUpdateNesting(updates: NestingUpdate[])` - Batch update blocks
- `recalculateAllNesting()` - Recalculate all nesting levels
- `fixNestingInconsistency()` - Fix inconsistent nesting structures

## Storage

- `getBlockChildren(state: EditorState, parentId: string)` - Get direct children of a block
- `getBlockDescendants(state: EditorState, blockId: string)` - Get all descendants of a block
- `validateNestingConsistency(state: EditorState)` - Validate nesting consistency

## Utilities

```typescript
import { buildBlockHierarchy, validateNestingConsistency } from '@tiptap/extension-nesting'

const hierarchy = buildBlockHierarchy(doc)
const validation = validateNestingConsistency(state)
```

## License

MIT
