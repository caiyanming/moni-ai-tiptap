import type { Editor } from '@tiptap/core'
import type { Node } from '@tiptap/pm/model'

export type FindElementNextToCoords = {
  x: number
  y: number
  direction?: 'left' | 'right'
  editor: Editor
}

export const findElementNextToCoords = (options: FindElementNextToCoords) => {
  const { x, y, direction, editor } = options
  let resultElement: HTMLElement | null = null
  let resultNode: Node | null = null
  let pos: number | null = null

  let currentX = x

  // 🔧 FIX: 防止无限循环 - 限制最大迭代次数和搜索范围
  const maxIterations = 100 // 最多搜索100像素
  const maxSearchDistance = 200 // 最大搜索距离200像素
  let iterations = 0

  // 🔧 FIX: 添加安全检查
  if (typeof window === 'undefined' || !editor.view.dom.isConnected) {
    return { resultElement: null, resultNode: null, pos: null }
  }

  const searchLimit =
    direction === 'left' ? Math.max(0, x - maxSearchDistance) : Math.min(window.innerWidth, x + maxSearchDistance)

  while (resultNode === null && currentX < window.innerWidth && currentX > 0 && iterations < maxIterations) {
    // 🔧 FIX: 检查搜索边界
    if (direction === 'left' && currentX <= searchLimit) {
      break
    }
    if (direction === 'right' && currentX >= searchLimit) {
      break
    }

    try {
      const allElements = document.elementsFromPoint(currentX, y)
      const prosemirrorIndex = allElements.findIndex(element => element.classList.contains('ProseMirror'))
      const filteredElements = allElements.slice(0, prosemirrorIndex)

      if (filteredElements.length > 0) {
        const target = filteredElements[0]

        resultElement = target as HTMLElement
        pos = editor.view.posAtDOM(target, 0)

        if (pos >= 0) {
          resultNode = editor.state.doc.nodeAt(Math.max(pos - 1, 0))

          if (resultNode?.isText) {
            resultNode = editor.state.doc.nodeAt(Math.max(pos - 1, 0))
          }

          if (!resultNode) {
            resultNode = editor.state.doc.nodeAt(Math.max(pos, 0))
          }

          break
        }
      }
    } catch (error) {
      // 🔧 FIX: 处理DOM操作异常，避免崩溃
      console.warn('findElementNextToCoords: DOM操作异常', error)
      break
    }

    if (direction === 'left') {
      currentX -= 1
    } else {
      currentX += 1
    }

    iterations += 1
  }

  return { resultElement, resultNode, pos: pos ?? null }
}
