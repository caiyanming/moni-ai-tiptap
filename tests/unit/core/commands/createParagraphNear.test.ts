import { Editor } from '@tiptap/core'
import { Blockquote } from '@tiptap/extension-blockquote'
import { Document } from '@tiptap/extension-document'
import { Heading } from '@tiptap/extension-heading'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Text } from '@tiptap/extension-text'
import type { Node } from '@tiptap/pm/model'
import { beforeEach,describe, expect, it } from 'vitest'

describe('createParagraphNear command - moniBlockId generation', () => {
  let editor: Editor

  beforeEach(() => {
    editor = new Editor({
      extensions: [
        Document,
        Paragraph, // Use default configuration which already includes moniBlockId
        Heading, // Use default configuration which already includes moniBlockId
        Blockquote, // Use default configuration which already includes moniBlockId
        Text,
      ],
      content: '<p>Initial content</p>',
    })
  })

  it('should create new paragraph with moniBlockId when called from paragraph', () => {
    editor.commands.setTextSelection(5)

    const result = editor.commands.createParagraphNear()
    expect(result).toBe(true)

    // Find all paragraphs in the document
    const doc = editor.state.doc
    const paragraphs: Node[] = []

    doc.descendants(node => {
      if (node.type.name === 'paragraph') {
        paragraphs.push(node)
      }
    })

    // Should have at least 2 paragraphs now
    expect(paragraphs.length).toBeGreaterThanOrEqual(2)

    // All paragraphs should have moniBlockId
    paragraphs.forEach(paragraph => {
      expect(paragraph.attrs.moniBlockId).toBeTruthy()
      expect(typeof paragraph.attrs.moniBlockId).toBe('string')
      expect(paragraph.attrs.moniBlockId).toMatch(/^block-\d+-[a-z0-9]+$/)
    })

    // Each paragraph should have unique ID
    const ids = paragraphs.map(p => p.attrs.moniBlockId)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('should create paragraph with moniBlockId near heading', () => {
    editor.commands.setContent('<h1>Main heading</h1>')
    editor.commands.setTextSelection(5)

    const result = editor.commands.createParagraphNear()
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

  it('should create paragraph with moniBlockId near blockquote', () => {
    editor.commands.setContent('<blockquote><p>Quote content</p></blockquote>')
    editor.commands.setTextSelection(5)

    const result = editor.commands.createParagraphNear()
    expect(result).toBe(true)

    const doc = editor.state.doc
    const paragraphs: Node[] = []

    doc.descendants(node => {
      if (node.type.name === 'paragraph') {
        paragraphs.push(node)
      }
    })

    // Should have at least the original paragraph plus new one
    expect(paragraphs.length).toBeGreaterThanOrEqual(2)

    // All paragraphs should have moniBlockId
    paragraphs.forEach(paragraph => {
      expect(paragraph.attrs.moniBlockId).toBeTruthy()
      expect(paragraph.attrs.moniBlockId).toMatch(/^block-\d+-[a-z0-9]+$/)
    })
  })

  it('should preserve existing moniBlockId in original content', () => {
    const existingId = 'existing-paragraph-id'
    editor.commands.setContent(`<p data-moni-block-id="${existingId}">Original content</p>`)
    editor.commands.setTextSelection(5)

    const result = editor.commands.createParagraphNear()
    expect(result).toBe(true)

    const doc = editor.state.doc
    let foundOriginalId = false
    let foundNewId = false

    doc.descendants(node => {
      if (node.type.name === 'paragraph') {
        if (node.attrs.moniBlockId === existingId) {
          foundOriginalId = true
        } else if (node.attrs.moniBlockId && node.attrs.moniBlockId !== existingId) {
          expect(node.attrs.moniBlockId).toMatch(/^block-\d+-[a-z0-9]+$/)
          foundNewId = true
        }
      }
    })

    expect(foundOriginalId).toBe(true)
    expect(foundNewId).toBe(true)
  })

  it('should handle edge cases gracefully', () => {
    // Test with empty document
    editor.commands.setContent('')

    const result = editor.commands.createParagraphNear()

    // Should either succeed or fail gracefully
    if (result) {
      const doc = editor.state.doc
      doc.descendants(node => {
        if (node.type.name === 'paragraph') {
          expect(node.attrs.moniBlockId).toBeTruthy()
        }
      })
    }

    expect(typeof result).toBe('boolean')
  })

  it('should generate unique IDs for multiple calls', () => {
    editor.commands.setTextSelection(5)

    // Create multiple paragraphs
    editor.commands.createParagraphNear()
    editor.commands.createParagraphNear()
    editor.commands.createParagraphNear()

    const doc = editor.state.doc
    const paragraphIds: string[] = []

    doc.descendants(node => {
      if (node.type.name === 'paragraph' && node.attrs.moniBlockId) {
        paragraphIds.push(node.attrs.moniBlockId)
      }
    })

    expect(paragraphIds.length).toBeGreaterThanOrEqual(2)

    // All IDs should be unique
    const uniqueIds = new Set(paragraphIds)
    expect(uniqueIds.size).toBe(paragraphIds.length)

    // All IDs should match the expected format
    paragraphIds.forEach(id => {
      expect(id).toMatch(/^block-\d+-[a-z0-9]+$/)
    })
  })

  it('should work with complex document structure', () => {
    editor.commands.setContent(`
      <h1>Title</h1>
      <p>First paragraph</p>
      <blockquote>
        <p>Quote paragraph</p>
      </blockquote>
      <p>Last paragraph</p>
    `)

    // Position in the first paragraph (after "First paragraph")
    // Find the first paragraph and position cursor at its end
    const doc = editor.state.doc
    let firstParagraphEnd = -1

    doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph' && node.textContent === 'First paragraph' && firstParagraphEnd === -1) {
        firstParagraphEnd = pos + node.nodeSize - 1 // Position at end of paragraph
        return false // Stop traversal
      }
      return true
    })

    if (firstParagraphEnd > 0) {
      editor.commands.setTextSelection(firstParagraphEnd)
    } else {
      // Fallback: position after heading
      editor.commands.setTextSelection(8) // After "Title" heading
    }

    const result = editor.commands.createParagraphNear()
    expect(result).toBe(true)

    // Count paragraphs and verify all have moniBlockId
    const finalDoc = editor.state.doc
    let paragraphCount = 0

    finalDoc.descendants(node => {
      if (node.type.name === 'paragraph') {
        expect(node.attrs.moniBlockId).toBeTruthy()
        expect(node.attrs.moniBlockId).toMatch(/^block-\d+-[a-z0-9]+$/)
        paragraphCount += 1
      }
    })

    expect(paragraphCount).toBeGreaterThanOrEqual(4) // Original 3 + new one
  })
})
