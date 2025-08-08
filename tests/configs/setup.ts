/**
 * Vitest 全局测试设置
 */

import { afterAll, beforeAll, vi } from 'vitest'

// DOM环境设置
beforeAll(() => {
  // 设置jsdom环境的window大小
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 1024,
  })

  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1280,
  })

  // Mock getBoundingClientRect for DOM测试
  Element.prototype.getBoundingClientRect = vi.fn(() => ({
    bottom: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    width: 0,
    x: 0,
    y: 0,
    toJSON: vi.fn(),
  }))

  // Mock HTMLElement methods
  HTMLElement.prototype.scrollIntoView = vi.fn()
  HTMLElement.prototype.focus = vi.fn()
  HTMLElement.prototype.blur = vi.fn()

  // Mock isConnected property
  Object.defineProperty(HTMLElement.prototype, 'isConnected', {
    get () {
      return true
    }, // 默认返回true表示已连接
    configurable: true,
  })

  // Mock document.body.appendChild
  const originalAppendChild = document.body.appendChild
  document.body.appendChild = vi.fn(child => {
    // 简单模拟appendChild行为
    if (child && typeof child === 'object') {
      Object.defineProperty(child, 'parentNode', {
        value: document.body,
        writable: true,
        configurable: true,
      })
    }
    return child
  })

  // Mock removeChild
  document.body.removeChild = vi.fn(child => {
    if (child && child.parentNode === document.body) {
      Object.defineProperty(child, 'parentNode', {
        value: null,
        writable: true,
        configurable: true,
      })
    }
    return child
  })

  // Mock DragEvent构造函数
  global.DragEvent = class MockDragEvent extends Event {
    constructor(type: string, eventInitDict?: DragEventInit) {
      super(type, eventInitDict)
      this.dataTransfer = {
        clearData: vi.fn(),
        getData: vi.fn(),
        setData: vi.fn(),
        setDragImage: vi.fn(),
        files: [] as any,
        items: [] as any,
        types: [],
        dropEffect: 'none' as any,
        effectAllowed: 'all' as any,
      }
    }
    dataTransfer: DataTransfer
    clientX = 0
    clientY = 0
    screenX = 0
    screenY = 0
  } as any

  // Mock ResizeObserver
  global.ResizeObserver = class MockResizeObserver {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
  }

  // Mock MutationObserver
  global.MutationObserver = class MockMutationObserver {
    observe = vi.fn()
    unobserve = vi.fn()
    disconnect = vi.fn()
    takeRecords = vi.fn(() => []) // 返回空数组
    constructor(callback: MutationCallback) {
      this.callback = callback
    }
    callback: MutationCallback
  }

  // Mock performance.memory for内存测试
  Object.defineProperty(performance, 'memory', {
    value: {
      usedJSHeapSize: 1000000,
      totalJSHeapSize: 2000000,
      jsHeapSizeLimit: 4000000000,
    },
    writable: true,
  })

  console.log('✅ Vitest 测试环境设置完成')
})

afterAll(() => {
  // 清理全局mocks
  vi.clearAllMocks()
  console.log('✅ Vitest 测试环境清理完成')
})
