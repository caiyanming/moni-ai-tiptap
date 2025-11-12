// Converted from Cypress: tests/cypress/integration/core/generateHTML.spec.ts
import { generateHTML } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { describe, expect, it } from 'vitest'

describe('generateHTML', () => {
  it('should generate HTML from JSON without an editor instance', () => {
    const json = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Example Text',
            },
          ],
        },
      ],
    }

    const html = generateHTML(json, [Document, Paragraph, Text])

    // 🔥 generateHTML 自动生成 moniBlockId 并渲染到 HTML
    expect(html).toMatch(/<p data-moni-block-id="block-\d+-\w+">Example Text<\/p>/)
  })

  it('should generate HTML with multiple paragraphs', () => {
    const json = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'First paragraph' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Second paragraph' }],
        },
      ],
    }

    const html = generateHTML(json, [Document, Paragraph, Text])

    // 🔥 generateHTML 自动生成 moniBlockId 并渲染到 HTML
    expect(html).toMatch(/<p data-moni-block-id="block-\d+-\w+">First paragraph<\/p><p data-moni-block-id="block-\d+-\w+">Second paragraph<\/p>/)
  })

  it('should handle empty document', () => {
    const json = {
      type: 'doc',
      content: [],
    }

    const html = generateHTML(json, [Document, Paragraph, Text])

    expect(html).toBe('')
  })

  it('should handle empty paragraphs', () => {
    const json = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [],
        },
      ],
    }

    const html = generateHTML(json, [Document, Paragraph, Text])

    // 🔥 generateHTML 自动生成 moniBlockId 并渲染到 HTML
    expect(html).toMatch(/<p data-moni-block-id="block-\d+-\w+"><\/p>/)
  })
})
