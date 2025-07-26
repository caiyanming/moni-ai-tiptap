import { type ComputePositionConfig, computePosition } from '@floating-ui/dom'
import type { Editor } from '@tiptap/core'
import { isChangeOrigin } from '@tiptap/extension-collaboration'
import type { Node } from '@tiptap/pm/model'
import { type EditorState, type Transaction, Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'
import {
  absolutePositionToRelativePosition,
  relativePositionToAbsolutePosition,
  ySyncPluginKey,
} from '@tiptap/y-tiptap'

import type { DragIndicatorStyles, DropInfo } from './drag-handle.js'
import { dragHandler } from './helpers/dragHandler.js'
import { findElementNextToCoords } from './helpers/findNextElementFromCursor.js'
import { getOuterNode, getOuterNodePos } from './helpers/getOuterNode.js'
import { removeNode } from './helpers/removeNode.js'

type PluginState = {
  locked: boolean
}

/**
 * 🎯 拖拽指示器管理器 - 直接集成到DragHandle扩展中
 */
export class DragIndicatorManager {
  private readonly view: EditorView
  private horizontalIndicator: HTMLElement | null = null
  private verticalIndicator: HTMLElement | null = null
  private containerElement: HTMLElement | null = null
  private readonly styles: DragIndicatorStyles

  constructor(view: EditorView, styles: DragIndicatorStyles = {}) {
    this.view = view
    this.styles = styles
    this.initialize()
  }

  private initialize() {
    this.containerElement = this.view.dom.parentElement
    if (!this.containerElement) {
      console.warn('DragIndicatorManager: 无法找到容器元素')
      return
    }

    this.createIndicators()
  }

  private createIndicators() {
    // 创建水平指示器（块上方/下方的蓝色横线）
    this.horizontalIndicator = document.createElement('div')
    this.horizontalIndicator.className = 'tiptap-drag-indicator-horizontal'

    const defaultHorizontalStyles = {
      position: 'absolute',
      height: '2px',
      backgroundColor: '#0066cc',
      borderRadius: '1px',
      pointerEvents: 'none',
      zIndex: '1000',
      visibility: 'hidden',
      transition: 'all 0.15s ease',
    }

    Object.assign(this.horizontalIndicator.style, {
      ...defaultHorizontalStyles,
      ...this.styles.horizontal,
    })

    // 在横线开始处添加圆圈
    const circle = document.createElement('div')
    Object.assign(circle.style, {
      position: 'absolute',
      left: '-4px',
      top: '-3px',
      width: '8px',
      height: '8px',
      backgroundColor: this.styles.horizontal?.backgroundColor || '#0066cc',
      borderRadius: '50%',
    })
    this.horizontalIndicator.appendChild(circle)

    // 创建垂直指示器（嵌套缩进的蓝色竖线）
    this.verticalIndicator = document.createElement('div')
    this.verticalIndicator.className = 'tiptap-drag-indicator-vertical'

    const defaultVerticalStyles = {
      position: 'absolute',
      width: '2px',
      backgroundColor: '#0066cc',
      borderRadius: '1px',
      pointerEvents: 'none',
      zIndex: '999',
      visibility: 'hidden',
      transition: 'all 0.15s ease',
    }

    Object.assign(this.verticalIndicator.style, {
      ...defaultVerticalStyles,
      ...this.styles.vertical,
    })

    // 添加指示器到容器
    this.containerElement!.appendChild(this.horizontalIndicator)
    this.containerElement!.appendChild(this.verticalIndicator)

    console.log('🎯 TipTap Fork 拖拽指示器已创建')
  }

  public showIndicator(targetElement: HTMLElement, position: 'above' | 'below' | 'inside'): void {
    if (!this.containerElement) {
      return
    }

    this.hideIndicator()

    const rect = targetElement.getBoundingClientRect()
    const containerRect = this.containerElement.getBoundingClientRect()

    if (position === 'above') {
      this.showHorizontalIndicator(rect, containerRect, 'above')
    } else if (position === 'below') {
      this.showHorizontalIndicator(rect, containerRect, 'below')
    } else if (position === 'inside') {
      this.showVerticalIndicator(rect, containerRect)
    }
  }

  private showHorizontalIndicator(rect: DOMRect, containerRect: DOMRect, position: 'above' | 'below'): void {
    if (!this.horizontalIndicator) {
      return
    }

    const y = position === 'above' ? rect.top - containerRect.top : rect.bottom - containerRect.top
    const x = rect.left - containerRect.left
    const width = rect.width

    this.horizontalIndicator.style.left = `${x}px`
    this.horizontalIndicator.style.top = `${y - 1}px`
    this.horizontalIndicator.style.width = `${width}px`
    this.horizontalIndicator.style.visibility = 'visible'
  }

  private showVerticalIndicator(rect: DOMRect, containerRect: DOMRect): void {
    if (!this.verticalIndicator) {
      return
    }

    const x = rect.left - containerRect.left
    const y = rect.top - containerRect.top
    const height = rect.height

    this.verticalIndicator.style.left = `${x - 2}px`
    this.verticalIndicator.style.top = `${y}px`
    this.verticalIndicator.style.height = `${height}px`
    this.verticalIndicator.style.visibility = 'visible'
  }

  public hideIndicator(): void {
    if (this.horizontalIndicator) {
      this.horizontalIndicator.style.visibility = 'hidden'
    }
    if (this.verticalIndicator) {
      this.verticalIndicator.style.visibility = 'hidden'
    }
  }

  public calculateDropPosition(
    event: DragEvent,
    targetElement: HTMLElement,
  ): { position: 'above' | 'below' | 'inside'; element: HTMLElement } | null {
    const rect = targetElement.getBoundingClientRect()
    const y = event.clientY
    const x = event.clientX

    // 检查是否在可嵌套元素上拖拽
    const nestable = targetElement.getAttribute('data-moni-nestable') === 'true'
    const leftIndentZone = rect.left + 40 // 左侧40px为缩进区域

    if (nestable && x < leftIndentZone) {
      return { position: 'inside', element: targetElement }
    }

    // 根据鼠标位置计算放置位置
    const topThreshold = rect.top + rect.height * 0.25
    const bottomThreshold = rect.bottom - rect.height * 0.25

    if (y < topThreshold) {
      return { position: 'above', element: targetElement }
    }
    if (y > bottomThreshold) {
      return { position: 'below', element: targetElement }
    }
    return { position: 'inside', element: targetElement }
  }

  public destroy() {
    if (this.horizontalIndicator?.parentElement) {
      this.horizontalIndicator.parentElement.removeChild(this.horizontalIndicator)
    }
    if (this.verticalIndicator?.parentElement) {
      this.verticalIndicator.parentElement.removeChild(this.verticalIndicator)
    }

    this.horizontalIndicator = null
    this.verticalIndicator = null
    this.containerElement = null

    console.log('🎯 TipTap Fork 拖拽指示器已销毁')
  }
}

const getRelativePos = (state: EditorState, absolutePos: number) => {
  const ystate = ySyncPluginKey.getState(state)

  if (!ystate) {
    return null
  }

  return absolutePositionToRelativePosition(absolutePos, ystate.type, ystate.binding.mapping)
}

// biome-ignore lint/suspicious/noExplicitAny: y-prosemirror (and y-tiptap by extension) does not have types for relative positions
const getAbsolutePos = (state: EditorState, relativePos: any) => {
  const ystate = ySyncPluginKey.getState(state)

  if (!ystate) {
    return -1
  }

  return relativePositionToAbsolutePosition(ystate.doc, ystate.type, relativePos, ystate.binding.mapping) || 0
}

const getOuterDomNode = (view: EditorView, domNode: HTMLElement) => {
  let tmpDomNode = domNode

  // Traverse to top level node.
  while (tmpDomNode?.parentNode) {
    if (tmpDomNode.parentNode === view.dom) {
      break
    }

    tmpDomNode = tmpDomNode.parentNode as HTMLElement
  }

  return tmpDomNode
}

export interface DragHandlePluginProps {
  pluginKey?: PluginKey | string
  editor: Editor
  element: HTMLElement
  onNodeChange?: (data: { editor: Editor; node: Node | null; pos: number }) => void
  computePositionConfig?: ComputePositionConfig
  // 🎯 新增：拖拽指示器相关属性
  showIndicators?: boolean
  indicatorStyles?: DragIndicatorStyles
  onDragStart?: (event: DragEvent, editor: Editor) => void
  onDragOver?: (event: DragEvent, dropInfo: DropInfo, editor: Editor) => void
  onDrop?: (event: DragEvent, dropInfo: DropInfo, editor: Editor) => void
  // 🎯 Notion风格：+号按钮相关属性
  onAddBlock?: (options: {
    node: Node | null
    editor: Editor
    position: number
    event: MouseEvent
    targetElement: HTMLElement
  }) => void
  // 🎯 新增：拖拽手柄点击回调
  onClick?: (event: MouseEvent, editor: Editor) => void
}

export const dragHandlePluginDefaultKey = new PluginKey('dragHandle')

export const DragHandlePlugin = ({
  pluginKey = dragHandlePluginDefaultKey,
  element,
  editor,
  computePositionConfig,
  onNodeChange,
  // 🎯 新增参数
  showIndicators = false,
  indicatorStyles = {},
  onDragStart,
  onDragOver,
  onDrop,
  // 🎯 Notion风格：+号按钮参数
  onAddBlock,
  // 🎯 新增：拖拽手柄点击回调参数
  onClick,
}: DragHandlePluginProps) => {
  const wrapper = document.createElement('div')
  let locked = false
  let currentNode: Node | null = null
  let currentNodePos = -1
  // biome-ignore lint/suspicious/noExplicitAny: See above - relative positions in y-prosemirror are not typed
  let currentNodeRelPos: any

  // 🎯 创建拖拽指示器管理器
  let indicatorManager: DragIndicatorManager | null = null

  function hideHandle() {
    if (!element) {
      return
    }

    element.style.visibility = 'hidden'
    element.style.pointerEvents = 'none'
  }

  function showHandle() {
    if (!element) {
      return
    }

    if (!editor.isEditable) {
      hideHandle()
      return
    }

    element.style.visibility = ''
    element.style.pointerEvents = 'auto'
  }

  function repositionDragHandle(dom: Element) {
    const virtualElement = {
      getBoundingClientRect: () => dom.getBoundingClientRect(),
    }

    computePosition(virtualElement, element, computePositionConfig).then(val => {
      Object.assign(element.style, {
        position: val.strategy,
        left: `${val.x}px`,
        top: `${val.y}px`,
      })
    })
  }

  function onDragStartHandler(e: DragEvent) {
    // 🎯 隐藏原始浏览器拖拽图标
    if (e.dataTransfer) {
      // 创建一个透明的1x1像素图像作为拖拽图标
      const transparentImg = document.createElement('img')
      transparentImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs='
      transparentImg.width = 1
      transparentImg.height = 1
      e.dataTransfer.setDragImage(transparentImg, 0, 0)

      // 设置拖拽数据
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/html', '')
    }

    // Push this to the end of the event cue
    // Fixes bug where incorrect drag pos is returned if drag handle has position: absolute
    // @ts-ignore
    dragHandler(e, editor)

    // 🎯 调用用户自定义回调
    onDragStart?.(e, editor)

    setTimeout(() => {
      if (element) {
        element.style.pointerEvents = 'none'
      }
    }, 0)
  }

  function onDragEndHandler() {
    hideHandle()
    if (element) {
      element.style.pointerEvents = 'auto'
    }

    // 🎯 拖拽结束时隐藏指示器
    indicatorManager?.hideIndicator()
  }

  element.addEventListener('dragstart', onDragStartHandler)
  element.addEventListener('dragend', onDragEndHandler)

  // 🎯 Notion风格：处理+号按钮点击事件（总是显示）
  let addButtonClickHandler: ((e: Event) => void) | null = null
  const addButton = element.querySelector('.add-block-button')
  if (addButton) {
    addButtonClickHandler = (e: Event) => {
      const mouseEvent = e as MouseEvent
      e.preventDefault()
      e.stopPropagation()

      // 调用用户自定义的添加块回调
      if (onAddBlock && currentNode && currentNodePos >= 0) {
        onAddBlock({
          node: currentNode,
          editor,
          position: currentNodePos + 1, // 在当前块后面插入
          event: mouseEvent, // 传递鼠标事件对象
          targetElement: mouseEvent.target as HTMLElement, // 传递目标元素
        })
      }
    }

    addButton.addEventListener('click', addButtonClickHandler)
  }

  // 🎯 新增：处理拖拽手柄点击事件（Notion-like 块菜单）
  let dragHandleClickHandler: ((e: Event) => void) | null = null
  const dragHandle = element.querySelector('.drag-handle')
  if (dragHandle && onClick) {
    dragHandleClickHandler = (e: Event) => {
      // 只有在单击时触发（不是拖拽开始）
      const mouseEvent = e as MouseEvent
      const isDragStart = mouseEvent.detail === 0 && e.type === 'click'

      if (!isDragStart) {
        e.preventDefault()
        e.stopPropagation()

        // 调用用户自定义的拖拽手柄点击回调
        onClick(mouseEvent, editor)
      }
    }

    dragHandle.addEventListener('click', dragHandleClickHandler)
  }

  wrapper.appendChild(element)

  return {
    unbind() {
      element.removeEventListener('dragstart', onDragStartHandler)
      element.removeEventListener('dragend', onDragEndHandler)

      // 🎯 清理+号按钮事件监听器
      if (addButtonClickHandler && addButton) {
        addButton.removeEventListener('click', addButtonClickHandler)
      }

      // 🎯 清理拖拽手柄点击事件监听器
      if (dragHandleClickHandler && dragHandle) {
        dragHandle.removeEventListener('click', dragHandleClickHandler)
      }

      // 🎯 销毁指示器管理器
      indicatorManager?.destroy()
      indicatorManager = null
    },
    plugin: new Plugin({
      key: typeof pluginKey === 'string' ? new PluginKey(pluginKey) : pluginKey,

      state: {
        init() {
          return { locked: false }
        },
        apply(tr: Transaction, value: PluginState, _oldState: EditorState, state: EditorState) {
          const isLocked = tr.getMeta('lockDragHandle')
          const hideDragHandle = tr.getMeta('hideDragHandle')

          if (isLocked !== undefined) {
            locked = isLocked
          }

          if (hideDragHandle) {
            hideHandle()

            locked = false
            currentNode = null
            currentNodePos = -1

            onNodeChange?.({ editor, node: null, pos: -1 })

            return value
          }

          // Something has changed and drag handler is visible…
          if (tr.docChanged && currentNodePos !== -1 && element) {
            // Yjs replaces the entire document on every incoming change and needs a special handling.
            // If change comes from another user …
            if (isChangeOrigin(tr)) {
              // https://discuss.yjs.dev/t/y-prosemirror-mapping-a-single-relative-position-when-doc-changes/851/3
              const newPos = getAbsolutePos(state, currentNodeRelPos)

              if (newPos !== currentNodePos) {
                // Set the new position for our current node.
                currentNodePos = newPos

                // We will get the outer node with data and position in views update method.
              }
            } else {
              // … otherwise use ProseMirror mapping to update the position.
              const newPos = tr.mapping.map(currentNodePos)

              if (newPos !== currentNodePos) {
                // TODO: Remove
                // console.log('Position has changed …', { old: currentNodePos, new: newPos }, tr);

                // Set the new position for our current node.
                currentNodePos = newPos

                // Memorize relative position to retrieve absolute position in case of collaboration
                currentNodeRelPos = getRelativePos(state, currentNodePos)

                // We will get the outer node with data and position in views update method.
              }
            }
          }

          return value
        },
      },

      view: view => {
        element.draggable = true
        element.style.pointerEvents = 'auto'
        // 🎯 确保拖拽手柄元素在最上层显示
        element.style.zIndex = '1002'

        editor.view.dom.parentElement?.appendChild(wrapper)

        wrapper.style.pointerEvents = 'none'
        wrapper.style.position = 'absolute'
        wrapper.style.top = '0'
        wrapper.style.left = '0'
        // 🎯 确保拖拽手柄在最上层显示，避免被代码块背景或列表线条覆盖
        wrapper.style.zIndex = '1001'

        // 🎯 创建拖拽指示器管理器
        if (showIndicators) {
          indicatorManager = new DragIndicatorManager(view, indicatorStyles)

          // 🎯 改进的拖拽事件监听 - 监听document级别事件
          let isDragging = false
          let dragSourceElement: HTMLElement | null = null

          const handleDragStart = (event: DragEvent) => {
            isDragging = true
            dragSourceElement = event.target as HTMLElement
            console.log('🎯 拖拽开始检测:', { isDragging, source: dragSourceElement?.tagName })
          }

          const handleDragOver = (event: DragEvent) => {
            if (!isDragging) {
              console.log('🔍 拖拽悬停 - 不在拖拽状态:', { isDragging })
              return
            }

            event.preventDefault()
            const target = event.target as HTMLElement

            console.log('🔍 拖拽悬停事件处理:', {
              eventType: event.type,
              targetTagName: target.tagName,
              targetAttributes: target.attributes
                ? Array.from(target.attributes)
                    .map(attr => `${attr.name}="${attr.value}"`)
                    .join(' ')
                : 'No attributes',
              isDragging,
              dragSourceElement: dragSourceElement?.tagName,
            })

            // 查找最近的有data-moni-block-id的元素
            let blockElement: HTMLElement | null = target
            let searchDepth = 0
            const maxDepth = 10 // 防止无限循环

            while (blockElement && blockElement !== document.body && searchDepth < maxDepth) {
              console.log(`🔍 搜索层级 ${searchDepth}:`, {
                tagName: blockElement.tagName,
                hasMoniBlockId: blockElement.hasAttribute('data-moni-block-id'),
                moniBlockIdValue: blockElement.getAttribute('data-moni-block-id') || 'N/A',
                className: blockElement.className || 'No class',
                isSourceElement: blockElement === dragSourceElement,
              })

              if (blockElement.hasAttribute('data-moni-block-id')) {
                console.log('✅ 找到有 data-moni-block-id 的元素:', {
                  tagName: blockElement.tagName,
                  moniBlockId: blockElement.getAttribute('data-moni-block-id'),
                  isSourceElement: blockElement === dragSourceElement,
                })
                break
              }
              blockElement = blockElement.parentElement
              searchDepth += 1
            }

            if (blockElement && blockElement.hasAttribute('data-moni-block-id') && blockElement !== dragSourceElement) {
              console.log('🎯 准备显示拖拽指示器:', {
                targetElement: blockElement.tagName,
                targetBlockId: blockElement.getAttribute('data-moni-block-id'),
                sourceElement: dragSourceElement?.tagName,
                sourceBlockId: dragSourceElement?.getAttribute('data-moni-block-id') || 'N/A',
              })

              const dropPosition = indicatorManager?.calculateDropPosition(event, blockElement)
              if (dropPosition) {
                console.log('🎯 显示拖拽指示器:', { position: dropPosition.position, target: blockElement.tagName })
                indicatorManager?.showIndicator(blockElement, dropPosition.position)

                // 🎯 调用用户自定义回调
                const dropInfo: DropInfo = {
                  position: dropPosition.position,
                  targetElement: blockElement,
                }
                onDragOver?.(event, dropInfo, editor)
              } else {
                console.log('⚠️ calculateDropPosition 返回了 null')
              }
            } else {
              console.log('❌ 未找到合适的拖拽目标:', {
                blockElementFound: !!blockElement,
                hasBlockId: blockElement?.hasAttribute('data-moni-block-id'),
                isSameAsSource: blockElement === dragSourceElement,
                searchDepth,
              })
            }
          }

          const handleDragLeave = (event: DragEvent) => {
            // 只有当离开整个编辑器区域时才隐藏指示器
            if (event.relatedTarget && !view.dom.contains(event.relatedTarget as HTMLElement)) {
              console.log('🎯 隐藏拖拽指示器 (离开编辑器)')
              indicatorManager?.hideIndicator()
            }
          }

          const handleDropHandler = (event: DragEvent) => {
            if (!isDragging) {
              return
            }

            const target = event.target as HTMLElement

            // 查找最近的有data-moni-block-id的元素
            let blockElement: HTMLElement | null = target
            while (blockElement && blockElement !== document.body) {
              if (blockElement.hasAttribute('data-moni-block-id')) {
                break
              }
              blockElement = blockElement.parentElement
            }

            if (blockElement && blockElement.hasAttribute('data-moni-block-id')) {
              const dropPosition = indicatorManager?.calculateDropPosition(event, blockElement)
              if (dropPosition) {
                console.log('🎯 处理拖拽放置:', { position: dropPosition.position, target: blockElement.tagName })

                // 🎯 调用用户自定义回调
                const dropInfo: DropInfo = {
                  position: dropPosition.position,
                  targetElement: blockElement,
                }
                onDrop?.(event, dropInfo, editor)
              }
            }

            // 重置拖拽状态
            isDragging = false
            dragSourceElement = null
            indicatorManager?.hideIndicator()
          }

          const handleDragEnd = () => {
            console.log('🎯 拖拽结束，重置状态')
            isDragging = false
            dragSourceElement = null
            indicatorManager?.hideIndicator()
          }

          // 添加事件监听器到document级别以捕获所有拖拽事件
          document.addEventListener('dragstart', handleDragStart)
          document.addEventListener('dragover', handleDragOver)
          document.addEventListener('dragleave', handleDragLeave)
          document.addEventListener('drop', handleDropHandler)
          document.addEventListener('dragend', handleDragEnd)

          // 保存清理函数的引用
          const cleanupListeners = () => {
            document.removeEventListener('dragstart', handleDragStart)
            document.removeEventListener('dragover', handleDragOver)
            document.removeEventListener('dragleave', handleDragLeave)
            document.removeEventListener('drop', handleDropHandler)
            document.removeEventListener('dragend', handleDragEnd)
          }

          // 在destroy时清理
          const originalDestroy = view.destroy
          view.destroy = () => {
            cleanupListeners()
            originalDestroy.call(view)
          }
        }

        return {
          update(_, oldState) {
            if (!element) {
              return
            }

            if (!editor.isEditable) {
              hideHandle()
              return
            }

            // Prevent element being draggend while being open.
            if (locked) {
              element.draggable = false
            } else {
              element.draggable = true
            }

            // Recalculate popup position if doc has changend and drag handler is visible.
            if (view.state.doc.eq(oldState.doc) || currentNodePos === -1) {
              return
            }

            // Get domNode from (new) position.
            let domNode = view.nodeDOM(currentNodePos) as HTMLElement

            // Since old element could have been wrapped, we need to find
            // the outer node and take its position and node data.
            domNode = getOuterDomNode(view, domNode)

            // Skip if domNode is editor dom.
            if (domNode === view.dom) {
              return
            }

            // We only want `Element`.
            if (domNode?.nodeType !== 1) {
              return
            }

            const domNodePos = view.posAtDOM(domNode, 0)
            const outerNode = getOuterNode(editor.state.doc, domNodePos)
            const outerNodePos = getOuterNodePos(editor.state.doc, domNodePos) // TODO: needed?

            currentNode = outerNode
            currentNodePos = outerNodePos

            // Memorize relative position to retrieve absolute position in case of collaboration
            currentNodeRelPos = getRelativePos(view.state, currentNodePos)

            onNodeChange?.({ editor, node: currentNode, pos: currentNodePos })

            repositionDragHandle(domNode as Element)
          },

          // TODO: Kills even on hot reload
          destroy() {
            if (element) {
              removeNode(wrapper)
            }

            // 🎯 销毁指示器管理器
            indicatorManager?.destroy()
            indicatorManager = null
          },
        }
      },

      props: {
        handleDOMEvents: {
          mouseleave(_view, e) {
            // Do not hide open popup on mouseleave.
            if (locked) {
              return false
            }

            // If e.target is not inside the wrapper, hide.
            if (e.target && !wrapper.contains(e.relatedTarget as HTMLElement)) {
              hideHandle()

              currentNode = null
              currentNodePos = -1

              onNodeChange?.({ editor, node: null, pos: -1 })
            }

            return false
          },

          mousemove(view, e) {
            // Do not continue if popup is not initialized or open.
            if (!element || locked) {
              return false
            }

            const nodeData = findElementNextToCoords({
              x: e.clientX,
              y: e.clientY,
              direction: 'right',
              editor,
            })

            // Skip if there is no node next to coords
            if (!nodeData.resultElement) {
              return false
            }

            let domNode = nodeData.resultElement as HTMLElement

            domNode = getOuterDomNode(view, domNode)

            // Skip if domNode is editor dom.
            if (domNode === view.dom) {
              return false
            }

            // We only want `Element`.
            if (domNode?.nodeType !== 1) {
              return false
            }

            const domNodePos = view.posAtDOM(domNode, 0)
            const outerNode = getOuterNode(editor.state.doc, domNodePos)

            if (outerNode !== currentNode) {
              const outerNodePos = getOuterNodePos(editor.state.doc, domNodePos)

              currentNode = outerNode
              currentNodePos = outerNodePos

              // Memorize relative position to retrieve absolute position in case of collaboration
              currentNodeRelPos = getRelativePos(view.state, currentNodePos)

              onNodeChange?.({ editor, node: currentNode, pos: currentNodePos })

              // Set nodes clientRect.
              repositionDragHandle(domNode as Element)

              showHandle()
            }

            return false
          },
        },
      },
    }),
  }
}
