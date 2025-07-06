import { Editor, moniDefaultBlockIdGenerator } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

describe('Moni Core Attributes', () => {
  let editor: Editor

  beforeEach(() => {
    // Create a custom paragraph with core blockId/parentId attributes
    const MoniParagraph = Paragraph.extend({
      name: 'moniParagraph',
      moniBlockIdGenerator: moniDefaultBlockIdGenerator,
    })

    editor = new Editor({
      extensions: [Document, MoniParagraph, Text],
      content: '<p>Test paragraph with core attributes</p>',
    })
  })

  afterEach(() => {
    editor?.destroy()
  })

  describe('Basic Integration', () => {
    it('should create editor with moni-enabled node view', () => {
      expect(editor).toBeDefined()
      expect(editor.getJSON()).toBeDefined()

      const json = editor.getJSON()
      expect(json.content).toHaveLength(1)
      expect(json.content[0].type).toBe('moniParagraph')
    })

    it('should have core attributes in schema', () => {
      const schema = editor.schema
      const paragraphSpec = schema.nodes.moniParagraph

      expect(paragraphSpec).toBeDefined()
      expect(paragraphSpec.spec.attrs).toBeDefined()
      expect(paragraphSpec.spec.attrs?.moniBlockId).toBeDefined()
      expect(paragraphSpec.spec.attrs?.moniParentId).toBeDefined()
    })

    it('should handle core attributes in HTML parsing', () => {
      // Set content with specific core attributes
      editor.commands.setContent(`
        <p moni-block-id="test-block-123" moni-parent-id="test-parent-456">
          Test paragraph with core attributes
        </p>
      `)

      const json = editor.getJSON()
      expect(json.content).toHaveLength(1)

      const paragraph = json.content[0]
      expect(paragraph.type).toBe('moniParagraph')
      expect(paragraph.attrs).toBeDefined()
      expect(paragraph.attrs?.moniBlockId).toBe('test-block-123')
      expect(paragraph.attrs?.moniParentId).toBe('test-parent-456')
    })
  })

  describe('HTML Rendering', () => {
    it('should render core attributes as data attributes in HTML', () => {
      // Set content with core attributes
      editor.commands.setContent(`
        <p moni-block-id="html-test-block" moni-parent-id="html-test-parent">
          HTML test paragraph
        </p>
      `)

      const html = editor.getHTML()
      expect(html).toContain('moni-block-id="html-test-block"')
      expect(html).toContain('moni-parent-id="html-test-parent"')
    })

    it('should preserve core attributes during content updates', () => {
      // Set initial content
      editor.commands.setContent(`
        <p moni-block-id="persistent-block" moni-parent-id="persistent-parent">
          Initial content
        </p>
      `)

      // Update content
      editor.commands.setContent(`
        <p moni-block-id="persistent-block" moni-parent-id="persistent-parent">
          Updated content
        </p>
      `)

      const json = editor.getJSON()
      const paragraph = json.content[0]
      expect(paragraph.attrs?.moniBlockId).toBe('persistent-block')
      expect(paragraph.attrs?.moniParentId).toBe('persistent-parent')
    })
  })

  describe('Attribute Updates', () => {
    it('should allow updating core attributes programmatically', () => {
      // Set initial content
      editor.commands.setContent('<p>Test paragraph</p>')

      // Update core attributes
      editor.commands.updateAttributes('moniParagraph', {
        moniBlockId: 'programmatic-block-id',
        moniParentId: 'programmatic-parent-id',
      })

      const json = editor.getJSON()
      const paragraph = json.content[0]
      expect(paragraph.attrs?.moniBlockId).toBe('programmatic-block-id')
      expect(paragraph.attrs?.moniParentId).toBe('programmatic-parent-id')
    })

    it('should reflect attribute updates in HTML output', () => {
      // Set initial content
      editor.commands.setContent('<p>Test paragraph</p>')

      // Update core attributes
      editor.commands.updateAttributes('moniParagraph', {
        moniBlockId: 'updated-block-id',
        moniParentId: 'updated-parent-id',
      })

      const html = editor.getHTML()
      expect(html).toContain('moni-block-id="updated-block-id"')
      expect(html).toContain('moni-parent-id="updated-parent-id"')
    })
  })

  describe('Multiple Nodes', () => {
    it('should handle multiple nodes with different core attributes', () => {
      editor.commands.setContent(`
        <p moni-block-id="block-1" moni-parent-id="parent-1">First paragraph</p>
        <p moni-block-id="block-2" moni-parent-id="parent-2">Second paragraph</p>
      `)

      const json = editor.getJSON()
      expect(json.content).toHaveLength(2)

      // Check first paragraph
      expect(json.content[0].attrs?.moniBlockId).toBe('block-1')
      expect(json.content[0].attrs?.moniParentId).toBe('parent-1')

      // Check second paragraph
      expect(json.content[1].attrs?.moniBlockId).toBe('block-2')
      expect(json.content[1].attrs?.moniParentId).toBe('parent-2')
    })
  })

  describe('Performance', () => {
    it('should handle large numbers of nodes efficiently', () => {
      const nodes = Array.from({ length: 100 }, (_, i) => `<p moni-block-id="block-${i}">Paragraph ${i}</p>`).join('')

      editor.commands.setContent(nodes)

      const json = editor.getJSON()
      expect(json.content).toHaveLength(100)
      expect(json.content[0].attrs?.moniBlockId).toBe('block-0')
      expect(json.content[99].attrs?.moniBlockId).toBe('block-99')
    })
  })
})
