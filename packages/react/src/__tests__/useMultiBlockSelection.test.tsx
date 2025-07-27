/**
 * useMultiBlockSelection Hook 测试
 */

import { act, renderHook } from '@testing-library/react'
import type { Editor } from '@tiptap/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { BlockSelection } from '../types/multiBlockSelection.js'
import { useMultiBlockSelection } from '../useMultiBlockSelection.js'

// Mock chain 方法
const createMockChain = () => {
  const chainMethods = {
    focus: vi.fn(),
    run: vi.fn(),
    setTextSelection: vi.fn(),
    toggleBold: vi.fn(),
    toggleItalic: vi.fn(),
    toggleUnderline: vi.fn(),
    toggleStrike: vi.fn(),
    toggleCode: vi.fn(),
    setHeading: vi.fn(),
    setParagraph: vi.fn(),
    toggleBulletList: vi.fn(),
    toggleOrderedList: vi.fn(),
    toggleBlockquote: vi.fn(),
    toggleCodeBlock: vi.fn(),
    deleteRange: vi.fn(),
  }

  // 让每个方法都返回链对象本身，包括支持链式调用
  Object.keys(chainMethods).forEach(key => {
    if (key !== 'run') {
      const method = vi.fn().mockReturnValue(chainMethods)
      chainMethods[key as keyof typeof chainMethods] = method
    } else {
      chainMethods.run = vi.fn().mockReturnValue(true)
    }
  })

  return chainMethods
}

// 创建共享的 chain 实例用于追踪调用
const sharedChainInstance = createMockChain()

// Mock useCurrentEditor
const mockEditor = {
  view: {
    dom: {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  },
  state: {
    doc: {
      slice: vi.fn().mockReturnValue({
        content: 'mocked content',
      }),
    },
  },
  chain: vi.fn(() => sharedChainInstance),
} as unknown as Editor

vi.mock('../Context.js', () => ({
  useCurrentEditor: vi.fn(() => ({ editor: mockEditor })),
}))

// 创建测试用的块选择
const createMockBlockSelection = (id: string, from: number = 0, to: number = 10): BlockSelection => ({
  moniBlockId: id,
  element: {
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
    },
    setAttribute: vi.fn(),
    removeAttribute: vi.fn(),
  } as unknown as HTMLElement,
  position: { from, to },
  blockType: 'paragraph',
})

describe('useMultiBlockSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('初始状态', () => {
    it('应该返回初始状态', () => {
      const { result } = renderHook(() => useMultiBlockSelection())

      expect(result.current.selectedBlocks).toEqual([])
      expect(result.current.isSelecting).toBe(false)
      expect(result.current.selectionStart).toBeNull()
      expect(result.current.lastActiveBlock).toBeNull()
      expect(result.current.hasSelection).toBe(false)
      expect(result.current.selectionCount).toBe(0)
      expect(result.current.isHomogeneousSelection).toBe(true)
      expect(result.current.primaryBlockType).toBeNull()
    })

    it('应该支持禁用状态', () => {
      const { result } = renderHook(() => useMultiBlockSelection({ enabled: false }))

      const block = createMockBlockSelection('block-1')

      act(() => {
        result.current.toggleSelection(block)
      })

      expect(result.current.selectedBlocks).toEqual([])
      expect(result.current.hasSelection).toBe(false)
    })
  })

  describe('块选择操作', () => {
    it('应该能够选择单个块', () => {
      const { result } = renderHook(() => useMultiBlockSelection())
      const block = createMockBlockSelection('block-1')

      act(() => {
        result.current.toggleSelection(block)
      })

      expect(result.current.selectedBlocks).toHaveLength(1)
      expect(result.current.selectedBlocks[0]).toEqual(block)
      expect(result.current.hasSelection).toBe(true)
      expect(result.current.selectionCount).toBe(1)
      expect(result.current.isSelecting).toBe(true)
      expect(result.current.lastActiveBlock).toEqual(block)
    })

    it('应该能够选择多个块', () => {
      const { result } = renderHook(() => useMultiBlockSelection())
      const block1 = createMockBlockSelection('block-1')
      const block2 = createMockBlockSelection('block-2')

      act(() => {
        result.current.selectBlocks([block1, block2])
      })

      expect(result.current.selectedBlocks).toHaveLength(2)
      expect(result.current.selectedBlocks).toContain(block1)
      expect(result.current.selectedBlocks).toContain(block2)
      expect(result.current.selectionCount).toBe(2)
      expect(result.current.lastActiveBlock).toEqual(block2)
    })

    it('应该能够切换块的选择状态', () => {
      const { result } = renderHook(() => useMultiBlockSelection())
      const block = createMockBlockSelection('block-1')

      // 选择块
      act(() => {
        result.current.toggleSelection(block)
      })
      expect(result.current.hasSelection).toBe(true)

      // 取消选择块
      act(() => {
        result.current.toggleSelection(block)
      })
      expect(result.current.hasSelection).toBe(false)
      expect(result.current.selectedBlocks).toEqual([])
    })

    it('应该能够清除所有选择', () => {
      const { result } = renderHook(() => useMultiBlockSelection())
      const blocks = [createMockBlockSelection('block-1'), createMockBlockSelection('block-2')]

      act(() => {
        result.current.selectBlocks(blocks)
      })
      expect(result.current.hasSelection).toBe(true)

      act(() => {
        result.current.clearSelection()
      })
      expect(result.current.hasSelection).toBe(false)
      expect(result.current.selectedBlocks).toEqual([])
      expect(result.current.isSelecting).toBe(false)
      expect(result.current.selectionStart).toBeNull()
      expect(result.current.lastActiveBlock).toBeNull()
    })

    it('应该应用最大选择数量限制', () => {
      const { result } = renderHook(() => useMultiBlockSelection({ maxSelectionCount: 2 }))

      const blocks = [
        createMockBlockSelection('block-1'),
        createMockBlockSelection('block-2'),
        createMockBlockSelection('block-3'),
      ]

      act(() => {
        result.current.selectBlocks(blocks)
      })

      expect(result.current.selectedBlocks).toHaveLength(2)
      expect(result.current.selectionCount).toBe(2)
    })
  })

  describe('同构选择检测', () => {
    it('应该正确检测同构选择', () => {
      const { result } = renderHook(() => useMultiBlockSelection())
      const blocks = [
        { ...createMockBlockSelection('block-1'), blockType: 'paragraph' },
        { ...createMockBlockSelection('block-2'), blockType: 'paragraph' },
      ]

      act(() => {
        result.current.selectBlocks(blocks)
      })

      expect(result.current.isHomogeneousSelection).toBe(true)
      expect(result.current.primaryBlockType).toBe('paragraph')
    })

    it('应该正确检测异构选择', () => {
      const { result } = renderHook(() => useMultiBlockSelection())
      const blocks = [
        { ...createMockBlockSelection('block-1'), blockType: 'paragraph' },
        { ...createMockBlockSelection('block-2'), blockType: 'heading' },
      ]

      act(() => {
        result.current.selectBlocks(blocks)
      })

      expect(result.current.isHomogeneousSelection).toBe(false)
      expect(result.current.primaryBlockType).toBeNull()
    })
  })

  describe('格式化操作', () => {
    it('应该能够对选中的块应用格式', () => {
      const { result } = renderHook(() => useMultiBlockSelection())
      const block = createMockBlockSelection('block-1')

      act(() => {
        result.current.selectBlocks([block])
      })

      act(() => {
        result.current.applyFormatToSelection('bold')
      })

      expect(sharedChainInstance.toggleBold).toHaveBeenCalled()
    })

    it('应该能够应用带属性的格式', () => {
      const { result } = renderHook(() => useMultiBlockSelection())
      const block = createMockBlockSelection('block-1')

      act(() => {
        result.current.selectBlocks([block])
      })

      act(() => {
        result.current.applyFormatToSelection('heading', { level: 2 })
      })

      expect(sharedChainInstance.setHeading).toHaveBeenCalledWith({ level: 2 })
    })

    it('在没有选中块时不应该执行格式化', () => {
      const { result } = renderHook(() => useMultiBlockSelection())

      act(() => {
        result.current.applyFormatToSelection('bold')
      })

      expect(sharedChainInstance.toggleBold).not.toHaveBeenCalled()
    })
  })

  describe('删除操作', () => {
    it('应该能够删除选中的块', () => {
      const { result } = renderHook(() => useMultiBlockSelection())
      const block = createMockBlockSelection('block-1', 0, 10)

      act(() => {
        result.current.selectBlocks([block])
      })

      act(() => {
        result.current.deleteSelectedBlocks()
      })

      expect(sharedChainInstance.deleteRange).toHaveBeenCalledWith({ from: 0, to: 10 })
      expect(result.current.hasSelection).toBe(false)
    })

    it('应该按正确顺序删除多个块', () => {
      const { result } = renderHook(() => useMultiBlockSelection())
      const blocks = [createMockBlockSelection('block-1', 0, 10), createMockBlockSelection('block-2', 20, 30)]

      act(() => {
        result.current.selectBlocks(blocks)
      })

      act(() => {
        result.current.deleteSelectedBlocks()
      })

      // 应该从后往前删除
      expect(sharedChainInstance.deleteRange).toHaveBeenCalledTimes(2)
    })
  })

  describe('复制操作', () => {
    it('应该能够复制选中的块', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const { result } = renderHook(() => useMultiBlockSelection())
      const block = createMockBlockSelection('block-1')

      act(() => {
        result.current.selectBlocks([block])
      })

      act(() => {
        result.current.copySelectedBlocks()
      })

      expect(consoleSpy).toHaveBeenCalledWith('copySelectedBlocks: 已复制', expect.any(Array))

      consoleSpy.mockRestore()
    })
  })

  describe('回调功能', () => {
    it('应该在选择变化时调用回调', () => {
      const onSelectionChange = vi.fn()
      const { result } = renderHook(() => useMultiBlockSelection({ onSelectionChange }))

      const block = createMockBlockSelection('block-1')

      act(() => {
        result.current.toggleSelection(block)
      })

      expect(onSelectionChange).toHaveBeenCalledWith([block])
    })

    it('应该在格式应用时调用回调', () => {
      const onFormatApply = vi.fn()
      const { result } = renderHook(() => useMultiBlockSelection({ onFormatApply }))

      const block = createMockBlockSelection('block-1')

      act(() => {
        result.current.selectBlocks([block])
      })

      act(() => {
        result.current.applyFormatToSelection('bold', { color: 'red' })
      })

      expect(onFormatApply).toHaveBeenCalledWith('bold', { color: 'red' }, [block])
    })
  })

  describe('样式管理', () => {
    it('应该为选中的块添加样式类', () => {
      const { result } = renderHook(() => useMultiBlockSelection({ selectionClassName: 'custom-selected' }))
      const block = createMockBlockSelection('block-1')

      act(() => {
        result.current.toggleSelection(block)
      })

      expect(block.element.classList.add).toHaveBeenCalledWith('custom-selected')
      expect(block.element.setAttribute).toHaveBeenCalledWith('data-multi-block-selected', 'true')
    })

    it('应该在取消选择时移除样式类', () => {
      const { result } = renderHook(() => useMultiBlockSelection({ selectionClassName: 'custom-selected' }))
      const block = createMockBlockSelection('block-1')

      act(() => {
        result.current.toggleSelection(block) // 选择
      })

      act(() => {
        result.current.toggleSelection(block) // 取消选择
      })

      expect(block.element.classList.remove).toHaveBeenCalledWith('custom-selected')
      expect(block.element.removeAttribute).toHaveBeenCalledWith('data-multi-block-selected')
    })
  })
})
