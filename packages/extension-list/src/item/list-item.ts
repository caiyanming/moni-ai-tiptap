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
      // Override default moni attributes for list items
      'moni-drag-type': {
        default: 'list-item',
        parseHTML: element => element.getAttribute('moni-drag-type') || 'list-item',
        renderHTML: attributes => {
          if (attributes['moni-drag-type'] && attributes['moni-drag-type'] !== 'list-item') {
            return { 'moni-drag-type': attributes['moni-drag-type'] }
          }
          return {}
        },
      },
      'moni-nestable': {
        default: true,
        parseHTML: element => element.getAttribute('moni-nestable') !== 'false',
        renderHTML: attributes => {
          if (attributes['moni-nestable'] === false) {
            return { 'moni-nestable': 'false' }
          }
          return {}
        },
      },
      'moni-can-nest-in': {
        default: ['bulletList', 'orderedList', 'listItem'],
        parseHTML: element => {
          const canNestIn = element.getAttribute('moni-can-nest-in')
          return canNestIn ? canNestIn.split(',').map(t => t.trim()) : ['bulletList', 'orderedList', 'listItem']
        },
        renderHTML: attributes => {
          if (attributes['moni-can-nest-in'] && Array.isArray(attributes['moni-can-nest-in'])) {
            return { 'moni-can-nest-in': attributes['moni-can-nest-in'].join(',') }
          }
          return {}
        },
      },
      'moni-drop-targets': {
        default: ['listItem', 'bulletList', 'orderedList'],
        parseHTML: element => {
          const targets = element.getAttribute('moni-drop-targets')
          return targets ? targets.split(',').map(t => t.trim()) : ['listItem', 'bulletList', 'orderedList']
        },
        renderHTML: attributes => {
          if (attributes['moni-drop-targets'] && Array.isArray(attributes['moni-drop-targets'])) {
            return { 'moni-drop-targets': attributes['moni-drop-targets'].join(',') }
          }
          return {}
        },
      },
      'moni-max-nest-level': {
        default: 6,
        parseHTML: element => {
          const maxLevel = element.getAttribute('moni-max-nest-level')
          return maxLevel ? parseInt(maxLevel, 10) : 6
        },
        renderHTML: attributes => {
          if (
            attributes['moni-max-nest-level'] !== null &&
            attributes['moni-max-nest-level'] !== undefined &&
            attributes['moni-max-nest-level'] !== 6
          ) {
            return { 'moni-max-nest-level': attributes['moni-max-nest-level'].toString() }
          }
          return {}
        },
      },
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
