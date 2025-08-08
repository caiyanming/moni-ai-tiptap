/**
 * 简化的 Reject 功能验证测试
 *
 * 目的：用最简单的方式验证reject操作确实调用了删除功能
 */

import { StreamOperationManager } from '@tiptap/core'
import { JSDOM } from 'jsdom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createMockStreamOperation } from './test-utils.js'

// 设置DOM环境
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
global.document = dom.window.document
global.window = dom.window as any

describe('✅ 简化的 Reject 功能验证', () => {
  let manager: StreamOperationManager
  let mockView: any
  let deleteCallCount: number

  beforeEach(() => {
    deleteCallCount = 0

    // 在测试开始前设置 fake timers
    vi.useFakeTimers()

    const mockTransaction = {
      setNodeMarkup: vi.fn(),
      delete: vi.fn(() => {
        deleteCallCount++
        console.log(`🗑️ delete() 被调用，当前调用次数: ${deleteCallCount}`)
      }),
    }

    const mockDoc = {
      descendants: vi.fn(callback => {
        // 模拟找到一个需要删除的新节点
        const newNode = {
          type: { name: 'paragraph' },
          attrs: {
            diffOperationId: 'test-op-123',
            diffStatus: 'pending',
            diffType: 'new',
          },
          nodeSize: 2,
        }
        callback(newNode, 1)
      }),
      content: { size: 0 },
    }

    mockView = {
      state: {
        doc: mockDoc,
        tr: mockTransaction,
      },
      dispatch: vi.fn(),
    }

    const mockSchema = { nodes: {}, text: vi.fn() }
    manager = new StreamOperationManager(mockView, mockSchema)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('🎯 REJECT操作应该触发删除调用', async () => {
    console.log('📊 测试开始 - 验证reject操作是否调用删除')

    // 首先添加一个操作
    manager.queueOperation(
      createMockStreamOperation({
        moniOperationId: 'test-op-123',
        moniBlockId: 'test-block',
      }),
    )

    // 确认删除调用次数初始为0
    expect(deleteCallCount).toBe(0)

    // 执行reject操作
    const result = manager.rejectOperation('test-op-123')
    expect(result).toBe(true)
    console.log('✅ rejectOperation 调用成功')

    // 等待延迟执行的撤销操作（fake timers已在beforeEach设置）
    console.log('⏰ 开始等待延迟操作...')

    vi.advanceTimersByTime(1000)
    await vi.runAllTimersAsync()

    console.log(`📈 最终删除调用次数: ${deleteCallCount}`)

    // 验证删除操作被调用
    expect(deleteCallCount).toBeGreaterThan(0)
    console.log('🎉 测试通过！reject操作确实调用了删除功能')
  })

  it('🔍 验证日志输出', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation()

    // 首先添加一个操作
    manager.queueOperation(
      createMockStreamOperation({
        moniOperationId: 'test-op-123',
        moniBlockId: 'test-block',
      }),
    )

    manager.rejectOperation('test-op-123')

    // fake timers已在beforeEach设置
    vi.advanceTimersByTime(1000)
    await vi.runAllTimersAsync()

    // 验证撤销日志被输出
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[StreamOperationManager] 撤销操作: test-op-123'))

    consoleSpy.mockRestore()
  })
})
