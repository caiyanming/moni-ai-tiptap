/**
 * Multi-Block Selection Types for TipTap Fork
 *
 * 多块选择功能的类型定义，支持 Notion-like 的多块操作
 */

/**
 * 块选择项
 */
export interface BlockSelection {
  /** 块的唯一标识符 */
  moniBlockId: string
  /** 块对应的 DOM 元素 */
  element: HTMLElement
  /** 块在文档中的位置 */
  position: {
    from: number
    to: number
  }
  /** 块的类型 */
  blockType: string
}

/**
 * 格式化属性
 */
export interface FormatAttributes {
  [key: string]: any
  level?: number // 用于标题级别
  color?: string // 用于文本颜色
  backgroundColor?: string // 用于背景色
}

/**
 * 多块选择状态
 */
export interface MultiBlockSelectionState {
  /** 当前选中的块 */
  selectedBlocks: BlockSelection[]
  /** 是否正在进行多块选择 */
  isSelecting: boolean
  /** 选择开始的块 */
  selectionStart: BlockSelection | null
  /** 最后激活的块（用于键盘导航） */
  lastActiveBlock: BlockSelection | null
}

/**
 * 多块选择操作接口
 */
export interface MultiBlockSelectionActions {
  /** 选择指定的块列表 */
  selectBlocks: (blocks: BlockSelection[]) => void

  /** 清除所有选择 */
  clearSelection: () => void

  /** 切换单个块的选择状态 */
  toggleSelection: (block: BlockSelection) => void

  /** 选择范围内的所有块 */
  selectRange: (from: BlockSelection, to: BlockSelection) => void

  /** 对选中的块应用格式 */
  applyFormatToSelection: (format: string, attrs?: FormatAttributes) => void

  /** 删除选中的块 */
  deleteSelectedBlocks: () => void

  /** 复制选中的块 */
  copySelectedBlocks: () => void

  /** 剪切选中的块 */
  cutSelectedBlocks: () => void

  /** 移动选中的块到指定位置 */
  moveSelectedBlocks: (targetPosition: number) => void
}

/**
 * useMultiBlockSelection 返回值
 */
export interface UseMultiBlockSelectionReturn extends MultiBlockSelectionState, MultiBlockSelectionActions {
  /** 是否有选中的块 */
  hasSelection: boolean

  /** 选中块的数量 */
  selectionCount: number

  /** 选中的块是否都是同一类型 */
  isHomogeneousSelection: boolean

  /** 选中块的主要类型（如果不是同构选择则返回null） */
  primaryBlockType: string | null
}

/**
 * Multi-Block Selection 配置选项
 */
export interface MultiBlockSelectionOptions {
  /** 是否启用多块选择 */
  enabled?: boolean

  /** 是否启用键盘快捷键 */
  enableKeyboardShortcuts?: boolean

  /** 是否启用拖拽选择 */
  enableDragSelection?: boolean

  /** 最大选择块数量限制 */
  maxSelectionCount?: number

  /** 自定义选择样式类名 */
  selectionClassName?: string

  /** 选择变化回调 */
  onSelectionChange?: (selection: BlockSelection[]) => void

  /** 格式应用回调 */
  onFormatApply?: (format: string, attrs: FormatAttributes | undefined, blocks: BlockSelection[]) => void
}
