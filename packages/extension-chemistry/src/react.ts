// @ts-ignore: React import issues will be handled at runtime
import { ReactNodeViewRenderer } from '@tiptap/react'

/**
 * React Node View Renderer for Inline Chemical Formula
 *
 * @example
 * ```typescript
 * import { InlineChemical } from '@tiptap/extension-chemistry'
 * import { InlineChemicalReactRenderer } from '@tiptap/extension-chemistry/react'
 *
 * const editor = new Editor({
 *   extensions: [
 *     InlineChemical.extend({
 *       addNodeView() {
 *         return InlineChemicalReactRenderer
 *       }
 *     })
 *   ]
 * })
 * ```
 */
export const InlineChemicalReactRenderer = (() => {
  try {
    const { InlineChemicalFormulaComponent } = require('./ChemicalFormulaComponent.js')

    return ReactNodeViewRenderer(InlineChemicalFormulaComponent, {
      as: 'span',
      className: 'tiptap-chemistry-render inline-chemistry',
      // @ts-ignore: Type complexity
      attrs: (node: any) => ({
        'data-type': 'inline-chemical',
        'data-chemical': node.attrs.chemical,
        'data-moni-block-id': node.attrs.moniBlockId || undefined,
        'data-moni-parent-id': node.attrs.moniParentId || undefined,
        'data-moni-level': node.attrs.moniLevel !== 0 ? node.attrs.moniLevel : undefined,
        'data-moni-drag-enabled': node.attrs.moniDragEnabled === true ? 'true' : undefined,
        'data-moni-drag-handle': node.attrs.moniDragHandle === true ? 'true' : undefined,
        'data-moni-nestable': node.attrs.moniNestable === true ? 'true' : undefined,
        'data-moni-drag-type': node.attrs.moniDragType !== 'inline' ? node.attrs.moniDragType : undefined,
        'data-moni-stream-type':
          node.attrs.moniStreamType !== 'inline-chemistry' ? node.attrs.moniStreamType : undefined,
        'data-moni-stream-mode': node.attrs.moniStreamMode !== 'replace' ? node.attrs.moniStreamMode : undefined,
      }),
    })
  } catch {
    console.warn('React support not available for Chemistry Extension')
    return null
  }
})()

/**
 * React Node View Renderer for Block Chemical Formula
 *
 * @example
 * ```typescript
 * import { BlockChemical } from '@tiptap/extension-chemistry'
 * import { BlockChemicalReactRenderer } from '@tiptap/extension-chemistry/react'
 *
 * const editor = new Editor({
 *   extensions: [
 *     BlockChemical.extend({
 *       addNodeView() {
 *         return BlockChemicalReactRenderer
 *       }
 *     })
 *   ]
 * })
 * ```
 */
export const BlockChemicalReactRenderer = (() => {
  try {
    const { BlockChemicalFormulaComponent } = require('./ChemicalFormulaComponent.js')

    return ReactNodeViewRenderer(BlockChemicalFormulaComponent, {
      as: 'div',
      className: 'tiptap-chemistry-render block-chemistry',
      // @ts-ignore: Type complexity
      attrs: (node: any) => ({
        'data-type': 'block-chemical',
        'data-chemical': node.attrs.chemical,
        'data-moni-block-id': node.attrs.moniBlockId || undefined,
        'data-moni-parent-id': node.attrs.moniParentId || undefined,
        'data-moni-level': node.attrs.moniLevel !== 0 ? node.attrs.moniLevel : undefined,
        'data-moni-drag-enabled': node.attrs.moniDragEnabled === false ? 'false' : undefined,
        'data-moni-drag-handle': node.attrs.moniDragHandle === false ? 'false' : undefined,
        'data-moni-nestable': node.attrs.moniNestable === true ? 'true' : undefined,
        'data-moni-drag-type': node.attrs.moniDragType !== 'block' ? node.attrs.moniDragType : undefined,
        'data-moni-stream-type': node.attrs.moniStreamType !== 'chemistry' ? node.attrs.moniStreamType : undefined,
        'data-moni-stream-mode': node.attrs.moniStreamMode !== 'replace' ? node.attrs.moniStreamMode : undefined,
      }),
    })
  } catch {
    console.warn('React support not available for Chemistry Extension')
    return null
  }
})()

/**
 * Creates InlineChemical extension with React node view
 */
export function createInlineChemicalWithReact(options?: any) {
  // Dynamic import to avoid circular dependencies
  const { InlineChemical } = require('./extensions/InlineChemical.js')

  return InlineChemical.extend({
    addNodeView() {
      return InlineChemicalReactRenderer
    },
  }).configure(options)
}

/**
 * Creates BlockChemical extension with React node view
 */
export function createBlockChemicalWithReact(options?: any) {
  // Dynamic import to avoid circular dependencies
  const { BlockChemical } = require('./extensions/BlockChemical.js')

  return BlockChemical.extend({
    addNodeView() {
      return BlockChemicalReactRenderer
    },
  }).configure(options)
}

/**
 * Creates Chemistry extension with React node views for both inline and block
 */
export function createChemistryWithReact(options?: any) {
  return [createInlineChemicalWithReact(options), createBlockChemicalWithReact(options)]
}

// Re-export React components for direct use
export {
  BlockChemicalFormulaComponent,
  ChemicalFormulaComponent,
  InlineChemicalFormulaComponent,
} from './ChemicalFormulaComponent.js'
