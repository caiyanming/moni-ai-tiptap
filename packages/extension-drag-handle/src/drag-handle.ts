import type { ComputePositionConfig } from '@floating-ui/dom'
import { offset } from '@floating-ui/dom'
import { type Editor, Extension } from '@tiptap/core'
import type { Node } from '@tiptap/pm/model'

import { DragHandlePlugin } from './drag-handle-plugin.js'

export const defaultComputePositionConfig: ComputePositionConfig = {
  placement: 'left', // 使用'left'而非'left-start'来实现垂直居中对齐
  strategy: 'absolute',
  middleware: [
    offset(-4), // 从原倵10减少14，让手柄容器往右移动14px
  ],
}

export interface DropInfo {
  position: 'above' | 'below' | 'inside'
  targetElement: HTMLElement
  targetNode?: Node
  horizontalPosition?: 'left' | 'center' | 'right' // AppFlowy 风格语义化位置
  confidence?: number // 算法置信度 (0-1)
}

export interface DragIndicatorStyles {
  horizontal?: Partial<CSSStyleDeclaration>
  vertical?: Partial<CSSStyleDeclaration>
}

export interface DragHandleOptions {
  /**
   * Renders an element that is positioned with the floating-ui/dom package
   */
  render(): HTMLElement
  /**
   * Configuration for position computation of the drag handle
   * using the floating-ui/dom package
   */
  computePositionConfig?: ComputePositionConfig
  /**
   * Locks the draghandle in place and visibility
   */
  locked?: boolean
  /**
   * Returns a node or null when a node is hovered over
   */
  onNodeChange?: (options: { node: Node | null; editor: Editor }) => void
  /**
   * 🎯 新增：是否显示拖拽指示器
   */
  showIndicators?: boolean
  /**
   * 🎯 新增：拖拽指示器样式配置
   */
  indicatorStyles?: DragIndicatorStyles
  /**
   * 🎯 新增：拖拽开始回调
   */
  onDragStart?: (event: DragEvent, editor: Editor) => void
  /**
   * 🎯 新增：拖拽悬停回调
   */
  onDragOver?: (event: DragEvent, dropInfo: DropInfo, editor: Editor) => void
  /**
   * 🎯 新增：拖拽放置回调
   */
  onDrop?: (event: DragEvent, dropInfo: DropInfo, editor: Editor) => void
  /**
   * 🎯 新增：拖拽结束回调（包括取消的情况）
   */
  onDragEnd?: (event: DragEvent, editor: Editor) => void
  /**
   * 🎯 Notion风格：点击+号按钮的回调
   */
  onAddBlock?: (options: {
    node: Node | null
    editor: Editor
    position: number
    event: MouseEvent
    targetElement: HTMLElement
  }) => void
  /**
   * 🎯 新增：拖拽手柄点击回调（Notion-like 块菜单）
   */
  onClick?: (event: MouseEvent, editor: Editor) => void
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    dragHandle: {
      /**
       * Locks the draghandle in place and visibility
       */
      lockDragHandle: () => ReturnType
      /**
       * Unlocks the draghandle
       */
      unlockDragHandle: () => ReturnType
      /**
       * Toggle draghandle lock state
       */
      toggleDragHandle: () => ReturnType
    }
  }
}

export const DragHandle = Extension.create<DragHandleOptions>({
  name: 'dragHandle',

  addOptions() {
    return {
      render() {
        // 🎯 简化的拖拽手柄容器 - 基于AppFlowy设计理念
        const container = document.createElement('div')
        container.classList.add('drag-handle-container')
        container.draggable = true // 修复测试：设置容器可拖拽

        // 简化的容器样式 - 符合测试期望
        Object.assign(container.style, {
          display: 'flex',
          alignItems: 'center',
          gap: '4px', // 修复测试：设置正确的间距
          padding: '2px',
          borderRadius: '3px',
          backgroundColor: 'transparent',
          transition: 'background-color 0.15s ease',
          zIndex: '1003',
        })

        // 🔥 使用SVG图标替代复杂的网格系统
        const dragHandle = document.createElement('div')
        dragHandle.classList.add('drag-handle')
        dragHandle.draggable = true
        dragHandle.setAttribute('aria-label', 'Drag to reorder')
        dragHandle.setAttribute('title', 'Drag to reorder')
        dragHandle.setAttribute('data-moni-menu-drag', 'true')

        // 简化的手柄样式 - 符合测试期望
        Object.assign(dragHandle.style, {
          width: '18px', // 修复测试：符合期望尺寸
          height: '18px', // 修复测试：符合期望尺寸
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'grab',
          borderRadius: '2px',
          backgroundColor: 'transparent',
          transition: 'background-color 0.15s ease',
        })

        // 🔥 核心改进：使用SVG替代复杂DOM结构
        dragHandle.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 14 14" style="pointer-events: none;">
            <g fill="currentColor" opacity="0.5">
              <circle cx="4" cy="3" r="1"/>
              <circle cx="4" cy="7" r="1"/>
              <circle cx="4" cy="11" r="1"/>
              <circle cx="8" cy="3" r="1"/>
              <circle cx="8" cy="7" r="1"/>
              <circle cx="8" cy="11" r="1"/>
            </g>
          </svg>
        `

        // 简化的+号按钮
        const addButton = document.createElement('div')
        addButton.classList.add('add-block-button')
        addButton.setAttribute('aria-label', 'Add block')
        addButton.setAttribute('title', 'Add block')
        addButton.setAttribute('data-moni-menu-add', 'true')

        // 简化的按钮样式 - 符合测试期望
        Object.assign(addButton.style, {
          width: '18px', // 修复测试：符合期望尺寸
          height: '18px', // 修复测试：符合期望尺寸
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          borderRadius: '2px',
          backgroundColor: 'transparent',
          color: '#9ca3af',
          fontSize: '14px',
          fontWeight: 'bold',
          transition: 'all 0.15s ease',
        })

        addButton.textContent = '+'

        // 🔥 简化的悬停效果 - 适配SVG图标
        const handleMouseEnter = () => {
          container.style.backgroundColor = '#f3f4f6'
          dragHandle.style.backgroundColor = '#e5e7eb'
          addButton.style.backgroundColor = '#e5e7eb'
          addButton.style.color = '#374151'

          // SVG图标颜色变深
          const svg = dragHandle.querySelector('svg')
          if (svg) {
            svg.style.color = '#6b7280'
          }
        }

        const handleMouseLeave = () => {
          container.style.backgroundColor = 'transparent'
          dragHandle.style.backgroundColor = 'transparent'
          addButton.style.backgroundColor = 'transparent'
          addButton.style.color = '#9ca3af'

          // 恢复SVG图标颜色
          const svg = dragHandle.querySelector('svg')
          if (svg) {
            svg.style.color = 'currentColor'
          }
        }

        container.addEventListener('mouseenter', handleMouseEnter)
        container.addEventListener('mouseleave', handleMouseLeave)

        // 拖拽时的样式
        dragHandle.addEventListener('dragstart', () => {
          dragHandle.style.cursor = 'grabbing'
        })

        dragHandle.addEventListener('dragend', () => {
          dragHandle.style.cursor = 'grab'
        })

        // 组装容器（加号在左，网格点在右）
        container.appendChild(addButton)
        container.appendChild(dragHandle)

        return container
      },
      computePositionConfig: {},
      locked: false,
      onNodeChange: () => {
        return null
      },
      // 🎯 新增：默认启用拖拽指示器
      showIndicators: true,
      indicatorStyles: {
        horizontal: {
          backgroundColor: '#3b82f6',
          height: '3px',
          borderRadius: '2px',
          boxShadow: '0 0 8px rgba(59, 130, 246, 0.4)',
        },
        vertical: {
          backgroundColor: '#3b82f6',
          width: '3px',
          borderRadius: '2px',
          boxShadow: '0 0 8px rgba(59, 130, 246, 0.4)',
        },
      },
      onDragStart: () => null,
      onDragOver: () => null,
      onDrop: () => null,
      // 🎯 Notion风格：+号按钮回调
      onAddBlock: () => null,
      // 🎯 新增：拖拽手柄点击回调
      onClick: () => null,
    }
  },

  addCommands() {
    return {
      lockDragHandle:
        () =>
        ({ tr }) => {
          this.options.locked = true
          tr.setMeta('lockDragHandle', this.options.locked)
          return true
        },
      unlockDragHandle:
        () =>
        ({ tr }) => {
          this.options.locked = false
          tr.setMeta('lockDragHandle', this.options.locked)
          return true
        },
      toggleDragHandle:
        () =>
        ({ tr }) => {
          this.options.locked = !this.options.locked
          tr.setMeta('lockDragHandle', this.options.locked)
          return true
        },
    }
  },

  addProseMirrorPlugins() {
    const element = this.options.render()

    return [
      DragHandlePlugin({
        computePositionConfig: { ...defaultComputePositionConfig, ...this.options.computePositionConfig },
        element,
        editor: this.editor,
        onNodeChange: this.options.onNodeChange,
        // 🎯 传递新增的拖拽指示器配置
        showIndicators: this.options.showIndicators,
        indicatorStyles: this.options.indicatorStyles,
        onDragStart: this.options.onDragStart,
        onDragOver: this.options.onDragOver,
        onDrop: this.options.onDrop,
        onDragEnd: this.options.onDragEnd,
        // 🎯 传递Notion风格+号按钮配置
        onAddBlock: this.options.onAddBlock,
        // 🎯 传递拖拽手柄点击回调
        onClick: this.options.onClick,
      }).plugin,
    ]
  },
})
