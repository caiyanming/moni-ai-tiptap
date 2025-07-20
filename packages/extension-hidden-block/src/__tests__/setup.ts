import { beforeEach, vi } from 'vitest'

beforeEach(() => {
  // Reset the DOM
  document.head.innerHTML = ''
  document.body.innerHTML = ''

  // Mock console.warn to avoid test noise
  global.console = {
    ...console,
    warn: vi.fn(),
  }
})

// Mock Element.getBoundingClientRect
Element.prototype.getBoundingClientRect = function (): DOMRect {
  return new DOMRect(0, 0, 0, 0)
}
