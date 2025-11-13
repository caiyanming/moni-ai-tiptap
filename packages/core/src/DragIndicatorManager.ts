import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

import type { Editor } from './Editor.js'
import { getDragConfig } from './helpers/getDragConfig.js'

export interface DropTarget {
  moniBlockId: string
  position: 'above' | 'below' | 'inside'
  level?: number
}

export class DragIndicatorManager {
  private readonly editor: Editor
  private horizontalIndicator: HTMLElement | null = null
  private verticalIndicator: HTMLElement | null = null
  private containerElement: HTMLElement | null = null

  constructor(editor: Editor) {
    this.editor = editor
    this.initialize()
  }

  private initialize() {
    this.containerElement = this.editor.view.dom.parentElement
    if (!this.containerElement) {
      return
    }

    this.createIndicators()
  }

  private createIndicators() {
    // Create horizontal indicator (line above/below blocks)
    this.horizontalIndicator = document.createElement('div')
    this.horizontalIndicator.className = 'moni-drag-indicator-horizontal'
    Object.assign(this.horizontalIndicator.style, {
      position: 'absolute',
      height: '2px',
      backgroundColor: '#0066cc',
      borderRadius: '1px',
      pointerEvents: 'none',
      zIndex: '1000',
      visibility: 'hidden',
      transition: 'all 0.15s ease',
    })

    // Add drop circle at the start
    const circle = document.createElement('div')
    Object.assign(circle.style, {
      position: 'absolute',
      left: '-4px',
      top: '-3px',
      width: '8px',
      height: '8px',
      backgroundColor: '#0066cc',
      borderRadius: '50%',
    })
    this.horizontalIndicator.appendChild(circle)

    // Create vertical indicator (indentation guide for nesting)
    this.verticalIndicator = document.createElement('div')
    this.verticalIndicator.className = 'moni-drag-indicator-vertical'
    Object.assign(this.verticalIndicator.style, {
      position: 'absolute',
      width: '2px',
      backgroundColor: '#0066cc',
      borderRadius: '1px',
      pointerEvents: 'none',
      zIndex: '999',
      visibility: 'hidden',
      transition: 'all 0.15s ease',
    })

    // Add indicators to container
    this.containerElement!.appendChild(this.horizontalIndicator)
    this.containerElement!.appendChild(this.verticalIndicator)
  }

  public showIndicator(targetElement: HTMLElement, position: 'above' | 'below' | 'inside'): void {
    if (!this.containerElement) {
      return
    }

    this.hideIndicator()

    const rect = targetElement.getBoundingClientRect()
    const containerRect = this.containerElement.getBoundingClientRect()

    if (position === 'above') {
      this.showHorizontalIndicator(rect, containerRect, 'above')
    } else if (position === 'below') {
      this.showHorizontalIndicator(rect, containerRect, 'below')
    } else if (position === 'inside') {
      this.showVerticalIndicator(rect, containerRect)
    }
  }

  private showHorizontalIndicator(rect: DOMRect, containerRect: DOMRect, position: 'above' | 'below'): void {
    if (!this.horizontalIndicator) {
      return
    }

    const y = position === 'above' ? rect.top - containerRect.top : rect.bottom - containerRect.top
    const x = rect.left - containerRect.left
    const width = rect.width

    this.horizontalIndicator.style.left = `${x}px`
    this.horizontalIndicator.style.top = `${y - 1}px`
    this.horizontalIndicator.style.width = `${width}px`
    this.horizontalIndicator.style.visibility = 'visible'
  }

  private showVerticalIndicator(rect: DOMRect, containerRect: DOMRect): void {
    if (!this.verticalIndicator) {
      return
    }

    const x = rect.left - containerRect.left
    const y = rect.top - containerRect.top
    const height = rect.height

    this.verticalIndicator.style.left = `${x - 2}px`
    this.verticalIndicator.style.top = `${y}px`
    this.verticalIndicator.style.height = `${height}px`
    this.verticalIndicator.style.visibility = 'visible'
  }

  public hideIndicator(): void {
    if (this.horizontalIndicator) {
      this.horizontalIndicator.style.visibility = 'hidden'
    }
    if (this.verticalIndicator) {
      this.verticalIndicator.style.visibility = 'hidden'
    }
  }

  public calculateDropPosition(
    event: DragEvent,
    targetElement: HTMLElement,
  ): { position: 'above' | 'below' | 'inside'; element: HTMLElement } | null {
    const rect = targetElement.getBoundingClientRect()
    const y = event.clientY
    const x = event.clientX

    // Check if we're dragging over a nestable element
    const blockId = targetElement.getAttribute('data-moni-block-id')
    const config = blockId ? this.getDragConfigForBlock(blockId) : null
    const nestable = config?.nestable ?? false
    const leftIndentZone = rect.left + 40 // 40px indent zone on the left

    if (nestable && x < leftIndentZone) {
      return { position: 'inside', element: targetElement }
    }

    // Calculate drop position based on mouse position
    const topThreshold = rect.top + rect.height * 0.25
    const bottomThreshold = rect.bottom - rect.height * 0.25

    if (y < topThreshold) {
      return { position: 'above', element: targetElement }
    }
    if (y > bottomThreshold) {
      return { position: 'below', element: targetElement }
    }
    return { position: 'inside', element: targetElement }
  }

  private findDropTarget(event: DragEvent): HTMLElement | null {
    const target = event.target as HTMLElement

    // Find the nearest block element
    let current = target
    while (current && current !== this.containerElement) {
      if (current.hasAttribute('data-moni-block-id')) {
        return current
      }
      current = current.parentElement as HTMLElement
    }

    return null
  }

  private findBlockElement(blockId: string): HTMLElement | null {
    return this.editor.view.dom.querySelector(`[data-moni-block-id="${blockId}"]`)
  }

  private findNodeByBlockId(blockId: string): ProseMirrorNode | null {
    let result: ProseMirrorNode | null = null

    this.editor.view.state.doc.descendants(node => {
      const nodeBlockId = node.attrs?.moniBlockId
      if (nodeBlockId === blockId) {
        result = node
        return false
      }
      return true
    })

    return result
  }

  private getDragConfigForBlock(blockId: string) {
    const node = this.findNodeByBlockId(blockId)
    if (!node) {
      return null
    }
    return getDragConfig(node)
  }

  public destroy() {
    try {
      if (
        this.horizontalIndicator?.parentElement &&
        this.horizontalIndicator.parentElement.contains(this.horizontalIndicator)
      ) {
        this.horizontalIndicator.parentElement.removeChild(this.horizontalIndicator)
      }
    } catch {
      console.debug('DragIndicatorManager: Horizontal indicator already removed during cleanup')
    }

    try {
      if (
        this.verticalIndicator?.parentElement &&
        this.verticalIndicator.parentElement.contains(this.verticalIndicator)
      ) {
        this.verticalIndicator.parentElement.removeChild(this.verticalIndicator)
      }
    } catch {
      console.debug('DragIndicatorManager: Vertical indicator already removed during cleanup')
    }

    this.horizontalIndicator = null
    this.verticalIndicator = null
    this.containerElement = null
  }
}
