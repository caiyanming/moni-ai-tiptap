import type { Editor } from '@tiptap/core'
import { mergeAttributes, Node } from '@tiptap/core'

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
 * This node is:
 * - Invisible (display:none)
 * - Manually inserted by upper layer (moni-ai-web)
 * - Used by backend to locate insertion point
 *
 * Design philosophy:
 * "Good taste means removing special cases, not adding conditions."
 * "Theory and practice sometimes clash. Theory loses. Every single time."
 *
 * - NO auto-insertion (upper layer controls timing)
 * - NO Guardian plugin (keep it simple)
 * - NO complex protection (trust upper layer)
 */
export const HiddenBlock = Node.create<
  Record<string, never>,
  {
    hasHiddenBlock: (editor: Editor) => boolean
    getHiddenBlockInfo: (editor: Editor) => any
  }
>({
  name: 'hiddenBlock',

  group: 'block',

  content: 'inline*',

  atom: false,

  addAttributes() {
    return {
      id: {
        default: NULL_UUID,
        parseHTML: element => element.getAttribute('data-id') || element.getAttribute('id') || NULL_UUID,
        renderHTML: attributes => {
          const id = attributes.id || NULL_UUID
          return { 'data-id': id, id }
        },
      },
      moniBlockId: {
        default: NULL_UUID,
        parseHTML: element => element.getAttribute('data-moni-block-id') || NULL_UUID,
        renderHTML: attributes => {
          const moniBlockId = attributes.moniBlockId || NULL_UUID
          return { 'data-moni-block-id': moniBlockId }
        },
      },
      hidden: {
        default: true,
        parseHTML: element => element.getAttribute('data-hidden') !== 'false',
        renderHTML: () => {
          return { 'data-hidden': 'true' }
        },
      },
      isInitialBlock: {
        default: true,
        parseHTML: element => element.getAttribute('data-initial-block') !== 'false',
        renderHTML: () => {
          return { 'data-initial-block': 'true' }
        },
      },
      moniDragEnabled: {
        default: false,
        parseHTML: element => element.getAttribute('data-moni-drag-enabled') === 'true',
        renderHTML: () => {
          return { 'data-moni-drag-enabled': 'false' }
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
    // Use actual ID from attributes, fallback to NULL_UUID
    const targetId = HTMLAttributes.id || HTMLAttributes['data-id'] || NULL_UUID

    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-hidden-block': 'true',
        'data-ai-target': targetId,
        style: 'display:none;height:0;width:0;overflow:hidden;position:absolute;',
      }),
      0, // Content placeholder
    ]
  },

  addCommands() {
    return {
      insertHiddenBlock:
        () =>
        ({ commands, state }) => {
          const firstNode = state.doc.firstChild

          // Don't insert if already exists
          if (firstNode && firstNode.type.name === 'hiddenBlock') {
            return false
          }

          return commands.insertContentAt(0, {
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
    }
  },
})
