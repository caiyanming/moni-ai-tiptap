import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Editor } from '../../packages/core/src/Editor'
import { StreamOperationManager } from '../../packages/core/src/StreamOperationManager.js'
import { cleanupDOM, createMockEditor, createMockStreamOperation, waitForAsync } from './test-utils.js'

describe('StreamOperationManager', () => {
  let editor: Editor
  let manager: StreamOperationManager

  beforeEach(() => {
    editor = createMockEditor()
    manager = new StreamOperationManager(editor)
  })

  afterEach(() => {
    manager.destroy()
    cleanupDOM()
  })

  describe('初始化', () => {
    it('应该正确初始化管理器', () => {
      expect(manager).toBeDefined()
      expect(manager.getQueueStatus().queueSize).toBe(0)
      expect(manager.getQueueStatus().isProcessing).toBe(false)
    })

    it('应该支持自定义配置', () => {
      const customManager = new StreamOperationManager(editor, {
        debug: true,
        maxQueueSize: 50,
        operationInterval: 100,
      })

      expect(customManager).toBeDefined()
      expect(customManager.getQueueStatus().maxQueueSize).toBe(50)
    })
  })

  describe('操作队列', () => {
    it('应该能添加单个操作', () => {
      // 暂停处理以检查队列状态
      manager.pause()

      const operation = createMockStreamOperation()
      const result = manager.queueOperation(operation)

      expect(result).toBe(true)
      expect(manager.getQueueStatus().queueSize).toBe(1)

      // 恢复处理进行清理
      manager.resume()
    })

    it('应该能批量添加操作', () => {
      // 暂停处理以检查队列状态
      manager.pause()

      const operations = [
        createMockStreamOperation({ content: 'chunk1' }),
        createMockStreamOperation({ content: 'chunk2' }),
        createMockStreamOperation({ content: 'chunk3' }),
      ]

      const result = manager.queueOperations(operations)

      expect(result).toBe(true)
      expect(manager.getQueueStatus().queueSize).toBe(3)

      // 恢复处理进行清理
      manager.resume()
    })

    it('应该拒绝超出队列容量的操作', () => {
      const smallQueueManager = new StreamOperationManager(editor, {
        maxQueueSize: 2,
      })

      const operations = [
        createMockStreamOperation({ content: 'chunk1' }),
        createMockStreamOperation({ content: 'chunk2' }),
        createMockStreamOperation({ content: 'chunk3' }),
      ]

      const result = smallQueueManager.queueOperations(operations)

      expect(result).toBe(false)
      expect(smallQueueManager.getQueueStatus().queueSize).toBe(0)

      smallQueueManager.destroy()
    })

    it('应该自动启动处理队列', async () => {
      const operation = createMockStreamOperation()
      manager.queueOperation(operation)

      expect(manager.getQueueStatus().isProcessing).toBe(true)

      // 等待处理完成
      await waitForAsync(100)

      expect(manager.getQueueStatus().queueSize).toBe(0)
      expect(manager.getQueueStatus().isProcessing).toBe(false)
    })
  })

  describe('Block级别操作执行', () => {
    it('应该能执行INSERT操作 - 在block list中插入新block', async () => {
      const operation = createMockStreamOperation({
        type: 'insert',
        blockId: 'document-root', // 在文档开头插入
        content: 'new paragraph block',
      })

      manager.queueOperation(operation)

      // 等待处理完成
      await waitForAsync(100)

      const history = manager.getOperationHistory()
      expect(history).toHaveLength(1)
      expect(history[0].success).toBe(true)
      expect(history[0].operation.type).toBe('insert')
      expect(history[0].newPosition).toBe(0) // 应该在文档开头
    })

    it('应该能执行APPEND操作 - 在block list末尾添加新block', async () => {
      const operation = createMockStreamOperation({
        type: 'append',
        content: 'appended paragraph block',
      })

      manager.queueOperation(operation)

      // 等待处理完成
      await waitForAsync(100)

      const history = manager.getOperationHistory()
      expect(history).toHaveLength(1)
      expect(history[0].success).toBe(true)
      expect(history[0].operation.type).toBe('append')
      // newPosition应该是文档末尾位置
      expect(history[0].newPosition).toBeGreaterThan(0)
    })

    it('应该能执行REPLACE操作 - 替换现有block', async () => {
      // 先创建一个block用于替换
      const createOperation = createMockStreamOperation({
        type: 'append',
        content: 'original block',
      })
      manager.queueOperation(createOperation)
      await waitForAsync(100)

      // 获取创建的block的ID
      const history = manager.getOperationHistory()
      const createdBlockId = history[0].operation.blockId

      // 替换这个block
      const replaceOperation = createMockStreamOperation({
        type: 'replace',
        blockId: createdBlockId,
        content: 'replaced block content',
      })

      manager.queueOperation(replaceOperation)

      // 等待处理完成
      await waitForAsync(100)

      const updatedHistory = manager.getOperationHistory()
      expect(updatedHistory).toHaveLength(2)
      expect(updatedHistory[1].success).toBe(true)
      expect(updatedHistory[1].operation.type).toBe('replace')
    })

    it('应该能执行DELETE操作 - 删除现有block', async () => {
      // 先创建一个block用于删除
      const createOperation = createMockStreamOperation({
        type: 'append',
        content: 'block to delete',
      })
      manager.queueOperation(createOperation)
      await waitForAsync(100)

      // 获取创建的block的ID
      const history = manager.getOperationHistory()
      const createdBlockId = history[0].operation.blockId

      // 删除这个block
      const deleteOperation = createMockStreamOperation({
        type: 'delete',
        blockId: createdBlockId,
      })

      manager.queueOperation(deleteOperation)

      // 等待处理完成
      await waitForAsync(100)

      const updatedHistory = manager.getOperationHistory()
      expect(updatedHistory).toHaveLength(2)
      expect(updatedHistory[1].success).toBe(true)
      expect(updatedHistory[1].operation.type).toBe('delete')
    })

    it('应该能处理JSON格式的block内容', async () => {
      const jsonContent = {
        type: 'paragraph',
        attrs: {
          moniBlockId: 'custom-block-id',
          moniParentId: null,
          moniLevel: 0,
        },
        content: [
          {
            type: 'text',
            text: 'JSON formatted paragraph',
          },
        ],
      }

      const operation = createMockStreamOperation({
        type: 'append',
        content: jsonContent,
      })

      manager.queueOperation(operation)

      // 等待处理完成
      await waitForAsync(100)

      const history = manager.getOperationHistory()
      expect(history).toHaveLength(1)
      expect(history[0].success).toBe(true)
      expect(history[0].operation.type).toBe('append')
    })

    it('应该能处理复杂的嵌套block结构', async () => {
      const complexContent = {
        type: 'bulletList',
        attrs: {
          moniBlockId: 'list-block-id',
        },
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: 'List item 1',
                  },
                ],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: 'List item 2',
                  },
                ],
              },
            ],
          },
        ],
      }

      const operation = createMockStreamOperation({
        type: 'append',
        content: complexContent,
      })

      manager.queueOperation(operation)

      // 等待处理完成
      await waitForAsync(100)

      const history = manager.getOperationHistory()
      expect(history).toHaveLength(1)
      expect(history[0].success).toBe(true)
      expect(history[0].operation.type).toBe('append')
    })

    it('应该处理不支持的操作类型', async () => {
      const operation = createMockStreamOperation({
        type: 'unsupported' as any,
      })

      manager.queueOperation(operation)

      // 等待处理完成
      await waitForAsync(100)

      const history = manager.getOperationHistory()
      expect(history).toHaveLength(1)
      expect(history[0].success).toBe(false)
      expect(history[0].error).toContain('Unsupported operation type')
    })

    it('应该处理目标block不存在的情况', async () => {
      const operation = createMockStreamOperation({
        blockId: 'nonexistent-block',
        type: 'replace',
      })

      manager.queueOperation(operation)

      // 等待处理完成
      await waitForAsync(100)

      const history = manager.getOperationHistory()
      expect(history).toHaveLength(1)
      expect(history[0].success).toBe(false)
      expect(history[0].error).toContain('Target block not found')
    })

    it('应该处理无效的JSON内容', async () => {
      const operation = createMockStreamOperation({
        type: 'append',
        content: null as any,
      })

      manager.queueOperation(operation)

      // 等待处理完成
      await waitForAsync(100)

      const history = manager.getOperationHistory()
      expect(history).toHaveLength(1)
      expect(history[0].success).toBe(false)
      expect(history[0].error).toContain('Failed to create block from content')
    })

    it('应该能处理未知节点类型的降级', async () => {
      const unknownTypeContent = {
        type: 'unknownNodeType',
        attrs: {},
        content: [
          {
            type: 'text',
            text: 'Unknown type content',
          },
        ],
      }

      const operation = createMockStreamOperation({
        type: 'append',
        content: unknownTypeContent,
      })

      manager.queueOperation(operation)

      // 等待处理完成
      await waitForAsync(100)

      const history = manager.getOperationHistory()
      expect(history).toHaveLength(1)
      expect(history[0].success).toBe(true) // 应该降级为段落并成功
      expect(history[0].operation.type).toBe('append')
    })
  })

  describe('操作历史', () => {
    it('应该记录操作历史', async () => {
      const operations = [
        createMockStreamOperation({ type: 'append', content: 'block1' }),
        createMockStreamOperation({ type: 'append', content: 'block2' }),
        createMockStreamOperation({ type: 'append', content: 'block3' }),
      ]

      manager.queueOperations(operations)

      // 等待处理完成
      await waitForAsync(200)

      const history = manager.getOperationHistory()
      expect(history).toHaveLength(3)
      expect(history.every(result => result.success)).toBe(true)
    })

    it('应该按会话ID过滤操作历史', async () => {
      const session1Operation = createMockStreamOperation({
        sessionId: 'session1',
        type: 'append',
        content: 'session1 block',
      })
      const session2Operation = createMockStreamOperation({
        sessionId: 'session2',
        type: 'append',
        content: 'session2 block',
      })

      manager.queueOperation(session1Operation)
      manager.queueOperation(session2Operation)

      // 等待处理完成
      await waitForAsync(200)

      const session1History = manager.getOperationHistory('session1')
      const session2History = manager.getOperationHistory('session2')

      expect(session1History).toHaveLength(1)
      expect(session2History).toHaveLength(1)
      expect(session1History[0].operation.sessionId).toBe('session1')
      expect(session2History[0].operation.sessionId).toBe('session2')
    })
  })

  describe('队列管理', () => {
    it('应该能暂停和恢复处理', () => {
      manager.pause()
      expect(manager.getQueueStatus().isPaused).toBe(true)

      const operation = createMockStreamOperation()
      manager.queueOperation(operation)

      // 暂停时不应该处理
      expect(manager.getQueueStatus().queueSize).toBe(1)
      expect(manager.getQueueStatus().isProcessing).toBe(false)

      manager.resume()
      expect(manager.getQueueStatus().isPaused).toBe(false)
      expect(manager.getQueueStatus().isProcessing).toBe(true)
    })

    it('应该能清空队列', () => {
      // 🔧 暂停处理以检查队列状态
      manager.pause()

      const operations = [
        createMockStreamOperation({ content: 'block1' }),
        createMockStreamOperation({ content: 'block2' }),
      ]

      manager.queueOperations(operations)
      expect(manager.getQueueStatus().queueSize).toBe(2)

      manager.clearQueue()
      expect(manager.getQueueStatus().queueSize).toBe(0)

      // 恢复处理进行清理
      manager.resume()
    })

    it('应该能按会话ID清空队列', () => {
      // 🔧 暂停处理以检查队列状态
      manager.pause()

      const session1Operations = [
        createMockStreamOperation({ sessionId: 'session1', content: 'block1' }),
        createMockStreamOperation({ sessionId: 'session1', content: 'block2' }),
      ]
      const session2Operations = [createMockStreamOperation({ sessionId: 'session2', content: 'block3' })]

      manager.queueOperations([...session1Operations, ...session2Operations])
      expect(manager.getQueueStatus().queueSize).toBe(3)

      manager.clearQueue('session1')
      expect(manager.getQueueStatus().queueSize).toBe(1)

      // 恢复处理进行清理
      manager.resume()
    })
  })

  describe('错误处理', () => {
    it('应该处理操作执行异常', async () => {
      // 模拟编辑器状态异常
      vi.spyOn(editor.view.state, 'tr', 'get').mockImplementation(() => {
        throw new Error('Transaction error')
      })

      const operation = createMockStreamOperation()
      manager.queueOperation(operation)

      // 等待处理完成
      await waitForAsync(100)

      const history = manager.getOperationHistory()
      expect(history).toHaveLength(1)
      expect(history[0].success).toBe(false)
      expect(history[0].error).toContain('Transaction error')

      vi.restoreAllMocks()
    })

    it('应该处理回调异常', async () => {
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Callback error')
      })

      const managerWithCallback = new StreamOperationManager(editor, {
        onOperationComplete: errorCallback,
      })

      const operation = createMockStreamOperation()
      managerWithCallback.queueOperation(operation)

      // 等待处理完成
      await waitForAsync(100)

      // 即使回调出错，操作也应该完成
      const history = managerWithCallback.getOperationHistory()
      expect(history).toHaveLength(1)
      expect(history[0].success).toBe(true)

      managerWithCallback.destroy()
    })
  })

  describe('🔥 Diff操作支持', () => {
    it('应该能创建diff预览操作', () => {
      // 暂停处理以检查diff状态
      manager.pause()

      const operation = createMockStreamOperation({
        type: 'replace',
        blockId: 'test-block',
        content: 'updated content',
      })

      const operationId = manager.queueOperationWithDiff(operation)

      expect(operationId).toBeDefined()
      expect(typeof operationId).toBe('string')

      const pendingOps = manager.getPendingDiffOperations()
      expect(pendingOps).toHaveLength(1)
      expect(pendingOps[0].id).toBe(operationId)
      expect(pendingOps[0].diffMode).toBe(true)
      expect(pendingOps[0].requiresConfirmation).toBe(true)

      manager.resume()
    })

    it('应该能确认diff操作', async () => {
      // 先创建一个block用于diff替换
      const createOperation = createMockStreamOperation({
        type: 'append',
        content: 'original content',
      })
      manager.queueOperation(createOperation)
      await waitForAsync(100)

      // 获取创建的block的ID
      const history = manager.getOperationHistory()
      const createdBlockId = history[0].operation.blockId

      // 创建diff操作
      const diffOperation = createMockStreamOperation({
        type: 'replace',
        blockId: createdBlockId,
        content: 'updated content',
      })

      const operationId = manager.queueOperationWithDiff(diffOperation)

      // 确认操作应该为pending状态
      const pendingOps = manager.getPendingDiffOperations()
      expect(pendingOps).toHaveLength(1)

      // 确认diff操作
      const approveResult = manager.approveDiffOperation(operationId)
      expect(approveResult).toBe(true)

      // 等待处理完成
      await waitForAsync(1200) // 考虑到1秒的延迟清理

      // 应该没有pending操作了
      const remainingPendingOps = manager.getPendingDiffOperations()
      expect(remainingPendingOps).toHaveLength(0)

      // 检查操作历史
      const updatedHistory = manager.getOperationHistory()
      const diffOperationResult = updatedHistory.find(h => h.operation.id === operationId)
      expect(diffOperationResult).toBeDefined()
      expect(diffOperationResult!.success).toBe(true)
    })

    it('应该能拒绝diff操作', async () => {
      const operation = createMockStreamOperation({
        type: 'replace',
        blockId: 'test-block',
        content: 'rejected content',
      })

      const operationId = manager.queueOperationWithDiff(operation)

      // 确认操作应该为pending状态
      const pendingOps = manager.getPendingDiffOperations()
      expect(pendingOps).toHaveLength(1)

      // 拒绝diff操作
      const rejectResult = manager.rejectDiffOperation(operationId)
      expect(rejectResult).toBe(true)

      // 等待清理完成
      await waitForAsync(1200)

      // 应该没有pending操作了
      const remainingPendingOps = manager.getPendingDiffOperations()
      expect(remainingPendingOps).toHaveLength(0)

      // 操作不应该被执行（不在最终历史中）
      const history = manager.getOperationHistory()
      const rejectedOperationResult = history.find(h => h.operation.id === operationId)
      expect(rejectedOperationResult).toBeUndefined()
    })

    it('应该能批量确认所有diff操作', async () => {
      // 暂停处理创建多个diff操作
      manager.pause()

      const operations = [
        createMockStreamOperation({
          type: 'append',
          content: 'content 1',
        }),
        createMockStreamOperation({
          type: 'append',
          content: 'content 2',
        }),
        createMockStreamOperation({
          type: 'append',
          content: 'content 3',
        }),
      ]

      // 创建diff操作
      const operationIds = operations.map(op => manager.queueOperationWithDiff(op))

      expect(manager.getPendingDiffOperations()).toHaveLength(3)

      // 批量确认
      const batchApproveResult = manager.approveAllDiffOperations()
      expect(batchApproveResult).toBe(true)

      // 恢复处理
      manager.resume()

      // 等待所有操作完成
      await waitForAsync(1500)

      // 所有pending操作都应该被清理
      expect(manager.getPendingDiffOperations()).toHaveLength(0)

      // 检查历史记录
      const history = manager.getOperationHistory()
      const diffResults = history.filter(h => operationIds.includes(h.operation.id))
      expect(diffResults).toHaveLength(3)
      expect(diffResults.every(r => r.success)).toBe(true)
    })

    it('应该能批量拒绝所有diff操作', async () => {
      // 暂停处理创建多个diff操作
      manager.pause()

      const operations = [
        createMockStreamOperation({
          type: 'append',
          content: 'content 1',
        }),
        createMockStreamOperation({
          type: 'append',
          content: 'content 2',
        }),
      ]

      // 创建diff操作
      const operationIds = operations.map(op => manager.queueOperationWithDiff(op))

      expect(manager.getPendingDiffOperations()).toHaveLength(2)

      // 批量拒绝
      const batchRejectResult = manager.rejectAllDiffOperations()
      expect(batchRejectResult).toBe(true)

      manager.resume()

      // 等待清理完成
      await waitForAsync(1200)

      // 所有pending操作都应该被清理
      expect(manager.getPendingDiffOperations()).toHaveLength(0)

      // 操作不应该被执行
      const history = manager.getOperationHistory()
      const rejectedResults = history.filter(h => operationIds.includes(h.operation.id))
      expect(rejectedResults).toHaveLength(0)
    })

    it('应该处理不存在的操作ID', () => {
      const nonExistentId = 'non-existent-operation-id'

      const approveResult = manager.approveDiffOperation(nonExistentId)
      expect(approveResult).toBe(false)

      const rejectResult = manager.rejectDiffOperation(nonExistentId)
      expect(rejectResult).toBe(false)
    })

    it('应该正确设置diff属性', () => {
      // 暂停处理以检查diff状态
      manager.pause()

      const operation = createMockStreamOperation({
        type: 'replace',
        blockId: 'test-block',
        content: 'diff content',
      })

      manager.queueOperationWithDiff(operation)

      // 检查操作的diff相关属性
      const pendingOps = manager.getPendingDiffOperations()
      expect(pendingOps).toHaveLength(1)

      const diffOp = pendingOps[0]
      expect(diffOp.diffMode).toBe(true)
      expect(diffOp.requiresConfirmation).toBe(true)
      expect(diffOp.metadata?.diffEnabled).toBe(true)
      expect(diffOp.metadata?.diffStatus).toBe('pending')

      manager.resume()
    })

    it('应该处理diff操作的目标block不存在情况', async () => {
      const operation = createMockStreamOperation({
        type: 'replace',
        blockId: 'nonexistent-block',
        content: 'diff content',
      })

      const operationId = manager.queueOperationWithDiff(operation)

      // 确认操作应该创建成功
      const pendingOps = manager.getPendingDiffOperations()
      expect(pendingOps).toHaveLength(1)

      // 尝试确认操作
      const approveResult = manager.approveDiffOperation(operationId)
      expect(approveResult).toBe(false) // 应该失败，因为目标block不存在

      // 等待清理
      await waitForAsync(100)

      // 操作应该已经从队列中移除（因为执行失败但仍然被移除）
      const remainingPendingOps = manager.getPendingDiffOperations()
      expect(remainingPendingOps).toHaveLength(0)
    })

    it('应该支持不同类型的diff操作', () => {
      manager.pause()

      manager.queueOperationWithDiff(
        createMockStreamOperation({
          type: 'insert',
          content: 'insert diff',
        }),
      )

      manager.queueOperationWithDiff(
        createMockStreamOperation({
          type: 'append',
          content: 'append diff',
        }),
      )

      manager.queueOperationWithDiff(
        createMockStreamOperation({
          type: 'replace',
          blockId: 'test-block',
          content: 'replace diff',
        }),
      )

      manager.queueOperationWithDiff(
        createMockStreamOperation({
          type: 'delete',
          blockId: 'test-block-2',
        }),
      )

      const pendingOps = manager.getPendingDiffOperations()
      expect(pendingOps).toHaveLength(4)

      const opTypes = pendingOps.map(op => op.type)
      expect(opTypes).toContain('insert')
      expect(opTypes).toContain('append')
      expect(opTypes).toContain('replace')
      expect(opTypes).toContain('delete')

      manager.resume()
    })
  })

  describe('性能测试', () => {
    it('应该能处理大量操作', async () => {
      const operations = Array.from({ length: 50 }, (_, i) =>
        createMockStreamOperation({
          content: `block ${i}`,
          sessionId: 'bulk-test',
        }),
      )

      const startTime = Date.now()
      manager.queueOperations(operations)

      // 🔧 智能等待 - 轮询直到所有操作完成
      let attempts = 0
      const maxAttempts = 100 // 最多等待5秒 (100 * 50ms)

      while (attempts < maxAttempts) {
        const status = manager.getQueueStatus()
        const history = manager.getOperationHistory()

        // 队列为空且所有操作都处理完成
        if (status.queueSize === 0 && !status.isProcessing && history.length === 50) {
          break
        }

        // eslint-disable-next-line no-await-in-loop
        await waitForAsync(50)
        // eslint-disable-next-line no-plusplus
        attempts++
      }

      const endTime = Date.now()
      const processingTime = endTime - startTime

      const history = manager.getOperationHistory()
      expect(history).toHaveLength(50)
      expect(history.every(result => result.success)).toBe(true)

      // 处理时间应该在合理范围内 (50个操作 * 50ms间隔 = ~2.5秒 + 容错)
      expect(processingTime).toBeLessThan(4000)
    })

    it('应该能处理大量diff操作', async () => {
      manager.pause()

      const operations = Array.from({ length: 20 }, (_, i) =>
        createMockStreamOperation({
          type: 'append',
          content: `diff block ${i}`,
          sessionId: 'diff-bulk-test',
        }),
      )

      // 创建diff操作
      const operationIds = operations.map(op => manager.queueOperationWithDiff(op))

      expect(manager.getPendingDiffOperations()).toHaveLength(20)

      const startTime = Date.now()

      // 批量确认
      const batchApproveResult = manager.approveAllDiffOperations()
      expect(batchApproveResult).toBe(true)

      manager.resume()

      // 等待所有操作完成
      let attempts = 0
      const maxAttempts = 150 // 最多等待7.5秒

      while (attempts < maxAttempts) {
        const pendingOps = manager.getPendingDiffOperations()
        const status = manager.getQueueStatus()

        if (pendingOps.length === 0 && status.queueSize === 0 && !status.isProcessing) {
          break
        }

        // eslint-disable-next-line no-await-in-loop
        await waitForAsync(50)
        // eslint-disable-next-line no-plusplus
        attempts++
      }

      const endTime = Date.now()
      const processingTime = endTime - startTime

      // 检查所有操作都成功
      const history = manager.getOperationHistory()
      const diffResults = history.filter(h => operationIds.includes(h.operation.id))
      expect(diffResults).toHaveLength(20)
      expect(diffResults.every(r => r.success)).toBe(true)

      // 没有剩余的pending操作
      expect(manager.getPendingDiffOperations()).toHaveLength(0)

      // 处理时间应该在合理范围内
      expect(processingTime).toBeLessThan(6000)
    })
  })
})
