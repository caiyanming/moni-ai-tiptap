import { mergeAttributes, Node } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { Transaction } from '@tiptap/pm/state'
import { Plugin, PluginKey } from '@tiptap/pm/state'

import type { FileChildrenBlockAttributes, FileChildrenBlockOptions } from './types.js'
import { NULL_UUID } from './types.js'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fileChildrenBlock: {
      /**
       * Insert file children block with NULL_UUID
       */
      insertFileChildrenBlock: () => ReturnType
      /**
       * Update file children block attributes with validation
       */
      updateFileChildrenBlockAttributes: (attributes: Partial<FileChildrenBlockAttributes>) => ReturnType
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
        // Validate on update
        keepOnSplit: false,
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

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('fileChildrenBlockValidation'),
        appendTransaction: (transactions, oldState, newState) => {
          let tr: Transaction | undefined
          let modified = false

          // 检查所有FileChildrenBlock节点，确保属性符合规则
          newState.doc.descendants((node: ProseMirrorNode, pos: number) => {
            if (node.type.name === this.name) {
              const attrs = { ...node.attrs } as FileChildrenBlockAttributes
              let needsUpdate = false

              // 强制保持核心属性
              if (attrs.id !== this.options.nullUUID) {
                attrs.id = this.options.nullUUID
                needsUpdate = true
              }
              if (attrs.moniBlockId !== this.options.nullUUID) {
                attrs.moniBlockId = this.options.nullUUID
                needsUpdate = true
              }
              if (attrs.moniDragEnabled !== false) {
                attrs.moniDragEnabled = false
                needsUpdate = true
              }

              // 验证displayMode
              if (!['list', 'grid', 'cards'].includes(attrs.displayMode)) {
                attrs.displayMode = 'list'
                needsUpdate = true
              }

              if (needsUpdate) {
                if (!tr) {
                  tr = newState.tr
                }
                tr.setNodeMarkup(pos, undefined, attrs)
                modified = true
              }
            }
          })

          return modified && tr ? tr : null
        },
      }),
    ]
  },

  // 移除原生 NodeView，让 React NodeView 接管

  addStorage() {
    return {
      /**
       * Check if document has file children block
       */
      hasFileChildrenBlock: (editor: any) => {
        let hasBlock = false
        editor.state.doc.descendants((node: ProseMirrorNode) => {
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
      getFileChildrenBlockInfo: (editor: any) => {
        let blockInfo = null
        editor.state.doc.descendants((node: ProseMirrorNode, pos: number) => {
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
      updateFileChildrenBlockState: (editor: any, updates: Partial<FileChildrenBlockAttributes>) => {
        const info = editor.storage.fileChildrenBlock.getFileChildrenBlockInfo(editor)
        if (!info) {
          return false
        }

        // Validate and clean updates
        const validatedUpdates = { ...updates }

        // Always keep moniDragEnabled as false
        if ('moniDragEnabled' in validatedUpdates) {
          validatedUpdates.moniDragEnabled = false
        }

        // Validate displayMode
        if ('displayMode' in validatedUpdates) {
          const mode = validatedUpdates.displayMode
          if (mode && !['list', 'grid', 'cards'].includes(mode)) {
            // Use default value if invalid
            validatedUpdates.displayMode = 'list'
          }
        }

        // Preserve core identity
        validatedUpdates.id = this.options.nullUUID
        validatedUpdates.moniBlockId = this.options.nullUUID

        return editor.commands.updateAttributes(this.name, {
          ...info.attrs,
          ...validatedUpdates,
        })
      },
    }
  },
})
