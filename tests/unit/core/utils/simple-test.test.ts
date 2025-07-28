import { describe, expect, it } from 'vitest'

describe('基础测试', () => {
  it('应该能运行基本测试', () => {
    expect(1 + 1).toBe(2)
  })

  it('应该能访问DOM', () => {
    const div = document.createElement('div')
    expect(div).toBeDefined()
    expect(div.tagName).toBe('DIV')
  })
})
