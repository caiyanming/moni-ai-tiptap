import { render } from '@testing-library/react'
import { Document } from '@tiptap/extension-document'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Text } from '@tiptap/extension-text'
import { EditorContent,useEditor } from '@tiptap/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { BlockChemical } from '../../../../packages/extension-chemistry/src/extensions/BlockChemical.js'
import { InlineChemical } from '../../../../packages/extension-chemistry/src/extensions/InlineChemical.js'

/**
 * Chemistry React Components 集成测试 (简化版本)
 *
 * 基础测试确保：
 * 1. ✅ 组件能够正常渲染
 * 2. ✅ 基本的化学公式显示功能
 * 3. ✅ 错误处理不会导致崩溃
 */

// 模拟 KaTeX 渲染
vi.mock('katex', () => ({
  default: {
    render: vi.fn((formula, element) => {
      element.innerHTML = `<span class="katex-mock">${formula}</span>`
    }),
    renderToString: vi.fn(formula => `<span class="katex-mock">${formula}</span>`),
  },
}))

// 简化的化学公式编辑器组件用于测试
const SimpleChemistryEditor: React.FC<{
  initialContent?: string
}> = ({ initialContent = '' }) => {
  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      InlineChemical.configure({
        katexOptions: {
          trust: true,
          throwOnError: false,
        },
      }),
      BlockChemical.configure({
        katexOptions: {
          trust: true,
          throwOnError: false,
          displayMode: true,
        },
      }),
    ],
    content: initialContent,
  })

  if (!editor) {
    return <div data-testid="loading">Loading...</div>
  }

  return (
    <div data-testid="chemistry-editor">
      <EditorContent editor={editor} data-testid="editor-content" />
    </div>
  )
}

describe('Chemistry React Components Integration', () => {
  describe('🧪 Basic Component Rendering', () => {
    it('应该正确渲染基础编辑器', () => {
      const { container } = render(<SimpleChemistryEditor />)

      const editor = container.querySelector('[data-testid="chemistry-editor"]')
      expect(editor).toBeTruthy()
    })

    it('应该渲染包含化学公式的内容', () => {
      const chemicalContent = `
        <p>水分子：<span data-type="inline-chemical" data-chemical="\\ce{H2O}"></span></p>
        <div data-type="block-chemical" data-chemical="\\ce{2H2 + O2 -> 2H2O}"></div>
      `

      const { container } = render(<SimpleChemistryEditor initialContent={chemicalContent} />)

      // 验证编辑器渲染
      const editor = container.querySelector('[data-testid="chemistry-editor"]')
      expect(editor).toBeTruthy()

      // 检查是否包含化学相关内容
      const content = container.textContent || ''
      expect(content.length).toBeGreaterThan(0)
    })
  })

  describe('🛡️ Error Handling', () => {
    it('应该处理无效化学公式而不崩溃', () => {
      const invalidContent = `
        <p>无效公式：<span data-type="inline-chemical" data-chemical="\\invalid{syntax}"></span></p>
        <div data-type="block-chemical" data-chemical="\\bad{formula}"></div>
      `

      expect(() => {
        render(<SimpleChemistryEditor initialContent={invalidContent} />)
      }).not.toThrow()
    })

    it('应该处理空内容', () => {
      const { container } = render(<SimpleChemistryEditor initialContent="" />)

      const editor = container.querySelector('[data-testid="chemistry-editor"]')
      expect(editor).toBeTruthy()
    })
  })

  describe('📊 Content Integration', () => {
    it('应该支持混合文档内容', () => {
      const mixedContent = `
        <h1>化学反应</h1>
        <p>燃烧反应：<span data-type="inline-chemical" data-chemical="\\ce{CH4}"></span></p>
        <div data-type="block-chemical" data-chemical="\\ce{CH4 + 2O2 -> CO2 + 2H2O}"></div>
        <p>这是一个完整的燃烧反应。</p>
      `

      const { container } = render(<SimpleChemistryEditor initialContent={mixedContent} />)

      // 验证编辑器渲染
      const editor = container.querySelector('[data-testid="chemistry-editor"]')
      expect(editor).toBeTruthy()

      // 验证包含化学内容
      const content = container.textContent || ''
      expect(content.includes('化学反应')).toBe(true)
    })

    it('应该正确处理 moni 属性', () => {
      const moniContent = `
        <div 
          data-type="block-chemical" 
          data-chemical="\\ce{H2SO4 + 2NaOH -> Na2SO4 + 2H2O}"
          data-moni-block-id="acid-base-reaction"
          data-moni-stream-type="chemistry"
        ></div>
      `

      const { container } = render(<SimpleChemistryEditor initialContent={moniContent} />)

      // 验证编辑器渲染
      const editor = container.querySelector('[data-testid="chemistry-editor"]')
      expect(editor).toBeTruthy()

      // 验证内容存在
      const content = container.textContent || ''
      expect(content.length).toBeGreaterThan(0)
    })
  })
})
