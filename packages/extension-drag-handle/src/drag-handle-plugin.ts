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
  onDragEnd?: (event: DragEvent, editor: Editor) => void
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
  onDragEnd,
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
    pluginKey: typeof pluginKey === 'string' ? pluginKey : (pluginKey as any).spec?.key || 'unknown',
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

  function onDragEndHandler(e: DragEvent) {
    hideHandle()
    if (element) {
      element.style.pointerEvents = 'auto'
    }

    // 🎯 拖拽结束时隐藏指示器
    dragIndicator?.hide()

    // 🎯 调用用户自定义的拖拽结束回调
    onDragEnd?.(e, editor)
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
            console.log('🔍 [DEBUG] 查找块级元素', {
              target: target.tagName,
              className: target.className,
              id: target.id,
              textContent: target.textContent?.slice(0, 30),
            })

            // 首先尝试查找具有 data-moni-block-id 的元素
            let blockElement = target.closest('[data-moni-block-id]') as HTMLElement | null

            if (blockElement) {
              console.log('✅ [DEBUG] 找到带有 data-moni-block-id 的块级元素', {
                tag: blockElement.tagName,
                blockId: blockElement.getAttribute('data-moni-block-id'),
                textContent: blockElement.textContent?.slice(0, 30),
              })
              return blockElement
            }

            // 如果没有找到 data-moni-block-id，尝试查找块级节点（p, h1-h6, blockquote 等）
            blockElement = target.closest(
              'p, h1, h2, h3, h4, h5, h6, blockquote, pre, div[data-type]',
            ) as HTMLElement | null

            if (blockElement) {
              console.log('✅ [DEBUG] 找到标准块级元素', {
                tag: blockElement.tagName,
                dataType: blockElement.getAttribute('data-type'),
                textContent: blockElement.textContent?.slice(0, 30),
              })
              return blockElement
            }

            console.log('❌ [DEBUG] 未找到块级元素')
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
              console.log('🎯 [DEBUG] executeNotionStyleMove 开始执行', {
                sourceElement: sourceElement.tagName,
                targetElement: targetElement.tagName,
                position,
                viewExists: !!view,
                editorViewExists: !!editor?.view,
              })

              // 🔧 FIX: 改进DOM到ProseMirror位置的查找逻辑
              // 优先尝试 data-moni-block-id，如果不存在则直接使用DOM元素
              const sourceMoniBlockId = sourceElement.getAttribute('data-moni-block-id')
              const targetMoniBlockId = targetElement.getAttribute('data-moni-block-id')

              console.log('🔍 [DEBUG] Block ID 信息:', {
                sourceMoniBlockId,
                targetMoniBlockId,
                sourceText: sourceElement.textContent?.slice(0, 30),
                targetText: targetElement.textContent?.slice(0, 30),
              })

              // 尝试多种方式查找ProseMirror位置
              let sourcePos = view.posAtDOM(sourceElement, 0)
              let targetPos = view.posAtDOM(targetElement, 0)

              console.log('🔍 [DEBUG] 初始位置查找结果:', { sourcePos, targetPos })

              // 如果直接查找失败，尝试查找子元素
              if (sourcePos === -1) {
                console.log('🔍 [DEBUG] 源元素直接查找失败，尝试子元素')
                const sourceChild = sourceElement.querySelector('[data-type]') || sourceElement.firstElementChild
                if (sourceChild) {
                  sourcePos = view.posAtDOM(sourceChild as HTMLElement, 0)
                  console.log('🔍 [DEBUG] 源元素子元素查找结果:', sourcePos)
                }
              }

              if (targetPos === -1) {
                console.log('🔍 [DEBUG] 目标元素直接查找失败，尝试子元素')
                const targetChild = targetElement.querySelector('[data-type]') || targetElement.firstElementChild
                if (targetChild) {
                  targetPos = view.posAtDOM(targetChild as HTMLElement, 0)
                  console.log('🔍 [DEBUG] 目标元素子元素查找结果:', targetPos)
                }
              }

              if (sourcePos === -1 || targetPos === -1) {
                console.warn('🔍 [DEBUG] 改进查找后仍无法找到DOM对应的ProseMirror位置', { sourcePos, targetPos })
                return false
              }

              console.log('✅ [DEBUG] 找到ProseMirror位置', { sourcePos, targetPos })

              const { state } = view
              const { doc, tr } = state

              console.log('🔧 [DEBUG] 准备解析文档位置:', {
                docSize: doc.content.size,
                sourcePos,
                targetPos,
              })

              // 找到包含的块级节点
              const sourceResolve = doc.resolve(sourcePos)
              const targetResolve = doc.resolve(targetPos)

              console.log('🔧 [DEBUG] 文档位置解析完成:', {
                sourceResolveDepth: sourceResolve.depth,
                targetResolveDepth: targetResolve.depth,
              })

              // 找到最近的块级节点位置
              console.log('🔧 [DEBUG] 开始查找块级节点位置')
              const sourceBlockPos = findBlockPosition(sourceResolve)
              const targetBlockPos = findBlockPosition(targetResolve)

              // 🔧 FIX: 确保我们获取的是完整的块级节点，而不是文本节点
              console.log('🔧 [DEBUG] 检查resolves节点层级:', {
                sourceDepth: sourceResolve.depth,
                sourceParentNode:
                  sourceResolve.depth > 0 ? sourceResolve.node(sourceResolve.depth - 1)?.type?.name : 'none',
                targetDepth: targetResolve.depth,
                targetParentNode:
                  targetResolve.depth > 0 ? targetResolve.node(targetResolve.depth - 1)?.type?.name : 'none',
              })

              console.log('🔧 [DEBUG] 块级节点位置查找结果:', {
                sourceBlockPos,
                targetBlockPos,
                hasSourceBlock: !!sourceBlockPos,
                hasTargetBlock: !!targetBlockPos,
              })

              if (sourceBlockPos === null || targetBlockPos === null) {
                console.warn('🔧 [DEBUG] 无法找到块级节点位置')
                return false
              }

              console.log('🔧 [DEBUG] 尝试获取源节点:', {
                sourceBlockPos: sourceBlockPos.pos,
                sourceBlockSize: sourceBlockPos.size,
              })

              // 🔧 FIX: 使用resolve来获取正确的块级节点
              const sourceNodeResolve = doc.resolve(sourceBlockPos.pos)
              let sourceNode = null

              // 查找真正的块级节点（段落等）
              for (let depth = sourceNodeResolve.depth; depth >= 1; depth -= 1) {
                const nodeAtDepth = sourceNodeResolve.node(depth)
                if (nodeAtDepth.isBlock && nodeAtDepth.type.name !== 'doc') {
                  sourceNode = nodeAtDepth
                  console.log(`🔧 [DEBUG] 在深度${depth}找到块级节点:`, nodeAtDepth.type.name)
                  break
                }
              }

              if (!sourceNode) {
                console.warn('🔧 [DEBUG] 无法找到块级源节点')
                return false
              }

              console.log('🔧 [DEBUG] 成功获取源节点:', {
                nodeType: sourceNode.type.name,
                nodeSize: sourceNode.nodeSize,
                nodeText: sourceNode.textContent?.slice(0, 30),
                isBlock: sourceNode.isBlock,
              })

              // 计算插入位置
              let insertPos: number
              if (position === 'above') {
                insertPos = targetBlockPos.pos
              } else if (position === 'below') {
                insertPos = targetBlockPos.pos + targetBlockPos.size
              } else {
                return false // 暂不支持inside
              }

              // 🎯 使用ProseMirror的replaceRangeWith方法进行原子性节点移动
              console.log('🔧 [DEBUG] 使用ProseMirror原子性replaceRangeWith方法执行节点移动')

              const sourceFrom = sourceBlockPos.pos
              const sourceTo = sourceBlockPos.pos + sourceBlockPos.size

              console.log('🔧 [DEBUG] 移动操作参数:', {
                sourceNode: sourceNode.type.name,
                sourceText: sourceNode.textContent?.slice(0, 30),
                sourceFrom,
                sourceTo,
                position,
                docSizeBefore: doc.content.size,
              })

              // 重用之前计算的insertPos位置

              console.log('🔧 [DEBUG] 插入位置计算:', {
                targetBlockPos: targetBlockPos.pos,
                targetBlockSize: targetBlockPos.size,
                insertPos,
                sourceComesFirst: sourceFrom < insertPos,
              })

              // 🎯 修复：使用正确的ProseMirror节点移动方法
              // 参考DragOperationManager的正确实现
              let newTr = tr

              console.log('🔧 [DEBUG] 使用修复后的节点移动逻辑')

              if (sourceFrom < insertPos) {
                // 源节点在目标位置前面：先删除源节点，然后调整插入位置
                console.log('🔧 [DEBUG] 源在前：先删除，调整位置，再插入')

                // 1. 先删除源节点
                newTr = newTr.delete(sourceFrom, sourceTo)

                // 2. 调整插入位置（因为删除了前面的内容，位置需要减少）
                const adjustedInsertPos = insertPos - sourceBlockPos.size
                console.log('🔧 [DEBUG] 调整插入位置从', insertPos, '到', adjustedInsertPos)

                // 3. 在调整后的位置插入节点
                newTr = newTr.insert(adjustedInsertPos, sourceNode)
              } else {
                // 源节点在目标位置后面：先删除源节点，再插入到目标位置
                console.log('🔧 [DEBUG] 源在后：先删除后插入')

                // 1. 先删除源节点
                newTr = newTr.delete(sourceFrom, sourceTo)

                // 2. 在目标位置插入节点（位置无需调整，因为删除的在后面）
                newTr = newTr.insert(insertPos, sourceNode)
              }

              console.log('🔧 [DEBUG] 事务构建完成:', {
                stepCount: newTr.steps.length,
                docChanged: newTr.docChanged,
                newDocSize: newTr.doc.content.size,
              })

              // 应用事务
              console.log('🔧 [DEBUG] 准备dispatch事务:', {
                hasNewTr: !!newTr,
                trSteps: newTr?.steps?.length,
                docSizeBefore: view.state.doc.content.size,
                docSizeAfter: newTr?.doc?.content?.size,
              })

              view.dispatch(newTr)

              console.log('✅ [DEBUG] 事务已成功dispatched')

              return true
            } catch (error) {
              // 尝试多种方式捕获错误信息
              let errorInfo = 'Unknown error'
              try {
                if (error && typeof error === 'object') {
                  const err = error as any
                  errorInfo = JSON.stringify(
                    {
                      name: err.name,
                      message: err.message,
                      stack: err.stack?.slice(0, 300),
                      constructor: err.constructor?.name,
                      toString: err.toString?.(),
                    },
                    null,
                    2,
                  )
                } else {
                  errorInfo = String(error)
                }
              } catch {
                errorInfo = `Error serialization failed: ${String(error)}`
              }

              console.error('🎯 [DEBUG] executeNotionStyleMove详细错误:', {
                error: errorInfo,
                context: {
                  docSize: view.state.doc.content.size,
                },
              })
              return false
            }
          }

          const handleDragStart = (event: DragEvent) => {
            // 🔧 添加全局事件计数器用于调试
            if (!(window as any).dragEventCounter) {
              ;(window as any).dragEventCounter = { dragstart: 0, drop: 0 }
            }
            ;(window as any).dragEventCounter.dragstart += 1

            console.log('🎯 [PLUGIN-DEBUG] DragStart event triggered:', {
              eventCount: (window as any).dragEventCounter.dragstart,
              target: (event.target as HTMLElement)?.tagName,
              targetId: (event.target as HTMLElement)?.id,
              targetClasses: (event.target as HTMLElement)?.className,
              targetText: (event.target as HTMLElement)?.textContent?.slice(0, 30),
              dragIndicatorExists: !!dragIndicator,
              eventType: event.type,
              isTrusted: event.isTrusted,
              bubbles: event.bubbles,
              cancelable: event.cancelable,
              dataTransferTypes: event.dataTransfer?.types || [],
              composedPath: event
                .composedPath?.()
                ?.map(el => (el as HTMLElement)?.tagName)
                .filter(Boolean)
                .join(' -> '),
            })

            if (!dragIndicator) {
              console.log('🔧 dragIndicator 不存在，跳过拖拽开始处理')
              return // 🔧 FIX: 防止在指示器不存在时处理事件
            }

            isDragging = true

            // FIX: 使用插件正在追踪的当前节点对应的 DOM 元素，而不是 event.target
            // currentNodePos 是插件在 hover 时记录的实际块位置
            if (currentNodePos >= 0) {
              const actualBlockElement = view.nodeDOM(currentNodePos) as HTMLElement
              if (actualBlockElement) {
                dragSourceElement = actualBlockElement
                console.log('✅ [PLUGIN] 使用插件追踪的块元素:', {
                  pos: currentNodePos,
                  element: actualBlockElement.tagName,
                  blockId: actualBlockElement.getAttribute('data-moni-block-id'),
                  text: actualBlockElement.textContent?.slice(0, 30),
                })
              } else {
                // 备用方案：从 event.target 查找
                dragSourceElement = event.target as HTMLElement
                const sourceBlockElement = findBlockElement(dragSourceElement)
                if (sourceBlockElement) {
                  dragSourceElement = sourceBlockElement
                }
              }
            } else {
              // 备用方案：从 event.target 查找
              dragSourceElement = event.target as HTMLElement
              const sourceBlockElement = findBlockElement(dragSourceElement)
              if (sourceBlockElement) {
                dragSourceElement = sourceBlockElement
              }
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

                // FIX: 不显示未实现的 'inside' 位置
                if (result.dropPosition === 'inside') {
                  dragIndicator.hide()
                  console.log('⚠️ [DRAG] 隐藏 inside 指示器 - 功能未实现')
                  return
                }

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
            // 🔧 添加全局事件计数器用于调试
            if (!(window as any).dragEventCounter) {
              ;(window as any).dragEventCounter = { dragstart: 0, drop: 0 }
            }
            ;(window as any).dragEventCounter.drop += 1

            console.log('🎯 [PLUGIN-DEBUG] Drop handler called:', {
              eventCount: (window as any).dragEventCounter.drop,
              target: (event.target as HTMLElement)?.tagName,
              targetText: (event.target as HTMLElement)?.textContent?.slice(0, 30),
              coordinates: { x: event.clientX, y: event.clientY },
              dataTransfer: event.dataTransfer?.getData('text/html') || 'no-data',
              isDragging,
              dragSourceElement: dragSourceElement?.tagName,
              eventType: event.type,
              isTrusted: event.isTrusted,
              bubbles: event.bubbles,
              cancelable: event.cancelable,
              eventPhase: event.eventPhase,
              composedPath: event
                .composedPath?.()
                ?.map(el => (el as HTMLElement)?.tagName)
                .filter(Boolean)
                .join(' -> '),
            })

            if (!isDragging || !dragSourceElement) {
              console.log('🔧 [DEBUG] Drop ignored - not in dragging state', {
                isDragging,
                hasDragSourceElement: !!dragSourceElement,
              })
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
              isSameElement: blockElement === dragSourceElement,
            })

            if (blockElement && blockElement !== dragSourceElement) {
              const result = DropPositionCalculator.calculate(event, blockElement)

              // FIX: 完全跳过未实现的 'inside' 功能
              if (result.dropPosition === 'inside') {
                console.log('⚠️ [DROP] 忽略 inside 位置 - 功能未实现')
                dragIndicator?.hide()
                isDragging = false
                dragSourceElement = null
                return
              }

              // 🎯 NOTION风格：执行实际的节点移动
              try {
                console.log('🎯 [DEBUG] 开始执行拖拽操作', {
                  sourceElement: `${dragSourceElement.tagName}: ${dragSourceElement.textContent?.slice(0, 30) ?? ''}`,
                  targetElement: `${blockElement.tagName}: ${blockElement.textContent?.slice(0, 30) ?? ''}`,
                  dropPosition: result.dropPosition,
                  executeFunction: typeof executeNotionStyleMove,
                })

                console.log('🎯 [DEBUG] 调用 executeNotionStyleMove 函数')
                const success = executeNotionStyleMove(dragSourceElement, blockElement, result.dropPosition)
                console.log(`🎯 [DEBUG] Notion风格拖拽${success ? '成功' : '失败'}:`, {
                  success,
                  source: dragSourceElement.tagName,
                  target: blockElement.tagName,
                  position: result.dropPosition,
                })
              } catch (error) {
                console.error('🔧 [DEBUG] Notion拖拽执行失败:', error)
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
