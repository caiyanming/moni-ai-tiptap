/**
 * @tiptap/constants - Shared constants and utilities for TipTap extensions
 */

// 🔥 NULL_UUID constant for hidden blocks and AI operations
export const NULL_UUID = '00000000-0000-0000-0000-000000000000'

// 🔥 Block-related constants
export const BLOCK_CONSTANTS = {
  NULL_UUID,

  // Default block attributes
  DEFAULT_BLOCK_ATTRS: {
    hidden: false,
    isInitialBlock: false,
    moniDragEnabled: true,
    moniLevel: 0,
  },

  // Hidden block specific attributes
  HIDDEN_BLOCK_ATTRS: {
    id: NULL_UUID,
    moniBlockId: NULL_UUID,
    hidden: true,
    isInitialBlock: true,
    moniDragEnabled: false,
    moniLevel: 0,
  },
} as const

// 🔥 Stream operation constants
export const STREAM_CONSTANTS = {
  OPERATION_TYPES: {
    UPDATE: 'update',
    INSERT_AFTER: 'insert_after',
    INSERT_BEFORE: 'insert_before',
    DELETE: 'delete',
    SPLIT: 'split',
    MERGE: 'merge',
  },

  STREAM_MODES: {
    REPLACE: 'replace',
    APPEND: 'append',
    PREPEND: 'prepend',
  },

  STREAM_TYPES: {
    TEXT: 'text',
    BLOCK: 'block',
    LIST: 'list',
    TABLE: 'table',
  },
} as const

// 🔥 Drag system constants
export const DRAG_CONSTANTS = {
  DRAG_TYPES: {
    BLOCK: 'block',
    LIST_ITEM: 'list-item',
    TABLE_ROW: 'table-row',
  },

  DRAG_HANDLE_SELECTORS: {
    BLOCK: '[data-moni-drag-handle="true"]',
    ENABLED: '[data-moni-drag-enabled="true"]',
    DISABLED: '[data-moni-drag-enabled="false"]',
  },
} as const

// 🔥 Attribute constants for consistency across extensions
export const ATTR_CONSTANTS = {
  // Block identification
  BLOCK_ID: 'moniBlockId',
  PARENT_ID: 'moniParentId',
  LEVEL: 'moniLevel',

  // Drag system
  DRAG_ENABLED: 'moniDragEnabled',
  DRAG_HANDLE: 'moniDragHandle',
  DRAG_TYPE: 'moniDragType',
  NESTABLE: 'moniNestable',

  // Stream system
  STREAM_TYPE: 'moniStreamType',
  STREAM_MODE: 'moniStreamMode',

  // Hidden block system
  HIDDEN: 'hidden',
  INITIAL_BLOCK: 'isInitialBlock',
} as const

// 🔥 CSS class constants
export const CSS_CONSTANTS = {
  HIDDEN_BLOCK: 'moni-hidden-block',
  DRAG_HANDLE: 'moni-drag-handle',
  DRAGGING: 'moni-dragging',
  DROP_TARGET: 'moni-drop-target',
  STREAM_ACTIVE: 'moni-stream-active',
} as const

// 🔥 Event constants
export const EVENT_CONSTANTS = {
  BLOCK_CREATED: 'moni:block:created',
  BLOCK_UPDATED: 'moni:block:updated',
  BLOCK_DELETED: 'moni:block:deleted',
  DRAG_START: 'moni:drag:start',
  DRAG_END: 'moni:drag:end',
  STREAM_START: 'moni:stream:start',
  STREAM_END: 'moni:stream:end',
} as const

// 🔥 Type definitions for better TypeScript support
export type BlockOperationType = keyof typeof STREAM_CONSTANTS.OPERATION_TYPES
export type StreamMode = keyof typeof STREAM_CONSTANTS.STREAM_MODES
export type StreamType = keyof typeof STREAM_CONSTANTS.STREAM_TYPES
export type DragType = keyof typeof DRAG_CONSTANTS.DRAG_TYPES

// 🔥 Utility functions
export const UTILS = {
  /**
   * Check if a UUID is the NULL_UUID
   */
  isNullUUID: (uuid: string): boolean => uuid === NULL_UUID,

  /**
   * Generate a NULL_UUID hidden block attrs
   */
  createHiddenBlockAttrs: () => ({ ...BLOCK_CONSTANTS.HIDDEN_BLOCK_ATTRS }),

  /**
   * Check if attributes represent a hidden block
   */
  isHiddenBlock: (attrs: Record<string, any>): boolean =>
    attrs?.[ATTR_CONSTANTS.HIDDEN] === true && attrs?.[ATTR_CONSTANTS.INITIAL_BLOCK] === true,

  /**
   * Check if attributes represent a NULL_UUID hidden block
   */
  isNullUUIDHiddenBlock: (attrs: Record<string, any>): boolean =>
    UTILS.isHiddenBlock(attrs) && (UTILS.isNullUUID(attrs?.id) || UTILS.isNullUUID(attrs?.[ATTR_CONSTANTS.BLOCK_ID])),
}
