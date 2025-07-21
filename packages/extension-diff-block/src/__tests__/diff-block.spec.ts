/**
 * DiffBlock Extension 测试
 */

import { Editor } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DiffBlock, DiffBlockUtils } from '../index.js'

describe('DiffBlock Extension', () => {
  let editor: Editor

  beforeEach(() => {
    editor = new Editor({
      extensions: [
        Document,
        Paragraph,
        Text,
        DiffBlock.configure({
          showControls: true,
          autoApprove: false,
        }),
      ],
      content: '<p>Initial content</p>',
    })
  })

  afterEach(() => {
    editor?.destroy()
  })

  describe('Extension Registration', () => {
    it('应该正确注册 DiffBlock extension', () => {
      expect(editor.extensionManager.extensions.find(ext => ext.name === 'diffBlock')).toBeDefined()
    })

    it('应该包含所有必需的命令', () => {
      expect(editor.commands.insertDiffBlock).toBeDefined()
      expect(editor.commands.approveDiff).toBeDefined()
      expect(editor.commands.rejectDiff).toBeDefined()
      expect(editor.commands.applyAllDiffs).toBeDefined()
      expect(editor.commands.clearAllDiffs).toBeDefined()
    })
  })

  describe('DiffOperation 创建', () => {
    it('应该创建有效的 DiffOperation', () => {
      const operation = DiffBlockUtils.createDiffOperation('update', '原始内容', '新内容')

      expect(operation.id).toMatch(/^diff-\d+-[a-z0-9]+$/)
      expect(operation.type).toBe('update')
      expect(operation.originalContent).toBe('原始内容')
      expect(operation.newContent).toBe('新内容')
      expect(operation.status).toBe('pending')
      expect(operation.timestamp).toBeTypeOf('number')
    })

    it('应该为不同操作类型创建正确的 DiffOperation', () => {
      const insertOp = DiffBlockUtils.createDiffOperation('insert', '', '新插入的内容')
      const deleteOp = DiffBlockUtils.createDiffOperation('delete', '要删除的内容', '')
      const updateOp = DiffBlockUtils.createDiffOperation('update', '原内容', '新内容')

      expect(insertOp.type).toBe('insert')
      expect(insertOp.newContent).toBe('新插入的内容')

      expect(deleteOp.type).toBe('delete')
      expect(deleteOp.originalContent).toBe('要删除的内容')

      expect(updateOp.type).toBe('update')
      expect(updateOp.originalContent).toBe('原内容')
      expect(updateOp.newContent).toBe('新内容')
    })
  })

  describe('DiffBlock 插入', () => {
    it('应该能够插入 DiffBlock 到编辑器', () => {
      const operation = DiffBlockUtils.createDiffOperation('update', '原始段落', '更新后的段落')

      const result = editor.commands.insertDiffBlock(operation)
      expect(result).toBe(true)

      const html = editor.getHTML()
      expect(html).toContain('data-diff-block="true"')
      expect(html).toContain('data-diff-status="pending"')
    })

    it('应该正确渲染不同类型的 diff 内容', () => {
      // 测试更新操作
      const updateOp = DiffBlockUtils.createDiffOperation('update', '这是原始内容', '这是更新后的内容')

      editor.commands.insertDiffBlock(updateOp)
      let html = editor.getHTML()
      expect(html).toContain('- 这是原始内容')
      expect(html).toContain('+ 这是更新后的内容')

      // 清空编辑器
      editor.commands.setContent('<p></p>')

      // 测试插入操作
      const insertOp = DiffBlockUtils.createDiffOperation('insert', '', '这是新插入的内容')

      editor.commands.insertDiffBlock(insertOp)
      html = editor.getHTML()
      expect(html).toContain('+ 这是新插入的内容')
    })
  })

  describe('DiffBlock 状态管理', () => {
    let operationId: string

    beforeEach(() => {
      const operation = DiffBlockUtils.createDiffOperation('update', '原始内容', '新内容')
      operationId = operation.id
      editor.commands.insertDiffBlock(operation)
    })

    it('应该能够批准 diff 操作', () => {
      const result = editor.commands.approveDiff(operationId)
      expect(result).toBe(true)

      const html = editor.getHTML()
      expect(html).toContain('data-diff-status="approved"')
    })

    it('应该能够拒绝 diff 操作', () => {
      const result = editor.commands.rejectDiff(operationId)
      expect(result).toBe(true)

      const html = editor.getHTML()
      expect(html).toContain('data-diff-status="rejected"')
    })

    it('对不存在的操作ID应该返回false', () => {
      const result = editor.commands.approveDiff('non-existent-id')
      expect(result).toBe(false)
    })
  })

  describe('DiffBlock 工具函数', () => {
    it('应该正确识别 DiffBlock 节点', () => {
      const operation = DiffBlockUtils.createDiffOperation('update', '原内容', '新内容')
      editor.commands.insertDiffBlock(operation)

      const doc = editor.state.doc
      let foundDiffBlock = false

      doc.descendants(node => {
        if (DiffBlockUtils.isDiffBlock(node)) {
          foundDiffBlock = true
          return false
        }
      })

      expect(foundDiffBlock).toBe(true)
    })

    it('应该正确计算待处理的 diff 数量', () => {
      const op1 = DiffBlockUtils.createDiffOperation('update', '内容1', '新内容1')
      const op2 = DiffBlockUtils.createDiffOperation('insert', '', '新内容2')

      editor.commands.insertDiffBlock(op1)
      editor.commands.insertDiffBlock(op2)

      const doc = editor.state.doc
      const pendingCount = DiffBlockUtils.getPendingDiffCount(doc)
      expect(pendingCount).toBe(2)

      // 批准一个操作
      editor.commands.approveDiff(op1.id)
      const updatedCount = DiffBlockUtils.getPendingDiffCount(doc)
      expect(updatedCount).toBe(1)
    })

    it('应该正确检查是否存在待处理的 diff', () => {
      const doc = editor.state.doc
      expect(DiffBlockUtils.hasPendingDiffs(doc)).toBe(false)

      const operation = DiffBlockUtils.createDiffOperation('update', '原内容', '新内容')
      editor.commands.insertDiffBlock(operation)

      expect(DiffBlockUtils.hasPendingDiffs(doc)).toBe(true)

      editor.commands.approveDiff(operation.id)
      expect(DiffBlockUtils.hasPendingDiffs(doc)).toBe(false)
    })

    it('应该能够按状态获取 diff blocks', () => {
      const op1 = DiffBlockUtils.createDiffOperation('update', '内容1', '新内容1')
      const op2 = DiffBlockUtils.createDiffOperation('insert', '', '新内容2')

      editor.commands.insertDiffBlock(op1)
      editor.commands.insertDiffBlock(op2)
      editor.commands.approveDiff(op1.id)

      const doc = editor.state.doc
      const pendingBlocks = DiffBlockUtils.getDiffBlocksByStatus(doc, 'pending')
      const approvedBlocks = DiffBlockUtils.getDiffBlocksByStatus(doc, 'approved')

      expect(pendingBlocks).toHaveLength(1)
      expect(approvedBlocks).toHaveLength(1)
    })
  })

  describe('批量操作', () => {
    it('应该能够清除所有 diff blocks', () => {
      const op1 = DiffBlockUtils.createDiffOperation('update', '内容1', '新内容1')
      const op2 = DiffBlockUtils.createDiffOperation('insert', '', '新内容2')

      editor.commands.insertDiffBlock(op1)
      editor.commands.insertDiffBlock(op2)

      const result = editor.commands.clearAllDiffs()
      expect(result).toBe(true)

      const doc = editor.state.doc
      expect(DiffBlockUtils.getPendingDiffCount(doc)).toBe(0)
    })

    it('应该能够应用所有已批准的 diff 操作', () => {
      const op1 = DiffBlockUtils.createDiffOperation('update', '内容1', '新内容1')
      const op2 = DiffBlockUtils.createDiffOperation('insert', '', '新内容2')

      editor.commands.insertDiffBlock(op1)
      editor.commands.insertDiffBlock(op2)
      editor.commands.approveDiff(op1.id)

      const result = editor.commands.applyAllDiffs()
      expect(result).toBe(true)
    })
  })

  describe('操作描述', () => {
    it('应该返回正确的操作描述', () => {
      expect(DiffBlockUtils.getOperationDescription('insert')).toBe('插入新内容')
      expect(DiffBlockUtils.getOperationDescription('update')).toBe('更新现有内容')
      expect(DiffBlockUtils.getOperationDescription('delete')).toBe('删除内容')
      expect(DiffBlockUtils.getOperationDescription('split')).toBe('分割段落')
      expect(DiffBlockUtils.getOperationDescription('merge')).toBe('合并段落')
      expect(DiffBlockUtils.getOperationDescription('unknown')).toBe('未知操作')
    })

    it('应该返回正确的状态描述', () => {
      expect(DiffBlockUtils.getStatusDescription('pending')).toBe('等待确认')
      expect(DiffBlockUtils.getStatusDescription('approved')).toBe('已批准')
      expect(DiffBlockUtils.getStatusDescription('rejected')).toBe('已拒绝')
      expect(DiffBlockUtils.getStatusDescription('unknown')).toBe('未知状态')
    })
  })

  describe('BlockOperation 转换', () => {
    it('应该能够从 Moni BlockOperation 转换为 DiffOperation', () => {
      const blockOperation = {
        id: 'block-123',
        type: 'update',
        originalContent: '原始内容',
        content: { text: '新内容' },
        targetId: 'target-456',
        position: 10,
      }

      const diffOperation = DiffBlockUtils.fromBlockOperation(blockOperation)

      expect(diffOperation.type).toBe('update')
      expect(diffOperation.originalContent).toBe('原始内容')
      expect(diffOperation.newContent).toBe('新内容')
      expect(diffOperation.targetId).toBe('target-456')
      expect(diffOperation.position).toBe(10)
      expect(diffOperation.status).toBe('pending')
    })

    it('应该处理复杂的内容结构', () => {
      const blockOperation = {
        type: 'insert',
        content: {
          content: [{ text: '第一段文本' }, { text: '第二段文本' }],
        },
      }

      const diffOperation = DiffBlockUtils.fromBlockOperation(blockOperation)
      expect(diffOperation.newContent).toBe('第一段文本第二段文本')
    })
  })

  describe('回调函数', () => {
    it('应该调用 onApprove 回调', async () => {
      const onApprove = vi.fn()

      const editorWithCallback = new Editor({
        extensions: [
          Document,
          Paragraph,
          Text,
          DiffBlock.configure({
            onApprove,
          }),
        ],
        content: '<p>Test</p>',
      })

      const operation = DiffBlockUtils.createDiffOperation('update', '原内容', '新内容')
      editorWithCallback.commands.insertDiffBlock(operation)
      editorWithCallback.commands.approveDiff(operation.id)

      expect(onApprove).toHaveBeenCalledWith(operation.id)

      editorWithCallback.destroy()
    })

    it('应该调用 onReject 回调', async () => {
      const onReject = vi.fn()

      const editorWithCallback = new Editor({
        extensions: [
          Document,
          Paragraph,
          Text,
          DiffBlock.configure({
            onReject,
          }),
        ],
        content: '<p>Test</p>',
      })

      const operation = DiffBlockUtils.createDiffOperation('update', '原内容', '新内容')
      editorWithCallback.commands.insertDiffBlock(operation)
      editorWithCallback.commands.rejectDiff(operation.id)

      expect(onReject).toHaveBeenCalledWith(operation.id)

      editorWithCallback.destroy()
    })
  })
})
