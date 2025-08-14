import { InputRule, mergeAttributes, Node } from '@tiptap/core'
import type { Node as PMNode } from '@tiptap/pm/model'
import katex, { type KatexOptions } from 'katex'

/**
 * Configuration options for the InlineMath extension.
 */
export type InlineMathOptions = {
  /**
   * KaTeX specific options
   * @see https://katex.org/docs/options.html
   * @example
   * ```ts
   * katexOptions: {
   *   displayMode: false,
   *   throwOnError: false,
   *   macros: {
   *     '\\RR': '\\mathbb{R}',
   *     '\\ZZ': '\\mathbb{Z}'
   *   }
   * }
   * ```
   */
  katexOptions?: KatexOptions

  /**
   * Optional click handler for inline math nodes.
   * Called when a user clicks on an inline math expression in the editor.
   *
   * @param node - The ProseMirror node representing the inline math element
   * @param pos - The position of the node within the document
   * @example
   * ```ts
   * onClick: (node, pos) => {
   *   console.log('Inline math clicked:', node.attrs.latex, 'at position:', pos)
   * }
   * ```
   */
  onClick?: (node: PMNode, pos: number) => void
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    inlineMath: {
      /**
       * Insert a inline math node with LaTeX string.
       * @param options - Options for inserting inline math.
       * @returns ReturnType
       */
      insertInlineMath: (options: { latex: string; pos?: number }) => ReturnType

      /**
       * Delete an inline math node.
       * @returns ReturnType
       */
      deleteInlineMath: (options?: { pos?: number }) => ReturnType

      /**
       * Update inline math node with optional LaTeX string.
       * @param options - Options for updating inline math.
       * @returns ReturnType
       */
      updateInlineMath: (options?: { latex?: string; pos?: number }) => ReturnType
    }
  }
}

/**
 * InlineMath is a Tiptap extension for rendering inline mathematical expressions using KaTeX.
 * It allows users to insert LaTeX formatted math expressions inline within text.
 * It supports rendering, input rules for LaTeX syntax, and click handling for interaction.
 *
 * @example
 * ```javascript
 * import { InlineMath } from '@tiptap/extension-mathematics'
 * import { Editor } from '@tiptap/core'
 *
 * const editor = new Editor({
 *   extensions: [
 *     InlineMath.configure({
 *       onClick: (node, pos) => {
 *         console.log('Inline math clicked:', node.attrs.latex, 'at position:', pos)
 *       },
 *     }),
 *   ],
 * })
 */
export const InlineMath = Node.create<InlineMathOptions>({
  name: 'inlineMath',

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
      latex: {
        default: '',
        parseHTML: element => element.getAttribute('data-latex'),
        renderHTML: attributes => {
          return {
            'data-latex': attributes.latex,
          }
        },
      },
      // 🔥 核心块标识属性 - 对应 Notion 的 inline equation
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
      // 🔥 拖拽行为属性 - 行内元素特殊处理
      moniDragEnabled: {
        default: false, // 🔥 行内数学公式默认不启用拖拽
        parseHTML: element => element.getAttribute('data-moni-drag-enabled') === 'true',
        renderHTML: attributes => {
          if (attributes.moniDragEnabled === true) {
            return { 'data-moni-drag-enabled': 'true' }
          }
          return {}
        },
      },
      moniDragHandle: {
        default: false, // 🔥 行内数学公式默认不显示拖拽手柄
        parseHTML: element => element.getAttribute('data-moni-drag-handle') === 'true',
        renderHTML: attributes => {
          if (attributes.moniDragHandle === true) {
            return { 'data-moni-drag-handle': 'true' }
          }
          return {}
        },
      },
      moniNestable: {
        default: false, // 🔥 行内数学公式不可嵌套
        parseHTML: element => element.getAttribute('data-moni-nestable') === 'true',
        renderHTML: attributes => {
          if (attributes.moniNestable === true) {
            return { 'data-moni-nestable': 'true' }
          }
          return {}
        },
      },
      moniDragType: {
        default: 'inline',
        parseHTML: element => element.getAttribute('data-moni-drag-type') || 'inline',
        renderHTML: attributes => {
          if (attributes.moniDragType && attributes.moniDragType !== 'inline') {
            return { 'data-moni-drag-type': attributes.moniDragType }
          }
          return {}
        },
      },
      // 🔥 Stream 属性 - 行内数学公式特定配置
      moniStreamType: {
        default: 'inline-math',
        parseHTML: element => element.getAttribute('data-moni-stream-type') || 'inline-math',
        renderHTML: attributes => {
          if (attributes.moniStreamType && attributes.moniStreamType !== 'inline-math') {
            return { 'data-moni-stream-type': attributes.moniStreamType }
          }
          return {}
        },
      },
      moniStreamMode: {
        default: 'replace', // 🔥 行内数学公式默认使用 replace 模式
        parseHTML: element => element.getAttribute('data-moni-stream-mode') || 'replace',
        renderHTML: attributes => {
          if (attributes.moniStreamMode && attributes.moniStreamMode !== 'replace') {
            return { 'data-moni-stream-mode': attributes.moniStreamMode }
          }
          return {}
        },
      },
    }
  },

  addCommands() {
    return {
      insertInlineMath:
        options =>
        ({ commands, editor }) => {
          const { latex, pos } = options

          if (!latex) {
            return false
          }

          return commands.insertContentAt(pos ?? editor.state.selection.from, {
            type: this.name,
            attrs: { latex },
          })
        },

      deleteInlineMath:
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

      updateInlineMath:
        options =>
        ({ editor, tr }) => {
          const latex = options?.latex
          let pos = options?.pos

          if (pos === undefined) {
            pos = editor.state.selection.$from.pos
          }

          const node = editor.state.doc.nodeAt(pos)

          if (!node || node.type.name !== this.name) {
            return false
          }

          tr.setNodeMarkup(pos, this.type, { ...node.attrs, latex })

          return true
        },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="inline-math"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'inline-math' })]
  },

  addInputRules() {
    return [
      new InputRule({
        find: /(?<!\$)\$\$([^$\n]+)\$\$(?!\$)$/,
        handler: ({ state, range, match }) => {
          const [, latex] = match
          const { tr } = state
          const start = range.from
          const end = range.to

          tr.replaceWith(start, end, this.type.create({ latex }))
        },
      }),
    ]
  },

  addNodeView() {
    const { katexOptions } = this.options

    return ({ node, getPos }) => {
      const wrapper = document.createElement('span')
      wrapper.className = 'tiptap-mathematics-render'

      if (this.editor.isEditable) {
        wrapper.classList.add('tiptap-mathematics-render--editable')
      }

      wrapper.dataset.type = 'inline-math'
      wrapper.setAttribute('data-latex', node.attrs.latex)

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
      if (node.attrs.moniDragEnabled === true) {
        wrapper.setAttribute('data-moni-drag-enabled', 'true')
      }
      if (node.attrs.moniDragHandle === true) {
        wrapper.setAttribute('data-moni-drag-handle', 'true')
      }
      if (node.attrs.moniNestable === true) {
        wrapper.setAttribute('data-moni-nestable', 'true')
      }
      if (node.attrs.moniDragType && node.attrs.moniDragType !== 'inline') {
        wrapper.setAttribute('data-moni-drag-type', node.attrs.moniDragType)
      }
      if (node.attrs.moniStreamType && node.attrs.moniStreamType !== 'inline-math') {
        wrapper.setAttribute('data-moni-stream-type', node.attrs.moniStreamType)
      }
      if (node.attrs.moniStreamMode && node.attrs.moniStreamMode !== 'replace') {
        wrapper.setAttribute('data-moni-stream-mode', node.attrs.moniStreamMode)
      }

      function renderMath() {
        try {
          katex.render(node.attrs.latex, wrapper, katexOptions)
          wrapper.classList.remove('inline-math-error')
        } catch {
          wrapper.textContent = node.attrs.latex
          wrapper.classList.add('inline-math-error')
        }
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

      renderMath()

      return {
        dom: wrapper,
        destroy() {
          wrapper.removeEventListener('click', handleClick)
        },
      }
    }
  },
})
