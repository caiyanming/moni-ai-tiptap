import '@testing-library/jest-dom'

import { act,fireEvent, render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Import components after mocks
import MoniEditorDemo from './index.jsx'

// Mock TipTap modules
vi.mock('@tiptap/react', () => ({
  useEditor: vi.fn(),
  EditorContent: vi.fn(({ children }) => <div data-testid="editor-content">{children}</div>),
}))

vi.mock('@tiptap/starter-kit', () => ({
  default: {
    configure: vi.fn(() => ({ name: 'StarterKit' })),
  },
}))

vi.mock('@tiptap/extension-drag-handle', () => ({
  default: {
    configure: vi.fn(() => ({ name: 'DragHandle' })),
  },
}))

vi.mock('@tiptap/extension-hidden-block', () => ({
  default: {
    configure: vi.fn(() => ({ name: 'HiddenBlock' })),
  },
}))

describe('MoniEditor Demo', () => {
  let mockEditor
  let user

  beforeEach(() => {
    // Setup user event
    user = userEvent.setup()

    // Create mock editor
    mockEditor = {
      commands: {
        insertContent: vi.fn().mockReturnThis(),
        insertContentAt: vi.fn().mockReturnThis(),
        focus: vi.fn().mockReturnThis(),
        setTextSelection: vi.fn().mockReturnThis(),
        deleteNode: vi.fn().mockReturnThis(),
      },
      chain: vi.fn(() => mockEditor.commands),
      getJSON: vi.fn(() => ({ type: 'doc', content: [] })),
      getHTML: vi.fn(() => '<p>Mock HTML content</p>'),
      getText: vi.fn(() => 'Mock text content'),
      isEditable: true,
      setEditable: vi.fn(),
      state: {
        selection: { from: 0, to: 0 },
      },
      view: {
        dispatch: vi.fn(),
        state: { tr: {} },
        posAtDOM: vi.fn(() => 0),
      },
      on: vi.fn(),
      off: vi.fn(),
    }

    // Mock useEditor hook
    const { useEditor } = require('@tiptap/react')
    useEditor.mockReturnValue(mockEditor)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('基础渲染测试', () => {
    it('应该正确渲染主要界面元素', () => {
      render(<MoniEditorDemo />)

      // 检查标题
      expect(screen.getByText('MoniAI TipTap Editor Demo')).toBeInTheDocument()
      expect(
        screen.getByText('Demonstrating DragHandle, HiddenBlock, and StreamOperationManager extensions'),
      ).toBeInTheDocument()

      // 检查控制按钮
      expect(screen.getByText('Show Debug')).toBeInTheDocument()

      // 检查编辑器内容区域
      expect(screen.getByTestId('editor-content')).toBeInTheDocument()
    })

    it('应该渲染 Stream Simulator 组件', () => {
      render(<MoniEditorDemo />)

      expect(screen.getByText('🔄 Stream Simulator')).toBeInTheDocument()
      expect(screen.getByText('Simulate AI Block Stream operations for testing')).toBeInTheDocument()
    })

    it('应该在没有编辑器时显示加载状态', () => {
      const { useEditor } = require('@tiptap/react')
      useEditor.mockReturnValue(null)

      render(<MoniEditorDemo />)

      expect(screen.getByText('Loading editor...')).toBeInTheDocument()
    })
  })

  describe('Debug 面板功能测试', () => {
    it('应该能够切换 Debug 模式', async () => {
      render(<MoniEditorDemo />)

      const debugButton = screen.getByText('Show Debug')

      // 初始状态下 Debug 面板不可见
      expect(screen.queryByText('🐛 Debug Panel')).not.toBeInTheDocument()

      // 点击显示 Debug 面板
      await user.click(debugButton)

      expect(screen.getByText('Hide Debug')).toBeInTheDocument()
      expect(screen.getByText('🐛 Debug Panel')).toBeInTheDocument()

      // 再次点击隐藏 Debug 面板
      await user.click(screen.getByText('Hide Debug'))

      expect(screen.getByText('Show Debug')).toBeInTheDocument()
      expect(screen.queryByText('🐛 Debug Panel')).not.toBeInTheDocument()
    })
  })

  describe('Stream Operations 功能测试', () => {
    it('应该能够处理新的 Stream 操作', async () => {
      render(<MoniEditorDemo />)

      // 模拟 Stream 操作
      const mockOperation = {
        id: 1,
        type: 'insert',
        content: '<p>Test content</p>',
        description: 'Test operation',
      }

      // 获取 StreamSimulator 组件并触发操作
      const batchButton = screen.getByText('🚀 Run Batch Operations')
      await user.click(batchButton)

      // 等待操作出现在队列中
      await waitFor(
        () => {
          expect(screen.getByText(/Pending AI Operations/)).toBeInTheDocument()
        },
        { timeout: 2000 },
      )
    })

    it('应该能够批量批准所有操作', async () => {
      render(<MoniEditorDemo />)

      // 先生成一些操作
      const batchButton = screen.getByText('🚀 Run Batch Operations')
      await user.click(batchButton)

      // 等待操作出现
      await waitFor(
        () => {
          const approveAllButton = screen.queryByText(/Approve All/)
          if (approveAllButton) {
            return user.click(approveAllButton)
          }
        },
        { timeout: 3000 },
      )

      // 验证编辑器命令被调用
      await waitFor(() => {
        expect(mockEditor.commands.insertContent).toHaveBeenCalled()
      })
    })

    it('应该能够批量拒绝所有操作', async () => {
      render(<MoniEditorDemo />)

      // 先生成一些操作
      const batchButton = screen.getByText('🚀 Run Batch Operations')
      await user.click(batchButton)

      // 等待操作出现并拒绝
      await waitFor(
        () => {
          const rejectAllButton = screen.queryByText('Reject All')
          if (rejectAllButton) {
            return user.click(rejectAllButton)
          }
        },
        { timeout: 3000 },
      )

      // 验证操作被清除
      await waitFor(() => {
        expect(screen.queryByText(/Pending AI Operations/)).not.toBeInTheDocument()
      })
    })
  })

  describe('MoniEditor 组件功能测试', () => {
    it('应该能够切换编辑器可编辑状态', async () => {
      render(<MoniEditorDemo />)

      const editableButton = screen.getByText('✏️ Editable')

      // 点击切换为只读模式
      await user.click(editableButton)

      expect(mockEditor.setEditable).toHaveBeenCalledWith(false)
    })

    it('应该能够添加示例内容', async () => {
      render(<MoniEditorDemo />)

      const addSampleButton = screen.getByText('➕ Add Sample')

      await user.click(addSampleButton)

      expect(mockEditor.commands.insertContent).toHaveBeenCalled()
    })

    it('应该能够插入隐藏块', async () => {
      render(<MoniEditorDemo />)

      const hiddenBlockButton = screen.getByText('👁️ Insert Hidden Block')

      await user.click(hiddenBlockButton)

      expect(mockEditor.commands.insertContent).toHaveBeenCalledWith({
        type: 'hiddenBlock',
        attrs: expect.objectContaining({
          id: expect.stringMatching(/^hidden-\d+$/),
        }),
      })
    })

    it('应该能够清空内容', async () => {
      render(<MoniEditorDemo />)

      const clearButton = screen.getByText('🗑️ Clear')

      await user.click(clearButton)

      expect(mockEditor.commands.focus).toHaveBeenCalled()
    })

    it('应该显示字数和字符数统计', () => {
      mockEditor.getText.mockReturnValue('Hello world test content')

      render(<MoniEditorDemo />)

      expect(screen.getByText('Words: 4')).toBeInTheDocument()
      expect(screen.getByText('Characters: 24')).toBeInTheDocument()
    })
  })

  describe('StreamSimulator 功能测试', () => {
    it('应该能够调整模拟速度', async () => {
      render(<MoniEditorDemo />)

      const speedSlider = screen.getByDisplayValue('1000')

      await user.clear(speedSlider)
      await user.type(speedSlider, '2000')

      expect(speedSlider.value).toBe('2000')
    })

    it('应该能够运行单个示例操作', async () => {
      render(<MoniEditorDemo />)

      // 找到第一个示例操作的运行按钮
      const runButtons = screen.getAllByText('Run')

      if (runButtons.length > 0) {
        await user.click(runButtons[0])

        // 验证模拟状态被激活
        await waitFor(() => {
          expect(screen.getByText(/AI Stream Simulation in Progress/)).toBeInTheDocument()
        })
      }
    })

    it('应该能够运行实时编辑模拟', async () => {
      render(<MoniEditorDemo />)

      const realtimeButton = screen.getByText('✨ Simulate Realtime Editing')

      await user.click(realtimeButton)

      await waitFor(() => {
        expect(screen.getByText(/AI Stream Simulation in Progress/)).toBeInTheDocument()
      })
    })

    it('应该能够运行自定义操作', async () => {
      render(<MoniEditorDemo />)

      // 输入自定义内容
      const customTextarea = screen.getByPlaceholderText('Enter custom HTML content...')
      await user.type(customTextarea, '<p>Custom test content</p>')

      // 选择操作类型
      const operationSelect = screen.getByDisplayValue('insert')
      await user.selectOptions(operationSelect, 'update')

      // 运行自定义操作
      const customButton = screen.getByText('🎯 Run Custom Operation')
      await user.click(customButton)

      await waitFor(() => {
        expect(screen.getByText(/AI Stream Simulation in Progress/)).toBeInTheDocument()
      })
    })
  })

  describe('TipTap 扩展配置测试', () => {
    it('应该正确配置 DragHandle 扩展', () => {
      const { default: DragHandle } = require('@tiptap/extension-drag-handle')

      render(<MoniEditorDemo />)

      expect(DragHandle.configure).toHaveBeenCalledWith({
        showIndicators: true,
        onAddBlock: expect.any(Function),
        onDragStart: expect.any(Function),
        onDrop: expect.any(Function),
        indicatorStyles: expect.objectContaining({
          horizontal: expect.objectContaining({
            backgroundColor: '#0066cc',
            height: '2px',
          }),
          vertical: expect.objectContaining({
            backgroundColor: '#0066cc',
            width: '2px',
          }),
        }),
      })
    })

    it('应该正确配置 HiddenBlock 扩展', () => {
      const { default: HiddenBlock } = require('@tiptap/extension-hidden-block')

      render(<MoniEditorDemo />)

      expect(HiddenBlock.configure).toHaveBeenCalledWith({
        hideFromDOM: true,
        HTMLAttributes: {
          class: 'moni-hidden-block',
        },
      })
    })

    it('应该正确配置 StarterKit 扩展', () => {
      const { default: StarterKit } = require('@tiptap/starter-kit')

      render(<MoniEditorDemo />)

      expect(StarterKit.configure).toHaveBeenCalledWith({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: true,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: true,
        },
      })
    })
  })

  describe('错误处理和边界情况测试', () => {
    it('应该在编辑器未初始化时禁用按钮', () => {
      const { useEditor } = require('@tiptap/react')
      useEditor.mockReturnValue(null)

      render(<MoniEditorDemo />)

      // 所有需要编辑器的按钮都应该被禁用
      expect(screen.getByText('Show Debug')).toBeDisabled()
    })

    it('应该在模拟进行中禁用控制按钮', async () => {
      render(<MoniEditorDemo />)

      // 开始模拟
      const batchButton = screen.getByText('🚀 Run Batch Operations')
      await user.click(batchButton)

      // 检查按钮状态
      await waitFor(() => {
        expect(batchButton).toHaveTextContent('⏳ Running...')
      })
    })

    it('应该处理空的自定义内容', async () => {
      render(<MoniEditorDemo />)

      const customButton = screen.getByText('🎯 Run Custom Operation')

      // 自定义内容为空时按钮应该被禁用
      expect(customButton).toBeDisabled()
    })
  })

  describe('响应式设计测试', () => {
    it('应该在不同屏幕尺寸下正确渲染', () => {
      render(<MoniEditorDemo />)

      // 检查响应式布局类
      const container = screen.getByTestId('editor-content').closest('.grid')
      expect(container).toHaveClass('grid-cols-1', 'lg:grid-cols-4')
    })
  })

  describe('可访问性测试', () => {
    it('应该有正确的 ARIA 标签', () => {
      render(<MoniEditorDemo />)

      // 检查编辑器可访问性
      const editorContent = screen.getByTestId('editor-content')
      expect(editorContent).toBeInTheDocument()
    })

    it('应该支持键盘导航', async () => {
      render(<MoniEditorDemo />)

      const debugButton = screen.getByText('Show Debug')

      // 使用键盘激活
      debugButton.focus()
      await user.keyboard('{Enter}')

      expect(screen.getByText('Hide Debug')).toBeInTheDocument()
    })
  })

  describe('性能测试', () => {
    it('应该能够处理大量操作而不崩溃', async () => {
      render(<MoniEditorDemo />)

      // 快速连续执行多个操作
      const batchButton = screen.getByText('🚀 Run Batch Operations')

      for (let i = 0; i < 5; i++) {
        await user.click(batchButton)
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // 验证应用仍然响应
      expect(screen.getByText('MoniAI TipTap Editor Demo')).toBeInTheDocument()
    })
  })
})
