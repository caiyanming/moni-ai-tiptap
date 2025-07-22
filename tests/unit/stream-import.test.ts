import { describe, expect, it } from 'vitest'

describe('Stream管理器导入测试', () => {
  it('应该能导入StreamTargetManager', async () => {
    const { StreamTargetManager } = await import('../../packages/core/src/StreamTargetManager.js')
    expect(StreamTargetManager).toBeDefined()
    expect(typeof StreamTargetManager).toBe('function')
  })

  it('应该能导入StreamOperationManager', async () => {
    const { StreamOperationManager } = await import('../../packages/core/src/StreamOperationManager.js')
    expect(StreamOperationManager).toBeDefined()
    expect(typeof StreamOperationManager).toBe('function')
  })

  it('应该能导入StreamProgressManager', async () => {
    const { StreamProgressManager } = await import('../../packages/core/src/StreamProgressManager.js')
    expect(StreamProgressManager).toBeDefined()
    expect(typeof StreamProgressManager).toBe('function')
  })

  it('应该能从core导入Block Stream组件', async () => {
    const { Editor, StreamOperationManager } = await import('../../packages/core/src/index.js')
    expect(Editor).toBeDefined()
    expect(StreamOperationManager).toBeDefined()
    expect(typeof Editor).toBe('function')
    expect(typeof StreamOperationManager).toBe('function')
  })
})
