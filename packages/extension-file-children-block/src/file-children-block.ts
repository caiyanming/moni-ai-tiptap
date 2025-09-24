import { mergeAttributes, Node } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

import type { FileChildrenBlockAttributes,FileChildrenBlockOptions } from './types.js'
import { NULL_UUID } from './types.js'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fileChildrenBlock: {
      /**
       * Insert file children block with NULL_UUID
       */
      insertFileChildrenBlock: () => ReturnType
    }
  }
}

/**
 * FileChildrenBlock extension
 *
 * Simple block that serves dual purpose:
 * 1. AI operation anchor using NULL_UUID
 * 2. Sub-document management UI
 *
 * Design principles:
 * - Fixed NULL_UUID identity (no configuration)
 * - Always visible (no hiding logic)
 * - UI state only (collapsed, displayMode)
 * - Zero special cases
 */
export const FileChildrenBlock = Node.create<FileChildrenBlockOptions>({
  name: 'fileChildrenBlock',

  priority: 1000,

  addOptions() {
    return {
      HTMLAttributes: {},
      nullUUID: NULL_UUID,
    }
  },

  group: 'block',

  content: 'inline*',

  addAttributes() {
    return {
      // Core identity: fixed NULL_UUID for AI targeting
      id: {
        default: this.options.nullUUID,
        parseHTML: element => element.getAttribute('data-id') || element.getAttribute('id') || this.options.nullUUID,
        renderHTML: attributes => {
          if (attributes.id) {
            return { 'data-id': attributes.id, id: attributes.id }
          }
          return {}
        },
      },

      // Moni system compatibility
      moniBlockId: {
        default: this.options.nullUUID,
        parseHTML: element => element.getAttribute('data-moni-block-id') || this.options.nullUUID,
        renderHTML: attributes => {
          if (attributes.moniBlockId) {
            return { 'data-moni-block-id': attributes.moniBlockId }
          }
          return {}
        },
      },

      // UI state: collapse/expand
      collapsed: {
        default: true,
        parseHTML: element => element.getAttribute('data-collapsed') !== 'false',
        renderHTML: attributes => ({
          'data-collapsed': attributes.collapsed.toString(),
        }),
      },

      // UI state: display mode
      displayMode: {
        default: 'list',
        parseHTML: element => {
          const mode = element.getAttribute('data-display-mode')
          return mode && ['list', 'grid', 'cards'].includes(mode) ? mode : 'list'
        },
        renderHTML: attributes => ({
          'data-display-mode': attributes.displayMode,
        }),
      },

      // Moni system: no drag for this block
      moniDragEnabled: {
        default: false,
        parseHTML: () => false,
        renderHTML: () => ({
          'data-moni-drag-enabled': 'false',
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-file-children-block]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-file-children-block': 'true',
        'data-ai-target': HTMLAttributes.id,
        class: 'file-children-block-container',
      }),
      0,
    ]
  },

  addCommands() {
    return {
      insertFileChildrenBlock:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              id: this.options.nullUUID,
              moniBlockId: this.options.nullUUID,
              collapsed: true,
              displayMode: 'list',
              moniDragEnabled: false,
            },
          })
        },
    }
  },

  addStorage() {
    return {
      /**
       * Check if document has file children block
       */
      hasFileChildrenBlock: (context: any) => {
        let hasBlock = false
        context.editor.state.doc.descendants((node: ProseMirrorNode) => {
          if (node.type.name === this.name) {
            hasBlock = true
            return false
          }
        })
        return hasBlock
      },

      /**
       * Get file children block info
       */
      getFileChildrenBlockInfo: (context: any) => {
        let blockInfo = null
        context.editor.state.doc.descendants((node: ProseMirrorNode, pos: number) => {
          if (node.type.name === this.name) {
            blockInfo = {
              node,
              pos,
              attrs: node.attrs as FileChildrenBlockAttributes,
            }
            return false
          }
        })
        return blockInfo
      },

      /**
       * Update block UI state
       */
      updateFileChildrenBlockState: (context: any, updates: Partial<FileChildrenBlockAttributes>) => {
        const info = context.storage.getFileChildrenBlockInfo(context)
        if (!info) {return false}

        return context.editor.commands.setNodeAttributes(this.name, {
          ...info.attrs,
          ...updates,
        })
      },
    }
  },
})
