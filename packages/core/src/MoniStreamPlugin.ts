import { Plugin, PluginKey } from '@tiptap/pm/state'

import type { Editor } from './Editor.js'
import {
  type StreamOperation,
  type StreamOperationOptions,
  type StreamOperationResult,
  BlockOperationType,
  StreamOperationManager,
} from './StreamOperationManager.js'
import {
  type StreamProgressEvent,
  type StreamProgressInfo,
  type StreamProgressOptions,
  StreamProgressManager,
} from './StreamProgressManager.js'
import { type StreamTargetInfo, type StreamTargetOptions, StreamTargetManager } from './StreamTargetManager.js'

export interface MoniStreamPluginOptions {
  /**
   * 是否启用插件
   * @default true
   */
  enabled?: boolean

  /**
   * 目标管理器配置
   */
  targetManager?: StreamTargetOptions

  /**
   * 操作管理器配置
   */
  operationManager?: StreamOperationOptions

  /**
   * 进度管理器配置
   */
  progressManager?: StreamProgressOptions

  /**
   * 全局调试模式
   * @default false
   */
  debug?: boolean
}

export interface StreamSession {
  id: string
  blockId: string
  status: 'idle' | 'active' | 'completed' | 'error'
  startTime: number
  endTime?: number
  operations: StreamOperation[]
  totalOperations: number
  completedOperations: number
  progress: number
}

export interface MoniStreamAPI {
  // 目标管理
  setStreamTarget(blockId: string, sessionId: string): boolean
  clearStreamTarget(): void
  getCurrentTarget(): StreamTargetInfo | null
  isCurrentTarget(blockId: string): boolean

  // 🔥 Diff Native 操作管理 - 天生需要确认的操作
  queueOperation(operation: Omit<StreamOperation, 'id' | 'timestamp' | 'status'>): string
  queueOperations(operations: Array<Omit<StreamOperation, 'id' | 'timestamp' | 'status'>>): string[]

  // 操作确认（天然的工作流）
  approveOperation(operationId: string): boolean
  rejectOperation(operationId: string): boolean
  getPendingOperations(): StreamOperation[]
  approveAllOperations(): boolean
  rejectAllOperations(): boolean

  // 历史和状态查询
  getOperationHistory(sessionId?: string): StreamOperationResult[]
  getQueueStatus(): { queueSize: number; isProcessing: boolean; isPaused: boolean; maxQueueSize: number }

  // 进度管理
  startSession(sessionId: string, blockId: string, totalOperations: number): void
  updateProgress(sessionId: string, completedOperations: number, metadata?: Record<string, any>): void
  completeSession(sessionId: string): void
  errorSession(sessionId: string, error: string): void
  getProgress(sessionId: string): StreamProgressInfo | null
  getActiveSessions(): StreamProgressInfo[]

  // 操作控制
  pauseOperations(): void
  resumeOperations(): void

  // 高级API
  startStreamSession(
    sessionId: string,
    blockId: string,
    operations: Array<Omit<StreamOperation, 'id' | 'timestamp' | 'status'>>,
  ): boolean
  processStreamBatch(sessionId: string, blockId: string, content: string, batchSize?: number): boolean
  streamText(sessionId: string, blockId: string, text: string, chunkSize?: number): boolean
  streamCode(sessionId: string, blockId: string, code: string, lineChunkSize?: number): boolean

  // 事件监听
  addEventListener(event: 'progress', listener: (event: StreamProgressEvent) => void): void
  removeEventListener(event: 'progress', listener: (event: StreamProgressEvent) => void): void

  // 会话管理
  getSession(sessionId: string): StreamSession | null
  getAllSessions(): StreamSession[]
  cleanupSession(sessionId: string): void
  pauseSession(sessionId: string): void
  resumeSession(sessionId: string): void
}

/**
 * Moni Stream 插件
 *
 * 整合所有Stream管理器，提供统一的Block Stream系统：
 * 1. 目标管理 - 设置和管理流式目标
 * 2. 操作管理 - 执行流式操作
 * 3. 进度管理 - 跟踪流式进度
 * 4. 高级API - 便捷的流式处理方法
 */
export class MoniStreamPlugin {
  private readonly editor: Editor
  private readonly options: MoniStreamPluginOptions
  private readonly targetManager: StreamTargetManager
  private readonly operationManager: StreamOperationManager
  private readonly progressManager: StreamProgressManager
  private readonly sessions: Map<string, StreamSession> = new Map()
  private readonly pluginKey: PluginKey
  private readonly plugin: Plugin

  constructor(editor: Editor, options: MoniStreamPluginOptions = {}) {
    this.editor = editor
    this.options = {
      enabled: true,
      debug: false,
      targetManager: {},
      operationManager: {},
      progressManager: {},
      ...options,
    }

    // 传播调试配置
    if (this.options.debug) {
      this.options.targetManager!.debug = true
      this.options.operationManager!.debug = true
      this.options.progressManager!.debug = true
    }

    // 初始化管理器
    this.targetManager = new StreamTargetManager(editor, this.options.targetManager)
    this.operationManager = new StreamOperationManager(editor, {
      ...this.options.operationManager,
      onOperationComplete: (operation, result) => {
        this.handleOperationComplete(operation, result)
      },
    })
    this.progressManager = new StreamProgressManager(editor, this.options.progressManager)

    // 创建插件
    this.pluginKey = new PluginKey('moni-stream')
    this.plugin = this.createPlugin()

    this.initialize()
  }

  private initialize(): void {
    // 监听进度事件
    this.progressManager.addEventListener(event => {
      this.handleProgressEvent(event)
    })

    this.debug('MoniStreamPlugin initialized')
  }

  /**
   * 创建ProseMirror插件
   */
  private createPlugin(): Plugin {
    return new Plugin({
      key: this.pluginKey,
      state: {
        init: () => ({
          enabled: this.options.enabled,
          activeSessions: new Map(),
        }),
        apply: (tr, prev) => {
          // 处理事务，更新插件状态
          return prev
        },
      },
      props: {
        handleDOMEvents: {
          // 可以添加DOM事件处理
        },
      },
    })
  }

  /**
   * 处理操作完成事件
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private handleOperationComplete(operation: StreamOperation, result: StreamOperationResult): void {
    const session = this.sessions.get(operation.sessionId)
    if (!session) {
      return
    }

    // 更新会话状态
    session.completedOperations += 1
    session.operations.push(operation)

    // 更新进度管理器
    this.progressManager.updateProgress(operation.sessionId, session.completedOperations)

    // 如果所有操作完成，完成会话
    if (session.completedOperations >= session.totalOperations) {
      this.progressManager.completeSession(operation.sessionId)
    }

    this.debug(
      `Operation completed for session ${operation.sessionId}: ${session.completedOperations}/${session.totalOperations}`,
    )
  }

  /**
   * 处理进度事件
   */
  private handleProgressEvent(event: StreamProgressEvent): void {
    const session = this.sessions.get(event.sessionId)
    if (!session) {
      return
    }

    switch (event.type) {
      case 'start':
        session.status = 'active'
        session.progress = 0
        break
      case 'progress':
        session.progress = event.progress
        break
      case 'complete':
        session.status = 'completed'
        session.progress = 1
        session.endTime = Date.now()
        break
      case 'error':
        session.status = 'error'
        session.endTime = Date.now()
        break
      default:
        // 其他事件类型的处理
        break
    }

    this.debug(`Session ${event.sessionId} ${event.type}: ${Math.round(event.progress * 100)}%`)
  }

  /**
   * 获取统一API
   */
  public getAPI(): MoniStreamAPI {
    return {
      // 目标管理
      setStreamTarget: (blockId: string, sessionId: string) => this.targetManager.setStreamTarget(blockId, sessionId),
      clearStreamTarget: () => this.targetManager.clearStreamTarget(),
      getCurrentTarget: () => this.targetManager.getCurrentTarget(),
      isCurrentTarget: (blockId: string) => this.targetManager.isCurrentTarget(blockId),

      // 🔥 Diff Native 操作管理 - 天生需要确认的操作
      queueOperation: (operation: Omit<StreamOperation, 'id' | 'timestamp' | 'status'>) =>
        this.operationManager.queueOperation(operation),
      queueOperations: (operations: Array<Omit<StreamOperation, 'id' | 'timestamp' | 'status'>>) =>
        this.operationManager.queueOperations(operations),

      // 操作确认（天然的工作流）
      approveOperation: (operationId: string) => this.operationManager.approveDiffOperation(operationId),
      rejectOperation: (operationId: string) => this.operationManager.rejectDiffOperation(operationId),
      getPendingOperations: () => this.operationManager.getPendingDiffOperations(),
      approveAllOperations: () => this.operationManager.approveAllDiffOperations(),
      rejectAllOperations: () => this.operationManager.rejectAllDiffOperations(),

      // 历史和状态查询
      getOperationHistory: (sessionId?: string) => this.operationManager.getOperationHistory(sessionId),
      getQueueStatus: () => this.operationManager.getQueueStatus(),

      // 进度管理
      startSession: (sessionId: string, blockId: string, totalOperations: number) =>
        this.progressManager.startSession(sessionId, blockId, totalOperations),
      updateProgress: (sessionId: string, completedOperations: number, metadata?: Record<string, any>) =>
        this.progressManager.updateProgress(sessionId, completedOperations, metadata),
      completeSession: (sessionId: string) => this.progressManager.completeSession(sessionId),
      errorSession: (sessionId: string, error: string) => this.progressManager.errorSession(sessionId, error),
      getProgress: (sessionId: string) => this.progressManager.getProgress(sessionId),
      getActiveSessions: () => this.progressManager.getActiveSessions(),

      // 操作控制
      pauseOperations: () => this.operationManager.pause(),
      resumeOperations: () => this.operationManager.resume(),

      // 高级API
      startStreamSession: (
        sessionId: string,
        blockId: string,
        operations: Array<Omit<StreamOperation, 'id' | 'timestamp'>>,
      ) => this.startStreamSession(sessionId, blockId, operations),
      processStreamBatch: (sessionId: string, blockId: string, content: string, batchSize?: number) =>
        this.processStreamBatch(sessionId, blockId, content, batchSize),
      streamText: (sessionId: string, blockId: string, text: string, chunkSize?: number) =>
        this.streamText(sessionId, blockId, text, chunkSize),
      streamCode: (sessionId: string, blockId: string, code: string, lineChunkSize?: number) =>
        this.streamCode(sessionId, blockId, code, lineChunkSize),

      // 事件监听
      addEventListener: (event: 'progress', listener: (event: StreamProgressEvent) => void) =>
        this.progressManager.addEventListener(listener),
      removeEventListener: (event: 'progress', listener: (event: StreamProgressEvent) => void) =>
        this.progressManager.removeEventListener(listener),

      // 会话管理
      getSession: (sessionId: string) => this.getSession(sessionId),
      getAllSessions: () => this.getAllSessions(),
      cleanupSession: (sessionId: string) => this.cleanupSession(sessionId),
      pauseSession: (sessionId: string) => this.pauseSession(sessionId),
      resumeSession: (sessionId: string) => this.resumeSession(sessionId),
    }
  }

  /**
   * 启动流式会话
   */
  private startStreamSession(
    sessionId: string,
    blockId: string,
    operations: Array<Omit<StreamOperation, 'id' | 'timestamp' | 'status'>>,
  ): boolean {
    if (this.sessions.has(sessionId)) {
      this.debug(`Session already exists: ${sessionId}`)
      return false
    }

    // 创建会话
    const session: StreamSession = {
      id: sessionId,
      blockId,
      status: 'idle',
      startTime: Date.now(),
      operations: [],
      totalOperations: operations.length,
      completedOperations: 0,
      progress: 0,
    }

    this.sessions.set(sessionId, session)

    // 设置目标
    this.targetManager.setStreamTarget(blockId, sessionId)

    // 启动进度跟踪
    this.progressManager.startSession(sessionId, blockId, operations.length)

    // 🔥 队列操作 - 天生需要确认的操作
    try {
      this.operationManager.queueOperations(operations)
    } catch {
      this.errorSession(sessionId, 'Failed to queue operations')
      return false
    }

    this.debug(`Stream session started: ${sessionId}`)
    return true
  }

  /**
   * 处理流式批次
   */
  private processStreamBatch(sessionId: string, blockId: string, content: string, batchSize = 50): boolean {
    const chunks = this.splitIntoChunks(content, batchSize)
    const operations = chunks.map(chunk => ({
      sessionId,
      blockId,
      type: BlockOperationType.APPEND,
      content: chunk,
    }))

    return this.startStreamSession(sessionId, blockId, operations)
  }

  /**
   * 流式文本处理
   */
  private streamText(sessionId: string, blockId: string, text: string, chunkSize = 30): boolean {
    const chunks = this.splitIntoChunks(text, chunkSize)
    const operations = chunks.map(chunk => ({
      sessionId,
      blockId,
      type: BlockOperationType.APPEND,
      content: chunk,
    }))

    return this.startStreamSession(sessionId, blockId, operations)
  }

  /**
   * 流式代码处理
   */
  private streamCode(sessionId: string, blockId: string, code: string, lineChunkSize = 5): boolean {
    const lines = code.split('\n')
    const chunks: string[] = []

    for (let i = 0; i < lines.length; i += lineChunkSize) {
      const chunk = lines.slice(i, i + lineChunkSize).join('\n')
      chunks.push(chunk)
    }

    const operations = chunks.map(chunk => ({
      sessionId,
      blockId,
      type: BlockOperationType.APPEND,
      content: chunk,
    }))

    return this.startStreamSession(sessionId, blockId, operations)
  }

  /**
   * 分割内容为块
   */
  private splitIntoChunks(content: string, chunkSize: number): string[] {
    const chunks: string[] = []
    for (let i = 0; i < content.length; i += chunkSize) {
      chunks.push(content.slice(i, i + chunkSize))
    }
    return chunks
  }

  /**
   * 获取会话
   */
  private getSession(sessionId: string): StreamSession | null {
    return this.sessions.get(sessionId) || null
  }

  /**
   * 获取所有会话
   */
  private getAllSessions(): StreamSession[] {
    return Array.from(this.sessions.values())
  }

  /**
   * 清理会话
   */
  private cleanupSession(sessionId: string): void {
    this.sessions.delete(sessionId)
    this.operationManager.clearQueue(sessionId)
    this.debug(`Session cleaned up: ${sessionId}`)
  }

  /**
   * 暂停会话
   */
  private pauseSession(sessionId: string): void {
    this.operationManager.pause()
    this.debug(`Session paused: ${sessionId}`)
  }

  /**
   * 恢复会话
   */
  private resumeSession(sessionId: string): void {
    this.operationManager.resume()
    this.debug(`Session resumed: ${sessionId}`)
  }

  /**
   * 错误会话
   */
  private errorSession(sessionId: string, error: string): void {
    this.progressManager.errorSession(sessionId, error)
    this.cleanupSession(sessionId)
  }

  /**
   * 获取ProseMirror插件
   */
  public getPlugin(): Plugin {
    return this.plugin
  }

  /**
   * 获取插件键
   */
  public getPluginKey(): PluginKey {
    return this.pluginKey
  }

  /**
   * 调试日志
   */
  private debug(message: string, ...args: any[]): void {
    if (this.options.debug) {
      console.log(`[MoniStreamPlugin] ${message}`, ...args)
    }
  }

  /**
   * 销毁插件
   */
  public destroy(): void {
    // 清理所有会话
    this.sessions.clear()

    // 销毁管理器
    this.targetManager.destroy()
    this.operationManager.destroy()
    this.progressManager.destroy()

    this.debug('MoniStreamPlugin destroyed')
  }
}

/**
 * 创建MoniStreamPlugin实例的工厂函数
 */
export function createMoniStreamPlugin(editor: Editor, options?: MoniStreamPluginOptions): MoniStreamPlugin {
  return new MoniStreamPlugin(editor, options)
}
