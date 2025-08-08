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
import { DropPositionCalculator } from './drop-position-calculator.js'
import { dragHandler } from './helpers/dragHandler.js'
import { findElementNextToCoords } from './helpers/findNextElementFromCursor.js'
import { getOuterNode, getOuterNodePos } from './helpers/getOuterNode.js'
import { removeNode } from './helpers/removeNode.js'
import { type ModernDragIndicator, createDragIndicator } from './modern-drag-indicator.js'

type PluginState = {
  locked: boolean
}

/**
 * 🎯 现代化拖拽指示器集成
 * 使用新的 ModernDragIndicator 架构
 */

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
  onDragStart,
  onDragOver,
  onDrop,
  // 🎯 Notion风格：+号按钮参数
  onAddBlock,
  // 🎯 新增：拖拽手柄点击回调参数
  onClick,
}: DragHandlePluginProps) => {
  // 参数验证
  if (!editor) {
    throw new Error('DragHandlePlugin: editor is required')
  }
  if (!element) {
    throw new Error('DragHandlePlugin: element is required')
  }

  console.log('🔧 DragHandlePlugin 初始化', {
    showIndicators,
    hasOnDragStart: !!onDragStart,
    hasOnDrop: !!onDrop,
    pluginKey: typeof pluginKey === 'string' ? pluginKey : pluginKey.key
  })

  const wrapper = document.createElement('div')
  let locked = false
  let currentNode: Node | null = null
  let currentNodePos = -1
  // biome-ignore lint/suspicious/noExplicitAny: See above - relative positions in y-prosemirror are not typed
  let currentNodeRelPos: any

  // 🎯 创建现代化拖拽指示器
  let dragIndicator: ModernDragIndicator | null = null

  // 🔧 FIX: 全局清理函数引用，避免内存泄漏
  let globalCleanupListeners: (() => void) | null = null

  // 🎯 FIX: 添加防抖隐藏功能，提升跨浏览器稳定性
  let hideTimer: number | null = null

  function hideHandle(immediate = false) {
    if (!element) {
      return
    }

    // 清除之前的定时器
    if (hideTimer) {
      clearTimeout(hideTimer)
      hideTimer = null
    }

    if (immediate) {
      element.style.visibility = 'hidden'
      element.style.pointerEvents = 'none'
    } else {
      // 延迟150ms隐藏，避免鼠标快速移动时的闪烁
      hideTimer = window.setTimeout(() => {
        if (element) {
          element.style.visibility = 'hidden'
          element.style.pointerEvents = 'none'
        }
        hideTimer = null
      }, 150)
    }
  }

  function showHandle() {
    if (!element) {
      return
    }

    // 🎯 FIX: 清除隐藏定时器，确保立即显示
    if (hideTimer) {
      clearTimeout(hideTimer)
      hideTimer = null
    }

    if (!editor.isEditable) {
      hideHandle(true) // 立即隐藏，不使用延迟
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
    dragIndicator?.hide()
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
    destroy() {
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

      // 🔧 FIX: 清理document级别的事件监听器，防止内存泄漏
      if (globalCleanupListeners) {
        globalCleanupListeners()
        globalCleanupListeners = null
      }

      // 🎯 清理隐藏定时器
      if (hideTimer) {
        clearTimeout(hideTimer)
        hideTimer = null
      }

      // 🎯 销毁现代化指示器
      dragIndicator?.destroy()
      dragIndicator = null
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

        // 🔧 FIX: Hide the handle initially so it only shows on hover
        hideHandle()

        // 🎯 创建现代化拖拽指示器
        let cleanupListeners: (() => void) | null = null

        if (showIndicators) {
          // 🔧 FIX: 检查 DOM 是否已连接且编辑器未销毁，避免在组件卸载时创建指示器
          if (view.dom && view.dom.isConnected && !view.isDestroyed) {
            try {
              dragIndicator = createDragIndicator(view, 'notion', true)
            } catch (error) {
              console.error('🔧 FIX: Failed to create drag indicator:', error)
              // 如果指示器创建失败，继续运行但不使用指示器
              dragIndicator = null
            }
          } else {
            dragIndicator = null
          }

          // 🎯 改进的拖拽事件监听 - 监听document级别事件
          let isDragging = false
          let dragSourceElement: HTMLElement | null = null

          // 🔍 简化的目标元素查找 (最底层，被多个函数依赖)
          const findBlockElement = (target: HTMLElement): HTMLElement | null => {
            console.log('查找块级元素', { target: target.tagName, className: target.className })
            
            // 首先尝试查找具有 data-moni-block-id 的元素
            let blockElement = target.closest('[data-moni-block-id]') as HTMLElement | null
            
            if (blockElement) {
              console.log('找到带有 data-moni-block-id 的块级元素', { tag: blockElement.tagName })
              return blockElement
            }
            
            // 如果没有找到 data-moni-block-id，尝试查找块级节点（p, h1-h6, blockquote 等）
            blockElement = target.closest('p, h1, h2, h3, h4, h5, h6, blockquote, pre, div[data-type]') as HTMLElement | null
            
            if (blockElement) {
              console.log('找到标准块级元素', { tag: blockElement.tagName, dataType: blockElement.getAttribute('data-type') })
              return blockElement
            }
            
            console.log('未找到块级元素')
            return null
          }

          // 辅助函数：找到块级节点的位置和大小 (被 executeNotionStyleMove 依赖)
          const findBlockPosition = (resolve: any): { pos: number; size: number } | null => {
            // 向上查找块级节点
            for (let depth = resolve.depth; depth >= 0; depth -= 1) {
              const node = resolve.node(depth)
              if (node.isBlock && depth > 0) {
                // 排除document节点
                const pos = resolve.start(depth)
                return { pos, size: node.nodeSize }
              }
            }
            return null
          }

          // 🎯 NOTION风格：更可靠的节点移动实现 (被 handleDropHandler 依赖)
          const executeNotionStyleMove = (
            sourceElement: HTMLElement,
            targetElement: HTMLElement,
            position: 'above' | 'below' | 'inside',
          ): boolean => {
            try {
              // 🔧 FIX: 改进DOM到ProseMirror位置的查找逻辑
              // 优先尝试 data-moni-block-id，如果不存在则直接使用DOM元素
              const sourceMoniBlockId = sourceElement.getAttribute('data-moni-block-id')
              const targetMoniBlockId = targetElement.getAttribute('data-moni-block-id')

              if (sourceMoniBlockId && targetMoniBlockId) {
                console.log('使用 moni-block-id 进行拖拽移动', { sourceMoniBlockId, targetMoniBlockId })
              } else {
                console.log('moni-block-id 不存在，使用直接DOM定位', { 
                  sourceTag: sourceElement.tagName, 
                  targetTag: targetElement.tagName 
                })
              }

              // 尝试多种方式查找ProseMirror位置
              let sourcePos = view.posAtDOM(sourceElement, 0)
              let targetPos = view.posAtDOM(targetElement, 0)

              // 如果直接查找失败，尝试查找子元素
              if (sourcePos === -1) {
                const sourceChild = sourceElement.querySelector('[data-type]') || sourceElement.firstElementChild
                if (sourceChild) {
                  sourcePos = view.posAtDOM(sourceChild as HTMLElement, 0)
                }
              }

              if (targetPos === -1) {
                const targetChild = targetElement.querySelector('[data-type]') || targetElement.firstElementChild
                if (targetChild) {
                  targetPos = view.posAtDOM(targetChild as HTMLElement, 0)
                }
              }

              if (sourcePos === -1 || targetPos === -1) {
                console.warn('改进查找后仍无法找到DOM对应的ProseMirror位置', { sourcePos, targetPos })
                return false
              }

              console.log('找到ProseMirror位置', { sourcePos, targetPos })

              const { state } = view
              const { doc, tr } = state

              // 找到包含的块级节点
              const sourceResolve = doc.resolve(sourcePos)
              const targetResolve = doc.resolve(targetPos)

              // 找到最近的块级节点位置
              const sourceBlockPos = findBlockPosition(sourceResolve)
              const targetBlockPos = findBlockPosition(targetResolve)

              if (sourceBlockPos === null || targetBlockPos === null) {
                console.warn('无法找到块级节点位置')
                return false
              }

              const sourceNode = doc.nodeAt(sourceBlockPos.pos)
              if (!sourceNode) {
                console.warn('无法找到源节点')
                return false
              }

              // 计算插入位置
              let insertPos: number
              if (position === 'above') {
                insertPos = targetBlockPos.pos
              } else if (position === 'below') {
                insertPos = targetBlockPos.pos + targetBlockPos.size
              } else {
                return false // 暂不支持inside
              }

              // 执行移动：先删除，再插入
              const deleteFrom = sourceBlockPos.pos
              const deleteTo = sourceBlockPos.pos + sourceBlockPos.size

              console.log('准备执行移动操作', { 
                sourceNode: sourceNode.type.name,
                sourceText: sourceNode.textContent?.slice(0, 30),
                deleteFrom, 
                deleteTo, 
                insertPos,
                position 
              })

              let newTr = tr.delete(deleteFrom, deleteTo)

              // 调整插入位置（如果删除位置在插入位置之前）
              let adjustedInsertPos = insertPos
              if (deleteFrom < insertPos) {
                adjustedInsertPos -= sourceBlockPos.size
              }

              console.log('调整后的插入位置', { adjustedInsertPos })

              // 插入节点
              newTr = newTr.insert(adjustedInsertPos, sourceNode)

              console.log('事务准备完成，开始dispatch')

              // 应用事务
              view.dispatch(newTr)

              console.log('事务已dispatched')

              return true
            } catch (error) {
              console.error('executeNotionStyleMove详细错误:', error)
              return false
            }
          }

          const handleDragStart = (event: DragEvent) => {
            console.log('🎯 [DEBUG] DragStart event triggered:', {
              target: (event.target as HTMLElement)?.tagName,
              dragIndicatorExists: !!dragIndicator,
              eventType: event.type
            })

            if (!dragIndicator) {
              console.log('🔧 dragIndicator 不存在，跳过拖拽开始处理')
              return // 🔧 FIX: 防止在指示器不存在时处理事件
            }

            isDragging = true
            dragSourceElement = event.target as HTMLElement

            // 尝试查找块级源元素
            const sourceBlockElement = findBlockElement(dragSourceElement)
            if (sourceBlockElement) {
              dragSourceElement = sourceBlockElement
            }

            console.log('🎯 拖拽开始检测:', {
              isDragging,
              source: dragSourceElement?.tagName,
              sourceClass: dragSourceElement?.className,
              sourceId: dragSourceElement?.getAttribute('data-moni-block-id') || 'N/A',
              sourceText: dragSourceElement?.textContent?.slice(0, 30),
              eventType: event.type,
            })
          }

          const handleDragOver = (event: DragEvent) => {
            if (!isDragging || !dragIndicator) {
              return
            }

            try {
              event.preventDefault()
              const target = event.target as HTMLElement
              const blockElement = findBlockElement(target)

              if (blockElement && blockElement !== dragSourceElement) {
                // 🎯 使用 AppFlowy 风格的现代化计算器
                const result = DropPositionCalculator.calculate(event, blockElement)

                // 🎨 显示语义化指示器
                dragIndicator.show({
                  direction: result.direction,
                  position: result.indicatorPosition,
                  dropPosition: result.dropPosition,
                  horizontalPosition: result.horizontalPosition, // 新增语义化位置信息
                  confidence: result.confidence, // 新增算法置信度
                })

                // 🎯 调用用户自定义回调
                const dropInfo: DropInfo = {
                  position: result.dropPosition,
                  targetElement: blockElement,
                }
                onDragOver?.(event, dropInfo, editor)
              } else {
                dragIndicator.hide()
              }
            } catch (error) {
              console.error('🔧 FIX: DragOver error:', error)
              dragIndicator.hide()
            }
          }

          const handleDragLeave = (event: DragEvent) => {
            // 只有当离开整个编辑器区域时才隐藏指示器
            if (event.relatedTarget && !view.dom.contains(event.relatedTarget as HTMLElement)) {
              dragIndicator?.hide()
            }
          }

          const handleDropHandler = (event: DragEvent) => {
            console.log('🎯 [DEBUG] Drop event triggered:', {
              isDragging,
              dragSourceElement: dragSourceElement?.tagName,
              target: (event.target as HTMLElement)?.tagName,
              eventType: event.type
            })

            if (!isDragging || !dragSourceElement) {
              console.log('🔧 [DEBUG] Drop ignored - not in dragging state')
              return
            }

            event.preventDefault()
            event.stopPropagation()

            const target = event.target as HTMLElement
            const blockElement = findBlockElement(target)

            console.log('🎯 [DEBUG] Drop processing:', {
              target: target.tagName,
              blockElement: blockElement?.tagName,
              dragSourceElement: dragSourceElement.tagName,
              isSameElement: blockElement === dragSourceElement
            })

            if (blockElement && blockElement !== dragSourceElement) {
              const result = DropPositionCalculator.calculate(event, blockElement)

              // 🎯 NOTION风格：执行实际的节点移动
              try {
                console.log('🎯 开始执行拖拽操作', {
                  sourceElement: dragSourceElement.tagName + ': ' + dragSourceElement.textContent?.slice(0, 30),
                  targetElement: blockElement.tagName + ': ' + blockElement.textContent?.slice(0, 30),
                  dropPosition: result.dropPosition
                })

                // 🔧 FIX: 暂时跳过 'inside' 位置的实际移动，专注修复指示器显示
                if (result.dropPosition === 'inside') {
                  console.log('🎯 [临时] 跳过 inside 位置的节点移动，待后续实现')
                } else {
                  const success = executeNotionStyleMove(dragSourceElement, blockElement, result.dropPosition)
                  console.log(`🎯 Notion风格拖拽${success ? '成功' : '失败'}:`, {
                    source: dragSourceElement.tagName,
                    target: blockElement.tagName,
                    position: result.dropPosition,
                  })
                }
              } catch (error) {
                console.error('🔧 Notion拖拽执行失败:', error)
              }

              // 🎯 调用用户自定义回调
              const dropInfo: DropInfo = {
                position: result.dropPosition,
                targetElement: blockElement,
                horizontalPosition: result.horizontalPosition,
                confidence: result.confidence,
              }
              onDrop?.(event, dropInfo, editor)
            }

            // 重置状态
            isDragging = false
            dragSourceElement = null
            dragIndicator?.hide()
          }

          const handleDragEnd = () => {
            isDragging = false
            dragSourceElement = null
            dragIndicator?.hide()
          }

          // 🔧 FIX: 只有在指示器成功创建后才添加事件监听器
          if (dragIndicator) {
            // 添加事件监听器到document级别以捕获所有拖拽事件
            document.addEventListener('dragstart', handleDragStart, { passive: false })
            document.addEventListener('dragover', handleDragOver, { passive: false })
            document.addEventListener('dragleave', handleDragLeave, { passive: true })
            document.addEventListener('drop', handleDropHandler, { passive: false })
            document.addEventListener('dragend', handleDragEnd, { passive: true })

            // 🔧 FIX: 保存清理函数的引用，避免循环引用
            cleanupListeners = () => {
              document.removeEventListener('dragstart', handleDragStart)
              document.removeEventListener('dragover', handleDragOver)
              document.removeEventListener('dragleave', handleDragLeave)
              document.removeEventListener('drop', handleDropHandler)
              document.removeEventListener('dragend', handleDragEnd)
            }

            // 🔧 FIX: 将清理函数保存到全局范围，以便在主destroy中调用
            globalCleanupListeners = cleanupListeners
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

            // 🔧 FIX: 清理document级别的事件监听器，防止内存泄漏
            if (cleanupListeners) {
              cleanupListeners()
            }

            // 🎯 销毁现代化指示器
            dragIndicator?.destroy()
            dragIndicator = null
          },
        }
      },

      props: {
        handleDOMEvents: {
          keydown(view) {
            if (!element || locked) {
              return false
            }

            if (view.hasFocus()) {
              hideHandle()
              currentNode = null
              currentNodePos = -1
              onNodeChange?.({ editor, node: null, pos: -1 })

              // We want to still continue with other keydown events.
              return false
            }

            return false
          },
          mouseleave(_view, e) {
            // Do not hide open popup on mouseleave.
            if (locked) {
              return false
            }

            // If e.target is not inside the wrapper, hide.
            if (e.target && !wrapper.contains(e.relatedTarget as HTMLElement)) {
              hideHandle() // 使用延迟隐藏，提升用户体验

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
