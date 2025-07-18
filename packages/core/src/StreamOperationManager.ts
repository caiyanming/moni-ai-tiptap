import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { Transaction } from '@tiptap/pm/state'

import type { Editor } from './Editor.js'

export interface StreamOperationOptions {
  /**
   * 是否启用调试模式
   * @default false
   */
  debug?: boolean

  /**
   * 操作队列最大长度
   * @default 100
   */
  maxQueueSize?: number

  /**
   * 操作执行间隔（毫秒）
   * @default 50
   */
  operationInterval?: number

  /**
   * 操作完成回调
   */
  onOperationComplete?: (operation: StreamOperation, result: StreamOperationResult) => void
}

/**
 * 统一的 Block 操作类型枚举
 * 🔥 权威类型定义 - 前端和后端都应该使用此枚举
 * 🎯 零映射架构 - 减少类型转换开销
 */
export enum BlockOperationType {
  INSERT = 'insert',
  REPLACE = 'replace',
  APPEND = 'append',
  DELETE = 'delete',
}

/**
 * Block 操作状态枚举
 */
export enum BlockOperationStatus {
  PENDING = 'pending',
  USER_APPROVED = 'user_approved',
  EXECUTED = 'executed',
  REJECTED = 'rejected',
  FAILED = 'failed',
}

export interface StreamOperation {
  id: string
  sessionId: string
  blockId: string
  type: BlockOperationType
  content: string
  position?: number
  timestamp: number
  metadata?: Record<string, any>
}

/**
 * 完整的 Block 操作接口
 * 🔥 与前端 BlockOperation 完全兼容
 */
export interface BlockOperation {
  id: string
  type: BlockOperationType
  targetId: string
  content: Record<string, any>
  position?: number
  canExecute: boolean
  status: BlockOperationStatus
  progress?: number
  timestamp?: number
  metadata?: {
    userIntent?: string
    sessionId?: string
    originalType?: string
    [key: string]: unknown
  }
}

export interface StreamOperationResult {
  success: boolean
  operation: StreamOperation
  error?: string
  newPosition?: number
  affectedRange?: { from: number; to: number }
}

/**
 * 流式操作管理器
 *
 * 负责管理和执行流式操作：
 * 1. 维护操作队列
 * 2. 执行不同类型的流式操作
 * 3. 提供操作结果反馈
 * 4. 支持操作回滚
 */
export class StreamOperationManager {
  private readonly editor: Editor
  private readonly options: StreamOperationOptions
  private operationQueue: StreamOperation[] = []
  private isProcessing = false
  private isPaused = false
  private processingTimer: number | null = null
  private operationHistory: StreamOperationResult[] = []

  constructor(editor: Editor, options: StreamOperationOptions = {}) {
    this.editor = editor
    this.options = {
      debug: false,
      maxQueueSize: 100,
      operationInterval: 50,
      ...options,
    }

    this.initialize()
  }

  private initialize(): void {
    this.debug('StreamOperationManager initialized')
  }

  /**
   * 添加流式操作到队列
   */
  public queueOperation(operation: Omit<StreamOperation, 'id' | 'timestamp'>): boolean {
    if (this.operationQueue.length >= this.options.maxQueueSize!) {
      this.debug(`Queue full, discarding operation for block: ${operation.blockId}`)
      return false
    }

    const fullOperation: StreamOperation = {
      ...operation,
      id: this.generateOperationId(),
      timestamp: Date.now(),
    }

    this.operationQueue.push(fullOperation)
    this.debug(`Operation queued: ${fullOperation.id}`)

    // 启动处理队列
    this.startProcessing()

    return true
  }

  /**
   * 批量添加操作
   */
  public queueOperations(operations: Array<Omit<StreamOperation, 'id' | 'timestamp'>>): boolean {
    const remainingCapacity = this.options.maxQueueSize! - this.operationQueue.length

    if (operations.length > remainingCapacity) {
      this.debug(`Not enough queue capacity: ${operations.length} operations, ${remainingCapacity} available`)
      return false
    }

    operations.forEach(operation => {
      const fullOperation: StreamOperation = {
        ...operation,
        id: this.generateOperationId(),
        timestamp: Date.now(),
      }
      this.operationQueue.push(fullOperation)
    })

    this.debug(`${operations.length} operations queued`)
    this.startProcessing()

    return true
  }

  /**
   * 开始处理操作队列
   */
  private startProcessing(): void {
    if (this.isProcessing || this.isPaused || this.operationQueue.length === 0) {
      return
    }

    this.isProcessing = true
    this.debug('Started processing operations')

    this.processNextOperation()
  }

  /**
   * 处理下一个操作
   */
  private processNextOperation(): void {
    if (this.operationQueue.length === 0) {
      this.isProcessing = false
      this.debug('Finished processing all operations')
      return
    }

    const operation = this.operationQueue.shift()!
    this.debug(`Processing operation: ${operation.id}`)

    try {
      const result = this.executeOperation(operation)
      this.operationHistory.push(result)

      // 更新节点的操作队列属性
      this.updateNodeOperationQueue(operation.blockId)

      this.debug(`Operation completed: ${operation.id}`, result)

      // 调用完成回调
      if (this.options.onOperationComplete) {
        this.options.onOperationComplete(operation, result)
      }
    } catch (error) {
      const result: StreamOperationResult = {
        success: false,
        operation,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
      this.operationHistory.push(result)

      this.debug(`Operation failed: ${operation.id}`, error)

      // 调用完成回调（即使失败也要通知）
      if (this.options.onOperationComplete) {
        this.options.onOperationComplete(operation, result)
      }
    }

    // 安排下一个操作
    this.processingTimer = window.setTimeout(() => {
      this.processNextOperation()
    }, this.options.operationInterval)
  }

  /**
   * 执行单个操作
   */
  private executeOperation(operation: StreamOperation): StreamOperationResult {
    const nodeInfo = this.findNodeByBlockId(operation.blockId)
    if (!nodeInfo) {
      throw new Error(`Target node not found: ${operation.blockId}`)
    }

    const { tr } = this.editor.view.state
    let result: StreamOperationResult

    switch (operation.type) {
      case 'replace':
        result = this.executeReplaceOperation(tr, nodeInfo, operation)
        break
      case 'append':
        result = this.executeAppendOperation(tr, nodeInfo, operation)
        break
      case 'insert':
        result = this.executeInsertOperation(tr, nodeInfo, operation)
        break
      case 'delete':
        result = this.executeDeleteOperation(tr, nodeInfo, operation)
        break
      default:
        throw new Error(`Unsupported operation type: ${(operation as any).type}`)
    }

    // 提交事务
    this.editor.view.dispatch(tr)

    return result
  }

  /**
   * 执行替换操作
   */
  private executeReplaceOperation(
    tr: Transaction,
    nodeInfo: { node: ProseMirrorNode; position: number },
    operation: StreamOperation,
  ): StreamOperationResult {
    const { node, position } = nodeInfo
    const nodeSize = node.nodeSize

    // 创建新内容
    const newContent = this.editor.schema.text(operation.content)
    const newNode = node.type.create(node.attrs, newContent)

    // 替换节点
    tr.replaceWith(position, position + nodeSize, newNode)

    return {
      success: true,
      operation,
      newPosition: position,
      affectedRange: { from: position, to: position + newNode.nodeSize },
    }
  }

  /**
   * 执行追加操作
   */
  private executeAppendOperation(
    tr: Transaction,
    nodeInfo: { node: ProseMirrorNode; position: number },
    operation: StreamOperation,
  ): StreamOperationResult {
    const { node, position } = nodeInfo
    const nodeSize = node.nodeSize

    // 获取当前内容
    const currentContent = node.textContent || ''
    const newContent = currentContent + operation.content

    // 创建新节点
    const newTextNode = this.editor.schema.text(newContent)
    const newNode = node.type.create(node.attrs, newTextNode)

    // 替换节点
    tr.replaceWith(position, position + nodeSize, newNode)

    return {
      success: true,
      operation,
      newPosition: position,
      affectedRange: { from: position, to: position + newNode.nodeSize },
    }
  }

  /**
   * 执行插入操作
   */
  private executeInsertOperation(
    tr: Transaction,
    nodeInfo: { node: ProseMirrorNode; position: number },
    operation: StreamOperation,
  ): StreamOperationResult {
    const { node, position } = nodeInfo
    const insertPos = operation.position || 0

    // 获取当前内容
    const currentContent = node.textContent || ''
    const beforeContent = currentContent.slice(0, insertPos)
    const afterContent = currentContent.slice(insertPos)
    const newContent = beforeContent + operation.content + afterContent

    // 创建新节点
    const newTextNode = this.editor.schema.text(newContent)
    const newNode = node.type.create(node.attrs, newTextNode)

    // 替换节点
    tr.replaceWith(position, position + node.nodeSize, newNode)

    return {
      success: true,
      operation,
      newPosition: position,
      affectedRange: { from: position, to: position + newNode.nodeSize },
    }
  }

  /**
   * 执行删除操作
   */
  private executeDeleteOperation(
    tr: Transaction,
    nodeInfo: { node: ProseMirrorNode; position: number },
    operation: StreamOperation,
  ): StreamOperationResult {
    const { node, position } = nodeInfo
    const nodeSize = node.nodeSize

    // 删除节点
    tr.delete(position, position + nodeSize)

    return {
      success: true,
      operation,
      affectedRange: { from: position, to: position + nodeSize },
    }
  }

  /**
   * 更新节点的操作队列属性
   */
  private updateNodeOperationQueue(blockId: string): void {
    const nodeInfo = this.findNodeByBlockId(blockId)
    if (!nodeInfo) {
      return
    }

    const { tr } = this.editor.view.state
    const pendingOperations = this.operationQueue.filter(op => op.blockId === blockId)

    const newAttrs = {
      ...nodeInfo.node.attrs,
      moniOperationQueue: pendingOperations.map(op => ({
        id: op.id,
        type: op.type,
        timestamp: op.timestamp,
      })),
    }

    tr.setNodeMarkup(nodeInfo.position, undefined, newAttrs)
    this.editor.view.dispatch(tr)
  }

  /**
   * 获取操作历史
   */
  public getOperationHistory(sessionId?: string): StreamOperationResult[] {
    if (!sessionId) {
      return [...this.operationHistory]
    }

    return this.operationHistory.filter(result => result.operation.sessionId === sessionId)
  }

  /**
   * 获取队列状态
   */
  public getQueueStatus(): {
    queueSize: number
    isProcessing: boolean
    isPaused: boolean
    maxQueueSize: number
  } {
    return {
      queueSize: this.operationQueue.length,
      isProcessing: this.isProcessing,
      isPaused: this.isPaused,
      maxQueueSize: this.options.maxQueueSize!,
    }
  }

  /**
   * 清空操作队列
   */
  public clearQueue(sessionId?: string): void {
    if (!sessionId) {
      this.operationQueue = []
      this.debug('Queue cleared')
    } else {
      const originalLength = this.operationQueue.length
      this.operationQueue = this.operationQueue.filter(op => op.sessionId !== sessionId)
      this.debug(
        `Queue cleared for session: ${sessionId}, removed ${originalLength - this.operationQueue.length} operations`,
      )
    }
  }

  /**
   * 暂停处理
   */
  public pause(): void {
    this.isPaused = true
    this.isProcessing = false
    if (this.processingTimer) {
      clearTimeout(this.processingTimer)
      this.processingTimer = null
    }
    this.debug('Processing paused')
  }

  /**
   * 恢复处理
   */
  public resume(): void {
    this.isPaused = false
    if (!this.isProcessing && this.operationQueue.length > 0) {
      this.startProcessing()
      this.debug('Processing resumed')
    }
  }

  /**
   * 通过blockId查找节点
   */
  private findNodeByBlockId(blockId: string): { node: ProseMirrorNode; position: number } | null {
    const { doc } = this.editor.view.state
    let result: { node: ProseMirrorNode; position: number } | null = null

    doc.descendants((node, pos) => {
      if (node.attrs?.moniBlockId === blockId) {
        result = { node, position: pos }
        return false
      }
    })

    return result
  }

  /**
   * 生成操作ID
   */
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * 调试日志
   */
  private debug(message: string, ...args: any[]): void {
    if (this.options.debug) {
      console.log(`[StreamOperationManager] ${message}`, ...args)
    }
  }

  /**
   * 销毁管理器
   */
  public destroy(): void {
    this.pause()
    this.clearQueue()
    this.operationHistory = []
    this.debug('StreamOperationManager destroyed')
  }
}
