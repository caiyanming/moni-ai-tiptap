import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

import type { Editor } from './Editor.js'
import { getDragConfig, type DragConfig } from './helpers/getDragConfig.js'
import { getNodeAttr } from './helpers/nodeAttrs.js'

// 拖拽类型枚举
export enum DragType {
  BLOCK = 'block',
  COLUMN = 'column',
}

// 放置位置枚举
export enum DropPosition {
  NONE = 'none',
  BLOCK_TOP = 'block-top',
  BLOCK_BOTTOM = 'block-bottom',
  BLOCK_NEST = 'block-nest',
  COLUMN_LEFT = 'column-left',
  COLUMN_RIGHT = 'column-right',
}

// 拖拽配置接口
export interface SmartDragConfig {
  enableDebug: boolean
  maxNestingLevel: number
  nestingThreshold: number
  confidenceThreshold: number
  searchRadius: number
  maxCandidates: number
}

// 候选位置接口
export interface CandidatePosition {
  id: string
  type: 'before' | 'after' | 'nested'
  targetBlockId: string
  position: {
    x: number
    y: number
    width: number
    height: number
  }
  nestingLevel: number
  confidence: number
  priority: number
  metadata: {
    targetElement: HTMLElement
    originalLevel: number
    targetLevel: number
    distanceFromMouse: number
    visualWeight: number
    isValidNesting?: boolean
    nestingDirection?: 'increase' | 'decrease'
  }
}

// 智能拖拽计算结果
interface BlockInfo {
  node: ProseMirrorNode
  level: number
  config: DragConfig
}

export interface SmartDragResult {
  bestCandidate: CandidatePosition | null
  allCandidates: CandidatePosition[]
  legacyPosition: DropPosition
  performance: {
    calculationTime: number
    candidatesEvaluated: number
    elementsScanned: number
  }
  debugInfo?: {
    mousePosition: { x: number; y: number }
    blockElements: HTMLElement[]
  }
}

/**
 * 智能拖拽位置计算器 - Notion风格6位置算法
 *
 * 基于AppFlowy架构精华 + Notion视觉体验的完整拖拽系统
 *
 * 核心特性：
 * - 6位置智能算法（支持块和列的统一拖拽）
 * - 置信度和优先级计算
 * - 嵌套层级计算
 * - 性能优化机制（LRU缓存）
 * - 边界情况处理
 */
export class SmartDragCalculator {
  private config: SmartDragConfig
  private readonly cache = new Map<string, SmartDragResult>()
  private readonly editor: Editor

  constructor(editor: Editor, config: Partial<SmartDragConfig> = {}) {
    this.editor = editor
    this.config = {
      enableDebug: false,
      maxNestingLevel: 6,
      nestingThreshold: 24,
      confidenceThreshold: 0.2,
      searchRadius: 200,
      maxCandidates: 10,
      ...config,
    }
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<SmartDragConfig>) {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear()
  }

  private buildBlockInfoMap(): Map<string, BlockInfo> {
    const map = new Map<string, BlockInfo>()

    this.editor.view.state.doc.descendants(node => {
      const blockId = node.attrs?.moniBlockId
      if (blockId) {
        map.set(blockId, {
          node,
          level: getNodeAttr<number>(node, 'moniLevel', 0),
          config: getDragConfig(node),
        })
      }
      return true
    })

    return map
  }

  /**
   * 计算智能拖拽位置 - 核心算法
   */
  calculateSmartPosition(
    clientX: number,
    clientY: number,
    draggedId: string,
    dragType: DragType = DragType.BLOCK,
  ): SmartDragResult {
    const startTime = performance.now()

    // 生成缓存键
    const cacheKey = `${clientX}-${clientY}-${draggedId}-${dragType}`
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!
      return {
        ...cached,
        performance: {
          ...cached.performance,
          calculationTime: performance.now() - startTime,
        },
      }
    }

    const editorElement = this.editor.view.dom

    // 获取所有块元素
    const blockElements = Array.from(editorElement.querySelectorAll('[data-moni-block-id]'))
    const filteredElements = blockElements.filter(el => el.getAttribute('data-moni-block-id') !== draggedId)

    const blockInfoMap = this.buildBlockInfoMap()
    const candidates: CandidatePosition[] = []

    // 遍历所有块元素生成候选位置
    filteredElements.forEach((element, index) => {
      try {
        const rect = element.getBoundingClientRect()

        // 跳过无效元素
        if (!Number.isFinite(rect.top) || !Number.isFinite(rect.left) || rect.width === 0 || rect.height === 0) {
          return
        }

        // 计算距离
        const distance = Math.sqrt(
          (clientX - (rect.left + rect.width / 2)) ** 2 + (clientY - (rect.top + rect.height / 2)) ** 2,
        )

        // 超出搜索半径则跳过
        if (distance > this.config.searchRadius) {
          return
        }

        const blockId = element.getAttribute('data-moni-block-id') || `block-${index}`
        const blockInfo = blockInfoMap.get(blockId)
        const nestingLevel = blockInfo?.level ?? 0
        const nestable = blockInfo?.config.nestable ?? false

        // 计算相对位置
        const relativeY = (clientY - rect.top) / rect.height
        const relativeX = (clientX - rect.left) / rect.width

        // 🎯 核心算法：6位置智能生成

        // 1. 生成上方插入位置（BLOCK_TOP）
        if (relativeY <= 0.25) {
          candidates.push({
            id: `before-${blockId}`,
            type: 'before',
            targetBlockId: blockId,
            position: { x: rect.left, y: rect.top - 2, width: rect.width, height: 2 },
            nestingLevel,
            confidence: Math.max(0.1, Math.min(1.0, 1 - relativeY / 0.25)),
            priority: 80 + (1 - distance / this.config.searchRadius) * 20,
            metadata: {
              targetElement: element as HTMLElement,
              originalLevel: nestingLevel,
              targetLevel: nestingLevel,
              distanceFromMouse: distance,
              visualWeight: 1,
            },
          })
        }

        // 2. 生成下方插入位置（BLOCK_BOTTOM）
        if (relativeY >= 0.75) {
          candidates.push({
            id: `after-${blockId}`,
            type: 'after',
            targetBlockId: blockId,
            position: { x: rect.left, y: rect.bottom, width: rect.width, height: 2 },
            nestingLevel,
            confidence: Math.max(0.1, Math.min(1.0, (relativeY - 0.75) / 0.25)),
            priority: 80 + (1 - distance / this.config.searchRadius) * 20,
            metadata: {
              targetElement: element as HTMLElement,
              originalLevel: nestingLevel,
              targetLevel: nestingLevel,
              distanceFromMouse: distance,
              visualWeight: 1,
            },
          })
        }

        // 3. 生成嵌套位置（BLOCK_NEST）
        if (nestable && relativeX > 0.25 && nestingLevel < this.config.maxNestingLevel) {
          candidates.push({
            id: `nested-${blockId}`,
            type: 'nested',
            targetBlockId: blockId,
            position: {
              x: rect.left + this.config.nestingThreshold,
              y: rect.top + rect.height / 2 - 1,
              width: rect.width - this.config.nestingThreshold,
              height: 2,
            },
            nestingLevel: nestingLevel + 1,
            confidence: Math.max(0.1, Math.min(1.0, relativeX)),
            priority: 70 + (1 - distance / this.config.searchRadius) * 30,
            metadata: {
              targetElement: element as HTMLElement,
              isValidNesting: true,
              nestingDirection: 'increase',
              originalLevel: nestingLevel,
              targetLevel: nestingLevel + 1,
              distanceFromMouse: distance,
              visualWeight: 1,
            },
          })
        }

        // 4-6. 列拖拽位置（COLUMN_LEFT, COLUMN_RIGHT, COLUMN_NEST）
        // 如果是列拖拽类型，添加列相关的候选位置
        if (dragType === DragType.COLUMN) {
          // 左侧列插入
          if (relativeX <= 0.2) {
            candidates.push({
              id: `column-left-${blockId}`,
              type: 'before',
              targetBlockId: blockId,
              position: { x: rect.left - 2, y: rect.top, width: 2, height: rect.height },
              nestingLevel,
              confidence: Math.max(0.1, Math.min(1.0, 1 - relativeX / 0.2)),
              priority: 85 + (1 - distance / this.config.searchRadius) * 15,
              metadata: {
                targetElement: element as HTMLElement,
                originalLevel: nestingLevel,
                targetLevel: nestingLevel,
                distanceFromMouse: distance,
                visualWeight: 1,
              },
            })
          }

          // 右侧列插入
          if (relativeX >= 0.8) {
            candidates.push({
              id: `column-right-${blockId}`,
              type: 'after',
              targetBlockId: blockId,
              position: { x: rect.right, y: rect.top, width: 2, height: rect.height },
              nestingLevel,
              confidence: Math.max(0.1, Math.min(1.0, (relativeX - 0.8) / 0.2)),
              priority: 85 + (1 - distance / this.config.searchRadius) * 15,
              metadata: {
                targetElement: element as HTMLElement,
                originalLevel: nestingLevel,
                targetLevel: nestingLevel,
                distanceFromMouse: distance,
                visualWeight: 1,
              },
            })
          }
        }
      } catch (error) {
        // 静默处理错误以保证鲁棒性
        if (this.config.enableDebug) {
          console.warn('处理元素时发生错误:', error)
        }
      }
    })

    // 按置信度阈值过滤
    const filteredCandidates = candidates.filter(c => c.confidence >= this.config.confidenceThreshold)

    // 按综合分数排序（置信度40% + 优先级30% + 视觉权重30%）
    filteredCandidates.sort((a, b) => {
      const scoreA = a.confidence * 0.4 + (a.priority / 100) * 0.3 + (a.metadata.visualWeight || 0) * 0.3
      const scoreB = b.confidence * 0.4 + (b.priority / 100) * 0.3 + (b.metadata.visualWeight || 0) * 0.3
      return scoreB - scoreA
    })

    // 限制候选数量
    const limitedCandidates = filteredCandidates.slice(0, this.config.maxCandidates)

    const calculationTime = performance.now() - startTime

    const result: SmartDragResult = {
      bestCandidate: limitedCandidates.length > 0 ? limitedCandidates[0] : null,
      allCandidates: limitedCandidates,
      legacyPosition: this.mapToLegacyPosition(limitedCandidates[0]),
      performance: {
        calculationTime,
        candidatesEvaluated: candidates.length,
        elementsScanned: filteredElements.length,
      },
    }

    if (this.config.enableDebug) {
      result.debugInfo = {
        mousePosition: { x: clientX, y: clientY },
        blockElements: filteredElements as HTMLElement[],
      }
    }

    // 缓存结果（LRU策略，最多缓存50项）
    if (this.cache.size >= 50) {
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }
    this.cache.set(cacheKey, result)

    return result
  }

  /**
   * 映射到传统的DropPosition枚举（兼容性）
   */
  private mapToLegacyPosition(candidate: CandidatePosition | null): DropPosition {
    if (!candidate) {
      return DropPosition.NONE
    }

    switch (candidate.type) {
      case 'before':
        return candidate.id.includes('column') ? DropPosition.COLUMN_LEFT : DropPosition.BLOCK_TOP
      case 'after':
        return candidate.id.includes('column') ? DropPosition.COLUMN_RIGHT : DropPosition.BLOCK_BOTTOM
      case 'nested':
        return DropPosition.BLOCK_NEST
      default:
        return DropPosition.NONE
    }
  }

  /**
   * 便捷方法：获取最佳投放位置
   */
  getBestDropPosition(
    clientX: number,
    clientY: number,
    draggedId: string,
    dragType: DragType = DragType.BLOCK,
  ): DropPosition {
    const result = this.calculateSmartPosition(clientX, clientY, draggedId, dragType)
    return result.legacyPosition
  }

  /**
   * 性能监控：获取缓存统计
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      maxSize: 50,
      hitRate: this.cache.size > 0 ? 'Available' : 'No data',
    }
  }
}

/**
 * 创建智能拖拽计算器的便捷函数
 */
export function createSmartDragCalculator(editor: Editor, config?: Partial<SmartDragConfig>): SmartDragCalculator {
  return new SmartDragCalculator(editor, config)
}

/**
 * 计算智能拖拽位置的便捷函数
 */
export function calculateSmartDragPosition(
  editor: Editor,
  clientX: number,
  clientY: number,
  draggedId: string,
  config?: Partial<SmartDragConfig>,
): SmartDragResult {
  const calculator = new SmartDragCalculator(editor, config)
  return calculator.calculateSmartPosition(clientX, clientY, draggedId)
}

// 兼容性导出
export type SmartDropCandidate = CandidatePosition
export type SmartCalculationResult = SmartDragResult
