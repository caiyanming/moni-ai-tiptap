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
      // 🔥 特殊情况：InlineMath 需要 moniBlockId 以支持 Stream 更新
      // 虽然 inline 节点通常不需要 blockId，但 MathStreamHandler 依赖它来定位和更新节点
      // TODO: 未来应重命名为 moniNodeId 或使用 UniqueID Extension
      moniBlockId: {
        default: null,
        parseHTML: element => element.getAttribute('data-moni-block-id') || null,
        renderHTML: attributes => {
          if (attributes.moniBlockId) {
            return { 'data-moni-block-id': attributes.moniBlockId }
          }
          return {}
        },
      },
      // 🔥 其他运行时属性（拖拽/Stream 模式）已移除
      // 现在通过 editor.storage.runtimeState 访问
      // 参见：packages/core/src/extensions/runtime-state.ts
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

      // 🔥 Inline 节点不需要 moniBlockId 或其他运行时属性
      // 运行时状态通过 editor.storage.runtimeState 访问

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
