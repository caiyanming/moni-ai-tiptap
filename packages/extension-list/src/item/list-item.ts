import { mergeAttributes, Node } from '@tiptap/core'

export interface ListItemOptions {
  /**
   * The HTML attributes for a list item node.
   * @default {}
   * @example { class: 'foo' }
   */
  HTMLAttributes: Record<string, any>

  /**
   * The node type for bulletList nodes
   * @default 'bulletList'
   * @example 'myCustomBulletList'
   */
  bulletListTypeName: string

  /**
   * The node type for orderedList nodes
   * @default 'orderedList'
   * @example 'myCustomOrderedList'
   */
  orderedListTypeName: string
}

/**
 * This extension allows you to create list items.
 * @see https://www.tiptap.dev/api/nodes/list-item
 */
export const ListItem = Node.create<ListItemOptions>({
  name: 'listItem',

  addOptions() {
    return {
      HTMLAttributes: {},
      bulletListTypeName: 'bulletList',
      orderedListTypeName: 'orderedList',
    }
  },

  content: 'paragraph block*',

  defining: true,

  addAttributes() {
    return {
      // 🔥 核心块标识属性 - 对应 Notion 的 block id
      // 注意：默认值为 null，由业务代码（commands/插件）负责生成
      moniBlockId: {
        default: null,
        parseHTML: element => element.getAttribute('data-moni-block-id') || null,
        renderHTML: attributes => {
          // 只在有值时才渲染（遵循 HTML 哲学）
          if (attributes.moniBlockId) {
            return { 'data-moni-block-id': attributes.moniBlockId }
          }
          return {}
        },
      },

      // 🔥 父级关系属性（持久化）
      moniParentId: {
        default: null,
        parseHTML: element => element.getAttribute('data-moni-parent-id') || null,
        renderHTML: attributes => {
          if (attributes.moniParentId) {
            return { 'data-moni-parent-id': attributes.moniParentId }
          }
          return {}
        },
      },

      // 🔥 层级结构属性（持久化）
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
      // - moniDragEnabled, moniDragHandle → 使用 editor.storage.runtimeState.dragEnabled
      // - moniStreamMode → 使用 editor.storage.runtimeState.streamMode
      // - moniDragType → MoniDragPlugin 现在从 node.type.name 推断（配置，非实例数据）
      // - moniNestable, moniCanNestIn, moniDropTargets, moniMaxNestLevel → 从未被消费，已删除
      //
      // 参见：packages/core/src/extensions/runtime-state.ts
    }
  },

  parseHTML() {
    return [
      {
        tag: 'li',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['li', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => this.editor.commands.splitListItem(this.name),
      Tab: () => this.editor.commands.sinkListItem(this.name),
      'Shift-Tab': () => this.editor.commands.liftListItem(this.name),
    }
  },
})
