import '@testing-library/jest-dom'

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import MoniEditorDemo from './index.jsx'

/**
 * 端到端测试 - 模拟真实用户交互场景
 * 验证 MoniAI TipTap Editor Demo 的完整用户体验
 */

// 完整的 Editor Mock，模拟真实 TipTap 编辑器行为
const createMockEditor = () => {
  const mockContent = {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 1, 'data-moni-block-id': 'heading-1' },
        content: [{ type: 'text', text: 'MoniAI TipTap Editor Demo' }],
      },
      {
        type: 'paragraph',
        attrs: { 'data-moni-block-id': 'para-1' },
        content: [{ type: 'text', text: 'This demo showcases the MoniAI TipTap editor with custom extensions' }],
      },
    ],
  }

  let isEditable = true
  let currentContent = JSON.parse(JSON.stringify(mockContent))

  return {
    commands: {
      insertContent: vi.fn().mockImplementation(content => {
        console.log('Mock: inserting content', content)
        return { run: vi.fn(() => true) }
      }),
      insertContentAt: vi.fn().mockImplementation((pos, content) => {
        console.log('Mock: inserting content at', pos, content)
        return { run: vi.fn(() => true) }
      }),
      focus: vi.fn().mockReturnValue({ run: vi.fn(() => true) }),
      setTextSelection: vi.fn().mockReturnValue({ run: vi.fn(() => true) }),
      deleteNode: vi.fn().mockReturnValue({ run: vi.fn(() => true) }),
      clearContent: vi.fn().mockImplementation(() => {
        currentContent = { type: 'doc', content: [] }
        return { run: vi.fn(() => true) }
      }),
    },
    chain: vi.fn(function () {
      return this.commands
    }),
    can: vi.fn(() => ({
      undo: vi.fn(() => true),
      redo: vi.fn(() => false),
    })),
    getJSON: vi.fn(() => currentContent),
    getHTML: vi.fn(() => '<h1>MoniAI TipTap Editor Demo</h1><p>This demo showcases...</p>'),
    getText: vi.fn(
      () => 'MoniAI TipTap Editor Demo This demo showcases the MoniAI TipTap editor with custom extensions',
    ),
    isEditable,
    setEditable: vi.fn(editable => {
      isEditable = editable
    }),
    state: {
      selection: {
        from: 0,
        to: 0,
        empty: true,
        constructor: { name: 'TextSelection' },
      },
      doc: {
        nodeSize: 50,
        childCount: 2,
        textContent: 'MoniAI TipTap Editor Demo This demo showcases...',
        nodeAt: vi.fn(() => ({
          type: { name: 'paragraph' },
          textContent: 'Test content',
          attrs: { 'data-moni-block-id': 'para-1' },
          marks: [],
          nodeSize: 15,
        })),
        descendants: vi.fn(callback => {
          currentContent.content.forEach((node, index) => {
            callback(
              {
                type: { name: node.type },
                textContent: node.content?.[0]?.text || '',
                attrs: node.attrs || {},
                nodeSize: 10 + index * 5,
              },
              index * 10,
            )
          })
        }),
      },
    },
    view: {
      dispatch: vi.fn(),
      state: { tr: {} },
      posAtDOM: vi.fn(element => {
        const blockId = element.getAttribute?.('data-moni-block-id')
        return blockId === 'heading-1' ? 0 : 20
      }),
    },
    on: vi.fn(),
    off: vi.fn(),
    destroy: vi.fn(),
  }
}

// Mock 所有依赖
vi.mock('@tiptap/react', () => ({
  useEditor: vi.fn(),
  EditorContent: vi.fn(({ editor }) => (
    <div data-testid="editor-content" className="ProseMirror" contentEditable={editor?.isEditable}>
      <h1 data-moni-block-id="heading-1">MoniAI TipTap Editor Demo</h1>
      <p data-moni-block-id="para-1">This demo showcases the MoniAI TipTap editor with custom extensions</p>
    </div>
  )),
}))

vi.mock('@tiptap/starter-kit', () => ({
  default: { configure: vi.fn(() => ({ name: 'StarterKit' })) },
}))

vi.mock('@tiptap/extension-drag-handle', () => ({
  default: { configure: vi.fn(() => ({ name: 'DragHandle' })) },
}))

vi.mock('@tiptap/extension-hidden-block', () => ({
  default: { configure: vi.fn(() => ({ name: 'HiddenBlock' })) },
}))

describe('🎭 MoniAI Editor Demo - 端到端测试', () => {
  let mockEditor
  let user

  beforeEach(() => {
    user = userEvent.setup({ delay: null })
    mockEditor = createMockEditor()

    const { useEditor } = require('@tiptap/react')
    useEditor.mockReturnValue(mockEditor)

    // 清除控制台警告以保持测试输出清洁
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('🎯 完整用户工作流测试', () => {
    it('用户应该能够完成完整的编辑和 AI 协作流程', async () => {
      const { container } = render(<MoniEditorDemo />)

      // 1. 验证初始界面加载
      expect(screen.getByText('MoniAI TipTap Editor Demo')).toBeInTheDocument()
      expect(screen.getByTestId('editor-content')).toBeInTheDocument()

      // 2. 启用 Debug 模式查看编辑器状态
      const debugButton = screen.getByText('Show Debug')
      await user.click(debugButton)

      expect(screen.getByText('🐛 Debug Panel')).toBeInTheDocument()
      expect(screen.getByText('📝 Editor State')).toBeInTheDocument()

      // 3. 添加一些示例内容
      const addSampleButton = screen.getByText('➕ Add Sample')
      await user.click(addSampleButton)

      expect(mockEditor.commands.insertContent).toHaveBeenCalled()

      // 4. 插入隐藏块为 AI 操作做准备
      const hiddenBlockButton = screen.getByText('👁️ Insert Hidden Block')
      await user.click(hiddenBlockButton)

      expect(mockEditor.commands.insertContent).toHaveBeenCalledWith({
        type: 'hiddenBlock',
        attrs: expect.objectContaining({
          id: expect.stringMatching(/^hidden-\d+$/),
        }),
      })

      // 5. 运行 AI 流式编辑模拟
      const realtimeButton = screen.getByText('✨ Simulate Realtime Editing')
      await user.click(realtimeButton)

      // 验证模拟状态
      await waitFor(() => {
        expect(screen.getByText(/AI Stream Simulation in Progress/)).toBeInTheDocument()
      })

      // 6. 等待操作出现在队列中
      await waitFor(
        () => {
          expect(screen.getByText(/Pending AI Operations/)).toBeInTheDocument()
        },
        { timeout: 3000 },
      )

      // 7. 批准所有 AI 操作
      const approveAllButton = screen.getByText(/Approve All \(\d+\)/)
      await user.click(approveAllButton)

      // 验证操作被执行
      expect(mockEditor.commands.insertContent).toHaveBeenCalledTimes(4) // 示例内容 + 隐藏块 + AI操作

      // 8. 验证编辑器状态更新
      expect(screen.getByText('Editable: ✅')).toBeInTheDocument()
      expect(screen.getByText('Can Undo: ✅')).toBeInTheDocument()
    })

    it('用户应该能够自定义 AI 操作并进行精细控制', async () => {
      render(<MoniEditorDemo />)

      // 1. 使用自定义操作功能
      const customTextarea = screen.getByPlaceholderText('Enter custom HTML content...')
      const customContent =
        '<h2>Custom AI Generated Heading</h2><p>This is custom content generated through the simulator.</p>'

      await user.type(customTextarea, customContent)
      expect(customTextarea.value).toBe(customContent)

      // 2. 选择操作类型
      const operationSelect = screen.getByDisplayValue('insert')
      await user.selectOptions(operationSelect, 'update')
      expect(operationSelect.value).toBe('update')

      // 3. 执行自定义操作
      const customButton = screen.getByText('🎯 Run Custom Operation')
      await user.click(customButton)

      // 4. 验证操作进入队列
      await waitFor(() => {
        expect(screen.getByText(/Pending AI Operations/)).toBeInTheDocument()
      })

      // 5. 进行精细控制 - 逐个批准/拒绝
      const operationItems = await screen.findAllByText('✓ Approve')
      expect(operationItems.length).toBeGreaterThan(0)

      // 批准第一个操作
      await user.click(operationItems[0])

      // 验证操作被执行
      expect(mockEditor.commands.insertContent).toHaveBeenCalled()
    })

    it('用户应该能够调整模拟参数并观察不同效果', async () => {
      render(<MoniEditorDemo />)

      // 1. 调整模拟速度
      const speedSlider = screen.getByDisplayValue('1000')

      // 改为快速模式
      await user.clear(speedSlider)
      await user.type(speedSlider, '200')
      expect(speedSlider.value).toBe('200')

      // 2. 运行批量操作观察快速效果
      const batchButton = screen.getByText('🚀 Run Batch Operations')
      await user.click(batchButton)

      // 3. 快速模式下操作应该更快出现
      await waitFor(
        () => {
          expect(screen.getByText(/Pending AI Operations/)).toBeInTheDocument()
        },
        { timeout: 1000 },
      ) // 更短的超时时间

      // 4. 调整为慢速模式测试
      await user.clear(speedSlider)
      await user.type(speedSlider, '3000')
      expect(speedSlider.value).toBe('3000')

      // 5. 清除之前的操作
      const clearButton = screen.getByText('Clear')
      await user.click(clearButton)

      // 验证操作被清除
      expect(screen.queryByText(/Pending AI Operations/)).not.toBeInTheDocument()
    })
  })

  describe('🔧 扩展功能集成测试', () => {
    it('DragHandle 扩展应该与其他功能协同工作', async () => {
      render(<MoniEditorDemo />)

      // 验证拖拽手柄配置被正确应用
      const { default: DragHandle } = require('@tiptap/extension-drag-handle')
      expect(DragHandle.configure).toHaveBeenCalledWith(
        expect.objectContaining({
          showIndicators: true,
          onAddBlock: expect.any(Function),
          onDragStart: expect.any(Function),
          onDrop: expect.any(Function),
        }),
      )

      // 模拟拖拽手柄的 + 按钮功能
      const configCall = DragHandle.configure.mock.calls[0][0]
      await configCall.onAddBlock({ position: 25 })

      expect(mockEditor.commands.insertContentAt).toHaveBeenCalledWith(
        25,
        '<p data-type="paragraph">New paragraph added via drag handle +</p>',
      )
    })

    it('HiddenBlock 扩展应该与 StreamOperationManager 协同工作', async () => {
      vi.useFakeTimers()

      render(<MoniEditorDemo />)

      // 插入隐藏块
      const hiddenBlockButton = screen.getByText('👁️ Insert Hidden Block')
      await user.click(hiddenBlockButton)

      // 快进时间触发自动 AI 操作
      vi.advanceTimersByTime(1000)

      // 验证 AI 操作被自动创建
      await waitFor(() => {
        expect(screen.getByText(/Pending AI Operations/)).toBeInTheDocument()
      })

      // 验证操作描述包含隐藏块相关信息
      expect(screen.getByText(/AI inserted content targeting hidden block/)).toBeInTheDocument()

      vi.useRealTimers()
    })

    it('Debug 面板应该正确显示所有扩展状态', async () => {
      render(<MoniEditorDemo />)

      // 启用 Debug 模式
      const debugButton = screen.getByText('Show Debug')
      await user.click(debugButton)

      // 验证编辑器状态信息
      expect(screen.getByText('📝 Editor State')).toBeInTheDocument()
      expect(screen.getByText('🎯 Selection')).toBeInTheDocument()
      expect(screen.getByText('📄 Document')).toBeInTheDocument()
      expect(screen.getByText('🌳 Document Nodes')).toBeInTheDocument()

      // 验证文档节点信息
      expect(screen.getByText('heading')).toBeInTheDocument()
      expect(screen.getByText('paragraph')).toBeInTheDocument()

      // 验证统计信息
      expect(screen.getByText('Size: 50')).toBeInTheDocument()
      expect(screen.getByText('Children: 2')).toBeInTheDocument()
    })
  })

  describe('🎨 用户界面交互测试', () => {
    it('用户应该能够导出编辑器内容', async () => {
      render(<MoniEditorDemo />)

      // 启用 Debug 模式
      const debugButton = screen.getByText('Show Debug')
      await user.click(debugButton)

      // 创建 URL.createObjectURL 的 mock
      const mockCreateObjectURL = vi.fn(() => 'blob:mock-url')
      const mockRevokeObjectURL = vi.fn()
      Object.defineProperty(window.URL, 'createObjectURL', { value: mockCreateObjectURL })
      Object.defineProperty(window.URL, 'revokeObjectURL', { value: mockRevokeObjectURL })

      // Mock document.createElement 和 click
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      }
      vi.spyOn(document, 'createElement').mockImplementation(tagName => {
        if (tagName === 'a') {return mockLink}
        return document.createElement(tagName)
      })

      // 测试 JSON 导出
      const jsonButton = screen.getByText('📤 JSON')
      await user.click(jsonButton)

      expect(mockCreateObjectURL).toHaveBeenCalled()
      expect(mockLink.download).toBe('editor-content.json')
      expect(mockLink.click).toHaveBeenCalled()

      // 测试 HTML 导出
      const htmlButton = screen.getByText('📤 HTML')
      await user.click(htmlButton)

      expect(mockLink.download).toBe('editor-content.html')
    })

    it('用户应该能够在只读和编辑模式之间切换', async () => {
      render(<MoniEditorDemo />)

      // 初始状态应该是可编辑的
      expect(screen.getByText('✏️ Editable')).toBeInTheDocument()

      // 切换到只读模式
      const editableButton = screen.getByText('✏️ Editable')
      await user.click(editableButton)

      expect(mockEditor.setEditable).toHaveBeenCalledWith(false)

      // 验证按钮状态改变
      await waitFor(() => {
        expect(screen.getByText('🔒 Read-only')).toBeInTheDocument()
      })

      // 验证其他操作按钮被禁用
      const addSampleButton = screen.getByText('➕ Add Sample')
      expect(addSampleButton).toBeDisabled()
    })

    it('应该提供清晰的使用指南', () => {
      render(<MoniEditorDemo />)

      // 验证使用说明存在
      expect(screen.getByText('💡 Try these features:')).toBeInTheDocument()
      expect(screen.getByText(/Drag Handles:/)).toBeInTheDocument()
      expect(screen.getByText(/Block Operations:/)).toBeInTheDocument()
      expect(screen.getByText(/AI Simulation:/)).toBeInTheDocument()
      expect(screen.getByText(/Hidden Blocks:/)).toBeInTheDocument()
      expect(screen.getByText(/Debug Mode:/)).toBeInTheDocument()

      // 验证 Stream Simulator 使用提示
      expect(screen.getByText('💡 Usage Tips')).toBeInTheDocument()
      expect(screen.getByText(/Adjust simulation speed/)).toBeInTheDocument()
    })
  })

  describe('🔒 错误处理和边界情况', () => {
    it('应该优雅处理编辑器初始化失败', () => {
      const { useEditor } = require('@tiptap/react')
      useEditor.mockReturnValue(null)

      render(<MoniEditorDemo />)

      // 验证加载状态显示
      expect(screen.getByText('Loading editor...')).toBeInTheDocument()

      // 验证控制按钮被正确禁用
      expect(screen.getByText('Show Debug')).toBeDisabled()
    })

    it('应该处理并发操作请求', async () => {
      render(<MoniEditorDemo />)

      // 快速连续点击多个操作按钮
      const batchButton = screen.getByText('🚀 Run Batch Operations')
      const realtimeButton = screen.getByText('✨ Simulate Realtime Editing')

      await user.click(batchButton)
      await user.click(realtimeButton)

      // 验证应用不会崩溃
      expect(screen.getByText('MoniAI TipTap Editor Demo')).toBeInTheDocument()

      // 验证模拟状态正确管理
      await waitFor(() => {
        expect(screen.getByText(/AI Stream Simulation in Progress/)).toBeInTheDocument()
      })
    })

    it('应该验证自定义内容输入', async () => {
      render(<MoniEditorDemo />)

      const customButton = screen.getByText('🎯 Run Custom Operation')

      // 空内容时按钮应该被禁用
      expect(customButton).toBeDisabled()

      // 输入内容后按钮应该启用
      const customTextarea = screen.getByPlaceholderText('Enter custom HTML content...')
      await user.type(customTextarea, '<p>Test</p>')

      expect(customButton).not.toBeDisabled()
    })

    it('应该在模拟进行中正确禁用控件', async () => {
      render(<MoniEditorDemo />)

      // 开始模拟
      const batchButton = screen.getByText('🚀 Run Batch Operations')
      await user.click(batchButton)

      // 验证按钮状态改变
      await waitFor(() => {
        expect(screen.getByText('⏳ Running...')).toBeInTheDocument()
      })

      // 验证速度滑块被禁用
      const speedSlider = screen.getByDisplayValue('1000')
      expect(speedSlider).toBeDisabled()
    })
  })

  describe('📱 响应式和可访问性测试', () => {
    it('应该在不同视窗尺寸下正确布局', () => {
      render(<MoniEditorDemo />)

      // 验证响应式网格布局
      const gridContainer = screen.getByTestId('editor-content').closest('.grid')
      expect(gridContainer).toHaveClass('grid-cols-1', 'lg:grid-cols-4')

      // 验证主编辑器占用正确列数
      const editorSection = gridContainer.querySelector('.lg\\:col-span-3')
      expect(editorSection).toBeInTheDocument()

      // 验证侧边栏占用正确列数
      const sidebarSection = gridContainer.querySelector('.lg\\:col-span-1')
      expect(sidebarSection).toBeInTheDocument()
    })

    it('应该支持键盘导航', async () => {
      render(<MoniEditorDemo />)

      // 测试 Tab 键导航
      await user.tab()

      // 验证焦点在第一个可聚焦元素上
      const debugButton = screen.getByText('Show Debug')
      expect(debugButton).toHaveFocus()

      // 使用 Enter 键激活
      await user.keyboard('{Enter}')
      expect(screen.getByText('Hide Debug')).toBeInTheDocument()
    })

    it('应该提供合适的 ARIA 标签', () => {
      render(<MoniEditorDemo />)

      // 验证编辑器内容区域的可访问性
      const editorContent = screen.getByTestId('editor-content')
      expect(editorContent).toHaveAttribute('contentEditable')

      // 验证按钮有合适的文本内容
      expect(screen.getByText('Show Debug')).toBeInstanceOf(HTMLButtonElement)
      expect(screen.getByText('🚀 Run Batch Operations')).toBeInstanceOf(HTMLButtonElement)
    })
  })

  describe('🏆 综合性能测试', () => {
    it('应该在高频交互下保持稳定', async () => {
      const startTime = performance.now()

      render(<MoniEditorDemo />)

      // 执行一系列高频操作
      const actions = [
        () => user.click(screen.getByText('Show Debug')),
        () => user.click(screen.getByText('➕ Add Sample')),
        () => user.click(screen.getByText('👁️ Insert Hidden Block')),
        () => user.click(screen.getByText('🚀 Run Batch Operations')),
        () => user.click(screen.getByText('Hide Debug')),
      ]

      // 并发执行所有操作
      await Promise.all(actions.map(action => action()))

      const endTime = performance.now()
      const duration = endTime - startTime

      // 验证操作在合理时间内完成（2秒内）
      expect(duration).toBeLessThan(2000)

      // 验证界面仍然响应
      expect(screen.getByText('MoniAI TipTap Editor Demo')).toBeInTheDocument()
    })

    it('应该正确管理内存和事件监听器', () => {
      const { unmount } = render(<MoniEditorDemo />)

      // 验证编辑器事件监听器被注册
      expect(mockEditor.on).toHaveBeenCalled()

      // 卸载组件
      unmount()

      // 验证清理函数被调用
      expect(mockEditor.off).toHaveBeenCalled()
    })
  })
})
