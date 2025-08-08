import { ensureMoniBlockId, generateMoniBlockId, processPastedHTML } from '@tiptap/core'
import { describe, expect, it } from 'vitest'

describe('generateMoniBlockId', () => {
  it('should generate a unique ID', () => {
    const id1 = generateMoniBlockId()
    const id2 = generateMoniBlockId()

    expect(id1).toMatch(/^block-\d+-[a-z0-9]+$/)
    expect(id2).toMatch(/^block-\d+-[a-z0-9]+$/)
    expect(id1).not.toBe(id2)
  })

  it('should ensure moniBlockId exists in attributes', () => {
    const attrs = { someAttr: 'value' }
    const result = ensureMoniBlockId(attrs)

    expect(result).toHaveProperty('moniBlockId')
    expect(result.moniBlockId).toMatch(/^block-\d+-[a-z0-9]+$/)
    expect(result.someAttr).toBe('value')
  })

  it('should not overwrite existing moniBlockId', () => {
    const existingId = 'existing-id'
    const attrs = { moniBlockId: existingId, someAttr: 'value' }
    const result = ensureMoniBlockId(attrs)

    expect(result.moniBlockId).toBe(existingId)
    expect(result.someAttr).toBe('value')
  })

  it('should process pasted HTML and add IDs to block elements', () => {
    const html = '<p>Paragraph 1</p><h1>Heading</h1><p>Paragraph 2</p>'
    const result = processPastedHTML(html)

    expect(result).toContain('data-moni-block-id')
    expect(result.match(/data-moni-block-id="block-\d+-[a-z0-9]+"/g)).toHaveLength(3)
  })

  it('should not add IDs to elements that already have them', () => {
    const html = '<p data-moni-block-id="existing-id">Paragraph</p><h1>Heading</h1>'
    const result = processPastedHTML(html)

    expect(result).toContain('data-moni-block-id="existing-id"')
    expect(result.match(/data-moni-block-id="block-\d+-[a-z0-9]+"/g)).toHaveLength(1) // Only the h1
  })

  it('should handle empty or invalid HTML gracefully', () => {
    expect(processPastedHTML('')).toBe('')
    expect(processPastedHTML(null as any)).toBe(null)
    expect(processPastedHTML(undefined as any)).toBe(undefined)
  })
})
