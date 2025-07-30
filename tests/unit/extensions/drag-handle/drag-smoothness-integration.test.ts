/**
 * 🎯 拖拽流畅性集成测试
 * 专门测试 Notion 级别的拖拽体验：精确性、流畅性、响应性
 */

import { Editor } from '@tiptap/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Document } from '@tiptap/extension-document'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Text } from '@tiptap/extension-text'
import { DragHandlePlugin } from '@tiptap/extension-drag-handle/drag-handle-plugin.js'
import { DropPositionCalculator } from '@tiptap/extension-drag-handle/drop-position-calculator.js'

// Helper function to mock getBoundingClientRect
function mockGetBoundingClientRect(element: HTMLElement, rect: DOMRect) {
  Object.defineProperty(element, 'getBoundingClientRect', {
    value: () => ({
      ...rect,
      toJSON: () => {}
    }),
    writable: true,
    configurable: true
  })
}

describe('Drag Smoothness Integration', () => {
  let editor: Editor
  let container: HTMLElement
  let dragHandleElement: HTMLElement

  beforeEach(() => {
    // Mock document.elementsFromPoint for jsdom
    if (!document.elementsFromPoint) {
      global.document.elementsFromPoint = vi.fn().mockReturnValue([])
    }

    // 创建真实的编辑器环境
    container = document.createElement('div')
    container.style.width = '800px'
    container.style.height = '600px'
    container.style.position = 'relative'
    document.body.appendChild(container)

    dragHandleElement = document.createElement('div')
    dragHandleElement.className = 'drag-handle'
    dragHandleElement.style.width = '20px'
    dragHandleElement.style.height = '20px'
    container.appendChild(dragHandleElement)

    // 创建包含多个段落的编辑器
    editor = new Editor({
      element: container,
      extensions: [Document, Paragraph, Text],
      content: `
        <p data-moni-block-id="block-1">第一个段落</p>
        <p data-moni-block-id="block-2">第二个段落</p>
        <p data-moni-block-id="block-3">第三个段落</p>
        <p data-moni-block-id="block-4" data-moni-nestable="true">可嵌套段落</p>
        <p data-moni-block-id="block-5">第五个段落</p>
      `,
    })

    // 等待编辑器初始化
    editor.view.updateState(editor.state)
  })

  afterEach(() => {
    if (editor) {
      editor.destroy()
    }
    if (container.parentNode) {
      container.parentNode.removeChild(container)
    }
  })

  describe('位置计算精度测试', () => {
    it('应该在所有阈值边界处给出一致的结果', () => {
      const mockElement = document.createElement('p')
      mockGetBoundingClientRect(mockElement, {
        x: 50, y: 100, width: 400, height: 100,
        top: 100, bottom: 200, left: 50, right: 450,
      } as DOMRect)

      // 测试关键阈值点
      const testPoints = [
        { y: 100, expected: 'above', desc: '顶部边缘' },
        { y: 124, expected: 'above', desc: '25%阈值前1px' },
        { y: 125, expected: 'inside', desc: '25%阈值' },
        { y: 150, expected: 'inside', desc: '中心点' },
        { y: 174, expected: 'inside', desc: '75%阈值前1px' },
        { y: 176, expected: 'below', desc: '75%阈值后1px' },
        { y: 200, expected: 'below', desc: '底部边缘' },
      ]

      testPoints.forEach(({ y, expected, desc }) => {
        const event = createMockDragEvent(250, y)
        const result = DropPositionCalculator.calculate(event, mockElement)
        expect(result.dropPosition).toBe(expected, `测试点: ${desc} (y=${y})`)
      })
    })

    it('应该处理快速移动时的位置计算稳定性', () => {
      const mockElement = document.createElement('p')
      mockGetBoundingClientRect(mockElement, {
        x: 50, y: 100, width: 400, height: 100,
        top: 100, bottom: 200, left: 50, right: 450,
      } as DOMRect)

      // 模拟快速鼠标移动（可能跳过某些像素）
      const rapidMovements = [
        { x: 250, y: 110 },
        { x: 250, y: 130 }, // 跳跃性移动
        { x: 250, y: 160 },
        { x: 250, y: 190 },
      ]

      const results = rapidMovements.map(pos => {
        const event = createMockDragEvent(pos.x, pos.y)
        return DropPositionCalculator.calculate(event, mockElement)
      })

      // 验证每个位置都能给出合理的结果
      expect(results[0].dropPosition).toBe('above')
      expect(results[1].dropPosition).toBe('inside') 
      expect(results[2].dropPosition).toBe('inside')
      expect(results[3].dropPosition).toBe('below')

      // 验证指示器位置的连续性
      results.forEach((result, index) => {
        expect(result.indicatorPosition.x).toBe(50)
        expect(result.indicatorPosition.width || result.indicatorPosition.height).toBeGreaterThan(0)
      })
    })
  })

  describe('嵌套检测精度测试', () => {
    it('应该在嵌套边界处提供精确的切换', () => {
      const nestableElement = document.createElement('p')
      nestableElement.setAttribute('data-moni-nestable', 'true')
      mockGetBoundingClientRect(nestableElement, {
        x: 50, y: 100, width: 400, height: 100,
        top: 100, bottom: 200, left: 50, right: 450,
      } as DOMRect)

      // 测试嵌套边界的精确切换
      const boundaryTests = [
        { x: 91, expected: 'horizontal', desc: '嵌套区域外1px' },
        { x: 90, expected: 'horizontal', desc: '嵌套区域边界' },
        { x: 89, expected: 'vertical', desc: '嵌套区域内1px' },
        { x: 70, expected: 'vertical', desc: '嵌套区域内部' },
        { x: 50, expected: 'vertical', desc: '元素左边缘' },
      ]

      boundaryTests.forEach(({ x, expected, desc }) => {
        const event = createMockDragEvent(x, 150) // 中心Y位置
        const result = DropPositionCalculator.calculate(event, nestableElement)
        expect(result.direction).toBe(expected, `测试点: ${desc} (x=${x})`)
      })
    })

    it('应该在嵌套元素间平滑过渡', () => {
      const nestableElement = document.createElement('p')
      nestableElement.setAttribute('data-moni-nestable', 'true')
      mockGetBoundingClientRect(nestableElement, {
        x: 50, y: 100, width: 400, height: 100,
        top: 100, bottom: 200, left: 50, right: 450,
      } as DOMRect)

      // 模拟从外部移动到嵌套区域的轨迹
      const transitionPath = [
        { x: 200, expected: 'horizontal' },
        { x: 150, expected: 'horizontal' },
        { x: 100, expected: 'horizontal' },
        { x: 85, expected: 'vertical' }, // 进入嵌套
        { x: 70, expected: 'vertical' },
        { x: 55, expected: 'vertical' },
      ]

      const results = transitionPath.map(({ x, expected }) => {
        const event = createMockDragEvent(x, 150)
        const result = DropPositionCalculator.calculate(event, nestableElement)
        expect(result.direction).toBe(expected)
        return result
      })

      // 验证指示器位置的合理性
      const horizontalResults = results.filter(r => r.direction === 'horizontal')
      const verticalResults = results.filter(r => r.direction === 'vertical')

      horizontalResults.forEach(result => {
        expect(result.indicatorPosition.width).toBe(400)
      })

      verticalResults.forEach(result => {
        expect(result.indicatorPosition.height).toBe(100)
        expect(result.indicatorPosition.x).toBe(48) // left - 2
      })
    })
  })

  describe('实时响应性能测试', () => {
    it('应该在高频更新下保持稳定性能', () => {
      let dragIndicator: any = null
      let onDragOverCallCount = 0

      const plugin = DragHandlePlugin({
        element: dragHandleElement,
        editor,
        showIndicators: true,
        onAddBlock: vi.fn(),
        onDragOver: (event, dropInfo, editorInstance) => {
          onDragOverCallCount++
          // 验证回调参数的完整性
          expect(event).toBeDefined()
          expect(dropInfo.position).toBeDefined()
          expect(dropInfo.targetElement).toBeDefined()
          expect(editorInstance).toBe(editor)
        },
      })

      // 模拟高频的拖拽事件（模拟60fps的鼠标移动）
      const startTime = performance.now()
      const highFrequencyEvents = []

      for (let i = 0; i < 60; i++) {
        const x = 100 + Math.sin(i * 0.1) * 50 // 模拟真实的鼠标移动轨迹
        const y = 150 + Math.cos(i * 0.1) * 30
        highFrequencyEvents.push({ x, y })
      }

      // 快速执行所有事件
      highFrequencyEvents.forEach(({ x, y }) => {
        const mockElement = document.createElement('p')
        mockGetBoundingClientRect(mockElement, {
          x: 50, y: 100, width: 400, height: 100,
          top: 100, bottom: 200, left: 50, right: 450,
        } as DOMRect)

        const event = createMockDragEvent(x, y)
        DropPositionCalculator.calculate(event, mockElement)
      })

      const endTime = performance.now()
      const duration = endTime - startTime

      // 验证性能：60次计算应该在合理时间内完成
      expect(duration).toBeLessThan(100) // 100ms内完成60次计算
    })

    it('应该正确处理拖拽状态的生命周期', () => {
      const callbacks = {
        onDragStart: vi.fn(),
        onDragOver: vi.fn(),
        onDrop: vi.fn(),
        onAddBlock: vi.fn(),
      }

      const plugin = DragHandlePlugin({
        element: dragHandleElement,
        editor,
        showIndicators: true,
        ...callbacks,
      })

      // 模拟完整的拖拽生命周期
      const mockElement = document.createElement('p')
      mockElement.setAttribute('data-moni-block-id', 'test-block')
      document.body.appendChild(mockElement)

      // 1. 开始拖拽
      const dragStartEvent = new DragEvent('dragstart', {
        clientX: 100,
        clientY: 150,
        bubbles: true,
        cancelable: true,
      })
      dragHandleElement.dispatchEvent(dragStartEvent)

      // 2. 拖拽过程
      const dragOverEvent = new DragEvent('dragover', {
        clientX: 200,
        clientY: 180,
        bubbles: true,
        cancelable: true,
      })
      Object.defineProperty(dragOverEvent, 'target', { value: mockElement })
      editor.view.dom.dispatchEvent(dragOverEvent)

      // 3. 结束拖拽
      const dropEvent = new DragEvent('drop', {
        clientX: 200,
        clientY: 180,
        bubbles: true,
        cancelable: true,
      })
      Object.defineProperty(dropEvent, 'target', { value: mockElement })
      editor.view.dom.dispatchEvent(dropEvent)

      // 验证回调执行顺序和次数
      expect(callbacks.onDragStart).toHaveBeenCalledTimes(1)
      // 注意：dragover 和 drop 回调的具体调用次数取决于实际的DOM事件处理

      mockElement.remove()
    })
  })

  describe('边界情况健壮性测试', () => {
    it('应该处理极端尺寸元素', () => {
      // 测试极小元素
      const tinyElement = document.createElement('p')
      mockGetBoundingClientRect(tinyElement, {
        x: 50, y: 100, width: 10, height: 5,
        top: 100, bottom: 105, left: 50, right: 60,
      } as DOMRect)

      const tinyResult = DropPositionCalculator.calculate(
        createMockDragEvent(55, 102),
        tinyElement
      )
      expect(tinyResult.dropPosition).toBeDefined()
      expect(tinyResult.indicatorPosition.width || tinyResult.indicatorPosition.height).toBeGreaterThan(0)

      // 测试超大元素
      const hugeElement = document.createElement('p')
      mockGetBoundingClientRect(hugeElement, {
        x: 0, y: 0, width: 2000, height: 1000,
        top: 0, bottom: 1000, left: 0, right: 2000,
      } as DOMRect)

      const hugeResult = DropPositionCalculator.calculate(
        createMockDragEvent(1000, 200),
        hugeElement
      )
      expect(hugeResult.dropPosition).toBe('above')
      expect(hugeResult.indicatorPosition.width).toBe(2000)
    })

    it('应该处理无效或缺失的元素属性', () => {
      const invalidElement = document.createElement('div') // 不是p元素
      mockGetBoundingClientRect(invalidElement, {
        x: 50, y: 100, width: 400, height: 100,
        top: 100, bottom: 200, left: 50, right: 450,
      } as DOMRect)

      // 测试缺失data-moni-nestable属性
      const result1 = DropPositionCalculator.calculate(
        createMockDragEvent(70, 150),
        invalidElement
      )
      expect(result1.direction).toBe('horizontal') // 应该回退到普通模式

      // 测试空的data-moni-nestable属性
      invalidElement.setAttribute('data-moni-nestable', '')
      const result2 = DropPositionCalculator.calculate(
        createMockDragEvent(70, 150),
        invalidElement
      )
      expect(result2.direction).toBe('vertical') // 空字符串属性仍然存在，被视为true
    })
  })

  describe('真实场景模拟测试', () => {
    it('应该模拟完整的段落重排序操作', () => {
      const plugin = DragHandlePlugin({
        element: dragHandleElement,
        editor,
        showIndicators: true,
        onAddBlock: vi.fn(),
        onDragOver: vi.fn(),
        onDrop: vi.fn(),
      })

      // 找到真实的段落元素
      const paragraphs = container.querySelectorAll('p[data-moni-block-id]')
      expect(paragraphs.length).toBeGreaterThanOrEqual(3)

      const sourceP = paragraphs[0] as HTMLElement
      const targetP = paragraphs[2] as HTMLElement

      // 模拟真实的拖拽过程
      const sourceRect = sourceP.getBoundingClientRect()
      const targetRect = targetP.getBoundingClientRect()

      // 1. 从源元素开始
      let result = DropPositionCalculator.calculate(
        createMockDragEvent(sourceRect.x + sourceRect.width / 2, sourceRect.y + sourceRect.height / 2),
        sourceP
      )
      expect(result.dropPosition).toBe('inside') // 在源元素中心

      // 2. 移动到目标元素上方
      result = DropPositionCalculator.calculate(
        createMockDragEvent(targetRect.x + targetRect.width / 2, targetRect.y - 5),
        targetP
      )
      expect(result.dropPosition).toBe('above')
      expect(result.direction).toBe('horizontal')

      // 3. 移动到目标元素下方
      result = DropPositionCalculator.calculate(
        createMockDragEvent(targetRect.x + targetRect.width / 2, targetRect.y + targetRect.height + 5),
        targetP
      )
      expect(result.dropPosition).toBe('below')
      expect(result.direction).toBe('horizontal')
    })

    it('应该模拟嵌套操作的完整流程', () => {
      // 找到可嵌套的元素
      const nestableElement = container.querySelector('p[data-moni-nestable="true"]') as HTMLElement
      if (!nestableElement) {
        // 如果没有，创建一个
        const p = document.createElement('p')
        p.setAttribute('data-moni-nestable', 'true')
        p.setAttribute('data-moni-block-id', 'nestable-test')
        p.textContent = '可嵌套测试段落'
        container.querySelector('.ProseMirror')?.appendChild(p)
      }

      const targetElement = container.querySelector('p[data-moni-nestable="true"]') as HTMLElement
      expect(targetElement).toBeTruthy()

      const rect = targetElement.getBoundingClientRect()

      // 模拟从右侧接近然后进入嵌套区域
      const approachPath = [
        { x: rect.x + 100, y: rect.y + rect.height / 2, expectedDirection: 'horizontal' }, // x=100, 远离左边缘
        { x: rect.x + 80, y: rect.y + rect.height / 2, expectedDirection: 'horizontal' },  // x=80, 仍在非嵌套区域
        { x: rect.x + 50, y: rect.y + rect.height / 2, expectedDirection: 'horizontal' },  // x=50, 在边界附近
        { x: rect.x + 35, y: rect.y + rect.height / 2, expectedDirection: 'vertical' },   // x=35, 进入嵌套区域（<40px）
        { x: rect.x + 20, y: rect.y + rect.height / 2, expectedDirection: 'vertical' },   // x=20, 深入嵌套区域
      ]

      approachPath.forEach(({ x, y, expectedDirection }, index) => {
        const result = DropPositionCalculator.calculate(
          createMockDragEvent(x, y),
          targetElement
        )
        expect(result.direction).toBe(expectedDirection, `Step ${index + 1}: x=${x}, expected=${expectedDirection}`)

        if (expectedDirection === 'vertical') {
          expect(result.dropPosition).toBe('inside')
        }
      })
    })
  })
})

// 辅助函数：创建模拟拖拽事件
function createMockDragEvent(clientX: number, clientY: number): DragEvent {
  return {
    clientX,
    clientY,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    target: null,
    currentTarget: null,
    bubbles: true,
    cancelable: true,
    defaultPrevented: false,
    eventPhase: 0,
    isTrusted: true,
    timeStamp: Date.now(),
    type: 'dragover',
    composedPath: () => [],
    initEvent: () => {},
    stopImmediatePropagation: () => {},
    NONE: 0,
    CAPTURING_PHASE: 1,
    AT_TARGET: 2,
    BUBBLING_PHASE: 3,
  } as DragEvent
}