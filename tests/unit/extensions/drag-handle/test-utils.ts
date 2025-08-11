/**
 * 🛠️ 拖拽测试工具函数
 *
 * 提供统一的测试工具和Mock，确保测试一致性
 */

import { Editor } from '@tiptap/core'
import { Document } from '@tiptap/extension-document'
import { DragHandle } from '@tiptap/extension-drag-handle'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Text } from '@tiptap/extension-text'
import { vi } from 'vitest'

/**
 * 创建标准测试编辑器
 */
export function createTestEditor(dragHandleOptions = {}) {
  const defaultOptions = {
    onAddBlock: vi.fn(),
    onDragStart: vi.fn(),
    onDragOver: vi.fn(),
    onDrop: vi.fn(),
    onClick: vi.fn(),
  }

  return new Editor({
    element: document.createElement('div'),
    content: '<p>Test paragraph content</p>',
    extensions: [
      Document,
      Paragraph,
      Text,
      DragHandle.configure({
        ...defaultOptions,
        ...dragHandleOptions,
      }),
    ],
  })
}

/**
 * Mock DOM元素的getBoundingClientRect方法
 */
export function mockElementBoundingRect(element: HTMLElement, rect: Partial<DOMRect>) {
  const defaultRect = {
    x: 0,
    y: 0,
    width: 400,
    height: 100,
    top: 0,
    bottom: 100,
    left: 0,
    right: 400,
    toJSON: vi.fn(),
  }

  Object.defineProperty(element, 'getBoundingClientRect', {
    value: vi.fn(() => ({ ...defaultRect, ...rect })),
    writable: true,
    configurable: true,
  })
}

/**
 * 创建Mock拖拽事件
 */
export function createMockDragEvent(clientX: number, clientY: number): Partial<DragEvent> {
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
    composedPath: vi.fn(() => []),
    initEvent: vi.fn(),
    stopImmediatePropagation: vi.fn(),
  } as Partial<DragEvent>
}

/**
 * 验证SVG拖拽手柄结构
 */
export function validateSVGHandle(container: HTMLElement) {
  const svg = container.querySelector('svg')
  if (!svg) {return { isValid: false, error: 'SVG not found' }}

  const circles = svg.querySelectorAll('circle')
  if (circles.length !== 6) {
    return { isValid: false, error: `Expected 6 circles, found ${circles.length}` }
  }

  const width = svg.getAttribute('width')
  const height = svg.getAttribute('height')
  if (width !== '14' || height !== '14') {
    return { isValid: false, error: `Expected 14x14 SVG, found ${width}x${height}` }
  }

  return { isValid: true, svg, circles }
}

/**
 * 性能测试装饰器
 */
export function performanceTest(maxDuration: number) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const startTime = performance.now()
      const result = await originalMethod.apply(this, args)
      const duration = performance.now() - startTime

      if (duration > maxDuration) {
        throw new Error(`Performance test failed: ${propertyKey} took ${duration}ms, expected < ${maxDuration}ms`)
      }

      return result
    }

    return descriptor
  }
}

/**
 * 内存泄漏检测工具
 */
export class MemoryLeakDetector {
  private initialMemory: number
  private elements: Set<HTMLElement> = new Set()

  constructor() {
    this.initialMemory = this.getMemoryUsage()
  }

  trackElement(element: HTMLElement) {
    this.elements.add(element)
  }

  untrackElement(element: HTMLElement) {
    this.elements.delete(element)
  }

  private getMemoryUsage(): number {
    // 在实际环境中，这里会使用 performance.memory 或其他内存监控工具
    // 在测试环境中，我们简化为计数DOM元素
    return document.querySelectorAll('*').length
  }

  checkForLeaks(): { hasLeaks: boolean; report: string } {
    const currentMemory = this.getMemoryUsage()
    const memoryIncrease = currentMemory - this.initialMemory

    // 检查是否有DOM元素未被清理
    const stillAttached = Array.from(this.elements)

    const hasLeaks = stillAttached.length > 0 || memoryIncrease > 50

    const report = `
Memory Report:
- Initial elements: ${this.initialMemory}
- Current elements: ${currentMemory}  
- Memory increase: ${memoryIncrease}
- Tracked elements still attached: ${stillAttached.length}
- Has leaks: ${hasLeaks}
    `.trim()

    return { hasLeaks, report }
  }

  cleanup() {
    // Actually remove tracked elements from DOM
    this.elements.forEach(element => {
      if (element.isConnected || document.contains(element)) {
        element.remove()
      }
    })
    this.elements.clear()
  }
}
