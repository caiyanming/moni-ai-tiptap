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

      // 🔥 拖拽类型（持久化）- MoniDragPlugin 依赖此字段区分列表项和普通块
      // 保留原因：列表拖拽语义需要此字段，Plugin 会读取并传递给 DragOperationManager
      // TODO: 未来应迁移到拖拽插件的静态配置或 RuntimeState
      moniDragType: {
        default: 'list-item',
        parseHTML: element => element.getAttribute('data-moni-drag-type') || 'list-item',
        renderHTML: attributes => {
          if (attributes.moniDragType && attributes.moniDragType !== 'list-item') {
            return { 'data-moni-drag-type': attributes.moniDragType }
          }
          return {}
        },
      },

      // 🔥 其他运行时属性已移除（这些确实没有被使用）：
      // - moniDragEnabled, moniDragHandle → 使用 editor.storage.runtimeState.dragEnabled
      // - moniStreamMode → 使用 editor.storage.runtimeState.streamMode
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
