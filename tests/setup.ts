/* eslint-disable max-classes-per-file */
/* eslint-disable no-unused-vars */
/* eslint-disable arrow-parens */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { vi } from 'vitest'

// 模拟window对象的属性
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: () => '',
  }),
})

// 模拟IntersectionObserver
const mockIntersectionObserver = vi.fn()
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
})
window.IntersectionObserver = mockIntersectionObserver

// 模拟ResizeObserver
const mockResizeObserver = vi.fn()
mockResizeObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
})
window.ResizeObserver = mockResizeObserver

// 模拟MutationObserver
const mockMutationObserver = vi.fn()
mockMutationObserver.mockReturnValue({
  observe: () => null,
  disconnect: () => null,
  takeRecords: () => [],
})
window.MutationObserver = mockMutationObserver

// 模拟DOMRect
Object.defineProperty(window, 'DOMRect', {
  value: class DOMRect {
    x: number
    y: number
    width: number
    height: number
    top: number
    left: number
    bottom: number
    right: number

    constructor(x = 0, y = 0, width = 0, height = 0) {
      this.x = x
      this.y = y
      this.width = width
      this.height = height
      this.top = y
      this.left = x
      this.bottom = y + height
      this.right = x + width
    }
  },
})

// 模拟HTMLElement的getBoundingClientRect
Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
  value: () => ({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  }),
})

// 模拟scrollIntoView
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  value: () => {},
})

// 模拟Element.animate
Object.defineProperty(HTMLElement.prototype, 'animate', {
  value: () => ({
    finished: Promise.resolve(),
    cancel: () => {},
  }),
})

// 模拟matchMedia
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// 模拟requestAnimationFrame
Object.defineProperty(window, 'requestAnimationFrame', {
  value: (callback: (time: number) => void) => {
    return setTimeout(() => callback(Date.now()), 16)
  },
})

Object.defineProperty(window, 'cancelAnimationFrame', {
  value: (id: number) => {
    clearTimeout(id)
  },
})

// 模拟getSelection
Object.defineProperty(window, 'getSelection', {
  value: () => ({
    rangeCount: 0,
    getRangeAt: () => null,
    removeAllRanges: () => {},
    addRange: () => {},
  }),
})

// 模拟document.elementFromPoint
Object.defineProperty(document, 'elementFromPoint', {
  value: () => null,
})

// 模拟document.caretRangeFromPoint
Object.defineProperty(document, 'caretRangeFromPoint', {
  value: () => null,
})

// 模拟ClipboardEvent
Object.defineProperty(window, 'ClipboardEvent', {
  value: class ClipboardEvent extends Event {
    clipboardData: any

    constructor(type: string, options: any = {}) {
      super(type, options)
      this.clipboardData = options.clipboardData || null
    }
  },
})

// 模拟DataTransfer
Object.defineProperty(window, 'DataTransfer', {
  value: class DataTransfer {
    items: any[]
    files: any[]
    types: string[]

    constructor() {
      this.items = []
      this.files = []
      this.types = []
    }

    setData(format: string, _data: string) {
      this.types.push(format)
    }

    getData(_format: string) {
      return ''
    }

    clearData() {
      this.items = []
      this.files = []
      this.types = []
    }
  },
})

// 模拟Range
Object.defineProperty(window, 'Range', {
  value: class Range {
    startContainer: Node | null
    endContainer: Node | null
    startOffset: number
    endOffset: number
    collapsed: boolean

    constructor() {
      this.startContainer = null
      this.endContainer = null
      this.startOffset = 0
      this.endOffset = 0
      this.collapsed = true
    }

    setStart() {}
    setEnd() {}
    selectNode() {}
    selectNodeContents() {}
    collapse() {}
    deleteContents() {}
    insertNode() {}
    cloneContents() {
      return document.createDocumentFragment()
    }
    extractContents() {
      return document.createDocumentFragment()
    }
    getBoundingClientRect() {
      return {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
      }
    }
  },
})

// 设置全局变量
global.Event = Event
global.CustomEvent = CustomEvent
global.Node = Node
global.Element = Element
global.HTMLElement = HTMLElement
global.Document = Document
global.DOMParser = DOMParser
global.XMLSerializer = XMLSerializer

// 捕获并忽略未处理的promise rejection
process.on('unhandledRejection', error => {
  console.warn('Unhandled promise rejection in test:', error)
})

// 配置测试环境
vi.mock('canvas', () => ({
  createCanvas: () => ({
    getContext: () => ({
      measureText: () => ({ width: 0 }),
      fillText: () => {},
    }),
  }),
}))

// 全局测试配置
export const TEST_CONFIG = {
  timeout: 5000,
  retries: 2,
  mockTimers: true,
}
