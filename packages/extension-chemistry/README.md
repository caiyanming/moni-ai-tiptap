# @tiptap/extension-chemistry

[![Version](https://img.shields.io/npm/v/@tiptap/extension-chemistry.svg?label=version)](https://www.npmjs.com/package/@tiptap/extension-chemistry)
[![Downloads](https://img.shields.io/npm/dm/@tiptap/extension-chemistry.svg)](https://npmcharts.com/compare/@tiptap/extension-chemistry?minimal=true)
[![License](https://img.shields.io/npm/l/@tiptap/extension-chemistry.svg)](https://www.npmjs.com/package/@tiptap/extension-chemistry)

This extension provides comprehensive chemistry formula support for TipTap using KaTeX + mhchem.

## Features

- 🧪 **Full mhchem support** - Chemical formulas, reactions, and physical units
- ⚡ **Native TipTap integration** - Seamless Block Stream support with moniBlockId
- 🎯 **Dual modes** - Both inline and block chemistry formulas
- 🛡️ **Three-layer error handling** - mhchem → KaTeX → plain text fallback
- 🎨 **React components** - Ready-to-use React NodeView components
- ⌨️ **Input rules** - Type `\ce{H2O}` or `$$\ce{A + B -> C}$$` to insert formulas
- 🔧 **Configurable** - Full KaTeX options support with mhchem defaults

## Installation

```bash
npm install @tiptap/extension-chemistry katex
```

Note: This extension requires `katex` as a peer dependency and automatically includes mhchem support.

## Basic Usage

### JavaScript/TypeScript

```javascript
import { Editor } from '@tiptap/core'
import { Chemistry, InlineChemical, BlockChemical } from '@tiptap/extension-chemistry'

// Option 1: Use the meta-extension (includes both inline and block)
const editor = new Editor({
  extensions: [
    Chemistry.configure({
      katexOptions: {
        trust: true, // Required for mhchem
        throwOnError: false,
      },
      onClick: (node, pos) => {
        console.log('Chemistry clicked:', node.attrs.chemical)
      },
    }),
  ],
})

// Option 2: Use individual extensions
const editor = new Editor({
  extensions: [
    InlineChemical.configure({
      katexOptions: { trust: true },
    }),
    BlockChemical.configure({
      katexOptions: { trust: true, displayMode: true },
    }),
  ],
})
```

### React

```tsx
import React from 'react'
import { Editor } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { 
  InlineChemical, 
  BlockChemical,
  InlineChemicalFormulaComponent,
  BlockChemicalFormulaComponent 
} from '@tiptap/extension-chemistry'

const editor = new Editor({
  extensions: [
    InlineChemical.extend({
      addNodeView() {
        return ReactNodeViewRenderer(InlineChemicalFormulaComponent)
      },
    }),
    BlockChemical.extend({
      addNodeView() {
        return ReactNodeViewRenderer(BlockChemicalFormulaComponent)
      },
    }),
  ],
})
```

## Chemistry Syntax Support

This extension supports the full mhchem syntax:

### Chemical Formulas
```
\ce{H2SO4}           → H₂SO₄
\ce{CaCl2}           → CaCl₂
\ce{NH4+}            → NH₄⁺
\ce{SO4^2-}          → SO₄²⁻
```

### Reaction Equations
```
\ce{A + B -> C + D}          → A + B → C + D
\ce{A <=> B}                 → A ⇌ B
\ce{A ->[heat] B}            → A --heat--> B
\ce{A <=>[H2O] B}            → A ⇌[H₂O] B
```

### Physical Units
```
\pu{123 kJ/mol}      → 123 kJ/mol
\pu{25 °C}           → 25 °C
\pu{1.5 atm}         → 1.5 atm
```

### State Symbols
```
\ce{H2O (l)}         → H₂O (l)
\ce{NaCl (s)}        → NaCl (s)
\ce{CO2 (g)}         → CO₂ (g)
\ce{HCl (aq)}        → HCl (aq)
```

## Input Rules

The extension includes convenient input rules:

- Type `\ce{H2O}` → Creates inline chemistry formula
- Type `\pu{25 °C}` → Creates inline physical units
- Type `$$\ce{A + B -> C}$$` → Creates block chemistry formula
- Type `$H2SO4$` → Auto-wraps with `\ce{}` for simple formulas

## Commands

### Chemistry Meta-Extension Commands

```javascript
// Insert chemistry formula (inline or block)
editor.commands.insertChemicalFormula({
  chemical: '\\ce{H2SO4}',
  type: 'inline' // or 'block'
})
```

### Individual Extension Commands

```javascript
// Inline chemistry commands
editor.commands.insertInlineChemical({ chemical: '\\ce{H2O}' })
editor.commands.updateInlineChemical({ chemical: '\\ce{H2SO4}', pos: 10 })
editor.commands.deleteInlineChemical({ pos: 10 })

// Block chemistry commands
editor.commands.insertBlockChemical({ chemical: '\\ce{A + B -> C}' })
editor.commands.updateBlockChemical({ chemical: '\\ce{2H2 + O2 -> 2H2O}' })
editor.commands.deleteBlockChemical()
```

## Keyboard Shortcuts

- `Ctrl/Cmd + Shift + C` → Insert inline chemistry formula
- `Ctrl/Cmd + Shift + Alt + C` → Insert block chemistry formula

## Block Stream Integration

This extension fully supports TipTap's Block Stream system with moniBlockId:

```javascript
// Chemistry formulas support all moni attributes
const chemicalNode = {
  type: 'blockChemical',
  attrs: {
    chemical: '\\ce{H2SO4}',
    moniBlockId: 'chem-001',
    moniParentId: 'doc-123',
    moniLevel: 1,
    moniDragEnabled: true,
    moniStreamType: 'chemistry',
    moniStreamMode: 'replace'
  }
}
```

## Configuration Options

```typescript
interface ChemistryOptions {
  katexOptions?: KatexOptions
  onClick?: (node: PMNode, pos: number) => void
}
```

### Default KaTeX Options

```javascript
{
  displayMode: false,        // true for block chemistry
  throwOnError: false,       // Graceful error handling
  trust: true,               // Required for mhchem
  strict: false,             // Allow chemistry syntax
  macros: {
    '\\ce': '\\ce',          // Chemical equations
    '\\pu': '\\pu'           // Physical units
  }
}
```

## Error Handling

The extension provides three-layer error handling:

1. **mhchem rendering** - Primary chemistry rendering
2. **Regular KaTeX** - Fallback for math expressions
3. **Plain text** - Final fallback showing original input

```javascript
// This will gracefully degrade if mhchem fails
editor.commands.insertInlineChemical({ 
  chemical: '\\ce{invalid-chemistry}' 
})
// → Shows original text with error styling
```

## CSS Styling

Add custom styles for chemistry formulas:

```css
/* Chemistry formula containers */
.tiptap-chemistry-render {
  /* Base styles for all chemistry formulas */
}

.tiptap-chemistry-render--editable {
  /* Styles for editable mode */
  cursor: pointer;
}

/* Specific formula types */
.inline-chemistry {
  /* Inline chemistry styles */
}

.block-chemistry {
  /* Block chemistry styles */
  text-align: center;
  margin: 1em 0;
}

.block-chemistry-inner {
  /* Inner content of block chemistry */
}

/* Error states */
.chemistry-render-error {
  background-color: #fee;
  color: #c33;
  padding: 2px 4px;
  border-radius: 3px;
}

.chemistry-render-success {
  /* Successful render styles */
}
```

## Advanced Usage

### Custom Renderer

```javascript
import { ChemicalRenderer } from '@tiptap/extension-chemistry'

const renderer = new ChemicalRenderer({
  displayMode: true,
  trust: true,
  macros: {
    '\\water': '\\ce{H2O}',
    '\\acid': '\\ce{H2SO4}'
  }
})

// Render to element
const element = document.getElementById('chemistry-preview')
renderer.render('\\water + \\acid', element)

// Render to string (SSR)
const result = renderer.renderToString('\\ce{H2SO4}')
console.log(result.html) // KaTeX HTML output
```

### Validation

```javascript
import { validateChemistryFormula, isChemistryFormula } from '@tiptap/extension-chemistry'

// Check if input looks like chemistry
const isChemistry = isChemistryFormula('H2SO4') // true
const isMath = isChemistryFormula('x^2 + y^2') // false

// Validate chemistry syntax
const isValid = validateChemistryFormula('\\ce{H2SO4}') // true
const isInvalid = validateChemistryFormula('\\ce{invalid}') // false
```

## TypeScript Support

Full TypeScript support with complete type definitions:

```typescript
import type { 
  ChemistryOptions,
  InlineChemicalOptions,
  BlockChemicalOptions,
  ChemistryRenderResult 
} from '@tiptap/extension-chemistry'
```

## Browser Support

- Modern browsers with ES2018+ support
- Requires KaTeX support (included)
- No additional polyfills needed

## License

MIT

## Contributing

Please see [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.