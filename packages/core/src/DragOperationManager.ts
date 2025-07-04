import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { Transaction } from '@tiptap/pm/state'

import type { Editor } from './Editor.js'

export interface DropOperation {
  sourceBlockId: string
  targetBlockId: string
  position: 'above' | 'below' | 'inside'
  sourceNode: ProseMirrorNode
  targetNode: ProseMirrorNode
}

export interface ValidationResult {
  valid: boolean
  reason?: string
}

export class DragOperationManager {
  private readonly editor: Editor

  constructor(editor: Editor) {
    this.editor = editor
  }

  public validateDrop(operation: DropOperation): ValidationResult {
    // Check if source and target are the same
    if (operation.sourceBlockId === operation.targetBlockId) {
      return { valid: false, reason: 'Cannot drop on itself' }
    }

    // Check if target is a descendant of source (prevent circular nesting)
    if (this.isDescendant(operation.sourceNode, operation.targetNode)) {
      return { valid: false, reason: 'Cannot drop into descendant' }
    }

    // Check nesting constraints
    if (operation.position === 'inside') {
      const targetNestable = operation.targetNode.attrs?.['moni-nestable'] ?? false
      if (!targetNestable) {
        return { valid: false, reason: 'Target does not support nesting' }
      }

      const sourceCanNestIn = operation.sourceNode.attrs?.['moni-can-nest-in'] ?? []
      const targetDragType = operation.targetNode.attrs?.['moni-drag-type'] ?? 'block'

      if (sourceCanNestIn.length > 0 && !sourceCanNestIn.includes(targetDragType)) {
        return { valid: false, reason: 'Source cannot nest in target type' }
      }

      const targetMaxLevel = operation.targetNode.attrs?.['moni-max-nest-level'] ?? 0
      const currentLevel = operation.targetNode.attrs?.['moni-level'] ?? 0

      if (currentLevel >= targetMaxLevel) {
        return { valid: false, reason: 'Maximum nesting level reached' }
      }
    }

    return { valid: true }
  }

  public executeDrop(operation: DropOperation): boolean {
    const validation = this.validateDrop(operation)
    if (!validation.valid) {
      console.warn(`Drop operation failed: ${validation.reason}`)
      return false
    }

    const tr = this.editor.view.state.tr
    const sourcePos = this.findNodePosition(operation.sourceBlockId)
    const targetPos = this.findNodePosition(operation.targetBlockId)

    if (sourcePos === -1 || targetPos === -1) {
      console.warn('Failed to find node positions')
      return false
    }

    try {
      switch (operation.position) {
        case 'above': {
          this.moveNodeAbove(tr, sourcePos, targetPos, operation)
          break
        }
        case 'below': {
          this.moveNodeBelow(tr, sourcePos, targetPos, operation)
          break
        }
        case 'inside': {
          this.moveNodeInside(tr, sourcePos, targetPos, operation)
          break
        }
        default: {
          console.warn(`Unknown drop position: ${operation.position}`)
          return false
        }
      }

      // Dispatch the transaction
      this.editor.view.dispatch(tr)
      return true
    } catch (error) {
      console.error('Failed to execute drop operation:', error)
      return false
    }
  }

  private moveNodeAbove(tr: Transaction, sourcePos: number, targetPos: number, operation: DropOperation): void {
    // Remove source node
    const sourceNode = tr.doc.nodeAt(sourcePos)
    if (!sourceNode) {
      return
    }

    tr.delete(sourcePos, sourcePos + sourceNode.nodeSize)

    // Adjust target position if source was before target
    const adjustedTargetPos = sourcePos < targetPos ? targetPos - sourceNode.nodeSize : targetPos

    // Insert source node before target
    tr.insert(adjustedTargetPos, sourceNode)

    // Update node attributes
    this.updateNodeAttributes(tr, adjustedTargetPos, {
      'moni-parent-id': operation.targetNode.attrs?.['moni-parent-id'] ?? null,
      'moni-level': operation.targetNode.attrs?.['moni-level'] ?? 0,
    })
  }

  private moveNodeBelow(tr: Transaction, sourcePos: number, targetPos: number, operation: DropOperation): void {
    // Remove source node
    const sourceNode = tr.doc.nodeAt(sourcePos)
    if (!sourceNode) {
      return
    }

    tr.delete(sourcePos, sourcePos + sourceNode.nodeSize)

    // Adjust target position if source was before target
    const adjustedTargetPos = sourcePos < targetPos ? targetPos - sourceNode.nodeSize : targetPos
    const targetNode = tr.doc.nodeAt(adjustedTargetPos)
    if (!targetNode) {
      return
    }

    // Insert source node after target
    const insertPos = adjustedTargetPos + targetNode.nodeSize
    tr.insert(insertPos, sourceNode)

    // Update node attributes
    this.updateNodeAttributes(tr, insertPos, {
      'moni-parent-id': operation.targetNode.attrs?.['moni-parent-id'] ?? null,
      'moni-level': operation.targetNode.attrs?.['moni-level'] ?? 0,
    })
  }

  private moveNodeInside(tr: Transaction, sourcePos: number, targetPos: number, operation: DropOperation): void {
    // Remove source node
    const sourceNode = tr.doc.nodeAt(sourcePos)
    if (!sourceNode) {
      return
    }

    tr.delete(sourcePos, sourcePos + sourceNode.nodeSize)

    // Adjust target position if source was before target
    const adjustedTargetPos = sourcePos < targetPos ? targetPos - sourceNode.nodeSize : targetPos
    const targetNode = tr.doc.nodeAt(adjustedTargetPos)
    if (!targetNode) {
      return
    }

    // Insert source node as first child of target
    const insertPos = adjustedTargetPos + 1 // Insert after opening tag
    tr.insert(insertPos, sourceNode)

    // Update node attributes for nesting
    const newLevel = (operation.targetNode.attrs?.['moni-level'] ?? 0) + 1
    this.updateNodeAttributes(tr, insertPos, {
      'moni-parent-id': operation.targetBlockId,
      'moni-level': newLevel,
    })
  }

  private updateNodeAttributes(tr: Transaction, pos: number, attrs: Record<string, any>): void {
    const node = tr.doc.nodeAt(pos)
    if (!node) {
      return
    }

    tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...attrs })
  }

  private findNodePosition(blockId: string): number {
    const { doc } = this.editor.view.state
    let pos = -1

    doc.descendants((node, nodePos) => {
      const nodeBlockId = node.attrs?.moniBlockId
      if (nodeBlockId === blockId) {
        pos = nodePos
        return false // Stop traversal
      }
      return true
    })

    return pos
  }

  private isDescendant(sourceNode: ProseMirrorNode, targetNode: ProseMirrorNode): boolean {
    const sourceBlockId = sourceNode.attrs?.moniBlockId
    const targetParentId = targetNode.attrs?.moniParentId

    if (!sourceBlockId || !targetParentId) {
      return false
    }

    // Simple check: if target's parent is source, then target is descendant
    return targetParentId === sourceBlockId
  }

  public getDropTargets(sourceBlockId: string): string[] {
    const { doc } = this.editor.view.state
    const targets: string[] = []

    doc.descendants(node => {
      const blockId = node.attrs?.moniBlockId
      if (blockId && blockId !== sourceBlockId) {
        targets.push(blockId)
      }
    })

    return targets
  }
}
