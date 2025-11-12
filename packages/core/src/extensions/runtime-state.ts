import { Extension } from '../Extension.js'

/**
 * 运行时状态扩展
 *
 * 存储不需要持久化的编辑器状态，例如：
 * - 拖拽启用状态
 * - Stream 操作模式
 * - Diff 临时标记
 *
 * 这些状态随编辑器实例存在，不会被序列化到 JSON。
 *
 * @example
 * ```typescript
 * // 设置拖拽状态
 * editor.storage.runtimeState.setDragEnabled('block-123', true)
 *
 * // 读取拖拽状态
 * const enabled = editor.storage.runtimeState.getDragEnabled('block-123')
 *
 * // Stream 模式
 * editor.storage.runtimeState.setStreamMode('block-456', 'replace')
 * ```
 */

export interface RuntimeStateStorage {
  /** 节点拖拽启用状态 */
  dragEnabled: Map<string, boolean>

  /** Stream 操作模式 */
  streamMode: Map<string, 'insert' | 'replace'>

  /** Diff 临时 ID 集合 */
  diffTempIds: Set<string>

  /** 临时块标记（用于 Stream/Diff 操作） */
  tempBlocks: Map<string, any>

  /** 操作 ID 映射（用于追踪） */
  operationIds: Map<string, string>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    runtimeState: {
      /**
       * 设置节点拖拽启用状态
       */
      setDragEnabled: (nodeId: string, enabled: boolean) => ReturnType

      /**
       * 设置 Stream 操作模式
       */
      setStreamMode: (nodeId: string, mode: 'insert' | 'replace') => ReturnType

      /**
       * 添加 Diff 临时 ID
       */
      addDiffTempId: (tempId: string) => ReturnType

      /**
       * 清除所有 Diff 临时标记
       */
      clearDiffTemp: () => ReturnType

      /**
       * 设置临时块数据
       */
      setTempBlock: (blockId: string, data: any) => ReturnType

      /**
       * 清除临时块数据
       */
      clearTempBlock: (blockId: string) => ReturnType
    }
  }
}

export const RuntimeState = Extension.create<Record<string, never>, RuntimeStateStorage>({
  name: 'runtimeState',

  addStorage() {
    return {
      dragEnabled: new Map(),
      streamMode: new Map(),
      diffTempIds: new Set(),
      tempBlocks: new Map(),
      operationIds: new Map(),
    }
  },

  addCommands() {
    return {
      setDragEnabled: (nodeId: string, enabled: boolean) => () => {
        this.storage.dragEnabled.set(nodeId, enabled)
        return true
      },

      setStreamMode: (nodeId: string, mode: 'insert' | 'replace') => () => {
        this.storage.streamMode.set(nodeId, mode)
        return true
      },

      addDiffTempId: (tempId: string) => () => {
        this.storage.diffTempIds.add(tempId)
        return true
      },

      clearDiffTemp: () => () => {
        this.storage.diffTempIds.clear()
        this.storage.tempBlocks.clear()
        return true
      },

      setTempBlock: (blockId: string, data: any) => () => {
        this.storage.tempBlocks.set(blockId, data)
        return true
      },

      clearTempBlock: (blockId: string) => () => {
        this.storage.tempBlocks.delete(blockId)
        return true
      },
    }
  },

  // 不需要 onCreate，直接通过 editor.storage.runtimeState 访问

  onDestroy() {
    // 清理所有运行时状态
    this.storage.dragEnabled.clear()
    this.storage.streamMode.clear()
    this.storage.diffTempIds.clear()
    this.storage.tempBlocks.clear()
    this.storage.operationIds.clear()
  },
})
