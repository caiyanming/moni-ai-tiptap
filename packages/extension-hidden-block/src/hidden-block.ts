import { mergeAttributes, Node } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'

export interface HiddenBlockOptions {
  /**
   * The HTML attributes for a hidden block node.
   * @default {}
   * @example { class: 'foo' }
   */
  HTMLAttributes: Record<string, any>

  /**
   * Whether to completely remove hidden blocks from DOM rendering
   * @default true
   */
  hideFromDOM: boolean

  /**
   * NULL_UUID constant for standardized hidden block IDs
   * @default '13814000-1dd2-11b2-8080-808080808080'
   */
  nullUUID: string
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    hiddenBlock: {
      /**
       * Create a hidden block with NULL_UUID
       * @example editor.commands.insertHiddenBlock()
       */
      insertHiddenBlock: () => ReturnType
    }
  }
}

/**
 * HiddenBlock extension for NULL_UUID block support
 *
 * This extension creates invisible blocks that:
 * 1. Use NULL_UUID (13814000-1dd2-11b2-8080-808080808080) as standardized ID
 * 2. Are completely hidden from user view but remain in JSON data
 * 3. Provide AI with operation targets for empty documents
 * 4. Support Block Stream operations
 *
 * Design principles:
 * - hidden=true: Block is invisible to users
 * - isInitialBlock=true: System-generated initial block marker
 * - NULL_UUID: Standardized ID for AI targeting
 * - DOM filtering: Uses ProseMirror plugins to hide from rendering
 */
export const HiddenBlock = Node.create<HiddenBlockOptions>({
  name: 'hiddenBlock',

  priority: 1100, // Higher than paragraph to take precedence

  addOptions() {
    return {
      HTMLAttributes: {},
      hideFromDOM: true,
      nullUUID: '13814000-1dd2-11b2-8080-808080808080',
    }
  },

  group: 'block',

  content: 'inline*',

  addAttributes() {
    return {
      // 🔥 Core block identification - consistent with other nodes
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

      // 🔥 Moni block ID for compatibility
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

      // 🔥 Hidden flag - core feature
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

      // 🔥 Initial block marker
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

      // 🔥 Other compatibility attributes from paragraph
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

      // 🔥 Drag system compatibility - hidden blocks shouldn't be draggable
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
        tag: 'p[data-hidden="true"]',
        priority: 90, // Higher priority to catch hidden paragraphs
      },
      {
        tag: 'div[data-hidden="true"]',
        priority: 90,
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const { hidden, isInitialBlock } = HTMLAttributes

    // If hideFromDOM is enabled and this is a hidden block, render minimally
    if (this.options.hideFromDOM && hidden && isInitialBlock) {
      return [
        'div',
        mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
          style: 'display: none; height: 0; overflow: hidden;',
          'data-hidden-block': 'true',
        }),
        0,
      ]
    }

    return ['p', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },

  addCommands() {
    return {
      insertHiddenBlock:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              id: this.options.nullUUID,
              moniBlockId: this.options.nullUUID,
              hidden: true,
              isInitialBlock: true,
            },
            content: [],
          })
        },
    }
  },

  // 🔥 Use ProseMirror plugins for DOM manipulation instead of custom NodeView
  // This avoids TypeScript issues with conditional NodeView returns

  addProseMirrorPlugins() {
    const { hideFromDOM, nullUUID } = this.options

    return [
      new Plugin({
        key: new PluginKey('hiddenBlockFilter'),

        view: (editorView: EditorView) => {
          const hideHiddenBlocks = () => {
            if (!hideFromDOM) {
              return
            }

            // Find all hidden blocks in the DOM and apply hiding styles
            const hiddenElements = editorView.dom.querySelectorAll('[data-hidden="true"][data-initial-block="true"]')

            hiddenElements.forEach(element => {
              const htmlElement = element as HTMLElement
              htmlElement.style.display = 'none'
              htmlElement.style.height = '0'
              htmlElement.style.overflow = 'hidden'
              htmlElement.setAttribute('data-hidden-block', 'true')

              // Add block ID for AI targeting
              const blockId =
                htmlElement.getAttribute('data-id') || htmlElement.getAttribute('data-moni-block-id') || nullUUID
              htmlElement.setAttribute('data-block-id', blockId)
            })
          }

          // Apply hiding on initial render
          setTimeout(hideHiddenBlocks, 0)

          return {
            update: () => {
              // Re-apply hiding after any document changes
              setTimeout(hideHiddenBlocks, 0)
            },
            destroy: () => {
              // Cleanup if needed
            },
          }
        },

        props: {
          // 🔥 Prevent any interaction with hidden blocks
          handleDOMEvents: {
            click: (view: EditorView, event: Event) => {
              const target = event.target as HTMLElement
              if (target?.closest('[data-hidden-block="true"]')) {
                event.preventDefault()
                event.stopPropagation()
                return true
              }
              return false
            },

            mousedown: (view: EditorView, event: Event) => {
              const target = event.target as HTMLElement
              if (target?.closest('[data-hidden-block="true"]')) {
                event.preventDefault()
                event.stopPropagation()
                return true
              }
              return false
            },

            keydown: (view: EditorView, event: KeyboardEvent) => {
              // Prevent navigation into hidden blocks
              const selection = view.state.selection
              const doc = view.state.doc

              // Check if selection would move into a hidden block
              doc.nodesBetween(selection.from, selection.to, node => {
                if (node.type.name === this.name && node.attrs.hidden && node.attrs.isInitialBlock) {
                  // Skip over hidden blocks during navigation
                  event.preventDefault()
                  return false
                }
              })

              return false
            },
          },
        },
      }),
    ]
  },

  // 🔥 Utility methods for working with hidden blocks
  addStorage() {
    return {
      // Check if document has any NULL_UUID hidden blocks
      hasNullUUIDBlock: (context: any) => {
        let hasNullBlock = false
        context.editor.state.doc.descendants((node: ProseMirrorNode) => {
          if (
            node.type.name === this.name &&
            node.attrs.hidden &&
            node.attrs.isInitialBlock &&
            (node.attrs.id === this.options.nullUUID || node.attrs.moniBlockId === this.options.nullUUID)
          ) {
            hasNullBlock = true
            return false // Stop iteration
          }
        })
        return hasNullBlock
      },

      // Count total hidden blocks
      getHiddenBlockCount: (context: any) => {
        let count = 0
        context.editor.state.doc.descendants((node: ProseMirrorNode) => {
          if (node.type.name === this.name && node.attrs.hidden && node.attrs.isInitialBlock) {
            count += 1
          }
        })
        return count
      },

      // Get all NULL_UUID block IDs
      getNullUUIDBlocks: (context: any) => {
        const blocks: string[] = []
        context.editor.state.doc.descendants((node: ProseMirrorNode) => {
          if (
            node.type.name === this.name &&
            node.attrs.hidden &&
            node.attrs.isInitialBlock &&
            (node.attrs.id === this.options.nullUUID || node.attrs.moniBlockId === this.options.nullUUID)
          ) {
            blocks.push(node.attrs.id || node.attrs.moniBlockId)
          }
        })
        return blocks
      },
    }
  },
})
