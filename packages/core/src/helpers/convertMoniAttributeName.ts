/**
 * Convert camelCase moni attribute names to proper kebab-case HTML data attributes
 *
 * @param attributeName The attribute name to convert
 * @returns Converted attribute name
 *
 * @example
 * ```typescript
 * convertMoniAttributeName('moniBlockId') // 'data-moni-block-id'
 * convertMoniAttributeName('moniParentId') // 'data-moni-parent-id'
 * convertMoniAttributeName('id') // 'id' (non-moni attributes unchanged)
 * ```
 */
export function convertMoniAttributeName(attributeName: string): string {
  // Only process moni-prefixed attributes
  if (!attributeName.startsWith('moni')) {
    return attributeName
  }

  // Convert camelCase to kebab-case and add data- prefix
  const kebabCase = attributeName.replace(/([A-Z])/g, '-$1').toLowerCase()

  return `data-${kebabCase}`
}
