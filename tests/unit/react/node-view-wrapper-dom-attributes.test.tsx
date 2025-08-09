/**
 * NodeViewWrapper DOM 属性测试
 *
 * 验证 NodeViewWrapper 正确处理 DOM 属性，特别是：
 * 1. data-moniBlockId 应该转换为 data-moniblockid
 * 2. 不应传递非 DOM 属性给实际的 DOM 元素
 * 3. 应该保持其他有效属性不变
 */

import { render } from '@testing-library/react'
import { NodeViewWrapper } from '@tiptap/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

// Mock useReactNodeView hook
vi.mock('@tiptap/react/src/useReactNodeView.ts', () => ({
  useReactNodeView: vi.fn(() => ({
    onDragStart: vi.fn(),
  })),
}))

describe('NodeViewWrapper DOM Attributes', () => {
  it('应该将 data-moniBlockId 转换为 data-moniblockid', () => {
    const { container } = render(
      <NodeViewWrapper data-moniBlockId="test-block-id" data-testid="wrapper">
        <p>Test content</p>
      </NodeViewWrapper>,
    )

    const wrapper = container.firstChild as HTMLElement

    // 应该有转换后的小写属性
    expect(wrapper.getAttribute('data-moniblockid')).toBe('test-block-id')

    // 不应该有原始的驼峰命名属性
    expect(wrapper.getAttribute('data-moniBlockId')).toBeNull()

    // 其他属性应该保持不变
    expect(wrapper.getAttribute('data-testid')).toBe('wrapper')
  })

  it('应该移除非 DOM 属性', () => {
    const { container } = render(
      <NodeViewWrapper
        as="section"
        data-moniBlockId="test-id"
        customProp="should-not-appear"
        data-valid="should-appear"
      >
        <p>Content</p>
      </NodeViewWrapper>,
    )

    const wrapper = container.firstChild as HTMLElement

    // 应该是指定的标签类型
    expect(wrapper.tagName.toLowerCase()).toBe('section')

    // 应该有转换后的 moni 属性
    expect(wrapper.getAttribute('data-moniblockid')).toBe('test-id')

    // 应该有有效的 data 属性
    expect(wrapper.getAttribute('data-valid')).toBe('should-appear')

    // 不应该有 as 属性（已被移除）
    expect(wrapper.getAttribute('as')).toBeNull()

    // 不应该有自定义属性
    expect(wrapper.getAttribute('customProp')).toBeNull()
  })

  it('应该保持其他有效的 DOM 属性', () => {
    const { container } = render(
      <NodeViewWrapper
        className="test-class"
        id="test-id"
        data-moniBlockId="block-123"
        title="Test title"
        role="article"
      >
        <span>Content</span>
      </NodeViewWrapper>,
    )

    const wrapper = container.firstChild as HTMLElement

    // 标准 DOM 属性应该保持不变
    expect(wrapper.className).toContain('test-class')
    expect(wrapper.id).toBe('test-id')
    expect(wrapper.title).toBe('Test title')
    expect(wrapper.getAttribute('role')).toBe('article')

    // moni 属性应该被转换
    expect(wrapper.getAttribute('data-moniblockid')).toBe('block-123')
    expect(wrapper.getAttribute('data-moniBlockId')).toBeNull()
  })

  it('应該在沒有 data-moniBlockId 時正常工作', () => {
    const { container } = render(
      <NodeViewWrapper className="normal-wrapper" data-other="other-value">
        <div>Normal content</div>
      </NodeViewWrapper>,
    )

    const wrapper = container.firstChild as HTMLElement

    expect(wrapper.className).toContain('normal-wrapper')
    expect(wrapper.getAttribute('data-other')).toBe('other-value')
    expect(wrapper.getAttribute('data-moniblockid')).toBeNull()
    expect(wrapper.getAttribute('data-moniBlockId')).toBeNull()
  })

  it('应该保持样式属性的合并', () => {
    const { container } = render(
      <NodeViewWrapper style={{ backgroundColor: 'red', fontSize: '14px' }} data-moniBlockId="styled-block">
        <p>Styled content</p>
      </NodeViewWrapper>,
    )

    const wrapper = container.firstChild as HTMLElement

    // 应该保持自定义样式
    expect(wrapper.style.backgroundColor).toBe('red')
    expect(wrapper.style.fontSize).toBe('14px')

    // 应该保持默认的 whiteSpace 样式
    expect(wrapper.style.whiteSpace).toBe('normal')

    // 应该有转换后的属性
    expect(wrapper.getAttribute('data-moniblockid')).toBe('styled-block')
  })

  it('应该正确处理多个 data 属性', () => {
    const { container } = render(
      <NodeViewWrapper data-moniBlockId="multi-block" data-test="test-value" data-index="5" data-active="true">
        Content
      </NodeViewWrapper>,
    )

    const wrapper = container.firstChild as HTMLElement

    // moni 属性应该被转换
    expect(wrapper.getAttribute('data-moniblockid')).toBe('multi-block')
    expect(wrapper.getAttribute('data-moniBlockId')).toBeNull()

    // 其他 data 属性应该保持不变
    expect(wrapper.getAttribute('data-test')).toBe('test-value')
    expect(wrapper.getAttribute('data-index')).toBe('5')
    expect(wrapper.getAttribute('data-active')).toBe('true')
  })
})

describe('NodeViewWrapper React Integration', () => {
  it('应该不在控制台产生 React DOM 属性警告', () => {
    // 这个测试主要确保不会有控制台错误
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <NodeViewWrapper data-moniBlockId="no-warning-test" className="test">
        <div>Should not warn</div>
      </NodeViewWrapper>,
    )

    // 不应该有 React DOM 属性相关的错误
    const domErrors = consoleSpy.mock.calls.filter(
      call => call[0]?.includes?.('React does not recognize') || call[0]?.includes?.('data-moniBlockId'),
    )

    expect(domErrors).toHaveLength(0)

    consoleSpy.mockRestore()
  })
})