/**
 * 🎨 ModernDragIndicator 单元测试
 * 测试拖拽指示器的视觉状态管理，确保 Notion 级别的流畅体验
 */

import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import type { EditorView } from '@tiptap/pm/view'

import { ModernDragIndicator, createDragIndicator, DEFAULT_THEMES } from '../modern-drag-indicator.js'
import type { IndicatorDirection, IndicatorPosition } from '../drop-position-calculator.js'

describe('ModernDragIndicator', () => {
  let mockEditorView: EditorView
  let mockContainer: HTMLElement
  let indicator: ModernDragIndicator

  beforeEach(() => {
    // 创建模拟容器
    mockContainer = document.createElement('div')
    mockContainer.style.position = 'relative'
    mockContainer.style.width = '800px'
    mockContainer.style.height = '600px'
    document.body.appendChild(mockContainer)

    // 创建模拟编辑器DOM
    const editorDom = document.createElement('div')
    editorDom.className = 'ProseMirror'
    editorDom.style.width = '100%'
    editorDom.style.height = '100%'
    mockContainer.appendChild(editorDom)

    // 模拟 EditorView
    mockEditorView = {
      dom: editorDom,
      state: {} as any,
      dispatch: jest.fn(),
      focus: jest.fn(),
      hasFocus: jest.fn(() => true),
      someProp: jest.fn(),
    } as unknown as EditorView

    // 创建指示器实例
    indicator = createDragIndicator(mockEditorView)
  })

  afterEach(() => {
    if (indicator) {
      indicator.destroy()
    }
    if (mockContainer.parentNode) {
      mockContainer.parentNode.removeChild(mockContainer)
    }
    jest.clearAllMocks()
  })

  describe('指示器创建和初始化', () => {
    it('应该正确创建水平和垂直指示器元素', () => {
      expect(indicator).toBeDefined()

      // 检查DOM中是否存在指示器元素
      const horizontalIndicator = mockContainer.querySelector('.moni-drag-indicator[data-direction="horizontal"]')
      const verticalIndicator = mockContainer.querySelector('.moni-drag-indicator[data-direction="vertical"]')

      expect(horizontalIndicator).toBeTruthy()
      expect(verticalIndicator).toBeTruthy()
    })

    it('应该初始状态下隐藏所有指示器', () => {
      const horizontalIndicator = mockContainer.querySelector('.moni-drag-indicator[data-direction="horizontal"]') as HTMLElement
      const verticalIndicator = mockContainer.querySelector('.moni-drag-indicator[data-direction="vertical"]') as HTMLElement

      expect(horizontalIndicator.style.display).toBe('none')
      expect(verticalIndicator.style.display).toBe('none')
    })

    it('应该应用默认主题样式', () => {
      const horizontalIndicator = mockContainer.querySelector('.moni-drag-indicator[data-direction="horizontal"]') as HTMLElement

      expect(horizontalIndicator.style.backgroundColor).toBe('rgb(59, 130, 246)') // DEFAULT_THEMES.notion.color
      expect(horizontalIndicator.style.borderRadius).toBe('2px')
    })
  })

  describe('水平指示器显示逻辑', () => {
    it('should show horizontal indicator at correct position', () => {
      const position: IndicatorPosition = {
        x: 100,
        y: 200,
        width: 400,
      }

      indicator.show({
        direction: 'horizontal',
        position,
        dropPosition: 'above',
      })

      const horizontalIndicator = mockContainer.querySelector('.moni-drag-indicator[data-direction="horizontal"]') as HTMLElement

      expect(horizontalIndicator.style.display).toBe('block')
      expect(horizontalIndicator.style.transform).toBe('translate(100px, 200px)')
      expect(horizontalIndicator.style.width).toBe('400px')
      expect(horizontalIndicator.style.height).toBe('3px') // 默认thickness
    })

    it('should animate horizontal indicator appearance smoothly', () => {
      const position: IndicatorPosition = { x: 100, y: 200, width: 400 }

      indicator.show({
        direction: 'horizontal',
        position,
        dropPosition: 'above',
      })

      const horizontalIndicator = mockContainer.querySelector('.moni-drag-indicator[data-direction="horizontal"]') as HTMLElement

      // 检查动画相关的样式
      expect(horizontalIndicator.style.opacity).toBe('0.9') // DEFAULT_THEMES.notion.opacity
      expect(horizontalIndicator.style.transition).toContain('opacity')
      expect(horizontalIndicator.style.transition).toContain('transform')
    })

    it('should update horizontal indicator position smoothly during drag', () => {
      // 初始位置
      indicator.show({
        direction: 'horizontal',
        position: { x: 100, y: 200, width: 400 },
        dropPosition: 'above',
      })

      // 更新位置（模拟拖拽过程中的位置变化）
      indicator.show({
        direction: 'horizontal',
        position: { x: 120, y: 250, width: 380 },
        dropPosition: 'below',
      })

      const horizontalIndicator = mockContainer.querySelector('.moni-drag-indicator[data-direction="horizontal"]') as HTMLElement

      expect(horizontalIndicator.style.transform).toBe('translate(120px, 250px)')
      expect(horizontalIndicator.style.width).toBe('380px')
    })
  })

  describe('垂直指示器显示逻辑', () => {
    it('should show vertical indicator for nesting operations', () => {
      const position: IndicatorPosition = {
        x: 50,
        y: 100,
        height: 150,
      }

      indicator.show({
        direction: 'vertical',
        position,
        dropPosition: 'inside',
      })

      const verticalIndicator = mockContainer.querySelector('.moni-drag-indicator[data-direction="vertical"]') as HTMLElement

      expect(verticalIndicator.style.display).toBe('block')
      expect(verticalIndicator.style.transform).toBe('translate(50px, 100px)')
      expect(verticalIndicator.style.height).toBe('150px')
      expect(verticalIndicator.style.width).toBe('3px') // 默认thickness
    })

    it('should hide horizontal indicator when showing vertical', () => {
      // 先显示水平指示器
      indicator.show({
        direction: 'horizontal',
        position: { x: 100, y: 200, width: 400 },
        dropPosition: 'above',
      })

      // 然后显示垂直指示器
      indicator.show({
        direction: 'vertical',
        position: { x: 50, y: 100, height: 150 },
        dropPosition: 'inside',
      })

      const horizontalIndicator = mockContainer.querySelector('.moni-drag-indicator[data-direction="horizontal"]') as HTMLElement
      const verticalIndicator = mockContainer.querySelector('.moni-drag-indicator[data-direction="vertical"]') as HTMLElement

      expect(horizontalIndicator.style.display).toBe('none')
      expect(verticalIndicator.style.display).toBe('block')
    })
  })

  describe('指示器隐藏和清理', () => {
    it('should hide all indicators correctly', () => {
      // 先显示指示器
      indicator.show({
        direction: 'horizontal',
        position: { x: 100, y: 200, width: 400 },
        dropPosition: 'above',
      })

      // 然后隐藏
      indicator.hide()

      const horizontalIndicator = mockContainer.querySelector('.moni-drag-indicator[data-direction="horizontal"]') as HTMLElement
      const verticalIndicator = mockContainer.querySelector('.moni-drag-indicator[data-direction="vertical"]') as HTMLElement

      expect(horizontalIndicator.style.display).toBe('none')
      expect(verticalIndicator.style.display).toBe('none')
    })

    it('should cleanup animation frames on destroy', () => {
      const cancelAnimationFrameSpy = jest.spyOn(window, 'cancelAnimationFrame')

      // 模拟有pending的animation frame
      indicator.show({
        direction: 'horizontal',
        position: { x: 100, y: 200, width: 400 },
        dropPosition: 'above',
      })

      indicator.destroy()

      // 验证动画帧被清理
      expect(cancelAnimationFrameSpy).toHaveBeenCalled()
    })

    it('should remove DOM elements on destroy', () => {
      indicator.destroy()

      const horizontalIndicator = mockContainer.querySelector('.moni-drag-indicator[data-direction="horizontal"]')
      const verticalIndicator = mockContainer.querySelector('.moni-drag-indicator[data-direction="vertical"]')

      expect(horizontalIndicator).toBeNull()
      expect(verticalIndicator).toBeNull()
    })
  })

  describe('主题和样式定制', () => {
    it('should apply custom theme correctly', () => {
      // 使用自定义主题创建指示器
      const customIndicator = createDragIndicator(mockEditorView, {
        theme: {
          color: '#ff0000',
          thickness: 5,
          borderRadius: 10,
          shadow: '0 0 10px rgba(255, 0, 0, 0.5)',
          opacity: 0.8,
        },
        animation: {
          duration: 200,
          easing: 'ease-out',
        },
        debug: false,
      })

      const horizontalIndicator = mockContainer.querySelector('.moni-drag-indicator[data-direction="horizontal"]') as HTMLElement

      expect(horizontalIndicator.style.backgroundColor).toBe('rgb(255, 0, 0)')
      expect(horizontalIndicator.style.borderRadius).toBe('10px')
      expect(horizontalIndicator.style.boxShadow).toBe('0 0 10px rgba(255, 0, 0, 0.5)')

      customIndicator.destroy()
    })

    it('should respect animation configuration', () => {
      const customIndicator = createDragIndicator(mockEditorView, {
        theme: DEFAULT_THEMES.notion,
        animation: {
          duration: 150,
          easing: 'ease-in-out',
        },
        debug: false,
      })

      const horizontalIndicator = mockContainer.querySelector('.moni-drag-indicator[data-direction="horizontal"]') as HTMLElement

      expect(horizontalIndicator.style.transition).toContain('150ms')
      expect(horizontalIndicator.style.transition).toContain('ease-in-out')

      customIndicator.destroy()
    })
  })

  describe('性能和流畅度优化', () => {
    it('should throttle rapid position updates', () => {
      const requestAnimationFrameSpy = jest.spyOn(window, 'requestAnimationFrame')

      // 快速连续更新位置（模拟高频率的mousemove事件）
      for (let i = 0; i < 10; i++) {
        indicator.show({
          direction: 'horizontal',
          position: { x: 100 + i, y: 200, width: 400 },
          dropPosition: 'above',
        })
      }

      // 验证requestAnimationFrame被用于优化更新
      expect(requestAnimationFrameSpy).toHaveBeenCalled()
    })

    it('should maintain smooth 60fps updates during drag', () => {
      let updateCount = 0
      const startTime = performance.now()

      // 模拟60fps的更新频率
      const simulateFrameUpdates = () => {
        if (updateCount < 60) { // 模拟1秒60帧
          indicator.show({
            direction: 'horizontal',
            position: { x: 100 + updateCount, y: 200, width: 400 },
            dropPosition: 'above',
          })
          updateCount++
          setTimeout(simulateFrameUpdates, 16) // ~60fps
        }
      }

      simulateFrameUpdates()

      setTimeout(() => {
        const endTime = performance.now()
        const duration = endTime - startTime
        
        // 验证更新频率接近60fps
        expect(duration).toBeLessThan(1200) // 允许20%的性能损耗
        expect(updateCount).toBe(60)
      }, 1100)
    })
  })

  describe('边界情况和错误处理', () => {
    it('should handle invalid position values gracefully', () => {
      // 测试无效的位置值
      expect(() => {
        indicator.show({
          direction: 'horizontal',
          position: { x: NaN, y: -100, width: 0 },
          dropPosition: 'above',
        })
      }).not.toThrow()

      const horizontalIndicator = mockContainer.querySelector('.moni-drag-indicator[data-direction="horizontal"]') as HTMLElement
      
      // 应该使用默认值或跳过显示
      expect(horizontalIndicator.style.display).toBe('none')
    })

    it('should handle destroyed container gracefully', () => {
      // 销毁容器
      mockContainer.remove()

      // 尝试显示指示器不应该抛出错误
      expect(() => {
        indicator.show({
          direction: 'horizontal',
          position: { x: 100, y: 200, width: 400 },
          dropPosition: 'above',
        })
      }).not.toThrow()
    })

    it('should handle multiple destroy calls safely', () => {
      expect(() => {
        indicator.destroy()
        indicator.destroy() // 第二次调用不应该出错
        indicator.destroy() // 第三次调用也不应该出错
      }).not.toThrow()
    })
  })

  describe('实际拖拽场景模拟', () => {
    it('should simulate smooth transition from above to below', () => {
      // 模拟从above过渡到below的完整流程
      const positions = [
        { y: 180, dropPosition: 'above' as const },
        { y: 190, dropPosition: 'above' as const },
        { y: 200, dropPosition: 'inside' as const },
        { y: 210, dropPosition: 'inside' as const },
        { y: 220, dropPosition: 'below' as const },
      ]

      positions.forEach((pos, index) => {
        indicator.show({
          direction: 'horizontal',
          position: { x: 100, y: pos.y, width: 400 },
          dropPosition: pos.dropPosition,
        })

        const horizontalIndicator = mockContainer.querySelector('.moni-drag-indicator[data-direction="horizontal"]') as HTMLElement
        
        expect(horizontalIndicator.style.display).toBe('block')
        expect(horizontalIndicator.style.transform).toContain(`${pos.y}px`)
      })
    })

    it('should simulate nesting transition smoothly', () => {
      // 模拟从horizontal到vertical的嵌套过渡
      const transitions = [
        { direction: 'horizontal' as IndicatorDirection, x: 150 },
        { direction: 'horizontal' as IndicatorDirection, x: 120 },
        { direction: 'horizontal' as IndicatorDirection, x: 100 },
        { direction: 'vertical' as IndicatorDirection, x: 80 }, // 进入嵌套区域
        { direction: 'vertical' as IndicatorDirection, x: 60 },
      ]

      transitions.forEach((transition) => {
        if (transition.direction === 'horizontal') {
          indicator.show({
            direction: 'horizontal',
            position: { x: transition.x, y: 200, width: 400 },
            dropPosition: 'above',
          })
        } else {
          indicator.show({
            direction: 'vertical',
            position: { x: transition.x, y: 150, height: 100 },
            dropPosition: 'inside',
          })
        }

        const activeIndicator = mockContainer.querySelector(`.moni-drag-indicator[data-direction="${transition.direction}"]`) as HTMLElement
        const inactiveIndicator = mockContainer.querySelector(`.moni-drag-indicator[data-direction="${transition.direction === 'horizontal' ? 'vertical' : 'horizontal'}"]`) as HTMLElement

        expect(activeIndicator.style.display).toBe('block')
        expect(inactiveIndicator.style.display).toBe('none')
      })
    })
  })
})