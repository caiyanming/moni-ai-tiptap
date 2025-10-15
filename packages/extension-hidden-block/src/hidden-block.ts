import type { Editor } from '@tiptap/core'
import { mergeAttributes,Node } from '@tiptap/core'

import type { HiddenBlockAttributes } from './types.js'
import { NULL_UUID } from './types.js'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    hiddenBlock: {
      /**
       * Insert a hidden block at the beginning of the document
       */
      insertHiddenBlock: () => ReturnType
    }
  }
}

/**
 * HiddenBlock Extension
 *
 * A minimalist anchor point for AI stream operations.
 * This node is always:
 * - Invisible (display:none)
 * - At document start (position 0)
 * - Immutable (attributes locked to NULL_UUID)
 * - Non-interactive (cannot be selected/deleted)
 *
 * Design philosophy:
 * "Good taste means removing special cases, not adding conditions."
 * - The hidden block is NOT a UI element
 * - It's a data structure anchor point
 * - Zero configuration, zero complexity
 */
export const HiddenBlock = Node.create<
  Record<string, never>,
  {
    hasHiddenBlock: (editor: Editor) => boolean
    getHiddenBlockInfo: (editor: Editor) => any
    ensureHiddenBlock: (editor: Editor) => void
  }
>({
  name: 'hiddenBlock',

  group: 'block',

  content: 'inline*',

  atom: false,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-id') || element.getAttribute('id'),
        renderHTML: attributes => {
          if (attributes.id) {
            return { 'data-id': attributes.id, id: attributes.id }
          }
          return {}
        },
      },
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
      hidden: {
        default: false,
        parseHTML: element => element.getAttribute('data-hidden') === 'true',
        renderHTML: attributes => {
          if (attributes.hidden === true) {
            return { 'data-hidden': 'true' }
          }
          return {}
        },
      },
      isInitialBlock: {
        default: false,
        parseHTML: element => element.getAttribute('data-initial-block') === 'true',
        renderHTML: attributes => {
          if (attributes.isInitialBlock === true) {
            return { 'data-initial-block': 'true' }
          }
          return {}
        },
      },
      moniDragEnabled: {
        default: false,
        parseHTML: element => element.getAttribute('data-moni-drag-enabled') === 'true',
        renderHTML: attributes => {
          if (attributes.moniDragEnabled === true) {
            return { 'data-moni-drag-enabled': 'true' }
          }
          return {}
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-hidden-block="true"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-hidden-block': 'true',
        'data-ai-target': 'anchor',
        style: 'display:none;height:0;width:0;overflow:hidden;position:absolute;',
      }),
      0, // Content placeholder
    ]
  },

  addCommands() {
    return {
      insertHiddenBlock:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              id: NULL_UUID,
              moniBlockId: NULL_UUID,
              hidden: true,
              isInitialBlock: true,
              moniDragEnabled: false,
            },
            content: [],
          })
        },
    }
  },

  // No auto-insertion plugin - hiddenBlock must be manually inserted
  // via editor.commands.insertHiddenBlock() or in document initialization

  addStorage() {
    return {
      /**
       * Check if the document has a hidden block at position 0
       */
      hasHiddenBlock(editor: Editor): boolean {
        return editor.state.doc.firstChild?.type.name === 'hiddenBlock'
      },

      /**
       * Get hidden block information
       */
      getHiddenBlockInfo(editor: Editor) {
        const firstNode = editor.state.doc.firstChild

        if (firstNode && firstNode.type.name === 'hiddenBlock') {
          const attrs = firstNode.attrs as HiddenBlockAttributes
          return {
            exists: true,
            moniBlockId: attrs.moniBlockId,
            isValid: attrs.moniBlockId === NULL_UUID && attrs.id === NULL_UUID,
            position: 0,
          }
        }

        return {
          exists: false,
          moniBlockId: null,
          isValid: false,
          position: -1,
        }
      },

      /**
       * Ensure the document has a valid hidden block
       * Auto-inserts if missing
       */
      ensureHiddenBlock(editor: Editor): void {
        if (!this.hasHiddenBlock(editor)) {
          editor.commands.insertHiddenBlock()
        }
      },
    }
  },
})
