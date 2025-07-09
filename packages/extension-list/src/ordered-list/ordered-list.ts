import { mergeAttributes, Node, wrappingInputRule } from '@tiptap/core'

const ListItemName = 'listItem'
const TextStyleName = 'textStyle'

export interface OrderedListOptions {
  /**
   * The node type name for list items.
   * @default 'listItem'
   * @example 'myListItem'
   */
  itemTypeName: string

  /**
   * The HTML attributes for an ordered list node.
   * @default {}
   * @example { class: 'foo' }
   */
  HTMLAttributes: Record<string, any>

  /**
   * Keep the marks when splitting a list item.
   * @default false
   * @example true
   */
  keepMarks: boolean

  /**
   * Keep the attributes when splitting a list item.
   * @default false
   * @example true
   */
  keepAttributes: boolean
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    orderedList: {
      /**
       * Toggle an ordered list
       * @example editor.commands.toggleOrderedList()
       */
      toggleOrderedList: () => ReturnType
    }
  }
}

/**
 * Matches an ordered list to a 1. on input (or any number followed by a dot).
 */
export const orderedListInputRegex = /^(\d+)\.\s$/

/**
 * This extension allows you to create ordered lists.
 * This requires the ListItem extension
 * @see https://www.tiptap.dev/api/nodes/ordered-list
 * @see https://www.tiptap.dev/api/nodes/list-item
 */
export const OrderedList = Node.create<OrderedListOptions>({
  name: 'orderedList',

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
      start: {
        default: 1,
        parseHTML: element => {
          return element.hasAttribute('start') ? parseInt(element.getAttribute('start') || '', 10) : 1
        },
      },
      type: {
        default: null,
        parseHTML: element => element.getAttribute('type'),
      },
      // 🔥 核心块标识属性 - 对应 Notion 的 numbered list
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
        default: true, // 🔥 有序列表默认可嵌套
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
      // 🔥 Stream 属性 - 有序列表特定配置
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
        default: 'append', // 🔥 有序列表默认使用 append 模式
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
    return [
      {
        tag: 'ol',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const { start, ...attributesWithoutStart } = HTMLAttributes

    return start === 1
      ? ['ol', mergeAttributes(this.options.HTMLAttributes, attributesWithoutStart), 0]
      : ['ol', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },

  addCommands() {
    return {
      toggleOrderedList:
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
      'Mod-Shift-7': () => this.editor.commands.toggleOrderedList(),
    }
  },

  addInputRules() {
    let inputRule = wrappingInputRule({
      find: orderedListInputRegex,
      type: this.type,
      getAttributes: match => ({ start: +match[1] }),
      joinPredicate: (match, node) => node.childCount + node.attrs.start === +match[1],
    })

    if (this.options.keepMarks || this.options.keepAttributes) {
      inputRule = wrappingInputRule({
        find: orderedListInputRegex,
        type: this.type,
        keepMarks: this.options.keepMarks,
        keepAttributes: this.options.keepAttributes,
        getAttributes: match => ({ start: +match[1], ...this.editor.getAttributes(TextStyleName) }),
        joinPredicate: (match, node) => node.childCount + node.attrs.start === +match[1],
        editor: this.editor,
      })
    }
    return [inputRule]
  },
})
