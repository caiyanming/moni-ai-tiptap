import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Fragment } from '@tiptap/pm/model'
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
  INSERT = 'insert', // 在block list中插入新block
  REPLACE = 'replace', // 替换现有block
  APPEND = 'append', // 在block list末尾添加新block
  DELETE = 'delete', // 删除现有block
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
  content: string | Record<string, any> // 支持字符串或JSON对象
  position?: number
  timestamp: number
  metadata?: Record<string, any>

  // 🔥 Diff Native - 天生需要确认
  status: 'pending' | 'approved' | 'rejected'
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
   * 🔥 Diff Native - 添加需要确认的操作（天生的工作流）
   */
  public queueOperation(operation: Omit<StreamOperation, 'id' | 'timestamp' | 'status'>): string {
    if (this.operationQueue.length >= this.options.maxQueueSize!) {
      this.debug(`Queue full, discarding operation for block: ${operation.blockId}`)
      throw new Error('Operation queue is full')
    }

    const fullOperation: StreamOperation = {
      ...operation,
      id: this.generateOperationId(),
      timestamp: Date.now(),
      status: 'pending', // 🔥 天生就是pending状态
      metadata: {
        ...operation.metadata,
        diffEnabled: true,
      },
    }

    // 添加到队列但不自动处理（需要用户确认）
    this.operationQueue.push(fullOperation)
    this.debug(`Diff operation queued: ${fullOperation.id}`)

    // 立即渲染diff预览（而不是执行操作）
    this.renderDiffPreview(fullOperation)

    return fullOperation.id
  }

  /**
   * 🔥 Diff Native - 批量添加需要确认的操作
   */
  public queueOperations(operations: Array<Omit<StreamOperation, 'id' | 'timestamp' | 'status'>>): string[] {
    const remainingCapacity = this.options.maxQueueSize! - this.operationQueue.length

    if (operations.length > remainingCapacity) {
      this.debug(`Not enough queue capacity: ${operations.length} operations, ${remainingCapacity} available`)
      throw new Error('Not enough queue capacity for batch operations')
    }

    const operationIds: string[] = []

    operations.forEach(operation => {
      const fullOperation: StreamOperation = {
        ...operation,
        id: this.generateOperationId(),
        timestamp: Date.now(),
        status: 'pending', // 🔥 天生需要确认
        metadata: {
          ...operation.metadata,
          diffEnabled: true,
        },
      }
      this.operationQueue.push(fullOperation)
      this.renderDiffPreview(fullOperation)
      operationIds.push(fullOperation.id)
    })

    this.debug(`${operations.length} diff operations queued`)
    return operationIds
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
   * 🔥 Diff Native - 处理下一个已确认的操作
   */
  private processNextOperation(): void {
    // 🔥 只处理已经被用户确认的操作
    const approvedOperations = this.operationQueue.filter(op => op.status === 'approved')

    if (approvedOperations.length === 0) {
      this.isProcessing = false
      this.debug('No approved operations to process')
      return
    }

    const operation = approvedOperations[0]
    // 从队列中移除已处理的操作
    this.operationQueue = this.operationQueue.filter(op => op.id !== operation.id)

    this.debug(`Processing approved operation: ${operation.id}`)

    try {
      const result = this.executeOperation(operation)
      this.operationHistory.push(result)

      // 更新节点的操作队列属性
      this.updateNodeOperationQueue(operation.blockId)

      this.debug(`Operation completed: ${operation.id}`, result)

      // 调用完成回调 - 🔧 添加异常处理边界
      if (this.options.onOperationComplete) {
        try {
          this.options.onOperationComplete(operation, result)
        } catch (callbackError) {
          this.debug(`Operation callback error: ${operation.id}`, callbackError)
          // 回调错误不应影响操作处理流程，仅记录日志
        }
      }
    } catch (error) {
      const result: StreamOperationResult = {
        success: false,
        operation,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
      this.operationHistory.push(result)

      this.debug(`Operation failed: ${operation.id}`, error)

      // 调用完成回调（即使失败也要通知） - 🔧 添加异常处理边界
      if (this.options.onOperationComplete) {
        try {
          this.options.onOperationComplete(operation, result)
        } catch (callbackError) {
          this.debug(`Operation callback error: ${operation.id}`, callbackError)
          // 回调错误不应影响操作处理流程，仅记录日志
        }
      }
    }

    // 安排下一个操作 - 🔧 跨环境兼容性修复
    const globalSetTimeout = typeof window !== 'undefined' ? window.setTimeout : setTimeout
    this.processingTimer = globalSetTimeout(() => {
      this.processNextOperation()
    }, this.options.operationInterval) as number
  }

  /**
   * 执行单个操作
   */
  private executeOperation(operation: StreamOperation): StreamOperationResult {
    const { tr } = this.editor.view.state
    let result: StreamOperationResult

    switch (operation.type) {
      case 'replace':
        result = this.executeReplaceOperation(tr, operation)
        break
      case 'append':
        result = this.executeAppendOperation(tr, operation)
        break
      case 'insert':
        result = this.executeInsertOperation(tr, operation)
        break
      case 'delete':
        result = this.executeDeleteOperation(tr, operation)
        break
      default:
        throw new Error(`Unsupported operation type: ${(operation as any).type}`)
    }

    // 提交事务
    this.editor.view.dispatch(tr)

    return result
  }

  /**
   * 执行替换操作 - 替换现有block
   */
  private executeReplaceOperation(tr: Transaction, operation: StreamOperation): StreamOperationResult {
    const nodeInfo = this.findNodeByBlockId(operation.blockId)
    if (!nodeInfo) {
      throw new Error(`Target block not found: ${operation.blockId}`)
    }

    const { node, position } = nodeInfo
    const nodeSize = node.nodeSize

    // 创建新block
    const newBlock = this.createBlockFromContent(operation.content)
    if (!newBlock) {
      throw new Error('Failed to create block from content')
    }

    // 替换block
    tr.replaceWith(position, position + nodeSize, newBlock)

    return {
      success: true,
      operation,
      newPosition: position,
      affectedRange: { from: position, to: position + newBlock.nodeSize },
    }
  }

  /**
   * 执行追加操作 - 在block list末尾添加新block
   */
  private executeAppendOperation(tr: Transaction, operation: StreamOperation): StreamOperationResult {
    const { doc } = this.editor.view.state
    const appendPosition = doc.content.size

    // 创建新block
    const newBlock = this.createBlockFromContent(operation.content)
    if (!newBlock) {
      throw new Error('Failed to create block from content')
    }

    // 在文档末尾插入新block
    tr.insert(appendPosition, newBlock)

    return {
      success: true,
      operation,
      newPosition: appendPosition,
      affectedRange: { from: appendPosition, to: appendPosition + newBlock.nodeSize },
    }
  }

  /**
   * 执行插入操作 - 在block list中插入新block
   */
  private executeInsertOperation(tr: Transaction, operation: StreamOperation): StreamOperationResult {
    let insertPosition: number

    if (operation.blockId === 'document-root' || operation.blockId === '') {
      // 在文档开头插入
      insertPosition = 0
    } else {
      // 在指定block前插入
      const nodeInfo = this.findNodeByBlockId(operation.blockId)
      if (!nodeInfo) {
        throw new Error(`Target block not found: ${operation.blockId}`)
      }
      insertPosition = nodeInfo.position
    }

    // 创建新block
    const newBlock = this.createBlockFromContent(operation.content)
    if (!newBlock) {
      throw new Error('Failed to create block from content')
    }

    // 插入新block
    tr.insert(insertPosition, newBlock)

    return {
      success: true,
      operation,
      newPosition: insertPosition,
      affectedRange: { from: insertPosition, to: insertPosition + newBlock.nodeSize },
    }
  }

  /**
   * 执行删除操作 - 删除现有block
   */
  private executeDeleteOperation(tr: Transaction, operation: StreamOperation): StreamOperationResult {
    const nodeInfo = this.findNodeByBlockId(operation.blockId)
    if (!nodeInfo) {
      throw new Error(`Target block not found: ${operation.blockId}`)
    }

    const { node, position } = nodeInfo
    const nodeSize = node.nodeSize

    // 删除block
    tr.delete(position, position + nodeSize)

    return {
      success: true,
      operation,
      affectedRange: { from: position, to: position + nodeSize },
    }
  }

  /**
   * 从内容创建block节点
   */
  private createBlockFromContent(content: string | Record<string, any>): ProseMirrorNode | null {
    try {
      if (typeof content === 'string') {
        // 简单文本内容，创建段落block
        return this.editor.schema.nodes.paragraph.create(
          {
            moniBlockId: `block_${crypto.randomUUID()}`,
            moniParentId: null,
            moniLevel: 0,
          },
          this.editor.schema.text(content),
        )
      }

      if (typeof content === 'object' && content !== null) {
        // JSON对象内容，尝试解析为TipTap节点
        return this.createBlockFromJSON(content)
      }

      return null
    } catch (error) {
      this.debug('Failed to create block from content:', error)
      return null
    }
  }

  /**
   * 从JSON对象创建block节点
   */
  private createBlockFromJSON(jsonContent: Record<string, any>): ProseMirrorNode | null {
    try {
      const { type, attrs = {}, content = [] } = jsonContent

      // 确保有moniBlockId
      const blockAttrs = {
        moniBlockId: attrs.moniBlockId || `block_${crypto.randomUUID()}`,
        moniParentId: attrs.moniParentId || null,
        moniLevel: attrs.moniLevel || 0,
        ...attrs,
      }

      // 根据类型创建节点
      const nodeType = this.editor.schema.nodes[type]
      if (!nodeType) {
        this.debug(`Unknown node type: ${type}`)
        // 降级为段落
        return this.editor.schema.nodes.paragraph.create(
          blockAttrs,
          this.editor.schema.text(JSON.stringify(jsonContent)),
        )
      }

      // 处理内容
      let nodeContent: Fragment | null = null
      if (Array.isArray(content) && content.length > 0) {
        const contentNodes = content
          .map(item => {
            if (typeof item === 'string') {
              return this.editor.schema.text(item)
            }

            if (typeof item === 'object' && item.type) {
              return this.createBlockFromJSON(item)
            }

            return null
          })
          .filter(Boolean) as ProseMirrorNode[]

        if (contentNodes.length > 0) {
          nodeContent = Fragment.fromArray(contentNodes)
        }
      } else if (typeof jsonContent.text === 'string') {
        nodeContent = Fragment.fromArray([this.editor.schema.text(jsonContent.text)])
      }

      return nodeType.create(blockAttrs, nodeContent)
    } catch (error) {
      this.debug('Failed to create block from JSON:', error)
      return null
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
      const globalClearTimeout = typeof window !== 'undefined' ? window.clearTimeout : clearTimeout
      globalClearTimeout(this.processingTimer)
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
   * 🔥 新增：渲染diff预览
   * 将操作转换为可视化的diff预览，等待用户确认
   */
  private renderDiffPreview(operation: StreamOperation): boolean {
    try {
      const nodeInfo = this.findNodeByBlockId(operation.blockId)
      if (!nodeInfo) {
        this.debug(`Target block not found for diff preview: ${operation.blockId}`)
        return false
      }

      const { node, position } = nodeInfo
      const { tr } = this.editor.view.state

      // 获取原始内容
      const originalContent = this.serializeNode(node)

      // 使用MoniDiffSupport扩展的命令设置diff状态
      tr.setNodeMarkup(position, undefined, {
        ...node.attrs,
        diffMode: true,
        diffStatus: 'pending',
        diffOperationId: operation.id,
        diffOriginalContent: originalContent,
        diffNewContent: operation.content,
      })

      // 应用变更
      this.editor.view.dispatch(tr)

      this.debug(`Diff preview rendered for operation: ${operation.id}`)
      return true
    } catch (error) {
      this.debug('Failed to render diff preview:', error)
      return false
    }
  }

  /**
   * 🔥 Diff Native - 用户确认操作（天然的工作流）
   */
  public approveDiffOperation(operationId: string): boolean {
    try {
      const operation = this.operationQueue.find(op => op.id === operationId)
      if (!operation) {
        this.debug(`Operation not found: ${operationId}`)
        return false
      }

      // 🔥 更新操作状态为已确认
      operation.status = 'approved'

      // 先更新视觉状态
      this.updateDiffStatus(operation.blockId, 'approved')

      // 🔥 启动处理队列来执行已确认的操作
      this.startProcessing()

      this.debug(`Operation approved: ${operationId}`)
      return true
    } catch (error) {
      this.debug('Failed to approve operation:', error)
      return false
    }
  }

  /**
   * 🔥 Diff Native - 用户拒绝操作
   */
  public rejectDiffOperation(operationId: string): boolean {
    try {
      const operation = this.operationQueue.find(op => op.id === operationId)
      if (!operation) {
        this.debug(`Operation not found: ${operationId}`)
        return false
      }

      // 🔥 更新操作状态为已拒绝
      operation.status = 'rejected'

      // 更新视觉状态为拒绝
      this.updateDiffStatus(operation.blockId, 'rejected')

      // 延迟清理diff状态和从队列移除（让用户看到拒绝效果）
      setTimeout(() => {
        this.clearDiffState(operation.blockId)
        this.operationQueue = this.operationQueue.filter(op => op.id !== operationId)
      }, 1000)

      this.debug(`Operation rejected: ${operationId}`)
      return true
    } catch (error) {
      this.debug('Failed to reject operation:', error)
      return false
    }
  }

  /**
   * 🔥 新增：更新diff状态
   */
  private updateDiffStatus(blockId: string, status: 'pending' | 'approved' | 'rejected'): void {
    const nodeInfo = this.findNodeByBlockId(blockId)
    if (!nodeInfo) {return}

    const { node, position } = nodeInfo
    const { tr } = this.editor.view.state

    tr.setNodeMarkup(position, undefined, {
      ...node.attrs,
      diffStatus: status,
    })

    this.editor.view.dispatch(tr)
  }

  /**
   * 🔥 新增：清理diff状态，恢复正常显示
   */
  private clearDiffState(blockId: string): void {
    const nodeInfo = this.findNodeByBlockId(blockId)
    if (!nodeInfo) {return}

    const { node, position } = nodeInfo
    const { tr } = this.editor.view.state

    tr.setNodeMarkup(position, undefined, {
      ...node.attrs,
      diffMode: false,
      diffStatus: 'normal',
      diffOperationId: null,
      diffOriginalContent: null,
      diffNewContent: null,
    })

    this.editor.view.dispatch(tr)
  }

  /**
   * 🔥 新增：序列化节点内容为字符串
   */
  private serializeNode(node: ProseMirrorNode): string {
    try {
      // 对于简单文本节点，直接返回文本内容
      if (node.isText) {
        return node.text || ''
      }

      // 对于复杂节点，返回文本内容
      return node.textContent || ''
    } catch (error) {
      this.debug('Failed to serialize node:', error)
      return ''
    }
  }

  /**
   * 🔥 Diff Native - 获取所有待确认的操作
   */
  public getPendingDiffOperations(): StreamOperation[] {
    return this.operationQueue.filter(op => op.status === 'pending')
  }

  /**
   * 🔥 Diff Native - 批量确认所有待确认操作
   */
  public approveAllDiffOperations(): boolean {
    const pendingOps = this.getPendingDiffOperations()
    return pendingOps.every(op => this.approveDiffOperation(op.id))
  }

  /**
   * 🔥 Diff Native - 批量拒绝所有待确认操作
   */
  public rejectAllDiffOperations(): boolean {
    const pendingOps = this.getPendingDiffOperations()
    return pendingOps.every(op => this.rejectDiffOperation(op.id))
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
