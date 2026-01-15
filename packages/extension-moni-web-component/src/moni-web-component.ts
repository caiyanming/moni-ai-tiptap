import { mergeAttributes, Node } from '@tiptap/core'
import type { Node as PMNode } from '@tiptap/pm/model'

export type MoniWebComponentPayload = Record<string, unknown>

export interface MoniWebComponentAttributes {
  componentId: string
  payload?: MoniWebComponentPayload | null
}

export interface MoniWebComponentOptions {
  /**
   * Callback when web component is clicked
   * @param node - The ProseMirror node representing the component
   * @param pos - The position of the node within the document
   */
  onClick?: (node: PMNode, pos: number) => void
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    moniWebComponent: {
      /**
       * Insert a web component node
       */
      setMoniWebComponent: (attributes: MoniWebComponentAttributes) => ReturnType

      /**
       * Update existing web component node
       */
      updateMoniWebComponent: (attributes: Partial<MoniWebComponentAttributes>, pos?: number) => ReturnType

      /**
       * Delete web component node
       */
      deleteMoniWebComponent: (pos?: number) => ReturnType
    }
  }
}

export const MoniWebComponent = Node.create<MoniWebComponentOptions>({
  name: 'moniWebComponent',

  group: 'block',

  atom: true,

  addOptions() {
    return {
      onClick: undefined,
    }
  },

  addAttributes() {
    return {
      componentId: {
        default: null,
        parseHTML: element => element.getAttribute('data-component-id'),
        renderHTML: attributes => {
          if (attributes.componentId) {
            return { 'data-component-id': attributes.componentId }
          }
          return {}
        },
      },
      payload: {
        default: null,
        parseHTML: element => {
          const raw = element.getAttribute('data-component-payload')
          if (!raw) {
            return null
          }
          try {
            return JSON.parse(raw)
          } catch {
            return null
          }
        },
        renderHTML: attributes => {
          if (!attributes.payload) {
            return {}
          }
          try {
            return { 'data-component-payload': JSON.stringify(attributes.payload) }
          } catch {
            return {}
          }
        },
      },
      // Moni block metadata
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
      moniBlockType: {
        default: null,
        parseHTML: element => element.getAttribute('data-moni-block-type'),
        renderHTML: attributes => {
          if (attributes.moniBlockType) {
            return { 'data-moni-block-type': attributes.moniBlockType }
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
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="moni-web-component"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'moni-web-component' })]
  },

  addCommands() {
    return {
      setMoniWebComponent:
        attributes =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          })
        },
      updateMoniWebComponent:
        (attributes, pos) =>
        ({ editor, tr }) => {
          const position = pos ?? editor.state.selection.$from.pos
          const node = editor.state.doc.nodeAt(position)

          if (!node || node.type.name !== this.name) {
            return false
          }

          tr.setNodeMarkup(position, this.type, {
            ...node.attrs,
            ...attributes,
          })

          return true
        },
      deleteMoniWebComponent:
        pos =>
        ({ editor, tr }) => {
          const position = pos ?? editor.state.selection.$from.pos
          const node = editor.state.doc.nodeAt(position)

          if (!node || node.type.name !== this.name) {
            return false
          }

          tr.delete(position, position + node.nodeSize)
          return true
        },
    }
  },
})
