/**
 * Generates a unique moniBlockId for blocks.
 * This replaces the centralized UniqueID extension with distributed generation.
 */
export function generateMoniBlockId(): string {
  return `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Adds moniBlockId to node attributes if not already present.
 * Used during block creation to ensure all blocks have IDs.
 */
export function ensureMoniBlockId(attrs: Record<string, any> = {}): Record<string, any> {
  return {
    ...attrs,
    moniBlockId: attrs.moniBlockId || generateMoniBlockId(),
  }
}

/**
 * Extracts moniBlockId from HTML attributes.
 * Used during paste/copy operations to preserve or generate IDs.
 */
export function extractMoniBlockId(element: HTMLElement): string | undefined {
  return element.getAttribute('data-moni-block-id') || undefined
}

/**
 * Sets moniBlockId on HTML element.
 * Used when rendering blocks to DOM.
 */
export function setMoniBlockId(element: HTMLElement, id: string): void {
  element.setAttribute('data-moni-block-id', id)
}

/**
 * Removes all moniBlockId attributes from HTML content.
 * Used during paste operations to prevent ID collisions when copying blocks
 * within the same document.
 */
export function stripMoniBlockIds(html: string): string {
  if (!html || typeof html !== 'string') {
    return html
  }

  try {
    // Create a temporary container to parse HTML
    const temp = document.createElement('div')
    temp.innerHTML = html

    // Remove all data-moni-block-id attributes
    const elementsWithIds = temp.querySelectorAll('[data-moni-block-id]')
    elementsWithIds.forEach(element => {
      element.removeAttribute('data-moni-block-id')
    })

    return temp.innerHTML
  } catch (error) {
    console.warn('[MoniAI] Failed to strip moniBlockIds:', error)
    return html
  }
}

/**
 * Checks if HTML content contains any moniBlockId attributes.
 */
export function hasMoniBlockIds(html: string): boolean {
  if (!html || typeof html !== 'string') {
    return false
  }

  try {
    const temp = document.createElement('div')
    temp.innerHTML = html
    return temp.querySelector('[data-moni-block-id]') !== null
  } catch {
    return false
  }
}

/**
 * Processes pasted HTML content and adds moniBlockId to block elements.
 * Used during paste operations to ensure all pasted blocks have IDs.
 */
export function processPastedHTML(html: string): string {
  if (!html || typeof html !== 'string') {
    return html
  }

  try {
    // Create a temporary container to parse HTML
    const temp = document.createElement('div')
    temp.innerHTML = html

    // Block-level elements that should have moniBlockId
    const blockElements = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'ul', 'ol', 'li', 'div']

    blockElements.forEach(tagName => {
      const elements = temp.querySelectorAll(tagName)
      elements.forEach(element => {
        const htmlElement = element as HTMLElement
        // Only add ID if element doesn't already have one
        if (!htmlElement.getAttribute('data-moni-block-id')) {
          setMoniBlockId(htmlElement, generateMoniBlockId())
        }
      })
    })

    return temp.innerHTML
  } catch (error) {
    console.warn('[MoniAI] Failed to process pasted HTML:', error)
    return html
  }
}

/**
 * Processes pasted HTML by first stripping existing IDs then adding new ones.
 * This is the recommended function for handling clipboard content to prevent
 * ID collisions while ensuring all blocks have unique identifiers.
 */
export function processClipboardHTML(html: string): string {
  // First strip any existing IDs to prevent collisions
  const strippedHtml = stripMoniBlockIds(html)
  // Then add new IDs to all block elements
  return processPastedHTML(strippedHtml)
}
