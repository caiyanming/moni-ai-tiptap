/**
 * @tiptap/extension-nesting
 *
 * Block-level nesting management extension for TipTap
 */

export { Nesting } from './nesting.js'
export type { BlockHierarchy, NestingOptions, NestingStorage,NestingUpdate, ValidationResult } from './types.js'
export {
  buildBlockHierarchy,
  getBlockChildren,
  getBlockDescendants,
  validateNestingConsistency,
} from './utils/index.js'
