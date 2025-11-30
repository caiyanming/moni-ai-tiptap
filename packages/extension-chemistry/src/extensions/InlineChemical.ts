import { InputRule, mergeAttributes, Node } from '@tiptap/core'

import { ChemicalRenderer } from '../ChemicalRenderer.js'
import type { InlineChemicalOptions } from '../types.js'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    inlineChemical: {
      /**
       * Insert an inline chemical formula node with chemistry string.
       * @param options - Options for inserting inline chemical formula.
       * @returns ReturnType
       */
      insertInlineChemical: (options: { chemical: string; pos?: number }) => ReturnType

      /**
       * Delete an inline chemical formula node.
       * @returns ReturnType
       */
      deleteInlineChemical: (options?: { pos?: number }) => ReturnType

      /**
       * Update inline chemical formula node with optional chemistry string.
       * @param options - Options for updating inline chemical formula.
       * @returns ReturnType
       */
      updateInlineChemical: (options?: { chemical?: string; pos?: number }) => ReturnType
    }
  }
}

/**
 * InlineChemical is a TipTap extension for rendering inline chemical formulas using KaTeX + mhchem.
 * It allows users to insert mhchem formatted chemistry expressions inline within text.
 * It supports rendering, input rules for chemistry syntax, and click handling for interaction.
 *
 * @example
 * ```javascript
 * import { InlineChemical } from '@tiptap/extension-chemistry'
 * import { Editor } from '@tiptap/core'
 *
 * const editor = new Editor({
 *   extensions: [
 *     InlineChemical.configure({
 *       onClick: (node, pos) => {
 *         console.log('Inline chemical clicked:', node.attrs.chemical, 'at position:', pos)
 *       },
 *     }),
 *   ],
 * })
 * ```
 */
export const InlineChemical = Node.create<InlineChemicalOptions>({
  name: 'inlineChemical',

  group: 'inline',

  inline: true,

  atom: true,

  addOptions() {
    return {
      onClick: undefined,
      katexOptions: undefined,
    }
  },

  addAttributes() {
    return {
      chemical: {
        default: '',
        parseHTML: element => element.getAttribute('data-chemical'),
        renderHTML: attributes => {
          return {
            'data-chemical': attributes.chemical,
          }
        },
      },
      // 🔥 Inline 节点不再携带 moniBlockId / moniParentId / moniLevel
      // 语义块 ID 统一由块级语义节点承载，行内化学式只作为块内部内容
    }
  },

  addCommands() {
    return {
      insertInlineChemical:
        options =>
        ({ commands, editor }) => {
          const { chemical, pos } = options

          if (!chemical) {
            return false
          }

          return commands.insertContentAt(pos ?? editor.state.selection.from, {
            type: this.name,
            attrs: { chemical },
          })
        },

      deleteInlineChemical:
        options =>
        ({ editor, tr }) => {
          const pos = options?.pos ?? editor.state.selection.$from.pos
          const node = editor.state.doc.nodeAt(pos)

          if (!node || node.type.name !== this.name) {
            return false
          }

          tr.delete(pos, pos + node.nodeSize)
          return true
        },

      updateInlineChemical:
        options =>
        ({ editor, tr }) => {
          const chemical = options?.chemical
          let pos = options?.pos

          if (pos === undefined) {
            pos = editor.state.selection.$from.pos
          }

          const node = editor.state.doc.nodeAt(pos)

          if (!node || node.type.name !== this.name) {
            return false
          }

          tr.setNodeMarkup(pos, this.type, { ...node.attrs, chemical })

          return true
        },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="inline-chemical"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'inline-chemical' })]
  },

  addInputRules() {
    return [
      // \ce{...} pattern
      new InputRule({
        find: /\\ce\{([^}]+)\}$/,
        handler: ({ state, range, match }) => {
          const [, chemical] = match
          const { tr } = state
          const start = range.from
          const end = range.to

          tr.replaceWith(start, end, this.type.create({ chemical: `\\ce{${chemical}}` }))
        },
      }),
      // \pu{...} pattern
      new InputRule({
        find: /\\pu\{([^}]+)\}$/,
        handler: ({ state, range, match }) => {
          const [, chemical] = match
          const { tr } = state
          const start = range.from
          const end = range.to

          tr.replaceWith(start, end, this.type.create({ chemical: `\\pu{${chemical}}` }))
        },
      }),
      // Simple chemical formula pattern (auto-wrap with \ce)
      new InputRule({
        find: /\$([A-Za-z0-9()[\]+-→←↔↑↓⇌⇀↽]+)\$$/,
        handler: ({ state, range, match }) => {
          const [, chemical] = match
          const { tr } = state
          const start = range.from
          const end = range.to

          tr.replaceWith(start, end, this.type.create({ chemical: `\\ce{${chemical}}` }))
        },
      }),
    ]
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-c': () => {
        // Insert empty inline chemical formula for user to edit
        return this.editor.commands.insertInlineChemical({ chemical: '\\ce{H2O}' })
      },
      'Mod-Shift-u': () => {
        // Insert empty inline physical unit for user to edit
        return this.editor.commands.insertInlineChemical({ chemical: '\\pu{25 °C}' })
      },
    }
  },

  addNodeView() {
    // DOM renderer (React support can be added separately)
    const { katexOptions } = this.options

    return ({ node, getPos }) => {
      const wrapper = document.createElement('span')
      wrapper.className = 'tiptap-chemistry-render'

      if (this.editor.isEditable) {
        wrapper.classList.add('tiptap-chemistry-render--editable')
      }

      wrapper.dataset.type = 'inline-chemical'
      wrapper.setAttribute('data-chemical', node.attrs.chemical)

      // 🔥 设置 moni block 属性
      if (node.attrs.moniBlockId) {
        wrapper.setAttribute('data-moni-block-id', node.attrs.moniBlockId)
      }
      if (node.attrs.moniParentId) {
        wrapper.setAttribute('data-moni-parent-id', node.attrs.moniParentId)
      }
      if (node.attrs.moniLevel !== undefined && node.attrs.moniLevel !== 0) {
        wrapper.setAttribute('data-moni-level', node.attrs.moniLevel.toString())
      }

      // Create chemical renderer
      const renderer = new ChemicalRenderer(katexOptions)

      function renderChemistry() {
        renderer.render(node.attrs.chemical, wrapper)
      }

      const handleClick = (event: MouseEvent) => {
        event.preventDefault()
        event.stopPropagation()
        const pos = getPos()

        if (pos == null) {
          return
        }

        if (this.options.onClick) {
          this.options.onClick(node, pos)
        }
      }

      if (this.options.onClick) {
        wrapper.addEventListener('click', handleClick)
      }

      renderChemistry()

      return {
        dom: wrapper,
        destroy() {
          wrapper.removeEventListener('click', handleClick)
        },
      }
    }
  },
})
