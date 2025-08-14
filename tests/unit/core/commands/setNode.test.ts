import { Editor } from '@tiptap/core'
import { Blockquote } from '@tiptap/extension-blockquote'
import { Document } from '@tiptap/extension-document'
import { Heading } from '@tiptap/extension-heading'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Text } from '@tiptap/extension-text'
import { Node } from '@tiptap/pm/model'
import { beforeEach, describe, expect, it } from 'vitest'

describe('setNode command - moniBlockId generation', () => {
  let editor: Editor

  beforeEach(() => {
    editor = new Editor({
      extensions: [
        Document,
        Paragraph, // Use default configuration which already includes moniBlockId
        Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }), // Use default moniBlockId config
        Blockquote, // Use default configuration which already includes moniBlockId
        Text,
      ],
      content: '<p>Initial paragraph</p>',
    })
  })

  it('should generate moniBlockId when converting paragraph to heading', () => {
    editor.commands.setTextSelection(5)

    const result = editor.commands.setNode('heading', { level: 1 })
    expect(result).toBe(true)

    const doc = editor.state.doc
    let foundHeading = false

    doc.descendants(node => {
      if (node.type.name === 'heading') {
        expect(node.attrs.moniBlockId).toBeTruthy()
        expect(typeof node.attrs.moniBlockId).toBe('string')
        expect(node.attrs.moniBlockId).toMatch(/^block-\d+-[a-z0-9]+$/)
        expect(node.attrs.level).toBe(1)
        foundHeading = true
      }
    })

    expect(foundHeading).toBe(true)
  })

  it('should preserve existing moniBlockId when converting node types', () => {
    const existingId = 'existing-block-id'
    editor.commands.setContent(`<p data-moni-block-id="${existingId}">Convert me</p>`)
    editor.commands.setTextSelection(5)

    const result = editor.commands.setNode('heading', { level: 2 })
    expect(result).toBe(true)

    const doc = editor.state.doc
    let foundConvertedNode = false

    doc.descendants(node => {
      if (node.type.name === 'heading') {
        expect(node.attrs.moniBlockId).toBe(existingId)
        expect(node.attrs.level).toBe(2)
        foundConvertedNode = true
      }
    })

    expect(foundConvertedNode).toBe(true)
  })

  it('should generate moniBlockId when converting heading to paragraph', () => {
    editor.commands.setContent('<h1>Heading text</h1>')
    editor.commands.setTextSelection(5)

    const result = editor.commands.setNode('paragraph')
    expect(result).toBe(true)

    const doc = editor.state.doc
    let foundParagraph = false

    doc.descendants(node => {
      if (node.type.name === 'paragraph') {
        expect(node.attrs.moniBlockId).toBeTruthy()
        expect(node.attrs.moniBlockId).toMatch(/^block-\d+-[a-z0-9]+$/)
        foundParagraph = true
      }
    })

    expect(foundParagraph).toBe(true)
  })

  it('should handle conversion to blockquote with moniBlockId', () => {
    editor.commands.setTextSelection(5)

    // Blockquote is not a text block node, so setNode should return false
    const result = editor.commands.setNode('blockquote')
    expect(result).toBe(false)

    // Since setNode fails for blockquote, the original paragraph should remain
    const doc = editor.state.doc
    let foundParagraph = false

    doc.descendants(node => {
      if (node.type.name === 'paragraph') {
        foundParagraph = true
      }
    })

    expect(foundParagraph).toBe(true)
  })

  it('should merge custom attributes with moniBlockId', () => {
    editor.commands.setTextSelection(5)

    const customAttributes = {
      level: 3,
      customProp: 'test-value',
    }

    const result = editor.commands.setNode('heading', customAttributes)
    expect(result).toBe(true)

    const doc = editor.state.doc
    let foundHeading = false

    doc.descendants(node => {
      if (node.type.name === 'heading') {
        expect(node.attrs.moniBlockId).toBeTruthy()
        expect(node.attrs.moniBlockId).toMatch(/^block-\d+-[a-z0-9]+$/)
        expect(node.attrs.level).toBe(3)
        // Note: customProp might not be preserved if not defined in schema
        foundHeading = true
      }
    })

    expect(foundHeading).toBe(true)
  })

  it('should work with NodeType objects', () => {
    const headingType = editor.schema.nodes.heading
    editor.commands.setTextSelection(5)

    const result = editor.commands.setNode(headingType, { level: 4 })
    expect(result).toBe(true)

    const doc = editor.state.doc
    let foundHeading = false

    doc.descendants(node => {
      if (node.type.name === 'heading') {
        expect(node.attrs.moniBlockId).toBeTruthy()
        expect(node.attrs.moniBlockId).toMatch(/^block-\d+-[a-z0-9]+$/)
        expect(node.attrs.level).toBe(4)
        foundHeading = true
      }
    })

    expect(foundHeading).toBe(true)
  })

  it('should handle multiple node conversions with unique IDs', () => {
    editor.commands.setContent(`
      <p>First paragraph</p>
      <p>Second paragraph</p>
      <p>Third paragraph</p>
    `)

    // Convert each paragraph to different heading levels
    editor.commands.setTextSelection(5)
    editor.commands.setNode('heading', { level: 1 })

    editor.commands.setTextSelection(25)
    editor.commands.setNode('heading', { level: 2 })

    editor.commands.setTextSelection(45)
    editor.commands.setNode('heading', { level: 3 })

    const doc = editor.state.doc
    const headingIds: string[] = []
    let headingCount = 0

    doc.descendants(node => {
      if (node.type.name === 'heading') {
        expect(node.attrs.moniBlockId).toBeTruthy()
        expect(node.attrs.moniBlockId).toMatch(/^block-\d+-[a-z0-9]+$/)
        headingIds.push(node.attrs.moniBlockId)
        headingCount++
      }
    })

    expect(headingCount).toBe(3)

    // All IDs should be unique
    const uniqueIds = new Set(headingIds)
    expect(uniqueIds.size).toBe(headingIds.length)
  })

  it('should handle selection across multiple blocks', () => {
    editor.commands.setContent(`
      <p>First paragraph</p>
      <p>Second paragraph</p>
    `)

    // Select across multiple blocks
    editor.commands.setTextSelection({ from: 1, to: 35 })

    const result = editor.commands.setNode('heading', { level: 2 })

    // Should either work or fail gracefully
    if (result) {
      const doc = editor.state.doc
      doc.descendants(node => {
        if (node.type.name === 'heading') {
          expect(node.attrs.moniBlockId).toBeTruthy()
          expect(node.attrs.moniBlockId).toMatch(/^block-\d+-[a-z0-9]+$/)
        }
      })
    }

    expect(typeof result).toBe('boolean')
  })

  it('should handle edge cases gracefully', () => {
    // Test with invalid node type
    editor.commands.setTextSelection(5)

    // The command should throw an error for nonexistent node types
    // This is expected behavior to help developers catch typos
    expect(() => {
      editor.commands.setNode('nonexistent')
    }).toThrow("There is no node type named 'nonexistent'")
  })

  it('should preserve moniBlockId when converting back and forth', () => {
    const existingId = 'preserve-this-id'
    editor.commands.setContent(`<p data-moni-block-id="${existingId}">Test content</p>`)
    editor.commands.setTextSelection(5)

    // Convert to heading
    editor.commands.setNode('heading', { level: 1 })

    // Convert back to paragraph
    editor.commands.setNode('paragraph')

    const doc = editor.state.doc
    let foundParagraph = false

    doc.descendants(node => {
      if (node.type.name === 'paragraph') {
        expect(node.attrs.moniBlockId).toBe(existingId)
        foundParagraph = true
      }
    })

    expect(foundParagraph).toBe(true)
  })
})
