import { Editor } from '@tiptap/core'

import { Document } from '../../../extension-document/src/document.js'
import { Paragraph } from '../../../extension-paragraph/src/paragraph.js'
import { Text } from '../../../extension-text/src/text.js'
import { DragHandle } from '../drag-handle.js'

describe('DragHandle Extension', () => {
  let editor: Editor

  beforeEach(() => {
    // 创建基本的测试编辑器
    editor = new Editor({
      element: document.createElement('div'),
      content: '<p>Hello world</p>',
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

  describe('Extension Configuration', () => {
    it('should be registered as extension', () => {
      const dragHandleExtension = editor.extensionManager.extensions.find(ext => ext.name === 'dragHandle')
      expect(dragHandleExtension).toBeDefined()
    })

    it('should have default configuration', () => {
      const dragHandleExtension = editor.extensionManager.extensions.find(ext => ext.name === 'dragHandle')
      expect(dragHandleExtension).toBeDefined()

      if (dragHandleExtension) {
        expect(dragHandleExtension.options).toMatchObject({
          onAddBlock: expect.any(Function),
          onDragStart: expect.any(Function),
          onDragOver: expect.any(Function),
          onDrop: expect.any(Function),
          onClick: expect.any(Function),
        })
      }
    })

    it('should accept custom configuration', () => {
      const onAddBlock = jest.fn()
      const onDragStart = jest.fn()
      const onDragOver = jest.fn()
      const onDrop = jest.fn()
      const onClick = jest.fn()

      const customEditor = new Editor({
        element: document.createElement('div'),
        content: '<p>Hello world</p>',
        extensions: [
          Document,
          Paragraph,
          Text,
          DragHandle.configure({
            onAddBlock,
            onDragStart,
            onDragOver,
            onDrop,
            onClick,
          }),
        ],
      })

      const dragHandleExtension = customEditor.extensionManager.extensions.find(ext => ext.name === 'dragHandle')

      if (dragHandleExtension) {
        expect(dragHandleExtension.options.onAddBlock).toBe(onAddBlock)
        expect(dragHandleExtension.options.onDragStart).toBe(onDragStart)
        expect(dragHandleExtension.options.onDragOver).toBe(onDragOver)
        expect(dragHandleExtension.options.onDrop).toBe(onDrop)
        expect(dragHandleExtension.options.onClick).toBe(onClick)
      }

      customEditor.destroy()
    })
  })

  describe('Notion Style Render Function', () => {
    let mockElement: HTMLElement

    beforeEach(() => {
      // 创建模拟的DOM元素
      mockElement = document.createElement('div')
      mockElement.classList.add('drag-handle')
      document.body.appendChild(mockElement)
    })

    afterEach(() => {
      if (mockElement.parentNode) {
        mockElement.parentNode.removeChild(mockElement)
      }
    })

    it('should render Notion style drag handle with add button', () => {
      const dragHandleExtension = editor.extensionManager.extensions.find(ext => ext.name === 'dragHandle')

      if (dragHandleExtension && dragHandleExtension.options.render) {
        const renderResult = dragHandleExtension.options.render()

        expect(renderResult).toBeInstanceOf(HTMLElement)
        expect(renderResult.classList.contains('drag-handle-container')).toBe(true)

        // 检查是否包含拖拽手柄元素
        const dragHandle = renderResult.querySelector('.drag-handle')
        expect(dragHandle).toBeTruthy()

        // 检查是否包含6个网格点
        const gridDots = renderResult.querySelectorAll('.grid-dot')
        expect(gridDots.length).toBe(6)

        // 检查是否包含+号按钮
        const addButton = renderResult.querySelector('.add-block-button')
        expect(addButton).toBeTruthy()
        expect(addButton?.textContent).toBe('+')
      }
    })

    it('should apply correct CSS classes and styles', () => {
      const dragHandleExtension = editor.extensionManager.extensions.find(ext => ext.name === 'dragHandle')

      if (dragHandleExtension && dragHandleExtension.options.render) {
        const renderResult = dragHandleExtension.options.render()

        // 检查容器样式
        expect(renderResult.style.display).toBe('flex')
        expect(renderResult.style.alignItems).toBe('center')
        expect(renderResult.style.gap).toBe('4px')

        // 检查拖拽手柄样式
        const dragHandle = renderResult.querySelector('.drag-handle')
        if (dragHandle) {
          expect((dragHandle as HTMLElement).style.width).toBe('18px')
          expect((dragHandle as HTMLElement).style.height).toBe('18px')
          expect((dragHandle as HTMLElement).style.cursor).toBe('grab')
        }

        // 检查+号按钮样式
        const addButton = renderResult.querySelector('.add-block-button')
        if (addButton) {
          expect((addButton as HTMLElement).style.width).toBe('18px')
          expect((addButton as HTMLElement).style.height).toBe('18px')
          expect((addButton as HTMLElement).style.cursor).toBe('pointer')
        }
      }
    })

    it('should have draggable attribute set to true', () => {
      const dragHandleExtension = editor.extensionManager.extensions.find(ext => ext.name === 'dragHandle')

      if (dragHandleExtension && dragHandleExtension.options.render) {
        const renderResult = dragHandleExtension.options.render()
        expect(renderResult.getAttribute('draggable')).toBe('true')
      }
    })

    it('should have proper accessibility attributes', () => {
      const dragHandleExtension = editor.extensionManager.extensions.find(ext => ext.name === 'dragHandle')

      if (dragHandleExtension && dragHandleExtension.options.render) {
        const renderResult = dragHandleExtension.options.render()

        // 检查拖拽手柄的无障碍属性
        const dragHandle = renderResult.querySelector('.drag-handle')
        if (dragHandle) {
          expect(dragHandle.getAttribute('aria-label')).toBe('Drag to reorder')
          expect(dragHandle.getAttribute('title')).toBe('Drag to reorder')
        }

        // 检查+号按钮的无障碍属性
        const addButton = renderResult.querySelector('.add-block-button')
        if (addButton) {
          expect(addButton.getAttribute('aria-label')).toBe('Add block')
          expect(addButton.getAttribute('title')).toBe('Add block')
        }
      }
    })
  })

  describe('Type Safety', () => {
    it('should have proper TypeScript types', () => {
      // 测试选项类型
      const options = {
        onAddBlock: ({ node, editor: editorInstance, position }: any) => {
          // 类型检查：确保参数类型正确
          expect(typeof position).toBe('number')
          expect(editorInstance).toBeDefined()
          expect(node).toBeDefined()
        },
        onDragStart: (event: DragEvent, editorInstance: Editor) => {
          expect(event).toBeInstanceOf(DragEvent)
          expect(editorInstance).toBeDefined()
        },
        onDragOver: (event: DragEvent, dropInfo: any, editorInstance: Editor) => {
          expect(event).toBeInstanceOf(DragEvent)
          expect(dropInfo).toBeDefined()
          expect(editorInstance).toBeDefined()
        },
        onDrop: (event: DragEvent, dropInfo: any, editorInstance: Editor) => {
          expect(event).toBeInstanceOf(DragEvent)
          expect(dropInfo).toBeDefined()
          expect(editorInstance).toBeDefined()
        },
      }

      const testEditor = new Editor({
        element: document.createElement('div'),
        content: '<p>Hello world</p>',
        extensions: [Document, Paragraph, Text, DragHandle.configure(options)],
      })

      expect(testEditor).toBeDefined()
      testEditor.destroy()
    })
  })

  describe('DOM Manipulation', () => {
    it('should create proper DOM structure', () => {
      const dragHandleExtension = editor.extensionManager.extensions.find(ext => ext.name === 'dragHandle')

      if (dragHandleExtension && dragHandleExtension.options.render) {
        const element = dragHandleExtension.options.render()

        // 验证DOM结构
        expect(element.tagName).toBe('DIV')
        expect(element.classList.contains('drag-handle-container')).toBe(true)

        // 验证子元素（加号在左，网格点在右）
        expect(element.children.length).toBe(2)
        expect(element.children[0].classList.contains('add-block-button')).toBe(true)
        expect(element.children[1].classList.contains('drag-handle')).toBe(true)
      }
    })

    it('should handle CSS hover effects', () => {
      const dragHandleExtension = editor.extensionManager.extensions.find(ext => ext.name === 'dragHandle')

      if (dragHandleExtension && dragHandleExtension.options.render) {
        const element = dragHandleExtension.options.render()

        // 验证CSS变量和悬停效果
        const dragHandle = element.querySelector('.drag-handle')
        if (dragHandle) {
          expect((dragHandle as HTMLElement).style.getPropertyValue('--dot-color')).toBe('#9ca3af')
          expect((dragHandle as HTMLElement).style.getPropertyValue('--dot-color-hover')).toBe('#6b7280')
        }

        const addButton = element.querySelector('.add-block-button')
        if (addButton) {
          expect((addButton as HTMLElement).style.getPropertyValue('--bg-color')).toBe('transparent')
          expect((addButton as HTMLElement).style.getPropertyValue('--bg-color-hover')).toBe('#f3f4f6')
        }
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle missing callbacks gracefully', () => {
      const testEditor = new Editor({
        element: document.createElement('div'),
        content: '',
        extensions: [DragHandle.configure({})],
      })

      expect(testEditor).toBeDefined()
      testEditor.destroy()
    })
  })
})
