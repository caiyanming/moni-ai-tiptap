import { FileChildrenBlock } from './file-children-block.js'
import { NULL_UUID } from './types.js'

export * from './file-children-block.js'
export * from './types.js'

export default FileChildrenBlock

// Constants for external use
export { NULL_UUID }

// Utility functions
export const FileChildrenBlockUtils = {
  /**
   * Check if a node is a file children block
   */
  isFileChildrenBlock: (node: any): boolean => {
    const nodeType = node?.type?.name || node?.type
    return nodeType === 'fileChildrenBlock'
  },

  /**
   * Check if a node is the NULL_UUID file children block
   */
  isNullUUIDFileChildrenBlock: (node: any): boolean => {
    return (
      FileChildrenBlockUtils.isFileChildrenBlock(node) &&
      (node?.attrs?.id === NULL_UUID || node?.attrs?.moniBlockId === NULL_UUID)
    )
  },

  /**
   * Create a file children block content object
   */
  createFileChildrenBlock: (attrs?: Partial<any>) => ({
    type: 'fileChildrenBlock',
    attrs: {
      id: NULL_UUID,
      moniBlockId: NULL_UUID,
      collapsed: true,
      displayMode: 'list',
      moniDragEnabled: false,
      ...attrs,
    },
  }),
}
