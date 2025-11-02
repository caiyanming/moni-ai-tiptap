/**
 * Build block hierarchy from document
 */

import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

import type { BlockHierarchy } from '../types'

/**
 * Container types that should NOT be treated as blocks
 *
 * These types follow Notion's block philosophy:
 * - bulletList/orderedList: Containers, not blocks (only listItem is a block)
 * - table: Container for table structure (tableRow/tableCell are the blocks)
 *
 * Even if legacy data has blockIds on these containers, we filter them out here.
 */
const IGNORED_CONTAINER_TYPES = new Set(['bulletList', 'orderedList', 'table'])

/**
 * Get node's parent ID
 */
function getNodeParentId(node: ProseMirrorNode): string | null {
  const parentId = node.attrs?.moniParentId
  return parentId ?? null
}

/**
 * Build block hierarchy map from document
 *
 * This function constructs a hierarchical structure of blocks by:
 * 1. Collecting all blocks with moniBlockId (filtering out containers)
 * 2. Building parent-child relationships
 * 3. Calculating nesting levels using BFS
 */
export function buildBlockHierarchy(doc: ProseMirrorNode): Map<string, BlockHierarchy> {
  const hierarchy = new Map<string, BlockHierarchy>()

  // Step 1: Collect all blocks (skip containers)
  doc.descendants(node => {
    const blockId = node.attrs.moniBlockId

    // Filter out container types even if they have blockIds (legacy data)
    if (blockId && !IGNORED_CONTAINER_TYPES.has(node.type.name)) {
      hierarchy.set(blockId, {
        blockId,
        parentId: getNodeParentId(node),
        nestingLevel: 0,
        children: [],
      })
    }
    return true
  })

  // Step 2: Build parent-child relationships
  hierarchy.forEach(block => {
    if (block.parentId) {
      const parent = hierarchy.get(block.parentId)
      if (parent) {
        parent.children.push(block.blockId)
      }
    }
  })

  // Step 3: Calculate nesting levels using BFS
  const visited = new Set<string>()
  const queue: BlockHierarchy[] = []

  // Start with root blocks (no parent or parent not in hierarchy)
  hierarchy.forEach(block => {
    if (!block.parentId || !hierarchy.has(block.parentId)) {
      block.nestingLevel = 0
      queue.push(block)
      visited.add(block.blockId)
    }
  })

  // BFS to calculate levels
  while (queue.length > 0) {
    const current = queue.shift()!

    current.children.forEach(childId => {
      const child = hierarchy.get(childId)
      if (!child) {
        return
      }

      const computedLevel = current.nestingLevel + 1

      if (child.nestingLevel !== computedLevel) {
        child.nestingLevel = computedLevel
      }

      if (!visited.has(childId)) {
        queue.push(child)
        visited.add(childId)
      }
    })
  }

  return hierarchy
}
