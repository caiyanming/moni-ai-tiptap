import { canInsertNode, isNodeSelection, mergeAttributes, Node, nodeInputRule } from '@tiptap/core'
import { NodeSelection, TextSelection } from '@tiptap/pm/state'

export interface HorizontalRuleOptions {
  /**
   * The HTML attributes for a horizontal rule node.
   * @default {}
   * @example { class: 'foo' }
   */
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    horizontalRule: {
      /**
       * Add a horizontal rule
       * @example editor.commands.setHorizontalRule()
       */
      setHorizontalRule: () => ReturnType
    }
  }
}

/**
 * This extension allows you to insert horizontal rules.
 * @see https://www.tiptap.dev/api/nodes/horizontal-rule
 */
export const HorizontalRule = Node.create<HorizontalRuleOptions>({
  name: 'horizontalRule',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  group: 'block',

  addAttributes() {
    return {
      // 🔥 核心块标识属性 - 对应 Notion 的 divider block
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
      // 🔥 拖拽行为属性
      moniDragEnabled: {
        default: true,
        parseHTML: element => element.getAttribute('data-moni-drag-enabled') !== 'false',
        renderHTML: attributes => {
          if (attributes.moniDragEnabled === false) {
            return { 'data-moni-drag-enabled': 'false' }
          }
          return {}
        },
      },
      moniDragHandle: {
        default: true,
        parseHTML: element => element.getAttribute('data-moni-drag-handle') !== 'false',
        renderHTML: attributes => {
          if (attributes.moniDragHandle === false) {
            return { 'data-moni-drag-handle': 'false' }
          }
          return {}
        },
      },
      moniNestable: {
        default: false, // 🔥 分割线通常不可嵌套
        parseHTML: element => element.getAttribute('data-moni-nestable') !== 'false',
        renderHTML: attributes => {
          if (attributes.moniNestable === true) {
            return { 'data-moni-nestable': 'true' }
          }
          return {}
        },
      },
      moniDragType: {
        default: 'block',
        parseHTML: element => element.getAttribute('data-moni-drag-type') || 'block',
        renderHTML: attributes => {
          if (attributes.moniDragType && attributes.moniDragType !== 'block') {
            return { 'data-moni-drag-type': attributes.moniDragType }
          }
          return {}
        },
      },
      // 🔥 Stream 属性 - 分割线特定配置
      moniStreamType: {
        default: 'divider',
        parseHTML: element => element.getAttribute('data-moni-stream-type') || 'divider',
        renderHTML: attributes => {
          if (attributes.moniStreamType && attributes.moniStreamType !== 'divider') {
            return { 'data-moni-stream-type': attributes.moniStreamType }
          }
          return {}
        },
      },
      moniStreamMode: {
        default: 'replace', // 🔥 分割线默认使用 replace 模式
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

  parseHTML() {
    return [{ tag: 'hr' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['hr', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)]
  },

  addCommands() {
    return {
      setHorizontalRule:
        () =>
        ({ chain, state }) => {
          // Check if we can insert the node at the current selection
          if (!canInsertNode(state, state.schema.nodes[this.name])) {
            return false
          }

          const { selection } = state
          const { $to: $originTo } = selection

          const currentChain = chain()

          if (isNodeSelection(selection)) {
            currentChain.insertContentAt($originTo.pos, {
              type: this.name,
            })
          } else {
            currentChain.insertContent({ type: this.name })
          }

          return (
            currentChain
              // set cursor after horizontal rule
              .command(({ tr, dispatch }) => {
                if (dispatch) {
                  const { $to } = tr.selection
                  const posAfter = $to.end()

                  if ($to.nodeAfter) {
                    if ($to.nodeAfter.isTextblock) {
                      tr.setSelection(TextSelection.create(tr.doc, $to.pos + 1))
                    } else if ($to.nodeAfter.isBlock) {
                      tr.setSelection(NodeSelection.create(tr.doc, $to.pos))
                    } else {
                      tr.setSelection(TextSelection.create(tr.doc, $to.pos))
                    }
                  } else {
                    // add node after horizontal rule if it’s the end of the document
                    const node = $to.parent.type.contentMatch.defaultType?.create()

                    if (node) {
                      tr.insert(posAfter, node)
                      tr.setSelection(TextSelection.create(tr.doc, posAfter + 1))
                    }
                  }

                  tr.scrollIntoView()
                }

                return true
              })
              .run()
          )
        },
    }
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: /^(?:---|—-|___\s|\*\*\*\s)$/,
        type: this.type,
      }),
    ]
  },
})
