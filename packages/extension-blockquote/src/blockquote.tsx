/** @jsxImportSource @tiptap/core */
import { mergeAttributes, Node, wrappingInputRule } from '@tiptap/core'
import type { DOMOutputSpecArray } from '@tiptap/core/jsx-runtime'

export interface BlockquoteOptions {
  /**
   * HTML attributes to add to the blockquote element
   * @default {}
   * @example { class: 'foo' }
   */
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blockQuote: {
      /**
       * Set a blockquote node
       */
      setBlockquote: () => ReturnType
      /**
       * Toggle a blockquote node
       */
      toggleBlockquote: () => ReturnType
      /**
       * Unset a blockquote node
       */
      unsetBlockquote: () => ReturnType
    }
  }
}

/**
 * Matches a blockquote to a `>` as input.
 */
export const inputRegex = /^\s*>\s$/

/**
 * This extension allows you to create blockquotes.
 * @see https://tiptap.dev/api/nodes/blockquote
 */
export const Blockquote = Node.create<BlockquoteOptions>({
  name: 'blockquote',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  content: 'block+',

  group: 'block',

  defining: true,

  addAttributes() {
    return {
      // 🔥 核心块标识属性
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
        default: true, // 🔥 blockquote 默认可嵌套
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
      // 🔥 Stream 属性 - blockquote 特定配置
      moniStreamType: {
        default: 'text',
        parseHTML: element => element.getAttribute('data-moni-stream-type') || 'text',
        renderHTML: attributes => {
          if (attributes.moniStreamType && attributes.moniStreamType !== 'text') {
            return { 'data-moni-stream-type': attributes.moniStreamType }
          }
          return {}
        },
      },
      moniStreamMode: {
        default: 'replace',
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
    return [{ tag: 'blockquote' }]
  },

  renderHTML({ HTMLAttributes }) {
    return (
      <blockquote {...mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)}>
        <slot />
      </blockquote>
    ) as unknown as DOMOutputSpecArray
  },

  addCommands() {
    return {
      setBlockquote:
        () =>
        ({ commands }) => {
          return commands.wrapIn(this.name)
        },
      toggleBlockquote:
        () =>
        ({ commands }) => {
          return commands.toggleWrap(this.name)
        },
      unsetBlockquote:
        () =>
        ({ commands }) => {
          return commands.lift(this.name)
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-b': () => this.editor.commands.toggleBlockquote(),
    }
  },

  addInputRules() {
    return [
      wrappingInputRule({
        find: inputRegex,
        type: this.type,
      }),
    ]
  },
})
