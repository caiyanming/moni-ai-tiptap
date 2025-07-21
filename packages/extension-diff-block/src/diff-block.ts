/**
 * DiffBlock Extension - Git Diff 风格的 AI 操作确认
 *
 * 核心特性：
 * - 直接在编辑器中显示 git diff 风格的内容对比
 * - 修改前内容：红色背景 + 删除线
 * - 修改后内容：绿色背景
 * - 内联的确认/拒绝按钮
 * - 无缝融入编辑器流程，真正的所见即所得
 */

import { mergeAttributes, Node } from '@tiptap/core'
// import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'

// ========================= 类型定义 =========================

export interface DiffBlockOptions {
  HTMLAttributes: Record<string, any>
  showControls: boolean
  autoApprove: boolean
  diffStyles: {
    pending: string
    approved: string
    rejected: string
  }
  onApprove?: (operationId: string) => Promise<void>
  onReject?: (operationId: string) => Promise<void>
}

export interface DiffOperation {
  id: string
  type: 'insert' | 'update' | 'delete' | 'split' | 'merge'
  originalContent?: string
  newContent?: string
  status: 'pending' | 'approved' | 'rejected'
  timestamp: number
  targetId?: string
  position?: number
}

// 扩展 TipTap Commands 接口
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    diffBlock: {
      /**
       * 插入 DiffBlock 到编辑器
       */
      insertDiffBlock: (operation: DiffOperation) => ReturnType

      /**
       * 批准指定的 diff 操作
       */
      approveDiff: (operationId: string) => ReturnType

      /**
       * 拒绝指定的 diff 操作
       */
      rejectDiff: (operationId: string) => ReturnType

      /**
       * 应用所有已批准的 diff 操作
       */
      applyAllDiffs: () => ReturnType

      /**
       * 清除所有 diff blocks
       */
      clearAllDiffs: () => ReturnType
    }
  }
}

// ========================= 工具函数 =========================

/**
 * 提取文本内容（支持多种格式）
 */
function extractTextContent(content: any): string {
  if (typeof content === 'string') {
    return content
  }

  if (content && typeof content === 'object') {
    // TipTap JSON 格式
    if (content.text) {
      return content.text
    }

    // 嵌套内容数组
    if (content.content && Array.isArray(content.content)) {
      return content.content
        .map((item: any) => extractTextContent(item))
        .filter(Boolean)
        .join('')
    }

    // 字符串内容
    if (content.content && typeof content.content === 'string') {
      return content.content
    }
  }

  // 回退到 JSON 字符串
  return JSON.stringify(content, null, 2)
}

/**
 * 添加控制按钮到 diff block 元素
 */
function addControlButtonsToElement(element: HTMLElement, diffId: string, editorView: EditorView) {
  const controlsContainer = document.createElement('div')
  controlsContainer.className = 'diff-controls'
  controlsContainer.style.cssText = `
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 4px;
    z-index: 10;
  `

  // 批准按钮
  const approveBtn = document.createElement('button')
  approveBtn.innerHTML = '✓'
  approveBtn.className = 'diff-approve-btn'
  approveBtn.style.cssText = `
    background: #22c55e;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 12px;
    cursor: pointer;
    transition: background-color 0.2s;
  `
  approveBtn.title = '批准此更改'

  approveBtn.onmouseover = () => {
    approveBtn.style.background = '#16a34a'
  }
  approveBtn.onmouseout = () => {
    approveBtn.style.background = '#22c55e'
  }

  approveBtn.onclick = e => {
    e.preventDefault()
    e.stopPropagation()

    // 触发批准命令
    const tr = editorView.state.tr.setMeta('approveDiff', diffId)
    editorView.dispatch(tr)
  }

  // 拒绝按钮
  const rejectBtn = document.createElement('button')
  rejectBtn.innerHTML = '✗'
  rejectBtn.className = 'diff-reject-btn'
  rejectBtn.style.cssText = `
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 12px;
    cursor: pointer;
    transition: background-color 0.2s;
  `
  rejectBtn.title = '拒绝此更改'

  rejectBtn.onmouseover = () => {
    rejectBtn.style.background = '#dc2626'
  }
  rejectBtn.onmouseout = () => {
    rejectBtn.style.background = '#ef4444'
  }

  rejectBtn.onclick = e => {
    e.preventDefault()
    e.stopPropagation()

    // 触发拒绝命令
    const tr = editorView.state.tr.setMeta('rejectDiff', diffId)
    editorView.dispatch(tr)
  }

  controlsContainer.appendChild(approveBtn)
  controlsContainer.appendChild(rejectBtn)

  // 设置容器为相对定位
  element.style.position = 'relative'
  element.appendChild(controlsContainer)
}

/**
 * 获取操作类型的显示信息
 */
function getOperationTypeInfo(type: string) {
  const typeMap = {
    update: { label: '📝 更新内容', color: 'text-blue-600' },
    insert: { label: '➕ 插入内容', color: 'text-green-600' },
    delete: { label: '➖ 删除内容', color: 'text-red-600' },
    split: { label: '✂️ 分割段落', color: 'text-purple-600' },
    merge: { label: '🔗 合并段落', color: 'text-orange-600' },
  }

  return (
    typeMap[type as keyof typeof typeMap] || {
      label: '❓ 未知操作',
      color: 'text-gray-600',
    }
  )
}

// ========================= DiffBlock Extension =========================

export const DiffBlock = Node.create<DiffBlockOptions>({
  name: 'diffBlock',
  priority: 1200, // 高于 HiddenBlock，确保优先处理

  addOptions() {
    return {
      HTMLAttributes: {},
      showControls: true,
      autoApprove: false,
      diffStyles: {
        pending: 'moni-diff-pending',
        approved: 'moni-diff-approved',
        rejected: 'moni-diff-rejected',
      },
      onApprove: undefined,
      onReject: undefined,
    }
  },

  group: 'block',
  content: 'paragraph+',

  addAttributes() {
    return {
      // 核心标识
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-diff-id'),
        renderHTML: attributes => {
          if (attributes.id) {
            return { 'data-diff-id': attributes.id }
          }
          return {}
        },
      },

      // Diff 操作数据
      diffOperation: {
        default: null,
        parseHTML: element => {
          const data = element.getAttribute('data-diff-operation')
          try {
            return data ? JSON.parse(data) : null
          } catch {
            return null
          }
        },
        renderHTML: attributes => {
          if (attributes.diffOperation) {
            return {
              'data-diff-operation': JSON.stringify(attributes.diffOperation),
            }
          }
          return {}
        },
      },

      // Diff 状态
      diffStatus: {
        default: 'pending',
        parseHTML: element => element.getAttribute('data-diff-status') || 'pending',
        renderHTML: attributes => ({
          'data-diff-status': attributes.diffStatus,
        }),
      },

      // 原始内容（用于对比显示）
      originalContent: {
        default: '',
        parseHTML: element => element.getAttribute('data-original-content') || '',
        renderHTML: attributes => {
          if (attributes.originalContent) {
            return { 'data-original-content': attributes.originalContent }
          }
          return {}
        },
      },

      // 新内容
      newContent: {
        default: '',
        parseHTML: element => element.getAttribute('data-new-content') || '',
        renderHTML: attributes => {
          if (attributes.newContent) {
            return { 'data-new-content': attributes.newContent }
          }
          return {}
        },
      },

      // Moni 兼容属性
      moniBlockId: {
        default: null,
        parseHTML: element => element.getAttribute('data-moni-block-id'),
        renderHTML: attributes => {
          if (attributes.moniBlockId) {
            return { 'data-moni-block-id': attributes.moniBlockId }
          }
          return {}
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-diff-block]',
        priority: 95,
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    const { diffStatus, diffOperation } = HTMLAttributes
    const statusClass =
      this.options.diffStyles[diffStatus as keyof typeof this.options.diffStyles] || this.options.diffStyles.pending

    // 获取操作类型信息
    const typeInfo = diffOperation ? getOperationTypeInfo(diffOperation.type) : { label: '', color: '' }

    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-diff-block': 'true',
        class: `moni-diff-block ${statusClass}`,
        'data-operation-type': diffOperation?.type || 'unknown',
        'data-operation-label': typeInfo.label,
      }),
      ['div', { class: 'diff-header' }, ['span', { class: `diff-type-label ${typeInfo.color}` }, typeInfo.label]],
      [
        'div',
        { class: 'diff-content' },
        0, // 这里会被实际内容替换
      ],
    ]
  },

  addCommands() {
    return {
      insertDiffBlock:
        (operation: DiffOperation) =>
        ({ commands }) => {
          // 智能预览内容生成，支持所有block类型
          const originalText = extractTextContent(operation.originalContent || '')
          const newText = extractTextContent(operation.newContent || '')

          // 生成预览内容，支持不同block类型
          const previewContent: any[] = []

          // 根据操作类型生成diff预览
          if (operation.type === 'update' && originalText && newText) {
            // 更新操作：显示对比
            previewContent.push(
              {
                type: 'paragraph',
                attrs: { class: 'diff-line-removed' },
                content: [{ type: 'text', text: `- ${originalText}` }],
              },
              {
                type: 'paragraph',
                attrs: { class: 'diff-line-added' },
                content: [{ type: 'text', text: `+ ${newText}` }],
              },
            )
          } else if (operation.type === 'insert') {
            // 插入操作：显示新增内容
            previewContent.push({
              type: 'paragraph',
              attrs: { class: 'diff-line-added' },
              content: [{ type: 'text', text: `+ ${newText}` }],
            })
          } else if (operation.type === 'delete') {
            // 删除操作：显示删除内容
            previewContent.push({
              type: 'paragraph',
              attrs: { class: 'diff-line-removed' },
              content: [{ type: 'text', text: `- ${originalText}` }],
            })
          } else {
            // 其他操作：显示基本信息
            previewContent.push({
              type: 'paragraph',
              content: [{ type: 'text', text: newText || '操作预览' }],
            })
          }

          return commands.insertContent({
            type: this.name,
            attrs: {
              id: operation.id,
              moniBlockId: operation.id,
              diffOperation: operation,
              diffStatus: operation.status,
              originalContent: originalText,
              newContent: newText,
            },
            content: previewContent,
          })
        },

      approveDiff:
        (operationId: string) =>
        ({ editor }) => {
          const { state } = editor
          const { tr } = state
          let updated = false

          // 查找目标 diff block 并更新状态
          state.doc.descendants((node, pos) => {
            if (node.type.name === this.name && node.attrs.id === operationId) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                diffStatus: 'approved',
              })
              updated = true
              return false
            }
          })

          if (updated) {
            editor.view.dispatch(tr)

            // 调用回调
            if (this.options.onApprove) {
              this.options.onApprove(operationId)
            }

            return true
          }

          return false
        },

      rejectDiff:
        (operationId: string) =>
        ({ editor }) => {
          const { state } = editor
          const { tr } = state
          let updated = false

          // 查找目标 diff block 并更新状态
          state.doc.descendants((node, pos) => {
            if (node.type.name === this.name && node.attrs.id === operationId) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                diffStatus: 'rejected',
              })
              updated = true
              return false
            }
          })

          if (updated) {
            editor.view.dispatch(tr)

            // 调用回调
            if (this.options.onReject) {
              this.options.onReject(operationId)
            }

            return true
          }

          return false
        },

      applyAllDiffs:
        () =>
        ({ editor }) => {
          const { state } = editor
          const approvedDiffs: Array<{ pos: number; operation: DiffOperation }> = []

          // 收集所有已批准的 diff
          state.doc.descendants((node, pos) => {
            if (node.type.name === this.name && node.attrs.diffStatus === 'approved' && node.attrs.diffOperation) {
              approvedDiffs.push({
                pos,
                operation: node.attrs.diffOperation,
              })
            }
          })

          // 应用所有批准的操作（这里简化处理，实际应用中需要更复杂的逻辑）
          approvedDiffs.forEach(({ pos, operation }) => {
            console.log(`应用操作: ${operation.type} at position ${pos}`)
            // TODO: 实现具体的应用逻辑
          })

          return approvedDiffs.length > 0
        },

      clearAllDiffs:
        () =>
        ({ editor }) => {
          const { state } = editor
          const diffPositions: number[] = []

          // 收集所有 diff block 的位置
          state.doc.descendants((node, pos) => {
            if (node.type.name === this.name) {
              diffPositions.push(pos)
            }
          })

          // 从后往前删除（避免位置偏移）
          let tr = state.tr
          diffPositions.reverse().forEach(pos => {
            tr = tr.delete(pos, pos + 1)
          })

          if (diffPositions.length > 0) {
            editor.view.dispatch(tr)
            return true
          }

          return false
        },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('diffBlockControls'),

        view: (editorView: EditorView) => {
          const addControlButtons = () => {
            if (!this.options.showControls) {return}

            const diffBlocks = editorView.dom.querySelectorAll('[data-diff-block="true"]')

            diffBlocks.forEach((element: Element) => {
              const diffStatus = element.getAttribute('data-diff-status')
              const diffId = element.getAttribute('data-diff-id')

              // 只为 pending 状态的 diff 添加控制按钮
              if (diffStatus === 'pending' && diffId) {
                const existingControls = element.querySelector('.diff-controls')
                if (!existingControls) {
                  addControlButtonsToElement(element as HTMLElement, diffId, editorView)
                }
              }
            })
          }

          // 延迟执行，确保 DOM 已更新
          setTimeout(addControlButtons, 0)

          return {
            update: () => {
              setTimeout(addControlButtons, 0)
            },
            destroy: () => {
              // 清理控制按钮
              const allControls = editorView.dom.querySelectorAll('.diff-controls')
              allControls.forEach((control: Element) => control.remove())
            },
          }
        },
      }),
    ]
  },
})

/**
 * 添加控制按钮到 diff block 元素
 */
// 移动到文件顶部以避免 hoisting 问题

export default DiffBlock
