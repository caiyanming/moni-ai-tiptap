/**
 * Approve vs Reject 行为对比测试
 * 
 * 这个测试文件专门验证 approve 和 reject 操作的根本差异
 * 确保它们产生完全不同的最终结果
 */

import { StreamOperationManager, BlockOperationType, type StreamOperation } from '@tiptap/core'
import { JSDOM } from 'jsdom' 
import { beforeEach, describe, expect, it, vi } from 'vitest'

// 设置DOM环境
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
global.document = dom.window.document
global.window = dom.window as any

describe('🔥 StreamOperationManager - Approve vs Reject 关键差异测试', () => {
  let manager: StreamOperationManager
  let mockView: any
  let transactionCalls: Array<{ method: string; args: any[] }> // 记录所有事务调用

  beforeEach(() => {
    transactionCalls = []

    // 创建记录所有调用的mock
    const createTrackingMock = (methodName: string) => 
      vi.fn((...args) => {
        transactionCalls.push({ method: methodName, args })
      })

    const mockTransaction = {
      setNodeMarkup: createTrackingMock('setNodeMarkup'),
      insert: createTrackingMock('insert'),
      delete: createTrackingMock('delete'),
      replaceWith: createTrackingMock('replaceWith')
    }

    // 模拟找到节点的情况 - 根据不同调用返回不同节点
    let callCount = 0
    const mockDoc = {
      descendants: vi.fn((callback) => {
        callCount++
        
        // 第一次调用（findNodeByOperationId）- 返回正在查找的节点
        if (callCount === 1) {
          const targetNode = {
            type: { name: 'paragraph' },
            attrs: {
              moniBlockId: 'block-test',
              diffOperationId: 'op-test-123',
              diffStatus: 'pending',
              diffType: 'new', // 重要：模拟找到的是新节点
              moniDiffTempId: 'temp_op-test-123'
            },
            nodeSize: 2,
            textContent: 'AI修改后的内容'
          }
          callback(targetNode, 1) // position = 1
          return
        }

        // 后续调用（removeTempNodes）- 返回需要删除的临时节点
        const tempNode = {
          type: { name: 'paragraph' },
          attrs: {
            diffOperationId: 'op-test-123',
            diffStatus: 'pending', 
            diffType: 'new',
            moniDiffTempId: 'temp_op-test-123'
          },
          nodeSize: 2,
          textContent: 'AI修改后的内容'
        }
        callback(tempNode, 1)
      }),
      content: { size: 0 }
    }

    mockView = {
      state: {
        doc: mockDoc,
        tr: mockTransaction
      },
      dispatch: vi.fn()
    }

    const mockSchema = {
      nodes: {
        paragraph: {
          create: vi.fn().mockReturnValue({
            type: { name: 'paragraph' },
            attrs: {},
            content: null,
            nodeSize: 2
          })
        }
      }
    }

    manager = new StreamOperationManager(mockView, mockSchema)
  })

  describe('💡 核心差异验证', () => {
    const operation: StreamOperation = {
      moniOperationId: 'op-test-123',
      moniStreamId: 'stream-1',
      moniBlockId: 'block-test',
      type: BlockOperationType.REPLACE,
      content: {
        type: 'paragraph',
        text: 'AI修改后的内容'
      },
      status: 'pending' as any,
      timestamp: Date.now()
    }

    it('✅ APPROVE 操作应该设置 approved 状态', () => {
      // 执行approve
      const result = manager.approveOperation('op-test-123')
      expect(result).toBe(true)

      // 验证调用了setNodeMarkup设置approved状态
      const approveCall = transactionCalls.find(
        call => call.method === 'setNodeMarkup' && 
               call.args[2]?.diffStatus === 'approved'
      )

      expect(approveCall).toBeDefined()
      expect(approveCall?.args[2]).toEqual(
        expect.objectContaining({
          diffStatus: 'approved'
        })
      )
    })

    it('❌ REJECT 操作应该设置 rejected 状态并触发删除', async () => {
      // 执行reject
      const result = manager.rejectOperation('op-test-123')
      expect(result).toBe(true)

      // 1. 验证立即设置rejected状态
      const rejectCall = transactionCalls.find(
        call => call.method === 'setNodeMarkup' &&
               call.args[2]?.diffStatus === 'rejected'
      )

      expect(rejectCall).toBeDefined()
      expect(rejectCall?.args[2]).toEqual(
        expect.objectContaining({
          diffStatus: 'rejected'
        })
      )

      // 2. 验证1秒后触发删除操作
      vi.useFakeTimers()
      
      // 清空之前的调用记录，专注于撤销操作
      transactionCalls.length = 0
      
      // 快进时间触发撤销
      vi.advanceTimersByTime(1000)
      await vi.runAllTimersAsync()

      // 验证删除操作被调用
      const deleteCall = transactionCalls.find(call => call.method === 'delete')
      expect(deleteCall).toBeDefined()

      vi.useRealTimers()
    })

    it('🎯 关键差异：Approve vs Reject 的调用模式完全不同', async () => {
      // 清空记录
      transactionCalls.length = 0

      // 测试approve流程
      manager.approveOperation('op-test-123')
      const approveCallsCount = transactionCalls.length
      const hasApprovedStatus = transactionCalls.some(
        call => call.args[2]?.diffStatus === 'approved'
      )
      const hasDeleteInApprove = transactionCalls.some(
        call => call.method === 'delete'
      )

      // 清空记录准备测试reject
      transactionCalls.length = 0

      // 测试reject流程（使用新的operationId避免冲突）
      manager.rejectOperation('op-test-123')
      
      const rejectImmediateCallsCount = transactionCalls.length
      const hasRejectedStatus = transactionCalls.some(
        call => call.args[2]?.diffStatus === 'rejected'
      )

      // 等待延迟操作
      vi.useFakeTimers()
      vi.advanceTimersByTime(1000)
      await vi.runAllTimersAsync()

      const rejectTotalCallsCount = transactionCalls.length
      const hasDeleteInReject = transactionCalls.some(
        call => call.method === 'delete'
      )

      // 验证关键差异
      expect(hasApprovedStatus).toBe(true)
      expect(hasRejectedStatus).toBe(true)
      expect(hasDeleteInApprove).toBe(false) // approve不应该删除内容
      expect(hasDeleteInReject).toBe(true)   // reject应该删除临时内容
      expect(rejectTotalCallsCount).toBeGreaterThan(rejectImmediateCallsCount) // reject有延迟操作

      vi.useRealTimers()
    })
  })

  describe('🚨 回归测试：确保Bug已修复', () => {
    it('🐛 Bug复现：原来的reject操作不会删除内容', async () => {
      // 这个测试确保修复后的代码确实会删除内容
      // 如果bug重现，这个测试应该失败

      manager.rejectOperation('op-test-123')

      // 记录立即操作后的状态
      const immediateCallsCount = transactionCalls.length
      
      vi.useFakeTimers()
      vi.advanceTimersByTime(1000)
      await vi.runAllTimersAsync()

      const finalCallsCount = transactionCalls.length

      // 如果bug存在，finalCallsCount会等于immediateCallsCount（没有额外的删除操作）
      // 修复后，应该有额外的删除操作
      expect(finalCallsCount).toBeGreaterThan(immediateCallsCount)
      
      // 确保确实调用了删除
      const hasDeleteOperation = transactionCalls.some(call => call.method === 'delete')
      expect(hasDeleteOperation).toBe(true)

      vi.useRealTimers()
    })

    it('📊 完整的事务调用日志验证', async () => {
      // 记录完整的操作流程，用于调试和验证

      console.log('🔍 开始记录reject操作的完整调用流程...')
      
      transactionCalls.length = 0
      manager.rejectOperation('op-test-123')

      console.log('📋 立即调用:', transactionCalls)

      vi.useFakeTimers()
      vi.advanceTimersByTime(1000)
      await vi.runAllTimersAsync()

      console.log('📋 延迟调用后总计:', transactionCalls)

      // 验证调用序列的完整性
      const setNodeMarkupCalls = transactionCalls.filter(call => call.method === 'setNodeMarkup')
      const deleteCalls = transactionCalls.filter(call => call.method === 'delete')

      expect(setNodeMarkupCalls.length).toBeGreaterThan(0) // 至少有状态设置
      expect(deleteCalls.length).toBeGreaterThan(0)        // 至少有删除操作

      vi.useRealTimers()
    })
  })
})