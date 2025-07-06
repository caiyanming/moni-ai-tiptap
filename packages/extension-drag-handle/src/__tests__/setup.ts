import 'jest-environment-jsdom'

import { afterEach, beforeAll } from 'vitest'

// 类型定义
type FrameRequestCallback = (time: number) => void

// 🎯 模拟全局对象和API
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// 预定义的Mock类
const MockDragEvent = class extends Event {
  public dataTransfer: DataTransfer | null = null
  public clientX: number = 0
  public clientY: number = 0

  constructor(type: string, options?: any) {
    super(type, options)
    if (options) {
      this.clientX = options.clientX || 0
      this.clientY = options.clientY || 0
      this.dataTransfer = options.dataTransfer || null
    }
  }
}

// 🎯 模拟浏览器DOM API - 统一管理器
const MockBrowserAPIs = {
  // 模拟DragEvent构造函数（jsdom不完全支持）
  setupDragEvent(): void {
    if (!global.DragEvent) {
      global.DragEvent = MockDragEvent as any
    }
  },

  // 模拟DataTransfer对象
  setupDataTransfer(): void {
    if (!global.DataTransfer) {
      global.DataTransfer = function () {
        this.dropEffect = 'none'
        this.effectAllowed = 'uninitialized'
        this.files = [] as any
        this.items = [] as any
        this.types = []
        this.clearData = () => {}
        this.getData = () => ''
        this.setData = () => {}
        this.setDragImage = () => {}
      } as any
    }
  },

  // 模拟IntersectionObserver
  setupIntersectionObserver(): void {
    global.IntersectionObserver = function () {
      this.observe = () => {}
      this.unobserve = () => {}
      this.disconnect = () => {}
    } as any
  },

  // 模拟ResizeObserver
  setupResizeObserver(): void {
    global.ResizeObserver = function () {
      this.observe = () => {}
      this.unobserve = () => {}
      this.disconnect = () => {}
    } as any
  },

  // 模拟getComputedStyle
  setupGetComputedStyle(): void {
    if (!global.getComputedStyle) {
      global.getComputedStyle = () =>
        ({
          getPropertyValue: () => '',
        }) as any
    }
  },

  // 模拟requestAnimationFrame
  setupAnimationFrame(): void {
    if (!global.requestAnimationFrame) {
      global.requestAnimationFrame = (callback: FrameRequestCallback) => {
        return setTimeout(callback, 16) as any
      }
    }

    if (!global.cancelAnimationFrame) {
      global.cancelAnimationFrame = (id: number) => {
        clearTimeout(id)
      }
    }
  },

  // 初始化所有模拟API
  initialize(): void {
    this.setupDragEvent()
    this.setupDataTransfer()
    this.setupIntersectionObserver()
    this.setupResizeObserver()
    this.setupGetComputedStyle()
    this.setupAnimationFrame()
  },
}

// 初始化模拟API
MockBrowserAPIs.initialize()

// 🎯 增强jest匹配器
expect.extend({
  toBeInTheDocument(received) {
    const pass = received && received.ownerDocument === document
    if (pass) {
      return {
        message: () => `expected element not to be in the document`,
        pass: true,
      }
    }
    return {
      message: () => `expected element to be in the document`,
      pass: false,
    }
  },

  toHaveClass(received, className) {
    const pass = received && received.classList && received.classList.contains(className)
    if (pass) {
      return {
        message: () => `expected element not to have class "${className}"`,
        pass: true,
      }
    }
    return {
      message: () => `expected element to have class "${className}"`,
      pass: false,
    }
  },
})

// 🎯 清理函数，在每个测试后清理DOM
afterEach(() => {
  // 清理document.body中的所有子元素
  document.body.innerHTML = ''

  // 清理所有事件监听器
  const elements = document.querySelectorAll('*')
  elements.forEach(element => {
    const clonedElement = element.cloneNode(true)
    element.parentNode?.replaceChild(clonedElement, element)
  })
})

// 🎯 全局错误处理
beforeAll(() => {
  // 抑制特定的警告信息
  const originalError = console.error
  console.error = (...args: any[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Warning: ReactDOM.render is deprecated')) {
      return
    }
    originalError.call(console, ...args)
  }
})

// 🎯 类型扩展
declare global {
  interface CustomMatchers<R = unknown> {
    toBeInTheDocument(): R
    toHaveClass(className: string): R
  }
}
