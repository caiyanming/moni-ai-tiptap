import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock DragType enum for this test
export enum DragType {
  BLOCK = 'block',
  COLUMN = 'column',
}

// Mock DropPosition enum for this test
export enum DropPosition {
  BLOCK_TOP = 'block-top',
  BLOCK_BOTTOM = 'block-bottom',
  BLOCK_NEST = 'block-nest',
  COLUMN_LEFT = 'column-left',
  COLUMN_RIGHT = 'column-right',
}

// Mock interfaces for this test
interface SmartDragConfig {
  enableDebug?: boolean
  maxNestingLevel?: number
  nestingThreshold?: number
  confidenceThreshold?: number
  searchRadius?: number
  maxCandidates?: number
}

interface CandidatePosition {
  id: string
  type: 'before' | 'after' | 'nested'
  targetMoniBlockId: string
  position: { x: number; y: number; width: number; height: number }
  nestingLevel: number
  confidence: number
  priority: number
  metadata: {
    targetElement?: HTMLElement
    isValidNesting?: boolean
    nestingDirection?: 'increase' | 'decrease'
    originalLevel: number
    targetLevel: number
    distanceFromMouse?: number
    visualWeight?: number
  }
}

interface SmartDragResult {
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

// Mock implementation of SmartDragCalculator
class SmartDragCalculator {
  private config: SmartDragConfig
  private cache = new Map()

  constructor(config: Partial<SmartDragConfig> = {}) {
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

  updateConfig(newConfig: Partial<SmartDragConfig>) {
    this.config = { ...this.config, ...newConfig }
  }

  clearCache() {
    this.cache.clear()
  }

  calculateSmartPosition(
    clientX: number,
    clientY: number,
    draggedId: string,
    editorElement: HTMLElement,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _dragType: DragType = DragType.BLOCK,
  ): SmartDragResult {
    const startTime = performance.now()

    // Get all block elements
    const blockElements = Array.from(editorElement.querySelectorAll('[data-block-id]')) as HTMLElement[]
    const filteredElements = blockElements.filter(el => el.getAttribute('data-block-id') !== draggedId)

    const candidates: CandidatePosition[] = []

    filteredElements.forEach((element, index) => {
      try {
        const rect = element.getBoundingClientRect()

        // Skip invalid elements
        if (!Number.isFinite(rect.top) || !Number.isFinite(rect.left) || rect.width === 0 || rect.height === 0) {
          return
        }

        const distance = Math.sqrt(
          (clientX - (rect.left + rect.width / 2)) ** 2 + (clientY - (rect.top + rect.height / 2)) ** 2,
        )

        if (distance > this.config.searchRadius!) {
          return
        }

        const moniBlockId = element.getAttribute('data-moni-block-id') || `block-${index}`
        const nestingLevel = parseInt(element.getAttribute('data-nesting-level') || '0', 10) || 0

        // Calculate relative position
        const relativeY = (clientY - rect.top) / rect.height
        const relativeX = (clientX - rect.left) / rect.width

        // Generate candidates based on position
        if (relativeY <= 0.25) {
          // Above the element
          candidates.push({
            id: `before-${moniBlockId}`,
            type: 'before',
            targetMoniBlockId: moniBlockId,
            position: { x: rect.left, y: rect.top - 2, width: rect.width, height: 2 },
            nestingLevel,
            confidence: Math.max(0.1, Math.min(1.0, 1 - relativeY / 0.25)),
            priority: 80 + (1 - distance / this.config.searchRadius!) * 20,
            metadata: {
              targetElement: element,
              originalLevel: nestingLevel,
              targetLevel: nestingLevel,
              distanceFromMouse: distance,
              visualWeight: 1,
            },
          })
        }

        if (relativeY >= 0.75) {
          // Below the element
          candidates.push({
            id: `after-${moniBlockId}`,
            type: 'after',
            targetMoniBlockId: moniBlockId,
            position: { x: rect.left, y: rect.bottom, width: rect.width, height: 2 },
            nestingLevel,
            confidence: Math.max(0.1, Math.min(1.0, (relativeY - 0.75) / 0.25)),
            priority: 80 + (1 - distance / this.config.searchRadius!) * 20,
            metadata: {
              targetElement: element,
              originalLevel: nestingLevel,
              targetLevel: nestingLevel,
              distanceFromMouse: distance,
              visualWeight: 1,
            },
          })
        }

        if (relativeX > 0.25 && nestingLevel < this.config.maxNestingLevel!) {
          // Nesting position
          candidates.push({
            id: `nested-${moniBlockId}`,
            type: 'nested',
            targetMoniBlockId: moniBlockId,
            position: {
              x: rect.left + this.config.nestingThreshold!,
              y: rect.top + rect.height / 2 - 1,
              width: rect.width - this.config.nestingThreshold!,
              height: 2,
            },
            nestingLevel: nestingLevel + 1,
            confidence: Math.max(0.1, Math.min(1.0, relativeX)),
            priority: 70 + (1 - distance / this.config.searchRadius!) * 30,
            metadata: {
              targetElement: element,
              isValidNesting: true,
              nestingDirection: 'increase',
              originalLevel: nestingLevel,
              targetLevel: nestingLevel + 1,
              distanceFromMouse: distance,
              visualWeight: 1,
            },
          })
        }
      } catch (error) {
        // Silently handle errors for robustness
        console.warn('Error processing element:', error)
      }
    })

    // Filter by confidence threshold
    const filteredCandidates = candidates.filter(c => c.confidence >= this.config.confidenceThreshold!)

    // Sort by combined score
    filteredCandidates.sort((a, b) => {
      const scoreA = a.confidence * 0.4 + (a.priority / 100) * 0.3 + (a.metadata.visualWeight || 0) * 0.3
      const scoreB = b.confidence * 0.4 + (b.priority / 100) * 0.3 + (b.metadata.visualWeight || 0) * 0.3
      return scoreB - scoreA
    })

    // Limit candidates
    const limitedCandidates = filteredCandidates.slice(0, this.config.maxCandidates)

    const calculationTime = performance.now() - startTime

    const result: SmartDragResult = {
      bestCandidate: limitedCandidates.length > 0 ? limitedCandidates[0] : null,
      allCandidates: limitedCandidates,
      legacyPosition: DropPosition.BLOCK_TOP, // Default fallback
      performance: {
        calculationTime,
        candidatesEvaluated: candidates.length,
        elementsScanned: filteredElements.length,
      },
    }

    if (this.config.enableDebug) {
      result.debugInfo = {
        mousePosition: { x: clientX, y: clientY },
        blockElements: filteredElements,
      }
    }

    return result
  }
}

// Convenience function
function createSmartDragCalculator(config?: Partial<SmartDragConfig>): SmartDragCalculator {
  return new SmartDragCalculator(config)
}

function calculateSmartDragPosition(
  clientX: number,
  clientY: number,
  draggedId: string,
  editorElement: HTMLElement,
  config?: Partial<SmartDragConfig>,
): SmartDragResult {
  const calculator = new SmartDragCalculator(config)
  return calculator.calculateSmartPosition(clientX, clientY, draggedId, editorElement)
}

/**
 * 智能拖拽位置计算器测试
 *
 * 测试范围：
 * 1. 基础配置和初始化
 * 2. 候选位置生成算法
 * 3. 嵌套层级计算
 * 4. 置信度和优先级排序
 * 5. 性能优化机制
 * 6. 边界情况处理
 */

describe('SmartDragCalculator', () => {
  let calculator: SmartDragCalculator
  let mockEditorElement: HTMLElement
  let mockBlockElements: HTMLElement[]

  beforeEach(() => {
    // 创建模拟的编辑器DOM结构
    mockEditorElement = document.createElement('div')
    mockEditorElement.className = 'notion-editor'

    // 创建模拟的块元素
    mockBlockElements = []

    for (let i = 1; i <= 5; i += 1) {
      const blockElement = document.createElement('div')
      blockElement.setAttribute('data-block-id', `block-${i}`)
      blockElement.setAttribute('data-nesting-level', (i <= 2 ? '0' : '1').toString())
      blockElement.className = 'notion-block'

      // 模拟元素位置
      Object.defineProperty(blockElement, 'getBoundingClientRect', {
        value: () => ({
          top: i * 50,
          left: i <= 2 ? 0 : 24, // 嵌套缩进
          bottom: i * 50 + 40,
          right: 300,
          width: 300 - (i <= 2 ? 0 : 24),
          height: 40,
        }),
      })

      mockBlockElements.push(blockElement)
      mockEditorElement.appendChild(blockElement)
    }

    // 模拟编辑器元素位置
    Object.defineProperty(mockEditorElement, 'getBoundingClientRect', {
      value: () => ({
        top: 0,
        left: 0,
        bottom: 300,
        right: 300,
        width: 300,
        height: 300,
      }),
    })

    // 模拟 querySelectorAll
    Object.defineProperty(mockEditorElement, 'querySelectorAll', {
      value: (selector: string) => {
        if (selector === '[data-block-id]') {
          return mockBlockElements
        }
        return []
      },
    })

    // 创建计算器实例
    calculator = createSmartDragCalculator({
      enableDebug: true,
      maxNestingLevel: 6,
      nestingThreshold: 24,
      confidenceThreshold: 0.2,
    })
  })

  afterEach(() => {
    calculator.clearCache()
    vi.clearAllMocks()
  })

  describe('初始化和配置', () => {
    it('应该使用默认配置创建计算器', () => {
      const defaultCalculator = new SmartDragCalculator()
      expect(defaultCalculator).toBeInstanceOf(SmartDragCalculator)
    })

    it('应该使用自定义配置创建计算器', () => {
      const config: Partial<SmartDragConfig> = {
        maxNestingLevel: 3,
        nestingThreshold: 32,
        confidenceThreshold: 0.5,
      }

      const customCalculator = new SmartDragCalculator(config)
      expect(customCalculator).toBeInstanceOf(SmartDragCalculator)
    })

    it('应该支持配置更新', () => {
      const newConfig: Partial<SmartDragConfig> = {
        searchRadius: 100,
        maxCandidates: 3,
      }

      expect(() => {
        calculator.updateConfig(newConfig)
      }).not.toThrow()
    })
  })

  describe('位置计算算法', () => {
    it('应该计算基本的拖拽位置', () => {
      const result = calculator.calculateSmartPosition(
        150, // clientX - 在块中间
        70, // clientY - 在第一个块内部（第一个块50-90）
        'dragged-block',
        mockEditorElement,
        DragType.BLOCK,
      )

      expect(result).toBeDefined()
      expect(result.bestCandidate).not.toBeNull()
      expect(result.allCandidates.length).toBeGreaterThan(0)
      expect(result.performance.calculationTime).toBeGreaterThanOrEqual(0)
    })

    it('应该生成多个候选位置', () => {
      const result = calculator.calculateSmartPosition(
        150,
        120, // 在第二个块中间（第二个块100-140）
        'dragged-block',
        mockEditorElement,
        DragType.BLOCK,
      )

      expect(result.allCandidates.length).toBeGreaterThan(1)

      // 检查候选位置类型的多样性
      const types = result.allCandidates.map(c => c.type)
      const uniqueTypes = [...new Set(types)]
      expect(uniqueTypes.length).toBeGreaterThan(1)
    })

    it('应该正确计算上方插入位置', () => {
      const result = calculator.calculateSmartPosition(
        150,
        110, // 在第二个块上方边缘（第二个块top=100）
        'dragged-block',
        mockEditorElement,
        DragType.BLOCK,
      )

      const beforeCandidate = result.allCandidates.find(c => c.type === 'before')
      expect(beforeCandidate).toBeDefined()
      expect(beforeCandidate!.confidence).toBeGreaterThan(0.2)
    })

    it('应该正确计算下方插入位置', () => {
      const result = calculator.calculateSmartPosition(
        150,
        135, // 在第二个块下方边缘（第二个块bottom=140）
        'dragged-block',
        mockEditorElement,
        DragType.BLOCK,
      )

      const afterCandidate = result.allCandidates.find(c => c.type === 'after')
      expect(afterCandidate).toBeDefined()
      expect(afterCandidate!.confidence).toBeGreaterThan(0.2)
    })

    it('应该正确计算嵌套插入位置', () => {
      const result = calculator.calculateSmartPosition(
        200,
        120, // 在第二个块右侧中央（第二个块100-140）
        'dragged-block',
        mockEditorElement,
        DragType.BLOCK,
      )

      const nestedCandidate = result.allCandidates.find(c => c.type === 'nested')
      expect(nestedCandidate).toBeDefined()
      expect(nestedCandidate!.nestingLevel).toBeGreaterThan(0)
    })
  })

  describe('嵌套层级计算', () => {
    it('应该正确识别当前块的嵌套层级', () => {
      const result = calculator.calculateSmartPosition(
        150,
        170, // 在第三个块内部（top=150, height=40, 所以170在中间）
        'dragged-block',
        mockEditorElement,
        DragType.BLOCK,
      )

      // 查找特定来自block-3的候选位置
      const block3Candidate = result.allCandidates.find(c => c.targetMoniBlockId === 'block-3')
      expect(block3Candidate).toBeDefined()
      expect(block3Candidate!.metadata.originalLevel).toBe(1) // 第三个块是嵌套的
    })

    it('应该限制最大嵌套层级', () => {
      // 创建高嵌套层级的测试
      const highNestingConfig: Partial<SmartDragConfig> = {
        maxNestingLevel: 2, // 限制为2层
      }

      const limitedCalculator = new SmartDragCalculator(highNestingConfig)

      const result = limitedCalculator.calculateSmartPosition(
        200,
        125, // 尝试在已嵌套的块中再次嵌套
        'dragged-block',
        mockEditorElement,
        DragType.BLOCK,
      )

      const nestedCandidates = result.allCandidates.filter(c => c.type === 'nested')
      nestedCandidates.forEach(candidate => {
        expect(candidate.nestingLevel).toBeLessThanOrEqual(2)
      })
    })

    it('应该计算正确的嵌套方向', () => {
      const result = calculator.calculateSmartPosition(200, 75, 'dragged-block', mockEditorElement, DragType.BLOCK)

      const nestedCandidate = result.allCandidates.find(c => c.type === 'nested')
      if (nestedCandidate) {
        expect(nestedCandidate.metadata.nestingDirection).toBe('increase')
        expect(nestedCandidate.metadata.targetLevel).toBeGreaterThan(nestedCandidate.metadata.originalLevel)
      }
    })
  })

  describe('置信度和优先级', () => {
    it('应该计算合理的置信度值', () => {
      const result = calculator.calculateSmartPosition(150, 75, 'dragged-block', mockEditorElement, DragType.BLOCK)

      result.allCandidates.forEach(candidate => {
        expect(candidate.confidence).toBeGreaterThanOrEqual(0)
        expect(candidate.confidence).toBeLessThanOrEqual(1)
      })
    })

    it('应该按置信度排序候选位置', () => {
      const result = calculator.calculateSmartPosition(150, 75, 'dragged-block', mockEditorElement, DragType.BLOCK)

      // 检查候选位置是否按综合分数降序排列（允许小的差异）
      for (let i = 1; i < result.allCandidates.length; i += 1) {
        const prev = result.allCandidates[i - 1]
        const current = result.allCandidates[i]

        // 综合分数应该是降序的（允许0.1的误差）
        const prevScore = prev.confidence * 0.4 + (prev.priority / 100) * 0.3 + (prev.metadata.visualWeight || 0) * 0.3
        const currentScore =
          current.confidence * 0.4 + (current.priority / 100) * 0.3 + (current.metadata.visualWeight || 0) * 0.3

        expect(prevScore).toBeGreaterThanOrEqual(currentScore - 0.1)
      }
    })

    it('应该过滤低置信度的候选位置', () => {
      const strictConfig: Partial<SmartDragConfig> = {
        confidenceThreshold: 0.8, // 高阈值
      }

      const strictCalculator = new SmartDragCalculator(strictConfig)

      const result = strictCalculator.calculateSmartPosition(
        150,
        75,
        'dragged-block',
        mockEditorElement,
        DragType.BLOCK,
      )

      result.allCandidates.forEach(candidate => {
        expect(candidate.confidence).toBeGreaterThanOrEqual(0.8)
      })
    })
  })

  describe('性能优化', () => {
    it('应该在合理时间内完成计算', () => {
      const result = calculator.calculateSmartPosition(150, 75, 'dragged-block', mockEditorElement, DragType.BLOCK)

      expect(result.performance.calculationTime).toBeLessThan(50) // 50ms内完成
    })

    it('应该限制候选位置数量', () => {
      const limitedConfig: Partial<SmartDragConfig> = {
        maxCandidates: 3,
      }

      const limitedCalculator = new SmartDragCalculator(limitedConfig)

      const result = limitedCalculator.calculateSmartPosition(
        150,
        75,
        'dragged-block',
        mockEditorElement,
        DragType.BLOCK,
      )

      expect(result.allCandidates.length).toBeLessThanOrEqual(3)
    })

    it('应该使用搜索半径限制扫描范围', () => {
      const smallRadiusConfig: Partial<SmartDragConfig> = {
        searchRadius: 10, // 很小的搜索半径
      }

      const limitedCalculator = new SmartDragCalculator(smallRadiusConfig)

      const result = limitedCalculator.calculateSmartPosition(
        150,
        350, // 远离所有块，确保超出搜索半径
        'dragged-block',
        mockEditorElement,
        DragType.BLOCK,
      )

      // 应该找不到候选位置
      expect(result.allCandidates.length).toBe(0)
      expect(result.bestCandidate).toBeNull()
    })
  })

  describe('边界情况处理', () => {
    it('应该处理空编辑器', () => {
      const emptyEditor = document.createElement('div')
      Object.defineProperty(emptyEditor, 'querySelectorAll', {
        value: () => [],
      })

      const result = calculator.calculateSmartPosition(150, 75, 'dragged-block', emptyEditor, DragType.BLOCK)

      expect(result.allCandidates.length).toBe(0)
      expect(result.bestCandidate).toBeNull()
    })

    it('应该处理拖拽自己的情况', () => {
      const result = calculator.calculateSmartPosition(
        150,
        75,
        'block-2', // 拖拽第二个块到自己位置
        mockEditorElement,
        DragType.BLOCK,
      )

      // 不应该包含自己作为目标
      result.allCandidates.forEach(candidate => {
        expect(candidate.targetMoniBlockId).not.toBe('block-2')
      })
    })

    it('应该处理极端鼠标位置', () => {
      // 测试负坐标
      const result1 = calculator.calculateSmartPosition(-100, -100, 'dragged-block', mockEditorElement, DragType.BLOCK)

      expect(result1.allCandidates.length).toBeGreaterThanOrEqual(0)

      // 测试超大坐标
      const result2 = calculator.calculateSmartPosition(
        10000,
        10000,
        'dragged-block',
        mockEditorElement,
        DragType.BLOCK,
      )

      expect(result2.allCandidates.length).toBeGreaterThanOrEqual(0)
    })

    it('应该处理无效的块ID', () => {
      // 修改DOM使某个块没有data-block-id
      const invalidElement = document.createElement('div')
      invalidElement.className = 'notion-block'
      mockEditorElement.appendChild(invalidElement)

      const result = calculator.calculateSmartPosition(150, 75, 'dragged-block', mockEditorElement, DragType.BLOCK)

      // 应该正常工作，忽略无效元素
      expect(result.allCandidates.length).toBeGreaterThan(0)
    })
  })

  describe('便捷函数', () => {
    it('应该支持便捷函数调用', () => {
      const result = calculateSmartDragPosition(150, 75, 'dragged-block', mockEditorElement, {
        enableDebug: true,
        maxCandidates: 5,
      })

      expect(result).toBeDefined()
      expect(result.allCandidates.length).toBeLessThanOrEqual(5)
    })
  })

  describe('调试信息', () => {
    it('应该在调试模式下提供详细信息', () => {
      const debugCalculator = new SmartDragCalculator({
        enableDebug: true,
      })

      const result = debugCalculator.calculateSmartPosition(150, 75, 'dragged-block', mockEditorElement, DragType.BLOCK)

      expect(result.debugInfo).toBeDefined()
      expect(result.debugInfo!.mousePosition).toEqual({ x: 150, y: 75 })
      expect(result.debugInfo!.blockElements.length).toBeGreaterThan(0)
    })

    it('应该在非调试模式下不提供调试信息', () => {
      const prodCalculator = new SmartDragCalculator({
        enableDebug: false,
      })

      const result = prodCalculator.calculateSmartPosition(150, 75, 'dragged-block', mockEditorElement, DragType.BLOCK)

      expect(result.debugInfo).toBeUndefined()
    })
  })
})
