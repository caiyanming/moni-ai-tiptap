import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Fragment } from '@tiptap/pm/model'
import type { Transaction } from '@tiptap/pm/state'

import type { Editor } from './Editor.js'

// 浏览器环境的定时器类型
type TimerId = number

export interface StreamOperationOptions {
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
 * 🔥 统一状态定义 - 与 StreamOperation.status 保持一致
 */
export enum BlockOperationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/**
 * Block 内容接口，支持字符串或结构化内容
 */
export interface BlockContent {
  type?: string
  text?: string
  content?: BlockContent[]
  attrs?: Record<string, unknown>
  marks?: Array<{
    type: string
    attrs?: Record<string, unknown>
  }>
}

export interface StreamOperation {
  id: string
  sessionId: string
  blockId: string
  type: BlockOperationType
  content: string | BlockContent // 使用具体的BlockContent接口
  position?: number
  timestamp: number
  metadata?: Record<string, unknown> // 使用unknown而不是any

  // 🔥 Diff Native - 天生需要确认
  status: BlockOperationStatus
}

// 🔥 已移除 BlockOperation - 统一使用 StreamOperation 实现零映射架构

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
  private processingTimer: TimerId | null = null
  private operationHistory: StreamOperationResult[] = []

  constructor(editor: Editor, options: StreamOperationOptions = {}) {
    this.editor = editor
    this.options = {
      maxQueueSize: 100,
      operationInterval: 50,
      ...options,
    }
  }

  /**
   * 🔥 Diff Native - 添加需要确认的操作（天生的工作流）
   */
  public queueOperation(operation: Omit<StreamOperation, 'id' | 'timestamp' | 'status'>): string {
    if (this.operationQueue.length >= this.options.maxQueueSize!) {
      throw new Error('Operation queue is full')
    }

    const fullOperation: StreamOperation = {
      ...operation,
      id: this.generateOperationId(),
      timestamp: Date.now(),
      status: BlockOperationStatus.PENDING, // 🔥 天生就是pending状态
      metadata: {
        ...operation.metadata,
        diffEnabled: true,
      },
    }

    // 添加到队列但不自动处理（需要用户确认）
    this.operationQueue.push(fullOperation)

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
      throw new Error('Not enough queue capacity for batch operations')
    }

    const operationIds: string[] = []

    operations.forEach(operation => {
      const fullOperation: StreamOperation = {
        ...operation,
        id: this.generateOperationId(),
        timestamp: Date.now(),
        status: BlockOperationStatus.PENDING, // 🔥 天生需要确认
        metadata: {
          ...operation.metadata,
          diffEnabled: true,
        },
      }
      this.operationQueue.push(fullOperation)
      this.renderDiffPreview(fullOperation)
      operationIds.push(fullOperation.id)
    })

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
      return
    }

    const operation = approvedOperations[0]
    // 从队列中移除已处理的操作
    this.operationQueue = this.operationQueue.filter(op => op.id !== operation.id)

    try {
      const result = this.executeOperation(operation)
      this.operationHistory.push(result)

      // 更新节点的操作队列属性
      this.updateNodeOperationQueue(operation.blockId)

      // 调用完成回调 - 🔧 添加异常处理边界
      if (this.options.onOperationComplete) {
        try {
          this.options.onOperationComplete(operation, result)
        } catch {
          // 回调错误不应影响操作处理流程
        }
      }
    } catch (error) {
      const result: StreamOperationResult = {
        success: false,
        operation,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
      this.operationHistory.push(result)

      // 调用完成回调（即使失败也要通知） - 🔧 添加异常处理边界
      if (this.options.onOperationComplete) {
        try {
          this.options.onOperationComplete(operation, result)
        } catch {
          // 回调错误不应影响操作处理流程
        }
      }
    }

    // 安排下一个操作
    this.processingTimer = setTimeout(() => {
      this.processNextOperation()
    }, this.options.operationInterval) as unknown as TimerId
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
        throw new Error(`Unsupported operation type: ${operation.type}`)
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
  private createBlockFromContent(content: string | BlockContent): ProseMirrorNode | null {
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
    } catch {
      return null
    }
  }

  /**
   * 从JSON对象创建block节点
   */
  private createBlockFromJSON(jsonContent: BlockContent): ProseMirrorNode | null {
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
      if (!type) {
        return this.editor.schema.nodes.paragraph.create(
          blockAttrs,
          this.editor.schema.text(JSON.stringify(jsonContent)),
        )
      }

      const nodeType = this.editor.schema.nodes[type]
      if (!nodeType) {
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
    } catch {
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
    } else {
      this.operationQueue = this.operationQueue.filter(op => op.sessionId !== sessionId)
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
  }

  /**
   * 恢复处理
   */
  public resume(): void {
    this.isPaused = false
    if (!this.isProcessing && this.operationQueue.length > 0) {
      this.startProcessing()
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
   * 🔥 新增：渲染diff预览 - Method A 实现
   * 将操作转换为可视化的diff预览，等待用户确认
   *
   * Method A: 对于update操作，临时在文档中添加新block显示修改后内容
   * 对于insert/delete操作，直接在目标block上设置diff属性
   */
  private renderDiffPreview(operation: StreamOperation): boolean {
    try {
      switch (operation.type) {
        case BlockOperationType.REPLACE:
          return this.renderUpdateDiffPreview(operation)
        case BlockOperationType.INSERT:
        case BlockOperationType.APPEND:
          return this.renderInsertDiffPreview(operation)
        case BlockOperationType.DELETE:
          return this.renderDeleteDiffPreview(operation)
        default:
          return false
      }
    } catch {
      return false
    }
  }

  /**
   * 渲染更新操作的diff预览 - Method A
   * 临时添加新block显示修改后的内容，同时高亮原block
   */
  private renderUpdateDiffPreview(operation: StreamOperation): boolean {
    const nodeInfo = this.findNodeByBlockId(operation.blockId)
    if (!nodeInfo) {
      return false
    }

    const { node, position } = nodeInfo
    const { tr } = this.editor.view.state

    // 1. 设置原始block的diff状态（显示为要被替换的内容）
    tr.setNodeMarkup(position, undefined, {
      ...node.attrs,
      diffMode: true,
      diffStatus: 'pending',
      diffOperationId: operation.id,
      diffType: 'original',
      moniDiffTempId: `temp_${operation.id}`,
    })

    // 2. 在原始block后面插入新的临时block（显示修改后的内容）
    const newBlock = this.createBlockFromContent(operation.content)
    if (!newBlock) {
      return false
    }

    // 为新block设置diff属性
    const newBlockWithDiff = newBlock.type.create(
      {
        ...newBlock.attrs,
        diffMode: true,
        diffStatus: 'pending',
        diffOperationId: operation.id,
        diffType: 'new',
        moniDiffTempId: `temp_${operation.id}`,
        moniTempBlock: true, // 标记为临时block
      },
      newBlock.content,
    )

    // 在原始block后插入新block
    const insertPosition = position + node.nodeSize
    tr.insert(insertPosition, newBlockWithDiff)

    // 应用变更
    this.editor.view.dispatch(tr)

    return true
  }

  /**
   * 渲染插入操作的diff预览
   */
  private renderInsertDiffPreview(operation: StreamOperation): boolean {
    // 创建新block并设置为pending状态
    const newBlock = this.createBlockFromContent(operation.content)
    if (!newBlock) {
      return false
    }

    const { tr } = this.editor.view.state

    // 为新block设置diff属性
    const newBlockWithDiff = newBlock.type.create(
      {
        ...newBlock.attrs,
        diffMode: true,
        diffStatus: 'pending',
        diffOperationId: operation.id,
        diffType: 'insert',
      },
      newBlock.content,
    )

    // 确定插入位置
    let insertPosition: number
    if (operation.blockId === 'document-root' || operation.blockId === '') {
      insertPosition = 0
    } else if (operation.type === BlockOperationType.APPEND) {
      insertPosition = this.editor.view.state.doc.content.size
    } else {
      const nodeInfo = this.findNodeByBlockId(operation.blockId)
      if (!nodeInfo) {
        return false
      }
      insertPosition = nodeInfo.position
    }

    tr.insert(insertPosition, newBlockWithDiff)
    this.editor.view.dispatch(tr)

    return true
  }

  /**
   * 渲染删除操作的diff预览
   */
  private renderDeleteDiffPreview(operation: StreamOperation): boolean {
    const nodeInfo = this.findNodeByBlockId(operation.blockId)
    if (!nodeInfo) {
      return false
    }

    const { node, position } = nodeInfo
    const { tr } = this.editor.view.state

    // 设置要删除的block的diff状态
    tr.setNodeMarkup(position, undefined, {
      ...node.attrs,
      diffMode: true,
      diffStatus: 'pending',
      diffOperationId: operation.id,
      diffType: 'delete',
    })

    this.editor.view.dispatch(tr)

    return true
  }

  /**
   * 🔥 Diff Native - 用户确认操作（天然的工作流）
   */
  public approveDiffOperation(operationId: string): boolean {
    try {
      const operation = this.operationQueue.find(op => op.id === operationId)
      if (!operation) {
        return false
      }

      // 🔥 更新操作状态为已确认
      operation.status = BlockOperationStatus.APPROVED

      // 先更新视觉状态
      this.updateDiffStatus(operation.blockId, BlockOperationStatus.APPROVED)

      // 🔥 启动处理队列来执行已确认的操作
      this.startProcessing()

      return true
    } catch {
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
        return false
      }

      // 🔥 更新操作状态为已拒绝
      operation.status = BlockOperationStatus.REJECTED

      // 更新视觉状态为拒绝
      this.updateDiffStatus(operation.blockId, BlockOperationStatus.REJECTED)

      // 延迟清理diff状态和从队列移除（让用户看到拒绝效果）
      setTimeout(() => {
        this.clearDiffState(operation.blockId)
        this.operationQueue = this.operationQueue.filter(op => op.id !== operationId)
      }, 1000)

      return true
    } catch {
      return false
    }
  }

  /**
   * 🔥 新增：更新diff状态
   */
  private updateDiffStatus(blockId: string, status: BlockOperationStatus): void {
    const nodeInfo = this.findNodeByBlockId(blockId)
    if (!nodeInfo) {
      return
    }

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
   * 对于update操作，需要特殊处理临时block的清理
   */
  private clearDiffState(blockId: string): void {
    const { tr } = this.editor.view.state
    let hasChanges = false

    // 查找并清理原始block的diff状态
    const nodeInfo = this.findNodeByBlockId(blockId)
    if (nodeInfo) {
      const { node, position } = nodeInfo
      const tempId = node.attrs.moniDiffTempId

      // 清理原始block的diff属性
      tr.setNodeMarkup(position, undefined, {
        ...node.attrs,
        diffMode: undefined,
        diffStatus: undefined,
        diffOperationId: undefined,
        diffType: undefined,
        moniDiffTempId: undefined,
      })
      hasChanges = true

      // 如果有关联的临时block，也需要清理
      if (tempId) {
        this.clearTempDiffBlocks(tr, tempId)
      }
    }

    if (hasChanges) {
      this.editor.view.dispatch(tr)
    }
  }

  /**
   * 清理与操作相关的所有临时diff block
   */
  private clearTempDiffBlocks(tr: Transaction, tempId: string): void {
    const doc = this.editor.view.state.doc
    const blocksToDelete: { from: number; to: number }[] = []

    // 找到所有具有相同tempId的临时block
    doc.descendants((node: ProseMirrorNode, pos: number) => {
      if (node.attrs?.moniDiffTempId === tempId && node.attrs?.moniTempBlock) {
        blocksToDelete.push({ from: pos, to: pos + node.nodeSize })
      }
    })

    // 从后往前删除，避免位置偏移问题
    blocksToDelete.reverse().forEach(({ from, to }) => {
      tr.delete(from, to)
    })
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
    } catch {
      return ''
    }
  }

  /**
   * 🔥 Diff Native - 获取所有待确认的操作
   */
  public getPendingDiffOperations(): StreamOperation[] {
    return this.operationQueue.filter(op => op.status === BlockOperationStatus.PENDING)
  }

  /**
   * 🔥 Diff Native - 批量确认所有待确认操作
   */
  public approveAllDiffOperations(): boolean {
    const pendingOps = this.getPendingDiffOperations()
    if (pendingOps.length === 0) {
      return true
    }

    let successCount = 0

    // 首先批量设置所有操作为已确认状态，但不触发处理
    pendingOps.forEach(op => {
      // 直接设置状态而不调用 approveDiffOperation (避免触发 startProcessing)
      op.status = BlockOperationStatus.APPROVED
      this.updateDiffStatus(op.blockId, BlockOperationStatus.APPROVED)
      successCount += 1
    })

    // 所有操作确认完成后，统一启动处理
    if (successCount > 0) {
      this.startProcessing()
    }

    // 只要有操作成功就返回true，全部失败才返回false
    return successCount > 0
  }

  /**
   * 🔥 Diff Native - 批量拒绝所有待确认操作
   */
  public rejectAllDiffOperations(): boolean {
    const pendingOps = this.getPendingDiffOperations()
    if (pendingOps.length === 0) {
      return true
    }

    let successCount = 0
    const operationIds = pendingOps.map(op => op.id)

    // 批量设置所有操作为已拒绝状态
    pendingOps.forEach(op => {
      // 直接设置状态而不调用 rejectDiffOperation
      op.status = BlockOperationStatus.REJECTED
      this.updateDiffStatus(op.blockId, BlockOperationStatus.REJECTED)
      successCount += 1
    })

    // 延迟清理diff状态和从队列移除（让用户看到拒绝效果）
    if (successCount > 0) {
      setTimeout(() => {
        operationIds.forEach(id => {
          const operation = this.operationQueue.find(op => op.id === id)
          if (operation) {
            this.clearDiffState(operation.blockId)
          }
        })
        this.operationQueue = this.operationQueue.filter(op => !operationIds.includes(op.id))
      }, 1000)
    }

    // 只要有操作成功就返回true，全部失败才返回false
    return successCount > 0
  }

  /**
   * 销毁管理器
   */
  public destroy(): void {
    this.pause()
    this.clearQueue()
    this.operationHistory = []
  }
}
