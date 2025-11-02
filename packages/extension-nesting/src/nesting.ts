/**
 * Nesting Extension - Block-level nesting management
 *
 * Features:
 * - Nesting level calculation and updates
 * - Parent-child relationship management
 * - Batch operations
 * - Consistency validation
 */

import { Extension } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { EditorState } from '@tiptap/pm/state'

import type { NestingOptions, NestingUpdate, ValidationResult } from './types.js'
import { buildBlockHierarchy } from './utils/buildHierarchy.js'
import { getBlockChildren, getBlockDescendants } from './utils/queries.js'
import { validateNestingConsistency } from './utils/validation.js'

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
 * Calculate nesting level based on parent ID
 */
function calculateLevelByParentId(parentId: string, state: EditorState, maxLevel: number): number {
  let level = 0

  state.doc.descendants((node: ProseMirrorNode) => {
    if (node.attrs.moniBlockId === parentId) {
      level = getNodeLevel(node) + 1
      return false
    }
    return true
  })

  return Math.min(level, maxLevel)
}

/**
 * Nesting Extension
 */
export const Nesting = Extension.create<NestingOptions>({
  name: 'nesting',

  addOptions() {
    return {
      maxNestingLevel: 6,
    }
  },

  addCommands() {
    return {
      /**
       * Update block nesting level
       */
      updateNestingLevel:
        (blockId: string, level: number) =>
        ({ tr, state }) => {
          const clampedLevel = Math.max(0, Math.min(level, this.options.maxNestingLevel))
          let found = false

          state.doc.descendants((node: ProseMirrorNode, pos: number) => {
            if (node.attrs.moniBlockId === blockId) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                moniLevel: clampedLevel,
              })
              found = true
              return false
            }
            return true
          })

          return found
        },

      /**
       * Set block parent
       */
      setBlockParent:
        (blockId: string, parentId: string | null) =>
        ({ tr, state }) => {
          let found = false

          state.doc.descendants((node: ProseMirrorNode, pos: number) => {
            if (node.attrs.moniBlockId === blockId) {
              const newLevel = parentId ? calculateLevelByParentId(parentId, state, this.options.maxNestingLevel) : 0
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                moniParentId: parentId,
                moniLevel: newLevel,
              })
              found = true
              return false
            }
            return true
          })

          return found
        },

      /**
       * Batch update nesting
       */
      batchUpdateNesting:
        (updates: NestingUpdate[]) =>
        ({ tr, state }) => {
          updates.forEach(({ moniBlockId, level, parentId }) => {
            state.doc.descendants((node: ProseMirrorNode, pos: number) => {
              if (node.attrs.moniBlockId === moniBlockId) {
                const clampedLevel = Math.max(0, Math.min(level, this.options.maxNestingLevel))
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  moniLevel: clampedLevel,
                  moniParentId: parentId ?? getNodeParentId(node),
                })
                return false
              }
              return true
            })
          })

          return true
        },

      /**
       * Recalculate all nesting levels
       */
      recalculateAllNesting:
        () =>
        ({ tr, state }) => {
          const blockHierarchy = buildBlockHierarchy(state.doc)

          state.doc.descendants((node: ProseMirrorNode, pos: number) => {
            if (node.attrs.moniBlockId) {
              const hierarchy = blockHierarchy.get(node.attrs.moniBlockId)
              if (hierarchy) {
                tr.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  moniLevel: hierarchy.nestingLevel,
                  moniParentId: hierarchy.parentId,
                })
              }
            }
            return true
          })

          return true
        },

      /**
       * Fix nesting inconsistency
       */
      fixNestingInconsistency:
        () =>
        ({ tr, state }) => {
          const blockHierarchy = buildBlockHierarchy(state.doc)
          let fixCount = 0

          state.doc.descendants((node: ProseMirrorNode, pos: number) => {
            if (node.attrs.moniBlockId) {
              const hierarchy = blockHierarchy.get(node.attrs.moniBlockId)
              if (hierarchy) {
                const needsUpdate =
                  getNodeLevel(node) !== hierarchy.nestingLevel || getNodeParentId(node) !== hierarchy.parentId

                if (needsUpdate) {
                  tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    moniLevel: hierarchy.nestingLevel,
                    moniParentId: hierarchy.parentId,
                  })
                  fixCount += 1
                }
              }
            }
            return true
          })

          return fixCount > 0
        },
    }
  },

  addStorage() {
    return {
      getBlockChildren: (state: EditorState, parentId: string): string[] => {
        return getBlockChildren(parentId, state)
      },

      getBlockDescendants: (state: EditorState, blockId: string): string[] => {
        return getBlockDescendants(blockId, state)
      },

      validateNestingConsistency: (state: EditorState): ValidationResult => {
        return validateNestingConsistency(state)
      },
    }
  },
})
