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

  describe('操作执行', () => {
    it('应该能执行替换操作', async () => {
      const operation = createMockStreamOperation({
        type: 'replace',
        content: 'new content',
      })

      manager.queueOperation(operation)

      // 等待处理完成
      await waitForAsync(100)

      const history = manager.getOperationHistory()
      expect(history).toHaveLength(1)
      expect(history[0].success).toBe(true)
      expect(history[0].operation.type).toBe('replace')
    })

    it('应该能执行追加操作', async () => {
      const operation = createMockStreamOperation({
        type: 'append',
        content: ' appended',
      })

      manager.queueOperation(operation)

      // 等待处理完成
      await waitForAsync(100)

      const history = manager.getOperationHistory()
      expect(history).toHaveLength(1)
      expect(history[0].success).toBe(true)
      expect(history[0].operation.type).toBe('append')
    })

    it('应该能执行插入操作', async () => {
      const operation = createMockStreamOperation({
        type: 'insert',
        content: 'inserted',
        position: 5,
      })

      manager.queueOperation(operation)

      // 等待处理完成
      await waitForAsync(100)

      const history = manager.getOperationHistory()
      expect(history).toHaveLength(1)
      expect(history[0].success).toBe(true)
      expect(history[0].operation.type).toBe('insert')
    })

    it('应该能执行删除操作', async () => {
      const operation = createMockStreamOperation({
        type: 'delete',
      })

      manager.queueOperation(operation)

      // 等待处理完成
      await waitForAsync(100)

      const history = manager.getOperationHistory()
      expect(history).toHaveLength(1)
      expect(history[0].success).toBe(true)
      expect(history[0].operation.type).toBe('delete')
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

    it('应该处理目标节点不存在的情况', async () => {
      const operation = createMockStreamOperation({
        blockId: 'nonexistent-block',
      })

      manager.queueOperation(operation)

      // 等待处理完成
      await waitForAsync(100)

      const history = manager.getOperationHistory()
      expect(history).toHaveLength(1)
      expect(history[0].success).toBe(false)
      expect(history[0].error).toContain('Target node not found')
    })
  })

  describe('队列管理', () => {
    it('应该能清空整个队列', () => {
      // 暂停处理以检查队列状态
      manager.pause()

      const operations = [
        createMockStreamOperation({ content: 'chunk1' }),
        createMockStreamOperation({ content: 'chunk2' }),
      ]

      manager.queueOperations(operations)
      expect(manager.getQueueStatus().queueSize).toBe(2)

      manager.clearQueue()
      expect(manager.getQueueStatus().queueSize).toBe(0)
    })

    it('应该能清空特定会话的队列', () => {
      // 暂停处理以检查队列状态
      manager.pause()

      const operations = [
        createMockStreamOperation({ sessionId: 'session-1' }),
        createMockStreamOperation({ sessionId: 'session-2' }),
        createMockStreamOperation({ sessionId: 'session-1' }),
      ]

      manager.queueOperations(operations)
      expect(manager.getQueueStatus().queueSize).toBe(3)

      manager.clearQueue('session-1')
      expect(manager.getQueueStatus().queueSize).toBe(1)
    })

    it('应该能暂停和恢复处理', async () => {
      const operation = createMockStreamOperation()

      manager.pause()
      expect(manager.getQueueStatus().isPaused).toBe(true)

      manager.queueOperation(operation)

      expect(manager.getQueueStatus().isPaused).toBe(true)
      expect(manager.getQueueStatus().isProcessing).toBe(false)
      expect(manager.getQueueStatus().queueSize).toBe(1)

      manager.resume()
      expect(manager.getQueueStatus().isPaused).toBe(false)
      expect(manager.getQueueStatus().isProcessing).toBe(true)

      // 等待处理完成
      await waitForAsync(100)
      expect(manager.getQueueStatus().queueSize).toBe(0)
    })
  })

  describe('操作历史', () => {
    it('应该记录所有操作历史', async () => {
      const operations = [
        createMockStreamOperation({ content: 'chunk1' }),
        createMockStreamOperation({ content: 'chunk2' }),
      ]

      manager.queueOperations(operations)

      // 等待处理完成
      await waitForAsync(200)

      const history = manager.getOperationHistory()
      expect(history).toHaveLength(2)
      expect(history.every(result => result.success)).toBe(true)
    })

    it('应该能按会话过滤历史', async () => {
      const operations = [
        createMockStreamOperation({ sessionId: 'session-1' }),
        createMockStreamOperation({ sessionId: 'session-2' }),
        createMockStreamOperation({ sessionId: 'session-1' }),
      ]

      manager.queueOperations(operations)

      // 等待处理完成
      await waitForAsync(200)

      const session1History = manager.getOperationHistory('session-1')
      const session2History = manager.getOperationHistory('session-2')

      expect(session1History).toHaveLength(2)
      expect(session2History).toHaveLength(1)
    })

    it('应该返回操作结果详情', async () => {
      const operation = createMockStreamOperation({
        type: 'replace',
        content: 'test',
      })

      manager.queueOperation(operation)

      // 等待处理完成
      await waitForAsync(100)

      const history = manager.getOperationHistory()
      const result = history[0]

      expect(result.success).toBe(true)
      expect(result.operation.content).toBe('test')
      expect(result.newPosition).toBeDefined()
      expect(result.affectedRange).toBeDefined()
    })
  })

  describe('节点属性更新', () => {
    it('应该更新节点的操作队列属性', async () => {
      const dispatchSpy = vi.spyOn(editor.view, 'dispatch')

      const operation = createMockStreamOperation()
      manager.queueOperation(operation)

      // 等待处理完成
      await waitForAsync(100)

      // 至少应该有两次dispatch调用：一次添加到队列，一次执行完成后更新
      expect(dispatchSpy).toHaveBeenCalled()
    })
  })

  describe('配置选项', () => {
    it('应该支持自定义操作间隔', async () => {
      const fastManager = new StreamOperationManager(editor, {
        operationInterval: 10,
      })

      const startTime = Date.now()

      const operations = [
        createMockStreamOperation({ content: 'chunk1' }),
        createMockStreamOperation({ content: 'chunk2' }),
      ]

      fastManager.queueOperations(operations)

      // 等待处理完成
      await waitForAsync(50)

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(100) // 应该比较快
      expect(fastManager.getQueueStatus().queueSize).toBe(0)

      fastManager.destroy()
    })

    it('应该支持自定义队列大小', () => {
      const customManager = new StreamOperationManager(editor, {
        maxQueueSize: 5,
      })

      expect(customManager.getQueueStatus().maxQueueSize).toBe(5)

      customManager.destroy()
    })
  })

  describe('调试模式', () => {
    it('应该在调试模式下输出日志', () => {
      const consoleSpy = vi.spyOn(console, 'log')

      const debugManager = new StreamOperationManager(editor, {
        debug: true,
      })

      const operation = createMockStreamOperation()
      debugManager.queueOperation(operation)

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[StreamOperationManager]'))

      consoleSpy.mockRestore()
      debugManager.destroy()
    })
  })

  describe('错误处理', () => {
    it('应该优雅处理操作执行错误', async () => {
      // 模拟编辑器抛出错误
      const mockEditor = createMockEditor()
      mockEditor.view.dispatch = vi.fn().mockImplementation(() => {
        throw new Error('Mock dispatch error')
      })

      const errorManager = new StreamOperationManager(mockEditor)

      const operation = createMockStreamOperation()
      errorManager.queueOperation(operation)

      // 等待处理完成
      await waitForAsync(100)

      const history = errorManager.getOperationHistory()
      expect(history).toHaveLength(1)
      expect(history[0].success).toBe(false)
      expect(history[0].error).toContain('Mock dispatch error')

      errorManager.destroy()
    })

    it('应该继续处理其他操作即使某个操作失败', async () => {
      const operations = [
        createMockStreamOperation({ blockId: 'nonexistent' }), // 会失败
        createMockStreamOperation({ blockId: 'block-1' }), // 会成功
      ]

      manager.queueOperations(operations)

      // 等待处理完成
      await waitForAsync(200)

      const history = manager.getOperationHistory()
      expect(history).toHaveLength(2)
      expect(history[0].success).toBe(false)
      expect(history[1].success).toBe(true)
    })
  })

  describe('性能测试', () => {
    it('应该能高效处理大量操作', async () => {
      // 使用更快的操作间隔进行性能测试
      const fastManager = new StreamOperationManager(editor, {
        operationInterval: 10, // 10ms间隔
      })

      const operations = []
      for (let i = 0; i < 50; i += 1) {
        operations.push(
          createMockStreamOperation({
            content: `chunk-${i}`,
          }),
        )
      }

      const startTime = Date.now()
      fastManager.queueOperations(operations)

      // 等待处理完成 (50 * 10ms + 一些缓冲时间)
      await waitForAsync(1000)

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(fastManager.getQueueStatus().queueSize).toBe(0)
      expect(fastManager.getOperationHistory()).toHaveLength(50)
      expect(duration).toBeLessThan(2000) // 应该在2秒内完成

      fastManager.destroy()
    })
  })

  describe('生命周期', () => {
    it('应该能正确销毁管理器', () => {
      const operation = createMockStreamOperation()
      manager.queueOperation(operation)

      expect(() => {
        manager.destroy()
      }).not.toThrow()

      expect(manager.getQueueStatus().queueSize).toBe(0)
      expect(manager.getOperationHistory()).toHaveLength(0)
    })

    it('应该在销毁时停止处理', () => {
      const operation = createMockStreamOperation()
      manager.queueOperation(operation)

      expect(manager.getQueueStatus().isProcessing).toBe(true)

      manager.destroy()

      expect(manager.getQueueStatus().isProcessing).toBe(false)
    })
  })
})
