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
    clientX?: number
    clientY?: number
    screenX?: number
    screenY?: number
    button?: number
    buttons?: number
    ctrlKey?: boolean
    shiftKey?: boolean
    altKey?: boolean
    metaKey?: boolean
  }

  interface MutationCallback {
    (mutations: MutationRecord[], observer: MutationObserver): void
  }

  // Add our custom drag event creator
  function createDragEvent(type: string, eventInitDict?: DragEventInit): DragEvent
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
    get() {
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

  // Create JSDOM-compatible DataTransfer constructor with working data storage
  global.DataTransfer = function () {
    const data = new Map<string, string>()

    this.files = [] as any
    this.items = [] as any
    this.types = []
    this.dropEffect = 'none'
    this.effectAllowed = 'all'

    this.clearData = vi.fn((format?: string) => {
      if (format) {
        data.delete(format)
        const index = this.types.indexOf(format)
        if (index > -1) {
          this.types.splice(index, 1)
        }
      } else {
        data.clear()
        this.types.length = 0
      }
    })

    this.getData = vi.fn((format: string) => {
      return data.get(format) || ''
    })

    this.setData = vi.fn((format: string, dataValue: string) => {
      data.set(format, dataValue)
      if (!this.types.includes(format)) {
        this.types.push(format)
      }
    })

    this.setDragImage = vi.fn()
  } as any

  // Create JSDOM-compatible DragEvent factory
  global.createDragEvent = (type: string, eventInitDict?: any) => {
    // Use CustomEvent as base to ensure JSDOM compatibility
    const customEvent = new CustomEvent(type, {
      bubbles: eventInitDict?.bubbles ?? true,
      cancelable: eventInitDict?.cancelable ?? true,
    })

    // Add drag-specific properties
    return Object.assign(customEvent, {
      dataTransfer: eventInitDict?.dataTransfer || new global.DataTransfer(),
      clientX: eventInitDict?.clientX ?? 0,
      clientY: eventInitDict?.clientY ?? 0,
      screenX: eventInitDict?.screenX ?? 0,
      screenY: eventInitDict?.screenY ?? 0,
      button: eventInitDict?.button ?? 0,
      buttons: eventInitDict?.buttons ?? 1,
      ctrlKey: eventInitDict?.ctrlKey ?? false,
      shiftKey: eventInitDict?.shiftKey ?? false,
      altKey: eventInitDict?.altKey ?? false,
      metaKey: eventInitDict?.metaKey ?? false,
    })
  }

  // JSDOM-compatible DragEvent constructor
  if (!global.DragEvent || !global.DragEvent.prototype) {
    global.DragEvent = class DragEvent extends Event {
      dataTransfer: DataTransfer
      clientX: number
      clientY: number
      screenX: number
      screenY: number
      button: number
      buttons: number
      ctrlKey: boolean
      shiftKey: boolean
      altKey: boolean
      metaKey: boolean

      constructor(type: string, eventInitDict?: any) {
        super(type, {
          bubbles: eventInitDict?.bubbles ?? true,
          cancelable: eventInitDict?.cancelable ?? true,
        })

        this.dataTransfer = eventInitDict?.dataTransfer || new global.DataTransfer()
        this.clientX = eventInitDict?.clientX ?? 0
        this.clientY = eventInitDict?.clientY ?? 0
        this.screenX = eventInitDict?.screenX ?? 0
        this.screenY = eventInitDict?.screenY ?? 0
        this.button = eventInitDict?.button ?? 0
        this.buttons = eventInitDict?.buttons ?? 1
        this.ctrlKey = eventInitDict?.ctrlKey ?? false
        this.shiftKey = eventInitDict?.shiftKey ?? false
        this.altKey = eventInitDict?.altKey ?? false
        this.metaKey = eventInitDict?.metaKey ?? false
      }
    } as any
  }

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
