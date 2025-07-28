// Converted from Cypress: tests/cypress/integration/core/getTextContentFromNodes.spec.ts
import { getSchemaByResolvedExtensions, getTextContentFromNodes } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Mention from '@tiptap/extension-mention'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { Node } from '@tiptap/pm/model'
import { describe, expect, it } from 'vitest'

describe('getTextContentFromNodes', () => {
  it('should extract text content including rendered mentions', () => {
    const schema = getSchemaByResolvedExtensions([
      Document,
      Paragraph,
      Text,
      Mention.configure({ renderText: ({ node }) => `@${node.attrs.label ?? 'Unknown'}` }),
    ])

    const doc = Node.fromJSON(schema, {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Start ' },
            { type: 'mention', attrs: { id: 1, label: 'Mention' } },
            { type: 'text', text: ' End' },
          ],
        },
      ],
    })

    const pos = doc.resolve(12)
    const text = getTextContentFromNodes(pos)

    expect(text).toBe('Start @Mention End')
  })

  it('should handle empty document', () => {
    const schema = getSchemaByResolvedExtensions([Document, Paragraph, Text])

    const doc = Node.fromJSON(schema, {
      type: 'doc',
      content: [],
    })

    const pos = doc.resolve(0)
    const text = getTextContentFromNodes(pos)

    expect(text).toBe('')
  })

  it('should handle text-only content', () => {
    const schema = getSchemaByResolvedExtensions([Document, Paragraph, Text])

    const doc = Node.fromJSON(schema, {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Simple text content' }],
        },
      ],
    })

    // Use position at the end of the text content (1 + text.length)
    const pos = doc.resolve(20) // 1 (start of paragraph) + 19 (length of 'Simple text content')
    const text = getTextContentFromNodes(pos)

    expect(text).toBe('Simple text content')
  })
})
