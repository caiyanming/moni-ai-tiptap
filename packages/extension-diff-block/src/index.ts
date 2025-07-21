/**
 * @tiptap/extension-diff-block
 *
 * Git Diff 风格的 AI 操作确认扩展
 * 为 Moni AI Block Stream 提供无缝的编辑器内确认体验
 */

import { DiffBlock } from './diff-block.js'

export * from './diff-block.js'
export { DiffBlock }
export default DiffBlock

// ========================= 私有工具函数 =========================

/**
 * 从 BlockOperation 中提取内容文本
 */
function extractContentFromBlockOperation(blockOperation: any): string {
  if (!blockOperation.content) {return ''}

  const content = blockOperation.content

  // 字符串内容
  if (typeof content === 'string') {
    return content
  }

  // TipTap JSON 格式
  if (content.text) {
    return content.text
  }

  // 嵌套内容
  if (content.content && Array.isArray(content.content)) {
    return content.content
      .map((item: any) => extractContentFromBlockOperation({ content: item }))
      .filter(Boolean)
      .join('')
  }

  // 回退方案
  return JSON.stringify(content, null, 2)
}

// ========================= 工具函数导出 =========================

/**
 * DiffBlock 工具函数集合
 */
export const DiffBlockUtils = {
  /**
   * 创建 DiffOperation 对象
   */
  createDiffOperation: (
    type: 'insert' | 'update' | 'delete' | 'split' | 'merge',
    originalContent?: string,
    newContent?: string,
    targetId?: string,
    position?: number,
  ) => ({
    id: `diff-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    originalContent: originalContent || '',
    newContent: newContent || '',
    status: 'pending' as const,
    timestamp: Date.now(),
    targetId,
    position,
  }),

  /**
   * 检查节点是否为 DiffBlock
   */
  isDiffBlock: (node: any): boolean => {
    return node?.type?.name === 'diffBlock'
  },

  /**
   * 获取指定状态的所有 DiffBlock
   */
  getDiffBlocksByStatus: (doc: any, status: 'pending' | 'approved' | 'rejected') => {
    const blocks: any[] = []
    doc.descendants((node: any) => {
      if (node.type.name === 'diffBlock' && node.attrs.diffStatus === status) {
        blocks.push(node)
      }
    })
    return blocks
  },

  /**
   * 获取所有待处理的 DiffBlock 数量
   */
  getPendingDiffCount: (doc: any): number => {
    let count = 0
    doc.descendants((node: any) => {
      if (node.type.name === 'diffBlock' && node.attrs.diffStatus === 'pending') {
        count += 1
      }
    })
    return count
  },

  /**
   * 检查是否存在待处理的 DiffBlock
   */
  hasPendingDiffs: (doc: any): boolean => {
    return DiffBlockUtils.getPendingDiffCount(doc) > 0
  },

  /**
   * 从 Moni BlockOperation 转换为 DiffOperation
   */
  fromBlockOperation: (blockOperation: any) => {
    return DiffBlockUtils.createDiffOperation(
      blockOperation.type,
      blockOperation.originalContent,
      extractContentFromBlockOperation(blockOperation),
      blockOperation.targetId,
      blockOperation.position,
    )
  },

  /**
   * 获取操作类型的中文描述
   */
  getOperationDescription: (type: string): string => {
    const descriptions = {
      insert: '插入新内容',
      update: '更新现有内容',
      delete: '删除内容',
      split: '分割段落',
      merge: '合并段落',
    }
    return descriptions[type as keyof typeof descriptions] || '未知操作'
  },

  /**
   * 获取操作状态的中文描述
   */
  getStatusDescription: (status: string): string => {
    const descriptions = {
      pending: '等待确认',
      approved: '已批准',
      rejected: '已拒绝',
    }
    return descriptions[status as keyof typeof descriptions] || '未知状态'
  },
}

// ========================= 常量导出 =========================

/**
 * DiffBlock 相关的 CSS 类名
 */
export const DIFF_BLOCK_CLASSES = {
  // 基础类名
  DIFF_BLOCK: 'moni-diff-block',
  DIFF_HEADER: 'diff-header',
  DIFF_CONTENT: 'diff-content',
  DIFF_CONTROLS: 'diff-controls',

  // 状态类名
  PENDING: 'moni-diff-pending',
  APPROVED: 'moni-diff-approved',
  REJECTED: 'moni-diff-rejected',

  // 操作类型类名
  TYPE_INSERT: 'diff-type-insert',
  TYPE_UPDATE: 'diff-type-update',
  TYPE_DELETE: 'diff-type-delete',
  TYPE_SPLIT: 'diff-type-split',
  TYPE_MERGE: 'diff-type-merge',

  // Diff 行类名
  LINE_ADDED: 'diff-line-added',
  LINE_REMOVED: 'diff-line-removed',
  LINE_UNCHANGED: 'diff-line-unchanged',

  // 按钮类名
  APPROVE_BTN: 'diff-approve-btn',
  REJECT_BTN: 'diff-reject-btn',
} as const

/**
 * DiffBlock 默认样式配置
 */
export const DIFF_BLOCK_STYLES = {
  pending: {
    background: '#fef3c7', // yellow-100
    borderLeft: '4px solid #f59e0b', // yellow-500
    animation: 'pulse 2s infinite',
  },
  approved: {
    background: '#dcfce7', // green-100
    borderLeft: '4px solid #22c55e', // green-500
    transition: 'all 0.3s ease',
  },
  rejected: {
    background: '#fee2e2', // red-100
    borderLeft: '4px solid #ef4444', // red-500
    textDecoration: 'line-through',
    opacity: '0.6',
  },
} as const
