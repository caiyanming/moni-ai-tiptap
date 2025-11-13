import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { type Transaction, Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'

import { type DragHandleManagerOptions, DragHandleManager } from './DragHandleManager.js'
import { DragIndicatorManager } from './DragIndicatorManager.js'
import { DragOperationManager } from './DragOperationManager.js'
import type { Editor } from './Editor.js'
import { getDragConfig } from './helpers/getDragConfig.js'
import { getNodeAttr } from './helpers/nodeAttrs.js'

export interface MoniDragPluginOptions extends Partial<DragHandleManagerOptions> {
  /**
   * Drag handle element or function to create it
   */
  dragHandle?: HTMLElement | (() => HTMLElement)

  /**
   * Enable drag indicators
   * @default true
   */
  enableIndicators?: boolean

  /**
   * Debounce delay for mouse events (in ms)
   * @default 50
   */
  debounceDelay?: number

  /**
   * Enable debug mode for logging
   * @default false
   */
  debug?: boolean
}

export interface MoniDragPluginState {
  isDragging: boolean
  dragData: {
    moniBlockId: string
    dragType: string
    level: number
    moniParentId: string | null
  } | null
  dropTarget: {
    moniBlockId: string
    position: 'above' | 'below' | 'inside'
    level?: number
  } | null
}

export const moniDragPluginKey = new PluginKey<MoniDragPluginState>('moniDrag')

/**
 * Create the default drag handle element
 */
function createDefaultDragHandle(): HTMLElement {
  const handle = document.createElement('div')
  handle.className = 'moni-drag-handle'
  handle.innerHTML = `
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <circle cx="3" cy="3" r="1"/>
      <circle cx="9" cy="3" r="1"/>
      <circle cx="3" cy="6" r="1"/>
      <circle cx="9" cy="6" r="1"/>
      <circle cx="3" cy="9" r="1"/>
      <circle cx="9" cy="9" r="1"/>
    </svg>
  `

  // Apply default styles
  Object.assign(handle.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    borderRadius: '4px',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    color: 'rgba(0, 0, 0, 0.6)',
    cursor: 'grab',
    userSelect: 'none',
    transition: 'all 0.15s ease',
  })

  // Hover effect
  handle.addEventListener('mouseenter', () => {
    handle.style.backgroundColor = 'rgba(0, 0, 0, 0.15)'
    handle.style.color = 'rgba(0, 0, 0, 0.8)'
  })

  handle.addEventListener('mouseleave', () => {
    handle.style.backgroundColor = 'rgba(0, 0, 0, 0.1)'
    handle.style.color = 'rgba(0, 0, 0, 0.6)'
  })

  return handle
}

export class MoniDragPlugin {
  private readonly editor: Editor
  private readonly options: MoniDragPluginOptions
  private dragHandleManager: DragHandleManager | null = null
  private dragIndicatorManager: DragIndicatorManager | null = null
  private dragOperationManager: DragOperationManager | null = null
  private plugin: Plugin<MoniDragPluginState> | null = null

  constructor(editor: Editor, options: MoniDragPluginOptions = {}) {
    this.editor = editor
    this.options = {
      enableIndicators: true,
      debounceDelay: 50,
      position: { side: 'left', offset: 8 },
      ...options,
    }

    this.initialize()
  }

  private initialize() {
    // Create drag handle element
    const handleElement = this.createDragHandle()

    // Initialize drag handle manager
    this.dragHandleManager = new DragHandleManager(this.editor, {
      element: handleElement,
      position: this.options.position,
      onDragStart: this.handleDragStart.bind(this),
      onDragEnd: this.handleDragEnd.bind(this),
      shouldShowHandle: this.options.shouldShowHandle,
    })

    // Initialize drag indicator manager
    if (this.options.enableIndicators) {
      this.dragIndicatorManager = new DragIndicatorManager(this.editor)
    }

    // Initialize drag operation manager
    this.dragOperationManager = new DragOperationManager(this.editor)

    // Create ProseMirror plugin
    this.plugin = this.createPlugin()
  }

  private createDragHandle(): HTMLElement {
    if (this.options.dragHandle) {
      if (typeof this.options.dragHandle === 'function') {
        return this.options.dragHandle()
      }
      return this.options.dragHandle
    }

    return createDefaultDragHandle()
  }

  private createPlugin(): Plugin<MoniDragPluginState> {
    return new Plugin<MoniDragPluginState>({
      key: moniDragPluginKey,

      state: {
        init() {
          return {
            isDragging: false,
            dragData: null,
            dropTarget: null,
          }
        },

        apply(tr: Transaction, value: MoniDragPluginState) {
          // Get meta data for drag state changes
          const dragStart = tr.getMeta('moni-drag-start')
          const dragEnd = tr.getMeta('moni-drag-end')
          const dropTarget = tr.getMeta('moni-drop-target')

          let newState = { ...value }

          if (dragStart) {
            newState = {
              ...newState,
              isDragging: true,
              dragData: dragStart,
            }
          }

          if (dragEnd) {
            newState = {
              ...newState,
              isDragging: false,
              dragData: null,
              dropTarget: null,
            }
          }

          if (dropTarget !== undefined) {
            newState = {
              ...newState,
              dropTarget,
            }
          }

          return newState
        },
      },

      props: {
        handleDOMEvents: {
          dragover: (view, event) => this.handleDragOver(view, event),
          drop: (view, event) => this.handleDrop(view, event),
          dragleave: (view, event) => this.handleDragLeave(view, event),
        },
      },
    })
  }

  private handleDragStart(blockId: string, node: ProseMirrorNode) {
    const dragConfig = getDragConfig(node)
    const level = getNodeAttr<number>(node, 'moniLevel', 0)
    const parentId = getNodeAttr<string | null>(node, 'moniParentId', null)

    // Set drag state in plugin
    const tr = this.editor.state.tr.setMeta('moni-drag-start', {
      moniBlockId: blockId,
      dragType: dragConfig.dragType,
      level,
      moniParentId: parentId,
    })

    this.editor.view.dispatch(tr)
  }

  private handleDragEnd() {
    // Clear drag state in plugin
    const tr = this.editor.state.tr.setMeta('moni-drag-end', true)
    this.editor.view.dispatch(tr)

    // Hide indicators
    this.dragIndicatorManager?.hideIndicator()
  }

  private handleDragOver(view: EditorView, event: DragEvent): boolean {
    event.preventDefault()

    const target = event.target as HTMLElement
    const blockElement = this.findBlockElement(target)

    if (!blockElement) {
      this.dragIndicatorManager?.hideIndicator()
      return true
    }

    const dropPosition = this.dragIndicatorManager?.calculateDropPosition(event, blockElement)
    if (dropPosition) {
      this.dragIndicatorManager?.showIndicator(blockElement, dropPosition.position)
    }

    return true
  }

  private handleDrop(view: EditorView, event: DragEvent): boolean {
    const dragData = this.extractDragData(event)
    if (!dragData) {
      // 🔧 FIX: 如果不是Moni块数据，不要阻止默认的ProseMirror拖拽处理
      return false
    }

    // 只有在确定可以处理Moni块拖拽时才阻止默认行为
    event.preventDefault()

    const target = event.target as HTMLElement
    const targetBlockElement = this.findBlockElement(target)

    if (!targetBlockElement) {
      return false
    }

    const targetBlockId = targetBlockElement.getAttribute('data-moni-block-id')
    if (!targetBlockId) {
      return false
    }

    const dropPosition = this.dragIndicatorManager?.calculateDropPosition(event, targetBlockElement)
    if (!dropPosition) {
      return false
    }

    // Find source and target nodes
    const sourceNode = this.findNodeByBlockId(view, dragData.moniBlockId)
    const targetNode = this.findNodeByBlockId(view, targetBlockId)

    if (!sourceNode || !targetNode) {
      return false
    }

    // Execute the drop operation
    const operation = {
      sourceBlockId: dragData.moniBlockId,
      targetBlockId,
      position: dropPosition.position,
      sourceNode,
      targetNode,
    }

    const success = this.dragOperationManager?.executeDrop(operation)

    // Hide indicators after drop
    this.dragIndicatorManager?.hideIndicator()

    return success ?? false
  }

  private handleDragLeave(view: EditorView, event: DragEvent): boolean {
    // Only hide if we're leaving the editor entirely
    const relatedTarget = event.relatedTarget as HTMLElement
    if (!relatedTarget || !this.isWithinEditor(relatedTarget)) {
      this.dragIndicatorManager?.hideIndicator()
    }
    return true
  }

  private findBlockElement(element: HTMLElement): HTMLElement | null {
    let current = element
    while (current && current !== this.editor.view.dom) {
      if (current.hasAttribute('data-moni-block-id')) {
        return current
      }
      current = current.parentElement as HTMLElement
    }
    return null
  }

  private findNodeByBlockId(view: EditorView, blockId: string): ProseMirrorNode | null {
    let result: ProseMirrorNode | null = null

    view.state.doc.descendants(node => {
      const nodeBlockId = node.attrs?.moniBlockId
      if (nodeBlockId === blockId) {
        result = node
        return false // Stop traversal
      }
      return true
    })

    return result
  }

  private extractDragData(
    event: DragEvent,
  ): { moniBlockId: string; dragType: string; level: number; moniParentId: string | null } | null {
    try {
      const data = event.dataTransfer?.getData('application/moni-block')
      if (!data) {
        return null
      }
      return JSON.parse(data)
    } catch {
      return null
    }
  }

  private isWithinEditor(element: HTMLElement): boolean {
    let current = element
    while (current) {
      if (current === this.editor.view.dom) {
        return true
      }
      current = current.parentElement as HTMLElement
    }
    return false
  }

  public getPlugin(): Plugin<MoniDragPluginState> {
    return this.plugin!
  }

  public destroy() {
    this.dragHandleManager?.destroy()
    this.dragIndicatorManager?.destroy()
  }
}
