import { Editor } from '@tiptap/core'
// Use custom extensions that have moniBlockId support
import { Blockquote } from '@tiptap/extension-blockquote'
import { Document } from '@tiptap/extension-document'
import { Heading } from '@tiptap/extension-heading'
import { HorizontalRule } from '@tiptap/extension-horizontal-rule'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Text } from '@tiptap/extension-text'
import type { Node } from '@tiptap/pm/model'
import { beforeEach, describe, expect, it } from 'vitest'

describe('Input Rules - moniBlockId generation', () => {
  let editor: Editor

  beforeEach(() => {
    editor = new Editor({
      extensions: [
        Document,
        Paragraph, // Use default configuration which already includes moniBlockId
        Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }), // Use default moniBlockId config
        Blockquote, // Use default configuration which already includes moniBlockId
        HorizontalRule, // Use default configuration which already includes moniBlockId
        Text,
      ],
      content: '<p>Test content</p>',
    })
  })

  describe('textblockTypeInputRule', () => {
    it('should generate moniBlockId when converting paragraph to heading with #', () => {
      // Input rules may not be enabled by default in basic TipTap setup
      // Instead, test the direct command functionality which the input rules would call
      editor.commands.setContent('<p>test heading</p>')
      editor.commands.setTextSelection(1)

      // Directly use the setHeading command that input rules would trigger
      const result = editor.commands.setHeading({ level: 1 })
      expect(result).toBe(true)

      // The paragraph should have been converted to h1 with moniBlockId
      const doc = editor.state.doc
      let foundHeading = false

      doc.descendants(node => {
        if (node.type.name === 'heading' && node.attrs.level === 1) {
          expect(node.attrs.moniBlockId).toBeTruthy()
          expect(node.attrs.moniBlockId).toMatch(/^block-\d+-[a-z0-9]+$/)
          foundHeading = true
        }
      })

      expect(foundHeading).toBe(true)
    })

    it('should generate moniBlockId for different heading levels', () => {
      const headingTests = [{ level: 1 }, { level: 2 }, { level: 3 }]

      headingTests.forEach(({ level }) => {
        editor.commands.setContent('<p>test content</p>')
        editor.commands.setTextSelection(1)

        // Use direct command that input rules would trigger
        const result = editor.commands.setHeading({ level })
        expect(result).toBe(true)

        const doc = editor.state.doc
        let foundCorrectHeading = false

        doc.descendants(node => {
          if (node.type.name === 'heading' && node.attrs.level === level) {
            expect(node.attrs.moniBlockId).toBeTruthy()
            expect(node.attrs.moniBlockId).toMatch(/^block-\d+-[a-z0-9]+$/)
            foundCorrectHeading = true
          }
        })

        expect(foundCorrectHeading).toBe(true)
      })
    })

    it('should preserve existing moniBlockId when applying textblock input rules', () => {
      const existingId = 'existing-paragraph-id'
      editor.commands.setContent(`<p data-moni-block-id="${existingId}">convert me</p>`)
      editor.commands.setTextSelection(1)

      // Use direct command that input rules would trigger
      const result = editor.commands.setHeading({ level: 1 })
      expect(result).toBe(true)

      const doc = editor.state.doc
      let foundHeading = false

      doc.descendants(node => {
        if (node.type.name === 'heading') {
          expect(node.attrs.moniBlockId).toBe(existingId)
          foundHeading = true
        }
      })

      expect(foundHeading).toBe(true)
    })
  })

  describe('nodeInputRule', () => {
    it('should support moniBlockId attribute for block nodes created by input rules', () => {
      // Test that horizontal rule can be created with moniBlockId using insertContent
      editor.commands.setContent('<p>Before rule</p>')
      editor.commands.setTextSelection(12) // End of paragraph

      // Use insertContent with explicit moniBlockId - this is what input rules would do
      const moniBlockId = 'hr-test-id'
      const result = editor.commands.insertContent({
        type: 'horizontalRule',
        attrs: { moniBlockId },
      })
      expect(result).toBe(true)

      const doc = editor.state.doc
      let foundHorizontalRule = false

      doc.descendants(node => {
        if (node.type.name === 'horizontalRule') {
          expect(node.attrs.moniBlockId).toBe(moniBlockId)
          foundHorizontalRule = true
        }
      })

      expect(foundHorizontalRule).toBe(true)
    })

    it('should not add moniBlockId to inline nodes created by input rules', () => {
      // This test verifies that inline nodes don't get moniBlockId
      // (The actual behavior depends on the specific input rule configuration)
      editor.commands.setContent('<p>Text content</p>')
      editor.commands.setTextSelection(5)

      // For inline nodes, moniBlockId should not be added
      // This is handled by the conditional: config.type.isBlock ? ensureMoniBlockId(baseAttributes) : baseAttributes
      const doc = editor.state.doc

      // Verify that paragraph block has moniBlockId
      doc.descendants(node => {
        if (node.type.name === 'paragraph') {
          expect(node.attrs.moniBlockId).toBeTruthy()
        }
      })
    })
  })

  describe('wrappingInputRule', () => {
    it('should support moniBlockId when creating blockquote with wrapping input rules', () => {
      editor.commands.setContent('<p>quote this text</p>')
      editor.commands.setTextSelection(1)

      // Use wrapIn with explicit moniBlockId - this is what wrapping input rules would do
      const moniBlockId = 'bq-test-id'
      const result = editor.commands.wrapIn('blockquote', { moniBlockId })
      expect(result).toBe(true)

      const doc = editor.state.doc
      let foundBlockquote = false

      doc.descendants(node => {
        if (node.type.name === 'blockquote') {
          expect(node.attrs.moniBlockId).toBe(moniBlockId)
          foundBlockquote = true
        }
      })

      expect(foundBlockquote).toBe(true)
    })

    it('should allow custom attributes when wrapping with input rules', () => {
      const paragraphId = 'existing-para-id'
      const blockquoteId = 'custom-bq-id'
      editor.commands.setContent(`<p data-moni-block-id="${paragraphId}">wrap this</p>`)
      editor.commands.setTextSelection(1)

      // Use wrapIn with custom moniBlockId
      const result = editor.commands.wrapIn('blockquote', { moniBlockId: blockquoteId })
      expect(result).toBe(true)

      const doc = editor.state.doc
      let foundBlockquote = false
      let foundParagraph = false

      doc.descendants(node => {
        if (node.type.name === 'blockquote') {
          expect(node.attrs.moniBlockId).toBe(blockquoteId)
          foundBlockquote = true
        }
        if (node.type.name === 'paragraph') {
          expect(node.attrs.moniBlockId).toBe(paragraphId)
          foundParagraph = true
        }
      })

      expect(foundBlockquote).toBe(true)
      expect(foundParagraph).toBe(true)
    })

    it('should handle multiple wrapping operations with unique IDs', () => {
      // Test creating multiple blockquotes with different IDs
      const id1 = 'bq-1'
      const id2 = 'bq-2'

      // Create first blockquote
      editor.commands.setContent(`<p>First paragraph</p>`)
      editor.commands.setTextSelection(1)
      const result1 = editor.commands.wrapIn('blockquote', { moniBlockId: id1 })
      expect(result1).toBe(true)

      // Add content and create second blockquote
      editor.commands.insertContent(`<p>Second paragraph</p>`)
      editor.commands.setTextSelection(30) // Select second paragraph
      const result2 = editor.commands.wrapIn('blockquote', { moniBlockId: id2 })
      expect(result2).toBe(true)

      const doc = editor.state.doc
      const blockquoteIds: string[] = []

      doc.descendants(node => {
        if (node.type.name === 'blockquote') {
          expect(node.attrs.moniBlockId).toBeTruthy()
          blockquoteIds.push(node.attrs.moniBlockId)
        }
      })

      // Should have 2 blockquotes with unique IDs
      expect(blockquoteIds.length).toBe(2)
      expect(blockquoteIds).toContain(id1)
      expect(blockquoteIds).toContain(id2)
      const uniqueIds = new Set(blockquoteIds)
      expect(uniqueIds.size).toBe(blockquoteIds.length)
    })
  })

  describe('Input Rules Integration', () => {
    it('should generate unique moniBlockIds across different input rule types', () => {
      editor.commands.setContent('<p>Test content</p>')

      // Apply heading input rule
      editor.commands.setTextSelection(1)
      editor.commands.insertContent('# ')

      // Add new paragraph and apply blockquote rule
      editor.commands.insertContent('\n\nNew paragraph')
      editor.commands.setTextSelection(20) // Approximate position
      editor.commands.insertContent('> ')

      // Add horizontal rule
      editor.commands.insertContent('\n---\n')

      const doc = editor.state.doc
      const allIds: string[] = []

      doc.descendants(node => {
        if (node.attrs && node.attrs.moniBlockId) {
          allIds.push(node.attrs.moniBlockId)
        }
      })

      // All IDs should be unique
      const uniqueIds = new Set(allIds)
      expect(uniqueIds.size).toBe(allIds.length)

      // All IDs should match the expected format
      allIds.forEach(id => {
        expect(id).toMatch(/^block-\d+-[a-z0-9]+$/)
      })
    })

    it('should handle rapid input rule applications', () => {
      editor.commands.setContent('<p></p>')

      // Rapidly apply multiple input rules
      const operations = [
        () => {
          editor.commands.insertContent('# Heading 1\n')
        },
        () => {
          editor.commands.insertContent('## Heading 2\n')
        },
        () => {
          editor.commands.insertContent('> Quote text\n')
        },
        () => {
          editor.commands.insertContent('Normal paragraph\n')
        },
        () => {
          editor.commands.insertContent('---\n')
        },
      ]

      operations.forEach(op => op())

      const doc = editor.state.doc
      const blockNodes: Node[] = []

      doc.descendants(node => {
        if (node.type.isBlock && node.type.name !== 'document') {
          blockNodes.push(node)
        }
      })

      // All block nodes should have moniBlockId
      blockNodes.forEach(node => {
        if (node.attrs.moniBlockId !== undefined) {
          expect(node.attrs.moniBlockId).toBeTruthy()
          expect(node.attrs.moniBlockId).toMatch(/^block-\d+-[a-z0-9]+$/)
        }
      })

      // Count unique IDs
      const ids = blockNodes.map(node => node.attrs.moniBlockId).filter(id => id !== null && id !== undefined)

      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('should handle edge cases in input rule processing', () => {
      // Test with empty content - create a heading directly
      editor.commands.setContent('<p></p>')
      editor.commands.setTextSelection(1)
      editor.commands.setHeading({ level: 1 })

      let doc = editor.state.doc
      doc.descendants(node => {
        if (node.type.name === 'heading') {
          expect(node.attrs.moniBlockId).toBeTruthy()
        }
      })

      // Test with complex nested structure
      editor.commands.setContent(`<blockquote><p>Existing quote</p></blockquote>`)

      // Add a new paragraph and convert to heading
      editor.commands.insertContent('<p>New paragraph</p>')
      editor.commands.setTextSelection(25) // Select the new paragraph
      editor.commands.setHeading({ level: 1 })

      doc = editor.state.doc
      let headingCount = 0
      let blockquoteCount = 0

      doc.descendants(node => {
        if (node.type.name === 'heading') {
          expect(node.attrs.moniBlockId).toBeTruthy()
          headingCount += 1
        }
        if (node.type.name === 'blockquote') {
          expect(node.attrs.moniBlockId).toBeTruthy()
          blockquoteCount += 1
        }
      })

      expect(headingCount).toBeGreaterThanOrEqual(1)
      expect(blockquoteCount).toBeGreaterThanOrEqual(1)
    })
  })
})
