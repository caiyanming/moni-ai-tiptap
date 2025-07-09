import type { DOMOutputSpec, Node as ProseMirrorNode, NodeSpec, NodeType } from '@tiptap/pm/model'

import type { Editor } from './Editor.js'
import type { ExtendableConfig } from './Extendable.js'
import { Extendable } from './Extendable.js'
import type { Attributes, NodeViewRenderer, ParentConfig } from './types.js'

export interface NodeConfig<Options = any, Storage = any>
  extends ExtendableConfig<Options, Storage, NodeConfig<Options, Storage>, NodeType> {
  /**
   * Node View
   */
  addNodeView?:
    | ((this: {
        name: string
        options: Options
        storage: Storage
        editor: Editor
        type: NodeType
        parent: ParentConfig<NodeConfig<Options, Storage>>['addNodeView']
      }) => NodeViewRenderer)
    | null

  /**
   * Defines if this node should be a top level node (doc)
   * @default false
   * @example true
   */
  topNode?: boolean

  /**
   * Custom blockId generator function
   * @default undefined
   * @example () => `block-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
   */
  moniBlockIdGenerator?: () => string

  /**
   * The content expression for this node, as described in the [schema
   * guide](/docs/guide/#schema.content_expressions). When not given,
   * the node does not allow any content.
   *
   * You can read more about it on the Prosemirror documentation here
   * @see https://prosemirror.net/docs/guide/#schema.content_expressions
   * @default undefined
   * @example content: 'block+'
   * @example content: 'headline paragraph block*'
   */
  content?:
    | NodeSpec['content']
    | ((this: {
        name: string
        options: Options
        storage: Storage
        parent: ParentConfig<NodeConfig<Options, Storage>>['content']
        editor?: Editor
      }) => NodeSpec['content'])

  /**
   * The marks that are allowed inside of this node. May be a
   * space-separated string referring to mark names or groups, `"_"`
   * to explicitly allow all marks, or `""` to disallow marks. When
   * not given, nodes with inline content default to allowing all
   * marks, other nodes default to not allowing marks.
   *
   * @example marks: 'strong em'
   */
  marks?:
    | NodeSpec['marks']
    | ((this: {
        name: string
        options: Options
        storage: Storage
        parent: ParentConfig<NodeConfig<Options, Storage>>['marks']
        editor?: Editor
      }) => NodeSpec['marks'])

  /**
   * The group or space-separated groups to which this node belongs,
   * which can be referred to in the content expressions for the
   * schema.
   *
   * By default Tiptap uses the groups 'block' and 'inline' for nodes. You
   * can also use custom groups if you want to group specific nodes together
   * and handle them in your schema.
   * @example group: 'block'
   * @example group: 'inline'
   * @example group: 'customBlock' // this uses a custom group
   */
  group?:
    | NodeSpec['group']
    | ((this: {
        name: string
        options: Options
        storage: Storage
        parent: ParentConfig<NodeConfig<Options, Storage>>['group']
        editor?: Editor
      }) => NodeSpec['group'])

  /**
   * Should be set to true for inline nodes. (Implied for text nodes.)
   */
  inline?:
    | NodeSpec['inline']
    | ((this: {
        name: string
        options: Options
        storage: Storage
        parent: ParentConfig<NodeConfig<Options, Storage>>['inline']
        editor?: Editor
      }) => NodeSpec['inline'])

  /**
   * Can be set to true to indicate that, though this isn't a [leaf
   * node](https://prosemirror.net/docs/ref/#model.NodeType.isLeaf), it doesn't have directly editable
   * content and should be treated as a single unit in the view.
   *
   * @example atom: true
   */
  atom?:
    | NodeSpec['atom']
    | ((this: {
        name: string
        options: Options
        storage: Storage
        parent: ParentConfig<NodeConfig<Options, Storage>>['atom']
        editor?: Editor
      }) => NodeSpec['atom'])

  /**
   * Controls whether nodes of this type can be selected as a [node
   * selection](https://prosemirror.net/docs/ref/#state.NodeSelection). Defaults to true for non-text
   * nodes.
   *
   * @default true
   * @example selectable: false
   */
  selectable?:
    | NodeSpec['selectable']
    | ((this: {
        name: string
        options: Options
        storage: Storage
        parent: ParentConfig<NodeConfig<Options, Storage>>['selectable']
        editor?: Editor
      }) => NodeSpec['selectable'])

  /**
   * Determines whether nodes of this type can be dragged without
   * being selected. Defaults to false.
   *
   * @default: false
   * @example: draggable: true
   */
  draggable?:
    | NodeSpec['draggable']
    | ((this: {
        name: string
        options: Options
        storage: Storage
        parent: ParentConfig<NodeConfig<Options, Storage>>['draggable']
        editor?: Editor
      }) => NodeSpec['draggable'])

  /**
   * Can be used to indicate that this node contains code, which
   * causes some commands to behave differently.
   */
  code?:
    | NodeSpec['code']
    | ((this: {
        name: string
        options: Options
        storage: Storage
        parent: ParentConfig<NodeConfig<Options, Storage>>['code']
        editor?: Editor
      }) => NodeSpec['code'])

  /**
   * Controls way whitespace in this a node is parsed. The default is
   * `"normal"`, which causes the [DOM parser](https://prosemirror.net/docs/ref/#model.DOMParser) to
   * collapse whitespace in normal mode, and normalize it (replacing
   * newlines and such with spaces) otherwise. `"pre"` causes the
   * parser to preserve spaces inside the node. When this option isn't
   * given, but [`code`](https://prosemirror.net/docs/ref/#model.NodeSpec.code) is true, `whitespace`
   * will default to `"pre"`. Note that this option doesn't influence
   * the way the node is rendered—that should be handled by `toDOM`
   * and/or styling.
   */
  whitespace?:
    | NodeSpec['whitespace']
    | ((this: {
        name: string
        options: Options
        storage: Storage
        parent: ParentConfig<NodeConfig<Options, Storage>>['whitespace']
        editor?: Editor
      }) => NodeSpec['whitespace'])

  /**
   * Allows a **single** node to be set as linebreak equivalent (e.g. hardBreak).
   * When converting between block types that have whitespace set to "pre"
   * and don't support the linebreak node (e.g. codeBlock) and other block types
   * that do support the linebreak node (e.g. paragraphs) - this node will be used
   * as the linebreak instead of stripping the newline.
   *
   * See [linebreakReplacement](https://prosemirror.net/docs/ref/#model.NodeSpec.linebreakReplacement).
   */
  linebreakReplacement?:
    | NodeSpec['linebreakReplacement']
    | ((this: {
        name: string
        options: Options
        storage: Storage
        parent: ParentConfig<NodeConfig<Options, Storage>>['linebreakReplacement']
        editor?: Editor
      }) => NodeSpec['linebreakReplacement'])

  /**
   * When enabled, enables both
   * [`definingAsContext`](https://prosemirror.net/docs/ref/#model.NodeSpec.definingAsContext) and
   * [`definingForContent`](https://prosemirror.net/docs/ref/#model.NodeSpec.definingForContent).
   *
   * @default false
   * @example isolating: true
   */
  defining?:
    | NodeSpec['defining']
    | ((this: {
        name: string
        options: Options
        storage: Storage
        parent: ParentConfig<NodeConfig<Options, Storage>>['defining']
        editor?: Editor
      }) => NodeSpec['defining'])

  /**
   * When enabled (default is false), the sides of nodes of this type
   * count as boundaries that regular editing operations, like
   * backspacing or lifting, won't cross. An example of a node that
   * should probably have this enabled is a table cell.
   */
  isolating?:
    | NodeSpec['isolating']
    | ((this: {
        name: string
        options: Options
        storage: Storage
        parent: ParentConfig<NodeConfig<Options, Storage>>['isolating']
        editor?: Editor
      }) => NodeSpec['isolating'])

  /**
   * Associates DOM parser information with this node, which can be
   * used by [`DOMParser.fromSchema`](https://prosemirror.net/docs/ref/#model.DOMParser^fromSchema) to
   * automatically derive a parser. The `node` field in the rules is
   * implied (the name of this node will be filled in automatically).
   * If you supply your own parser, you do not need to also specify
   * parsing rules in your schema.
   *
   * @example parseHTML: [{ tag: 'div', attrs: { 'data-id': 'my-block' } }]
   */
  parseHTML?: (this: {
    name: string
    options: Options
    storage: Storage
    parent: ParentConfig<NodeConfig<Options, Storage>>['parseHTML']
    editor?: Editor
  }) => NodeSpec['parseDOM']

  /**
   * A description of a DOM structure. Can be either a string, which is
   * interpreted as a text node, a DOM node, which is interpreted as
   * itself, a `{dom, contentDOM}` object, or an array.
   *
   * An array describes a DOM element. The first value in the array
   * should be a string—the name of the DOM element, optionally prefixed
   * by a namespace URL and a space. If the second element is plain
   * object, it is interpreted as a set of attributes for the element.
   * Any elements after that (including the 2nd if it's not an attribute
   * object) are interpreted as children of the DOM elements, and must
   * either be valid `DOMOutputSpec` values, or the number zero.
   *
   * The number zero (pronounced "hole") is used to indicate the place
   * where a node's child nodes should be inserted. If it occurs in an
   * output spec, it should be the only child element in its parent
   * node.
   *
   * @example toDOM: ['div[data-id="my-block"]', { class: 'my-block' }, 0]
   */
  renderHTML?:
    | ((
        this: {
          name: string
          options: Options
          storage: Storage
          parent: ParentConfig<NodeConfig<Options, Storage>>['renderHTML']
          editor?: Editor
        },
        props: {
          node: ProseMirrorNode
          HTMLAttributes: Record<string, any>
        },
      ) => DOMOutputSpec)
    | null

  /**
   * renders the node as text
   * @example renderText: () => 'foo
   */
  renderText?:
    | ((
        this: {
          name: string
          options: Options
          storage: Storage
          parent: ParentConfig<NodeConfig<Options, Storage>>['renderText']
          editor?: Editor
        },
        props: {
          node: ProseMirrorNode
          pos: number
          parent: ProseMirrorNode
          index: number
        },
      ) => string)
    | null

  /**
   * Add attributes to the node
   * @example addAttributes: () => ({ class: 'foo' })
   */
  addAttributes?: (this: {
    name: string
    options: Options
    storage: Storage
    parent: ParentConfig<NodeConfig<Options, Storage>>['addAttributes']
    editor?: Editor
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  }) => Attributes | {}
}

/**
 * Default blockId generator function for Moni enhancement
 * Generates a unique blockId using timestamp and random string
 */
export const moniDefaultBlockIdGenerator = (): string => {
  return `block-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * The Node class is used to create custom node extensions.
 * @see https://tiptap.dev/api/extensions#create-a-new-extension
 */
export class Node<Options = any, Storage = any> extends Extendable<Options, Storage, NodeConfig<Options, Storage>> {
  type = 'node'

  /**
   * Create a new Node instance
   * @param config - Node configuration object or a function that returns a configuration object
   */
  static create<O = any, S = any>(config: Partial<NodeConfig<O, S>> | (() => Partial<NodeConfig<O, S>>) = {}) {
    // If the config is a function, execute it to get the configuration object
    const resolvedConfig = typeof config === 'function' ? config() : config
    return new Node<O, S>(resolvedConfig)
  }

  /**
   * Enhanced addAttributes that includes core blockId and parentId attributes
   */
  private enhanceAddAttributes() {
    const originalAddAttributes = this.config.addAttributes

    this.config.addAttributes = function () {
      // 🚨 修复：Text 节点不能有任何属性，直接返回原始属性
      if (this.name === 'text') {
        return originalAddAttributes ? originalAddAttributes.call(this) : {}
      }

      // Get user-defined attributes
      const userAttributes = originalAddAttributes ? originalAddAttributes.call(this) : {}

      // Always include core moni attributes
      const enhancedAttributes: Attributes = {
        ...userAttributes,
        // Core block identification - JavaScript camelCase, HTML data-kebab-case (符合HTML规范)
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
        // Core parent relationship - JavaScript camelCase, HTML data-kebab-case (符合HTML规范)
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
        // Hierarchical structure capabilities - 符合HTML规范
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
        moniDepth: {
          default: 0,
          parseHTML: element => {
            const depth = element.getAttribute('data-moni-depth')
            return depth ? parseInt(depth, 10) : 0
          },
          renderHTML: attributes => {
            if (attributes.moniDepth !== undefined && attributes.moniDepth !== 0) {
              return { 'data-moni-depth': attributes.moniDepth.toString() }
            }
            return {}
          },
        },
        moniIndex: {
          default: 0,
          parseHTML: element => {
            const index = element.getAttribute('data-moni-index')
            return index ? parseInt(index, 10) : 0
          },
          renderHTML: attributes => {
            if (attributes.moniIndex !== undefined && attributes.moniIndex !== 0) {
              return { 'data-moni-index': attributes.moniIndex.toString() }
            }
            return {}
          },
        },
        // Drag behavior capabilities - 符合HTML规范
        moniDragEnabled: {
          default: true,
          parseHTML: element => element.getAttribute('data-moni-drag-enabled') === 'true',
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
        // Drag constraints capabilities
        moniDropTargets: {
          default: null,
          parseHTML: element => {
            const targets = element.getAttribute('data-moni-drop-targets')
            return targets ? targets.split(',').map(t => t.trim()) : null
          },
          renderHTML: attributes => {
            if (attributes.moniDropTargets && Array.isArray(attributes.moniDropTargets)) {
              return { 'data-moni-drop-targets': attributes.moniDropTargets.join(',') }
            }
            return {}
          },
        },
        moniMaxNestLevel: {
          default: null,
          parseHTML: element => {
            const maxLevel = element.getAttribute('data-moni-max-nest-level')
            return maxLevel ? parseInt(maxLevel, 10) : null
          },
          renderHTML: attributes => {
            if (attributes.moniMaxNestLevel !== null && attributes.moniMaxNestLevel !== undefined) {
              return { 'data-moni-max-nest-level': attributes.moniMaxNestLevel.toString() }
            }
            return {}
          },
        },
        moniCanNestIn: {
          default: null,
          parseHTML: element => {
            const canNestIn = element.getAttribute('data-moni-can-nest-in')
            return canNestIn ? canNestIn.split(',').map(t => t.trim()) : null
          },
          renderHTML: attributes => {
            if (attributes.moniCanNestIn && Array.isArray(attributes.moniCanNestIn)) {
              return { 'data-moni-can-nest-in': attributes.moniCanNestIn.join(',') }
            }
            return {}
          },
        },
        // Stream identification capabilities - native support without switches, 符合HTML规范
        moniStreamId: {
          default: null,
          parseHTML: element => element.getAttribute('data-moni-stream-id'),
          renderHTML: attributes => {
            if (attributes.moniStreamId) {
              return { 'data-moni-stream-id': attributes.moniStreamId }
            }
            return {}
          },
        },
        moniStreamTarget: {
          default: false,
          parseHTML: element => element.getAttribute('data-moni-stream-target') === 'true',
          renderHTML: attributes => {
            if (attributes.moniStreamTarget === true) {
              return { 'data-moni-stream-target': 'true' }
            }
            return {}
          },
        },
        // Stream type capabilities - 符合HTML规范
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
        // Stream status capabilities
        moniOperationQueue: {
          default: null,
          parseHTML: element => {
            const queue = element.getAttribute('data-moni-operation-queue')
            return queue ? JSON.parse(queue) : null
          },
          renderHTML: attributes => {
            if (attributes.moniOperationQueue && Array.isArray(attributes.moniOperationQueue)) {
              return { 'data-moni-operation-queue': JSON.stringify(attributes.moniOperationQueue) }
            }
            return {}
          },
        },
        moniStreamProgress: {
          default: 0,
          parseHTML: element => {
            const progress = element.getAttribute('data-moni-stream-progress')
            return progress ? parseFloat(progress) : 0
          },
          renderHTML: attributes => {
            if (attributes.moniStreamProgress !== undefined && attributes.moniStreamProgress !== 0) {
              return { 'data-moni-stream-progress': attributes.moniStreamProgress.toString() }
            }
            return {}
          },
        },
        moniStreamStatus: {
          default: 'idle',
          parseHTML: element => element.getAttribute('data-moni-stream-status') || 'idle',
          renderHTML: attributes => {
            if (attributes.moniStreamStatus && attributes.moniStreamStatus !== 'idle') {
              return { 'data-moni-stream-status': attributes.moniStreamStatus }
            }
            return {}
          },
        },
      }

      return enhancedAttributes
    }
  }

  /**
   * Override the parent's configure method to enhance addAttributes
   */
  override configure(options?: Partial<Options>) {
    const configured = super.configure(options) as Node<Options, Storage>
    configured.enhanceAddAttributes()
    return configured
  }

  extend<
    ExtendedOptions = Options,
    ExtendedStorage = Storage,
    ExtendedConfig = NodeConfig<ExtendedOptions, ExtendedStorage>,
  >(extendedConfig?: Partial<ExtendedConfig> | (() => Partial<ExtendedConfig>)) {
    // If the extended config is a function, execute it to get the configuration object
    const resolvedConfig = typeof extendedConfig === 'function' ? extendedConfig() : extendedConfig
    const extended = super.extend(resolvedConfig) as Node<ExtendedOptions, ExtendedStorage>

    // Always enhance addAttributes
    extended.enhanceAddAttributes()

    return extended
  }
}
