import { mergeAttributes, Node, wrappingInputRule } from '@tiptap/core'

const ListItemName = 'listItem'
const TextStyleName = 'textStyle'

export interface BulletListOptions {
  /**
   * The node name for the list items
   * @default 'listItem'
   * @example 'paragraph'
   */
  itemTypeName: string

  /**
   * HTML attributes to add to the bullet list element
   * @default {}
   * @example { class: 'foo' }
   */
  HTMLAttributes: Record<string, any>

  /**
   * Keep the marks when splitting the list
   * @default false
   * @example true
   */
  keepMarks: boolean

  /**
   * Keep the attributes when splitting the list
   * @default false
   * @example true
   */
  keepAttributes: boolean
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    bulletList: {
      /**
       * Toggle a bullet list
       */
      toggleBulletList: () => ReturnType
    }
  }
}

/**
 * Matches a bullet list to a dash or asterisk.
 */
export const bulletListInputRegex = /^\s*([-+*])\s$/

/**
 * This extension allows you to create bullet lists.
 * This requires the ListItem extension
 * @see https://tiptap.dev/api/nodes/bullet-list
 * @see https://tiptap.dev/api/nodes/list-item.
 */
export const BulletList = Node.create<BulletListOptions>({
  name: 'bulletList',

  addOptions() {
    return {
      itemTypeName: 'listItem',
      HTMLAttributes: {},
      keepMarks: false,
      keepAttributes: false,
    }
  },

  group: 'block list',

  content() {
    return `${this.options.itemTypeName}+`
  },

  addAttributes() {
    return {
      // 🔥 核心块标识属性 - 对应 Notion 的 bulleted list
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
        default: true, // 🔥 列表默认可嵌套
        parseHTML: element => element.getAttribute('data-moni-nestable') !== 'false',
        renderHTML: attributes => {
          if (attributes.moniNestable === false) {
            return { 'data-moni-nestable': 'false' }
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
      // 🔥 Stream 属性 - 列表特定配置
      moniStreamType: {
        default: 'list',
        parseHTML: element => element.getAttribute('data-moni-stream-type') || 'list',
        renderHTML: attributes => {
          if (attributes.moniStreamType && attributes.moniStreamType !== 'list') {
            return { 'data-moni-stream-type': attributes.moniStreamType }
          }
          return {}
        },
      },
      moniStreamMode: {
        default: 'append', // 🔥 列表默认使用 append 模式
        parseHTML: element => element.getAttribute('data-moni-stream-mode') || 'append',
        renderHTML: attributes => {
          if (attributes.moniStreamMode && attributes.moniStreamMode !== 'append') {
            return { 'data-moni-stream-mode': attributes.moniStreamMode }
          }
          return {}
        },
      },
    }
  },

  parseHTML() {
    return [{ tag: 'ul' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['ul', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },

  addCommands() {
    return {
      toggleBulletList:
        () =>
        ({ commands, chain }) => {
          if (this.options.keepAttributes) {
            return chain()
              .toggleList(this.name, this.options.itemTypeName, this.options.keepMarks)
              .updateAttributes(ListItemName, this.editor.getAttributes(TextStyleName))
              .run()
          }
          return commands.toggleList(this.name, this.options.itemTypeName, this.options.keepMarks)
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-8': () => this.editor.commands.toggleBulletList(),
    }
  },

  addInputRules() {
    let inputRule = wrappingInputRule({
      find: bulletListInputRegex,
      type: this.type,
    })

    if (this.options.keepMarks || this.options.keepAttributes) {
      inputRule = wrappingInputRule({
        find: bulletListInputRegex,
        type: this.type,
        keepMarks: this.options.keepMarks,
        keepAttributes: this.options.keepAttributes,
        getAttributes: () => {
          return this.editor.getAttributes(TextStyleName)
        },
        editor: this.editor,
      })
    }
    return [inputRule]
  },
})
