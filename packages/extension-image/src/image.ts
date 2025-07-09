import { mergeAttributes, Node, nodeInputRule } from '@tiptap/core'

export interface ImageOptions {
  /**
   * Controls if the image node should be inline or not.
   * @default false
   * @example true
   */
  inline: boolean

  /**
   * Controls if base64 images are allowed. Enable this if you want to allow
   * base64 image urls in the `src` attribute.
   * @default false
   * @example true
   */
  allowBase64: boolean

  /**
   * HTML attributes to add to the image element.
   * @default {}
   * @example { class: 'foo' }
   */
  HTMLAttributes: Record<string, any>
}

export interface SetImageOptions {
  src: string
  alt?: string
  title?: string
  width?: number
  height?: number
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    image: {
      /**
       * Add an image
       * @param options The image attributes
       * @example
       * editor
       *   .commands
       *   .setImage({ src: 'https://tiptap.dev/logo.png', alt: 'tiptap', title: 'tiptap logo' })
       */
      setImage: (options: SetImageOptions) => ReturnType
    }
  }
}

/**
 * Matches an image to a ![image](src "title") on input.
 */
export const inputRegex = /(?:^|\s)(!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\))$/

/**
 * This extension allows you to insert images.
 * @see https://www.tiptap.dev/api/nodes/image
 */
export const Image = Node.create<ImageOptions>({
  name: 'image',

  addOptions() {
    return {
      inline: false,
      allowBase64: false,
      HTMLAttributes: {},
    }
  },

  inline() {
    return this.options.inline
  },

  group() {
    return this.options.inline ? 'inline' : 'block'
  },

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
      },
      height: {
        default: null,
      },
      // 🔥 核心块标识属性 - 对应 Notion 的 image block
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
        default: false, // 🔥 图像块通常不可嵌套
        parseHTML: element => element.getAttribute('data-moni-nestable') !== 'false',
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
      // 🔥 Stream 属性 - 图像特定配置
      moniStreamType: {
        default: 'media',
        parseHTML: element => element.getAttribute('data-moni-stream-type') || 'media',
        renderHTML: attributes => {
          if (attributes.moniStreamType && attributes.moniStreamType !== 'media') {
            return { 'data-moni-stream-type': attributes.moniStreamType }
          }
          return {}
        },
      },
      moniStreamMode: {
        default: 'replace', // 🔥 图像默认使用 replace 模式
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
    return [
      {
        tag: this.options.allowBase64 ? 'img[src]' : 'img[src]:not([src^="data:"])',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)]
  },

  addCommands() {
    return {
      setImage:
        options =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          })
        },
    }
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: inputRegex,
        type: this.type,
        getAttributes: match => {
          const [, , alt, src, title] = match

          return { src, alt, title }
        },
      }),
    ]
  },
})
