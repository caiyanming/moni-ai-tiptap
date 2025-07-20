import { HiddenBlock } from './hidden-block.js'

export * from './hidden-block.js'

export default HiddenBlock

// 🔥 Export NULL_UUID constant for external use
export const NULL_UUID = '00000000-0000-0000-0000-000000000000'

// 🔥 Utility functions for working with NULL_UUID hidden blocks
export const HiddenBlockUtils = {
  /**
   * Check if a node is a NULL_UUID hidden block
   */
  isNullUUIDHiddenBlock: (node: any): boolean => {
    // Support both TipTap JSON format and ProseMirror Node format
    const nodeType = node?.type?.name || node?.type
    return (
      nodeType === 'hiddenBlock' &&
      node?.attrs?.hidden === true &&
      node?.attrs?.isInitialBlock === true &&
      (node?.attrs?.id === NULL_UUID || node?.attrs?.moniBlockId === NULL_UUID)
    )
  },

  /**
   * Create a NULL_UUID hidden block content object
   */
  createNullUUIDBlock: () => ({
    type: 'hiddenBlock',
    attrs: {
      id: NULL_UUID,
      moniBlockId: NULL_UUID,
      hidden: true,
      isInitialBlock: true,
      moniDragEnabled: false,
    },
    content: [],
  }),

  /**
   * Check if document content has visible blocks (non-hidden)
   */
  hasVisibleContent: (doc: any): boolean => {
    let hasVisible = false

    if (!doc?.content) {return false}

    doc.content.forEach((node: any) => {
      if (!HiddenBlockUtils.isNullUUIDHiddenBlock(node)) {
        hasVisible = true
      }
    })

    return hasVisible
  },

  /**
   * Filter out hidden blocks from document content for display
   */
  filterHiddenBlocks: (content: any): any => {
    if (!content?.content) {return content}

    const visibleContent = content.content.filter((node: any) => !HiddenBlockUtils.isNullUUIDHiddenBlock(node))

    // If no visible content, return empty paragraph for placeholder
    if (visibleContent.length === 0) {
      return {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [],
          },
        ],
      }
    }

    return { ...content, content: visibleContent }
  },

  /**
   * Restore hidden blocks to document content for saving
   */
  restoreHiddenBlocks: (editedContent: any, originalContent: any): any => {
    if (!originalContent?.content) {return editedContent}

    // Extract hidden NULL_UUID blocks from original
    const hiddenBlocks = originalContent.content.filter((node: any) => HiddenBlockUtils.isNullUUIDHiddenBlock(node))

    if (hiddenBlocks.length === 0) {return editedContent}

    // Merge hidden blocks with edited content
    return {
      ...editedContent,
      content: [...hiddenBlocks, ...(editedContent.content || [])],
    }
  },

  /**
   * Initialize empty document with NULL_UUID hidden block
   */
  initializeEmptyDocument: () => ({
    type: 'doc',
    content: [HiddenBlockUtils.createNullUUIDBlock()],
  }),
}
