# @tiptap/extension-chemistry

## 3.0.0-beta.22

### Added

- 🧪 **Complete mhchem support** - Full chemical formula and reaction support using KaTeX + mhchem
- ⚡ **Native TipTap integration** - Seamless Block Stream support with moniBlockId
- 🎯 **Dual modes** - Both InlineChemical and BlockChemical node extensions
- 🛡️ **Three-layer error handling** - mhchem → KaTeX → plain text fallback
- 🎨 **React components** - ChemicalFormulaComponent with ReactNodeViewRenderer support
- ⌨️ **Input rules** - Automatic conversion of `\ce{H2O}`, `\pu{25 °C}`, and `$$\ce{A + B -> C}$$`
- 🔧 **Full configuration** - Complete KaTeX options support with chemistry-specific defaults
- 📝 **Chemistry syntax support**:
  - Chemical formulas: `\ce{H2SO4}`, `\ce{CaCl2}`
  - Reaction equations: `\ce{A + B -> C + D}`, `\ce{A <=> B}`
  - Reversible reactions: `\ce{A ->[heat] B}`
  - Ion charges: `\ce{SO4^2-}`, `\ce{NH4+}`
  - State symbols: `\ce{H2O (l)}`, `\ce{NaCl (s)}`
  - Physical units: `\pu{123 kJ/mol}`, `\pu{25 °C}`
- 🔌 **Block Stream integration** - Full moni attributes support for drag, stream, and hierarchy
- ⌨️ **Keyboard shortcuts** - `Ctrl/Cmd + Shift + C` for inline, `Ctrl/Cmd + Shift + Alt + C` for block
- 🎨 **CSS classes** - Comprehensive styling hooks for chemistry formulas

### Features

- **ChemicalRenderer** - Advanced renderer with KaTeX + mhchem integration
- **Utility functions** - Chemistry validation, formula wrapping, and syntax detection
- **Type safety** - Complete TypeScript definitions for all components
- **Error handling** - Graceful degradation with visual error indicators
- **SSR support** - Server-side rendering capabilities

### Commands

- `insertChemicalFormula()` - Insert chemistry formula (inline or block)
- `insertInlineChemical()` - Insert inline chemistry formula
- `insertBlockChemical()` - Insert block chemistry formula
- `updateInlineChemical()` - Update inline chemistry formula
- `updateBlockChemical()` - Update block chemistry formula
- `deleteInlineChemical()` - Delete inline chemistry formula
- `deleteBlockChemical()` - Delete block chemistry formula

### Dependencies

- `katex` ^0.16.4 (peer dependency)
- `@tiptap/core` workspace:*
- `@tiptap/pm` workspace:*