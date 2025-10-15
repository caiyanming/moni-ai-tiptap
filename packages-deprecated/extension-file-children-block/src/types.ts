export interface FileChildrenBlockOptions {
  /**
   * HTML attributes for the file children block
   * @default {}
   */
  HTMLAttributes: Record<string, any>

  /**
   * NULL_UUID constant for AI targeting
   * @default '13814000-1dd2-11b2-8080-808080808080'
   */
  nullUUID: string
}

export interface FileChildrenBlockAttributes {
  /**
   * Core identity: fixed NULL_UUID for AI targeting
   */
  id: string

  /**
   * Moni system block ID (compatibility)
   */
  moniBlockId: string

  /**
   * UI state: collapse/expand children list
   */
  collapsed: boolean

  /**
   * UI state: display mode for children
   */
  displayMode: 'list' | 'grid' | 'cards'

  /**
   * Moni system: drag disabled for this block
   */
  moniDragEnabled: boolean
}

export type DisplayMode = 'list' | 'grid' | 'cards'

export const NULL_UUID = '13814000-1dd2-11b2-8080-808080808080'
