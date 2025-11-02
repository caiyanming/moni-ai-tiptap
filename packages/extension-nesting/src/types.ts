/**
 * Nesting extension types
 */

import type { EditorState } from '@tiptap/pm/state'

/**
 * Options for the Nesting extension
 */
export interface NestingOptions {
  /**
   * Maximum nesting level allowed
   * @default 6
   */
  maxNestingLevel: number
}

/**
 * Nesting update for batch operations
 */
export interface NestingUpdate {
  /**
   * Block ID to update
   */
  moniBlockId: string
  /**
   * New nesting level
   */
  level: number
  /**
   * Optional parent ID
   */
  parentId?: string | null
}

/**
 * Validation result for nesting consistency
 */
export interface ValidationResult {
  /**
   * Whether the nesting structure is valid
   */
  valid: boolean
  /**
   * List of validation errors
   */
  errors: string[]
  /**
   * List of validation warnings
   */
  warnings: string[]
}

/**
 * Block hierarchy information
 */
export interface BlockHierarchy {
  /**
   * Block ID
   */
  blockId: string
  /**
   * Parent block ID (null if root)
   */
  parentId: string | null
  /**
   * Nesting level (0-based)
   */
  nestingLevel: number
  /**
   * Array of child block IDs
   */
  children: string[]
}

/**
 * Nesting storage interface
 */
export interface NestingStorage {
  /**
   * Get direct children of a parent block
   */
  getBlockChildren: (state: EditorState, parentId: string) => string[]
  /**
   * Get all descendants of a block
   */
  getBlockDescendants: (state: EditorState, blockId: string) => string[]
  /**
   * Validate nesting structure consistency
   */
  validateNestingConsistency: (state: EditorState) => ValidationResult
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    nesting: {
      /**
       * Update the nesting level of a block
       */
      updateNestingLevel: (moniBlockId: string, level: number) => ReturnType
      /**
       * Set the parent of a block
       */
      setBlockParent: (moniBlockId: string, parentId: string | null) => ReturnType
      /**
       * Batch update nesting for multiple blocks
       */
      batchUpdateNesting: (updates: NestingUpdate[]) => ReturnType
      /**
       * Recalculate all nesting levels
       */
      recalculateAllNesting: () => ReturnType
      /**
       * Fix nesting inconsistencies
       */
      fixNestingInconsistency: () => ReturnType
    }
  }
}
