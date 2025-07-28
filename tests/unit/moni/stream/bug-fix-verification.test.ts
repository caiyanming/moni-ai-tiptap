/**
 * Bug修复验证测试
 * 
 * 验证 StreamOperationManager 的 rejectOperation 确实会撤销内容
 * 而不是仅仅清理状态（这是原来的bug）
 */

import { StreamOperationManager } from '@tiptap/core'
import { JSDOM } from 'jsdom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
global.document = dom.window.document
global.window = dom.window as any

describe('🐛 Bug修复验证 - Reject操作应该撤销内容', () => {
  it('✅ 最终验证：reject操作确实调用了删除方法', async () => {
    let transactionCalls: string[] = []
    
    const mockTransaction = {
      setNodeMarkup: vi.fn(() => transactionCalls.push('setNodeMarkup')),
      delete: vi.fn(() => transactionCalls.push('DELETE'))  // 重点监控
    }

    const mockDoc = {
      descendants: vi.fn((callback) => {
        const node = {
          attrs: {
            diffOperationId: 'test-123', 
            diffType: 'new'
          },
          nodeSize: 2
        }
        callback(node, 1)
      }),
      content: { size: 0 }
    }

    const mockView = {
      state: { doc: mockDoc, tr: mockTransaction },
      dispatch: vi.fn(() => transactionCalls.push('dispatch'))
    }

    const manager = new StreamOperationManager(mockView, { nodes: {} })

    console.log('🔍 调用前的事务记录:', transactionCalls)

    // 执行reject操作
    const result = manager.rejectOperation('test-123')
    expect(result).toBe(true)

    console.log('🔍 调用rejectOperation后的事务记录:', transactionCalls)

    // 等待延迟的撤销操作
    vi.useFakeTimers()
    vi.advanceTimersByTime(1100) // 稍微多等一点
    await vi.runAllTimersAsync()

    console.log('🔍 等待延迟操作后的最终事务记录:', transactionCalls)

    // 验证关键点：DELETE 操作被调用
    const hasDeleteCall = transactionCalls.includes('DELETE')
    console.log(`📊 是否包含DELETE调用: ${hasDeleteCall}`)
    
    expect(hasDeleteCall).toBe(true)
    expect(transactionCalls.length).toBeGreaterThan(1) // 不只是设置状态

    vi.useRealTimers()
  })

  it('🔄 对比：approve操作不应该直接调用删除', () => {
    let transactionCalls: string[] = []
    
    const mockTransaction = {
      setNodeMarkup: vi.fn(() => transactionCalls.push('setNodeMarkup')),
      delete: vi.fn(() => transactionCalls.push('DELETE'))
    }

    const mockDoc = {
      descendants: vi.fn((callback) => {
        const node = {
          attrs: {
            diffOperationId: 'test-approve', 
            diffType: 'original'
          }
        }
        callback(node, 1)
      }),
      content: { size: 0 }
    }

    const mockView = {
      state: { doc: mockDoc, tr: mockTransaction },
      dispatch: vi.fn()
    }

    const manager = new StreamOperationManager(mockView, { nodes: {} })

    // 执行approve操作
    manager.approveOperation('test-approve')

    console.log('🔍 approve操作的事务记录:', transactionCalls)

    // approve应该只设置状态，不直接删除
    const hasDeleteCall = transactionCalls.includes('DELETE')
    expect(hasDeleteCall).toBe(false)
  })

  it('📈 统计验证：reject比approve多执行了删除操作', async () => {
    // 这个测试证明了reject和approve的根本差异
    
    let approveCallCount = 0
    let rejectCallCount = 0
    
    // Mock for approve test
    const createMockForTest = (testType: 'approve' | 'reject') => {
      const mockTransaction = {
        setNodeMarkup: vi.fn(),
        delete: vi.fn(() => {
          if (testType === 'approve') approveCallCount++
          if (testType === 'reject') rejectCallCount++
        })
      }

      const mockDoc = {
        descendants: vi.fn((callback) => {
          const node = {
            attrs: {
              diffOperationId: `test-${testType}`,
              diffType: testType === 'approve' ? 'original' : 'new'
            },
            nodeSize: 2
          }
          callback(node, 1)
        }),
        content: { size: 0 }
      }

      return {
        state: { doc: mockDoc, tr: mockTransaction },
        dispatch: vi.fn()
      }
    }

    // 测试approve
    const approveManager = new StreamOperationManager(createMockForTest('approve'), { nodes: {} })
    approveManager.approveOperation('test-approve')

    // 测试reject
    const rejectManager = new StreamOperationManager(createMockForTest('reject'), { nodes: {} })
    rejectManager.rejectOperation('test-reject')

    // 等待reject的延迟操作
    vi.useFakeTimers()
    vi.advanceTimersByTime(1000)
    await vi.runAllTimersAsync()

    console.log(`📊 Approve删除调用次数: ${approveCallCount}`)
    console.log(`📊 Reject删除调用次数: ${rejectCallCount}`)

    // 关键验证：reject操作确实比approve多了删除调用
    expect(rejectCallCount).toBeGreaterThan(approveCallCount)
    expect(rejectCallCount).toBeGreaterThan(0)

    vi.useRealTimers()
  })
})