import katex, { type KatexOptions } from 'katex'

import type { ChemistryRenderResult } from './types.js'

/**
 * Default KaTeX options for chemistry rendering with mhchem support
 */
export const defaultChemistryKatexOptions: KatexOptions = {
  displayMode: false,
  throwOnError: false,
  trust: true, // Required for mhchem extension
  strict: false,
  macros: {
    '\\ce': '\\ce',
    '\\pu': '\\pu',
  },
}

/**
 * Checks if a string contains chemistry-specific syntax
 * @param input The input string to check
 * @returns True if the input contains chemistry syntax
 */
export function isChemistryFormula(input: string): boolean {
  // Skip if it looks like pure math formulas
  if (
    /\\(frac|int|sum|lim|sqrt|left|right|begin|end)|[xyz]\^\d*\s*[=+]|[∫∑√]/i.test(input) &&
    !/[A-Z][a-z]?\d*/.test(input)
  ) {
    return false
  }

  // Check for explicit mhchem commands first
  if (/\\(ce|pu)\{[^}]+\}/.test(input)) {
    return true
  }

  // Chemistry patterns with different weights
  const strongPatterns = [
    /->/g, // Reaction arrows
    /<->/g, // Reversible reaction arrows
    /<=>/g, // Equilibrium arrows
    /→|←|↔|⇌/g, // Unicode arrows
    /\((l|s|g|aq)\)/, // State symbols (l), (s), (g), (aq)
    /\b\d+(\.\d+)?(e\d+)?\s*(°C|°F|K|atm|Pa|kPa|MPa|bar|torr|mmHg|cal|J|kJ|eV|mol|L|mL|g|kg)(\b|\/|\^-?\d*)/i, // Physical units
  ]

  const mediumPatterns = [
    /[A-Z][a-z]?\d*/, // Chemical elements with/without subscripts (H, H2O, CaCl2)
    /[A-Z][a-z]?\d*[+-]/, // Ions like Na+, Cl-, Ca2+
    /\([A-Z][a-z\d)]+\)\d*/, // Parentheses groups like (OH)2, (NH4)2CO3
    /\^[+-]\d*/, // Charges like ^2+, ^3-
    /\s\^\s/, // Gas evolution symbol
    /\sv\s/, // Precipitation symbol
  ]

  // Check for strong patterns (single match is enough)
  if (strongPatterns.some(pattern => pattern.test(input))) {
    return true
  }

  // For medium patterns, need at least one match
  return mediumPatterns.some(pattern => pattern.test(input))
}

/**
 * Wraps chemistry formula with appropriate mhchem command if not already wrapped
 * @param input The input chemistry formula
 * @returns The wrapped formula
 */
export function wrapChemistryFormula(input: string): string {
  // If already wrapped, return as is
  if (input.startsWith('\\ce{') || input.startsWith('\\pu{')) {
    return input
  }

  // If contains unit patterns, wrap with \pu
  if (
    /\b\d+(\.\d+)?(e\d+)?\s*(°C|K|atm|Pa|kPa|MPa|bar|torr|mmHg|cal|J|kJ|eV|Wh|kWh|g|kg|mol|L|mL)(\b|\/|\^-?\d*)/i.test(
      input,
    )
  ) {
    return `\\pu{${input}}`
  }

  // Default to \ce for chemical formulas
  return `\\ce{${input}}`
}

/**
 * Renders chemistry formula using KaTeX with mhchem extension
 * @param chemical The chemistry formula to render
 * @param options KaTeX options
 * @returns Render result with success status and HTML or error message
 */
export function renderChemistry(chemical: string, options: KatexOptions = {}): ChemistryRenderResult {
  if (!chemical.trim()) {
    return {
      success: false,
      error: 'Empty chemistry formula',
      fallback: chemical,
    }
  }

  const mergedOptions: KatexOptions = {
    ...defaultChemistryKatexOptions,
    ...options,
  }

  try {
    // Try to render with mhchem
    const wrappedFormula = wrapChemistryFormula(chemical)
    const html = katex.renderToString(wrappedFormula, mergedOptions)

    return {
      success: true,
      html,
      fallback: chemical,
    }
  } catch (mhchemError) {
    // If throwOnError is true, don't try fallbacks
    if (mergedOptions.throwOnError) {
      throw mhchemError
    }

    try {
      // Fallback: try to render as regular math
      const html = katex.renderToString(chemical, mergedOptions)

      return {
        success: true,
        html,
        fallback: chemical,
      }
    } catch (mathError) {
      // Final fallback: return as plain text
      return {
        success: false,
        error: `Chemistry render failed: ${mathError instanceof Error ? mathError.message : String(mathError)}`,
        fallback: chemical,
      }
    }
  }
}

/**
 * Validates chemistry formula syntax
 * @param chemical The chemistry formula to validate
 * @returns True if the formula is valid
 */
export function validateChemistryFormula(chemical: string): boolean {
  if (!chemical.trim()) {
    return false
  }

  // Check for obvious syntax errors
  if (
    chemical.includes('\\invalid') ||
    (chemical.startsWith('\\ce{') && !chemical.endsWith('}')) ||
    (chemical.startsWith('\\pu{') && !chemical.endsWith('}'))
  ) {
    return false
  }

  try {
    // Try to render with error throwing enabled
    const result = renderChemistry(chemical, { throwOnError: true })
    return result.success
  } catch {
    return false
  }
}

/**
 * Extracts chemistry formulas from text
 * @param text The text to search
 * @returns Array of found chemistry formulas
 */
export function extractChemistryFormulas(text: string): string[] {
  const formulas: string[] = []

  // Extract \ce{...} patterns
  const ceMatches = text.match(/\\ce\{[^}]+\}/g)
  if (ceMatches) {
    formulas.push(...ceMatches)
  }

  // Extract \pu{...} patterns
  const puMatches = text.match(/\\pu\{[^}]+\}/g)
  if (puMatches) {
    formulas.push(...puMatches)
  }

  return formulas
}

/**
 * Converts LaTeX math to chemistry format if applicable
 * @param latex The LaTeX formula
 * @returns Chemistry formula or original LaTeX
 */
export function mathToChemistry(latex: string): string {
  // If it's already chemistry, return as is
  if (latex.startsWith('\\ce{') || latex.startsWith('\\pu{')) {
    return latex
  }

  // Check if it looks like chemistry
  if (isChemistryFormula(latex)) {
    return wrapChemistryFormula(latex)
  }

  return latex
}
