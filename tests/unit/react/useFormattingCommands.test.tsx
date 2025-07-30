/**
 * useFormattingCommands Hook 测试
 */

import { act, renderHook } from '@testing-library/react'
import type { Editor } from '@tiptap/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the local Context file - this is where useCurrentEditor is actually imported from
vi.mock('../../../packages/react/src/Context.tsx', async () => {
  const actual = await vi.importActual('../../../packages/react/src/Context.tsx') as any
  return {
    ...actual,
    useCurrentEditor: vi.fn(),
  }
})

// Import the hook from the source files
import { useFormattingCommands } from '../../../packages/react/src/useFormattingCommands'
import { useCurrentEditor } from '../../../packages/react/src/Context'

// Create shared run function to track command execution
const mockRun = vi.fn()

// Create the focused chain methods that will be returned by focus()
const mockFocusedChain = {
  run: mockRun,
  toggleBold: vi.fn().mockReturnValue({ run: mockRun }),
  toggleItalic: vi.fn().mockReturnValue({ run: mockRun }),
  toggleUnderline: vi.fn().mockReturnValue({ run: mockRun }),
  toggleStrike: vi.fn().mockReturnValue({ run: mockRun }),
  toggleCode: vi.fn().mockReturnValue({ run: mockRun }),
  setHeading: vi.fn().mockReturnValue({ run: mockRun }),
  setParagraph: vi.fn().mockReturnValue({ run: mockRun }),
  setBlockquote: vi.fn().mockReturnValue({ run: mockRun }),
  setCodeBlock: vi.fn().mockReturnValue({ run: mockRun }),
  toggleBulletList: vi.fn().mockReturnValue({ run: mockRun }),
  toggleOrderedList: vi.fn().mockReturnValue({ run: mockRun }),
}

// Create the main chain object
const mockChain = {
  focus: vi.fn().mockReturnValue(mockFocusedChain),
  ...mockFocusedChain,
}

// For backward compatibility, keep the old reference name
const mockChainMethods = mockFocusedChain

const mockEditor = {
  chain: vi.fn().mockReturnValue(mockChain),
  can: vi.fn().mockReturnValue({
    chain: vi.fn().mockReturnValue({
      focus: vi.fn().mockReturnValue({
        toggleBold: true,
        toggleItalic: true,
        setHeading: true,
      }),
    }),
  }),
} as unknown as Editor

describe('useFormattingCommands', () => {
  beforeEach(() => {
    // Don't clear all mocks as it resets our module mock
    // vi.clearAllMocks()
    mockRun.mockClear()
    
    // Reset individual mock functions but keep the module mock
    Object.values(mockChainMethods).forEach((mock: any) => {
      if (typeof mock === 'function' && mock.mockClear) {
        mock.mockClear()
      }
    })
    
    // Set up the mock return value for each test
    vi.mocked(useCurrentEditor).mockReturnValue({ editor: mockEditor })
  })

  it('应该返回所有格式化命令', () => {
    const { result } = renderHook(() => useFormattingCommands())

    expect(result.current.toggleBold).toBeDefined()
    expect(result.current.toggleItalic).toBeDefined()
    expect(result.current.setHeading).toBeDefined()
    expect(result.current.setParagraph).toBeDefined()
    expect(result.current.canExecuteCommand).toBeDefined()
    expect(result.current.executeCommand).toBeDefined()
  })

  it('应该能够执行toggleBold命令', () => {
    const { result } = renderHook(() => useFormattingCommands())

    act(() => {
      result.current.toggleBold()
    })

    expect(mockChainMethods.toggleBold).toHaveBeenCalled()
    expect(mockRun).toHaveBeenCalled()
  })

  it('当editor为null时应该安全退出', () => {
    // Reset mock to return null editor
    vi.mocked(useCurrentEditor).mockReturnValue({ editor: null })
    
    const { result } = renderHook(() => useFormattingCommands())

    act(() => {
      result.current.toggleBold()
    })

    // Should not call any mock methods when editor is null
    expect(mockChainMethods.toggleBold).not.toHaveBeenCalled()
    expect(mockRun).not.toHaveBeenCalled()
  })

  it('应该能够执行setHeading命令', () => {
    const { result } = renderHook(() => useFormattingCommands())

    act(() => {
      result.current.setHeading(2)
    })

    expect(mockChainMethods.setHeading).toHaveBeenCalledWith({ level: 2 })
    expect(mockRun).toHaveBeenCalled()
  })

  it('应该能够动态执行命令', () => {
    const { result } = renderHook(() => useFormattingCommands())

    act(() => {
      result.current.executeCommand('toggleBold')
    })

    expect(mockChainMethods.toggleBold).toHaveBeenCalled()
    expect(mockRun).toHaveBeenCalled()
  })
})
