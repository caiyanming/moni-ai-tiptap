import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Editor } from '../../packages/core/src/Editor'
import { BlockOperationType, StreamOperationManager } from '../../packages/core/src/StreamOperationManager.js'
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

      // 现在返回操作 ID 而不是 boolean
      expect(typeof result).toBe('string')
      expect(result).toMatch(/^op_/)
      expect(manager.getQueueStatus().queueSize).toBe(1)

      // 恢复处理进行清理
      manager.resume()
    })

    it('应该能批量添加操作', () => {
      // 暂停处理以检查队列状态
      manager.pause()

      const operations = [
        createMockStreamOperation({ content: { text: 'chunk1' } }),
        createMockStreamOperation({ content: { text: 'chunk2' } }),
        createMockStreamOperation({ content: { text: 'chunk3' } }),
      ]

      const result = manager.queueOperations(operations)

      // 现在返回操作 ID 数组
      expect(Array.isArray(result)).toBe(true)
      expect(result).toHaveLength(3)
      expect(manager.getQueueStatus().queueSize).toBe(3)

      // 恢复处理进行清理
      manager.resume()
    })

    it('应该拒绝超出队列容量的操作', () => {
      const smallQueueManager = new StreamOperationManager(editor, {
        maxQueueSize: 2,
      })

      const operations = [
        createMockStreamOperation({ content: { text: 'chunk1' } }),
        createMockStreamOperation({ content: { text: 'chunk2' } }),
        createMockStreamOperation({ content: { text: 'chunk3' } }),
      ]

      expect(() => {
        smallQueueManager.queueOperations(operations)
      }).toThrow('Not enough queue capacity for batch operations')

      smallQueueManager.destroy()
    })

    it('应该不自动处理队列（需要显式确认）', async () => {
      const operation = createMockStreamOperation()
      const operationId = manager.queueOperation(operation)

      // 操作不会自动处理，需要显式确认
      expect(manager.getQueueStatus().isProcessing).toBe(false)
      expect(manager.getQueueStatus().queueSize).toBe(1)

      // 确认操作后才会处理
      const approved = manager.approveDiffOperation(operationId)
      expect(approved).toBe(true)

      // 等待处理完成
      await waitForAsync(() => manager.getQueueStatus().queueSize === 0, 1000)
    })
  })

  describe('Block级别操作执行', () => {
    it('应该能执行INSERT操作 - 在block list中插入新block', async () => {
      const operation = createMockStreamOperation({
        type: BlockOperationType.INSERT,
        blockId: 'document-root', // 在文档开头插入
        content: {
          type: 'paragraph',
          content: [{ type: 'text', text: '插入的段落' }],
        },
      })

      const operationId = manager.queueOperation(operation)

      // 显式确认操作
      const approved = manager.approveDiffOperation(operationId)
      expect(approved).toBe(true)

      // 等待处理完成
      await waitForAsync(() => manager.getQueueStatus().queueSize === 0)

      const history = manager.getOperationHistory()
      expect(history).toHaveLength(1)
      expect(history[0].success).toBe(true)
      expect(history[0].operation.type).toBe(BlockOperationType.INSERT)
    })

    it('应该能执行APPEND操作 - 在block list末尾添加新block', async () => {
      const operation = createMockStreamOperation({
        type: BlockOperationType.APPEND,
        blockId: '00000000-0000-0000-0000-000000000000', // NULL_BLOCK_UUID
        content: {
          type: 'paragraph',
          content: [{ type: 'text', text: '追加的段落' }],
        },
      })

      const operationId = manager.queueOperation(operation)

      // 显式确认操作
      const approved = manager.approveDiffOperation(operationId)
      expect(approved).toBe(true)

      // 等待处理完成
      await waitForAsync(() => manager.getQueueStatus().queueSize === 0)

      const history = manager.getOperationHistory()
      expect(history).toHaveLength(1)
      expect(history[0].success).toBe(true)
      expect(history[0].operation.type).toBe(BlockOperationType.APPEND)
    })

    it('应该能执行REPLACE操作 - 替换现有block', async () => {
      // 直接替换mock文档中已存在的block-1
      const replaceOperation = createMockStreamOperation({
        type: BlockOperationType.REPLACE,
        blockId: 'block-1', // 使用mock文档中已存在的block ID
        content: {
          type: 'paragraph',
          content: [{ type: 'text', text: '替换后的段落' }],
        },
      })

      const replaceOpId = manager.queueOperation(replaceOperation)
      manager.approveDiffOperation(replaceOpId)
      await waitForAsync(() => manager.getQueueStatus().queueSize === 0)

      const history = manager.getOperationHistory()
      expect(history).toHaveLength(1)
      expect(history[0].success).toBe(true)
      expect(history[0].operation.type).toBe(BlockOperationType.REPLACE)
    })

    it('应该能执行DELETE操作 - 删除现有block', async () => {
      // 直接删除mock文档中已存在的block-2
      const deleteOperation = createMockStreamOperation({
        type: BlockOperationType.DELETE,
        blockId: 'block-2', // 使用mock文档中已存在的block ID
        content: { text: '' },
      })

      const deleteOpId = manager.queueOperation(deleteOperation)
      manager.approveDiffOperation(deleteOpId)
      await waitForAsync(() => manager.getQueueStatus().queueSize === 0)

      const history = manager.getOperationHistory()
      expect(history).toHaveLength(1)
      expect(history[0].success).toBe(true)
      expect(history[0].operation.type).toBe(BlockOperationType.DELETE)
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
        type: BlockOperationType.APPEND,
        content: jsonContent,
      })

      const operationId = manager.queueOperation(operation)
      manager.approveDiffOperation(operationId)

      // 等待处理完成
      await waitForAsync(() => manager.getQueueStatus().queueSize === 0)

      const history = manager.getOperationHistory()
      expect(history).toHaveLength(1)
      expect(history[0].success).toBe(true)
      expect(history[0].operation.type).toBe(BlockOperationType.APPEND)
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
        type: BlockOperationType.APPEND,
        content: complexContent,
      })

      const operationId = manager.queueOperation(operation)
      manager.approveDiffOperation(operationId)

      // 等待处理完成
      await waitForAsync(() => manager.getQueueStatus().queueSize === 0)

      const history = manager.getOperationHistory()
      expect(history).toHaveLength(1)
      expect(history[0].success).toBe(true)
      expect(history[0].operation.type).toBe(BlockOperationType.APPEND)
    })

    it('应该处理不支持的操作类型', async () => {
      const operation = createMockStreamOperation({
        type: 'unsupported' as any,
      })

      const operationId = manager.queueOperation(operation)
      manager.approveDiffOperation(operationId)

      // 等待处理完成
      await waitForAsync(() => manager.getQueueStatus().queueSize === 0)

      const history = manager.getOperationHistory()
      expect(history).toHaveLength(1)
      expect(history[0].success).toBe(false)
      expect(history[0].error).toContain('Unsupported operation type')
    })

    it('应该处理目标block不存在的情况', async () => {
      const operation = createMockStreamOperation({
        blockId: 'nonexistent-block',
        type: BlockOperationType.REPLACE,
      })

      const operationId = manager.queueOperation(operation)
      manager.approveDiffOperation(operationId)

      // 等待处理完成
      await waitForAsync(() => manager.getQueueStatus().queueSize === 0)

      const history = manager.getOperationHistory()
      expect(history).toHaveLength(1)
      expect(history[0].success).toBe(false)
      expect(history[0].error).toContain('Target block not found')
    })

    it('应该处理无效的JSON内容', async () => {
      const operation = createMockStreamOperation({
        type: BlockOperationType.APPEND,
        content: null as any,
      })

      const operationId = manager.queueOperation(operation)
      manager.approveDiffOperation(operationId)

      // 等待处理完成
      await waitForAsync(() => manager.getQueueStatus().queueSize === 0)

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
        type: BlockOperationType.APPEND,
        content: unknownTypeContent,
      })

      const operationId = manager.queueOperation(operation)
      manager.approveDiffOperation(operationId)

      // 等待处理完成
      await waitForAsync(() => manager.getQueueStatus().queueSize === 0)

      const history = manager.getOperationHistory()
      expect(history).toHaveLength(1)
      expect(history[0].success).toBe(true) // 应该降级为段落并成功
      expect(history[0].operation.type).toBe(BlockOperationType.APPEND)
    })
  })

  describe('操作历史', () => {
    it('应该记录操作历史', async () => {
      const operations = [
        createMockStreamOperation({ type: BlockOperationType.APPEND, content: { text: 'block1' } }),
        createMockStreamOperation({ type: BlockOperationType.APPEND, content: { text: 'block2' } }),
        createMockStreamOperation({ type: BlockOperationType.APPEND, content: { text: 'block3' } }),
      ]

      operations.forEach(op => manager.queueOperation(op))

      // 批量确认所有操作
      const success = manager.approveAllDiffOperations()
      expect(success).toBe(true)

      // 等待处理完成
      await waitForAsync(() => manager.getQueueStatus().queueSize === 0, 2000)

      const history = manager.getOperationHistory()
      expect(history).toHaveLength(3)
      expect(history.every(result => result.success)).toBe(true)
    })

    it('应该按会话ID过滤操作历史', async () => {
      const session1Operation = createMockStreamOperation({
        sessionId: 'session1',
        type: BlockOperationType.APPEND,
        content: { text: 'session1 block' },
      })
      const session2Operation = createMockStreamOperation({
        sessionId: 'session2',
        type: BlockOperationType.APPEND,
        content: { text: 'session2 block' },
      })

      const op1Id = manager.queueOperation(session1Operation)
      const op2Id = manager.queueOperation(session2Operation)

      manager.approveDiffOperation(op1Id)
      manager.approveDiffOperation(op2Id)

      // 等待处理完成
      await waitForAsync(() => manager.getQueueStatus().queueSize === 0, 2000)

      const session1History = manager.getOperationHistory('session1')
      const session2History = manager.getOperationHistory('session2')

      expect(session1History).toHaveLength(1)
      expect(session2History).toHaveLength(1)
      expect(session1History[0].operation.sessionId).toBe('session1')
      expect(session2History[0].operation.sessionId).toBe('session2')
    })
  })

  describe('队列管理', () => {
    it('应该能暂停和恢复处理', async () => {
      const operation = createMockStreamOperation()

      // 暂停处理
      manager.pause()
      const operationId = manager.queueOperation(operation)

      expect(manager.getQueueStatus().isProcessing).toBe(false)
      expect(manager.getQueueStatus().queueSize).toBe(1)

      // 确认操作但不会处理（因为已暂停）
      const approved = manager.approveDiffOperation(operationId)
      expect(approved).toBe(true)

      // 恢复处理
      manager.resume()

      // 等待处理完成
      await waitForAsync(() => manager.getQueueStatus().queueSize === 0, 1000)

      const history = manager.getOperationHistory()
      expect(history).toHaveLength(1)
      expect(history[0].success).toBe(true)
    })

    it('应该能清空队列', () => {
      // 🔧 暂停处理以检查队列状态
      manager.pause()

      const operations = [
        createMockStreamOperation({ content: { text: 'block1' } }),
        createMockStreamOperation({ content: { text: 'block2' } }),
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
        createMockStreamOperation({ sessionId: 'session1', content: { text: 'block1' } }),
        createMockStreamOperation({ sessionId: 'session1', content: { text: 'block2' } }),
      ]
      const session2Operations = [createMockStreamOperation({ sessionId: 'session2', content: { text: 'block3' } })]

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
      // 简化的错误处理测试 - 直接模拟 executeAppendOperation 失败
      // 避免在早期的diff rendering阶段就失败
      const operation = createMockStreamOperation({
        blockId: 'nonexistent-block', // 使用不存在的block ID来触发错误
        type: BlockOperationType.REPLACE,
      })

      const operationId = manager.queueOperation(operation)
      manager.approveDiffOperation(operationId)

      // 等待处理完成
      await waitForAsync(() => manager.getQueueStatus().queueSize === 0)

      const history = manager.getOperationHistory()
      expect(history).toHaveLength(1)
      expect(history[0].success).toBe(false)
      expect(history[0].error).toContain('Target block not found')
    })

    it('应该处理回调异常', async () => {
      const errorCallback = vi.fn().mockImplementation(() => {
        throw new Error('Callback error')
      })

      const managerWithCallback = new StreamOperationManager(editor, {
        onOperationComplete: errorCallback,
      })

      const operation = createMockStreamOperation()
      const operationId = managerWithCallback.queueOperation(operation)
      managerWithCallback.approveDiffOperation(operationId)

      // 等待处理完成
      await waitForAsync(() => managerWithCallback.getQueueStatus().queueSize === 0)

      // 即使回调出错，操作也应该完成
      const history = managerWithCallback.getOperationHistory()
      expect(history).toHaveLength(1)
      expect(history[0].success).toBe(true)

      managerWithCallback.destroy()
    })
  })

  describe('🔥 Diff操作支持', () => {
    it('应该能创建diff预览操作', () => {
      const operation = createMockStreamOperation()
      const operationId = manager.queueOperation(operation)

      expect(operationId).toBeTruthy()
      expect(typeof operationId).toBe('string')
      // 操作默认以 pending 状态进入diff模式
      const pending = manager.getPendingDiffOperations()
      expect(pending).toHaveLength(1)
      expect(pending[0].id).toBe(operationId)
    })

    it('应该能确认diff操作', async () => {
      const operation = createMockStreamOperation()
      const operationId = manager.queueOperation(operation)

      // 检查操作是否在待确认列表中
      expect(manager.getPendingDiffOperations()).toHaveLength(1)

      const success = manager.approveDiffOperation(operationId)
      expect(success).toBe(true)

      // 等待操作完成
      await waitForAsync(() => manager.getQueueStatus().queueSize === 0)

      // 确认后应该被移出待确认列表
      expect(manager.getPendingDiffOperations()).toHaveLength(0)

      // 检查操作历史
      const history = manager.getOperationHistory()
      expect(history).toHaveLength(1)
      expect(history[0].success).toBe(true)
    })

    it('应该能拒绝diff操作', () => {
      const operation = createMockStreamOperation()
      const operationId = manager.queueOperation(operation)

      // 检查操作是否在待确认列表中
      expect(manager.getPendingDiffOperations()).toHaveLength(1)

      const success = manager.rejectDiffOperation(operationId)
      expect(success).toBe(true)

      // 拒绝后应该被移出待确认列表
      expect(manager.getPendingDiffOperations()).toHaveLength(0)
    })

    it('应该能批量确认所有diff操作', async () => {
      const operations = [createMockStreamOperation(), createMockStreamOperation(), createMockStreamOperation()]

      operations.forEach(op => manager.queueOperation(op))
      expect(manager.getPendingDiffOperations()).toHaveLength(3)

      const success = manager.approveAllDiffOperations()
      expect(success).toBe(true)

      // 等待所有操作完成
      await waitForAsync(() => manager.getQueueStatus().queueSize === 0)

      expect(manager.getPendingDiffOperations()).toHaveLength(0)

      // 检查操作历史
      const history = manager.getOperationHistory()
      expect(history).toHaveLength(3)
      expect(history.every(h => h.success)).toBe(true)
    })

    it('应该能批量拒绝所有diff操作', () => {
      const operations = [createMockStreamOperation(), createMockStreamOperation()]

      operations.forEach(op => manager.queueOperation(op))
      expect(manager.getPendingDiffOperations()).toHaveLength(2)

      const success = manager.rejectAllDiffOperations()
      expect(success).toBe(true)

      expect(manager.getPendingDiffOperations()).toHaveLength(0)
    })

    it('应该正确设置diff属性', () => {
      const operation = createMockStreamOperation()
      const operationId = manager.queueOperation(operation)

      const pendingOps = manager.getPendingDiffOperations()
      expect(pendingOps).toHaveLength(1)
      expect(pendingOps[0].status).toBe('pending')
      expect(pendingOps[0].id).toBe(operationId)
    })

    it('应该处理diff操作的目标block不存在情况', () => {
      const operation = createMockStreamOperation({
        blockId: 'nonexistent-block',
      })

      const operationId = manager.queueOperation(operation)
      expect(operationId).toBeTruthy()

      // 应该能处理不存在的目标块，不会抛出错误
      expect(manager.getPendingDiffOperations()).toHaveLength(1)
    })

    it('应该支持不同类型的diff操作', () => {
      const insertOp = createMockStreamOperation({ type: BlockOperationType.INSERT })
      const replaceOp = createMockStreamOperation({ type: BlockOperationType.REPLACE })
      const deleteOp = createMockStreamOperation({ type: BlockOperationType.DELETE })

      manager.queueOperation(insertOp)
      manager.queueOperation(replaceOp)
      manager.queueOperation(deleteOp)

      const pendingOps = manager.getPendingDiffOperations()
      expect(pendingOps).toHaveLength(3)
      expect(pendingOps.map(op => op.type)).toEqual([
        BlockOperationType.INSERT,
        BlockOperationType.REPLACE,
        BlockOperationType.DELETE,
      ])
    })
  })

  describe('性能测试', () => {
    it('应该能处理大量操作', async () => {
      const operationCount = 50
      const operations = Array.from({ length: operationCount }, () => createMockStreamOperation())

      // 批量添加操作
      const startTime = Date.now()
      const operationIds = manager.queueOperations(operations)
      const queueTime = Date.now() - startTime

      expect(operationIds).toHaveLength(operationCount)

      // 批量确认所有操作
      const success = manager.approveAllDiffOperations()
      expect(success).toBe(true)

      // 等待所有操作完成
      await waitForAsync(() => manager.getQueueStatus().queueSize === 0, 10000)
      const totalTime = Date.now() - startTime

      const history = manager.getOperationHistory()
      expect(history).toHaveLength(operationCount)
      expect(history.every(h => h.success)).toBe(true)

      // 性能断言
      expect(queueTime).toBeLessThan(100) // 队列操作应该在100ms内
      expect(totalTime).toBeLessThan(10000) // 总处理应该在10秒内
    })

    it('应该能处理大量 diff 操作', async () => {
      const operationCount = 20
      const operations = Array.from({ length: operationCount }, () => createMockStreamOperation())

      const startTime = Date.now()
      const operationIds = operations.map(op => manager.queueOperation(op))
      const endTime = Date.now()

      expect(operationIds).toHaveLength(operationCount)
      expect(manager.getPendingDiffOperations()).toHaveLength(operationCount)
      expect(endTime - startTime).toBeLessThan(100) // 应该在100ms内完成

      // 批量确认
      const success = manager.approveAllDiffOperations()
      expect(success).toBe(true)

      // 等待处理完成
      await waitForAsync(() => manager.getQueueStatus().queueSize === 0, 5000)

      expect(manager.getPendingDiffOperations()).toHaveLength(0)

      // 检查操作历史
      const history = manager.getOperationHistory()
      expect(history).toHaveLength(operationCount)
    })
  })
})
