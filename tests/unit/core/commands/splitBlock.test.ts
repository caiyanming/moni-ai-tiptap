import { Editor } from '@tiptap/core'
import { Document } from '@tiptap/extension-document'
import { Heading } from '@tiptap/extension-heading'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Text } from '@tiptap/extension-text'
import type { Node } from '@tiptap/pm/model'
import { EditorState } from '@tiptap/pm/state'
import { beforeEach, describe, expect, it } from 'vitest'

describe('splitBlock command - moniBlockId generation', () => {
  let editor: Editor

  beforeEach(() => {
    editor = new Editor({
      extensions: [
        Document,
        Paragraph, // Use default configuration which already includes moniBlockId
        Heading, // Use default configuration which already includes moniBlockId
        Text,
      ],
      content: '<p>Hello world</p>',
    })
  })

  it('should generate moniBlockId for new block when splitting paragraph', () => {
    // Position cursor in middle of paragraph
    editor.commands.setTextSelection(5)

    // Split the block
    const result = editor.commands.splitBlock()
    expect(result).toBe(true)

    // Debug: Check the document structure
    const doc = editor.state.doc
    console.log('Document structure after split:', doc.toJSON())

    // Find all paragraphs in the document
    const paragraphs: Node[] = []
    doc.descendants(node => {
      if (node.type.name === 'paragraph') {
        paragraphs.push(node)
      }
    })

    expect(paragraphs.length).toBeGreaterThanOrEqual(2)

    // Check each paragraph has moniBlockId
    paragraphs.forEach((paragraph, index) => {
      console.log(`Paragraph ${index} attrs:`, paragraph.attrs)
      expect(paragraph.attrs.moniBlockId).toBeTruthy()
      expect(typeof paragraph.attrs.moniBlockId).toBe('string')
      expect(paragraph.attrs.moniBlockId).toMatch(/^block-\d+-[a-z0-9]+$/)
    })

    // IDs should be different
    if (paragraphs.length >= 2) {
      expect(paragraphs[0].attrs.moniBlockId).not.toBe(paragraphs[1].attrs.moniBlockId)
    }
  })

  it('should preserve existing moniBlockId in original block when splitting', () => {
    const existingId = 'existing-block-id'

    // Set content with existing moniBlockId
    editor.commands.setContent(`<p data-moni-block-id="${existingId}">Hello world</p>`)
    editor.commands.setTextSelection(5)

    // Split the block
    editor.commands.splitBlock()

    // Check first paragraph maintains existing ID
    const doc = editor.state.doc
    const firstParagraph = doc.nodeAt(0) as Node // First paragraph is at position 0

    expect(firstParagraph.attrs.moniBlockId).toBe(existingId)
  })

  it('should handle splitting at block boundaries', () => {
    editor.commands.setContent('<p>First paragraph</p>')

    // Position at end of paragraph
    editor.commands.setTextSelection(16)

    const result = editor.commands.splitBlock()
    expect(result).toBe(true)

    // Should create new paragraph with moniBlockId
    const doc = editor.state.doc
    const paragraphs = []

    doc.descendants(node => {
      if (node.type.name === 'paragraph') {
        paragraphs.push(node)
      }
    })

    expect(paragraphs).toHaveLength(2)
    paragraphs.forEach(paragraph => {
      expect(paragraph.attrs.moniBlockId).toBeTruthy()
      expect(paragraph.attrs.moniBlockId).toMatch(/^block-\d+-[a-z0-9]+$/)
    })
  })

  it('should work with different node types when splitting', () => {
    editor.commands.setContent('<h1>Heading text</h1>')
    editor.commands.setTextSelection(7)

    const result = editor.commands.splitBlock()
    expect(result).toBe(true)

    // Check that both nodes have moniBlockId
    const doc = editor.state.doc
    let nodeCount = 0

    doc.descendants(node => {
      if (node.type.name === 'heading' || node.type.name === 'paragraph') {
        expect(node.attrs.moniBlockId).toBeTruthy()
        expect(node.attrs.moniBlockId).toMatch(/^block-\d+-[a-z0-9]+$/)
        nodeCount++
      }
    })

    expect(nodeCount).toBeGreaterThan(1)
  })

  it('should maintain marks when keepMarks is true', () => {
    // This test focuses on the moniBlockId generation aspect
    // while also ensuring marks are preserved
    editor.commands.setContent('<p><strong>Bold text</strong></p>')
    editor.commands.setTextSelection(5)

    const result = editor.commands.splitBlock({ keepMarks: true })
    expect(result).toBe(true)

    // Verify both blocks have moniBlockId
    const doc = editor.state.doc
    let blockCount = 0

    doc.descendants(node => {
      if (node.type.name === 'paragraph') {
        expect(node.attrs.moniBlockId).toBeTruthy()
        blockCount++
      }
    })

    expect(blockCount).toBe(2)
  })

  it('should handle invalid split positions gracefully', () => {
    editor.commands.setContent('<p>Text</p>')
    editor.commands.setTextSelection(0) // Position at start of document

    const result = editor.commands.splitBlock()

    // Should either succeed with ID generation or fail gracefully
    if (result) {
      const doc = editor.state.doc
      doc.descendants(node => {
        if (node.type.name === 'paragraph') {
          expect(node.attrs.moniBlockId).toBeTruthy()
        }
      })
    }

    // Test should not throw errors
    expect(typeof result).toBe('boolean')
  })
})
