import { InputRule, mergeAttributes, Node } from '@tiptap/core'

import { ChemicalRenderer } from '../ChemicalRenderer.js'
import type { BlockChemicalOptions } from '../types.js'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blockChemical: {
      /**
       * Inserts a chemical block node with chemistry string.
       * @param options - Options for inserting block chemical formula.
       * @returns ReturnType
       */
      insertBlockChemical: (options: { chemical: string; pos?: number }) => ReturnType

      /**
       * Deletes a block chemical formula node.
       * @returns ReturnType
       */
      deleteBlockChemical: (options?: { pos?: number }) => ReturnType

      /**
       * Update block chemical formula node with optional chemistry string.
       * @param options - Options for updating block chemical formula.
       * @returns ReturnType
       */
      updateBlockChemical: (options?: { chemical: string; pos?: number }) => ReturnType
    }
  }
}

/**
 * BlockChemical is a TipTap extension for rendering block chemical formulas using KaTeX + mhchem.
 * It allows users to insert mhchem formatted chemistry expressions as block elements.
 * It supports rendering, input rules for chemistry syntax, and click handling for interaction.
 *
 * @example
 * ```javascript
 * import { BlockChemical } from '@tiptap/extension-chemistry'
 * import { Editor } from '@tiptap/core'
 *
 * const editor = new Editor({
 *   extensions: [
 *     BlockChemical.configure({
 *       onClick: (node, pos) => {
 *         console.log('Block chemical clicked:', node.attrs.chemical, 'at position:', pos)
 *       },
 *     }),
 *   ],
 * })
 * ```
 */
export const BlockChemical = Node.create<BlockChemicalOptions>({
  name: 'blockChemical',

  group: 'block',

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
      // 🔥 核心块标识属性 - 对应 Notion 的 equation block
      moniBlockId: {
        default: null,
        parseHTML: element => element.getAttribute('data-moni-block-id'),
        renderHTML: attributes => {
          if (attributes.moniBlockId) {
            return { 'data-moni-block-id': attributes.moniBlockId }
          }
          return {}
        },
      },
      moniParentId: {
        default: null,
        parseHTML: element => element.getAttribute('data-moni-parent-id'),
        renderHTML: attributes => {
          if (attributes.moniParentId) {
            return { 'data-moni-parent-id': attributes.moniParentId }
          }
          return {}
        },
      },
      moniLevel: {
        default: 0,
        parseHTML: element => {
          const level = element.getAttribute('data-moni-level')
          return level ? parseInt(level, 10) : 0
        },
        renderHTML: attributes => {
          if (attributes.moniLevel !== undefined && attributes.moniLevel !== 0) {
            return { 'data-moni-level': attributes.moniLevel.toString() }
          }
          return {}
        },
      },
      // 🔥 拖拽/Stream 等运行时属性已移除
      // 现在通过 editor.storage.runtimeState 访问
      // 参见：packages/core/src/extensions/runtime-state.ts
    }
  },

  addCommands() {
    return {
      insertBlockChemical:
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

      deleteBlockChemical:
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

      updateBlockChemical:
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

          tr.setNodeMarkup(pos, this.type, {
            ...node.attrs,
            chemical: chemical || node.attrs.chemical,
          })

          return true
        },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="block-chemical"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'block-chemical' })]
  },

  addInputRules() {
    return [
      // $$\ce{...}$$ pattern
      new InputRule({
        find: /^\$\$\\ce\{([^}]+)\}\$\$$/,
        handler: ({ state, range, match }) => {
          const [, chemical] = match
          const { tr } = state
          const start = range.from
          const end = range.to

          tr.replaceWith(start, end, this.type.create({ chemical: `\\ce{${chemical}}` }))
        },
      }),
      // $$\pu{...}$$ pattern
      new InputRule({
        find: /^\$\$\\pu\{([^}]+)\}\$\$$/,
        handler: ({ state, range, match }) => {
          const [, chemical] = match
          const { tr } = state
          const start = range.from
          const end = range.to

          tr.replaceWith(start, end, this.type.create({ chemical: `\\pu{${chemical}}` }))
        },
      }),
      // $$$ chemical formula $$$ pattern (auto-wrap with \ce)
      new InputRule({
        find: /^\$\$\$([A-Za-z0-9()[\]+-→←↔↑↓⇌⇀↽\s<>=]+)\$\$\$$/,
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
      'Mod-Shift-Alt-c': () => {
        // Insert block chemical equation for user to edit
        return this.editor.commands.insertBlockChemical({ chemical: '\\ce{2H2 + O2 -> 2H2O}' })
      },
      'Mod-Shift-Alt-u': () => {
        // Insert block physical measurement for user to edit
        return this.editor.commands.insertBlockChemical({ chemical: '\\pu{25 °C, 1 bar}' })
      },
    }
  },

  addNodeView() {
    // DOM renderer (React support can be added separately)
    const { katexOptions } = this.options

    return ({ node, getPos }) => {
      const wrapper = document.createElement('div')
      const innerWrapper = document.createElement('div')
      wrapper.className = 'tiptap-chemistry-render'

      if (this.editor.isEditable) {
        wrapper.classList.add('tiptap-chemistry-render--editable')
      }

      innerWrapper.className = 'block-chemical-inner'
      wrapper.dataset.type = 'block-chemical'
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

      wrapper.appendChild(innerWrapper)

      // Create chemical renderer with display mode
      const displayKatexOptions = { ...katexOptions, displayMode: true }
      const renderer = new ChemicalRenderer(displayKatexOptions)

      function renderChemistry() {
        renderer.render(node.attrs.chemical, innerWrapper)
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
