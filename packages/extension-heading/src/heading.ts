import {
  addGlobalStyleAttributes,
  ensureMoniBlockId,
  generateInlineStyleForNode,
  mergeAttributes,
  Node,
  textblockTypeInputRule,
} from '@tiptap/core'

/**
 * The heading level options.
 */
export type Level = 1 | 2 | 3 | 4 | 5 | 6

export interface HeadingOptions {
  /**
   * The available heading levels.
   * @default [1, 2, 3, 4, 5, 6]
   * @example [1, 2, 3]
   */
  levels: Level[]

  /**
   * The HTML attributes for a heading node.
   * @default {}
   * @example { class: 'foo' }
   */
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    heading: {
      /**
       * Set a heading node
       * @param attributes The heading attributes
       * @example editor.commands.setHeading({ level: 1 })
       */
      setHeading: (attributes: { level: Level }) => ReturnType
      /**
       * Toggle a heading node
       * @param attributes The heading attributes
       * @example editor.commands.toggleHeading({ level: 1 })
       */
      toggleHeading: (attributes: { level: Level }) => ReturnType
    }
  }
}

/**
 * This extension allows you to create headings.
 * @see https://www.tiptap.dev/api/nodes/heading
 */
export const Heading = Node.create<HeadingOptions>({
  name: 'heading',

  addOptions() {
    return {
      levels: [1, 2, 3, 4, 5, 6],
      HTMLAttributes: {},
    }
  },

  content: 'inline*',

  group: 'block',

  defining: true,

  addAttributes() {
    return {
      // 🔥 标题特有属性
      level: {
        default: 1,
        rendered: false,
      },
      // 🔥 核心块标识属性
      moniBlockId: {
        default: () => ensureMoniBlockId({}).moniBlockId,
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
        default: false,
        parseHTML: element => element.getAttribute('data-moni-nestable') === 'true',
        renderHTML: attributes => {
          if (attributes.moniNestable === true) {
            return { 'data-moni-nestable': 'true' }
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
      // 🔥 Stream 属性 - 标题特定配置
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

      // ============ 🎨 MoniAI 全局样式属性 ============
      ...addGlobalStyleAttributes(),
    }
  },

  parseHTML() {
    return this.options.levels.map((level: Level) => ({
      tag: `h${level}`,
      attrs: { level },
    }))
  },

  renderHTML({ node, HTMLAttributes }) {
    const hasLevel = this.options.levels.includes(node.attrs.level)
    const level = hasLevel ? node.attrs.level : this.options.levels[0]

    // 🎨 应用全局样式 - 生成行内样式
    const inlineStyle = generateInlineStyleForNode(HTMLAttributes, { level })
    const finalAttributes = mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes,
      inlineStyle ? { style: inlineStyle } : {},
    )

    return [`h${level}`, finalAttributes, 0]
  },

  addCommands() {
    return {
      setHeading:
        attributes =>
        ({ commands }) => {
          if (!this.options.levels.includes(attributes.level)) {
            return false
          }

          return commands.setNode(this.name, attributes)
        },
      toggleHeading:
        attributes =>
        ({ commands }) => {
          if (!this.options.levels.includes(attributes.level)) {
            return false
          }

          return commands.toggleNode(this.name, 'paragraph', attributes)
        },
    }
  },

  addKeyboardShortcuts() {
    return this.options.levels.reduce(
      (items, level) => ({
        ...items,
        ...{
          [`Mod-Alt-${level}`]: () => this.editor.commands.toggleHeading({ level }),
        },
      }),
      {},
    )
  },

  addInputRules() {
    return this.options.levels.map(level => {
      return textblockTypeInputRule({
        find: new RegExp(`^(#{${Math.min(...this.options.levels)},${level}})\\s$`),
        type: this.type,
        getAttributes: {
          level,
        },
      })
    })
  },
})
