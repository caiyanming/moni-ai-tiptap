import { HiddenBlock } from './hidden-block.js'
import type { HiddenBlockAttributes } from './types.js'
import { DEFAULT_HIDDEN_BLOCK_ATTRS,NULL_UUID } from './types.js'

export * from './hidden-block.js'
export * from './types.js'

export default HiddenBlock

// Constants for external use
export { DEFAULT_HIDDEN_BLOCK_ATTRS,NULL_UUID }

// Utility functions
export const HiddenBlockUtils = {
  /**
   * Check if a node is a hidden block
   */
  isHiddenBlock(node: any): boolean {
    const nodeType = node?.type?.name || node?.type
    return nodeType === 'hiddenBlock'
  },

  /**
   * Check if a node is the NULL_UUID hidden block (the anchor point)
   */
  isNullUUIDHiddenBlock(node: any): boolean {
    return (
      HiddenBlockUtils.isHiddenBlock(node) && (node?.attrs?.id === NULL_UUID || node?.attrs?.moniBlockId === NULL_UUID)
    )
  },

  /**
   * Create a hidden block content object for JSON operations
   */
  createHiddenBlock(attrs?: Partial<HiddenBlockAttributes>) {
    return {
      type: 'hiddenBlock',
      attrs: {
        ...DEFAULT_HIDDEN_BLOCK_ATTRS,
        ...attrs,
      },
    }
  },

  /**
   * Filter out hidden blocks from content (for export/display)
   */
  filterHiddenBlocks(content: any[]): any[] {
    return content.filter((node: any) => node.type !== 'hiddenBlock')
  },

  /**
   * Restore hidden block to content (for import)
   */
  restoreHiddenBlock(content: any[]): any[] {
    const hasHiddenBlock = content.length > 0 && content[0]?.type === 'hiddenBlock'

    if (hasHiddenBlock) {
      return content
    }

    return [HiddenBlockUtils.createHiddenBlock(), ...content]
  },
}
