/**
 * 🧮 拖放位置计算器 - 独立的拖放位置计算逻辑
 */

export type DropPosition = 'above' | 'below' | 'inside'
export type IndicatorDirection = 'horizontal' | 'vertical'

export interface IndicatorPosition {
  x: number
  y: number
  width?: number
  height?: number
}

export class DropPositionCalculator {
  static calculate(
    event: DragEvent,
    targetElement: HTMLElement,
  ): {
    dropPosition: DropPosition
    indicatorPosition: IndicatorPosition
    direction: IndicatorDirection
  } {
    const rect = targetElement.getBoundingClientRect()
    const { clientX: x, clientY: y } = event

    const isNestable = targetElement.hasAttribute('data-moni-nestable')
    const isInNestZone = x < rect.left + 40

    if (isNestable && isInNestZone) {
      return {
        dropPosition: 'inside',
        direction: 'vertical',
        indicatorPosition: {
          x: rect.left - 2,
          y: rect.top,
          height: rect.height,
        },
      }
    }

    const topThreshold = rect.top + rect.height * 0.25
    const bottomThreshold = rect.bottom - rect.height * 0.25

    if (y < topThreshold) {
      return {
        dropPosition: 'above',
        direction: 'horizontal',
        indicatorPosition: {
          x: rect.left,
          y: rect.top - 2,
          width: rect.width,
        },
      }
    }

    if (y > bottomThreshold) {
      return {
        dropPosition: 'below',
        direction: 'horizontal',
        indicatorPosition: {
          x: rect.left,
          y: rect.bottom - 1,
          width: rect.width,
        },
      }
    }

    return {
      dropPosition: 'inside',
      direction: 'horizontal',
      indicatorPosition: {
        x: rect.left,
        y: rect.top + rect.height / 2,
        width: rect.width,
      },
    }
  }
}
