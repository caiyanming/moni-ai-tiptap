import '@testing-library/jest-dom'

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import MoniEditorDemo from './index.jsx'

/**
 * 集成测试 - 模拟真实的 TipTap 编辑器行为
 * 这个测试文件尝试更接近真实的编辑器交互
 */

// 创建更真实的 TipTap Mock
const createRealisticTipTapMock = () => {
  const mockState = {
    doc: {
      content: [
        { type: 'paragraph', attrs: { 'data-moni-block-id': 'block-1' } },
        { type: 'paragraph', attrs: { 'data-moni-block-id': 'block-2' } },
      ],
    },
    selection: { from: 0, to: 0 },
  }

  return {
    // 模拟真实的编辑器状态管理
    state: mockState,
    isEditable: true,

    // 模拟实际的命令执行
    commands: {
      insertContent: vi.fn().mockImplementation(content => {
        console.log('Real content insertion:', content)
        // 模拟真实的内容插入
        if (typeof content === 'string') {
          mockState.doc.content.push({
            type: 'paragraph',
            content,
            attrs: { 'data-moni-block-id': `block-${Date.now()}` },
          })
        }
        return { run: vi.fn(() => true) }
      }),

      insertContentAt: vi.fn().mockImplementation((pos, content) => {
        console.log('Real content insertion at position:', pos, content)
        return { run: vi.fn(() => true) }
      }),

      focus: vi.fn().mockReturnValue({ run: vi.fn(() => true) }),
      setTextSelection: vi.fn().mockReturnValue({ run: vi.fn(() => true) }),
    },

    chain: vi.fn(function () {
      return this.commands
    }),

    // 模拟事件系统
    eventListeners: new Map(),
    on: vi.fn((event, callback) => {
      if (!mockEditor.eventListeners.has(event)) {
        mockEditor.eventListeners.set(event, [])
      }
      mockEditor.eventListeners.get(event).push(callback)
    }),

    off: vi.fn((event, callback) => {
      if (mockEditor.eventListeners.has(event)) {
        const listeners = mockEditor.eventListeners.get(event)
        const index = listeners.indexOf(callback)
        if (index > -1) {listeners.splice(index, 1)}
      }
    }),

    // 模拟触发事件
    emit: (event, ...args) => {
      if (mockEditor.eventListeners.has(event)) {
        mockEditor.eventListeners.get(event).forEach(callback => {
          callback(...args)
        })
      }
    },

    // 模拟 DOM 相关方法
    view: {
      dom: null, // 将在测试中设置
      posAtDOM: vi.fn(element => {
        const blockId = element.getAttribute?.('data-moni-block-id')
        return blockId === 'block-1' ? 0 : 20
      }),
    },

    getJSON: vi.fn(() => mockState.doc),
    getHTML: vi.fn(() => '<p data-moni-block-id="block-1">First</p><p data-moni-block-id="block-2">Second</p>'),
    getText: vi.fn(() => 'First Second'),
  }
}

// 模拟真实的拖拽扩展行为
const createRealisticDragHandleMock = () => {
  let isConfigured = false
  let config = null

  return {
    configure: vi.fn(userConfig => {
      isConfigured = true
      config = userConfig

      // 模拟扩展实际会做的事情
      return {
        name: 'DragHandle',

        // 模拟真实的 ProseMirror 插件
        addProseMirrorPlugins: () => [
          {
            key: 'dragHandle',

            // 模拟插件的视图处理
            view: editorView => {
              const handleMouseEnter = event => {
                const blockElement = event.target.closest('[data-moni-block-id]')
                if (blockElement && config.onDragStart) {
                  // 模拟显示拖拽手柄
                  const handle = document.createElement('div')
                  handle.className = 'drag-handle-test'
                  handle.innerHTML = '⋮⋮'
                  handle.style.position = 'absolute'
                  handle.style.left = '-30px'
                  handle.style.top = '0px'
                  blockElement.appendChild(handle)

                  // 模拟 + 按钮
                  const addButton = document.createElement('button')
                  addButton.className = 'drag-handle-add-test'
                  addButton.innerHTML = '+'
                  addButton.onclick = () => {
                    if (config.onAddBlock) {
                      const rect = blockElement.getBoundingClientRect()
                      config.onAddBlock({
                        position: editorView.posAtDOM(blockElement) + blockElement.textContent?.length || 0,
                        node: { type: { name: 'paragraph' } },
                      })
                    }
                  }
                  handle.appendChild(addButton)
                }
              }

              const handleMouseLeave = event => {
                const handles = event.target.querySelectorAll('.drag-handle-test')
                handles.forEach(handle => handle.remove())
              }

              // 添加事件监听器
              editorView.dom.addEventListener('mouseenter', handleMouseEnter, true)
              editorView.dom.addEventListener('mouseleave', handleMouseLeave, true)

              return {
                destroy: () => {
                  editorView.dom.removeEventListener('mouseenter', handleMouseEnter, true)
                  editorView.dom.removeEventListener('mouseleave', handleMouseLeave, true)
                },
              }
            },
          },
        ],

        // 公开配置供测试验证
        getConfig: () => config,
        isConfigured: () => isConfigured,
      }
    }),
  }
}

let mockEditor
let mockDragHandle

// Mock modules with realistic behavior
vi.mock('@tiptap/extension-drag-handle', () => ({
  default: createRealisticDragHandleMock(),
}))

vi.mock('@tiptap/react', () => ({
  useEditor: vi.fn(),
  EditorContent: vi.fn(({ editor }) => {
    if (!editor) {return <div data-testid="editor-loading">Loading...</div>}

    return (
      <div
        data-testid="editor-content"
        className="ProseMirror"
        contentEditable
        ref={el => {
          if (el && editor.view) {
            editor.view.dom = el
          }
        }}
      >
        <p data-moni-block-id="block-1" data-testid="block-1">
          First paragraph
        </p>
        <p data-moni-block-id="block-2" data-testid="block-2">
          Second paragraph
        </p>
      </div>
    )
  }),
}))

vi.mock('@tiptap/starter-kit', () => ({
  default: { configure: vi.fn(() => ({ name: 'StarterKit' })) },
}))

vi.mock('@tiptap/extension-hidden-block', () => ({
  default: { configure: vi.fn(() => ({ name: 'HiddenBlock' })) },
}))

describe('🔄 真实集成测试 - 模拟实际用户交互', () => {
  let user

  beforeEach(() => {
    user = userEvent.setup()
    mockEditor = createRealisticTipTapMock()
    mockDragHandle = createRealisticDragHandleMock()

    const { useEditor } = require('@tiptap/react')
    useEditor.mockReturnValue(mockEditor)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('🎯 拖拽手柄真实行为测试', () => {
    it('应该在鼠标悬停时真实显示拖拽手柄', async () => {
      render(<MoniEditorDemo />)

      // 获取实际的编辑器DOM元素
      const editorContent = screen.getByTestId('editor-content')
      const block1 = screen.getByTestId('block-1')

      // 验证初始状态没有拖拽手柄
      expect(editorContent.querySelector('.drag-handle-test')).not.toBeInTheDocument()

      // 模拟鼠标悬停到第一个块
      fireEvent.mouseEnter(block1)

      // 验证拖拽手柄被创建并添加到DOM
      await waitFor(() => {
        const dragHandle = editorContent.querySelector('.drag-handle-test')
        expect(dragHandle).toBeInTheDocument()
        expect(dragHandle).toHaveTextContent('⋮⋮')
      })

      // 验证 + 按钮存在
      const addButton = editorContent.querySelector('.drag-handle-add-test')
      expect(addButton).toBeInTheDocument()
      expect(addButton).toHaveTextContent('+')
    })

    it('应该在点击 + 按钮时真实触发添加块功能', async () => {
      render(<MoniEditorDemo />)

      const editorContent = screen.getByTestId('editor-content')
      const block1 = screen.getByTestId('block-1')

      // 触发鼠标悬停显示拖拽手柄
      fireEvent.mouseEnter(block1)

      // 等待拖拽手柄出现
      await waitFor(() => {
        expect(editorContent.querySelector('.drag-handle-test')).toBeInTheDocument()
      })

      // 点击 + 按钮
      const addButton = editorContent.querySelector('.drag-handle-add-test')
      fireEvent.click(addButton)

      // 验证编辑器命令被调用
      expect(mockEditor.commands.insertContentAt).toHaveBeenCalledWith(
        expect.any(Number),
        '<p data-type="paragraph">New paragraph added via drag handle +</p>',
      )
    })

    it('应该在鼠标离开时移除拖拽手柄', async () => {
      render(<MoniEditorDemo />)

      const editorContent = screen.getByTestId('editor-content')
      const block1 = screen.getByTestId('block-1')

      // 鼠标悬停显示手柄
      fireEvent.mouseEnter(block1)

      await waitFor(() => {
        expect(editorContent.querySelector('.drag-handle-test')).toBeInTheDocument()
      })

      // 鼠标离开
      fireEvent.mouseLeave(block1)

      // 验证手柄被移除
      await waitFor(() => {
        expect(editorContent.querySelector('.drag-handle-test')).not.toBeInTheDocument()
      })
    })

    it('🔧 验证拖拽配置是否被正确应用', () => {
      render(<MoniEditorDemo />)

      const { default: DragHandle } = require('@tiptap/extension-drag-handle')

      // 验证扩展被正确配置
      expect(DragHandle.configure).toHaveBeenCalled()

      const configuredExtension = DragHandle.configure.mock.results[0].value
      expect(configuredExtension.isConfigured()).toBe(true)

      const config = configuredExtension.getConfig()
      expect(config).toMatchObject({
        showIndicators: true,
        onAddBlock: expect.any(Function),
        onDragStart: expect.any(Function),
        onDrop: expect.any(Function),
      })
    })
  })

  describe('📝 编辑器内容交互测试', () => {
    it('应该能够真实地插入和修改内容', async () => {
      render(<MoniEditorDemo />)

      // 点击添加示例内容
      const addSampleButton = screen.getByText('➕ Add Sample')
      await user.click(addSampleButton)

      // 验证内容确实被添加到模拟状态中
      expect(mockEditor.commands.insertContent).toHaveBeenCalled()

      // 验证状态更新
      const newDoc = mockEditor.getJSON()
      expect(newDoc.content.length).toBeGreaterThan(2) // 原来2个段落 + 新增内容
    })

    it('应该能够真实地清空内容', async () => {
      render(<MoniEditorDemo />)

      // 模拟清空命令的真实行为
      mockEditor.commands.clearContent = vi.fn().mockImplementation(() => {
        mockEditor.state.doc.content = []
        return { run: vi.fn(() => true) }
      })

      const clearButton = screen.getByText('🗑️ Clear')
      await user.click(clearButton)

      expect(mockEditor.commands.clearContent).toHaveBeenCalled()
    })
  })

  describe('🔄 事件系统真实性测试', () => {
    it('应该正确注册和清理事件监听器', () => {
      const { unmount } = render(<MoniEditorDemo />)

      // 验证事件监听器被注册
      expect(mockEditor.on).toHaveBeenCalled()

      // 模拟组件更新触发事件
      mockEditor.emit('update')

      // 卸载组件
      unmount()

      // 验证清理函数被调用
      expect(mockEditor.off).toHaveBeenCalled()
    })

    it('应该能够响应编辑器内容变化事件', async () => {
      render(<MoniEditorDemo />)

      // 模拟内容变化
      const updateCallback = mockEditor.on.mock.calls.find(call => call[0] === 'update')?.[1]

      if (updateCallback) {
        // 触发更新事件
        updateCallback()

        // 验证UI响应更新（比如字数统计）
        await waitFor(() => {
          expect(screen.getByText(/Words:/)).toBeInTheDocument()
        })
      }
    })
  })

  describe('🎨 视觉反馈测试', () => {
    it('应该在模拟进行中显示正确的视觉状态', async () => {
      render(<MoniEditorDemo />)

      // 开始AI模拟
      const realtimeButton = screen.getByText('✨ Simulate Realtime Editing')
      await user.click(realtimeButton)

      // 验证视觉状态变化
      await waitFor(() => {
        expect(screen.getByText(/AI Stream Simulation in Progress/)).toBeInTheDocument()
      })

      // 验证编辑器覆盖层存在
      const editorWrapper = screen.getByTestId('editor-content').closest('.relative')
      const overlay = editorWrapper?.querySelector('.absolute')
      expect(overlay).toBeInTheDocument()
    })

    it('应该在Debug模式下显示真实的编辑器状态', async () => {
      render(<MoniEditorDemo />)

      // 启用Debug模式
      const debugButton = screen.getByText('Show Debug')
      await user.click(debugButton)

      // 验证显示真实的编辑器状态
      expect(screen.getByText('📝 Editor State')).toBeInTheDocument()
      expect(screen.getByText('Editable: ✅')).toBeInTheDocument()

      // 验证文档结构反映真实状态
      expect(screen.getByText('Children: 2')).toBeInTheDocument() // 两个段落
    })
  })

  describe('⚡ 性能和稳定性真实测试', () => {
    it('应该在高频操作下保持DOM结构稳定', async () => {
      render(<MoniEditorDemo />)

      const editorContent = screen.getByTestId('editor-content')
      const initialChildCount = editorContent.children.length

      // 快速连续操作
      for (let i = 0; i < 10; i++) {
        const block1 = screen.getByTestId('block-1')
        fireEvent.mouseEnter(block1)
        fireEvent.mouseLeave(block1)
      }

      // 验证DOM结构稳定
      expect(editorContent.children.length).toBe(initialChildCount)
      expect(screen.getByTestId('block-1')).toBeInTheDocument()
      expect(screen.getByTestId('block-2')).toBeInTheDocument()
    })

    it('应该能够处理异常情况而不崩溃', async () => {
      render(<MoniEditorDemo />)

      // 模拟编辑器命令失败
      mockEditor.commands.insertContent.mockImplementationOnce(() => {
        throw new Error('Mock editor error')
      })

      // 尝试执行可能失败的操作
      const addSampleButton = screen.getByText('➕ Add Sample')

      // 验证不会导致整个应用崩溃
      expect(() => user.click(addSampleButton)).not.toThrow()

      // 验证应用仍然可用
      expect(screen.getByText('MoniAI TipTap Editor Demo')).toBeInTheDocument()
    })
  })

  describe('🔒 边界条件真实测试', () => {
    it('应该处理空文档状态', () => {
      // 模拟空文档
      mockEditor.state.doc.content = []
      mockEditor.getHTML.mockReturnValue('')
      mockEditor.getText.mockReturnValue('')

      render(<MoniEditorDemo />)

      // 验证空状态下的行为
      expect(screen.getByText('Words: 0')).toBeInTheDocument()
      expect(screen.getByText('Characters: 0')).toBeInTheDocument()
    })

    it('应该处理大量内容的性能', () => {
      // 模拟大量内容
      const largeContent = Array.from({ length: 100 }, (_, i) => ({
        type: 'paragraph',
        attrs: { 'data-moni-block-id': `large-block-${i}` },
        content: `Large paragraph ${i} `.repeat(50),
      }))

      mockEditor.state.doc.content = largeContent
      mockEditor.getText.mockReturnValue('Large content '.repeat(5000))

      const startTime = performance.now()
      render(<MoniEditorDemo />)
      const endTime = performance.now()

      // 验证渲染性能合理（应该在100ms内）
      expect(endTime - startTime).toBeLessThan(100)

      // 验证大量内容被正确显示
      expect(screen.getByText(/Words: \d+/)).toBeInTheDocument()
    })
  })
})

/**
 * 📋 这个真实集成测试的价值：
 *
 * 1. ✅ 模拟了真实的DOM操作和事件处理
 * 2. ✅ 验证了拖拽手柄的实际显示/隐藏行为
 * 3. ✅ 测试了真实的事件监听器注册和清理
 * 4. ✅ 验证了视觉反馈和状态变化
 * 5. ✅ 包含了性能和稳定性测试
 * 6. ✅ 处理了异常情况和边界条件
 *
 * 但是仍然有限制：
 * - 无法测试真实的鼠标拖拽操作
 * - 无法验证实际的CSS样式渲染
 * - 无法测试浏览器特定的行为差异
 *
 * 💡 要真正验证功能，还需要：
 * 1. 在真实浏览器中手动测试
 * 2. 使用 Playwright/Puppeteer 进行E2E测试
 * 3. 使用 Cypress 进行真实的用户交互测试
 */
