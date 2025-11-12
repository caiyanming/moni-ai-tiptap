import { ensureMoniBlockIdsInJSON } from '@tiptap/core/helpers/ensureMoniBlockIds'
import * as generateMoniBlockId from '@tiptap/core/helpers/generateMoniBlockId'
import { Schema } from '@tiptap/pm/model'
import { afterEach, describe, expect, it, vi } from 'vitest'

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: {
      group: 'block',
      attrs: {
        moniBlockId: { default: null },
      },
      content: 'text*',
    },
    heading: {
      group: 'block',
      attrs: {
        level: { default: 1 },
        moniBlockId: { default: null },
      },
      content: 'text*',
    },
    image: {
      inline: true,
      group: 'inline',
      attrs: {
        src: { default: null },
      },
    },
    text: { group: 'inline' },
  },
})

describe('ensureMoniBlockIdsInJSON', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('generates moniBlockId for block nodes declared in schema', () => {
    const spy = vi.spyOn(generateMoniBlockId, 'generateMoniBlockId').mockReturnValue('block-test-id')

    const result = ensureMoniBlockIdsInJSON(
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Hello' }],
      },
      schema,
    )

    expect(result.attrs?.moniBlockId).toBe('block-test-id')
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('does not add moniBlockId for inline nodes', () => {
    const json = {
      type: 'image',
      attrs: {
        src: 'https://example.com/image.png',
      },
    }

    const result = ensureMoniBlockIdsInJSON(json, schema)

    expect(result.attrs?.moniBlockId).toBeUndefined()
  })

  it('keeps existing moniBlockId values untouched', () => {
    const json = {
      type: 'heading',
      attrs: {
        level: 2,
        moniBlockId: 'existing-block',
      },
      content: [{ type: 'text', text: 'Title' }],
    }

    const result = ensureMoniBlockIdsInJSON(json, schema)

    expect(result.attrs?.moniBlockId).toBe('existing-block')
  })

  it('recursively applies IDs to child block nodes', () => {
    const spy = vi.spyOn(generateMoniBlockId, 'generateMoniBlockId').mockReturnValue('child-block-id')

    const json = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'parent' }],
        },
      ],
    }

    const result = ensureMoniBlockIdsInJSON(json, schema)
    const paragraph = result.content?.[0]

    expect(paragraph?.attrs?.moniBlockId).toBe('child-block-id')
    expect(spy).toHaveBeenCalledTimes(1)
  })
})
