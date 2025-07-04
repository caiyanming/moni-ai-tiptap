import { Editor, Node } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { describe, expect, it } from 'vitest'

describe('Moni Direct Attributes - TipTap Standard Pattern', () => {
  it('should follow TipTap standard attribute pattern like src, href, colwidth', () => {
    console.log('=== TipTap Standard Attribute Pattern Test ===')

    // Create a test paragraph with moni enhancement
    const MoniParagraph = Paragraph.extend({
      name: 'moniParagraph',
    })

    // Create editor with moni-enhanced paragraph
    const editor = new Editor({
      extensions: [Document, MoniParagraph, Text],
      content: '<p>Test content</p>',
    })

    // Check schema includes moni-block-id and moni-parent-id as standard attributes
    const schema = editor.schema
    const paragraphType = schema.nodes.moniParagraph

    console.log('Paragraph attrs:', paragraphType.spec.attrs)

    expect(paragraphType.spec.attrs).toBeDefined()
    expect(paragraphType.spec.attrs?.['moni-block-id']).toBeDefined()
    expect(paragraphType.spec.attrs?.['moni-parent-id']).toBeDefined()

    // Verify attribute structure follows TipTap standard (like Image.src, Link.href)
    const blockIdAttr = paragraphType.spec.attrs?.['moni-block-id']
    const parentIdAttr = paragraphType.spec.attrs?.['moni-parent-id']

    expect(blockIdAttr?.default).toBe(null)
    expect(parentIdAttr?.default).toBe(null)

    // Test setting moni attributes - standard TipTap way
    editor.commands.updateAttributes('moniParagraph', {
      'moni-block-id': 'standard-block-123',
      'moni-parent-id': 'standard-parent-456',
    })

    // Check JSON serialization - should have moni-block-id and moni-parent-id directly
    const json = editor.getJSON()
    console.log('Editor JSON:', JSON.stringify(json, null, 2))

    const paragraph = json.content?.[0]
    expect(paragraph?.attrs?.['moni-block-id']).toBe('standard-block-123')
    expect(paragraph?.attrs?.['moni-parent-id']).toBe('standard-parent-456')

    // Check HTML rendering - follows TipTap standard
    const html = editor.getHTML()
    console.log('Editor HTML:', html)

    expect(html).toContain('moni-block-id="standard-block-123"')
    expect(html).toContain('moni-parent-id="standard-parent-456"')

    // Test HTML parsing - standard TipTap parseHTML pattern
    const testHTML = '<p moni-block-id="parsed-block" moni-parent-id="parsed-parent">Parsed content</p>'
    editor.commands.setContent(testHTML)

    const parsedJSON = editor.getJSON()
    console.log('Parsed JSON:', JSON.stringify(parsedJSON, null, 2))

    const parsedParagraph = parsedJSON.content?.[0]
    expect(parsedParagraph?.attrs?.['moni-block-id']).toBe('parsed-block')
    expect(parsedParagraph?.attrs?.['moni-parent-id']).toBe('parsed-parent')

    // Test null values - standard TipTap behavior
    editor.commands.updateAttributes('moniParagraph', {
      'moni-block-id': null,
      'moni-parent-id': null,
    })

    const nullJSON = editor.getJSON()
    const nullParagraph = nullJSON.content?.[0]
    expect(nullParagraph?.attrs?.['moni-block-id']).toBe(null)
    expect(nullParagraph?.attrs?.['moni-parent-id']).toBe(null)

    editor.destroy()

    console.log('🎉 TipTap standard attribute pattern working perfectly!')
  })

  it('should work with multiple node types like other TipTap attributes', () => {
    console.log('=== Multiple Node Types Test ===')

    // Test with different node types
    const MoniParagraph = Paragraph.extend({ name: 'moniParagraph' })
    const MoniHeading = Node.create({
      name: 'moniHeading',
      group: 'block',
      content: 'inline*',
      addAttributes() {
        return {
          level: { default: 1 },
        }
      },
      parseHTML() {
        return [
          { tag: 'h1', attrs: { level: 1 } },
          { tag: 'h2', attrs: { level: 2 } },
        ]
      },
      renderHTML({ node, HTMLAttributes }) {
        return [`h${node.attrs.level}`, HTMLAttributes, 0]
      },
    })

    const editor = new Editor({
      extensions: [Document, MoniParagraph, MoniHeading, Text],
      content: '<h1>Heading</h1><p>Paragraph</p>',
    })

    // Both node types should have moni attributes
    const schema = editor.schema
    expect(schema.nodes.moniParagraph.spec.attrs?.['moni-block-id']).toBeDefined()
    expect(schema.nodes.moniHeading.spec.attrs?.['moni-block-id']).toBeDefined()

    // Test setting attributes on different node types
    editor.commands.updateAttributes('moniHeading', {
      'moni-block-id': 'heading-123',
      level: 2,
    })

    editor.commands.updateAttributes('moniParagraph', {
      'moni-block-id': 'paragraph-456',
    })

    const json = editor.getJSON()
    expect(json.content?.[0]?.attrs?.['moni-block-id']).toBe('heading-123')
    expect(json.content?.[1]?.attrs?.['moni-block-id']).toBe('paragraph-456')

    editor.destroy()

    console.log('✅ Multiple node types working correctly!')
  })
})
