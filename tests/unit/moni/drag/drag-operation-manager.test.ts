import { type DropOperation, type Editor, DragOperationManager } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { Transaction } from '@tiptap/pm/state'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock ProseMirror node
const createMockNode = (
  blockId: string,
  options: {
    parentId?: string | null
    level?: number
    nestable?: boolean
    canNestIn?: string[]
    dragType?: string
    maxNestLevel?: number
  } = {},
): ProseMirrorNode => {
  return {
    attrs: {
      moniBlockId: blockId,
      moniParentId: options.parentId ?? null,
      'data-moni-level': options.level ?? 0,
      'data-moni-nestable': options.nestable ?? false,
      'data-moni-can-nest-in': options.canNestIn ?? [],
      'data-moni-drag-type': options.dragType ?? 'block',
      'data-moni-max-nest-level': options.maxNestLevel ?? 10,
    },
    nodeSize: 20, // Mock node size
    type: { name: 'paragraph' },
  } as unknown as ProseMirrorNode
}

// Mock Editor with transaction capabilities
const createMockEditor = () => {
  const mockDoc = {
    descendants: vi.fn((callback: (node: ProseMirrorNode, pos?: number) => boolean) => {
      const testNodes = [
        createMockNode('block-1', { level: 0 }),
        createMockNode('block-2', { level: 0, nestable: true }),
        createMockNode('block-3', { level: 1, parentId: 'block-2' }),
        createMockNode('block-4', { level: 0 }),
      ]

      testNodes.forEach((node, index) => {
        const continueTraversal = callback(node, index * 20)
        if (!continueTraversal) {
          // Stop traversal
        }
      })
    }),
    nodeAt: vi.fn((pos: number) => {
      const nodeIndex = Math.floor(pos / 20)
      const testNodes = [
        createMockNode('block-1', { level: 0 }),
        createMockNode('block-2', { level: 0, nestable: true }),
        createMockNode('block-3', { level: 1, parentId: 'block-2' }),
        createMockNode('block-4', { level: 0 }),
      ]
      return testNodes[nodeIndex] || null
    }),
  }

  const mockTransaction = {
    doc: mockDoc,
    delete: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    setNodeMarkup: vi.fn().mockReturnThis(),
  } as unknown as Transaction

  const mockState = {
    tr: mockTransaction,
    doc: mockDoc,
  }

  const mockView = {
    state: mockState,
    dispatch: vi.fn(),
  }

  return {
    view: mockView,
  } as unknown as Editor
}

describe('DragOperationManager', () => {
  let editor: Editor
  let dragOperationManager: DragOperationManager

  beforeEach(() => {
    editor = createMockEditor()
    dragOperationManager = new DragOperationManager(editor)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('拖放验证', () => {
    it('should validate drop on same element fails', () => {
      const sourceNode = createMockNode('block-1')
      const targetNode = createMockNode('block-1')

      const operation: DropOperation = {
        sourceBlockId: 'block-1',
        targetBlockId: 'block-1',
        position: 'above',
        sourceNode,
        targetNode,
      }

      const result = dragOperationManager.validateDrop(operation)

      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Cannot drop on itself')
    })

    it('should prevent circular nesting', () => {
      const sourceNode = createMockNode('block-2', { level: 0 })
      const targetNode = createMockNode('block-3', { level: 1, parentId: 'block-2' })

      const operation: DropOperation = {
        sourceBlockId: 'block-2',
        targetBlockId: 'block-3',
        position: 'inside',
        sourceNode,
        targetNode,
      }

      const result = dragOperationManager.validateDrop(operation)

      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Cannot drop into descendant')
    })

    it('should check nesting constraints - target not nestable', () => {
      const sourceNode = createMockNode('block-1')
      const targetNode = createMockNode('block-2', { nestable: false })

      const operation: DropOperation = {
        sourceBlockId: 'block-1',
        targetBlockId: 'block-2',
        position: 'inside',
        sourceNode,
        targetNode,
      }

      const result = dragOperationManager.validateDrop(operation)

      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Target does not support nesting')
    })

    it('should check nesting constraints - source cannot nest in target type', () => {
      const sourceNode = createMockNode('block-1', { canNestIn: ['list'] })
      const targetNode = createMockNode('block-2', { nestable: true, dragType: 'paragraph' })

      const operation: DropOperation = {
        sourceBlockId: 'block-1',
        targetBlockId: 'block-2',
        position: 'inside',
        sourceNode,
        targetNode,
      }

      const result = dragOperationManager.validateDrop(operation)

      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Source cannot nest in target type')
    })

    it('should check maximum nesting level', () => {
      const sourceNode = createMockNode('block-1')
      const targetNode = createMockNode('block-2', {
        nestable: true,
        level: 5,
        maxNestLevel: 5,
      })

      const operation: DropOperation = {
        sourceBlockId: 'block-1',
        targetBlockId: 'block-2',
        position: 'inside',
        sourceNode,
        targetNode,
      }

      const result = dragOperationManager.validateDrop(operation)

      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Maximum nesting level reached')
    })

    it('should validate successful drop operation', () => {
      const sourceNode = createMockNode('block-1')
      const targetNode = createMockNode('block-2', { nestable: true, level: 0, maxNestLevel: 10 })

      const operation: DropOperation = {
        sourceBlockId: 'block-1',
        targetBlockId: 'block-2',
        position: 'inside',
        sourceNode,
        targetNode,
      }

      const result = dragOperationManager.validateDrop(operation)

      expect(result.valid).toBe(true)
      expect(result.reason).toBeUndefined()
    })

    it('should allow nesting when source can nest in target type', () => {
      const sourceNode = createMockNode('block-1', { canNestIn: ['list', 'paragraph'] })
      const targetNode = createMockNode('block-2', { nestable: true, dragType: 'list' })

      const operation: DropOperation = {
        sourceBlockId: 'block-1',
        targetBlockId: 'block-2',
        position: 'inside',
        sourceNode,
        targetNode,
      }

      const result = dragOperationManager.validateDrop(operation)

      expect(result.valid).toBe(true)
    })
  })

  describe('拖放执行', () => {
    it('should execute move above operation', () => {
      const sourceNode = createMockNode('block-1')
      const targetNode = createMockNode('block-2')

      const operation: DropOperation = {
        sourceBlockId: 'block-1',
        targetBlockId: 'block-2',
        position: 'above',
        sourceNode,
        targetNode,
      }

      // Mock findNodePosition to return valid positions
      vi.spyOn(dragOperationManager as any, 'findNodePosition')
        .mockReturnValueOnce(0) // source position
        .mockReturnValueOnce(20) // target position

      const result = dragOperationManager.executeDrop(operation)

      expect(result).toBe(true)
      expect(editor.view.dispatch).toHaveBeenCalled()
    })

    it('should execute move below operation', () => {
      const sourceNode = createMockNode('block-1')
      const targetNode = createMockNode('block-2')

      const operation: DropOperation = {
        sourceBlockId: 'block-1',
        targetBlockId: 'block-2',
        position: 'below',
        sourceNode,
        targetNode,
      }

      vi.spyOn(dragOperationManager as any, 'findNodePosition')
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(20)

      const result = dragOperationManager.executeDrop(operation)

      expect(result).toBe(true)
      expect(editor.view.dispatch).toHaveBeenCalled()
    })

    it('should execute nesting operation', () => {
      const sourceNode = createMockNode('block-1')
      const targetNode = createMockNode('block-2', { nestable: true })

      const operation: DropOperation = {
        sourceBlockId: 'block-1',
        targetBlockId: 'block-2',
        position: 'inside',
        sourceNode,
        targetNode,
      }

      vi.spyOn(dragOperationManager as any, 'findNodePosition')
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(20)

      const result = dragOperationManager.executeDrop(operation)

      expect(result).toBe(true)
      expect(editor.view.dispatch).toHaveBeenCalled()
    })

    it('should handle transaction errors', () => {
      const sourceNode = createMockNode('block-1')
      const targetNode = createMockNode('block-2')

      const operation: DropOperation = {
        sourceBlockId: 'block-1',
        targetBlockId: 'block-2',
        position: 'above',
        sourceNode,
        targetNode,
      }

      // Mock findNodePosition to return valid positions
      vi.spyOn(dragOperationManager as any, 'findNodePosition')
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(20)

      // Mock editor.view.dispatch to throw error
      vi.mocked(editor.view.dispatch).mockImplementation(() => {
        throw new Error('Transaction failed')
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const result = dragOperationManager.executeDrop(operation)

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith('Failed to execute drop operation:', expect.any(Error))

      consoleSpy.mockRestore()
    })

    it('should fail when nodes not found', () => {
      const sourceNode = createMockNode('block-1')
      const targetNode = createMockNode('block-2')

      const operation: DropOperation = {
        sourceBlockId: 'block-1',
        targetBlockId: 'block-2',
        position: 'above',
        sourceNode,
        targetNode,
      }

      // Mock findNodePosition to return invalid positions
      vi.spyOn(dragOperationManager as any, 'findNodePosition').mockReturnValue(-1)

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = dragOperationManager.executeDrop(operation)

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith('Failed to find node positions')

      consoleSpy.mockRestore()
    })

    it('should fail on validation failure', () => {
      const sourceNode = createMockNode('block-1')
      const targetNode = createMockNode('block-1') // Same block

      const operation: DropOperation = {
        sourceBlockId: 'block-1',
        targetBlockId: 'block-1',
        position: 'above',
        sourceNode,
        targetNode,
      }

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = dragOperationManager.executeDrop(operation)

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith('Drop operation failed: Cannot drop on itself')

      consoleSpy.mockRestore()
    })

    it('should handle unknown drop position', () => {
      const sourceNode = createMockNode('block-1')
      const targetNode = createMockNode('block-2')

      const operation: DropOperation = {
        sourceBlockId: 'block-1',
        targetBlockId: 'block-2',
        position: 'unknown' as any,
        sourceNode,
        targetNode,
      }

      vi.spyOn(dragOperationManager as any, 'findNodePosition')
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(20)

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = dragOperationManager.executeDrop(operation)

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith('Unknown drop position: unknown')

      consoleSpy.mockRestore()
    })
  })

  describe('节点位置管理', () => {
    it('should find node position by block ID', () => {
      const position = (dragOperationManager as any).findNodePosition('block-2')
      expect(position).toBe(20) // Second node at position 20
    })

    it('should return -1 for non-existent block ID', () => {
      const position = (dragOperationManager as any).findNodePosition('non-existent')
      expect(position).toBe(-1)
    })

    it('should detect descendant relationship', () => {
      const sourceNode = createMockNode('block-parent')
      const targetNode = createMockNode('block-child', { parentId: 'block-parent' })

      const isDescendant = (dragOperationManager as any).isDescendant(sourceNode, targetNode)
      expect(isDescendant).toBe(true)
    })

    it('should not detect descendant when no relationship', () => {
      const sourceNode = createMockNode('block-1')
      const targetNode = createMockNode('block-2')

      const isDescendant = (dragOperationManager as any).isDescendant(sourceNode, targetNode)
      expect(isDescendant).toBe(false)
    })

    it('should handle missing IDs in descendant check', () => {
      const sourceNode = createMockNode('block-1')
      const targetNode = createMockNode('block-2', { parentId: null })

      const isDescendant = (dragOperationManager as any).isDescendant(sourceNode, targetNode)
      expect(isDescendant).toBe(false)
    })
  })

  describe('Transaction 操作', () => {
    let mockTransaction: Transaction

    beforeEach(() => {
      mockTransaction = editor.view.state.tr
    })

    it('should update node attributes correctly', () => {
      const attrs = {
        'data-moni-parent-id': 'new-parent',
        'data-moni-level': 2,
      }

      ;(dragOperationManager as any).updateNodeAttributes(mockTransaction, 0, attrs)

      expect(mockTransaction.setNodeMarkup).toHaveBeenCalledWith(0, undefined, expect.objectContaining(attrs))
    })

    it('should handle missing node in updateNodeAttributes', () => {
      vi.mocked(mockTransaction.doc.nodeAt).mockReturnValue(null)

      expect(() => {
        ;(dragOperationManager as any).updateNodeAttributes(mockTransaction, 0, {})
      }).not.toThrow()

      expect(mockTransaction.setNodeMarkup).not.toHaveBeenCalled()
    })

    it('should correctly calculate position adjustments', () => {
      const sourceNode = createMockNode('block-1')
      const targetNode = createMockNode('block-2')

      const operation: DropOperation = {
        sourceBlockId: 'block-1',
        targetBlockId: 'block-2',
        position: 'above',
        sourceNode,
        targetNode,
      }

      // Mock moveNodeAbove to test position calculations
      const moveNodeAboveSpy = vi.spyOn(dragOperationManager as any, 'moveNodeAbove')

      vi.spyOn(dragOperationManager as any, 'findNodePosition')
        .mockReturnValueOnce(0) // source before target
        .mockReturnValueOnce(40) // target position

      dragOperationManager.executeDrop(operation)

      expect(moveNodeAboveSpy).toHaveBeenCalledWith(
        mockTransaction,
        0, // source position
        40, // target position
        operation,
      )
    })
  })

  describe('拖放目标获取', () => {
    it('should get all valid drop targets', () => {
      const targets = dragOperationManager.getDropTargets('block-1')

      expect(targets).toEqual(['block-2', 'block-3', 'block-4'])
      expect(targets).not.toContain('block-1') // Should exclude source
    })

    it('should return empty array when no targets available', () => {
      // Mock descendants to return no nodes
      vi.mocked(editor.view.state.doc.descendants).mockImplementation(() => {})

      const targets = dragOperationManager.getDropTargets('block-1')

      expect(targets).toEqual([])
    })

    it('should handle nodes without block IDs', () => {
      // Mock descendants with nodes that have no blockId
      vi.mocked(editor.view.state.doc.descendants).mockImplementation(callback => {
        const nodeWithoutId = { attrs: {} } as ProseMirrorNode
        callback(nodeWithoutId)
      })

      const targets = dragOperationManager.getDropTargets('block-1')

      expect(targets).toEqual([])
    })
  })
})
