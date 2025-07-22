import type { ComputePositionConfig } from '@floating-ui/dom'
import { type Editor, Extension } from '@tiptap/core'
import type { Node } from '@tiptap/pm/model'

import { DragHandlePlugin } from './drag-handle-plugin.js'

export const defaultComputePositionConfig: ComputePositionConfig = {
  placement: 'left-start',
  strategy: 'absolute',
}

export interface DropInfo {
  position: 'above' | 'below' | 'inside'
  targetElement: HTMLElement
  targetNode?: Node
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

        // 设置容器样式
        Object.assign(container.style, {
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px',
          borderRadius: '4px',
          backgroundColor: 'transparent',
          transition: 'background-color 0.15s ease',
          // 🎯 确保容器在最上层，避免被代码块背景或列表线条覆盖
          zIndex: '1003',
        })

        // 创建拖拽手柄图标（6个点的网格）
        const dragHandle = document.createElement('div')
        dragHandle.classList.add('drag-handle')
        dragHandle.draggable = true

        Object.assign(dragHandle.style, {
          width: '18px',
          height: '18px',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '2px',
          padding: '3px',
          cursor: 'grab',
          borderRadius: '3px',
          backgroundColor: 'transparent',
          transition: 'background-color 0.15s ease',
        })

        // 创建6个小点
        for (let i = 0; i < 6; i += 1) {
          const dot = document.createElement('div')
          Object.assign(dot.style, {
            width: '2px',
            height: '2px',
            backgroundColor: '#9ca3af',
            borderRadius: '50%',
            transition: 'background-color 0.15s ease',
          })
          dragHandle.appendChild(dot)
        }

        // 创建+号按钮
        const addButton = document.createElement('div')
        addButton.classList.add('add-block-button')

        Object.assign(addButton.style, {
          width: '18px',
          height: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          borderRadius: '3px',
          backgroundColor: 'transparent',
          color: '#9ca3af',
          fontSize: '14px',
          fontWeight: 'bold',
          transition: 'all 0.15s ease',
        })

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
          backgroundColor: '#0066cc',
          height: '2px',
          borderRadius: '1px',
        },
        vertical: {
          backgroundColor: '#0066cc',
          width: '2px',
          borderRadius: '1px',
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
        ({ editor }) => {
          this.options.locked = true
          return editor.commands.setMeta('lockDragHandle', this.options.locked)
        },
      unlockDragHandle:
        () =>
        ({ editor }) => {
          this.options.locked = false
          return editor.commands.setMeta('lockDragHandle', this.options.locked)
        },
      toggleDragHandle:
        () =>
        ({ editor }) => {
          this.options.locked = !this.options.locked
          return editor.commands.setMeta('lockDragHandle', this.options.locked)
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
