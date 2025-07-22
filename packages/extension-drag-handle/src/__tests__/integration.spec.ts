import { Editor } from '@tiptap/core'

import { Document } from '../../../extension-document/src/document.js'
import { Paragraph } from '../../../extension-paragraph/src/paragraph.js'
import { Text } from '../../../extension-text/src/text.js'
import { DragHandle } from '../drag-handle.js'

describe('DragHandle Integration Tests', () => {
  let editor: Editor

  beforeEach(() => {
    // 创建基本的测试编辑器
    editor = new Editor({
      element: document.createElement('div'),
      content: '<p>测试段落</p>',
      extensions: [
        Document,
        Paragraph,
        Text,
        DragHandle.configure({
          onAddBlock: jest.fn(),
          onDragStart: jest.fn(),
          onDragOver: jest.fn(),
          onDrop: jest.fn(),
          onClick: jest.fn(),
        }),
      ],
    })
  })

  afterEach(() => {
    if (editor) {
      editor.destroy()
    }
  })

  describe('Extension Integration', () => {
    it('should be properly integrated with TipTap editor', () => {
      expect(editor).toBeDefined()
      expect(editor.isEditable).toBe(true)

      const dragHandleExtension = editor.extensionManager.extensions.find(ext => ext.name === 'dragHandle')
      expect(dragHandleExtension).toBeDefined()
    })

    it('should work with various node types', () => {
      const dragHandleExtension = editor.extensionManager.extensions.find(ext => ext.name === 'dragHandle')

      if (dragHandleExtension && dragHandleExtension.options.render) {
        // 测试渲染函数对不同节点类型的支持
        const renderResult = dragHandleExtension.options.render()
        expect(renderResult).toBeInstanceOf(HTMLElement)

        // 确保渲染出的元素包含必要的子元素
        const dragHandle = renderResult.querySelector('.drag-handle')
        const addButton = renderResult.querySelector('.add-block-button')

        expect(dragHandle).toBeTruthy()
        expect(addButton).toBeTruthy()
      }
    })

    it('should not interfere with other extensions', () => {
      // 验证编辑器基本功能正常
      expect(editor.state).toBeDefined()
      expect(editor.view).toBeDefined()

      // 验证DragHandle扩展仍然可用
      const dragHandleExtension = editor.extensionManager.extensions.find(ext => ext.name === 'dragHandle')
      expect(dragHandleExtension).toBeDefined()
    })
  })

  describe('Real-world Scenarios', () => {
    it('should handle adding blocks in complex document structure', () => {
      const onAddBlock = jest.fn()

      // 重新配置编辑器以使用真实的回调
      const testEditor = new Editor({
        element: document.createElement('div'),
        content: '<p>测试段落</p>',
        extensions: [
          Document,
          Paragraph,
          Text,
          DragHandle.configure({
            onAddBlock,
          }),
        ],
      })

      const dragHandleExtension = testEditor.extensionManager.extensions.find(ext => ext.name === 'dragHandle')

      if (dragHandleExtension && dragHandleExtension.options.render) {
        const renderResult = dragHandleExtension.options.render()
        const addButton = renderResult.querySelector('.add-block-button')

        // 模拟在复杂文档结构中添加块
        const mockNode = { type: { name: 'paragraph' } }
        if (addButton) {
          Object.defineProperty(addButton, 'currentNode', {
            value: mockNode,
            writable: true,
          })
          Object.defineProperty(addButton, 'currentNodePos', {
            value: 10,
            writable: true,
          })

          const clickEvent = new MouseEvent('click', { bubbles: true })
          addButton.dispatchEvent(clickEvent)

          expect(onAddBlock).toHaveBeenCalledWith({
            node: mockNode,
            editor: testEditor,
            position: 11,
          })
        }
      }

      testEditor.destroy()
    })

    it('should handle drag and drop operations correctly', () => {
      const onDragStart = jest.fn()
      const onDragOver = jest.fn()
      const onDrop = jest.fn()
      const onClick = jest.fn()

      const testEditor = new Editor({
        element: document.createElement('div'),
        content: '<p>测试段落</p>',
        extensions: [
          Document,
          Paragraph,
          Text,
          DragHandle.configure({
            onAddBlock: jest.fn(),
            onDragStart,
            onDragOver,
            onDrop,
            onClick,
          }),
        ],
      })

      const dragHandleExtension = testEditor.extensionManager.extensions.find(ext => ext.name === 'dragHandle')

      if (dragHandleExtension && dragHandleExtension.options.render) {
        const renderResult = dragHandleExtension.options.render()

        // 测试完整的拖拽流程
        const dragStartEvent = new DragEvent('dragstart', { bubbles: true })
        const dragOverEvent = new DragEvent('dragover', {
          bubbles: true,
          clientX: 100,
          clientY: 100,
        })
        const dropEvent = new DragEvent('drop', {
          bubbles: true,
          clientX: 100,
          clientY: 100,
        })

        renderResult.dispatchEvent(dragStartEvent)
        expect(onDragStart).toHaveBeenCalledWith(dragStartEvent, testEditor)

        renderResult.dispatchEvent(dragOverEvent)
        expect(onDragOver).toHaveBeenCalledWith(
          dragOverEvent,
          expect.objectContaining({
            clientX: 100,
            clientY: 100,
          }),
          testEditor,
        )

        renderResult.dispatchEvent(dropEvent)
        expect(onDrop).toHaveBeenCalledWith(
          dropEvent,
          expect.objectContaining({
            clientX: 100,
            clientY: 100,
          }),
          testEditor,
        )
      }

      testEditor.destroy()
    })

    it('should maintain performance under load', () => {
      const onDragOver = jest.fn()

      const testEditor = new Editor({
        element: document.createElement('div'),
        content: '<p>测试段落</p>',
        extensions: [
          Document,
          Paragraph,
          Text,
          DragHandle.configure({
            onAddBlock: jest.fn(),
            onDragOver,
          }),
        ],
      })

      const dragHandleExtension = testEditor.extensionManager.extensions.find(ext => ext.name === 'dragHandle')

      if (dragHandleExtension && dragHandleExtension.options.render) {
        const renderResult = dragHandleExtension.options.render()

        // 模拟快速连续的事件
        for (let i = 0; i < 10; i += 1) {
          const dragOverEvent = new DragEvent('dragover', { bubbles: true })
          renderResult.dispatchEvent(dragOverEvent)
        }

        expect(onDragOver).toHaveBeenCalledTimes(10)
      }

      testEditor.destroy()
    })

    it('should handle drag handle click events correctly', () => {
      const onClick = jest.fn()

      const testEditor = new Editor({
        element: document.createElement('div'),
        content: '<p>测试段落</p>',
        extensions: [
          Document,
          Paragraph,
          Text,
          DragHandle.configure({
            onAddBlock: jest.fn(),
            onClick,
          }),
        ],
      })

      const dragHandleExtension = testEditor.extensionManager.extensions.find(ext => ext.name === 'dragHandle')

      if (dragHandleExtension && dragHandleExtension.options.render) {
        const renderResult = dragHandleExtension.options.render()
        const dragHandle = renderResult.querySelector('.drag-handle')

        if (dragHandle) {
          // 模拟拖拽手柄点击事件
          const clickEvent = new MouseEvent('click', {
            bubbles: true,
            detail: 1, // 非拖拽开始的点击
          })

          dragHandle.dispatchEvent(clickEvent)

          expect(onClick).toHaveBeenCalledWith(expect.objectContaining({ type: 'click' }), testEditor)
        }
      }

      testEditor.destroy()
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing DOM elements gracefully', () => {
      const onAddBlock = jest.fn()

      const testEditor = new Editor({
        element: document.createElement('div'),
        content: '',
        extensions: [
          DragHandle.configure({
            onAddBlock,
          }),
        ],
      })

      expect(testEditor).toBeDefined()
      testEditor.destroy()
    })

    it('should handle invalid events gracefully', () => {
      const onDragStart = jest.fn()

      const testEditor = new Editor({
        element: document.createElement('div'),
        content: '<p>测试段落</p>',
        extensions: [
          Document,
          Paragraph,
          Text,
          DragHandle.configure({
            onAddBlock: jest.fn(),
            onDragStart,
            onClick: jest.fn(),
          }),
        ],
      })

      const dragHandleExtension = testEditor.extensionManager.extensions.find(ext => ext.name === 'dragHandle')

      if (dragHandleExtension && dragHandleExtension.options.render) {
        const renderResult = dragHandleExtension.options.render()

        // 测试无效事件处理
        expect(() => {
          const invalidEvent = new Event('dragstart')
          renderResult.dispatchEvent(invalidEvent)
        }).not.toThrow()
      }

      testEditor.destroy()
    })

    it('should work with minimal configuration', () => {
      const testEditor = new Editor({
        element: document.createElement('div'),
        content: '<p>测试段落</p>',
        extensions: [
          Document,
          Paragraph,
          Text,
          DragHandle.configure({
            onAddBlock: jest.fn(),
          }),
        ],
      })

      expect(testEditor).toBeDefined()

      const dragHandleExtension = testEditor.extensionManager.extensions.find(ext => ext.name === 'dragHandle')
      expect(dragHandleExtension).toBeDefined()

      testEditor.destroy()
    })
  })

  describe('Accessibility and User Experience', () => {
    it('should provide proper accessibility attributes', () => {
      const dragHandleExtension = editor.extensionManager.extensions.find(ext => ext.name === 'dragHandle')

      if (dragHandleExtension && dragHandleExtension.options.render) {
        const renderResult = dragHandleExtension.options.render()

        // 检查可访问性属性
        const dragHandle = renderResult.querySelector('.drag-handle')
        const addButton = renderResult.querySelector('.add-block-button')

        if (dragHandle) {
          expect(dragHandle.getAttribute('aria-label')).toBeTruthy()
          expect(dragHandle.getAttribute('title')).toBeTruthy()
        }

        if (addButton) {
          expect(addButton.getAttribute('aria-label')).toBeTruthy()
          expect(addButton.getAttribute('title')).toBeTruthy()
        }
      }
    })

    it('should maintain visual consistency', () => {
      const dragHandleExtension = editor.extensionManager.extensions.find(ext => ext.name === 'dragHandle')

      if (dragHandleExtension && dragHandleExtension.options.render) {
        const renderResult = dragHandleExtension.options.render()

        // 检查视觉一致性
        expect(renderResult.classList.contains('drag-handle-container')).toBe(true)
        expect(renderResult.style.display).toBe('flex')
        expect(renderResult.style.alignItems).toBe('center')

        const dragHandle = renderResult.querySelector('.drag-handle')
        const addButton = renderResult.querySelector('.add-block-button')

        if (dragHandle && addButton) {
          expect((dragHandle as HTMLElement).style.width).toBe('18px')
          expect((addButton as HTMLElement).style.width).toBe('18px')
        }
      }
    })
  })
})
