// Converted from Cypress: tests/cypress/integration/core/generateJSON.spec.ts
import { generateJSON } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { describe, expect, it } from 'vitest'

describe('generateJSON', () => {
  it('should generate JSON from HTML without an editor instance', () => {
    const html = '<p>Example Text</p>'

    const json = generateJSON(html, [Document, Paragraph, Text])

    expect(json).toEqual({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: expect.objectContaining({
            moniBlockId: expect.stringMatching(/^block-\d+-[a-z0-9]+$/),
            moniDragEnabled: true,
            moniDragHandle: true,
            moniDragType: 'block',
            moniLevel: 0,
            moniNestable: false,
            moniParentId: null,
            moniStreamMode: 'replace',
            moniStreamType: 'text',
          }),
          content: [
            {
              type: 'text',
              text: 'Example Text',
            },
          ],
        },
      ],
    })
  })

  it('should parse multiple paragraphs', () => {
    const html = '<p>First paragraph</p><p>Second paragraph</p>'

    const json = generateJSON(html, [Document, Paragraph, Text])

    expect(json).toEqual({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: expect.objectContaining({}),
          content: [{ type: 'text', text: 'First paragraph' }],
        },
        {
          type: 'paragraph',
          attrs: expect.objectContaining({}),
          content: [{ type: 'text', text: 'Second paragraph' }],
        },
      ],
    })
  })

  it('should handle empty HTML', () => {
    const html = ''

    const json = generateJSON(html, [Document, Paragraph, Text])

    // Empty HTML still creates a paragraph in Moni's customized version
    expect(json).toEqual({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: expect.objectContaining({}),
        },
      ],
    })
  })

  it('should handle empty paragraphs', () => {
    const html = '<p></p>'

    const json = generateJSON(html, [Document, Paragraph, Text])

    expect(json).toEqual({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: expect.objectContaining({}),
        },
      ],
    })
  })

  it('should parse plain text as paragraph', () => {
    const html = 'Plain text content'

    const json = generateJSON(html, [Document, Paragraph, Text])

    expect(json).toEqual({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: expect.objectContaining({}),
          content: [
            {
              type: 'text',
              text: 'Plain text content',
            },
          ],
        },
      ],
    })
  })
})
