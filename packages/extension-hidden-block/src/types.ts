/**
 * NULL_UUID constant - The permanent anchor point identifier
 * This UUID is reserved for the hidden block that serves as the AI insertion anchor
 */
export const NULL_UUID = '13814000-1dd2-11b2-8080-808080808080'

/**
 * Attributes for the hidden block node
 */
export interface HiddenBlockAttributes {
  /**
   * Block ID - Always set to NULL_UUID
   */
  id: string

  /**
   * Moni block ID - Always set to NULL_UUID for the anchor point
   */
  moniBlockId: string

  /**
   * Hidden flag - Always true to prevent rendering
   */
  hidden: boolean

  /**
   * Initial block flag - Marks this as the document's anchor point
   */
  isInitialBlock: boolean

  // 🔥 Runtime attributes like moniDragEnabled are now managed via editor.storage.runtimeState
}

/**
 * Default attributes for the hidden block
 * These values are enforced by the guardian plugin
 */
export const DEFAULT_HIDDEN_BLOCK_ATTRS: HiddenBlockAttributes = {
  id: NULL_UUID,
  moniBlockId: NULL_UUID,
  hidden: true,
  isInitialBlock: true,
}
