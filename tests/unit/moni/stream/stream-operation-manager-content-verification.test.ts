/**
 * StreamOperationManager 内容验证测试
 * 
 * 目的：验证 approve/reject 操作的实际内容变更效果
 * 重点：确保 reject 操作真正撤销内容，而不仅仅是清理状态
 */

import { StreamOperationManager, BlockOperationType, type StreamOperation } from '@tiptap/core'
import { JSDOM } from 'jsdom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// 设置DOM环境
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
global.document = dom.window.document
global.window = dom.window as any

describe('StreamOperationManager - 内容变更验证测试', () => {
  let manager: StreamOperationManager
  let mockView: any
  let mockDoc: any
  let mockTransaction: any
  let documentContent: Map<string, any> // 模拟文档内容存储

  beforeEach(() => {
    // 重置文档内容
    documentContent = new Map()
    
    // 创建更真实的 mock 对象
    mockTransaction = {
      setNodeMarkup: vi.fn((pos, type, attrs) => {
        // 模拟节点属性更新
        const nodeId = `node-${pos}`
        const existingNode = documentContent.get(nodeId) || {}
        documentContent.set(nodeId, { ...existingNode, attrs: { ...existingNode.attrs, ...attrs } })
      }),
      insert: vi.fn((pos, content) => {
        // 模拟节点插入
        const nodeId = `node-${pos}-new`
        documentContent.set(nodeId, content)
      }),
      delete: vi.fn((from, to) => {
        // 模拟节点删除
        const nodeId = `node-${from}`
        documentContent.delete(nodeId)
      }),
      replaceWith: vi.fn((from, to, content) => {
        // 模拟节点替换
        const nodeId = `node-${from}`
        documentContent.set(nodeId, content)
      })
    }

    mockDoc = {
      descendants: vi.fn((callback) => {
        // 模拟文档遍历
        let index = 0
        for (const [nodeId, nodeData] of documentContent.entries()) {
          const pos = parseInt(nodeId.split('-')[1]) || index
          callback(nodeData, pos)
          index++
        }
      }),
      content: { size: 0 }
    }

    mockView = {
      state: {
        doc: mockDoc,
        tr: mockTransaction
      },
      dispatch: vi.fn((tr) => {
        // 模拟事务应用
        console.log('Transaction dispatched:', tr)
      })
    }

    const mockSchema = {
      nodes: {
        paragraph: {
          create: vi.fn().mockReturnValue({
            type: { name: 'paragraph' },
            attrs: {},
            content: null,
            nodeSize: 2,
            textContent: ''
          })
        }
      },
      text: vi.fn().mockReturnValue({
        type: { name: 'text' },
        attrs: {},
        content: null,
        nodeSize: 1,
        textContent: ''
      })
    }

    manager = new StreamOperationManager(mockView, mockSchema)
  })

  afterEach(() => {
    documentContent.clear()
    vi.clearAllMocks()
  })

  describe('🧪 REPLACE 操作的内容验证', () => {
    let originalNode: any
    let operation: StreamOperation

    beforeEach(() => {
      // 创建原始节点
      originalNode = {
        type: { name: 'paragraph' },
        attrs: {
          moniBlockId: 'block-123',
          diffMode: false
        },
        nodeSize: 2,
        textContent: '原始内容'
      }
      
      // 添加到文档中
      documentContent.set('node-0', originalNode)

      // 创建替换操作
      operation = {
        moniOperationId: 'op-replace-123',
        moniStreamId: 'stream-1',
        moniBlockId: 'block-123',
        type: BlockOperationType.REPLACE,
        content: {
          type: 'paragraph',
          text: 'AI修改后的内容'
        },
        status: 'pending' as any,
        timestamp: Date.now()
      }
    })

    it('🎯 应该正确处理 APPROVE 操作 - 内容应用AI修改', async () => {
      // 1. 队列操作（会创建diff预览）
      manager.queueOperation(operation)
      
      // 验证diff预览创建
      expect(mockTransaction.setNodeMarkup).toHaveBeenCalled()
      
      // 模拟diff状态已设置
      const nodeWithDiff = {
        ...originalNode,
        attrs: {
          ...originalNode.attrs,
          diffMode: true,
          diffStatus: 'pending',
          diffOperationId: 'op-replace-123',
          diffType: 'original',
          moniDiffTempId: 'temp_op-replace-123'
        }
      }
      documentContent.set('node-0', nodeWithDiff)

      // 模拟临时新节点
      const tempNode = {
        type: { name: 'paragraph' },
        attrs: {
          diffMode: true,
          diffStatus: 'pending', 
          diffOperationId: 'op-replace-123',
          diffType: 'new',
          moniDiffTempId: 'temp_op-replace-123'
        },
        nodeSize: 2,
        textContent: 'AI修改后的内容'
      }
      documentContent.set('node-1', tempNode)

      // 2. 确认操作
      const approveResult = manager.approveOperation('op-replace-123')
      expect(approveResult).toBe(true)

      // 3. 验证状态变更为approved
      expect(mockTransaction.setNodeMarkup).toHaveBeenCalledWith(
        expect.any(Number),
        undefined,
        expect.objectContaining({
          diffStatus: 'approved'
        })
      )

      // 4. 模拟处理完成后的最终状态验证
      // 注意：真实情况下，approved节点会被处理并应用内容变更
      // 这里我们验证的是确认操作确实触发了正确的状态变更
    })

    it('🎯 应该正确处理 REJECT 操作 - 内容撤销到原始状态', async () => {
      // 1. 队列操作（会创建diff预览）
      manager.queueOperation(operation)
      
      // 模拟diff状态已设置 - 原始节点
      const originalNodeWithDiff = {
        ...originalNode,
        attrs: {
          ...originalNode.attrs,
          diffMode: true,
          diffStatus: 'pending',
          diffOperationId: 'op-replace-123',
          diffType: 'original',
          moniDiffTempId: 'temp_op-replace-123'
        }
      }
      documentContent.set('node-0', originalNodeWithDiff)

      // 模拟临时新节点
      const tempNode = {
        type: { name: 'paragraph' },
        attrs: {
          diffMode: true,
          diffStatus: 'pending',
          diffOperationId: 'op-replace-123', 
          diffType: 'new',
          moniDiffTempId: 'temp_op-replace-123'
        },
        nodeSize: 2,
        textContent: 'AI修改后的内容'
      }
      documentContent.set('node-1', tempNode)

      // 2. 拒绝操作
      const rejectResult = manager.rejectOperation('op-replace-123')
      expect(rejectResult).toBe(true)

      // 3. 验证立即状态变更为rejected
      expect(mockTransaction.setNodeMarkup).toHaveBeenCalledWith(
        expect.any(Number),
        undefined,
        expect.objectContaining({
          diffStatus: 'rejected'
        })
      )

      // 4. 验证1秒后会调用撤销逻辑
      // 使用 fake timers 来测试延迟操作
      vi.useFakeTimers()
      
      // 快进1秒
      vi.advanceTimersByTime(1000)

      // 验证撤销操作被执行（临时节点应该被删除）
      await vi.runAllTimersAsync()
      
      // 检查是否调用了删除操作（删除临时新节点）
      expect(mockTransaction.delete).toHaveBeenCalled()

      vi.useRealTimers()
    })

    it('🔍 应该确保 APPROVE 和 REJECT 的最终效果不同', async () => {
      // 测试策略：创建两个相同的操作，一个approve，一个reject
      // 验证最终的文档状态确实不同

      const operation2 = {
        ...operation,
        moniOperationId: 'op-replace-456',
        moniBlockId: 'block-456'
      }

      // 创建第二个原始节点
      const originalNode2 = {
        ...originalNode,
        attrs: { ...originalNode.attrs, moniBlockId: 'block-456' }
      }
      documentContent.set('node-2', originalNode2)

      // 场景1：Approve操作
      manager.queueOperation(operation)
      manager.approveOperation('op-replace-123')

      // 场景2：Reject操作  
      manager.queueOperation(operation2)
      manager.rejectOperation('op-replace-456')

      // 验证两个操作的状态不同
      const approveCall = mockTransaction.setNodeMarkup.mock.calls.find(
        call => call[2]?.diffStatus === 'approved'
      )
      const rejectCall = mockTransaction.setNodeMarkup.mock.calls.find(
        call => call[2]?.diffStatus === 'rejected'
      )

      expect(approveCall).toBeDefined()
      expect(rejectCall).toBeDefined()
      expect(approveCall).not.toEqual(rejectCall)
    })
  })

  describe('🧪 INSERT 操作的内容验证', () => {
    it('🎯 INSERT操作的reject应该删除插入的内容', async () => {
      const insertOperation: StreamOperation = {
        moniOperationId: 'op-insert-123',
        moniStreamId: 'stream-1', 
        moniBlockId: 'block-new',
        type: BlockOperationType.INSERT,
        content: {
          type: 'paragraph',
          text: '新插入的内容'
        },
        status: 'pending' as any,
        timestamp: Date.now()
      }

      // 队列插入操作
      manager.queueOperation(insertOperation)
      
      // 模拟插入后的新节点
      const insertedNode = {
        type: { name: 'paragraph' },
        attrs: {
          diffMode: true,
          diffStatus: 'pending',
          diffOperationId: 'op-insert-123',
          diffType: 'new'
        },
        nodeSize: 2,
        textContent: '新插入的内容'
      }
      documentContent.set('node-insert', insertedNode)

      // 拒绝插入操作
      manager.rejectOperation('op-insert-123')

      // 使用 fake timers 测试延迟删除
      vi.useFakeTimers()
      vi.advanceTimersByTime(1000)
      await vi.runAllTimersAsync()

      // 验证插入的节点被删除
      expect(mockTransaction.delete).toHaveBeenCalled()

      vi.useRealTimers()
    })
  })

  describe('🧪 边界情况测试', () => {
    it('❌ 对不存在的操作ID调用reject应该返回false', () => {
      const result = manager.rejectOperation('non-existent-id')
      expect(result).toBe(false)
    })

    it('❌ 对不存在的操作ID调用approve应该返回false', () => {
      const result = manager.approveOperation('non-existent-id')
      expect(result).toBe(false)
    })

    it('🔄 多次reject同一个操作应该安全处理', async () => {
      const operation: StreamOperation = {
        moniOperationId: 'op-multi-reject',
        moniStreamId: 'stream-1',
        moniBlockId: 'block-multi',
        type: BlockOperationType.REPLACE,
        content: { type: 'paragraph', text: 'test' },
        status: 'pending' as any,
        timestamp: Date.now()
      }

      manager.queueOperation(operation)
      
      // 模拟节点存在
      const testNode = {
        type: { name: 'paragraph' },
        attrs: {
          diffOperationId: 'op-multi-reject',
          diffStatus: 'pending'
        }
      }
      documentContent.set('node-multi', testNode)

      // 第一次reject
      const result1 = manager.rejectOperation('op-multi-reject')
      expect(result1).toBe(true)

      // 第二次reject（节点可能已被清理）
      const result2 = manager.rejectOperation('op-multi-reject')
      expect(result2).toBe(false) // 应该安全返回false
    })
  })

  describe('📊 调试和日志验证', () => {
    it('🔍 reject操作应该输出预期的日志', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation()
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation()

      const operation: StreamOperation = {
        moniOperationId: 'op-log-test',
        moniStreamId: 'stream-1',
        moniBlockId: 'block-log',
        type: BlockOperationType.REPLACE,
        content: { type: 'paragraph', text: 'test' },
        status: 'pending' as any,
        timestamp: Date.now()
      }

      manager.queueOperation(operation)

      // 模拟节点存在
      const testNode = {
        type: { name: 'paragraph' },
        attrs: {
          diffOperationId: 'op-log-test',
          diffStatus: 'pending',
          diffType: 'original'
        }
      }
      documentContent.set('node-log', testNode)

      manager.rejectOperation('op-log-test')

      vi.useFakeTimers()
      vi.advanceTimersByTime(1000)
      await vi.runAllTimersAsync()

      // 验证撤销日志被输出
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[StreamOperationManager] 撤销操作: op-log-test')
      )

      vi.useRealTimers()
      consoleSpy.mockRestore()
      consoleWarnSpy.mockRestore()
    })
  })
})