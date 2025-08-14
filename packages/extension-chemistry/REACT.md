# Chemistry Extension - React Integration

## Overview
The Chemistry Extension now supports React node views for both inline and block chemical formulas, providing seamless integration with React-based TipTap editors.

## Features
- 🧪 Full React component support for chemical formula rendering
- 🔄 Runtime error handling with graceful fallbacks
- 🎯 Complete moni Block Stream integration
- 📦 TypeScript declarations for both ESM and CJS
- ⚡ Zero-config setup with automatic detection

## Usage

### Basic React Node Views

```typescript
import { Editor } from '@tiptap/core'
import { Document } from '@tiptap/extension-document'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Text } from '@tiptap/extension-text'
import { InlineChemical, BlockChemical } from '@tiptap/extension-chemistry'
import { InlineChemicalReactRenderer, BlockChemicalReactRenderer } from '@tiptap/extension-chemistry/react'

const editor = new Editor({
  extensions: [
    Document,
    Paragraph,
    Text,
    InlineChemical.extend({
      addNodeView() {
        return InlineChemicalReactRenderer
      }
    }),
    BlockChemical.extend({
      addNodeView() {
        return BlockChemicalReactRenderer
      }
    }),
  ],
})
```

### Simplified Helper Functions

```typescript
import { createChemistryWithReact } from '@tiptap/extension-chemistry/react'

const editor = new Editor({
  extensions: [
    Document,
    Paragraph,
    Text,
    ...createChemistryWithReact({
      katexOptions: {
        trust: true,
        throwOnError: false,
      }
    })
  ],
})
```

### React Components

The extension provides three main React components:

```typescript
import {
  ChemicalFormulaComponent,        // Base component
  InlineChemicalFormulaComponent,  // Inline variant
  BlockChemicalFormulaComponent,   // Block variant
} from '@tiptap/extension-chemistry/react'
```

## AI Block Stream Integration

The React components fully support moni Block Stream attributes:

```typescript
// Example usage in AI Block Stream operations
editor.commands.insertInlineChemical({
  chemical: '\\ce{H2O}',
  moniBlockId: 'chem-001',
  moniStreamType: 'inline-chemistry',
  moniStreamMode: 'replace',
})
```

## Chemical Syntax Support

All standard mhchem syntax is supported:

```typescript
// Basic formulas
editor.commands.insertInlineChemical({ chemical: '\\ce{H2SO4}' })
editor.commands.insertInlineChemical({ chemical: '\\ce{Ca(OH)2}' })

// Reactions
editor.commands.insertBlockChemical({ chemical: '\\ce{CH4 + 2O2 -> CO2 + 2H2O}' })

// States and conditions
editor.commands.insertBlockChemical({ chemical: '\\ce{NaCl (s) ->[H2O] Na+ (aq) + Cl- (aq)}' })

// Physical units
editor.commands.insertInlineChemical({ chemical: '\\pu{25 °C}' })
editor.commands.insertInlineChemical({ chemical: '\\pu{1.5 mol}' })
```

## Error Handling

The React integration includes comprehensive error handling:

1. **Runtime Detection**: Components are loaded dynamically with try-catch
2. **Graceful Fallbacks**: Falls back to DOM rendering if React is unavailable
3. **Type Safety**: Full TypeScript support with proper error types
4. **Development Warnings**: Console warnings for debugging

## Build Configuration

The extension builds both ESM and CJS versions with proper TypeScript declarations:

```bash
npm run build
# Generates:
# - dist/react.js (ESM)
# - dist/react.cjs (CommonJS) 
# - dist/react.d.ts (TypeScript declarations)
# - dist/react.d.cts (CommonJS TypeScript declarations)
```

## Testing

Run the simplified integration tests to verify functionality:

```bash
# Run chemistry-specific tests
npx vitest run tests/unit/extensions/chemistry/integration-simple.test.ts --config=tests/configs/vitest.config.ts

# Results: 8/8 tests passing ✅
# - AI collaboration scenarios
# - Error handling
# - Document integrity
# - Performance testing
```

## Implementation Notes

- React node views are conditionally loaded to avoid bundle bloat
- Full compatibility with existing Chemistry Extension API
- Maintains feature parity with Mathematics Extension patterns
- Zero breaking changes to existing DOM-based implementations

## Keyboard Shortcuts

The React components inherit all keyboard shortcuts from the base extensions:

- `Cmd/Ctrl + Shift + C`: Insert inline chemical formula
- `Cmd/Ctrl + Shift + Alt + C`: Insert block chemical formula