import { Editor } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Text from '@tiptap/extension-text'
import { describe, expect, it } from 'vitest'

// 直接导入我们修改过的 Paragraph 节点
import { Paragraph } from '../../packages/extension-paragraph/src/paragraph.js'

describe('Moni Native Attributes - Core Implementation', () => {
  it('should support moniBlockId and moniParentId in Paragraph node', () => {
    const editor = new Editor({
      extensions: [Document, Paragraph, Text],
      content: '<p>Test paragraph</p>',
    })

    // Update paragraph with moni attributes
    editor.commands.updateAttributes('paragraph', {
      moniBlockId: 'para-123',
      moniParentId: 'parent-456',
    })

    const json = editor.getJSON()
    const paragraph = json.content?.[0]

    expect(paragraph?.attrs?.moniBlockId).toBe('para-123')
    expect(paragraph?.attrs?.moniParentId).toBe('parent-456')

    // Test HTML rendering
    const html = editor.getHTML()
    expect(html).toContain('moni-block-id="para-123"')
    expect(html).toContain('moni-parent-id="parent-456"')

    editor.destroy()
  })

  it('should parse moni attributes from HTML', () => {
    const editor = new Editor({
      extensions: [Document, Paragraph, Text],
      content: '<p moni-block-id="parsed-123" moni-parent-id="parsed-parent">Parsed content</p>',
    })

    const json = editor.getJSON()
    const paragraph = json.content?.[0]

    expect(paragraph?.attrs?.moniBlockId).toBe('parsed-123')
    expect(paragraph?.attrs?.moniParentId).toBe('parsed-parent')

    editor.destroy()
  })

  it('should handle null moni attributes gracefully', () => {
    const editor = new Editor({
      extensions: [Document, Paragraph, Text],
      content: '<p>No moni attributes</p>',
    })

    const json = editor.getJSON()
    const paragraph = json.content?.[0]

    expect(paragraph?.attrs?.moniBlockId).toBe(null)
    expect(paragraph?.attrs?.moniParentId).toBe(null)

    // HTML should not contain moni attributes when null
    const html = editor.getHTML()
    expect(html).not.toContain('moni-block-id')
    expect(html).not.toContain('moni-parent-id')

    editor.destroy()
  })

  it('should access moni attributes using dot notation', () => {
    const editor = new Editor({
      extensions: [Document, Paragraph, Text],
      content: '<p>Test content</p>',
    })

    // Update with moni attributes
    editor.commands.updateAttributes('paragraph', {
      moniBlockId: 'block-001',
      moniParentId: 'parent-001',
    })

    // Verify we can access attributes using standard TipTap way
    const node = editor.state.doc.firstChild
    if (node) {
      expect(node.attrs.moniBlockId).toBe('block-001')
      expect(node.attrs.moniParentId).toBe('parent-001')
    }

    editor.destroy()
  })
})
