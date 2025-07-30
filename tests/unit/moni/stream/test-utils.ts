// Test utilities for stream operation tests
import { BlockOperationType, BlockOperationStatus, type StreamOperation, type BlockContent } from '@tiptap/core'

export const cleanupDOM = () => {
  // Clean up any existing DOM elements after tests
  const elements = document.querySelectorAll('[data-testid]')
  elements.forEach(element => element.remove())
}

export const createMockStreamOperation = (overrides: Partial<StreamOperation> = {}): StreamOperation => {
  const defaultContent: BlockContent = {
    type: 'paragraph',
    text: 'Test content',
  }
  
  return {
    moniOperationId: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    moniStreamId: 'stream-test',
    moniBlockId: 'block-test',
    type: BlockOperationType.INSERT,
    content: defaultContent,
    timestamp: Date.now(),
    status: BlockOperationStatus.PENDING,
    ...overrides,
  }
}

export const createMockInsertOperation = (blockId = 'block-new', content?: BlockContent): StreamOperation => {
  return createMockStreamOperation({
    moniBlockId: blockId,
    type: BlockOperationType.INSERT,
    content: content || { type: 'paragraph', text: 'New content' },
  })
}

export const createMockReplaceOperation = (blockId = 'block-replace', content?: BlockContent): StreamOperation => {
  return createMockStreamOperation({
    moniBlockId: blockId,
    type: BlockOperationType.REPLACE,
    content: content || { type: 'paragraph', text: 'Replaced content' },
  })
}

export const createMockDeleteOperation = (blockId = 'block-delete'): StreamOperation => {
  return createMockStreamOperation({
    moniBlockId: blockId,
    type: BlockOperationType.DELETE,
    content: {}, // 删除操作不需要内容
  })
}
