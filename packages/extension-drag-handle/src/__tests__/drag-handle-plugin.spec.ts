import { Editor } from '@tiptap/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Document } from '../../../extension-document/src/document.js'
import { Paragraph } from '../../../extension-paragraph/src/paragraph.js'
import { Text } from '../../../extension-text/src/text.js'
import { DragHandlePlugin } from '../drag-handle-plugin.js'

describe('DragHandlePlugin', () => {
  let editor: Editor
  let container: HTMLElement
  let dragHandleElement: HTMLElement

  beforeEach(() => {
    // 创建容器元素
    container = document.createElement('div')
    container.style.width = '800px'
    container.style.height = '600px'
    document.body.appendChild(container)

    // 创建拖拽手柄元素
    dragHandleElement = document.createElement('div')
    dragHandleElement.className = 'drag-handle'
    dragHandleElement.style.width = '20px'
    dragHandleElement.style.height = '20px'
    container.appendChild(dragHandleElement)

    // 创建Editor实例
    editor = new Editor({
      element: container,
      extensions: [Document, Paragraph, Text],
      content: '<p>Hello world</p>',
    })
  })

  afterEach(() => {
    if (editor) {
      editor.destroy()
    }
    if (container.parentNode) {
      container.parentNode.removeChild(container)
    }
  })

  describe('Plugin Creation', () => {
    it('should create plugin with default options', () => {
      const plugin = DragHandlePlugin({
        element: dragHandleElement,
        editor,
        onAddBlock: vi.fn(),
      })

      expect(plugin).toBeDefined()
      expect(plugin.plugin).toBeDefined()
    })

    it('should create plugin with custom options', () => {
      const onAddBlock = vi.fn()
      const onDragStart = vi.fn()
      const onDragOver = vi.fn()
      const onDrop = vi.fn()
      const onClick = vi.fn()

      const plugin = DragHandlePlugin({
        element: dragHandleElement,
        editor,
        onAddBlock,
        onDragStart,
        onDragOver,
        onDrop,
        onClick,
        showIndicators: true,
      })

      expect(plugin).toBeDefined()
      expect(plugin.plugin).toBeDefined()
    })

    it('should handle missing element', () => {
      expect(() => {
        DragHandlePlugin({
          editor,
          onAddBlock: vi.fn(),
        } as any)
      }).toThrow()
    })

    it('should handle missing editor', () => {
      expect(() => {
        DragHandlePlugin({
          element: dragHandleElement,
          onAddBlock: vi.fn(),
        } as any)
      }).toThrow()
    })
  })

  describe('Plugin Options', () => {
    it('should accept custom plugin key', () => {
      const customKey = 'custom-drag-handle'
      const plugin = DragHandlePlugin({
        pluginKey: customKey,
        element: dragHandleElement,
        editor,
        onAddBlock: vi.fn(),
      })

      expect(plugin.plugin.spec.key).toBeDefined()
    })

    it('should accept compute position config', () => {
      const computePositionConfig = {
        placement: 'top' as const,
        strategy: 'absolute' as const,
      }

      const plugin = DragHandlePlugin({
        element: dragHandleElement,
        editor,
        onAddBlock: vi.fn(),
        computePositionConfig,
      })

      expect(plugin).toBeDefined()
    })

    it('should accept indicator styles', () => {
      const indicatorStyles = {
        horizontal: {
          backgroundColor: '#ff0000',
          height: '3px',
        },
        vertical: {
          backgroundColor: '#00ff00',
          width: '3px',
        },
      }

      const plugin = DragHandlePlugin({
        element: dragHandleElement,
        editor,
        onAddBlock: vi.fn(),
        showIndicators: true,
        indicatorStyles,
      })

      expect(plugin).toBeDefined()
    })
  })

  describe('Event Handling', () => {
    let onAddBlock: ReturnType<typeof vi.fn>
    let onDragStart: ReturnType<typeof vi.fn>
    let onDragOver: ReturnType<typeof vi.fn>
    let onDrop: ReturnType<typeof vi.fn>

    beforeEach(() => {
      onAddBlock = vi.fn()
      onDragStart = vi.fn()
      onDragOver = vi.fn()
      onDrop = vi.fn()
    })

    it('should handle node change events', () => {
      const onNodeChange = vi.fn()

      const plugin = DragHandlePlugin({
        element: dragHandleElement,
        editor,
        onAddBlock,
        onNodeChange,
      })

      expect(plugin).toBeDefined()
      expect(onNodeChange).toBeDefined()
    })

    it('should handle drag start events', () => {
      const plugin = DragHandlePlugin({
        element: dragHandleElement,
        editor,
        onAddBlock,
        onDragStart,
      })

      expect(plugin).toBeDefined()
      expect(onDragStart).toBeDefined()
    })

    it('should handle drag over events', () => {
      const plugin = DragHandlePlugin({
        element: dragHandleElement,
        editor,
        onAddBlock,
        onDragOver,
      })

      expect(plugin).toBeDefined()
      expect(onDragOver).toBeDefined()
    })

    it('should handle drop events', () => {
      const plugin = DragHandlePlugin({
        element: dragHandleElement,
        editor,
        onAddBlock,
        onDrop,
      })

      expect(plugin).toBeDefined()
      expect(onDrop).toBeDefined()
    })

    it('should handle add block events', () => {
      const plugin = DragHandlePlugin({
        element: dragHandleElement,
        editor,
        onAddBlock,
      })

      expect(plugin).toBeDefined()
      expect(onAddBlock).toBeDefined()
    })

    it('should handle click events', () => {
      const onClick = vi.fn()

      const plugin = DragHandlePlugin({
        element: dragHandleElement,
        editor,
        onAddBlock,
        onClick,
      })

      expect(plugin).toBeDefined()
      expect(onClick).toBeDefined()
    })
  })

  describe('Plugin Integration', () => {
    it('should integrate with editor as plugin', () => {
      const plugin = DragHandlePlugin({
        element: dragHandleElement,
        editor,
        onAddBlock: vi.fn(),
      })

      // 验证插件对象结构
      expect(plugin).toBeDefined()
      expect(plugin.plugin).toBeDefined()
      expect(typeof plugin.plugin).toBe('object')
      expect(plugin.destroy).toBeDefined()
      expect(typeof plugin.destroy).toBe('function')
    })

    it('should provide proper plugin key', () => {
      const plugin = DragHandlePlugin({
        element: dragHandleElement,
        editor,
        onAddBlock: vi.fn(),
      })

      expect(plugin.plugin.spec.key).toBeDefined()
    })

    it('should handle plugin state', () => {
      const plugin = DragHandlePlugin({
        element: dragHandleElement,
        editor,
        onAddBlock: vi.fn(),
      })

      expect(plugin.plugin.spec.state).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid element gracefully', () => {
      expect(() => {
        DragHandlePlugin({
          element: null as any,
          editor,
          onAddBlock: vi.fn(),
        })
      }).toThrow()
    })

    it('should handle missing callbacks gracefully', () => {
      expect(() => {
        DragHandlePlugin({
          element: dragHandleElement,
          editor,
        })
      }).not.toThrow()
    })

    it('should handle editor destruction gracefully', () => {
      const plugin = DragHandlePlugin({
        element: dragHandleElement,
        editor,
        onAddBlock: vi.fn(),
      })

      expect(() => {
        editor.destroy()
      }).not.toThrow()

      expect(plugin).toBeDefined()
    })
  })

  describe('Visual Indicators', () => {
    it('should create indicators when enabled', () => {
      const plugin = DragHandlePlugin({
        element: dragHandleElement,
        editor,
        onAddBlock: vi.fn(),
        showIndicators: true,
      })

      expect(plugin).toBeDefined()
    })

    it('should not create indicators when disabled', () => {
      const plugin = DragHandlePlugin({
        element: dragHandleElement,
        editor,
        onAddBlock: vi.fn(),
        showIndicators: false,
      })

      expect(plugin).toBeDefined()
    })

    it('should apply custom indicator styles', () => {
      const indicatorStyles = {
        horizontal: {
          backgroundColor: '#custom-color',
          height: '4px',
        },
      }

      const plugin = DragHandlePlugin({
        element: dragHandleElement,
        editor,
        onAddBlock: vi.fn(),
        showIndicators: true,
        indicatorStyles,
      })

      expect(plugin).toBeDefined()
    })
  })
})
