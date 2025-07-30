/**
 * 简化版 StreamOperationManager 去重功能测试
 *
 * 测试目标：
 * 1. 验证稳定ID的去重功能
 * 2. 确保重复操作不会被多次处理
 * 3. 验证调试接口的正确性
 */

import type { StreamOperation } from '@tiptap/core'
import { BlockOperationStatus,BlockOperationType, StreamOperationManager } from '@tiptap/core'
import { JSDOM } from 'jsdom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { cleanupDOM } from './test-utils.js'

// 设置DOM环境
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
global.document = dom.window.document
global.window = dom.window as any

// Mock crypto.randomUUID safely
if (!global.crypto) {
  ;(global as any).crypto = {}
}
if (!global.crypto.randomUUID) {
  global.crypto.randomUUID = () => Math.random().toString(36).substr(2, 16)
}

describe('StreamOperationManager Deduplication', () => {
  let streamManager: StreamOperationManager
  let mockOperations: StreamOperation[]

  beforeEach(() => {
    // 创建简化的模拟环境
    const mockNodes = [
      {
        type: { name: 'paragraph' },
        attrs: { moniBlockId: 'test-block-1', moniParentId: null, moniLevel: 0 },
        content: null,
        nodeSize: 2,
        textContent: 'Initial content',
      },
    ]

    const mockView = {
      state: {
        doc: {
          descendants: vi.fn().mockImplementation(callback => {
            mockNodes.forEach((node, index) => {
              const position = index * 3
              callback(node, position)
            })
          }),
          content: { size: 10 },
        },
        tr: {
          setNodeMarkup: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          replaceWith: vi.fn().mockReturnThis(),
        },
      },
      dispatch: vi.fn(),
    }

    const mockSchema = {
      nodes: {
        paragraph: {
          create: vi.fn().mockReturnValue({
            type: { name: 'paragraph' },
            attrs: {},
            content: null,
            nodeSize: 2,
            textContent: 'test',
          }),
        },
      },
      text: vi.fn().mockReturnValue({
        type: { name: 'text' },
        attrs: {},
        content: null,
        nodeSize: 1,
        textContent: 'test',
      }),
    }

    streamManager = new StreamOperationManager(mockView as any, mockSchema as any, {
      maxQueueSize: 100,
      operationInterval: 50,
    })

    // 创建测试操作数据
    mockOperations = [
      {
        moniOperationId: 'stream1_block1_op_0', // 稳定ID
        moniStreamId: 'stream1',
        moniBlockId: 'block1',
        type: BlockOperationType.APPEND,
        content: { type: 'paragraph', content: [{ type: 'text', text: 'New content 1' }] },
        timestamp: Date.now(),
        status: BlockOperationStatus.PENDING,
        position: 0,
      },
      {
        moniOperationId: 'stream1_block2_op_1', // 稳定ID
        moniStreamId: 'stream1',
        moniBlockId: 'block2',
        type: BlockOperationType.APPEND,
        content: { type: 'paragraph', content: [{ type: 'text', text: 'New content 2' }] },
        timestamp: Date.now(),
        status: BlockOperationStatus.PENDING,
        position: 1,
      },
    ]
  })

  afterEach(() => {
    if (streamManager && typeof streamManager.destroy === 'function') {
      streamManager.destroy()
    }
    cleanupDOM()
  })

  it('应该正确处理新操作', () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    // 第一次处理操作
    streamManager.queueOperations(mockOperations)

    // 验证操作被标记为已处理
    expect(streamManager.isOperationProcessed('stream1_block1_op_0')).toBe(true)
    expect(streamManager.isOperationProcessed('stream1_block2_op_1')).toBe(true)

    const processedOps = streamManager.getProcessedOperations()
    expect(processedOps).toContain('stream1_block1_op_0')
    expect(processedOps).toContain('stream1_block2_op_1')

    // 验证日志输出
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('过滤后待处理操作: 2/2'))

    consoleLogSpy.mockRestore()
  })

  it('应该跳过重复操作', () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    // 第一次处理操作
    streamManager.queueOperations(mockOperations)

    // 重置spy以检查第二次调用
    consoleLogSpy.mockClear()

    // 第二次处理相同操作（模拟SSE重复事件）
    streamManager.queueOperations(mockOperations)

    // 验证操作被跳过
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('跳过重复操作: stream1_block1_op_0'))
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('跳过重复操作: stream1_block2_op_1'))
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('所有 2 个操作都已处理，跳过'))

    // 验证已处理操作记录没有重复
    expect(streamManager.getProcessedOperations()).toHaveLength(2)

    consoleLogSpy.mockRestore()
  })

  it('应该正确处理混合操作（部分新，部分重复）', () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    // 第一次只处理第一个操作
    streamManager.queueOperations([mockOperations[0]])

    // 验证只有第一个操作被处理
    expect(streamManager.isOperationProcessed('stream1_block1_op_0')).toBe(true)
    expect(streamManager.isOperationProcessed('stream1_block2_op_1')).toBe(false)

    consoleLogSpy.mockClear()

    // 第二次处理所有操作（混合：1个重复，1个新的）
    streamManager.queueOperations(mockOperations)

    // 验证混合处理日志
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('跳过重复操作: stream1_block1_op_0'))
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('过滤后待处理操作: 1/2'))

    // 验证最终状态
    expect(streamManager.getProcessedOperations()).toHaveLength(2)
    expect(streamManager.isOperationProcessed('stream1_block1_op_0')).toBe(true)
    expect(streamManager.isOperationProcessed('stream1_block2_op_1')).toBe(true)

    consoleLogSpy.mockRestore()
  })

  it('应该正确清理已处理操作记录', () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    // 处理操作
    streamManager.queueOperations(mockOperations)

    // 验证操作已处理
    expect(streamManager.getProcessedOperations()).toHaveLength(2)

    // 清理已处理操作记录
    streamManager.clearProcessedOperations()

    // 验证清理结果
    expect(streamManager.getProcessedOperations()).toHaveLength(0)
    expect(streamManager.isOperationProcessed('stream1_block1_op_0')).toBe(false)
    expect(streamManager.isOperationProcessed('stream1_block2_op_1')).toBe(false)

    // 验证清理日志
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('清理了 2 个已处理操作记录'))

    consoleLogSpy.mockRestore()
  })

  it('应该在销毁时清理去重记录', () => {
    // 处理操作
    streamManager.queueOperations(mockOperations)

    // 验证操作已处理
    expect(streamManager.getProcessedOperations()).toHaveLength(2)

    // 销毁管理器
    streamManager.destroy()

    // 验证去重记录被清理
    expect(streamManager.getProcessedOperations()).toHaveLength(0)
  })

  it('应该正确处理稳定ID格式', () => {
    // 创建具有不同稳定ID格式的操作
    const stableIdOperations: StreamOperation[] = [
      {
        moniOperationId: 'session_123_block_abc_op_0', // streamId + blockId + index
        moniStreamId: 'session_123',
        moniBlockId: 'block_abc',
        type: BlockOperationType.APPEND,
        content: { type: 'paragraph', content: [{ type: 'text', text: 'Stable ID test' }] },
        timestamp: Date.now(),
        status: BlockOperationStatus.PENDING,
        position: 0,
      },
      {
        moniOperationId: 'session_123_new_block_op_1', // null blockId -> new_block
        moniStreamId: 'session_123',
        moniBlockId: 'new_block',
        type: BlockOperationType.INSERT,
        content: { type: 'paragraph', content: [{ type: 'text', text: 'New block test' }] },
        timestamp: Date.now(),
        status: BlockOperationStatus.PENDING,
        position: 1,
      },
    ]

    // 处理操作
    streamManager.queueOperations(stableIdOperations)

    // 验证稳定ID被正确处理
    expect(streamManager.isOperationProcessed('session_123_block_abc_op_0')).toBe(true)
    expect(streamManager.isOperationProcessed('session_123_new_block_op_1')).toBe(true)
    expect(streamManager.getProcessedOperations()).toHaveLength(2)

    // 重复处理应该被跳过
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    streamManager.queueOperations(stableIdOperations)

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('所有 2 个操作都已处理，跳过'))

    consoleLogSpy.mockRestore()
  })
})
