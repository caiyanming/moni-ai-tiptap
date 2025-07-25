import { describe, expect, it } from 'vitest'

describe('Stream管理器导入测试', () => {
  it('应该能导入StreamOperationManager', async () => {
    const { StreamOperationManager } = await import('../../packages/core/src/StreamOperationManager.js')
    expect(StreamOperationManager).toBeDefined()
    expect(typeof StreamOperationManager).toBe('function')
  })

  it('应该能从core导入Block Stream组件', async () => {
    const { Editor, StreamOperationManager } = await import('../../packages/core/src/index.js')
    expect(Editor).toBeDefined()
    expect(StreamOperationManager).toBeDefined()
    expect(typeof Editor).toBe('function')
    expect(typeof StreamOperationManager).toBe('function')
  })
})
