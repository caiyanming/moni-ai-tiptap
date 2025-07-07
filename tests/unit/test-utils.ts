/**
 * 测试工具文件 - 提供Mock对象和辅助函数
 */
import { vi } from 'vitest'

import type { Editor } from '../../packages/core/src/Editor'

// 基础类型定义
export interface ProseMirrorNode {
  type: { name: string; schema?: any }
  attrs: Record<string, any>
  content: ProseMirrorNode[] | null
  nodeSize: number
  textContent: string
  marks: any[]
  descendants?: (callback: (node: ProseMirrorNode, index: number) => void | false) => void
}

export interface Schema {
  nodes: Record<string, any>
  marks: Record<string, any>
  text: (text: string) => ProseMirrorNode
}

export interface Transaction {
  doc: ProseMirrorNode
  steps: any[]
  selection: { from: number; to: number; empty: boolean }
  setNodeMarkup?: any
  replaceWith?: any
  delete?: any
  insertText?: any
}

export interface EditorState {
  doc: ProseMirrorNode
  schema: Schema
  selection: { from: number; to: number; empty: boolean }
  tr: Transaction
}

export interface EditorView {
  state: EditorState
  dispatch: any
  dom: HTMLElement
  destroy: any
}

/**
 * 创建Mock节点
 */
function createMockNode(typeName: string, attrs: Record<string, any> = {}): ProseMirrorNode {
  const mockNode = {
    type: {
      name: typeName,
      create: vi.fn().mockImplementation((newAttrs?: any, content?: any) => {
        // 创建新节点时返回相同结构
        return {
          ...mockNode,
          attrs: newAttrs || attrs,
          content: content || null,
          textContent: content?.textContent || (typeName === 'text' ? newAttrs?.text || '' : 'Mock Content'),
        }
      }),
      createAndFill: vi.fn(),
    },
    attrs,
    content: null,
    nodeSize: 1,
    textContent: typeName === 'text' ? attrs.text || attrs.textContent || '' : 'Mock Content',
    marks: [],
  } as ProseMirrorNode

  return mockNode
}

/**
 * 创建Mock Schema
 */
function createMockSchema(): Schema {
  return {
    nodes: {
      doc: { content: 'block+' },
      paragraph: {
        content: 'inline*',
        group: 'block',
        parseDOM: [{ tag: 'p' }],
        toDOM: () => ['p', 0],
      },
      text: { group: 'inline' },
    },
    marks: {},
    text: (text: string) => createMockNode('text', { text }),
  } as unknown as Schema
}

/**
 * 创建Mock文档
 */
function createMockDocument(schema: Schema): ProseMirrorNode {
  const paragraph1 = createMockNode('paragraph', {
    moniBlockId: 'block-1',
    moniStreamType: 'text',
    moniStreamMode: 'replace',
    moniStreamId: null,
    moniStreamTarget: false,
    moniStreamStatus: 'idle',
    moniStreamProgress: 0,
    moniOperationQueue: [],
  })

  const paragraph2 = createMockNode('paragraph', {
    moniBlockId: 'block-2',
    moniStreamType: 'text',
    moniStreamMode: 'replace',
    moniStreamId: null,
    moniStreamTarget: false,
    moniStreamStatus: 'idle',
    moniStreamProgress: 0,
    moniOperationQueue: [],
  })

  const doc = {
    type: { name: 'doc', schema },
    content: [paragraph1, paragraph2],
    nodeSize: 4,
    textContent: 'Mock Document Content',
    attrs: {},
    marks: [],
    descendants: vi.fn(callback => {
      // 遍历当前文档节点（position 0）
      const docResult = callback(doc, 0)
      if (docResult === false) {
        return
      }

      // 遍历子节点（position 1, 2）
      const nodes = [paragraph1, paragraph2]
      nodes.forEach((node, index) => {
        const result = callback(node, index + 1) // 子节点的position从1开始
        if (result === false) {
          // 提前退出遍历
        }
      })
    }),
  } as ProseMirrorNode

  return doc
}

/**
 * 创建Mock事务
 */
function createMockTransaction(doc: ProseMirrorNode): Transaction {
  const transaction = {
    doc,
    steps: [{ apply: vi.fn(), toJSON: vi.fn() }],
    selection: { from: 1, to: 1, empty: true },
  } as unknown as Transaction

  // 添加链式方法
  ;(transaction as any).setNodeMarkup = vi.fn().mockReturnValue(transaction)
  ;(transaction as any).replaceWith = vi.fn().mockReturnValue(transaction)
  ;(transaction as any).delete = vi.fn().mockReturnValue(transaction)
  ;(transaction as any).insertText = vi.fn().mockReturnValue(transaction)

  return transaction
}

/**
 * 创建Mock编辑器状态
 */
function createMockEditorState(doc: ProseMirrorNode): EditorState {
  return {
    doc,
    schema: doc.type.schema || createMockSchema(),
    selection: { from: 1, to: 1, empty: true },
    tr: createMockTransaction(doc),
  } as EditorState
}

/**
 * 创建Mock DOM元素
 */
function createMockEditorDOM(): HTMLElement {
  const element = document.createElement('div')
  element.className = 'ProseMirror'

  // 添加测试块元素
  const block1 = document.createElement('p')
  block1.setAttribute('moni-block-id', 'block-1')
  block1.textContent = 'Block 1 Content'
  element.appendChild(block1)

  const block2 = document.createElement('p')
  block2.setAttribute('moni-block-id', 'block-2')
  block2.textContent = 'Block 2 Content'
  element.appendChild(block2)

  // 添加到页面
  document.body.appendChild(element)

  // Mock getBoundingClientRect
  Object.defineProperty(element, 'getBoundingClientRect', {
    value: vi.fn().mockReturnValue({
      top: 100,
      left: 100,
      right: 500,
      bottom: 200,
      width: 400,
      height: 100,
    }),
    writable: true,
  })

  // Mock querySelector
  const originalQuerySelector = element.querySelector
  element.querySelector = vi.fn().mockImplementation((selector: string) => {
    if (selector === '[moni-block-id="block-1"]') {
      return block1
    }
    if (selector === '[moni-block-id="block-2"]') {
      return block2
    }
    return originalQuerySelector.call(element, selector)
  })

  return element
}

/**
 * 创建Mock编辑器视图
 */
function createMockEditorView(state: EditorState): EditorView {
  return {
    state,
    dispatch: vi.fn(),
    dom: createMockEditorDOM(),
    destroy: vi.fn(),
  } as EditorView
}

/**
 * 创建Mock编辑器
 */
export function createMockEditor(): Editor {
  const schema = createMockSchema()
  const doc = createMockDocument(schema)
  const state = createMockEditorState(doc)
  const view = createMockEditorView(state)

  return {
    view,
    state,
    schema,
    commands: {
      focus: vi.fn().mockReturnValue(true),
      blur: vi.fn().mockReturnValue(true),
      setContent: vi.fn().mockReturnValue(true),
    },
    chain: vi.fn().mockReturnValue({
      focus: vi.fn().mockReturnValue({ run: vi.fn() }),
    }),
    can: vi.fn().mockReturnValue({
      focus: vi.fn().mockReturnValue(true),
    }),
    destroy: vi.fn(),
    isDestroyed: false,
  } as unknown as Editor
}

/**
 * 创建Mock流式操作
 */
export function createMockStreamOperation(overrides: Partial<any> = {}) {
  return {
    id: `operation-${Date.now()}`,
    sessionId: 'session-1',
    blockId: 'block-1',
    type: 'replace',
    content: 'Mock content',
    timestamp: Date.now(),
    ...overrides,
  }
}

/**
 * 创建Mock进度事件
 */
export function createMockProgressEvent(overrides: Partial<any> = {}) {
  return {
    type: 'progress',
    sessionId: 'session-1',
    progress: 0.5,
    timestamp: Date.now(),
    ...overrides,
  }
}

/**
 * 异步等待函数
 */
export function waitForAsync(ms: number = 0): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

/**
 * 创建批量操作
 */
export function createBatchOperations(count: number, sessionId: string = 'session-1', blockId: string = 'block-1') {
  return Array.from({ length: count }, (_, index) =>
    createMockStreamOperation({
      id: `operation-${sessionId}-${index}`,
      sessionId,
      blockId,
      content: `Content ${index + 1}`,
    }),
  )
}

/**
 * 清理DOM元素
 */
export function cleanupDOM(): void {
  // 清理所有测试创建的DOM元素
  const proseMirrorElements = document.querySelectorAll('.ProseMirror')
  proseMirrorElements.forEach(element => {
    if (element.parentNode) {
      element.parentNode.removeChild(element)
    }
  })

  // 清理进度条
  const progressBars = document.querySelectorAll('.moni-stream-progress-bar')
  progressBars.forEach(bar => {
    if (bar.parentNode) {
      bar.parentNode.removeChild(bar)
    }
  })

  // 清理其他测试元素
  const testElements = document.querySelectorAll('[data-test]')
  testElements.forEach(element => {
    if (element.parentNode) {
      element.parentNode.removeChild(element)
    }
  })
}

/**
 * 创建Mock DOM事件
 */
export function createMockDOMEvent(type: string, options: any = {}): Event {
  const event = new Event(type, { bubbles: true, cancelable: true, ...options })
  return event
}

/**
 * 验证节点属性
 */
export function expectNodeAttributes(node: ProseMirrorNode, expectedAttrs: Record<string, any>): void {
  Object.entries(expectedAttrs).forEach(([key, value]) => {
    if (node.attrs[key] !== value) {
      throw new Error(`Expected ${key} to be ${value}, got ${node.attrs[key]}`)
    }
  })
}

/**
 * 验证事务步骤
 */
export function expectTransactionSteps(transaction: Transaction, expectedStepCount: number): void {
  if (transaction.steps.length !== expectedStepCount) {
    throw new Error(`Expected ${expectedStepCount} steps, got ${transaction.steps.length}`)
  }
}

/**
 * 性能测试辅助函数
 */
export function measurePerformance(fn: () => void, iterations: number = 1000): number {
  const start = performance.now()

  for (let i = 0; i < iterations; i += 1) {
    fn()
  }

  const end = performance.now()
  return end - start
}
