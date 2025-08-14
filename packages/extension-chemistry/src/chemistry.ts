import { Extension } from '@tiptap/core'

import { BlockChemical,InlineChemical } from './extensions/index.js'
import type { ChemistryOptions } from './types.js'

/**
 * Chemistry Extension that provides chemistry formula rendering capabilities
 * This is a meta-extension that combines InlineChemical and BlockChemical extensions
 *
 * @example
 * ```javascript
 * import { Chemistry } from '@tiptap/extension-chemistry'
 * import { Editor } from '@tiptap/core'
 *
 * const editor = new Editor({
 *   extensions: [
 *     Chemistry.configure({
 *       katexOptions: {
 *         trust: true,
 *         throwOnError: false,
 *       },
 *       onClick: (node, pos) => {
 *         console.log('Chemistry formula clicked:', node.attrs, 'at position:', pos)
 *       },
 *     }),
 *   ],
 * })
 * ```
 */
export const Chemistry = Extension.create<ChemistryOptions>({
  name: 'chemistry',

  addOptions() {
    return {
      katexOptions: {
        displayMode: false,
        throwOnError: false,
        trust: true, // Required for mhchem
        strict: false,
        macros: {
          '\\ce': '\\ce',
          '\\pu': '\\pu',
        },
      },
      onClick: undefined,
    }
  },

  addExtensions() {
    return [
      InlineChemical.configure({
        katexOptions: this.options.katexOptions,
        onClick: this.options.onClick,
      }),
      BlockChemical.configure({
        katexOptions: this.options.katexOptions,
        onClick: this.options.onClick,
      }),
    ]
  },

  addCommands() {
    return {
      insertChemicalFormula:
        ({ chemical, type = 'inline' }) =>
        ({ commands }) => {
          if (type === 'block') {
            return commands.insertBlockChemical({ chemical })
          }
          return commands.insertInlineChemical({ chemical })
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      // Ctrl/Cmd + Shift + C for chemistry
      'Mod-Shift-c': () => {
        // Insert empty inline chemistry formula
        return this.editor.commands.insertInlineChemical({ chemical: '\\ce{}' })
      },
      // Ctrl/Cmd + Shift + Alt + C for block chemistry
      'Mod-Shift-Alt-c': () => {
        // Insert empty block chemistry formula
        return this.editor.commands.insertBlockChemical({ chemical: '\\ce{}' })
      },
    }
  },
})

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    chemistry: {
      /**
       * Insert a chemistry formula (inline or block)
       * @param options - Options for inserting chemistry formula
       * @returns ReturnType
       */
      insertChemicalFormula: (options: { chemical: string; type?: 'inline' | 'block' }) => ReturnType
    }
  }
}
