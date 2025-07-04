import { Editor } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { describe, expect, it } from 'vitest'

describe('Core Attributes Verification', () => {
  it('should include blockId and parentId as core attributes', () => {
    console.log('=== Core Attributes Test ===')

    // Create a test paragraph with moni enhancement
    const MoniParagraph = Paragraph.extend({
      name: 'moniParagraph',
      blockId: 'test-block',
      parentId: 'test-parent',
    })

    console.log('MoniParagraph config:', {
      name: MoniParagraph.name,
      blockId: MoniParagraph.blockId,
      parentId: MoniParagraph.parentId,
    })

    // Create editor with moni-enhanced paragraph
    const editor = new Editor({
      extensions: [Document, MoniParagraph, Text],
      content: '<p>Test content</p>',
    })

    // Check schema includes moni-block-id and moni-parent-id
    const schema = editor.schema
    const paragraphType = schema.nodes.moniParagraph

    console.log('Paragraph attrs:', paragraphType.spec.attrs)

    expect(paragraphType.spec.attrs).toBeDefined()
    expect(paragraphType.spec.attrs?.['moni-block-id']).toBeDefined()
    expect(paragraphType.spec.attrs?.['moni-parent-id']).toBeDefined()

    // Check JSON serialization
    const json = editor.getJSON()
    console.log('Editor JSON:', JSON.stringify(json, null, 2))

    // Check HTML rendering with moni attributes
    const html = editor.getHTML()
    console.log('Editor HTML:', html)

    // Verify HTML contains moni attributes when set
    editor.commands.updateAttributes('moniParagraph', {
      'moni-block-id': 'test-block-123',
      'moni-parent-id': 'test-parent-456',
    })

    const updatedHTML = editor.getHTML()
    console.log('Updated HTML:', updatedHTML)

    expect(updatedHTML).toContain('moni-block-id="test-block-123"')
    expect(updatedHTML).toContain('moni-parent-id="test-parent-456"')

    editor.destroy()
  })
})
