// Converted from Cypress: tests/cypress/integration/core/generateText.spec.ts
import type { NodeConfig } from '@tiptap/core'
import { generateText, Node } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { describe, expect, it } from 'vitest'

describe('generateText', () => {
  const createContentfulInlineNode = (name: string, config?: Partial<NodeConfig>) =>
    Node.create({
      name,
      group: 'inline',
      inline: true,
      content: 'text*',
      parseHTML() {
        return [{ tag: name }]
      },
      ...config,
    })

  it('should generate text from JSON with custom node renderers', () => {
    const json = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'custom-node-default-renderer',
              content: [
                {
                  type: 'text',
                  text: 'Example One',
                },
              ],
            },
            {
              type: 'text',
              text: ' ',
            },
            {
              type: 'custom-node-custom-renderer',
              content: [
                {
                  type: 'text',
                  text: 'Example Two',
                },
              ],
            },
          ],
        },
      ],
    }

    const text = generateText(json, [
      Document,
      Paragraph,
      Text,
      createContentfulInlineNode('custom-node-default-renderer'),
      createContentfulInlineNode('custom-node-custom-renderer', {
        renderText({ node }) {
          return `~${node.textContent}~`
        },
      }),
    ])

    expect(text).toBe('Example One ~Example Two~')
  })

  it('should generate simple text from basic JSON', () => {
    const json = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Simple text content',
            },
          ],
        },
      ],
    }

    const text = generateText(json, [Document, Paragraph, Text])

    expect(text).toBe('Simple text content')
  })

  it('should handle multiple paragraphs', () => {
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

    const text = generateText(json, [Document, Paragraph, Text])

    expect(text).toBe('First paragraph\n\nSecond paragraph')
  })

  it('should handle empty document', () => {
    const json = {
      type: 'doc',
      content: [],
    }

    const text = generateText(json, [Document, Paragraph, Text])

    expect(text).toBe('')
  })
})
