import type { Node as PMNode } from '@tiptap/pm/model'
import type { KatexOptions } from 'katex'

/**
 * Configuration options for the Chemistry extension.
 */
export interface ChemistryOptions {
  /**
   * KaTeX specific options with mhchem support
   * @see https://katex.org/docs/options.html
   * @see https://github.com/mhchem/MathJax-mhchem
   * @example
   * ```ts
   * katexOptions: {
   *   displayMode: false,
   *   throwOnError: false,
   *   trust: true, // Required for mhchem
   *   macros: {
   *     '\\ce': '\\ce',
   *     '\\pu': '\\pu'
   *   }
   * }
   * ```
   */
  katexOptions?: KatexOptions

  /**
   * Optional click handler for chemistry nodes.
   * Called when a user clicks on a chemistry expression in the editor.
   *
   * @param node - The ProseMirror node representing the chemistry element
   * @param pos - The position of the node within the document
   * @example
   * ```ts
   * onClick: (node, pos) => {
   *   console.log('Chemistry clicked:', node.attrs.chemical, 'at position:', pos)
   * }
   * ```
   */
  onClick?: (node: PMNode, pos: number) => void
}

/**
 * Configuration options for the InlineChemical extension.
 */
export interface InlineChemicalOptions extends ChemistryOptions {}

/**
 * Configuration options for the BlockChemical extension.
 */
export interface BlockChemicalOptions extends ChemistryOptions {}

/**
 * Supported chemistry formula types
 */
export type ChemistryType = 'formula' | 'reaction' | 'units'

/**
 * Chemistry formula render result
 */
export interface ChemistryRenderResult {
  success: boolean
  html?: string
  error?: string
  fallback: string
}
