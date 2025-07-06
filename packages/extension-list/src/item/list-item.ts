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
      moniDragType: {
        default: 'list-item',
        parseHTML: element => element.getAttribute('moni-drag-type') || 'list-item',
        renderHTML: attributes => {
          if (attributes.moniDragType && attributes.moniDragType !== 'list-item') {
            return { 'moni-drag-type': attributes.moniDragType }
          }
          return {}
        },
      },
      moniNestable: {
        default: true,
        parseHTML: element => element.getAttribute('moni-nestable') !== 'false',
        renderHTML: attributes => {
          if (attributes.moniNestable === false) {
            return { 'moni-nestable': 'false' }
          }
          return {}
        },
      },
      moniCanNestIn: {
        default: ['bulletList', 'orderedList', 'listItem'],
        parseHTML: element => {
          const canNestIn = element.getAttribute('moni-can-nest-in')
          return canNestIn ? canNestIn.split(',').map(t => t.trim()) : ['bulletList', 'orderedList', 'listItem']
        },
        renderHTML: attributes => {
          if (attributes.moniCanNestIn && Array.isArray(attributes.moniCanNestIn)) {
            return { 'moni-can-nest-in': attributes.moniCanNestIn.join(',') }
          }
          return {}
        },
      },
      moniDropTargets: {
        default: ['listItem', 'bulletList', 'orderedList'],
        parseHTML: element => {
          const targets = element.getAttribute('moni-drop-targets')
          return targets ? targets.split(',').map(t => t.trim()) : ['listItem', 'bulletList', 'orderedList']
        },
        renderHTML: attributes => {
          if (attributes.moniDropTargets && Array.isArray(attributes.moniDropTargets)) {
            return { 'moni-drop-targets': attributes.moniDropTargets.join(',') }
          }
          return {}
        },
      },
      moniMaxNestLevel: {
        default: 6,
        parseHTML: element => {
          const maxLevel = element.getAttribute('moni-max-nest-level')
          return maxLevel ? parseInt(maxLevel, 10) : 6
        },
        renderHTML: attributes => {
          if (
            attributes.moniMaxNestLevel !== null &&
            attributes.moniMaxNestLevel !== undefined &&
            attributes.moniMaxNestLevel !== 6
          ) {
            return { 'moni-max-nest-level': attributes.moniMaxNestLevel.toString() }
          }
          return {}
        },
      },
      // Override default stream attributes for list items
      moniStreamType: {
        default: 'list',
        parseHTML: element => element.getAttribute('moni-stream-type') || 'list',
        renderHTML: attributes => {
          if (attributes.moniStreamType && attributes.moniStreamType !== 'list') {
            return { 'moni-stream-type': attributes.moniStreamType }
          }
          return {}
        },
      },
      moniStreamMode: {
        default: 'insert',
        parseHTML: element => element.getAttribute('moni-stream-mode') || 'insert',
        renderHTML: attributes => {
          if (attributes.moniStreamMode && attributes.moniStreamMode !== 'insert') {
            return { 'moni-stream-mode': attributes.moniStreamMode }
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
