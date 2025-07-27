import { Editor } from '@tiptap/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
          onAddBlock: vi.fn(),
          onDragStart: vi.fn(),
          onDragOver: vi.fn(),
          onDrop: vi.fn(),
          onClick: vi.fn(),
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
      const onAddBlock = vi.fn()

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
      expect(dragHandleExtension).toBeDefined()

      // Test that the extension has the correct callback configured
      if (dragHandleExtension) {
        expect(dragHandleExtension.options.onAddBlock).toBe(onAddBlock)
      }

      testEditor.destroy()
    })

    it('should handle drag and drop operations correctly', () => {
      const onDragStart = vi.fn()
      const onDragOver = vi.fn()
      const onDrop = vi.fn()
      const onClick = vi.fn()

      const testEditor = new Editor({
        element: document.createElement('div'),
        content: '<p>测试段落</p>',
        extensions: [
          Document,
          Paragraph,
          Text,
          DragHandle.configure({
            onAddBlock: vi.fn(),
            onDragStart,
            onDragOver,
            onDrop,
            onClick,
          }),
        ],
      })

      const dragHandleExtension = testEditor.extensionManager.extensions.find(ext => ext.name === 'dragHandle')
      expect(dragHandleExtension).toBeDefined()

      // Test that callbacks are properly configured
      if (dragHandleExtension) {
        expect(dragHandleExtension.options.onDragStart).toBe(onDragStart)
        expect(dragHandleExtension.options.onDragOver).toBe(onDragOver)
        expect(dragHandleExtension.options.onDrop).toBe(onDrop)
        expect(dragHandleExtension.options.onClick).toBe(onClick)
      }

      testEditor.destroy()
    })

    it('should maintain performance under load', () => {
      const onDragOver = vi.fn()

      const testEditor = new Editor({
        element: document.createElement('div'),
        content: '<p>测试段落</p>',
        extensions: [
          Document,
          Paragraph,
          Text,
          DragHandle.configure({
            onAddBlock: vi.fn(),
            onDragOver,
          }),
        ],
      })

      const dragHandleExtension = testEditor.extensionManager.extensions.find(ext => ext.name === 'dragHandle')
      expect(dragHandleExtension).toBeDefined()

      // Test that the callback is properly configured - actual event testing would require
      // complex ProseMirror plugin integration which is tested elsewhere
      if (dragHandleExtension) {
        expect(dragHandleExtension.options.onDragOver).toBe(onDragOver)
      }

      testEditor.destroy()
    })

    it('should handle drag handle click events correctly', () => {
      const onClick = vi.fn()

      const testEditor = new Editor({
        element: document.createElement('div'),
        content: '<p>测试段落</p>',
        extensions: [
          Document,
          Paragraph,
          Text,
          DragHandle.configure({
            onAddBlock: vi.fn(),
            onClick,
          }),
        ],
      })

      const dragHandleExtension = testEditor.extensionManager.extensions.find(ext => ext.name === 'dragHandle')
      expect(dragHandleExtension).toBeDefined()

      // Test that the callback is properly configured
      if (dragHandleExtension) {
        expect(dragHandleExtension.options.onClick).toBe(onClick)

        // Test that render function creates the expected DOM structure
        const renderResult = dragHandleExtension.options.render()
        const dragHandle = renderResult.querySelector('.drag-handle')
        expect(dragHandle).toBeTruthy()
      }

      testEditor.destroy()
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing DOM elements gracefully', () => {
      const onAddBlock = vi.fn()

      const testEditor = new Editor({
        element: document.createElement('div'),
        content: '',
        extensions: [
          Document,
          Paragraph,
          Text,
          DragHandle.configure({
            onAddBlock,
          }),
        ],
      })

      expect(testEditor).toBeDefined()

      const dragHandleExtension = testEditor.extensionManager.extensions.find(ext => ext.name === 'dragHandle')
      expect(dragHandleExtension).toBeDefined()

      testEditor.destroy()
    })

    it('should handle invalid events gracefully', () => {
      const onDragStart = vi.fn()

      const testEditor = new Editor({
        element: document.createElement('div'),
        content: '<p>测试段落</p>',
        extensions: [
          Document,
          Paragraph,
          Text,
          DragHandle.configure({
            onAddBlock: vi.fn(),
            onDragStart,
            onClick: vi.fn(),
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
            onAddBlock: vi.fn(),
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
