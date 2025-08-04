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
        // 🎯 Notion风格的拖拽手柄 + 加号按钮容器
        const container = document.createElement('div')
        container.classList.add('drag-handle-container')

        // 设置容器样式和属性 - 🔧 FIX: 移除容器的 draggable 属性避免事件冲突
        // container.draggable = true  // 注释掉，只允许手柄本身拖拽
        Object.assign(container.style, {
          display: 'flex',
          alignItems: 'center',
          gap: '0px',
          padding: '1px', // 🎯 FIX: 减少padding，更像Notion
          borderRadius: '3px', // 🎯 FIX: 稍微减少圆角
          backgroundColor: 'transparent',
          transition: 'background-color 0.15s ease',
          // 🎯 确保容器在最上层，避免被代码块背景或列表线条覆盖
          zIndex: '1003',
        })

        // 创建拖拽手柄图标（6个点的网格）
        const dragHandle = document.createElement('div')
        dragHandle.classList.add('drag-handle')
        dragHandle.draggable = true
        dragHandle.setAttribute('aria-label', 'Drag to reorder')
        dragHandle.setAttribute('title', 'Drag to reorder')
        // 🎯 添加 Moni 系统专用属性
        dragHandle.setAttribute('data-moni-menu-drag', 'true')

        Object.assign(dragHandle.style, {
          width: '14px', // 🎯 FIX: 减少尺寸，更像Notion
          height: '14px', // 🎯 FIX: 减少尺寸，更像Notion
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)', // 2列
          gridTemplateRows: 'repeat(3, 1fr)', // 🔧 FIX: 明确设置3行（6个点=2列x3行）
          gap: '1.5px', // 🎯 FIX: 减少间距，更紧凑
          padding: '2px', // 🎯 FIX: 减少内边距
          cursor: 'grab',
          borderRadius: '2px', // 🎯 FIX: 稍微减少圆角
          backgroundColor: 'transparent',
          transition: 'background-color 0.15s ease',
          // 🔧 FIX: 确保网格内容居中对齐
          alignItems: 'center',
          justifyItems: 'center',
          placeItems: 'center', // 同时处理水平和垂直居中
        })

        // 设置 CSS 自定义属性
        dragHandle.style.setProperty('--dot-color', '#9ca3af')
        dragHandle.style.setProperty('--dot-color-hover', '#6b7280')

        // 创建6个小点
        for (let i = 0; i < 6; i += 1) {
          const dot = document.createElement('div')
          dot.classList.add('grid-dot')
          Object.assign(dot.style, {
            width: '1.5px', // 🎯 FIX: 减少点的大小，更精致
            height: '1.5px', // 🎯 FIX: 减少点的大小，更精致
            backgroundColor: '#9ca3af',
            borderRadius: '50%',
            transition: 'background-color 0.15s ease',
            // 🔧 FIX: 确保小圆点在网格单元格中居中
            margin: '0',
            justifySelf: 'center',
            alignSelf: 'center',
          })
          dragHandle.appendChild(dot)
        }

        // 创建+号按钮
        const addButton = document.createElement('div')
        addButton.classList.add('add-block-button')
        addButton.setAttribute('aria-label', 'Add block')
        addButton.setAttribute('title', 'Add block')
        // 🎯 添加 Moni 系统专用属性
        addButton.setAttribute('data-moni-menu-add', 'true')

        Object.assign(addButton.style, {
          width: '14px', // 🎯 FIX: 与拖拽手柄保持一致的尺寸
          height: '14px', // 🎯 FIX: 与拖拽手柄保持一致的尺寸
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          borderRadius: '2px', // 🎯 FIX: 与拖拽手柄保持一致
          backgroundColor: 'transparent',
          color: '#9ca3af',
          fontSize: '12px', // 🎯 FIX: 稍微减小字体
          fontWeight: 'bold',
          transition: 'all 0.15s ease',
        })

        // 设置 CSS 自定义属性
        addButton.style.setProperty('--bg-color', 'transparent')
        addButton.style.setProperty('--bg-color-hover', '#f3f4f6')

        addButton.textContent = '+'

        // 悬停效果
        const handleMouseEnter = () => {
          container.style.backgroundColor = '#f3f4f6'
          dragHandle.style.backgroundColor = '#e5e7eb'
          addButton.style.backgroundColor = '#e5e7eb'
          addButton.style.color = '#374151'

          // 拖拽手柄点的颜色变深
          dragHandle.querySelectorAll('div').forEach(dot => {
            ;(dot as HTMLElement).style.backgroundColor = '#6b7280'
          })
        }

        const handleMouseLeave = () => {
          container.style.backgroundColor = 'transparent'
          dragHandle.style.backgroundColor = 'transparent'
          addButton.style.backgroundColor = 'transparent'
          addButton.style.color = '#9ca3af'

          // 恢复拖拽手柄点的颜色
          dragHandle.querySelectorAll('div').forEach(dot => {
            ;(dot as HTMLElement).style.backgroundColor = '#9ca3af'
          })
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
        // 🎯 传递Notion风格+号按钮配置
        onAddBlock: this.options.onAddBlock,
        // 🎯 传递拖拽手柄点击回调
        onClick: this.options.onClick,
      }).plugin,
    ]
  },
})
