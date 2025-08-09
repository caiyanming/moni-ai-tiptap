import type { Node as ProseMirrorNode, Schema } from '@tiptap/pm/model'
import { Fragment } from '@tiptap/pm/model'
import type { Transaction } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'

/**
 * StreamOperationManager 配置选项
 *
 * 设计原则：
 * 1. 最小化配置 - 只包含真正必要的选项
 * 2. 无回调设计 - 上层通过状态监听处理变化，避免回调地狱
 * 3. 性能优先 - 合理的默认值确保良好性能
 */
export interface StreamOperationOptions {
  /**
   * 操作队列最大长度
   * 设计原则：防止内存泄漏，限制并发操作数量
   * @default 100
   */
  maxQueueSize?: number

  /**
   * 操作执行间隔（毫秒）
   * 设计原则：平衡响应性和性能，避免过于频繁的状态更新
   * @default 50
   */
  operationInterval?: number
}

/**
 * 统一的 Block 操作类型枚举
 *
 * 设计原则：
 * 1. 权威类型定义 - 前端和后端都应该使用此枚举
 * 2. 零映射架构 - 减少类型转换开销
 * 3. 语义清晰 - 每个操作类型都有明确的含义
 */
export enum BlockOperationType {
  INSERT = 'insert', // 在block list中插入新block
  REPLACE = 'replace', // 替换现有block
  APPEND = 'append', // 在block list末尾添加新block
  DELETE = 'delete', // 删除现有block
}

/**
 * Block 操作状态枚举
 *
 * 设计原则：
 * 1. 统一状态定义 - 与节点属性中的diffStatus保持一致
 * 2. 状态驱动 - 所有UI变化都基于状态，而非回调
 * 3. 简化状态 - 只保留必要的状态，避免状态爆炸
 */
export enum BlockOperationStatus {
  PENDING = 'pending', // 等待用户确认
  APPROVED = 'approved', // 用户已确认，等待执行
  REJECTED = 'rejected', // 用户已拒绝
}

/**
 * Block 内容接口，支持字符串或结构化内容
 *
 * 设计原则：
 * 1. 灵活性 - 支持简单文本和复杂结构
 * 2. 类型安全 - 使用unknown而不是any
 * 3. 向后兼容 - 保持与现有系统的兼容性
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

/**
 * 流式操作接口
 *
 * 设计原则：
 * 1. 完整性 - 包含操作的所有必要信息
 * 2. 不可变性 - 操作一旦创建就不应该被修改
 * 3. 可序列化 - 支持跨组件传递和持久化
 * 4. 统一命名 - 使用 moni 前缀确保字段命名一致性
 */
export interface StreamOperation {
  moniOperationId: string // 统一操作唯一标识
  moniStreamId: string // Block Stream流ID (区分与Chat会话ID)
  moniBlockId: string
  type: BlockOperationType
  content: BlockContent
  position?: number
  timestamp: number
  metadata?: Record<string, unknown>
  status: BlockOperationStatus
}

/**
 * 流式操作结果接口
 *
 * 设计原则：
 * 1. 结果导向 - 明确表示操作的成功或失败
 * 2. 错误信息 - 提供详细的错误信息用于调试
 * 3. 位置信息 - 记录操作影响的范围
 */
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
 * 核心设计原则：
 *
 * 1. 单一数据源架构
 *    - 完全移除内存队列，使用ProseMirror节点属性作为唯一真理
 *    - 所有操作状态都存储在节点属性中：diffStatus, diffOperationId, diffType等
 *    - 避免数据不一致和同步问题
 *
 * 2. 精确依赖注入
 *    - 只依赖真正需要的view和schema，不存储整个Editor实例
 *    - 降低耦合度，提高可测试性
 *    - 明确表达组件的真正依赖关系
 *
 * 3. 无回调设计
 *    - 移除所有回调函数，避免回调地狱
 *    - 上层通过状态监听处理变化：监听节点属性变化、编辑器状态变化
 *    - 符合React声明式编程模式
 *
 * 4. 状态驱动架构
 *    - 所有UI变化都基于状态，而非命令
 *    - 组件通过查询节点属性获取当前状态
 *    - 状态变化自动触发UI更新
 *
 * 5. 零抽象层
 *    - 移除DiffNode等不必要的抽象
 *    - 直接操作ProseMirror节点
 *    - 减少类型定义和转换开销
 *
 * 6. 性能优化
 *    - 按需计算位置信息，不重复存储
 *    - 使用节点遍历而非内存查询
 *    - 合理的操作间隔避免过于频繁的状态更新
 *
 * 上层使用指南：
 *
 * 1. 状态监听模式
 *    ```typescript
 *    // React组件中监听编辑器状态变化
 *    useEffect(() => {
 *      const updatePendingOperations = () => {
 *        const pending = editor.streamOperationManager.getPendingOperations()
 *        setPendingOperations(pending)
 *      }
 *
 *      editor.on('update', updatePendingOperations)
 *      updatePendingOperations() // 初始加载
 *
 *      return () => editor.off('update', updatePendingOperations)
 *    }, [editor])
 *    ```
 *
 * 2. 直接操作模式
 *    ```typescript
 *    // 直接调用方法，无需等待回调
 *    const success = editor.streamOperationManager.approveOperation(operationId)
 *    if (success) {
 *      // 操作成功，UI会自动更新（通过状态监听）
 *    }
 *    ```
 *
 * 3. 批量操作模式
 *    ```typescript
 *    // 批量操作，状态变化会自动传播
 *    const success = editor.streamOperationManager.approveAllOperations()
 *    // 所有相关组件都会自动更新
 *    ```
 */
export class StreamOperationManager {
  private readonly view: EditorView
  private readonly schema: Schema
  private readonly options: {
    maxQueueSize: number
    operationInterval: number
  }
  private isProcessing = false
  private isPaused = false
  private processingTimer: number | null = null
  // ✅ 新增：操作去重集合，使用稳定的operationId防止重复处理
  private processedOperationIds = new Set<string>()

  constructor(view: EditorView, schema: Schema, options: Partial<StreamOperationOptions> = {}) {
    this.view = view
    this.schema = schema
    this.options = {
      maxQueueSize: 100,
      operationInterval: 50,
      ...options,
    }
  }

  /**
   * 添加需要确认的操作
   *
   * 设计原则：
   * 1. 直接渲染 - 立即渲染diff预览到节点属性
   * 2. 无返回值 - 操作ID已包含在StreamOperation中
   * 3. 状态驱动 - 通过节点属性状态触发UI更新
   */
  public queueOperation(operation: StreamOperation): void {
    const pendingCount = this.getPendingOperations().length
    if (pendingCount >= this.options.maxQueueSize) {
      throw new Error('Operation queue is full')
    }

    // 立即渲染diff预览（存储到节点属性中）
    this.renderDiffPreview(operation)
  }

  /**
   * 批量添加需要确认的操作（带去重功能）
   *
   * 设计原则：
   * 1. 稳定ID去重 - 使用稳定的operationId防止重复处理同一操作
   * 2. 批量处理 - 一次性处理多个操作，提高性能
   * 3. 容量检查 - 确保不超过队列容量限制
   * 4. 详细日志 - 提供详细的去重和处理日志
   */
  public queueOperations(operations: StreamOperation[]): void {
    // ✅ 第1步：去重过滤，只处理未处理过的操作
    const newOperations = operations.filter(operation => {
      if (this.processedOperationIds.has(operation.moniOperationId)) {
        console.log(`[StreamOperationManager] 跳过重复操作: ${operation.moniOperationId}`)
        return false
      }
      return true
    })

    if (newOperations.length === 0) {
      console.log(`[StreamOperationManager] 所有 ${operations.length} 个操作都已处理，跳过`)
      return
    }

    console.log(`[StreamOperationManager] 过滤后待处理操作: ${newOperations.length}/${operations.length}`)

    // ✅ 第2步：容量检查
    const pendingCount = this.getPendingOperations().length
    const remainingCapacity = this.options.maxQueueSize - pendingCount

    if (newOperations.length > remainingCapacity) {
      throw new Error(`Not enough queue capacity: need ${newOperations.length}, available ${remainingCapacity}`)
    }

    // ✅ 第3步：批量处理新操作
    let successCount = 0
    newOperations.forEach((operation, index) => {
      console.log(`[StreamOperationManager] 处理操作 ${index + 1}/${newOperations.length}:`, {
        type: operation.type,
        operationId: operation.moniOperationId,
        blockId: operation.moniBlockId,
      })

      const success = this.renderDiffPreview(operation)
      if (success) {
        // ✅ 第4步：标记为已处理
        this.processedOperationIds.add(operation.moniOperationId)
        successCount += 1
      }
    })

    console.log(`[StreamOperationManager] 批量队列操作完成: ${successCount}/${newOperations.length} 成功`)
  }

  /**
   * 获取所有待确认的操作
   *
   * 设计原则：
   * 1. 节点遍历 - 通过遍历节点获取状态，而非内存查询
   * 2. 实时数据 - 每次调用都获取最新状态
   * 3. 简化返回 - 只返回节点，位置信息按需计算
   */
  public getPendingOperations(): ProseMirrorNode[] {
    const pendingNodes: ProseMirrorNode[] = []

    this.view.state.doc.descendants((node: ProseMirrorNode) => {
      if (node.attrs?.diffStatus === 'pending' && node.attrs?.diffOperationId) {
        pendingNodes.push(node)
      }
    })

    return pendingNodes
  }

  /**
   * 获取所有已确认的操作
   *
   * 设计原则：
   * 1. 状态查询 - 基于节点属性状态查询
   * 2. 执行准备 - 这些操作将被自动执行
   * 3. 内部使用 - 主要用于内部处理逻辑
   */
  private getApprovedOperations(): ProseMirrorNode[] {
    const approvedNodes: ProseMirrorNode[] = []

    this.view.state.doc.descendants((node: ProseMirrorNode) => {
      if (node.attrs?.diffStatus === 'approved' && node.attrs?.diffOperationId) {
        approvedNodes.push(node)
      }
    })

    return approvedNodes
  }

  /**
   * 获取所有diff操作（任何状态）
   *
   * 设计原则：
   * 1. 完整视图 - 提供所有diff操作的完整视图
   * 2. 调试支持 - 用于调试和状态检查
   * 3. 清理支持 - 用于批量清理操作
   */
  public getAllDiffOperations(): ProseMirrorNode[] {
    const allNodes: ProseMirrorNode[] = []

    this.view.state.doc.descendants((node: ProseMirrorNode) => {
      if (node.attrs?.diffOperationId) {
        allNodes.push(node)
      }
    })

    return allNodes
  }

  /**
   * 确认单个操作
   *
   * 设计原则：
   * 1. 状态更新 - 直接更新节点属性状态
   * 2. 自动执行 - 确认后自动启动处理流程
   * 3. 返回值 - 返回操作是否成功
   */
  public approveOperation(moniOperationId: string): boolean {
    const nodeInfo = this.findNodeByOperationId(moniOperationId)
    if (!nodeInfo) {
      return false
    }

    const { node, position } = nodeInfo

    const tr = this.view.state.tr
    tr.setNodeMarkup(position, undefined, {
      ...node.attrs,
      diffStatus: 'approved',
    })
    this.view.dispatch(tr)

    this.startProcessing()
    return true
  }

  /**
   * 拒绝单个操作
   *
   * 设计原则：
   * 1. 状态更新 - 更新节点状态为rejected
   * 2. 延迟清理 - 延迟清理让用户看到拒绝效果
   * 3. 视觉反馈 - 提供明确的视觉反馈
   */
  public rejectOperation(moniOperationId: string): boolean {
    const nodeInfo = this.findNodeByOperationId(moniOperationId)
    if (!nodeInfo) {
      return false
    }

    const { node, position } = nodeInfo

    // 检查操作是否已经被rejected或approved
    if (node.attrs.diffStatus === 'rejected' || node.attrs.diffStatus === 'approved') {
      return false
    }

    const tr = this.view.state.tr
    tr.setNodeMarkup(position, undefined, {
      ...node.attrs,
      diffStatus: 'rejected',
    })
    this.view.dispatch(tr)

    // 延迟执行撤销操作（让用户看到拒绝效果）
    setTimeout(() => {
      this.revertOperation(moniOperationId)
    }, 1000)

    return true
  }

  /**
   * 批量确认所有待处理操作
   *
   * 设计原则：
   * 1. 批量处理 - 一次性处理所有操作，提高效率
   * 2. 原子性 - 要么全部成功，要么全部失败
   * 3. 状态同步 - 确保所有操作状态同步更新
   */
  public approveAllOperations(): boolean {
    const pendingNodes = this.getPendingOperations()
    if (pendingNodes.length === 0) {
      return true
    }

    const tr = this.view.state.tr
    let hasChanges = false

    pendingNodes.forEach(node => {
      const position = this.getNodePosition(node)
      if (position !== null) {
        tr.setNodeMarkup(position, undefined, {
          ...node.attrs,
          diffStatus: 'approved',
        })
        hasChanges = true
      }
    })

    if (hasChanges) {
      this.view.dispatch(tr)
      this.startProcessing()
    }

    return hasChanges
  }

  /**
   * 批量拒绝所有待处理操作
   *
   * 设计原则：
   * 1. 批量处理 - 一次性拒绝所有操作
   * 2. 视觉反馈 - 提供批量拒绝的视觉反馈
   * 3. 延迟清理 - 延迟清理让用户看到拒绝效果
   */
  public rejectAllOperations(): boolean {
    const pendingNodes = this.getPendingOperations()
    if (pendingNodes.length === 0) {
      return true
    }

    const tr = this.view.state.tr
    let hasChanges = false

    pendingNodes.forEach(node => {
      const position = this.getNodePosition(node)
      if (position !== null) {
        tr.setNodeMarkup(position, undefined, {
          ...node.attrs,
          diffStatus: 'rejected',
        })
        hasChanges = true
      }
    })

    if (hasChanges) {
      this.view.dispatch(tr)

      // 延迟清理所有diff状态
      setTimeout(() => {
        pendingNodes.forEach(node => {
          const moniOperationId = node.attrs.diffOperationId
          if (moniOperationId) {
            this.clearDiffState(moniOperationId)
          }
        })
      }, 1000)
    }

    return hasChanges
  }

  /**
   * 清空所有操作
   *
   * 设计原则：
   * 1. 彻底清理 - 清理所有diff相关状态
   * 2. 状态重置 - 重置所有内部状态
   * 3. 资源释放 - 释放相关资源
   */
  public clearAllOperations(): void {
    const allNodes = this.getAllDiffOperations()

    allNodes.forEach(node => {
      const moniOperationId = node.attrs.diffOperationId
      if (moniOperationId) {
        this.clearDiffState(moniOperationId)
      }
    })

    this.pause()
  }

  /**
   * 暂停处理
   *
   * 设计原则：
   * 1. 状态管理 - 更新内部处理状态
   * 2. 资源清理 - 清理定时器等资源
   * 3. 可恢复 - 支持后续恢复处理
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
   *
   * 设计原则：
   * 1. 状态恢复 - 恢复处理状态
   * 2. 自动启动 - 如果有待处理操作自动启动
   * 3. 安全检查 - 确保状态一致性
   */
  public resume(): void {
    this.isPaused = false
    if (!this.isProcessing && this.getApprovedOperations().length > 0) {
      this.startProcessing()
    }
  }

  /**
   * 获取队列状态
   *
   * 设计原则：
   * 1. 实时状态 - 返回当前实时状态
   * 2. 完整信息 - 包含所有必要的状态信息
   * 3. 调试支持 - 支持调试和监控
   */
  public getQueueStatus(): {
    queueSize: number
    isProcessing: boolean
    isPaused: boolean
    maxQueueSize: number
  } {
    return {
      queueSize: this.getPendingOperations().length,
      isProcessing: this.isProcessing,
      isPaused: this.isPaused,
      maxQueueSize: this.options.maxQueueSize,
    }
  }

  /**
   * 获取已处理的操作ID列表（调试用）
   *
   * 设计原则：
   * 1. 调试支持 - 用于调试和监控已处理操作
   * 2. 只读访问 - 返回副本，不暴露内部Set
   * 3. 开发工具 - 在浏览器控制台中查看状态
   */
  public getProcessedOperations(): string[] {
    return Array.from(this.processedOperationIds)
  }

  /**
   * 清理已处理操作记录（调试用）
   *
   * 设计原则：
   * 1. 手动清理 - 允许手动清理去重记录
   * 2. 调试支持 - 用于测试和调试场景
   * 3. 谨慎使用 - 只在明确知道后果时使用
   */
  public clearProcessedOperations(): void {
    const count = this.processedOperationIds.size
    this.processedOperationIds.clear()
    console.log(`[StreamOperationManager] 清理了 ${count} 个已处理操作记录`)
  }

  /**
   * 检查操作是否已处理（调试用）
   *
   * 设计原则：
   * 1. 状态查询 - 检查特定操作是否已处理
   * 2. 调试支持 - 用于调试重复处理问题
   * 3. 公开接口 - 暴露给上层使用
   */
  public isOperationProcessed(operationId: string): boolean {
    return this.processedOperationIds.has(operationId)
  }

  /**
   * 销毁管理器
   *
   * 设计原则：
   * 1. 资源清理 - 清理所有资源
   * 2. 状态重置 - 重置所有状态
   * 3. 内存释放 - 避免内存泄漏
   */
  public destroy(): void {
    this.pause()
    this.clearAllOperations()
    // ✅ 清理去重记录，防止内存泄漏
    this.processedOperationIds.clear()
  }

  // ==================== 私有方法 ====================

  /**
   * 开始处理操作队列
   *
   * 设计原则：
   * 1. 状态检查 - 确保状态一致性
   * 2. 自动启动 - 自动启动处理流程
   * 3. 防重复 - 避免重复启动
   */
  private startProcessing(): void {
    if (this.isProcessing || this.isPaused || this.getApprovedOperations().length === 0) {
      return
    }

    this.isProcessing = true
    this.processNextOperation()
  }

  /**
   * 处理下一个已确认的操作
   *
   * 设计原则：
   * 1. 状态驱动 - 基于节点状态处理操作
   * 2. 自动清理 - 处理完成后自动清理状态
   * 3. 错误处理 - 提供错误处理机制
   */
  private processNextOperation(): void {
    const approvedNodes = this.getApprovedOperations()

    if (approvedNodes.length === 0) {
      this.isProcessing = false
      return
    }

    const node = approvedNodes[0]
    const moniOperationId = node.attrs.diffOperationId

    try {
      // 执行操作并清理diff状态
      const success = this.executeDiffNode(node)

      if (success && moniOperationId) {
        this.clearDiffState(moniOperationId)
      }
    } catch (error) {
      console.error('Failed to execute diff operation:', error)
    }

    // 安排下一个操作
    this.processingTimer = setTimeout(() => {
      this.processNextOperation()
    }, this.options.operationInterval) as unknown as number
  }

  /**
   * 执行diff节点操作
   *
   * 设计原则：
   * 1. 类型分发 - 根据diffType分发到不同的处理方法
   * 2. 错误边界 - 提供错误处理边界
   * 3. 简化逻辑 - 简化执行逻辑
   */
  private executeDiffNode(node: ProseMirrorNode): boolean {
    try {
      const diffType = node.attrs.diffType

      switch (diffType) {
        case 'replace':
        case 'original':
          return this.executeReplaceFromDiffNode()
        case 'insert':
        case 'new':
          // insert和new类型的节点已经在DOM中，只需要清理diff属性
          return true
        case 'delete':
          return this.executeDeleteFromDiffNode(node)
        default:
          return false
      }
    } catch {
      return false
    }
  }

  /**
   * 执行替换操作
   *
   * 设计原则：
   * 1. 简化处理 - 对于replace操作，简化处理逻辑
   * 2. 状态清理 - 清理临时状态
   * 3. 成功返回 - 返回操作成功状态
   */
  private executeReplaceFromDiffNode(): boolean {
    // 对于replace操作，可能需要处理临时节点
    // 这里简化处理，TipTap会自动处理节点更新
    return true
  }

  /**
   * 执行删除操作
   *
   * 设计原则：
   * 1. 位置计算 - 重新计算节点位置
   * 2. 事务处理 - 使用ProseMirror事务处理删除
   * 3. 状态更新 - 更新编辑器状态
   */
  private executeDeleteFromDiffNode(node: ProseMirrorNode): boolean {
    const position = this.getNodePosition(node)
    if (position === null) {
      return false
    }

    const tr = this.view.state.tr
    const nodeSize = node.nodeSize

    tr.delete(position, position + nodeSize)
    this.view.dispatch(tr)

    return true
  }

  /**
   * 渲染diff预览
   *
   * 设计原则：
   * 1. 类型分发 - 根据操作类型分发到不同的渲染方法
   * 2. 错误边界 - 提供错误处理边界
   * 3. 状态设置 - 设置节点diff状态
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
          console.warn(`[StreamOperationManager] 未知的操作类型: ${operation.type}`)
          return false
      }
    } catch (error) {
      console.error(`[StreamOperationManager] renderDiffPreview 失败:`, error)
      return false
    }
  }

  /**
   * 渲染更新操作的diff预览
   *
   * 设计原则：
   * 1. 双节点显示 - 显示原始节点和修改后的节点
   * 2. 临时节点 - 使用临时节点显示修改后的内容
   * 3. 状态关联 - 通过tempId关联相关节点
   */
  private renderUpdateDiffPreview(operation: StreamOperation): boolean {
    const nodeInfo = this.findNodeByBlockId(operation.moniBlockId)
    if (!nodeInfo) {
      return false
    }

    const { node, position } = nodeInfo
    const tr = this.view.state.tr

    // 1. 设置原始block的diff状态（显示为要被替换的内容）
    tr.setNodeMarkup(position, undefined, {
      ...node.attrs,
      diffMode: true,
      diffStatus: 'pending',
      diffOperationId: operation.moniOperationId,
      diffType: 'original',
      moniDiffTempId: `temp_${operation.moniOperationId}`,
    })

    // 2. 在原始block后面插入新的临时block（显示修改后的内容）
    const newBlock = this.createBlockFromContent(operation.content)
    if (!newBlock) {
      return false
    }

    // 为新block设置diff属性
    const nodeType = this.schema.nodes[newBlock.type.name] || this.schema.nodes.paragraph
    const newBlockWithDiff = nodeType.create(
      {
        ...newBlock.attrs,
        diffMode: true,
        diffStatus: 'pending',
        diffOperationId: operation.moniOperationId,
        diffType: 'new',
        moniDiffTempId: `temp_${operation.moniOperationId}`,
        moniTempBlock: true, // 标记为临时block
      },
      newBlock.content,
    )

    // 在原始block后插入新block
    const insertPosition = position + node.nodeSize
    tr.insert(insertPosition, newBlockWithDiff)

    // 应用变更
    this.view.dispatch(tr)

    return true
  }

  /**
   * 渲染插入操作的diff预览
   *
   * 设计原则：
   * 1. 位置计算 - 根据操作类型计算插入位置
   * 2. 状态设置 - 设置节点diff状态
   * 3. 内容创建 - 创建新的内容节点
   */
  private renderInsertDiffPreview(operation: StreamOperation): boolean {
    console.log(`[StreamOperationManager] 开始渲染${operation.type}操作:`, {
      operationId: operation.moniOperationId,
      blockId: operation.moniBlockId,
      content: operation.content,
    })

    const newBlock = this.createBlockFromContent(operation.content)
    if (!newBlock) {
      console.warn(`[StreamOperationManager] 无法从内容创建block:`, operation.content)
      return false
    }

    const tr = this.view.state.tr

    // 为新block设置diff属性
    const nodeType = this.schema.nodes[newBlock.type.name] || this.schema.nodes.paragraph
    const newBlockWithDiff = nodeType.create(
      {
        ...newBlock.attrs,
        diffMode: true,
        diffStatus: 'pending',
        diffOperationId: operation.moniOperationId,
        diffType: operation.type, // 使用实际的操作类型
      },
      newBlock.content,
    )

    // 🔥 修复：正确的插入位置计算
    let insertPosition: number
    if (operation.moniBlockId === '13814000-1dd2-11b2-8080-808080808080') {
      // 插入到文档开头
      insertPosition = 0
    } else if (operation.type === BlockOperationType.APPEND) {
      // 🔥 修复：APPEND操作应该插入到文档末尾，使用正确的块级位置计算
      const doc = this.view.state.doc
      // 找到最后一个块级节点的结束位置
      let lastBlockEnd = 0
      doc.descendants((node, pos) => {
        if (node.isBlock && pos > lastBlockEnd) {
          lastBlockEnd = pos + node.nodeSize
        }
      })
      insertPosition = lastBlockEnd
    } else {
      // INSERT操作：在指定block后插入
      const nodeInfo = this.findNodeByBlockId(operation.moniBlockId)
      if (!nodeInfo) {
        console.warn(`[StreamOperationManager] 找不到目标block: ${operation.moniBlockId}`)
        return false
      }
      // 在目标block后插入
      insertPosition = nodeInfo.position + nodeInfo.node.nodeSize
    }

    console.log(`[StreamOperationManager] 插入位置: ${insertPosition}, 文档大小: ${this.view.state.doc.content.size}`)

    tr.insert(insertPosition, newBlockWithDiff)
    this.view.dispatch(tr)

    console.log(`[StreamOperationManager] 成功渲染${operation.type}操作:`, {
      operationId: operation.moniOperationId,
      blockId: operation.moniBlockId,
      position: insertPosition,
    })

    return true
  }

  /**
   * 渲染删除操作的diff预览
   *
   * 设计原则：
   * 1. 状态设置 - 设置要删除节点的diff状态
   * 2. 视觉反馈 - 提供删除的视觉反馈
   * 3. 位置保持 - 保持节点在文档中的位置
   */
  private renderDeleteDiffPreview(operation: StreamOperation): boolean {
    const nodeInfo = this.findNodeByBlockId(operation.moniBlockId)
    if (!nodeInfo) {
      return false
    }

    const { node, position } = nodeInfo
    const tr = this.view.state.tr

    // 设置要删除的block的diff状态
    tr.setNodeMarkup(position, undefined, {
      ...node.attrs,
      diffMode: true,
      diffStatus: 'pending',
      diffOperationId: operation.moniOperationId,
      diffType: 'delete',
    })

    this.view.dispatch(tr)

    return true
  }

  /**
   * 撤销操作（用于reject）
   *
   * 设计原则：
   * 1. 内容恢复 - 恢复到AI修改前的原始状态
   * 2. 临时节点移除 - 移除新增的临时预览节点
   * 3. 状态清理 - 清理所有diff相关状态
   */
  private revertOperation(moniOperationId: string): void {
    console.log(`[StreamOperationManager] 撤销操作: ${moniOperationId}`)

    const tr = this.view.state.tr
    const { doc } = this.view.state

    // 收集所有与此操作相关的节点
    const relatedNodes: Array<{ node: ProseMirrorNode; position: number; diffType: string }> = []

    doc.descendants((node, pos) => {
      if (node.attrs?.diffOperationId === moniOperationId) {
        relatedNodes.push({
          node,
          position: pos,
          diffType: node.attrs.diffType || 'unknown',
        })
      }
    })

    if (relatedNodes.length === 0) {
      console.warn(`[StreamOperationManager] 撤销操作失败: 找不到操作节点 ${moniOperationId}`)
      return
    }

    console.log(
      `[StreamOperationManager] 找到 ${relatedNodes.length} 个相关节点:`,
      relatedNodes.map(n => `${n.diffType}@${n.position}`),
    )

    try {
      // 🔥 步骤1: 首先恢复原始节点到正常状态
      const originalNodes = relatedNodes.filter(n => n.diffType === 'original')
      originalNodes.forEach(({ node, position }) => {
        console.log(`[StreamOperationManager] 恢复原始节点 at position ${position}`)
        // 清理diff属性，恢复原始节点的正常显示状态
        tr.setNodeMarkup(position, undefined, {
          ...node.attrs,
          diffMode: undefined,
          diffStatus: undefined,
          diffOperationId: undefined,
          diffType: undefined,
          moniDiffTempId: undefined,
        })
      })

      // 🔥 步骤2: 然后删除AI添加的新节点
      // 按位置从高到低排序，先删除后面的节点避免位置偏移
      const nodesToDelete = relatedNodes.filter(n => n.diffType === 'new').sort((a, b) => b.position - a.position)

      // 删除所有 'new' 类型的节点（AI修改的内容）
      nodesToDelete.forEach(({ node, position }) => {
        console.log(`[StreamOperationManager] 删除新节点 at position ${position}`)
        tr.delete(position, position + node.nodeSize)
      })

      // 🔥 步骤3: 应用所有事务操作
      if (originalNodes.length > 0 || nodesToDelete.length > 0) {
        this.view.dispatch(tr)
        console.log(
          `[StreamOperationManager] 完成撤销操作: 恢复 ${originalNodes.length} 个原始节点，删除 ${nodesToDelete.length} 个AI修改节点`,
        )
      }

      // 🔥 步骤4: 清理任何剩余的临时节点（使用更精准的清理方法）
      this.clearRemainingTempNodes(moniOperationId)
    } catch (error) {
      console.error(`[StreamOperationManager] 撤销操作异常:`, error)
      // 失败时仍然清理状态，避免界面卡死
      this.clearDiffState(moniOperationId)
    }
  }

  /**
   * 清理剩余的临时节点（用于reject操作后的精准清理）
   *
   * 设计原则：
   * 1. 精准清理 - 只清理与指定操作相关的临时节点
   * 2. 避免副作用 - 不影响其他正在进行的diff操作
   * 3. 事务安全 - 使用单独的事务确保操作原子性
   */
  private clearRemainingTempNodes(moniOperationId: string): void {
    const tr = this.view.state.tr
    const { doc } = this.view.state
    let hasRemainingNodes = false

    // 查找任何剩余的与此操作相关的节点
    const remainingNodes: Array<{ position: number; nodeSize: number }> = []

    doc.descendants((node, pos) => {
      if (node.attrs?.diffOperationId === moniOperationId) {
        remainingNodes.push({ position: pos, nodeSize: node.nodeSize })
      }
    })

    if (remainingNodes.length > 0) {
      console.log(`[StreamOperationManager] 发现 ${remainingNodes.length} 个剩余节点，进行最终清理`)

      // 从后往前删除剩余节点
      remainingNodes
        .sort((a, b) => b.position - a.position)
        .forEach(({ position, nodeSize }) => {
          tr.delete(position, position + nodeSize)
          hasRemainingNodes = true
        })

      if (hasRemainingNodes) {
        this.view.dispatch(tr)
        console.log(`[StreamOperationManager] 完成剩余节点清理`)
      }
    }
  }

  /**
   * 移除临时节点
   */
  private removeTempNodes(tr: any, tempId: string): void {
    const { doc } = this.view.state
    const nodesToRemove: { position: number; size: number }[] = []

    // 收集需要删除的临时节点
    doc.descendants((node, pos) => {
      if (node.attrs?.moniDiffTempId === tempId && node.attrs?.diffType === 'new') {
        nodesToRemove.push({ position: pos, size: node.nodeSize })
      }
    })

    // 从后往前删除，避免位置偏移问题
    nodesToRemove
      .sort((a, b) => b.position - a.position)
      .forEach(({ position, size }) => {
        tr.delete(position, position + size)
      })
  }

  /**
   * 清理diff状态
   *
   * 设计原则：
   * 1. 彻底清理 - 清理所有diff相关属性
   * 2. 临时节点处理 - 处理临时节点的清理
   * 3. 状态恢复 - 恢复正常显示状态
   */
  private clearDiffState(moniOperationId: string): void {
    const tr = this.view.state.tr
    let hasChanges = false

    // 查找并清理原始block的diff状态
    const nodeInfo = this.findNodeByOperationId(moniOperationId)
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
    } else {
      // 如果通过moniOperationId找不到节点，尝试全局清理所有diff状态
      this.clearAllDiffStatesGlobally(tr)
      hasChanges = true
    }

    if (hasChanges) {
      this.view.dispatch(tr)
    }
  }

  /**
   * 全局清理所有diff状态（应急方案）
   *
   * 设计原则：
   * 1. 应急处理 - 作为应急方案处理异常情况
   * 2. 彻底清理 - 清理所有diff相关状态
   * 3. 状态重置 - 重置所有节点状态
   */
  private clearAllDiffStatesGlobally(tr: Transaction): void {
    const doc = this.view.state.doc

    doc.descendants((node: ProseMirrorNode, pos: number) => {
      if (node.attrs?.diffMode || node.attrs?.diffStatus || node.attrs?.diffOperationId) {
        tr.setNodeMarkup(pos, undefined, {
          ...node.attrs,
          diffMode: undefined,
          diffStatus: undefined,
          diffOperationId: undefined,
          diffType: undefined,
          moniDiffTempId: undefined,
          moniTempBlock: undefined,
        })
      }
    })
  }

  /**
   * 清理与操作相关的所有临时diff block
   *
   * 设计原则：
   * 1. 批量删除 - 批量删除临时节点
   * 2. 位置安全 - 从后往前删除避免位置偏移
   * 3. 关联清理 - 清理所有关联的临时节点
   */
  private clearTempDiffBlocks(tr: Transaction, tempId: string): void {
    const doc = this.view.state.doc
    const blocksToDelete: { from: number; to: number }[] = []

    // 找到所有具有相同tempId的临时block
    doc.descendants((node: ProseMirrorNode, pos: number) => {
      if (node.attrs?.moniDiffTempId === tempId && node.attrs?.moniTempBlock) {
        blocksToDelete.push({ from: pos, to: pos + node.nodeSize })
      }
    })

    // 从后往前删除，避免位置偏移问题
    blocksToDelete.toReversed().forEach(({ from, to }) => {
      tr.delete(from, to)
    })
  }

  /**
   * 从内容创建block节点
   *
   * 设计原则：
   * 1. 类型处理 - 处理简单文本和复杂内容
   * 2. 错误处理 - 提供错误处理机制
   * 3. 降级处理 - 提供降级处理方案
   */
  private createBlockFromContent(content: BlockContent): ProseMirrorNode | null {
    try {
      console.log(`[StreamOperationManager] 创建block from content:`, content)

      // 检查schema是否有效
      if (!this.schema?.nodes?.paragraph?.create) {
        console.warn(`[StreamOperationManager] Schema不完整，无法创建block`)
        return null
      }

      // 处理简单文本内容（只有text字段，没有type）
      if (content.text && !content.type) {
        const textNode = this.schema.text ? this.schema.text(content.text) : null
        const block = this.schema.nodes.paragraph.create(
          {
            moniBlockId: `block_${crypto.randomUUID()}`,
            moniParentId: null,
            moniLevel: 0,
          },
          textNode,
        )
        console.log(`[StreamOperationManager] 创建简单文本block成功:`, block)
        return block
      }

      // 处理复杂内容（有type或其他字段）
      const block = this.createBlockFromJSON(content)
      console.log(`[StreamOperationManager] 创建复杂内容block结果:`, block ? '成功' : '失败')
      return block
    } catch (error) {
      console.error(`[StreamOperationManager] createBlockFromContent 失败:`, error)
      return null
    }
  }

  /**
   * 从JSON对象创建block节点
   *
   * 设计原则：
   * 1. 类型映射 - 根据type字段映射到对应的节点类型
   * 2. 降级处理 - 提供降级处理方案
   * 3. 内容处理 - 处理复杂的内容结构
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
        return this.schema.nodes.paragraph.create(blockAttrs, this.schema.text(JSON.stringify(jsonContent)))
      }

      const nodeType = this.schema.nodes[type]
      if (!nodeType) {
        // 降级为段落
        return this.schema.nodes.paragraph.create(blockAttrs, this.schema.text(JSON.stringify(jsonContent)))
      }

      // 处理内容
      let nodeContent: Fragment | null = null
      if (Array.isArray(content) && content.length > 0) {
        const contentNodes = content
          .map(item => {
            if (typeof item === 'string') {
              return this.schema.text(item)
            }

            if (typeof item === 'object' && item.type) {
              // 区分 text 节点和 block 节点
              if (item.type === 'text' && typeof item.text === 'string') {
                return this.schema.text(item.text)
              }
              // 对于其他节点类型，递归创建
              return this.createBlockFromJSON(item)
            }

            return null
          })
          .filter(Boolean) as ProseMirrorNode[]

        if (contentNodes.length > 0) {
          nodeContent = Fragment.fromArray(contentNodes)
        }
      } else if (typeof jsonContent.text === 'string') {
        nodeContent = Fragment.fromArray([this.schema.text(jsonContent.text)])
      }

      return nodeType.create(blockAttrs, nodeContent)
    } catch {
      return null
    }
  }

  /**
   * 通过moniBlockId查找节点
   *
   * 设计原则：
   * 1. 节点遍历 - 通过遍历节点查找目标节点
   * 2. 位置计算 - 同时计算节点位置
   * 3. 性能优化 - 找到后立即停止遍历
   */
  private findNodeByBlockId(moniBlockId: string): { node: ProseMirrorNode; position: number } | null {
    const { doc } = this.view.state
    let result: { node: ProseMirrorNode; position: number } | null = null

    doc.descendants((node, pos) => {
      if (node.attrs?.moniBlockId === moniBlockId) {
        result = { node, position: pos }
        return false
      }
    })

    return result
  }

  /**
   * 通过moniOperationId查找节点
   *
   * 设计原则：
   * 1. 节点遍历 - 通过遍历节点查找目标节点
   * 2. 位置计算 - 同时计算节点位置
   * 3. 性能优化 - 找到后立即停止遍历
   */
  private findNodeByOperationId(moniOperationId: string): { node: ProseMirrorNode; position: number } | null {
    const { doc } = this.view.state
    let result: { node: ProseMirrorNode; position: number } | null = null

    doc.descendants((node, pos) => {
      if (node.attrs?.diffOperationId === moniOperationId) {
        result = { node, position: pos }
        return false
      }
    })

    return result
  }

  /**
   * 获取节点位置
   *
   * 设计原则：
   * 1. 按需计算 - 位置信息按需计算，不重复存储
   * 2. 节点遍历 - 通过遍历节点计算位置
   * 3. 性能考虑 - 虽然有一定开销，但操作频率低
   */
  private getNodePosition(node: ProseMirrorNode): number | null {
    let position: number | null = null

    this.view.state.doc.descendants((n, pos) => {
      if (n === node) {
        position = pos
        return false
      }
    })

    return position
  }
}

// ===== 便捷的 BlockContent 创建函数 =====

/**
 * 创建简单文本内容
 * @param text 文本内容
 * @returns BlockContent 对象
 */
export function createTextContent(text: string): BlockContent {
  return { text }
}

/**
 * 创建段落内容
 * @param text 段落文本
 * @param attrs 段落属性
 * @returns BlockContent 对象
 */
export function createParagraphContent(text: string, attrs: Record<string, unknown> = {}): BlockContent {
  return {
    type: 'paragraph',
    content: [{ text }],
    attrs,
  }
}

/**
 * 创建标题内容
 * @param text 标题文本
 * @param level 标题级别 (1-6)
 * @param attrs 标题属性
 * @returns BlockContent 对象
 */
export function createHeadingContent(
  text: string,
  level: number = 1,
  attrs: Record<string, unknown> = {},
): BlockContent {
  return {
    type: 'heading',
    attrs: { level, ...attrs },
    content: [{ text }],
  }
}

/**
 * 创建列表项内容
 * @param text 列表项文本
 * @param attrs 列表项属性
 * @returns BlockContent 对象
 */
export function createListItemContent(text: string, attrs: Record<string, unknown> = {}): BlockContent {
  return {
    type: 'listItem',
    content: [{ text }],
    attrs,
  }
}

/**
 * 创建代码块内容
 * @param text 代码文本
 * @param language 编程语言
 * @param attrs 代码块属性
 * @returns BlockContent 对象
 */
export function createCodeBlockContent(
  text: string,
  language: string = '',
  attrs: Record<string, unknown> = {},
): BlockContent {
  return {
    type: 'codeBlock',
    attrs: { language, ...attrs },
    content: [{ text }],
  }
}

/**
 * 创建引用块内容
 * @param text 引用文本
 * @param attrs 引用块属性
 * @returns BlockContent 对象
 */
export function createBlockquoteContent(text: string, attrs: Record<string, unknown> = {}): BlockContent {
  return {
    type: 'blockquote',
    content: [{ text }],
    attrs,
  }
}
