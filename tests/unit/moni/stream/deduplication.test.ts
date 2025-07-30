/**
 * StreamOperationManager 去重功能测试
 *
 * 测试目标：
 * 1. 验证稳定ID的去重功能
 * 2. 确保重复操作不会被多次处理
 * 3. 验证调试接口的正确性
 */

import { Schema } from '@tiptap/pm/model'
import { EditorState } from '@tiptap/pm/state'
import { EditorView } from '@tiptap/pm/view'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { StreamOperation } from '../../../../packages/core/src/StreamOperationManager.js'
import {
  BlockOperationStatus,
  BlockOperationType,
  StreamOperationManager,
} from '../../../../packages/core/src/StreamOperationManager.js'

// 创建基础schema用于测试
const schema = new Schema({
  nodes: {
    doc: { content: 'paragraph*' },
    paragraph: {
      content: 'text*',
      attrs: {
        moniBlockId: { default: null },
        moniParentId: { default: null },
        moniLevel: { default: 0 },
        diffMode: { default: false },
        diffStatus: { default: null },
        diffOperationId: { default: null },
        diffType: { default: null },
      },
      toDOM: () => ['p', 0],
      parseDOM: [{ tag: 'p' }],
    },
    text: {},
  },
})

describe('StreamOperationManager Deduplication', () => {
  let view: EditorView
  let streamManager: StreamOperationManager
  let mockOperations: StreamOperation[]

  beforeEach(() => {
    // 设置测试环境
    const doc = schema.node('doc', {}, [
      schema.node('paragraph', { moniBlockId: 'test-block-1' }, [schema.text('Initial content')]),
    ])

    const state = EditorState.create({ doc, schema })
    const mockElement = document.createElement('div')

    view = new EditorView(mockElement, {
      state,
      dispatchTransaction: tr => {
        const newState = view.state.apply(tr)
        view.updateState(newState)
      },
    })

    streamManager = new StreamOperationManager(view, schema)

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
    streamManager.destroy()
    view.destroy()
  })

  it('应该正确处理新操作', () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    // 第一次处理操作
    streamManager.queueOperations(mockOperations)

    // 验证操作被标记为已处理
    expect(streamManager.isOperationProcessed('stream1_block1_op_0')).toBe(true)
    expect(streamManager.isOperationProcessed('stream1_block2_op_1')).toBe(true)
    expect(streamManager.getProcessedOperations()).toEqual(['stream1_block1_op_0', 'stream1_block2_op_1'])

    // 验证日志输出
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('过滤后待处理操作: 2/2'))
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('批量队列操作完成: 2/2 成功'))

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
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('批量队列操作完成: 1/1 成功'))

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
        moniOperationId: 'session_123_test_block_1_op_0', // streamId + blockId + index
        moniStreamId: 'session_123',
        moniBlockId: 'test-block-1',
        type: BlockOperationType.APPEND,
        content: { type: 'paragraph', content: [{ type: 'text', text: 'Stable ID test' }] },
        timestamp: Date.now(),
        status: BlockOperationStatus.PENDING,
        position: 0,
      },
      {
        moniOperationId: 'session_123_test_block_1_op_1', // 使用存在的blockId
        moniStreamId: 'session_123',
        moniBlockId: 'test-block-1',
        type: BlockOperationType.APPEND,
        content: { type: 'paragraph', content: [{ type: 'text', text: 'New block test' }] },
        timestamp: Date.now(),
        status: BlockOperationStatus.PENDING,
        position: 1,
      },
    ]

    // 处理操作
    streamManager.queueOperations(stableIdOperations)

    // 验证稳定ID被正确处理
    expect(streamManager.isOperationProcessed('session_123_test_block_1_op_0')).toBe(true)
    expect(streamManager.isOperationProcessed('session_123_test_block_1_op_1')).toBe(true)
    expect(streamManager.getProcessedOperations()).toHaveLength(2)

    // 重复处理应该被跳过
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    streamManager.queueOperations(stableIdOperations)

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('所有 2 个操作都已处理，跳过'))

    consoleLogSpy.mockRestore()
  })
})
