/**
 * 🎨 现代化拖拽指示器系统 - 修复内存泄漏的核心重构
 */

import type { EditorView } from '@tiptap/pm/view'

import {
  type DropPosition,
  type IndicatorDirection,
  type IndicatorPosition,
  DropPositionCalculator,
} from './drop-position-calculator.js'

export interface IndicatorTheme {
  color: string
  thickness: number
  borderRadius: number
  shadow: string
  opacity: number
}

export interface IndicatorConfig {
  theme: IndicatorTheme
  animation: {
    duration: number
    easing: string
  }
  debug: boolean
}

export const DEFAULT_THEMES = {
  notion: {
    color: '#3b82f6',
    thickness: 3,
    borderRadius: 2,
    shadow: '0 0 8px rgba(59, 130, 246, 0.4)',
    opacity: 0.9,
  },
} as const

export const DEFAULT_CONFIG: IndicatorConfig = {
  theme: DEFAULT_THEMES.notion,
  animation: {
    duration: 200,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  debug: false,
}

/**
 * 现代化拖拽指示器 - 修复内存泄漏问题
 */
export class ModernDragIndicator {
  private horizontal: HTMLElement | null = null
  private vertical: HTMLElement | null = null
  private container: HTMLElement
  private isVisible = false
  private animationFrameId: number | null = null

  constructor(
    private view: EditorView,
    private config: IndicatorConfig = DEFAULT_CONFIG,
  ) {
    if (typeof window === 'undefined') {
      throw new Error('ModernDragIndicator: window is not available')
    }

    if (!this.view.dom.isConnected) {
      throw new Error('ModernDragIndicator: EditorView DOM is not connected')
    }

    this.container = this.findContainer()
    this.createIndicators()
  }

  show(params: {
    direction: IndicatorDirection
    position: IndicatorPosition
    dropPosition: DropPosition
    horizontalPosition?: 'left' | 'center' | 'right'
    confidence?: number
  }): void {
    const { direction, position, horizontalPosition = 'center', confidence = 1.0 } = params
    const indicator = this.getIndicator(direction)

    this.updateIndicatorPosition(indicator, direction, position, horizontalPosition)
    this.applyConfidenceVisuals(indicator, confidence)
    this.showIndicator(indicator)
    this.isVisible = true
  }

  hide(): void {
    if (!this.isVisible) {
      return
    }

    this.hideIndicator(this.horizontal)
    this.hideIndicator(this.vertical)
    this.isVisible = false
  }

  destroy(): void {
    // 修复内存泄漏: 取消待处理的动画帧
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }

    this.hide()
    this.removeIndicator(this.horizontal)
    this.removeIndicator(this.vertical)

    // 显式清空引用，帮助GC
    this.horizontal = null
    this.vertical = null
    this.isVisible = false
  }

  private findContainer(): HTMLElement {
    const container = this.view.dom.parentElement
    if (!container) {
      throw new Error('ModernDragIndicator: Cannot find container element')
    }
    return container
  }

  private createIndicators(): void {
    this.horizontal = this.createIndicator('horizontal')
    this.vertical = this.createIndicator('vertical')

    this.container.appendChild(this.horizontal)
    this.container.appendChild(this.vertical)
  }

  private createIndicator(direction: IndicatorDirection): HTMLElement {
    const indicator = document.createElement('div')
    indicator.className = `moni-drag-indicator moni-drag-indicator--${direction}`
    indicator.dataset.direction = direction
    this.applyThemeStyles(indicator, direction)
    indicator.style.display = 'none'
    return indicator
  }

  private applyThemeStyles(indicator: HTMLElement, direction: IndicatorDirection): void {
    const { theme, animation } = this.config
    const isHorizontal = direction === 'horizontal'

    Object.assign(indicator.style, {
      position: 'absolute',
      backgroundColor: theme.color,
      borderRadius: `${theme.borderRadius}px`,
      boxShadow: theme.shadow,
      opacity: theme.opacity.toString(),
      pointerEvents: 'none',
      zIndex: '9999',
      transition: `all ${animation.duration}ms ${animation.easing}`,
      ...(isHorizontal
        ? {
            height: `${theme.thickness}px`,
            minWidth: '20px',
          }
        : {
            width: `${theme.thickness}px`,
            minHeight: '20px',
          }),
    })
  }

  private getIndicator(direction: IndicatorDirection): HTMLElement {
    const indicator = direction === 'horizontal' ? this.horizontal : this.vertical
    if (!indicator) {
      throw new Error(`ModernDragIndicator: ${direction} indicator not found`)
    }
    return indicator
  }

  private updateIndicatorPosition(
    indicator: HTMLElement,
    direction: IndicatorDirection,
    position: IndicatorPosition,
    horizontalPosition: 'left' | 'center' | 'right' = 'center',
  ): void {
    const isHorizontal = direction === 'horizontal'

    indicator.style.left = `${position.x}px`
    indicator.style.top = `${position.y}px`

    if (isHorizontal && position.width) {
      indicator.style.width = `${position.width}px`
    }
    if (!isHorizontal && position.height) {
      indicator.style.height = `${position.height}px`
    }

    // AppFlowy 风格语义化样式
    this.applySemanticStyles(indicator, direction, horizontalPosition)
  }

  /**
   * 应用基于语义位置的样式
   */
  private applySemanticStyles(
    indicator: HTMLElement,
    direction: IndicatorDirection,
    horizontalPosition: 'left' | 'center' | 'right',
  ): void {
    indicator.className = `moni-drag-indicator moni-drag-indicator--${direction} moni-drag-indicator--${horizontalPosition}`

    // 根据语义位置调整视觉效果
    switch (horizontalPosition) {
      case 'left':
        // 左侧插入 - 断开线条样式 (AppFlowy 风格)
        indicator.style.borderLeft = '2px solid transparent'
        break
      case 'right':
        // 右侧插入 - 分栏预览样式
        indicator.style.borderRight = '2px solid transparent'
        break
      case 'center':
      default:
        // 中心插入 - 完整线条样式
        indicator.style.border = 'none'
        break
    }
  }

  /**
   * 根据算法置信度调整视觉反馈
   */
  private applyConfidenceVisuals(indicator: HTMLElement, confidence: number): void {
    const opacity = Math.max(0.5, Math.min(1.0, confidence))
    indicator.style.opacity = opacity.toString()

    // 高置信度增强视觉效果
    if (confidence > 0.9) {
      indicator.style.boxShadow = `0 0 12px rgba(59, 130, 246, ${confidence * 0.6})`
    } else {
      indicator.style.boxShadow = this.config.theme.shadow
    }
  }

  private showIndicator(indicator: HTMLElement): void {
    indicator.style.display = 'block'

    // 核心修复: 取消之前的动画帧，防止内存泄漏
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
    }

    this.animationFrameId = requestAnimationFrame(() => {
      indicator.style.opacity = this.config.theme.opacity.toString()
      indicator.style.transform = 'scale(1)'
      this.animationFrameId = null
    })
  }

  private hideIndicator(indicator: HTMLElement | null): void {
    if (!indicator) {
      return
    }
    indicator.style.display = 'none'
    indicator.style.transform = 'scale(0.8)'
  }

  private removeIndicator(indicator: HTMLElement | null): void {
    if (!indicator) {
      return
    }

    try {
      indicator.style.display = 'none'
      indicator.remove()
    } catch {
      if (indicator.parentElement) {
        indicator.parentElement.removeChild(indicator)
      }
    }
  }
}

export function createDragIndicator(
  view: EditorView,
  theme: keyof typeof DEFAULT_THEMES = 'notion',
  debug = false,
): ModernDragIndicator {
  const config: IndicatorConfig = {
    theme: DEFAULT_THEMES[theme],
    animation: DEFAULT_CONFIG.animation,
    debug,
  }

  return new ModernDragIndicator(view, config)
}

// Export DropPositionCalculator for convenience
export { DropPositionCalculator }
