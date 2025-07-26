/**
 * 测试工具文件 - 提供Mock对象和辅助函数
 */
import { vi } from 'vitest'

import type { Editor } from '../../packages/core/src/Editor'
import { BlockOperationStatus, BlockOperationType } from '../../packages/core/src/StreamOperationManager.js'

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
function createMockNode(typeName: string, attrs?: Record<string, any>, content?: any): ProseMirrorNode {
  // 🔧 动态计算nodeSize - 根据内容长度
  const nodeAttrs = attrs || {}
  const calculateNodeSize = (nodeType: string, nodeContent?: any): number => {
    if (nodeType === 'text') {
      const textContent = nodeAttrs.text || nodeAttrs.textContent || ''
      return textContent.length + 1 // text节点大小 = 文本长度 + 1
    }

    // 块级节点大小 = 2(开始+结束标记) + 内容大小
    if (nodeContent && typeof nodeContent === 'object' && nodeContent.textContent) {
      return nodeContent.textContent.length + 2
    }

    // 默认块级节点大小
    return 2
  }

  const nodeSize = calculateNodeSize(typeName, content)
  const textContent =
    typeName === 'text' ? nodeAttrs.text || nodeAttrs.textContent || '' : content?.textContent || 'Mock Content'

  const mockNode = {
    type: {
      name: typeName,
      create: vi.fn().mockImplementation((newAttrs?: any, newContent?: any) => {
        // 创建新节点时返回相同结构，但重新计算size
        const newSize = calculateNodeSize(typeName, newContent)
        const newTextContent = typeName === 'text' ? newAttrs?.text || '' : newContent?.textContent || 'Mock Content'

        return {
          ...mockNode,
          attrs: newAttrs || nodeAttrs,
          content: newContent || null,
          nodeSize: newSize,
          textContent: newTextContent,
        }
      }),
      createAndFill: vi.fn(),
    },
    attrs: nodeAttrs,
    content: content || null,
    nodeSize,
    textContent,
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
        create: vi.fn().mockImplementation((attrs: any, content: any) => createMockNode('paragraph', attrs, content)),
      },
      heading: {
        content: 'inline*',
        group: 'block',
        defining: true,
        parseDOM: [{ tag: 'h1' }, { tag: 'h2' }, { tag: 'h3' }, { tag: 'h4' }, { tag: 'h5' }, { tag: 'h6' }],
        toDOM: (node: any) => [`h${node.attrs.level}`, 0],
        create: vi.fn().mockImplementation((attrs: any, content: any) => createMockNode('heading', attrs, content)),
      },
      codeBlock: {
        content: 'text*',
        marks: '',
        group: 'block',
        code: true,
        defining: true,
        parseDOM: [{ tag: 'pre', preserveWhitespace: 'full' }],
        toDOM: () => ['pre', ['code', 0]],
        create: vi.fn().mockImplementation((attrs: any, content: any) => createMockNode('codeBlock', attrs, content)),
      },
      bulletList: {
        content: 'listItem+',
        group: 'block list',
        parseDOM: [{ tag: 'ul' }],
        toDOM: () => ['ul', 0],
        create: vi.fn().mockImplementation((attrs: any, content: any) => createMockNode('bulletList', attrs, content)),
      },
      orderedList: {
        content: 'listItem+',
        group: 'block list',
        parseDOM: [{ tag: 'ol' }],
        toDOM: () => ['ol', 0],
        create: vi.fn().mockImplementation((attrs: any, content: any) => createMockNode('orderedList', attrs, content)),
      },
      listItem: {
        content: 'paragraph block*',
        defining: true,
        parseDOM: [{ tag: 'li' }],
        toDOM: () => ['li', 0],
        create: vi.fn().mockImplementation((attrs: any, content: any) => createMockNode('listItem', attrs, content)),
      },
      blockquote: {
        content: 'block+',
        group: 'block',
        defining: true,
        parseDOM: [{ tag: 'blockquote' }],
        toDOM: () => ['blockquote', 0],
        create: vi.fn().mockImplementation((attrs: any, content: any) => createMockNode('blockquote', attrs, content)),
      },
      horizontalRule: {
        group: 'block',
        parseDOM: [{ tag: 'hr' }],
        toDOM: () => ['hr'],
        create: vi
          .fn()
          .mockImplementation((attrs: any, content: any) => createMockNode('horizontalRule', attrs, content)),
      },
      text: {
        group: 'inline',
        create: vi.fn().mockImplementation((attrs: any) => createMockNode('text', attrs)),
      },
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

  const heading = createMockNode('heading', {
    moniBlockId: 'block-3',
    level: 1,
    moniStreamType: 'text',
    moniStreamMode: 'replace',
    moniStreamId: null,
    moniStreamTarget: false,
    moniStreamStatus: 'idle',
    moniStreamProgress: 0,
    moniOperationQueue: [],
  })

  const codeBlock = createMockNode('codeBlock', {
    moniBlockId: 'block-4',
    language: 'javascript',
    moniStreamType: 'text',
    moniStreamMode: 'replace',
    moniStreamId: null,
    moniStreamTarget: false,
    moniStreamStatus: 'idle',
    moniStreamProgress: 0,
    moniOperationQueue: [],
  })

  // 🔧 动态计算文档大小 - 根据子节点实际大小
  const childNodes = [paragraph1, paragraph2, heading, codeBlock]
  const totalContentSize = childNodes.reduce((sum, node) => sum + node.nodeSize, 0)
  const docSize = totalContentSize + 2 // 文档节点 = 内容大小 + 开始结束标记

  const doc = {
    type: { name: 'doc', schema },
    content: {
      size: totalContentSize, // 🔥 添加content.size属性 - APPEND操作需要此属性
      // 模拟Fragment的基本方法
      forEach: vi.fn(callback => {
        childNodes.forEach((node, index) => callback(node, index))
      }),
    },
    nodeSize: docSize,
    textContent: 'Mock Document Content',
    attrs: {},
    marks: [],
    descendants: vi.fn(callback => {
      // 遍历当前文档节点（position 0）
      const docResult = callback(doc, 0)
      if (docResult === false) {
        return
      }

      // 遍历子节点（position 1, 2, 3, 4）
      childNodes.forEach((node, index) => {
        const result = callback(node, index + 1) // 子节点的position从1开始
        if (result === false) {
          // 提前退出遍历
        }
      })
    }),
  } as unknown as ProseMirrorNode

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
  ;(transaction as any).insert = vi.fn().mockReturnValue(transaction) // 添加insert方法支持

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

  // 🔥 添加 StreamOperationManager 作为 Editor 的核心属性
  const mockStreamOperationManager = {
    queueOperation: vi.fn().mockReturnValue(`op_${Math.random().toString(36).substr(2, 9)}`),
    queueOperations: vi
      .fn()
      .mockImplementation((ops: any[]) => ops.map(() => `op_${Math.random().toString(36).substr(2, 9)}`)),
    getQueueStatus: vi.fn().mockReturnValue({
      queueSize: 0,
      isProcessing: false,
      maxQueueSize: 100,
    }),
    approveDiffOperation: vi.fn().mockReturnValue(true),
    rejectDiffOperation: vi.fn().mockReturnValue(true),
    approveAllDiffOperations: vi.fn().mockReturnValue(true),
    rejectAllDiffOperations: vi.fn().mockReturnValue(true),
    getPendingDiffOperations: vi.fn().mockReturnValue([]),
    getOperationHistory: vi.fn().mockReturnValue([]),
    pause: vi.fn(),
    resume: vi.fn(),
    clearQueue: vi.fn(),
    destroy: vi.fn(),
  }

  return {
    view,
    state,
    schema,
    // 🔥 直接添加 streamOperationManager 属性
    streamOperationManager: mockStreamOperationManager,
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
    streamId: 'session-1',
    moniBlockId: 'block-1',
    type: BlockOperationType.APPEND, // 使用枚举值
    content: { text: 'Mock paragraph content' }, // 使用BlockContent格式
    timestamp: Date.now(),
    status: BlockOperationStatus.PENDING, // 添加缺失的status字段
    ...overrides,
  }
}

/**
 * 创建Mock block内容（JSON格式）
 */
export function createMockBlockContent(
  type: string = 'paragraph',
  text: string = 'Mock content',
  attrs: Record<string, any> = {},
) {
  return {
    type,
    attrs: {
      moniBlockId: `block_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`,
      moniParentId: null,
      moniLevel: 0,
      ...attrs,
    },
    content: [
      {
        type: 'text',
        text,
      },
    ],
  }
}

/**
 * 创建Mock复杂block内容（如列表）
 */
export function createMockComplexBlockContent(type: string = 'bulletList', items: string[] = ['Item 1', 'Item 2']) {
  return {
    type,
    attrs: {
      moniBlockId: `list_${Date.now()}_${crypto.randomUUID().substring(0, 8)}`,
      moniParentId: null,
      moniLevel: 0,
    },
    content: items.map(item => ({
      type: 'listItem',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: item,
            },
          ],
        },
      ],
    })),
  }
}

/**
 * 创建Mock标题block内容
 */
export function createMockHeadingContent(level: number = 1, text: string = 'Mock heading') {
  return createMockBlockContent('heading', text, { level })
}

/**
 * 创建Mock代码块内容
 */
export function createMockCodeBlockContent(
  language: string = 'javascript',
  code: string = 'console.log("Hello World");',
) {
  return createMockBlockContent('codeBlock', code, { language })
}

/**
 * 创建Mock进度事件
 */
export function createMockProgressEvent(overrides: Partial<any> = {}) {
  return {
    type: 'progress',
    streamId: 'session-1',
    progress: 0.5,
    timestamp: Date.now(),
    ...overrides,
  }
}

/**
 * 异步等待函数 - 支持条件等待和固定时间等待
 */
export function waitForAsync(conditionOrMs: (() => boolean) | number = 0, timeout: number = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    // 如果是数字，直接等待指定毫秒数
    if (typeof conditionOrMs === 'number') {
      setTimeout(resolve, conditionOrMs)
      return
    }

    // 如果是函数，等待条件满足
    const condition = conditionOrMs
    const startTime = Date.now()
    const checkInterval = 10 // 每10ms检查一次

    const check = () => {
      if (condition()) {
        resolve()
        return
      }

      if (Date.now() - startTime > timeout) {
        reject(new Error(`Timeout after ${timeout}ms waiting for condition`))
        return
      }

      setTimeout(check, checkInterval)
    }

    check()
  })
}

/**
 * 创建批量操作
 */
export function createBatchOperations(count: number, streamId: string = 'session-1', moniBlockId: string = 'block-1') {
  return Array.from({ length: count }, (_, index) =>
    createMockStreamOperation({
      id: `operation-${streamId}-${index}`,
      streamId,
      moniBlockId,
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
