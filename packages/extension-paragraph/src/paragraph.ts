import type { NodeAttributes } from '@tiptap/core'
import { addGlobalStyleAttributes, generateInlineStyleForNode, mergeAttributes, Node } from '@tiptap/core'

export interface ParagraphOptions {
  /**
   * The HTML attributes for a paragraph node.
   * @default {}
   * @example { class: 'foo' }
   */
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    paragraph: {
      /**
       * Toggle a paragraph
       * @example editor.commands.toggleParagraph()
       */
      setParagraph: () => ReturnType
    }
  }
}

/**
 * This extension allows you to create paragraphs.
 * @see https://www.tiptap.dev/api/nodes/paragraph
 */
export const Paragraph = Node.create<ParagraphOptions>({
  name: 'paragraph',

  priority: 1000,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  group: 'block',

  content: 'inline*',

  addAttributes() {
    return {
      // 🔥 核心块标识属性 - 对应 Notion 的 block id
      // 注意：默认值为 null，由业务代码（commands/插件）负责生成
      moniBlockId: {
        default: null,
        parseHTML: element => element.getAttribute('data-moni-block-id') || null,
        renderHTML: attributes => {
          // 只在有值时才渲染（遵循 HTML 哲学）
          if (attributes.moniBlockId) {
            return { 'data-moni-block-id': attributes.moniBlockId }
          }
          return {}
        },
      },
      // 🔥 语义块类型标识 - 对应后端定义的 moniBlockType
      // 例如：explanation_block / single_choice_question / wrong_question_entry 等
      moniBlockType: {
        default: null,
        parseHTML: element => element.getAttribute('data-moni-block-type') || null,
        renderHTML: attributes => {
          if (attributes.moniBlockType) {
            return { 'data-moni-block-type': attributes.moniBlockType }
          }
          return {}
        },
      },

      // 🔥 父级关系属性（持久化）
      moniParentId: {
        default: null,
        parseHTML: element => element.getAttribute('data-moni-parent-id') || null,
        renderHTML: attributes => {
          if (attributes.moniParentId) {
            return { 'data-moni-parent-id': attributes.moniParentId }
          }
          return {}
        },
      },
      // 🔥 层级结构属性（持久化）
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

      // 🔥 拖拽/Stream 等运行时属性已移除
      // 现在通过 editor.storage.runtimeState 访问
      // 参见：packages/core/src/extensions/runtime-state.ts

      // ============ 🎨 MoniAI 全局样式属性 ============
      ...addGlobalStyleAttributes(),
    }
  },

  parseHTML() {
    return [{ tag: 'p' }]
  },

  renderHTML({ HTMLAttributes, node }) {
    // 🎨 应用全局样式 - 生成行内样式
    // 使用 node.attrs 而不是 HTMLAttributes，因为后者已经是转换后的 data- 属性
    const inlineStyle = generateInlineStyleForNode(node.attrs as NodeAttributes)
    const finalAttributes = mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes,
      inlineStyle ? { style: inlineStyle } : {},
    )

    return ['p', finalAttributes, 0]
  },

  addCommands() {
    return {
      setParagraph:
        () =>
        ({ commands }) => {
          return commands.setNode(this.name)
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Alt-0': () => this.editor.commands.setParagraph(),
    }
  },
})
