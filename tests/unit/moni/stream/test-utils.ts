// Test utilities for stream operation tests

export const cleanupDOM = () => {
  // Clean up any existing DOM elements after tests
  const elements = document.querySelectorAll('[data-testid]')
  elements.forEach(element => element.remove())
}

export const createMockStreamOperation = (type = 'insert', blockId = 'test-block') => {
  return {
    type,
    blockId,
    content: {
      text: 'Test content',
      position: 0,
    },
    timestamp: Date.now(),
  }
}
