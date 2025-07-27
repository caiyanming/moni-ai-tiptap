import { renderHook } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useStreamOperationManager } from '../../packages/react/src/useStreamOperationManager.js'

// Mock the Context module
const mockUseCurrentEditor = vi.fn()
vi.mock('../../packages/react/src/Context.js', () => ({
  useCurrentEditor: () => mockUseCurrentEditor(),
}))

// Mock StreamOperationManager based on actual interface
const createMockStreamOperationManager = () => ({
  queueOperation: vi.fn(),
  queueOperations: vi.fn(),
  getPendingOperations: vi
    .fn()
    .mockReturnValue([
      { attrs: { moniOperationId: 'op-1', moniBlockId: 'block-1' } },
      { attrs: { moniOperationId: 'op-2', moniBlockId: 'block-2' } },
    ]),
  getAllDiffOperations: vi.fn().mockReturnValue([]),
  approveOperation: vi.fn(),
  rejectOperation: vi.fn(),
  approveAllOperations: vi.fn(),
  rejectAllOperations: vi.fn(),
  clearAllOperations: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  getQueueStatus: vi.fn().mockReturnValue({
    pending: 2,
    processing: 0,
    total: 2,
    isPaused: false,
  }),
  destroy: vi.fn(),
})

// Mock Editor
const createMockEditor = (withStreamManager = true) => ({
  streamOperationManager: withStreamManager ? createMockStreamOperationManager() : undefined,
  isDestroyed: false,
  view: {
    state: {},
    dispatch: vi.fn(),
  },
})

// Helper function to render components (mock implementation) - moved before usage
function renderTestComponent() {
  const container = document.createElement('div')
  document.body.appendChild(container)

  // Simple mock render - in real tests you'd use @testing-library/react
  const getByTestId = (testId: string) => {
    const element = container.querySelector(`[data-testid="${testId}"]`)
    if (!element) {
      throw new Error(`Element with testid "${testId}" not found`)
    }
    return {
      textContent: element.textContent,
      click: () => {
        const event = new MouseEvent('click', { bubbles: true })
        element.dispatchEvent(event)
      },
    }
  }

  // Mock ReactDOM.render behavior
  const mockRender = () => {
    // This is a simplified mock - real implementation would use React's renderer
    container.innerHTML = '<div data-testid="mock-render">Mocked component</div>'
  }

  mockRender()

  return {
    container,
    getByTestId,
    rerender: () => mockRender(),
  }
}

describe('useStreamOperationManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Hook 基础功能', () => {
    it('should return null when editor is null', () => {
      mockUseCurrentEditor.mockReturnValue({ editor: null })

      const { result } = renderHook(() => useStreamOperationManager())

      expect(result.current).toBeNull()
    })

    it('should return null when editor is undefined', () => {
      mockUseCurrentEditor.mockReturnValue({ editor: undefined })

      const { result } = renderHook(() => useStreamOperationManager())

      expect(result.current).toBeNull()
    })

    it('should return streamOperationManager when editor exists', () => {
      const mockEditor = createMockEditor()
      mockUseCurrentEditor.mockReturnValue({ editor: mockEditor })

      const { result } = renderHook(() => useStreamOperationManager())

      expect(result.current).toBe(mockEditor.streamOperationManager)
      expect(result.current).not.toBeNull()
    })

    it('should return null when editor exists but has no streamOperationManager', () => {
      const mockEditor = createMockEditor(false) // no stream manager
      mockUseCurrentEditor.mockReturnValue({ editor: mockEditor })

      const { result } = renderHook(() => useStreamOperationManager())

      expect(result.current).toBeNull()
    })

    it('should memoize result correctly', () => {
      const mockEditor = createMockEditor()
      mockUseCurrentEditor.mockReturnValue({ editor: mockEditor })

      const { result, rerender } = renderHook(() => useStreamOperationManager())

      const firstResult = result.current

      // Rerender with same editor
      rerender()

      expect(result.current).toBe(firstResult)
      expect(result.current).toBe(mockEditor.streamOperationManager)
    })
  })

  describe('编辑器状态变化', () => {
    it('should update when editor changes', () => {
      const mockEditor1 = createMockEditor()
      const mockEditor2 = createMockEditor()

      mockUseCurrentEditor.mockReturnValue({ editor: mockEditor1 })

      const { result, rerender } = renderHook(() => useStreamOperationManager())

      expect(result.current).toBe(mockEditor1.streamOperationManager)

      // Change editor
      mockUseCurrentEditor.mockReturnValue({ editor: mockEditor2 })
      rerender()

      expect(result.current).toBe(mockEditor2.streamOperationManager)
      expect(result.current).not.toBe(mockEditor1.streamOperationManager)
    })

    it('should handle editor destruction', () => {
      const mockEditor = createMockEditor()
      mockUseCurrentEditor.mockReturnValue({ editor: mockEditor })

      const { result, rerender } = renderHook(() => useStreamOperationManager())

      expect(result.current).toBe(mockEditor.streamOperationManager)

      // Destroy editor
      mockUseCurrentEditor.mockReturnValue({ editor: null })
      rerender()

      expect(result.current).toBeNull()
    })

    it('should handle editor without streamOperationManager', () => {
      const mockEditor1 = createMockEditor()
      const mockEditor2 = createMockEditor(false)

      mockUseCurrentEditor.mockReturnValue({ editor: mockEditor1 })

      const { result, rerender } = renderHook(() => useStreamOperationManager())

      expect(result.current).toBe(mockEditor1.streamOperationManager)

      // Change to editor without stream manager
      mockUseCurrentEditor.mockReturnValue({ editor: mockEditor2 })
      rerender()

      expect(result.current).toBeNull()
    })
  })

  describe('Stream Operation API', () => {
    let mockStreamManager: ReturnType<typeof createMockStreamOperationManager>

    beforeEach(() => {
      mockStreamManager = createMockStreamOperationManager()
      const mockEditor = createMockEditor()
      mockEditor.streamOperationManager = mockStreamManager
      mockUseCurrentEditor.mockReturnValue({ editor: mockEditor })
    })

    it('should expose getPendingOperations method', () => {
      const { result } = renderHook(() => useStreamOperationManager())

      const pendingOps = result.current?.getPendingOperations()

      expect(pendingOps).toEqual([
        { attrs: { moniOperationId: 'op-1', moniBlockId: 'block-1' } },
        { attrs: { moniOperationId: 'op-2', moniBlockId: 'block-2' } },
      ])
      expect(mockStreamManager.getPendingOperations).toHaveBeenCalled()
    })

    it('should expose approveOperation method', () => {
      const { result } = renderHook(() => useStreamOperationManager())

      result.current?.approveOperation('op-1')

      expect(mockStreamManager.approveOperation).toHaveBeenCalledWith('op-1')
    })

    it('should expose rejectOperation method', () => {
      const { result } = renderHook(() => useStreamOperationManager())

      result.current?.rejectOperation('op-2')

      expect(mockStreamManager.rejectOperation).toHaveBeenCalledWith('op-2')
    })

    it('should expose clearAllOperations method', () => {
      const { result } = renderHook(() => useStreamOperationManager())

      result.current?.clearAllOperations()

      expect(mockStreamManager.clearAllOperations).toHaveBeenCalled()
    })

    it('should expose queueOperation method', () => {
      const { result } = renderHook(() => useStreamOperationManager())
      const mockOperation = {
        moniOperationId: 'op-3',
        moniStreamId: 'stream-1',
        moniBlockId: 'block-3',
        type: 'insert',
        content: { text: 'test' },
        timestamp: Date.now(),
        status: 'pending',
      }

      result.current?.queueOperation(mockOperation as any)

      expect(mockStreamManager.queueOperation).toHaveBeenCalledWith(mockOperation)
    })

    it('should expose queue management methods', () => {
      const { result } = renderHook(() => useStreamOperationManager())

      // Approve all
      result.current?.approveAllOperations()
      expect(mockStreamManager.approveAllOperations).toHaveBeenCalled()

      // Reject all
      result.current?.rejectAllOperations()
      expect(mockStreamManager.rejectAllOperations).toHaveBeenCalled()

      // Pause/Resume
      result.current?.pause()
      expect(mockStreamManager.pause).toHaveBeenCalled()

      result.current?.resume()
      expect(mockStreamManager.resume).toHaveBeenCalled()
    })

    it('should expose getQueueStatus method', () => {
      const { result } = renderHook(() => useStreamOperationManager())

      const status = result.current?.getQueueStatus()

      expect(status).toEqual({
        pending: 2,
        processing: 0,
        total: 2,
        isPaused: false,
      })
      expect(mockStreamManager.getQueueStatus).toHaveBeenCalled()
    })

    it('should handle method calls when streamManager is null', () => {
      mockUseCurrentEditor.mockReturnValue({ editor: null })

      const { result } = renderHook(() => useStreamOperationManager())

      // Should not throw when calling methods on null
      expect(() => {
        result.current?.getPendingOperations()
        result.current?.approveOperation('op-1')
        result.current?.clearAllOperations()
      }).not.toThrow()

      // Methods should not be called since streamManager is null
      expect(mockStreamManager.getPendingOperations).not.toHaveBeenCalled()
      expect(mockStreamManager.approveOperation).not.toHaveBeenCalled()
      expect(mockStreamManager.clearAllOperations).not.toHaveBeenCalled()
    })
  })

  describe('实际使用场景', () => {
    it('should work with typical component usage pattern', () => {
      const mockEditor = createMockEditor()
      mockUseCurrentEditor.mockReturnValue({ editor: mockEditor })

      const TestComponent = () => {
        const streamManager = useStreamOperationManager()

        // Typical usage patterns
        const pendingOps = streamManager?.getPendingOperations() || []

        const handleApprove = (operationId: string) => {
          streamManager?.approveOperation(operationId)
        }

        return (
          <div>
            <div data-testid="pending-count">{pendingOps.length}</div>
            <button data-testid="approve-btn" onClick={() => handleApprove('op-1')}>
              Approve
            </button>
          </div>
        )
      }

      const { getByTestId } = renderTestComponent(<TestComponent />)

      expect(getByTestId('pending-count')).toHaveTextContent('2')

      // Click approve button
      getByTestId('approve-btn').click()

      expect(mockEditor.streamOperationManager.approveOperation).toHaveBeenCalledWith('op-1')
    })

    it('should handle conditional rendering based on manager availability', () => {
      const TestComponent = () => {
        const streamManager = useStreamOperationManager()

        if (!streamManager) {
          return <div data-testid="no-manager">No stream manager</div>
        }

        return <div data-testid="has-manager">Stream manager available</div>
      }

      // Test with no editor
      mockUseCurrentEditor.mockReturnValue({ editor: null })
      const { getByTestId, rerender } = renderTestComponent(<TestComponent />)

      expect(getByTestId('no-manager')).toBeInTheDocument()

      // Test with editor
      const mockEditor = createMockEditor()
      mockUseCurrentEditor.mockReturnValue({ editor: mockEditor })
      rerender(<TestComponent />)

      expect(getByTestId('has-manager')).toBeInTheDocument()
    })
  })

  describe('性能和内存管理', () => {
    it('should not create new objects on every render', () => {
      const mockEditor = createMockEditor()
      mockUseCurrentEditor.mockReturnValue({ editor: mockEditor })

      const { result, rerender } = renderHook(() => useStreamOperationManager())

      const firstRender = result.current

      // Multiple rerenders with same editor
      rerender()
      rerender()
      rerender()

      expect(result.current).toBe(firstRender)
      expect(result.current).toBe(mockEditor.streamOperationManager)
    })

    it('should handle rapid editor changes', () => {
      const mockEditor1 = createMockEditor()
      const mockEditor2 = createMockEditor()
      const mockEditor3 = createMockEditor()

      mockUseCurrentEditor.mockReturnValue({ editor: mockEditor1 })
      const { result, rerender } = renderHook(() => useStreamOperationManager())

      expect(result.current).toBe(mockEditor1.streamOperationManager)

      // Rapid changes
      mockUseCurrentEditor.mockReturnValue({ editor: mockEditor2 })
      rerender()
      expect(result.current).toBe(mockEditor2.streamOperationManager)

      mockUseCurrentEditor.mockReturnValue({ editor: mockEditor3 })
      rerender()
      expect(result.current).toBe(mockEditor3.streamOperationManager)

      mockUseCurrentEditor.mockReturnValue({ editor: null })
      rerender()
      expect(result.current).toBeNull()
    })
  })
})
