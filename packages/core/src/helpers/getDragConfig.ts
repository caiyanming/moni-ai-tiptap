import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

// 🔥 Drag type constants (inline to avoid circular dependency with @tiptap/constants)
const DRAG_TYPES = {
  BLOCK: 'block',
  LIST_ITEM: 'list-item',
  TABLE_ROW: 'table-row',
} as const

export type DragTypeValue = (typeof DRAG_TYPES)[keyof typeof DRAG_TYPES]

export interface DragConfig {
  /**
   * Semantic drag type (e.g., block, list-item)
   */
  dragType: DragTypeValue

  /**
   * Whether the node can act as a nesting target
   */
  nestable: boolean

  /**
   * List of drag types that this node accepts as nested children
   */
  canNestIn: DragTypeValue[]

  /**
   * Maximum nesting depth allowed under this node.
   * 0 = unlimited depth (while nestable remains true)
   */
  maxNestLevel: number
}

const DEFAULT_DRAG_CONFIG: DragConfig = {
  dragType: DRAG_TYPES.BLOCK,
  nestable: false,
  canNestIn: [],
  maxNestLevel: 0,
}

const dragConfigRegistry = new Map<string, DragConfig>()

/**
 * Register or override drag config for a node type.
 */
export function defineDragConfig(typeName: string, config: Partial<DragConfig>) {
  dragConfigRegistry.set(typeName, {
    ...DEFAULT_DRAG_CONFIG,
    ...(dragConfigRegistry.get(typeName) ?? {}),
    ...config,
  })
}

/**
 * Retrieve drag configuration for a node or type name.
 */
export function getDragConfig(nodeOrType?: ProseMirrorNode | string | null): DragConfig {
  let typeName: string | null = null

  if (typeof nodeOrType === 'string') {
    typeName = nodeOrType
  } else if (nodeOrType && 'type' in nodeOrType) {
    typeName = nodeOrType.type.name
  }

  if (!typeName) {
    return { ...DEFAULT_DRAG_CONFIG }
  }

  return dragConfigRegistry.get(typeName) ?? { ...DEFAULT_DRAG_CONFIG }
}

// Register default configs
function registerDefaultConfigs() {
  const defaults: Record<string, Partial<DragConfig>> = {
    listItem: {
      dragType: DRAG_TYPES.LIST_ITEM,
      nestable: true,
      canNestIn: [DRAG_TYPES.LIST_ITEM],
      maxNestLevel: 6,
    },
  }

  Object.entries(defaults).forEach(([typeName, config]) => {
    defineDragConfig(typeName, config)
  })
}

registerDefaultConfigs()
