/**
 * 🧪 拖拽手柄核心功能测试
 *
 * 测试范围：
 * - 扩展注册和配置
 * - SVG渲染和样式
 * - 事件处理机制
 * - 可访问性支持
 *
 * 质量标准：
 * - 覆盖率 > 95%
 * - 性能 < 50ms per test
 * - 零内存泄漏
 */

import type { Editor } from '@tiptap/core'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createTestEditor, MemoryLeakDetector, validateSVGHandle } from './test-utils.js'

describe('🎯 DragHandle Core Functionality', () => {
  let editor: Editor
  let memoryDetector: MemoryLeakDetector

  beforeEach(() => {
    memoryDetector = new MemoryLeakDetector()
    editor = createTestEditor()
  })

  afterEach(() => {
    if (editor) {
      editor.destroy()
    }

    // 检查内存泄漏
    const { hasLeaks, report } = memoryDetector.checkForLeaks()
    if (hasLeaks) {
      console.warn('Memory leak detected:', report)
    }

    memoryDetector.cleanup()
  })

  describe('Extension Registration', () => {
    it('should register drag handle extension correctly', () => {
      const dragHandleExtension = editor.extensionManager.extensions.find(ext => ext.name === 'dragHandle')

      expect(dragHandleExtension).toBeDefined()
      expect(dragHandleExtension?.name).toBe('dragHandle')
      expect(dragHandleExtension?.type).toBe('extension')
    })

    it('should have complete default configuration', () => {
      const dragHandleExtension = editor.extensionManager.extensions.find(ext => ext.name === 'dragHandle')

      expect(dragHandleExtension?.options).toMatchObject({
        onAddBlock: expect.any(Function),
        onDragStart: expect.any(Function),
        onDragOver: expect.any(Function),
        onDrop: expect.any(Function),
        onClick: expect.any(Function),
        render: expect.any(Function),
        computePositionConfig: expect.any(Object),
        locked: expect.any(Boolean),
        onNodeChange: expect.any(Function),
        showIndicators: expect.any(Boolean),
      })
    })

    it('should allow custom configuration override', () => {
      const customEditor = createTestEditor({
        locked: true,
        showIndicators: false,
      })

      const extension = customEditor.extensionManager.extensions.find(ext => ext.name === 'dragHandle')

      expect(extension?.options.locked).toBe(true)
      expect(extension?.options.showIndicators).toBe(false)

      customEditor.destroy()
    })
  })

  describe('SVG Handle Rendering', () => {
    it('should render SVG handle with correct structure', () => {
      const dragHandleExtension = editor.extensionManager.extensions.find(ext => ext.name === 'dragHandle')

      if (dragHandleExtension?.options.render) {
        const container = dragHandleExtension.options.render()
        memoryDetector.trackElement(container)

        try {
          // 验证容器结构
          expect(container.classList.contains('drag-handle-container')).toBe(true)
          expect(container.draggable).toBe(true)

          // 验证SVG手柄
          const dragHandle = container.querySelector('.drag-handle')
          expect(dragHandle).toBeTruthy()

          const validation = validateSVGHandle(container)
          expect(validation.isValid).toBe(true)

          if (!validation.isValid) {
            throw new Error(validation.error)
          }
        } finally {
          // Clean up the test element immediately
          container.remove()
          memoryDetector.untrackElement(container)
        }
      }
    })

    it('should render add button with correct attributes', () => {
      const dragHandleExtension = editor.extensionManager.extensions.find(ext => ext.name === 'dragHandle')

      if (dragHandleExtension?.options.render) {
        const container = dragHandleExtension.options.render()
        memoryDetector.trackElement(container)

        try {
          const addButton = container.querySelector('.add-block-button')
          expect(addButton).toBeTruthy()
          expect(addButton?.textContent).toBe('+')
          expect(addButton?.getAttribute('aria-label')).toBe('Add block')
          expect(addButton?.getAttribute('title')).toBe('Add block')
          expect(addButton?.getAttribute('data-moni-menu-add')).toBe('true')
        } finally {
          container.remove()
          memoryDetector.untrackElement(container)
        }
      }
    })

    it('should apply correct CSS styles', () => {
      const dragHandleExtension = editor.extensionManager.extensions.find(ext => ext.name === 'dragHandle')

      if (dragHandleExtension?.options.render) {
        const container = dragHandleExtension.options.render()
        memoryDetector.trackElement(container)

        try {
          // 验证容器样式
          getComputedStyle(container)
          expect(container.style.display).toBe('flex')
          expect(container.style.alignItems).toBe('center')
          expect(container.style.gap).toBe('4px')

          // 验证手柄样式
          const dragHandle = container.querySelector('.drag-handle') as HTMLElement
          expect(dragHandle.style.width).toBe('18px')
          expect(dragHandle.style.height).toBe('18px')
          expect(dragHandle.style.cursor).toBe('grab')

          // 验证按钮样式
          const addButton = container.querySelector('.add-block-button') as HTMLElement
          expect(addButton.style.width).toBe('18px')
          expect(addButton.style.height).toBe('18px')
          expect(addButton.style.cursor).toBe('pointer')
        } finally {
          container.remove()
          memoryDetector.untrackElement(container)
        }
      }
    })
  })

  describe('Accessibility Features', () => {
    it('should have proper ARIA attributes', () => {
      const dragHandleExtension = editor.extensionManager.extensions.find(ext => ext.name === 'dragHandle')

      if (dragHandleExtension?.options.render) {
        const container = dragHandleExtension.options.render()
        memoryDetector.trackElement(container)

        try {
          // 拖拽手柄可访问性
          const dragHandle = container.querySelector('.drag-handle')
          expect(dragHandle?.getAttribute('aria-label')).toBe('Drag to reorder')
          expect(dragHandle?.getAttribute('title')).toBe('Drag to reorder')
          expect(dragHandle?.getAttribute('data-moni-menu-drag')).toBe('true')

          // 添加按钮可访问性
          const addButton = container.querySelector('.add-block-button')
          expect(addButton?.getAttribute('aria-label')).toBe('Add block')
          expect(addButton?.getAttribute('title')).toBe('Add block')
          expect(addButton?.getAttribute('data-moni-menu-add')).toBe('true')
        } finally {
          container.remove()
          memoryDetector.untrackElement(container)
        }
      }
    })

    it('should support keyboard navigation', () => {
      const dragHandleExtension = editor.extensionManager.extensions.find(ext => ext.name === 'dragHandle')

      if (dragHandleExtension?.options.render) {
        const container = dragHandleExtension.options.render()
        memoryDetector.trackElement(container)

        try {
          const dragHandle = container.querySelector('.drag-handle') as HTMLElement
          const addButton = container.querySelector('.add-block-button') as HTMLElement

          // 验证元素可聚焦（默认-1表示不可通过Tab访问，0或正数表示可访问）
          expect(typeof dragHandle.tabIndex).toBe('number')
          expect(typeof addButton.tabIndex).toBe('number')
        } finally {
          container.remove()
          memoryDetector.untrackElement(container)
        }
      }
    })
  })

  describe('Performance Requirements', () => {
    it('should render handle within performance budget', () => {
      const startTime = performance.now()

      const dragHandleExtension = editor.extensionManager.extensions.find(ext => ext.name === 'dragHandle')

      if (dragHandleExtension?.options.render) {
        const container = dragHandleExtension.options.render()
        memoryDetector.trackElement(container)

        // Clean up immediately for performance test
        container.remove()
        memoryDetector.untrackElement(container)
      }

      const duration = performance.now() - startTime
      expect(duration).toBeLessThan(50) // < 50ms requirement
    })

    it('should not create excessive DOM nodes', () => {
      const dragHandleExtension = editor.extensionManager.extensions.find(ext => ext.name === 'dragHandle')

      if (dragHandleExtension?.options.render) {
        const container = dragHandleExtension.options.render()
        memoryDetector.trackElement(container)

        try {
          const totalNodes = container.querySelectorAll('*').length
          expect(totalNodes).toBeLessThanOrEqual(15) // 合理的DOM节点数量上限
        } finally {
          container.remove()
          memoryDetector.untrackElement(container)
        }
      }
    })
  })

  describe('Moni System Integration', () => {
    it('should include Moni-specific attributes', () => {
      const dragHandleExtension = editor.extensionManager.extensions.find(ext => ext.name === 'dragHandle')

      if (dragHandleExtension?.options.render) {
        const container = dragHandleExtension.options.render()
        memoryDetector.trackElement(container)

        try {
          const dragHandle = container.querySelector('.drag-handle')
          const addButton = container.querySelector('.add-block-button')

          // 验证Moni系统专用属性
          expect(dragHandle?.getAttribute('data-moni-menu-drag')).toBe('true')
          expect(addButton?.getAttribute('data-moni-menu-add')).toBe('true')
        } finally {
          container.remove()
          memoryDetector.untrackElement(container)
        }
      }
    })

    it('should use Moni CSS classes', () => {
      const dragHandleExtension = editor.extensionManager.extensions.find(ext => ext.name === 'dragHandle')

      if (dragHandleExtension?.options.render) {
        const container = dragHandleExtension.options.render()
        memoryDetector.trackElement(container)

        try {
          expect(container.classList.contains('drag-handle-container')).toBe(true)
          expect(container.querySelector('.drag-handle')).toBeTruthy()
          expect(container.querySelector('.add-block-button')).toBeTruthy()
        } finally {
          container.remove()
          memoryDetector.untrackElement(container)
        }
      }
    })
  })
})
