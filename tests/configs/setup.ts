/**
 * Vitest 全局测试设置
 */

import { afterAll, beforeAll, vi } from 'vitest'

// Type declarations for DOM APIs
declare global {
  interface EventInit {
    bubbles?: boolean
    cancelable?: boolean
    composed?: boolean
  }
  
  interface DragEventInit extends EventInit {
    dataTransfer?: DataTransfer | null
  }
  
  interface MutationCallback {
    (mutations: MutationRecord[], observer: MutationObserver): void
  }
}

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

  // Mock DOM APIs with simplified approach to avoid class-count issues
  const mockDataTransfer = {
    clearData: vi.fn(),
    getData: vi.fn(() => ''),
    setData: vi.fn(),
    setDragImage: vi.fn(),
    files: [] as any,
    items: [] as any,
    types: [],
    dropEffect: 'none' as any,
    effectAllowed: 'all' as any,
  }

  global.DataTransfer = vi.fn(() => mockDataTransfer) as any

  global.DragEvent = vi.fn((type: string, eventInitDict?: any) => ({
    type,
    dataTransfer: eventInitDict?.dataTransfer || mockDataTransfer,
    clientX: 0,
    clientY: 0,
    screenX: 0,
    screenY: 0,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  })) as any

  global.ResizeObserver = vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })) as any

  global.MutationObserver = vi.fn(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    takeRecords: vi.fn(() => []),
  })) as any

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
