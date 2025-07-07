import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

import type { Editor } from './Editor.js'

export interface StreamTargetOptions {
  /**
   * 是否启用视觉指示器
   * @default true
   */
  enableVisualIndicator?: boolean

  /**
   * 是否启用调试模式
   * @default false
   */
  debug?: boolean

  /**
   * 目标切换的防抖延迟（毫秒）
   * @default 100
   */
  debounceDelay?: number
}

export interface StreamTargetInfo {
  blockId: string
  sessionId: string
  streamType: string
  streamMode: string
  position: number
  node: ProseMirrorNode
}

/**
 * 流式目标管理器
 *
 * 负责管理当前活跃的流式目标节点：
 * 1. 设置和清除流式目标标记
 * 2. 跟踪目标节点的生命周期
 * 3. 提供视觉指示器
 * 4. 智能目标切换
 */
export class StreamTargetManager {
  private readonly editor: Editor
  private readonly options: StreamTargetOptions
  private currentTarget: StreamTargetInfo | null = null
  private visualIndicator: HTMLElement | null = null
  private debounceTimer: number | null = null

  constructor(editor: Editor, options: StreamTargetOptions = {}) {
    this.editor = editor
    this.options = {
      enableVisualIndicator: true,
      debug: false,
      debounceDelay: 100,
      ...options,
    }

    this.initialize()
  }

  private initialize(): void {
    if (this.options.enableVisualIndicator) {
      this.createVisualIndicator()
    }

    this.debug('StreamTargetManager initialized')
  }

  /**
   * 设置当前流式目标
   */
  public setStreamTarget(blockId: string, sessionId: string): boolean {
    this.debug(`Setting stream target: ${blockId} for session: ${sessionId}`)

    const targetInfo = this.findNodeByBlockId(blockId)
    if (!targetInfo) {
      this.debug(`Node not found: ${blockId}`)
      return false
    }

    // 清除之前的目标
    this.clearStreamTarget()

    // 设置新目标
    this.currentTarget = {
      blockId,
      sessionId,
      streamType: targetInfo.node.attrs.moniStreamType || 'text',
      streamMode: targetInfo.node.attrs.moniStreamMode || 'replace',
      position: targetInfo.position,
      node: targetInfo.node,
    }

    // 更新节点属性
    this.updateNodeStreamTarget(blockId, sessionId, true)

    // 显示视觉指示器
    if (this.options.enableVisualIndicator) {
      this.showVisualIndicator(blockId)
    }

    this.debug(`Stream target set: ${blockId}`)
    return true
  }

  /**
   * 清除流式目标标记
   */
  public clearStreamTarget(): void {
    if (!this.currentTarget) {
      return
    }

    this.debug(`Clearing stream target: ${this.currentTarget.blockId}`)

    // 更新节点属性
    this.updateNodeStreamTarget(this.currentTarget.blockId, null, false)

    // 隐藏视觉指示器
    this.hideVisualIndicator()

    this.currentTarget = null
    this.debug('Stream target cleared')
  }

  /**
   * 获取当前活跃目标
   */
  public getCurrentTarget(): StreamTargetInfo | null {
    return this.currentTarget
  }

  /**
   * 检查指定节点是否为当前目标
   */
  public isCurrentTarget(blockId: string): boolean {
    return this.currentTarget?.blockId === blockId
  }

  /**
   * 智能切换目标（防抖处理）
   */
  public switchTarget(blockId: string, sessionId: string): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    this.debounceTimer = window.setTimeout(() => {
      this.setStreamTarget(blockId, sessionId)
      this.debounceTimer = null
    }, this.options.debounceDelay)
  }

  /**
   * 获取目标节点的流式配置
   */
  public getTargetConfig(): {
    streamType: string
    streamMode: string
  } | null {
    if (!this.currentTarget) {
      return null
    }

    return {
      streamType: this.currentTarget.streamType,
      streamMode: this.currentTarget.streamMode,
    }
  }

  /**
   * 创建视觉指示器元素
   */
  private createVisualIndicator(): void {
    this.visualIndicator = document.createElement('div')
    this.visualIndicator.className = 'moni-stream-target-indicator'
    this.visualIndicator.innerHTML = `
      <div class="moni-stream-indicator-content">
        <div class="moni-stream-indicator-icon">⚡</div>
        <div class="moni-stream-indicator-text">AI Writing</div>
      </div>
    `

    // 添加样式
    this.visualIndicator.style.cssText = `
      position: absolute;
      top: 0;
      left: -32px;
      z-index: 1000;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s ease;
    `

    // 添加到编辑器容器
    const editorElement = this.editor.view.dom.parentElement
    if (editorElement) {
      editorElement.appendChild(this.visualIndicator)
    }
  }

  /**
   * 显示视觉指示器
   */
  private showVisualIndicator(blockId: string): void {
    if (!this.visualIndicator) {
      return
    }

    const blockElement = this.findBlockElement(blockId)
    if (!blockElement) {
      return
    }

    // 计算位置
    const blockRect = blockElement.getBoundingClientRect()
    const editorRect = this.editor.view.dom.getBoundingClientRect()

    const top = blockRect.top - editorRect.top
    const left = -32

    this.visualIndicator.style.top = `${top}px`
    this.visualIndicator.style.left = `${left}px`
    this.visualIndicator.style.opacity = '1'
  }

  /**
   * 隐藏视觉指示器
   */
  private hideVisualIndicator(): void {
    if (this.visualIndicator) {
      this.visualIndicator.style.opacity = '0'
    }
  }

  /**
   * 更新节点的流式目标属性
   */
  private updateNodeStreamTarget(blockId: string, sessionId: string | null, isTarget: boolean): void {
    const { tr } = this.editor.view.state
    const nodeInfo = this.findNodeByBlockId(blockId)

    if (!nodeInfo) {
      return
    }

    const newAttrs = {
      ...nodeInfo.node.attrs,
      moniStreamTarget: isTarget,
      moniStreamId: sessionId,
      moniStreamStatus: isTarget ? 'ready' : 'idle',
    }

    tr.setNodeMarkup(nodeInfo.position, undefined, newAttrs)
    this.editor.view.dispatch(tr)
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
        return false // 停止遍历
      }
    })

    return result
  }

  /**
   * 查找块元素
   */
  private findBlockElement(blockId: string): HTMLElement | null {
    return this.editor.view.dom.querySelector(`[moni-block-id="${blockId}"]`) as HTMLElement
  }

  /**
   * 调试日志
   */
  private debug(message: string, ...args: any[]): void {
    if (this.options.debug) {
      console.log(`[StreamTargetManager] ${message}`, ...args)
    }
  }

  /**
   * 销毁管理器
   */
  public destroy(): void {
    this.clearStreamTarget()

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }

    if (this.visualIndicator) {
      this.visualIndicator.remove()
      this.visualIndicator = null
    }

    this.debug('StreamTargetManager destroyed')
  }
}
