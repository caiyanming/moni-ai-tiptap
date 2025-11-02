/**
 * Query utilities for block hierarchy
 */

import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { EditorState } from '@tiptap/pm/state'

/**
 * Get node's parent ID
 */
function getNodeParentId(node: ProseMirrorNode): string | null {
  const parentId = node.attrs?.moniParentId
  return parentId ?? null
}

/**
 * Get direct children of a block
 *
 * @param parentId - Parent block ID
 * @param state - Editor state
 * @returns Array of child block IDs
 */
export function getBlockChildren(parentId: string, state: EditorState): string[] {
  const children: string[] = []

  state.doc.descendants((node: ProseMirrorNode) => {
    if (getNodeParentId(node) === parentId && node.attrs.moniBlockId) {
      children.push(node.attrs.moniBlockId)
    }
    return true
  })

  return children
}

/**
 * Get all descendants of a block (recursive)
 *
 * @param blockId - Block ID
 * @param state - Editor state
 * @returns Array of descendant block IDs
 */
export function getBlockDescendants(blockId: string, state: EditorState): string[] {
  const descendants: string[] = []
  const visited = new Set<string>()

  function findDescendants(currentId: string): void {
    if (visited.has(currentId)) {
      return // Prevent infinite loops from circular references
    }
    visited.add(currentId)

    state.doc.descendants((node: ProseMirrorNode) => {
      if (getNodeParentId(node) === currentId && node.attrs.moniBlockId) {
        descendants.push(node.attrs.moniBlockId)
        findDescendants(node.attrs.moniBlockId)
      }
      return true
    })
  }

  findDescendants(blockId)
  return descendants
}
