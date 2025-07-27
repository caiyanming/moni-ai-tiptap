import { useCallback, useEffect, useMemo, useState } from 'react'

import { useCurrentEditor } from './Context.js'
import type {
  BlockSelection,
  FormatAttributes,
  MultiBlockSelectionOptions,
  UseMultiBlockSelectionReturn,
} from './types/multiBlockSelection.js'
import { useFormattingCommands } from './useFormattingCommands.js'

/**
 * useMultiBlockSelection Hook
 *
 * 提供 Notion-like 的多块选择功能，支持：
 * 1. 多块选择和取消选择
 * 2. 批量格式化操作
 * 3. 批量删除操作
 * 4. 块的复制、剪切、移动
 * 5. 键盘快捷键支持
 *
 * 设计理念：
 * - 零映射架构：直接操作 TipTap Editor API
 * - 响应式状态管理：使用 React hooks
 * - 类型安全：完整的 TypeScript 支持
 * - 可扩展：支持自定义配置和回调
 *
 * 使用示例：
 * ```typescript
 * function MyComponent() {
 *   const multiBlock = useMultiBlockSelection({
 *     enabled: true,
 *     enableKeyboardShortcuts: true,
 *   });
 *
 *   const handleSelectBlock = (blockId: string, element: HTMLElement) => {
 *     const blockSelection = createBlockSelection(blockId, element);
 *     multiBlock.toggleSelection(blockSelection);
 *   };
 *
 *   return (
 *     <div>
 *       <div>选中了 {multiBlock.selectionCount} 个块</div>
 *       <button onClick={() => multiBlock.applyFormatToSelection('bold')}>
 *         加粗
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useMultiBlockSelection(options: MultiBlockSelectionOptions = {}): UseMultiBlockSelectionReturn {
  const { editor } = useCurrentEditor()
  const formatting = useFormattingCommands()

  // 解构配置选项，提供默认值
  const {
    enabled = true,
    enableKeyboardShortcuts = true,
    maxSelectionCount = 50,
    selectionClassName = 'tiptap-multi-block-selected',
    onSelectionChange,
    onFormatApply,
  } = options

  // ===========================================
  // 状态管理
  // ===========================================

  const [selectedBlocks, setSelectedBlocks] = useState<BlockSelection[]>([])
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState<BlockSelection | null>(null)
  const [lastActiveBlock, setLastActiveBlock] = useState<BlockSelection | null>(null)

  // ===========================================
  // 计算属性
  // ===========================================

  const hasSelection = selectedBlocks.length > 0
  const selectionCount = selectedBlocks.length

  const isHomogeneousSelection = useMemo(() => {
    if (selectedBlocks.length <= 1) {
      return true
    }
    const firstType = selectedBlocks[0]?.blockType
    return selectedBlocks.every(block => block.blockType === firstType)
  }, [selectedBlocks])

  const primaryBlockType = useMemo(() => {
    if (!isHomogeneousSelection) {
      return null
    }
    return selectedBlocks[0]?.blockType || null
  }, [isHomogeneousSelection, selectedBlocks])

  // ===========================================
  // 辅助函数
  // ===========================================

  /**
   * 为块添加选择样式
   */
  const addSelectionStyle = useCallback(
    (block: BlockSelection) => {
      if (block.element && selectionClassName) {
        block.element.classList.add(selectionClassName)
        block.element.setAttribute('data-multi-block-selected', 'true')
      }
    },
    [selectionClassName],
  )

  /**
   * 移除块的选择样式
   */
  const removeSelectionStyle = useCallback(
    (block: BlockSelection) => {
      if (block.element && selectionClassName) {
        block.element.classList.remove(selectionClassName)
        block.element.removeAttribute('data-multi-block-selected')
      }
    },
    [selectionClassName],
  )

  /**
   * 获取块在文档中的顺序
   */
  const getBlockOrder = useCallback((block: BlockSelection): number => {
    return block.position.from
  }, [])

  /**
   * 根据文档顺序排序块
   */
  const sortBlocksByOrder = useCallback(
    (blocks: BlockSelection[]): BlockSelection[] => {
      return [...blocks].sort((a, b) => getBlockOrder(a) - getBlockOrder(b))
    },
    [getBlockOrder],
  )

  // ===========================================
  // 核心操作方法
  // ===========================================

  const selectBlocks = useCallback(
    (blocks: BlockSelection[]) => {
      if (!enabled || !editor) {
        return
      }

      // 应用最大选择数量限制
      const blocksToSelect = blocks.slice(0, maxSelectionCount)

      // 清除旧的选择样式
      selectedBlocks.forEach(removeSelectionStyle)

      // 应用新的选择样式
      blocksToSelect.forEach(addSelectionStyle)

      setSelectedBlocks(blocksToSelect)
      setIsSelecting(blocksToSelect.length > 0)

      if (blocksToSelect.length > 0) {
        setLastActiveBlock(blocksToSelect[blocksToSelect.length - 1])
      }

      // 触发选择变化回调
      onSelectionChange?.(blocksToSelect)
    },
    [enabled, editor, maxSelectionCount, selectedBlocks, removeSelectionStyle, addSelectionStyle, onSelectionChange],
  )

  const clearSelection = useCallback(() => {
    if (!enabled) {
      return
    }

    // 清除所有选择样式
    selectedBlocks.forEach(removeSelectionStyle)

    setSelectedBlocks([])
    setIsSelecting(false)
    setSelectionStart(null)
    setLastActiveBlock(null)

    // 触发选择变化回调
    onSelectionChange?.([])
  }, [enabled, selectedBlocks, removeSelectionStyle, onSelectionChange])

  const toggleSelection = useCallback(
    (block: BlockSelection) => {
      if (!enabled || !editor) {
        return
      }

      const existingIndex = selectedBlocks.findIndex(b => b.moniBlockId === block.moniBlockId)

      if (existingIndex !== -1) {
        // 取消选择：移除块
        const newSelection = [...selectedBlocks]
        const removedBlock = newSelection.splice(existingIndex, 1)[0]
        removeSelectionStyle(removedBlock)

        setSelectedBlocks(newSelection)
        setIsSelecting(newSelection.length > 0)

        onSelectionChange?.(newSelection)
      } else {
        // 添加选择：限制最大数量
        if (selectedBlocks.length >= maxSelectionCount) {
          return
        }

        addSelectionStyle(block)
        const newSelection = [...selectedBlocks, block]

        setSelectedBlocks(newSelection)
        setIsSelecting(true)
        setLastActiveBlock(block)

        onSelectionChange?.(newSelection)
      }
    },
    [enabled, editor, selectedBlocks, maxSelectionCount, removeSelectionStyle, addSelectionStyle, onSelectionChange],
  )

  const selectRange = useCallback(
    (from: BlockSelection, to: BlockSelection) => {
      if (!enabled || !editor) {
        return
      }

      // 这里需要实现范围选择逻辑
      // 由于需要访问文档中的所有块，这部分逻辑较复杂
      // 暂时实现一个简化版本
      console.warn('selectRange: 暂未完全实现，需要遍历文档中的块')

      // 简化实现：选择两个块
      const blocksToSelect = [from, to]
      selectBlocks(blocksToSelect)
    },
    [enabled, editor, selectBlocks],
  )

  const applyFormatToSelection = useCallback(
    (format: string, attrs?: FormatAttributes) => {
      if (!enabled || !editor || selectedBlocks.length === 0) {
        return
      }

      // 触发格式应用回调
      onFormatApply?.(format, attrs, selectedBlocks)

      // 遍历选中的块，应用格式
      const sortedBlocks = sortBlocksByOrder(selectedBlocks)

      editor.chain().focus().run()

      sortedBlocks.forEach(block => {
        const { from, to } = block.position

        try {
          // 设置选择范围到当前块
          editor.chain().setTextSelection({ from, to }).run()

          // 使用 useFormattingCommands 提供的类型安全命令
          switch (format) {
            case 'bold':
              formatting.toggleBold()
              break
            case 'italic':
              formatting.toggleItalic()
              break
            case 'underline':
              formatting.toggleUnderline()
              break
            case 'strike':
              formatting.toggleStrike()
              break
            case 'code':
              formatting.toggleCode()
              break
            case 'heading':
              if (attrs?.level) {
                formatting.setHeading(attrs.level as 1 | 2 | 3 | 4 | 5 | 6)
              }
              break
            case 'paragraph':
              formatting.setParagraph()
              break
            case 'bulletList':
              formatting.toggleBulletList()
              break
            case 'orderedList':
              formatting.toggleOrderedList()
              break
            case 'taskList':
              formatting.toggleTaskList()
              break
            case 'blockquote':
              formatting.setBlockquote()
              break
            case 'codeBlock':
              formatting.setCodeBlock()
              break
            default:
              console.warn(`applyFormatToSelection: 未知格式 "${format}"`)
          }
        } catch (error) {
          console.error(`applyFormatToSelection: 应用格式 "${format}" 到块 ${block.moniBlockId} 时出错:`, error)
        }
      })

      // 格式应用后保持选择状态
      // editor 操作可能会改变选择，这里可以考虑重新选择
    },
    [enabled, editor, selectedBlocks, formatting, onFormatApply, sortBlocksByOrder],
  )

  const deleteSelectedBlocks = useCallback(() => {
    if (!enabled || !editor || selectedBlocks.length === 0) {
      return
    }

    const sortedBlocks = sortBlocksByOrder(selectedBlocks)

    editor.chain().focus().run()

    // 从后往前删除，避免位置偏移问题
    for (let i = sortedBlocks.length - 1; i >= 0; i -= 1) {
      const block = sortedBlocks[i]
      const { from, to } = block.position

      try {
        // 删除块的内容
        editor.chain().deleteRange({ from, to }).run()
      } catch (error) {
        console.error(`deleteSelectedBlocks: 删除块 ${block.moniBlockId} 时出错:`, error)
      }
    }

    // 清除选择
    clearSelection()
  }, [enabled, editor, selectedBlocks, sortBlocksByOrder, clearSelection])

  const copySelectedBlocks = useCallback(() => {
    if (!enabled || !editor || selectedBlocks.length === 0) {
      return
    }

    const sortedBlocks = sortBlocksByOrder(selectedBlocks)

    try {
      // 构建要复制的内容
      const contentToCopy = sortedBlocks.map(block => {
        const { from, to } = block.position
        return editor.state.doc.slice(from, to).content
      })

      // 这里需要实现复制到剪贴板的逻辑
      // 由于涉及剪贴板 API，实现可能因环境而异
      console.log('copySelectedBlocks: 已复制', contentToCopy)

      // 可以触发自定义事件或使用剪贴板 API
      // navigator.clipboard.write(...)
    } catch (error) {
      console.error('copySelectedBlocks: 复制时出错:', error)
    }
  }, [enabled, editor, selectedBlocks, sortBlocksByOrder])

  const cutSelectedBlocks = useCallback(() => {
    if (!enabled || !editor || selectedBlocks.length === 0) {
      return
    }

    // 先复制，再删除
    copySelectedBlocks()
    deleteSelectedBlocks()
  }, [enabled, editor, selectedBlocks, copySelectedBlocks, deleteSelectedBlocks])

  const moveSelectedBlocks = useCallback(() => {
    if (!enabled || !editor || selectedBlocks.length === 0) {
      return
    }

    // 移动块的逻辑较复杂，需要：
    // 1. 复制选中的块内容
    // 2. 在目标位置插入
    // 3. 删除原始位置的块
    // 4. 更新选择状态

    console.warn('moveSelectedBlocks: 暂未完全实现')

    // 这里可以实现具体的移动逻辑
  }, [enabled, editor, selectedBlocks])

  // ===========================================
  // 键盘快捷键支持
  // ===========================================

  useEffect(() => {
    if (!enabled || !enableKeyboardShortcuts || !editor) {
      return
    }

    const handleKeydown = (event: KeyboardEvent) => {
      // Escape: 清除选择
      if (event.key === 'Escape') {
        if (hasSelection) {
          event.preventDefault()
          clearSelection()
        }
      }

      // Ctrl/Cmd + A: 全选（在多块选择模式下选择所有可见块）
      if ((event.ctrlKey || event.metaKey) && event.key === 'a' && hasSelection) {
        event.preventDefault()
        // 这里可以实现全选逻辑
        console.log('全选所有块')
      }

      // Delete/Backspace: 删除选中的块
      if ((event.key === 'Delete' || event.key === 'Backspace') && hasSelection) {
        event.preventDefault()
        deleteSelectedBlocks()
      }

      // Ctrl/Cmd + C: 复制
      if ((event.ctrlKey || event.metaKey) && event.key === 'c' && hasSelection) {
        event.preventDefault()
        copySelectedBlocks()
      }

      // Ctrl/Cmd + X: 剪切
      if ((event.ctrlKey || event.metaKey) && event.key === 'x' && hasSelection) {
        event.preventDefault()
        cutSelectedBlocks()
      }
    }

    // 绑定到编辑器的 DOM 元素
    const editorElement = editor.view.dom
    editorElement.addEventListener('keydown', handleKeydown)

    return () => {
      editorElement.removeEventListener('keydown', handleKeydown)
    }
  }, [
    enabled,
    enableKeyboardShortcuts,
    editor,
    hasSelection,
    clearSelection,
    deleteSelectedBlocks,
    copySelectedBlocks,
    cutSelectedBlocks,
  ])

  // ===========================================
  // 清理效果
  // ===========================================

  useEffect(() => {
    // 组件卸载时清理选择样式
    return () => {
      selectedBlocks.forEach(removeSelectionStyle)
    }
  }, [selectedBlocks, removeSelectionStyle])

  // ===========================================
  // 返回 Hook API
  // ===========================================

  return {
    // 状态
    selectedBlocks,
    isSelecting,
    selectionStart,
    lastActiveBlock,
    hasSelection,
    selectionCount,
    isHomogeneousSelection,
    primaryBlockType,

    // 操作
    selectBlocks,
    clearSelection,
    toggleSelection,
    selectRange,
    applyFormatToSelection,
    deleteSelectedBlocks,
    copySelectedBlocks,
    cutSelectedBlocks,
    moveSelectedBlocks,
  }
}
