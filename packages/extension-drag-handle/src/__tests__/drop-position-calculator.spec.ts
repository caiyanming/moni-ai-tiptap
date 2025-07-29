/**
 * 🧮 DropPositionCalculator 单元测试
 * 测试拖拽位置计算的准确性，确保 Notion 级别的流畅体验
 */

import { afterEach, beforeEach, describe, expect, it } from '@jest/globals'

import { DropPositionCalculator } from '../drop-position-calculator.js'

function createMockDragEvent(clientX: number, clientY: number): DragEvent {
  return {
    clientX,
    clientY,
    preventDefault: () => {},
    stopPropagation: () => {},
    target: null,
    currentTarget: null,
    bubbles: true,
    cancelable: true,
    defaultPrevented: false,
    eventPhase: 0,
    isTrusted: true,
    timeStamp: Date.now(),
    type: 'dragover',
    composedPath: () => [],
    initEvent: () => {},
    stopImmediatePropagation: () => {},
    NONE: 0,
    CAPTURING_PHASE: 1,
    AT_TARGET: 2,
    BUBBLING_PHASE: 3,
  } as DragEvent
}

describe('DropPositionCalculator', () => {
  let mockElement: HTMLElement
  let mockDragEvent: DragEvent

  beforeEach(() => {
    // 创建模拟的目标元素
    mockElement = document.createElement('div')
    mockElement.style.width = '400px'
    mockElement.style.height = '100px'
    mockElement.style.position = 'absolute'
    mockElement.style.top = '100px'
    mockElement.style.left = '50px'
    document.body.appendChild(mockElement)

    // Mock getBoundingClientRect
    mockElement.getBoundingClientRect = () => ({
      x: 50,
      y: 100,
      width: 400,
      height: 100,
      top: 100,
      bottom: 200,
      left: 50,
      right: 450,
      toJSON: () => {},
    })
  })

  afterEach(() => {
    if (mockElement.parentNode) {
      mockElement.parentNode.removeChild(mockElement)
    }
  })

  describe('AppFlowy 风格水平位置计算', () => {
    it('应该在88px左边界内检测到 "left" 水平位置', () => {
      // 测试左边界 (50px left + 40px 距离 < 88px 边界)
      mockDragEvent = createMockDragEvent(80, 150) // x=80 < left(50) + 88

      const result = DropPositionCalculator.calculate(mockDragEvent, mockElement)

      expect(result.horizontalPosition).toBe('left')
      expect(result.confidence).toBeGreaterThan(0.8) // 左边界置信度
    })

    it('应该在80%右边界外检测到 "right" 水平位置', () => {
      // 测试右边界 (x > left + width * 0.8 = 50 + 400 * 0.8 = 370)
      mockDragEvent = createMockDragEvent(400, 150) // x=400 > 370

      const result = DropPositionCalculator.calculate(mockDragEvent, mockElement)

      expect(result.horizontalPosition).toBe('right')
      expect(result.confidence).toBeGreaterThan(0.7) // 右边界置信度
    })

    it('应该在中心区域检测到 "center" 水平位置', () => {
      // 测试中心区域 (88px < x < 80%)
      mockDragEvent = createMockDragEvent(250, 150) // x=250 在 138-370 范围内

      const result = DropPositionCalculator.calculate(mockDragEvent, mockElement)

      expect(result.horizontalPosition).toBe('center')
      expect(result.confidence).toBeGreaterThan(0.8) // 中心区域语义清晰
    })
  })

  describe('基础位置计算', () => {
    it('应该在元素上方25%区域内检测到 "above" 位置', () => {
      // 在元素上方20%的位置（应该检测为above）
      mockDragEvent = createMockDragEvent(250, 120) // y=120 在 100-125 区间内

      const result = DropPositionCalculator.calculate(mockDragEvent, mockElement)

      expect(result.dropPosition).toBe('above')
      expect(result.horizontalPosition).toBe('center') // AppFlowy 风格语义化位置
      expect(result.direction).toBe('horizontal')
      expect(result.confidence).toBeGreaterThan(0.8) // 置信度检验
      expect(result.indicatorPosition).toEqual({
        x: 50,
        y: 98, // top - 2
        width: 400,
      })
    })

    it('应该在元素下方25%区域内检测到 "below" 位置', () => {
      // 在元素下方20%的位置（应该检测为below）
      mockDragEvent = createMockDragEvent(250, 180) // y=180 在 175-200 区间内

      const result = DropPositionCalculator.calculate(mockDragEvent, mockElement)

      expect(result.dropPosition).toBe('below')
      expect(result.direction).toBe('horizontal')
      expect(result.indicatorPosition).toEqual({
        x: 50,
        y: 199, // bottom - 1
        width: 400,
      })
    })

    it('应该在元素中间区域检测到 "inside" 位置', () => {
      // 在元素中间位置
      mockDragEvent = createMockDragEvent(250, 150) // y=150 在中间区域

      const result = DropPositionCalculator.calculate(mockDragEvent, mockElement)

      expect(result.dropPosition).toBe('inside')
      expect(result.direction).toBe('horizontal')
      expect(result.indicatorPosition).toEqual({
        x: 50,
        y: 150, // top + height/2
        width: 400,
      })
    })
  })

  describe('嵌套检测逻辑', () => {
    beforeEach(() => {
      // 设置元素为可嵌套
      mockElement.setAttribute('data-moni-nestable', 'true')
    })

    it('应该在中心区域检测到垂直嵌套指示器', () => {
      // 在中心区域位置（AppFlowy 风格，center 区域支持嵌套）
      mockDragEvent = createMockDragEvent(250, 150) // x=250, 在 center 区域

      const result = DropPositionCalculator.calculate(mockDragEvent, mockElement)

      expect(result.dropPosition).toBe('inside')
      expect(result.horizontalPosition).toBe('center')
      expect(result.direction).toBe('vertical')
      expect(result.indicatorPosition).toEqual({
        x: 48, // left - 2
        y: 100,
        height: 100,
      })
    })

    it('应该在左侧边界使用正常的水平指示器', () => {
      // 在左侧边界位置（AppFlowy 风格，left 区域不支持嵌套）
      mockDragEvent = createMockDragEvent(80, 120) // x=80, 在 left 区域

      const result = DropPositionCalculator.calculate(mockDragEvent, mockElement)

      expect(result.dropPosition).toBe('above')
      expect(result.horizontalPosition).toBe('left')
      expect(result.direction).toBe('horizontal')
      expect(result.indicatorPosition.width).toBe(88) // AppFlowy 风格左边界指示器
    })

    it('应该忽略非嵌套元素的左侧区域检测', () => {
      // 移除嵌套属性
      mockElement.removeAttribute('data-moni-nestable')

      // 在左侧30px位置
      mockDragEvent = createMockDragEvent(80, 120)

      const result = DropPositionCalculator.calculate(mockDragEvent, mockElement)

      // 应该按照正常的上/下区域逻辑
      expect(result.dropPosition).toBe('above')
      expect(result.direction).toBe('horizontal')
    })
  })

  describe('边界情况和精度测试', () => {
    it('应该精确处理25%阈值边界', () => {
      // 测试精确的25%边界
      const threshold25 = 100 + 100 * 0.25 // y=125
      mockDragEvent = createMockDragEvent(250, threshold25)

      const result = DropPositionCalculator.calculate(mockDragEvent, mockElement)

      // 在阈值上应该检测为 inside
      expect(result.dropPosition).toBe('inside')
    })

    it('应该精确处理75%阈值边界', () => {
      // 测试精确的75%边界
      const threshold75 = 200 - 100 * 0.25 // y=175
      mockDragEvent = createMockDragEvent(250, threshold75)

      const result = DropPositionCalculator.calculate(mockDragEvent, mockElement)

      // 在阈值上应该检测为 inside
      expect(result.dropPosition).toBe('inside')
    })

    it('应该处理极小元素（高度<20px）', () => {
      // 创建极小元素
      mockElement.getBoundingClientRect = () => ({
        x: 50,
        y: 100,
        width: 400,
        height: 10, // 极小高度
        top: 100,
        bottom: 110,
        left: 50,
        right: 450,
        toJSON: () => {},
      })

      // 在元素上方
      mockDragEvent = createMockDragEvent(250, 102) // 25% = 2.5px, 仍在上方区域

      const result = DropPositionCalculator.calculate(mockDragEvent, mockElement)

      expect(result.dropPosition).toBe('above')
      expect(result.indicatorPosition.y).toBe(98) // top - 2
    })

    it('应该处理超大元素', () => {
      // 创建超大元素
      mockElement.getBoundingClientRect = () => ({
        x: 50,
        y: 100,
        width: 1200,
        height: 800,
        top: 100,
        bottom: 900,
        left: 50,
        right: 1250,
        toJSON: () => {},
      })

      // 在25%区域内 (100 + 800*0.25 = 300)
      mockDragEvent = createMockDragEvent(250, 250)

      const result = DropPositionCalculator.calculate(mockDragEvent, mockElement)

      expect(result.dropPosition).toBe('above')
      expect(result.indicatorPosition.width).toBe(1200)
    })

    it('应该处理40px嵌套区域的精确边界', () => {
      mockElement.setAttribute('data-moni-nestable', 'true')

      // 测试精确的40px边界
      mockDragEvent = createMockDragEvent(90, 150) // x=90, 距离左边缘刚好40px

      const result = DropPositionCalculator.calculate(mockDragEvent, mockElement)

      // 在40px边界上应该不触发嵌套
      expect(result.direction).toBe('horizontal')
    })
  })

  describe('指示器位置精度测试', () => {
    it('应该计算正确的水平指示器位置', () => {
      mockDragEvent = createMockDragEvent(250, 120)

      const result = DropPositionCalculator.calculate(mockDragEvent, mockElement)

      expect(result.indicatorPosition).toEqual({
        x: 50, // 与元素左边缘对齐
        y: 98, // top - 2px 偏移
        width: 400, // 与元素宽度一致
      })
    })

    it('应该计算正确的垂直指示器位置', () => {
      mockElement.setAttribute('data-moni-nestable', 'true')
      mockDragEvent = createMockDragEvent(250, 150) // 使用中心区域位置支持嵌套

      const result = DropPositionCalculator.calculate(mockDragEvent, mockElement)

      expect(result.indicatorPosition).toEqual({
        x: 48, // left - 2px 偏移
        y: 100, // 与元素顶部对齐
        height: 100, // 与元素高度一致
      })
    })

    it('应该为 inside 位置计算中心线位置', () => {
      mockDragEvent = createMockDragEvent(250, 150)

      const result = DropPositionCalculator.calculate(mockDragEvent, mockElement)

      expect(result.indicatorPosition).toEqual({
        x: 50,
        y: 150, // top + height/2
        width: 400,
      })
    })
  })

  describe('实际拖拽场景模拟', () => {
    it('应该模拟从列表项拖拽到段落上方的流畅过渡', () => {
      // 模拟真实的鼠标移动轨迹
      const positions = [
        { x: 250, y: 110 }, // 刚进入元素上方区域
        { x: 250, y: 115 }, // 在上方区域内移动
        { x: 250, y: 120 }, // 接近25%边界
        { x: 250, y: 130 }, // 进入中间区域
      ]

      const results = positions.map(pos => {
        const event = createMockDragEvent(pos.x, pos.y)
        return DropPositionCalculator.calculate(event, mockElement)
      })

      // 验证过渡的一致性
      expect(results[0].dropPosition).toBe('above')
      expect(results[1].dropPosition).toBe('above')
      expect(results[2].dropPosition).toBe('above')
      expect(results[3].dropPosition).toBe('inside')

      // 验证指示器位置的连续性
      expect(results[0].indicatorPosition.y).toBe(98)
      expect(results[1].indicatorPosition.y).toBe(98)
      expect(results[2].indicatorPosition.y).toBe(98)
    })

    it('应该模拟嵌套操作的精确检测', () => {
      mockElement.setAttribute('data-moni-nestable', 'true')

      // 模拟 AppFlowy 风格：从右侧边界到中心嵌套区域
      const positions = [
        { x: 400, y: 150 }, // 右侧边界区域 - 不支持嵌套
        { x: 300, y: 150 }, // 中心区域边缘 - 支持嵌套
        { x: 250, y: 150 }, // 中心区域 - 支持嵌套
        { x: 200, y: 150 }, // 中心区域 - 支持嵌套
        { x: 100, y: 150 }, // 左侧边界 - 不支持嵌套
      ]

      const results = positions.map(pos => {
        const event = createMockDragEvent(pos.x, pos.y)
        return DropPositionCalculator.calculate(event, mockElement)
      })

      // 验证 AppFlowy 风格嵌套检测
      expect(results[0].direction).toBe('horizontal') // 右侧边界，不嵌套
      expect(results[1].direction).toBe('vertical') // 中心区域，支持嵌套
      expect(results[2].direction).toBe('vertical') // 中心区域，支持嵌套
      expect(results[3].direction).toBe('vertical') // 中心区域，支持嵌套
      expect(results[4].direction).toBe('horizontal') // 左侧边界，不嵌套
    })
  })
})
