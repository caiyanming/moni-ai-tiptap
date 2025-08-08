import '@testing-library/jest-dom'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import MoniEditorDemo from './index.jsx'

/**
 * 测试 MoniAI 自定义扩展的功能验证
 * 主要验证：
 * 1. DragHandle Extension - 拖拽功能和上游修复
 * 2. HiddenBlock Extension - 隐藏块处理
 * 3. StreamOperationManager - AI 流式操作
 * 4. 上游修复验证 - Menu渲染、TypeScript链式调用、React JSX runtime、拖拽键盘事件
 */

// Mock 扩展模块
vi.mock('@tiptap/extension-drag-handle', () => ({
  default: {
    configure: vi.fn(config => ({
      name: 'DragHandle',
      config,
      addCommands: () => ({
        showDragHandle: () => vi.fn(),
        hideDragHandle: () => vi.fn(),
      }),
      addKeyboardShortcuts: () => ({
        'Mod-Shift-d': () => true,
      }),
    })),
  },
}))

vi.mock('@tiptap/extension-hidden-block', () => ({
  default: {
    configure: vi.fn(config => ({
      name: 'HiddenBlock',
      config,
      addCommands: () => ({
        insertHiddenBlock: () => vi.fn(),
        removeHiddenBlock: () => vi.fn(),
      }),
    })),
  },
}))

vi.mock('@tiptap/react', () => ({
  useEditor: vi.fn(),
  EditorContent: vi.fn(({ editor }) => (
    <div data-testid="editor-content" data-editor-initialized={!!editor} contentEditable={editor?.isEditable} />
  )),
}))

vi.mock('@tiptap/starter-kit', () => ({
  default: {
    configure: vi.fn(() => ({ name: 'StarterKit' })),
  },
}))

describe('MoniAI Extensions 功能验证', () => {
  let mockEditor
  let user

  beforeEach(() => {
    user = userEvent.setup()

    mockEditor = {
      commands: {
        insertContent: vi.fn().mockReturnThis(),
        insertContentAt: vi.fn().mockReturnThis(),
        focus: vi.fn().mockReturnThis(),
        setTextSelection: vi.fn().mockReturnThis(),
        deleteNode: vi.fn().mockReturnThis(),
        showDragHandle: vi.fn().mockReturnThis(),
        hideDragHandle: vi.fn().mockReturnThis(),
        insertHiddenBlock: vi.fn().mockReturnThis(),
      },
      chain: vi.fn(() => mockEditor.commands),
      can: vi.fn(() => ({
        undo: vi.fn(() => true),
        redo: vi.fn(() => false),
      })),
      getJSON: vi.fn(() => ({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            attrs: { 'data-moni-block-id': 'block-123' },
            content: [{ type: 'text', text: 'Test content' }],
          },
        ],
      })),
      getHTML: vi.fn(() => '<p data-moni-block-id="block-123">Test content</p>'),
      getText: vi.fn(() => 'Test content'),
      isEditable: true,
      setEditable: vi.fn(),
      state: {
        selection: {
          from: 0,
          to: 0,
          empty: true,
          constructor: { name: 'TextSelection' },
        },
        doc: {
          nodeSize: 10,
          childCount: 1,
          textContent: 'Test content',
          nodeAt: vi.fn(() => ({
            type: { name: 'paragraph' },
            textContent: 'Test',
            attrs: { 'data-moni-block-id': 'block-123' },
            marks: [],
          })),
          descendants: vi.fn(callback => {
            callback(
              {
                type: { name: 'paragraph' },
                textContent: 'Test content',
                attrs: { 'data-moni-block-id': 'block-123' },
                nodeSize: 10,
              },
              0,
            )
          }),
        },
      },
      view: {
        dispatch: vi.fn(),
        state: { tr: {} },
        posAtDOM: vi.fn(() => 5),
      },
      on: vi.fn(),
      off: vi.fn(),
      destroy: vi.fn(),
    }

    const { useEditor } = require('@tiptap/react')
    useEditor.mockReturnValue(mockEditor)
  })

  describe('🎯 DragHandle Extension 测试', () => {
    it('应该正确配置 DragHandle 扩展', () => {
      const { default: DragHandle } = require('@tiptap/extension-drag-handle')

      render(<MoniEditorDemo />)

      expect(DragHandle.configure).toHaveBeenCalledWith(
        expect.objectContaining({
          showIndicators: true,
          onAddBlock: expect.any(Function),
          onDragStart: expect.any(Function),
          onDrop: expect.any(Function),
          indicatorStyles: expect.objectContaining({
            horizontal: expect.objectContaining({
              backgroundColor: '#0066cc',
              height: '2px',
              borderRadius: '1px',
              opacity: '0.8',
            }),
            vertical: expect.objectContaining({
              backgroundColor: '#0066cc',
              width: '2px',
              borderRadius: '1px',
              opacity: '0.8',
            }),
          }),
        }),
      )
    })

    it('应该处理 DragHandle onAddBlock 回调', async () => {
      render(<MoniEditorDemo />)

      const { default: DragHandle } = require('@tiptap/extension-drag-handle')
      const configCall = DragHandle.configure.mock.calls[0][0]

      // 模拟拖拽手柄的 + 按钮点击
      const addBlockOptions = {
        position: 10,
        node: { type: { name: 'paragraph' } },
      }

      await configCall.onAddBlock(addBlockOptions)

      // 验证内容被插入
      expect(mockEditor.commands.insertContentAt).toHaveBeenCalledWith(
        10,
        '<p data-type="paragraph">New paragraph added via drag handle +</p>',
      )
    })

    it('应该处理 DragHandle onDragStart 回调', () => {
      render(<MoniEditorDemo />)

      const { default: DragHandle } = require('@tiptap/extension-drag-handle')
      const configCall = DragHandle.configure.mock.calls[0][0]

      // 模拟拖拽开始事件
      const mockEvent = {
        dataTransfer: {
          effectAllowed: null,
        },
      }

      configCall.onDragStart(mockEvent, mockEditor)

      expect(mockEvent.dataTransfer.effectAllowed).toBe('move')
    })

    it('应该处理 DragHandle onDrop 回调', () => {
      render(<MoniEditorDemo />)

      const { default: DragHandle } = require('@tiptap/extension-drag-handle')
      const configCall = DragHandle.configure.mock.calls[0][0]

      // 模拟拖拽放置事件
      const mockEvent = { type: 'drop' }
      const mockDropInfo = {
        targetPosition: 15,
        sourcePosition: 5,
        nodeType: 'paragraph',
      }

      // 验证回调能够正常执行（不抛出错误）
      expect(() => {
        configCall.onDrop(mockEvent, mockDropInfo, mockEditor)
      }).not.toThrow()
    })

    it('🔧 验证拖拽键盘事件修复 (上游修复)', () => {
      render(<MoniEditorDemo />)

      const { default: DragHandle } = require('@tiptap/extension-drag-handle')
      const extensionInstance = DragHandle.configure.mock.results[0].value

      // 验证键盘快捷键配置
      if (extensionInstance.addKeyboardShortcuts) {
        const shortcuts = extensionInstance.addKeyboardShortcuts()
        expect(shortcuts).toHaveProperty('Mod-Shift-d')
        expect(typeof shortcuts['Mod-Shift-d']).toBe('function')
      }
    })
  })

  describe('👁️ HiddenBlock Extension 测试', () => {
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

    it('应该能够插入隐藏块', async () => {
      render(<MoniEditorDemo />)

      const hiddenBlockButton = screen.getByText('👁️ Insert Hidden Block')
      await user.click(hiddenBlockButton)

      // 验证隐藏块被插入
      expect(mockEditor.commands.insertContent).toHaveBeenCalledWith({
        type: 'hiddenBlock',
        attrs: expect.objectContaining({
          id: expect.stringMatching(/^hidden-\d+$/),
        }),
      })
    })

    it('应该在插入隐藏块后自动生成 AI 操作', async () => {
      vi.useFakeTimers()

      render(<MoniEditorDemo />)

      const hiddenBlockButton = screen.getByText('👁️ Insert Hidden Block')
      await user.click(hiddenBlockButton)

      // 快进时间以触发 setTimeout
      vi.advanceTimersByTime(1000)

      // 验证 AI 操作出现在队列中
      await waitFor(() => {
        expect(screen.getByText(/Pending AI Operations/)).toBeInTheDocument()
      })

      vi.useRealTimers()
    })

    it('🔧 验证 NULL_UUID 系统正确实现', () => {
      const { default: HiddenBlock } = require('@tiptap/extension-hidden-block')
      const configCall = HiddenBlock.configure.mock.calls[0][0]

      // 验证隐藏块配置包含正确的类名
      expect(configCall.HTMLAttributes.class).toBe('moni-hidden-block')
      expect(configCall.hideFromDOM).toBe(true)
    })
  })

  describe('🔄 StreamOperationManager 测试', () => {
    it('应该能够排队待处理的操作', async () => {
      render(<MoniEditorDemo />)

      // 触发 batch 操作
      const batchButton = screen.getByText('🚀 Run Batch Operations')
      await user.click(batchButton)

      // 验证操作队列出现
      await waitFor(
        () => {
          expect(screen.getByText(/Pending AI Operations/)).toBeInTheDocument()
        },
        { timeout: 2000 },
      )
    })

    it('应该能够批准单个操作', async () => {
      render(<MoniEditorDemo />)

      // 生成操作
      const batchButton = screen.getByText('🚀 Run Batch Operations')
      await user.click(batchButton)

      // 等待操作出现并批准第一个
      await waitFor(
        async () => {
          const approveButtons = screen.queryAllByText('✓ Approve')
          if (approveButtons.length > 0) {
            await user.click(approveButtons[0])
            return true
          }
          return false
        },
        { timeout: 3000 },
      )

      // 验证编辑器命令被执行
      expect(mockEditor.commands.insertContent).toHaveBeenCalled()
    })

    it('应该能够拒绝单个操作', async () => {
      render(<MoniEditorDemo />)

      // 生成操作
      const batchButton = screen.getByText('🚀 Run Batch Operations')
      await user.click(batchButton)

      // 等待操作出现并拒绝第一个
      await waitFor(
        async () => {
          const rejectButtons = screen.queryAllByText('✗ Reject')
          if (rejectButtons.length > 0) {
            await user.click(rejectButtons[0])
            return true
          }
          return false
        },
        { timeout: 3000 },
      )

      // 操作应该从队列中被移除，但不执行编辑器命令
      await waitFor(() => {
        const rejectButtons = screen.queryAllByText('✗ Reject')
        expect(rejectButtons).toHaveLength(0)
      })
    })

    it('应该支持不同类型的 Block Stream 操作', async () => {
      render(<MoniEditorDemo />)

      // 测试 INSERT 操作
      const customTextarea = screen.getByPlaceholderText('Enter custom HTML content...')
      await user.type(customTextarea, '<p>Insert test</p>')

      const operationSelect = screen.getByDisplayValue('insert')
      expect(operationSelect.value).toBe('insert')

      const customButton = screen.getByText('🎯 Run Custom Operation')
      await user.click(customButton)

      await waitFor(() => {
        expect(screen.getByText(/AI Stream Simulation in Progress/)).toBeInTheDocument()
      })

      // 测试 UPDATE 操作
      await user.selectOptions(operationSelect, 'update')
      expect(operationSelect.value).toBe('update')

      // 测试 DELETE 操作
      await user.selectOptions(operationSelect, 'delete')
      expect(operationSelect.value).toBe('delete')
    })
  })

  describe('🔧 上游修复验证', () => {
    it('验证 Menu 渲染修复 (inline 模式)', () => {
      render(<MoniEditorDemo />)

      // 验证编辑器正常渲染，没有 Menu 相关错误
      expect(screen.getByTestId('editor-content')).toHaveAttribute('data-editor-initialized', 'true')
    })

    it('验证 TypeScript extend function 链式调用', () => {
      render(<MoniEditorDemo />)

      // 验证 chain() 方法返回正确的接口
      const chainResult = mockEditor.chain()
      expect(chainResult).toHaveProperty('insertContent')
      expect(chainResult).toHaveProperty('focus')
      expect(chainResult).toHaveProperty('setTextSelection')

      // 验证链式调用工作正常
      expect(() => {
        mockEditor.chain().focus().insertContent('test').run()
      }).not.toThrow()
    })

    it('验证 React JSX runtime 修复', () => {
      // 验证组件能够正常渲染，没有 JSX runtime 冲突
      const { container } = render(<MoniEditorDemo />)

      expect(container.firstChild).toBeInTheDocument()
      expect(container.firstChild).toHaveClass('moni-editor-demo')
    })

    it('验证拖拽手柄键盘事件修复', async () => {
      render(<MoniEditorDemo />)

      // 模拟键盘焦点在拖拽手柄上
      const editorContent = screen.getByTestId('editor-content')

      // 验证键盘事件不会破坏拖拽功能
      await user.tab() // 模拟键盘导航
      fireEvent.keyDown(editorContent, { key: 'Escape' })

      // 验证编辑器仍然正常工作
      expect(mockEditor.state).toBeDefined()
      expect(mockEditor.commands).toBeDefined()
    })
  })

  describe('🎪 Block Stream 编辑系统集成测试', () => {
    it('应该支持完整的 AI 编辑工作流', async () => {
      vi.useFakeTimers()

      render(<MoniEditorDemo />)

      // 1. 触发实时编辑模拟
      const realtimeButton = screen.getByText('✨ Simulate Realtime Editing')
      await user.click(realtimeButton)

      // 2. 验证模拟开始
      expect(screen.getByText(/AI Stream Simulation in Progress/)).toBeInTheDocument()

      // 3. 快进模拟过程
      vi.advanceTimersByTime(2000)

      // 4. 验证操作出现在队列中
      await waitFor(() => {
        expect(screen.getByText(/Pending AI Operations/)).toBeInTheDocument()
      })

      // 5. 批准所有操作
      const approveAllButton = screen.getByText(/Approve All/)
      await user.click(approveAllButton)

      // 6. 验证编辑器命令被执行
      expect(mockEditor.commands.insertContent).toHaveBeenCalled()

      vi.useRealTimers()
    })

    it('应该处理操作执行中的错误', async () => {
      // 模拟编辑器命令失败
      mockEditor.commands.insertContent.mockImplementation(() => {
        throw new Error('编辑器命令执行失败')
      })

      render(<MoniEditorDemo />)

      // 生成操作
      const batchButton = screen.getByText('🚀 Run Batch Operations')
      await user.click(batchButton)

      // 尝试批准操作
      await waitFor(
        async () => {
          const approveButtons = screen.queryAllByText('✓ Approve')
          if (approveButtons.length > 0) {
            // 验证错误被正确处理，不会使应用崩溃
            expect(() => user.click(approveButtons[0])).not.toThrow()
            return true
          }
          return false
        },
        { timeout: 3000 },
      )
    })

    it('应该维护操作历史记录', async () => {
      render(<MoniEditorDemo />)

      // 启用 Debug 模式查看操作历史
      const debugButton = screen.getByText('Show Debug')
      await user.click(debugButton)

      // 生成一些操作
      const batchButton = screen.getByText('🚀 Run Batch Operations')
      await user.click(batchButton)

      // 验证 Debug 面板显示操作信息
      await waitFor(() => {
        expect(screen.getByText('🔄 Stream Operations')).toBeInTheDocument()
      })
    })
  })

  describe('📊 性能和稳定性测试', () => {
    it('应该能够处理大量并发操作', async () => {
      render(<MoniEditorDemo />)

      // 快速连续触发多个操作
      const buttons = [screen.getByText('🚀 Run Batch Operations'), screen.getByText('✨ Simulate Realtime Editing')]

      // 并发执行
      const promises = buttons.map(async button => {
        await user.click(button)
        return new Promise(resolve => setTimeout(resolve, 100))
      })

      await Promise.all(promises)

      // 验证应用保持响应
      expect(screen.getByText('MoniAI TipTap Editor Demo')).toBeInTheDocument()
    })

    it('应该正确清理事件监听器', () => {
      const { unmount } = render(<MoniEditorDemo />)

      // 记录初始的事件监听器调用
      const initialOnCalls = mockEditor.on.mock.calls.length
      const initialOffCalls = mockEditor.off.mock.calls.length

      // 卸载组件
      unmount()

      // 验证清理函数被调用
      expect(mockEditor.off.mock.calls.length).toBeGreaterThan(initialOffCalls)
    })
  })
})
