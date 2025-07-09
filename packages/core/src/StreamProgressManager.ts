import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

import type { Editor } from './Editor.js'

export interface StreamProgressOptions {
  /**
   * 是否启用调试模式
   * @default false
   */
  debug?: boolean

  /**
   * 进度更新间隔（毫秒）
   * @default 100
   */
  updateInterval?: number

  /**
   * 是否启用进度条动画
   * @default true
   */
  enableAnimation?: boolean

  /**
   * 进度条样式配置
   */
  progressBarStyle?: {
    height?: string
    backgroundColor?: string
    progressColor?: string
    borderRadius?: string
  }
}

export interface StreamProgressInfo {
  sessionId: string
  blockId: string
  progress: number // 0-1
  status: 'idle' | 'streaming' | 'completed' | 'error'
  totalOperations: number
  completedOperations: number
  startTime: number
  endTime?: number
  estimatedDuration?: number
  metadata?: Record<string, any>
}

export interface StreamProgressEvent {
  type: 'start' | 'progress' | 'complete' | 'error'
  sessionId: string
  blockId: string
  progress: number
  data?: any
}

type ProgressEventListener = (event: StreamProgressEvent) => void

/**
 * 流式进度管理器
 *
 * 负责跟踪和管理流式操作的进度：
 * 1. 维护进度状态
 * 2. 提供进度查询和更新
 * 3. 支持进度条可视化
 * 4. 触发进度事件
 */
export class StreamProgressManager {
  private readonly editor: Editor
  private readonly options: StreamProgressOptions
  private progressMap: Map<string, StreamProgressInfo> = new Map()
  private progressBars: Map<string, HTMLElement> = new Map()
  private eventListeners: ProgressEventListener[] = []
  private updateTimer: number | null = null

  constructor(editor: Editor, options: StreamProgressOptions = {}) {
    this.editor = editor
    this.options = {
      debug: false,
      updateInterval: 100,
      enableAnimation: true,
      progressBarStyle: {
        height: '2px',
        backgroundColor: '#e0e0e0',
        progressColor: '#007bff',
        borderRadius: '1px',
      },
      ...options,
    }

    this.initialize()
  }

  private initialize(): void {
    this.debug('StreamProgressManager initialized')
  }

  /**
   * 开始流式会话
   */
  public startSession(sessionId: string, blockId: string, totalOperations: number): void {
    this.debug(`Starting session: ${sessionId} for block: ${blockId}`)

    const progressInfo: StreamProgressInfo = {
      sessionId,
      blockId,
      progress: 0,
      status: 'streaming',
      totalOperations,
      completedOperations: 0,
      startTime: Date.now(),
    }

    this.progressMap.set(sessionId, progressInfo)

    // 更新节点进度属性
    this.updateNodeProgress(blockId, 0, 'streaming')

    // 创建进度条
    if (this.options.enableAnimation) {
      this.createProgressBar(sessionId, blockId)
    }

    // 触发开始事件
    this.emitEvent({
      type: 'start',
      sessionId,
      blockId,
      progress: 0,
    })

    this.debug(`Session started: ${sessionId}`)
  }

  /**
   * 更新流式进度
   */
  public updateProgress(sessionId: string, completedOperations: number, metadata?: Record<string, any>): void {
    const progressInfo = this.progressMap.get(sessionId)
    if (!progressInfo) {
      this.debug(`Session not found: ${sessionId}`)
      return
    }

    // 计算进度
    const progress = Math.max(0, Math.min(completedOperations / progressInfo.totalOperations, 1))
    const estimatedDuration = this.calculateEstimatedDuration(progressInfo, progress)

    // 更新进度信息
    progressInfo.completedOperations = completedOperations
    progressInfo.progress = progress
    progressInfo.estimatedDuration = estimatedDuration
    if (metadata) {
      progressInfo.metadata = { ...progressInfo.metadata, ...metadata }
    }

    // 更新节点进度属性
    this.updateNodeProgress(progressInfo.blockId, progress, 'streaming')

    // 更新进度条
    if (this.options.enableAnimation) {
      this.updateProgressBar(sessionId, progress)
    }

    // 触发进度事件
    this.emitEvent({
      type: 'progress',
      sessionId,
      blockId: progressInfo.blockId,
      progress,
      data: { estimatedDuration, metadata },
    })

    this.debug(`Progress updated: ${sessionId}, ${Math.round(progress * 100)}%`)
  }

  /**
   * 完成流式会话
   */
  public completeSession(sessionId: string): void {
    const progressInfo = this.progressMap.get(sessionId)
    if (!progressInfo) {
      this.debug(`Session not found: ${sessionId}`)
      return
    }

    this.debug(`Completing session: ${sessionId}`)

    // 更新进度信息
    progressInfo.progress = 1
    progressInfo.status = 'completed'
    progressInfo.endTime = Date.now()
    progressInfo.completedOperations = progressInfo.totalOperations

    // 更新节点进度属性
    this.updateNodeProgress(progressInfo.blockId, 1, 'completed')

    // 完成进度条动画
    if (this.options.enableAnimation) {
      this.completeProgressBar(sessionId)
    }

    // 触发完成事件
    this.emitEvent({
      type: 'complete',
      sessionId,
      blockId: progressInfo.blockId,
      progress: 1,
      data: { duration: progressInfo.endTime - progressInfo.startTime },
    })

    this.debug(`Session completed: ${sessionId}`)

    // 延迟清理
    setTimeout(() => {
      this.cleanupSession(sessionId)
    }, 2000)
  }

  /**
   * 标记会话错误
   */
  public errorSession(sessionId: string, error: string): void {
    const progressInfo = this.progressMap.get(sessionId)
    if (!progressInfo) {
      this.debug(`Session not found: ${sessionId}`)
      return
    }

    this.debug(`Error in session: ${sessionId}`, error)

    // 更新进度信息
    progressInfo.status = 'error'
    progressInfo.endTime = Date.now()

    // 更新节点进度属性
    this.updateNodeProgress(progressInfo.blockId, progressInfo.progress, 'error')

    // 显示错误状态
    if (this.options.enableAnimation) {
      this.errorProgressBar(sessionId)
    }

    // 触发错误事件
    this.emitEvent({
      type: 'error',
      sessionId,
      blockId: progressInfo.blockId,
      progress: progressInfo.progress,
      data: { error },
    })

    // 延迟清理
    setTimeout(() => {
      this.cleanupSession(sessionId)
    }, 5000)
  }

  /**
   * 获取进度信息
   */
  public getProgress(sessionId: string): StreamProgressInfo | null {
    return this.progressMap.get(sessionId) || null
  }

  /**
   * 获取所有活跃会话
   */
  public getActiveSessions(): StreamProgressInfo[] {
    return Array.from(this.progressMap.values()).filter(info => info.status === 'streaming')
  }

  /**
   * 创建进度条
   */
  private createProgressBar(sessionId: string, blockId: string): void {
    const blockElement = this.findBlockElement(blockId)
    if (!blockElement) {
      return
    }

    const progressBar = document.createElement('div')
    progressBar.className = 'moni-stream-progress-bar'
    progressBar.innerHTML = `
      <div class="moni-progress-track">
        <div class="moni-progress-fill"></div>
      </div>
    `

    // 应用样式
    const { progressBarStyle } = this.options
    progressBar.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: ${progressBarStyle?.height || '4px'};
      pointer-events: none;
      z-index: 1000;
    `

    const track = progressBar.querySelector('.moni-progress-track') as HTMLElement
    if (track) {
      track.style.cssText = `
        width: 100%;
        height: 100%;
        background-color: ${progressBarStyle?.backgroundColor || '#f0f0f0'};
        border-radius: ${progressBarStyle?.borderRadius || '2px'};
        overflow: hidden;
      `
    }

    const fill = progressBar.querySelector('.moni-progress-fill') as HTMLElement
    if (fill) {
      fill.style.cssText = `
        width: 0%;
        height: 100%;
        background-color: ${progressBarStyle?.progressColor || '#007bff'};
        transition: width 0.2s ease;
      `
    }

    // 添加到块元素
    blockElement.style.position = 'relative'
    blockElement.appendChild(progressBar)

    this.progressBars.set(sessionId, progressBar)
  }

  /**
   * 更新进度条
   */
  private updateProgressBar(sessionId: string, progress: number): void {
    const progressBar = this.progressBars.get(sessionId)
    if (!progressBar) {
      return
    }

    const fill = progressBar.querySelector('.moni-progress-fill') as HTMLElement
    if (fill) {
      fill.style.width = `${Math.round(progress * 100)}%`
    }
  }

  /**
   * 完成进度条
   */
  private completeProgressBar(sessionId: string): void {
    const progressBar = this.progressBars.get(sessionId)
    if (!progressBar) {
      return
    }

    const fill = progressBar.querySelector('.moni-progress-fill') as HTMLElement
    if (fill) {
      fill.style.width = '100%'
      fill.style.backgroundColor = '#28a745' // 绿色表示完成
    }
  }

  /**
   * 错误进度条
   */
  private errorProgressBar(sessionId: string): void {
    const progressBar = this.progressBars.get(sessionId)
    if (!progressBar) {
      return
    }

    const fill = progressBar.querySelector('.moni-progress-fill') as HTMLElement
    if (fill) {
      fill.style.backgroundColor = '#dc3545' // 红色表示错误
    }
  }

  /**
   * 清理会话
   */
  private cleanupSession(sessionId: string): void {
    this.debug(`Cleaning up session: ${sessionId}`)

    // 移除进度条
    const progressBar = this.progressBars.get(sessionId)
    if (progressBar) {
      progressBar.remove()
      this.progressBars.delete(sessionId)
    }

    // 移除进度信息
    this.progressMap.delete(sessionId)

    this.debug(`Session cleaned up: ${sessionId}`)
  }

  /**
   * 更新节点进度属性
   */
  private updateNodeProgress(blockId: string, progress: number, status: string): void {
    const nodeInfo = this.findNodeByBlockId(blockId)
    if (!nodeInfo) {
      return
    }

    const { tr } = this.editor.view.state
    const newAttrs = {
      ...nodeInfo.node.attrs,
      moniStreamProgress: progress,
      moniStreamStatus: status,
    }

    tr.setNodeMarkup(nodeInfo.position, undefined, newAttrs)
    this.editor.view.dispatch(tr)
  }

  /**
   * 计算预估时长
   */
  private calculateEstimatedDuration(progressInfo: StreamProgressInfo, currentProgress: number): number {
    if (currentProgress <= 0) {
      return 0
    }

    const elapsedTime = Date.now() - progressInfo.startTime
    const totalEstimated = elapsedTime / currentProgress
    const remainingTime = totalEstimated - elapsedTime

    return Math.max(0, remainingTime)
  }

  /**
   * 触发事件
   */
  private emitEvent(event: StreamProgressEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event)
      } catch (error) {
        this.debug('Error in event listener:', error)
      }
    })
  }

  /**
   * 添加事件监听器
   */
  public addEventListener(listener: ProgressEventListener): void {
    this.eventListeners.push(listener)
  }

  /**
   * 移除事件监听器
   */
  public removeEventListener(listener: ProgressEventListener): void {
    const index = this.eventListeners.indexOf(listener)
    if (index >= 0) {
      this.eventListeners.splice(index, 1)
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
   * 查找块元素
   */
  private findBlockElement(blockId: string): HTMLElement | null {
    return this.editor.view.dom.querySelector(`[data-moni-block-id="${blockId}"]`) as HTMLElement
  }

  /**
   * 调试日志
   */
  private debug(message: string, ...args: any[]): void {
    if (this.options.debug) {
      console.log(`[StreamProgressManager] ${message}`, ...args)
    }
  }

  /**
   * 销毁管理器
   */
  public destroy(): void {
    // 清理所有会话
    Array.from(this.progressMap.keys()).forEach(sessionId => {
      this.cleanupSession(sessionId)
    })

    // 清理事件监听器
    this.eventListeners = []

    // 清理定时器
    if (this.updateTimer) {
      clearTimeout(this.updateTimer)
      this.updateTimer = null
    }

    this.debug('StreamProgressManager destroyed')
  }
}
