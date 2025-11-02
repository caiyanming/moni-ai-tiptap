/**
 * Validation utilities for nesting consistency
 */

import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { EditorState } from '@tiptap/pm/state'

import type { ValidationResult } from '../types.js'
import { buildBlockHierarchy } from './buildHierarchy.js'

/**
 * Get node's parent ID
 */
function getNodeParentId(node: ProseMirrorNode): string | null {
  const parentId = node.attrs?.moniParentId
  return parentId ?? null
}

/**
 * Get node's nesting level
 */
function getNodeLevel(node: ProseMirrorNode): number {
  const level = node.attrs?.moniLevel
  return typeof level === 'number' ? level : 0
}

/**
 * Validate nesting structure consistency
 *
 * Checks that:
 * 1. Nesting levels match the calculated hierarchy
 * 2. Parent relationships are consistent
 *
 * @param state - Editor state
 * @returns Validation result with errors and warnings
 */
export function validateNestingConsistency(state: EditorState): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  }

  const blockHierarchy = buildBlockHierarchy(state.doc)

  state.doc.descendants((node: ProseMirrorNode) => {
    if (node.attrs.moniBlockId) {
      const hierarchy = blockHierarchy.get(node.attrs.moniBlockId)
      if (hierarchy) {
        // Check level consistency
        if (getNodeLevel(node) !== hierarchy.nestingLevel) {
          result.valid = false
          result.errors.push(
            `Block ${node.attrs.moniBlockId} has inconsistent nesting level: expected ${hierarchy.nestingLevel}, actual ${getNodeLevel(node)}`,
          )
        }

        // Check parent relationship consistency
        if (getNodeParentId(node) !== hierarchy.parentId) {
          result.valid = false
          result.errors.push(
            `Block ${node.attrs.moniBlockId} has inconsistent parent relationship: expected ${hierarchy.parentId}, actual ${getNodeParentId(node)}`,
          )
        }
      }
    }
    return true
  })

  return result
}
