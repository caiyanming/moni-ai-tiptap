import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { NodeSelection } from '@tiptap/pm/state'

import type { Editor } from './Editor.js'

export interface DragHandleManagerOptions {
  /**
   * The drag handle element
   */
  element: HTMLElement

  /**
   * Drag handle position configuration
   */
  position?: {
    side: 'left' | 'right'
    offset: number
  }

  /**
   * Callback when drag starts
   */
  onDragStart?: (blockId: string, node: ProseMirrorNode) => void

  /**
   * Callback when drag ends
   */
  onDragEnd?: (blockId: string, node: ProseMirrorNode) => void

  /**
   * Custom drag handle visibility check
   */
  shouldShowHandle?: (blockId: string, node: ProseMirrorNode) => boolean
}

export class DragHandleManager {
  private readonly editor: Editor
  private readonly options: DragHandleManagerOptions
  private readonly handleElement: HTMLElement
  private currentBlockId: string | null = null
  private currentNode: ProseMirrorNode | null = null
  private isDragging = false
  private dragStartPos: { x: number; y: number } | null = null

  constructor(editor: Editor, options: DragHandleManagerOptions) {
    this.editor = editor
    this.options = options
    this.handleElement = options.element

    this.setupDragHandle()
    this.bindEvents()
  }

  private setupDragHandle() {
    this.handleElement.draggable = true
    this.handleElement.style.position = 'absolute'
    this.handleElement.style.zIndex = '1000'
    this.handleElement.style.cursor = 'grab'
    this.handleElement.style.visibility = 'hidden'
    this.handleElement.style.pointerEvents = 'none'

    // Add drag handle to editor container
    const editorContainer = this.editor.view.dom.parentElement
    if (editorContainer) {
      editorContainer.appendChild(this.handleElement)
    }
  }

  private bindEvents() {
    // Handle mouse movement for drag handle visibility
    this.editor.view.dom.addEventListener('mousemove', this.handleMouseMove.bind(this))
    this.editor.view.dom.addEventListener('mouseleave', this.handleMouseLeave.bind(this))

    // Handle drag events
    this.handleElement.addEventListener('dragstart', this.handleDragStart.bind(this))
    this.handleElement.addEventListener('dragend', this.handleDragEnd.bind(this))
  }

  private handleMouseMove(event: MouseEvent) {
    if (this.isDragging) {
      return
    }

    const blockElement = this.findBlockElement(event.target as HTMLElement)
    if (!blockElement) {
      this.hideHandle()
      return
    }

    const blockId = blockElement.getAttribute('data-moni-block-id')
    if (!blockId) {
      this.hideHandle()
      return
    }

    // Check if drag is enabled for this block
    const dragEnabled = blockElement.getAttribute('data-moni-drag-enabled') !== 'false'
    const dragHandle = blockElement.getAttribute('data-moni-drag-handle') !== 'false'

    if (!dragEnabled || !dragHandle) {
      this.hideHandle()
      return
    }

    // Find the corresponding ProseMirror node
    const node = this.findNodeByBlockId(blockId)
    if (!node) {
      this.hideHandle()
      return
    }

    // Check custom visibility condition
    if (this.options.shouldShowHandle && !this.options.shouldShowHandle(blockId, node)) {
      this.hideHandle()
      return
    }

    // Show handle for this block
    this.showHandleForBlock(blockId, blockElement, node)
  }

  private handleMouseLeave() {
    if (!this.isDragging) {
      this.hideHandle()
    }
  }

  private handleDragStart(event: DragEvent) {
    if (!this.currentBlockId || !this.currentNode) {
      return
    }

    this.isDragging = true
    this.dragStartPos = { x: event.clientX, y: event.clientY }

    // Set drag image
    this.setupDragImage(event)

    // Set drag data
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', this.currentBlockId)
      event.dataTransfer.setData(
        'application/moni-block',
        JSON.stringify({
          blockId: this.currentBlockId,
          dragType: this.currentNode.attrs['data-moni-drag-type'] || 'block',
          level: this.currentNode.attrs['data-moni-level'] || 0,
          parentId: this.currentNode.attrs['data-moni-parent-id'] || null,
        }),
      )
    }

    // Select the node being dragged
    this.selectNodeForDrag()

    // Call user callback
    if (this.options.onDragStart) {
      this.options.onDragStart(this.currentBlockId, this.currentNode)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private handleDragEnd(event: DragEvent) {
    if (!this.currentBlockId || !this.currentNode) {
      return
    }

    this.isDragging = false
    this.dragStartPos = null

    // Call user callback
    if (this.options.onDragEnd) {
      this.options.onDragEnd(this.currentBlockId, this.currentNode)
    }

    // Hide handle after drag
    setTimeout(() => {
      this.hideHandle()
    }, 100)
  }

  private setupDragImage(event: DragEvent) {
    const blockElement = this.findBlockElementByBlockId(this.currentBlockId!)
    if (!blockElement || !event.dataTransfer) {
      return
    }

    // Create drag image
    const dragImage = blockElement.cloneNode(true) as HTMLElement
    dragImage.style.position = 'absolute'
    dragImage.style.top = '-10000px'
    dragImage.style.left = '-10000px'
    dragImage.style.opacity = '0.8'
    dragImage.style.transform = 'rotate(5deg)'

    document.body.appendChild(dragImage)

    // Set drag image
    event.dataTransfer.setDragImage(dragImage, 0, 0)

    // Clean up drag image
    setTimeout(() => {
      document.body.removeChild(dragImage)
    }, 0)
  }

  private selectNodeForDrag() {
    if (!this.currentBlockId) {
      return
    }

    // Find node position in document
    const pos = this.findNodePositionByBlockId(this.currentBlockId)
    if (pos === null) {
      return
    }

    // Create node selection
    const selection = NodeSelection.create(this.editor.state.doc, pos)

    // Update editor state
    const tr = this.editor.state.tr.setSelection(selection)
    this.editor.view.dispatch(tr)
  }

  private showHandleForBlock(blockId: string, blockElement: HTMLElement, node: ProseMirrorNode) {
    this.currentBlockId = blockId
    this.currentNode = node

    // Position the handle
    this.positionHandle(blockElement)

    // Show handle
    this.handleElement.style.visibility = 'visible'
    this.handleElement.style.pointerEvents = 'auto'
  }

  private hideHandle() {
    this.handleElement.style.visibility = 'hidden'
    this.handleElement.style.pointerEvents = 'none'
    this.currentBlockId = null
    this.currentNode = null
  }

  private positionHandle(blockElement: HTMLElement) {
    const rect = blockElement.getBoundingClientRect()
    const editorContainer = this.editor.view.dom.parentElement
    if (!editorContainer) {
      return
    }

    const containerRect = editorContainer.getBoundingClientRect()
    const scrollTop = editorContainer.scrollTop || 0
    const scrollLeft = editorContainer.scrollLeft || 0

    const position = this.options.position || { side: 'left', offset: 8 }
    const side = position.side
    const offset = position.offset

    const top = rect.top - containerRect.top + scrollTop
    const left =
      side === 'left'
        ? rect.left - containerRect.left + scrollLeft - offset
        : rect.right - containerRect.left + scrollLeft + offset

    this.handleElement.style.top = `${top}px`
    this.handleElement.style.left = `${left}px`
    this.handleElement.style.visibility = 'visible'
    this.handleElement.style.pointerEvents = 'auto'
  }

  private findBlockElement(element: HTMLElement): HTMLElement | null {
    let current = element
    while (current && current !== this.editor.view.dom) {
      if (current.hasAttribute('data-moni-block-id')) {
        return current
      }
      current = current.parentElement!
    }
    return null
  }

  private findBlockElementByBlockId(blockId: string): HTMLElement | null {
    return this.editor.view.dom.querySelector(`[data-moni-block-id="${blockId}"]`)
  }

  public findNodeByBlockId(blockId: string): ProseMirrorNode | null {
    let foundNode: ProseMirrorNode | null = null

    this.editor.state.doc.descendants(node => {
      // 🔥 修复：与其他TipTap Fork插件保持一致，查找moniBlockId
      if (node.attrs?.moniBlockId === blockId) {
        foundNode = node
        return false // Stop traversal
      }
      return true
    })

    return foundNode
  }

  private findNodePositionByBlockId(blockId: string): number | null {
    let foundPos: number | null = null

    this.editor.state.doc.descendants((node, pos) => {
      // 🔥 修复：与其他TipTap Fork插件保持一致，查找moniBlockId
      if (node.attrs?.moniBlockId === blockId) {
        foundPos = pos
        return false // Stop traversal
      }
      return true
    })

    return foundPos
  }

  public destroy() {
    // Remove event listeners
    this.editor.view.dom.removeEventListener('mousemove', this.handleMouseMove.bind(this))
    this.editor.view.dom.removeEventListener('mouseleave', this.handleMouseLeave.bind(this))
    this.handleElement.removeEventListener('dragstart', this.handleDragStart.bind(this))
    this.handleElement.removeEventListener('dragend', this.handleDragEnd.bind(this))

    // Remove handle element
    if (this.handleElement.parentElement) {
      this.handleElement.parentElement.removeChild(this.handleElement)
    }
  }
}
