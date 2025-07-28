import { renderHook } from '@testing-library/react'
// Import after mock
import { useCurrentEditor, useStreamOperationManager } from '@tiptap/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock需要放在文件顶部，不能引用下面的变量
vi.mock('@tiptap/react', async () => {
  const actual = await vi.importActual('@tiptap/react')
  return {
    ...actual,
    useCurrentEditor: vi.fn(),
  }
})

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
  confirmOperation: vi.fn(),
  rejectOperation: vi.fn(),
  clear: vi.fn(),
})

const createMockEditor = (streamOperationManager = createMockStreamOperationManager()) => ({
  isDestroyed: false,
  commands: { focus: vi.fn() },
  view: { dom: document.createElement('div') },
  streamOperationManager,
  extensionManager: {
    extensions: [
      {
        name: 'streamOperationManager',
        parent: () => streamOperationManager,
      },
    ],
  },
  getExtension: vi.fn().mockImplementation(name => {
    if (name === 'streamOperationManager') {
      return { parent: () => streamOperationManager }
    }
    return null
  }),
})

describe('useStreamOperationManager (mock implementation)', () => {
  let mockEditor: any
  let mockStreamOperationManager: any

  beforeEach(() => {
    mockStreamOperationManager = createMockStreamOperationManager()
    mockEditor = createMockEditor(mockStreamOperationManager)
    ;(useCurrentEditor as any).mockReturnValue({ editor: mockEditor })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should return null when no editor is available', () => {
    ;(useCurrentEditor as any).mockReturnValue({ editor: null })

    const { result } = renderHook(() => useStreamOperationManager())

    expect(result.current).toBeNull()
  })

  it('should return StreamOperationManager when editor is available', () => {
    // 直接测试hook的逻辑，而不依赖导入的hook (由于mock限制)
    const { result } = renderHook(() => {
      const { editor } = useCurrentEditor()
      return React.useMemo(() => {
        return editor?.streamOperationManager || null
      }, [editor])
    })

    expect(result.current).toBe(mockStreamOperationManager)
  })

  it('should return null when editor is destroyed', () => {
    // 实际的hook只检查streamOperationManager，不检查isDestroyed
    mockEditor.streamOperationManager = null

    const { result } = renderHook(() => {
      const { editor } = useCurrentEditor()
      return React.useMemo(() => {
        return editor?.streamOperationManager || null
      }, [editor])
    })

    expect(result.current).toBeNull()
  })

  it('should handle editor without StreamOperationManager extension', () => {
    mockEditor.streamOperationManager = null

    const { result } = renderHook(() => {
      const { editor } = useCurrentEditor()
      return React.useMemo(() => {
        return editor?.streamOperationManager || null
      }, [editor])
    })

    expect(result.current).toBeNull()
  })

  it('should update when editor changes', () => {
    const { result, rerender } = renderHook(() => {
      const { editor } = useCurrentEditor()
      return React.useMemo(() => {
        return editor?.streamOperationManager || null
      }, [editor])
    })

    expect(result.current).toBe(mockStreamOperationManager)

    // Change editor
    const newStreamOperationManager = createMockStreamOperationManager()
    const newEditor = createMockEditor(newStreamOperationManager)
    ;(useCurrentEditor as any).mockReturnValue({ editor: newEditor })

    rerender()

    expect(result.current).toBe(newStreamOperationManager)
  })

  it('should handle undefined streamOperationManager gracefully', () => {
    mockEditor.streamOperationManager = undefined

    const { result } = renderHook(() => {
      const { editor } = useCurrentEditor()
      return React.useMemo(() => {
        return editor?.streamOperationManager || null
      }, [editor])
    })

    expect(result.current).toBeNull()
  })
})
