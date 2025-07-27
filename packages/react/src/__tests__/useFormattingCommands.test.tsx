/**
 * useFormattingCommands Hook 测试
 */

import { act, renderHook } from '@testing-library/react'
import type { Editor } from '@tiptap/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useFormattingCommands } from '../useFormattingCommands.js'

// Create persistent chain methods
const mockChainMethods = {
  run: vi.fn(),
  toggleBold: vi.fn().mockReturnValue({ run: vi.fn() }),
  toggleItalic: vi.fn().mockReturnValue({ run: vi.fn() }),
  toggleUnderline: vi.fn().mockReturnValue({ run: vi.fn() }),
  toggleStrike: vi.fn().mockReturnValue({ run: vi.fn() }),
  toggleCode: vi.fn().mockReturnValue({ run: vi.fn() }),
  setHeading: vi.fn().mockReturnValue({ run: vi.fn() }),
  setParagraph: vi.fn().mockReturnValue({ run: vi.fn() }),
  setBlockquote: vi.fn().mockReturnValue({ run: vi.fn() }),
  setCodeBlock: vi.fn().mockReturnValue({ run: vi.fn() }),
  toggleBulletList: vi.fn().mockReturnValue({ run: vi.fn() }),
  toggleOrderedList: vi.fn().mockReturnValue({ run: vi.fn() }),
}

// Create persistent chain object
const mockChain = {
  focus: vi.fn().mockReturnValue(mockChainMethods),
  ...mockChainMethods,
}

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

vi.mock('../Context.js', () => ({
  useCurrentEditor: vi.fn(() => ({ editor: mockEditor })),
}))

describe('useFormattingCommands', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
  })

  it('应该能够执行setHeading命令', () => {
    const { result } = renderHook(() => useFormattingCommands())

    act(() => {
      result.current.setHeading(2)
    })

    expect(mockChainMethods.setHeading).toHaveBeenCalledWith({ level: 2 })
  })

  it('应该能够动态执行命令', () => {
    const { result } = renderHook(() => useFormattingCommands())

    act(() => {
      result.current.executeCommand('toggleBold')
    })

    expect(mockChainMethods.toggleBold).toHaveBeenCalled()
  })
})
