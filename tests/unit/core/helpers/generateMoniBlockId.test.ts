/**
 * @vitest-environment jsdom
 */
import {
  ensureMoniBlockId,
  extractMoniBlockId,
  generateMoniBlockId,
  hasMoniBlockIds,
  processClipboardHTML,
  processPastedHTML,
  setMoniBlockId,
  stripMoniBlockIds,
} from '@tiptap/core'
import { beforeEach,describe, expect, it } from 'vitest'

describe('generateMoniBlockId', () => {
  it('should generate unique IDs', () => {
    const id1 = generateMoniBlockId()
    const id2 = generateMoniBlockId()

    expect(id1).toMatch(/^block-\d+-[a-z0-9]+$/)
    expect(id2).toMatch(/^block-\d+-[a-z0-9]+$/)
    expect(id1).not.toBe(id2)
  })

  it('should include timestamp in ID', () => {
    const now = Date.now()
    const id = generateMoniBlockId()
    const [, timestamp] = id.split('-')

    expect(parseInt(timestamp, 10)).toBeGreaterThanOrEqual(now - 100)
    expect(parseInt(timestamp, 10)).toBeLessThanOrEqual(now + 100)
  })
})

describe('ensureMoniBlockId', () => {
  it('should preserve existing moniBlockId', () => {
    const existingId = 'block-123-abc'
    const attrs = { moniBlockId: existingId, other: 'value' }

    const result = ensureMoniBlockId(attrs)

    expect(result.moniBlockId).toBe(existingId)
    expect(result.other).toBe('value')
  })

  it('should generate new moniBlockId if missing', () => {
    const attrs = { other: 'value' }

    const result = ensureMoniBlockId(attrs)

    expect(result.moniBlockId).toMatch(/^block-\d+-[a-z0-9]+$/)
    expect(result.other).toBe('value')
  })

  it('should work with empty attrs', () => {
    const result = ensureMoniBlockId()

    expect(result.moniBlockId).toMatch(/^block-\d+-[a-z0-9]+$/)
  })
})

describe('extractMoniBlockId', () => {
  let element: HTMLElement

  beforeEach(() => {
    element = document.createElement('div')
  })

  it('should extract existing data-moni-block-id', () => {
    const testId = 'block-123-abc'
    element.setAttribute('data-moni-block-id', testId)

    const result = extractMoniBlockId(element)

    expect(result).toBe(testId)
  })

  it('should return undefined if no id present', () => {
    const result = extractMoniBlockId(element)

    expect(result).toBeUndefined()
  })
})

describe('setMoniBlockId', () => {
  let element: HTMLElement

  beforeEach(() => {
    element = document.createElement('div')
  })

  it('should set data-moni-block-id attribute', () => {
    const testId = 'block-123-abc'

    setMoniBlockId(element, testId)

    expect(element.getAttribute('data-moni-block-id')).toBe(testId)
  })
})

describe('stripMoniBlockIds', () => {
  it('should remove all data-moni-block-id attributes', () => {
    const html = `
      <div data-moni-block-id="block-1">
        <p data-moni-block-id="block-2">Text</p>
        <span>No ID</span>
      </div>
    `

    const result = stripMoniBlockIds(html)

    expect(result).not.toContain('data-moni-block-id')
    expect(result).toContain('<div>')
    expect(result).toContain('<p>Text</p>')
    expect(result).toContain('<span>No ID</span>')
  })

  it('should handle empty or invalid input', () => {
    expect(stripMoniBlockIds('')).toBe('')
    expect(stripMoniBlockIds(null as any)).toBe(null)
    expect(stripMoniBlockIds(undefined as any)).toBe(undefined)
  })

  it('should handle malformed HTML gracefully', () => {
    const malformedHtml = '<div><p>Unclosed paragraph'

    const result = stripMoniBlockIds(malformedHtml)

    // Should not throw and should return some result
    expect(typeof result).toBe('string')
  })

  it('should preserve all other attributes', () => {
    const html = '<div class="test" data-moni-block-id="block-1" id="container">Content</div>'

    const result = stripMoniBlockIds(html)

    expect(result).toContain('class="test"')
    expect(result).toContain('id="container"')
    expect(result).not.toContain('data-moni-block-id')
  })
})

describe('hasMoniBlockIds', () => {
  it('should detect presence of moniBlockId attributes', () => {
    const htmlWithIds = '<div data-moni-block-id="block-1">Content</div>'
    const htmlWithoutIds = '<div class="test">Content</div>'

    expect(hasMoniBlockIds(htmlWithIds)).toBe(true)
    expect(hasMoniBlockIds(htmlWithoutIds)).toBe(false)
  })

  it('should handle empty or invalid input', () => {
    expect(hasMoniBlockIds('')).toBe(false)
    expect(hasMoniBlockIds(null as any)).toBe(false)
    expect(hasMoniBlockIds(undefined as any)).toBe(false)
  })

  it('should detect nested IDs', () => {
    const html = `
      <div>
        <p>No ID</p>
        <div>
          <span data-moni-block-id="block-1">Has ID</span>
        </div>
      </div>
    `

    expect(hasMoniBlockIds(html)).toBe(true)
  })
})

describe('processPastedHTML', () => {
  it('should add moniBlockIds to block elements without existing IDs', () => {
    const html = '<p>Paragraph</p><h1>Heading</h1><div>Div</div>'

    const result = processPastedHTML(html)

    expect(result).toContain('data-moni-block-id=')
    // Should have 3 IDs (p, h1, div)
    const matches = result.match(/data-moni-block-id/g)
    expect(matches).toHaveLength(3)
  })

  it('should preserve existing moniBlockIds', () => {
    const existingId = 'block-existing-123'
    const html = `<p data-moni-block-id="${existingId}">With ID</p><p>Without ID</p>`

    const result = processPastedHTML(html)

    expect(result).toContain(`data-moni-block-id="${existingId}"`)
    // Should have 2 IDs total (1 existing + 1 new)
    const matches = result.match(/data-moni-block-id/g)
    expect(matches).toHaveLength(2)
  })

  it('should handle empty or invalid input', () => {
    expect(processPastedHTML('')).toBe('')
    expect(processPastedHTML(null as any)).toBe(null)
    expect(processPastedHTML(undefined as any)).toBe(undefined)
  })

  it('should only add IDs to block-level elements', () => {
    const html = '<p>Block</p><span>Inline</span><em>Emphasis</em>'

    const result = processPastedHTML(html)

    // Only <p> should get an ID
    const matches = result.match(/data-moni-block-id/g)
    expect(matches).toHaveLength(1)
    expect(result).toContain('<p data-moni-block-id=')
    expect(result).toContain('<span>Inline</span>')
    expect(result).toContain('<em>Emphasis</em>')
  })
})

describe('processClipboardHTML', () => {
  it('should strip existing IDs and add new ones', () => {
    const html = `
      <p data-moni-block-id="old-1">First paragraph</p>
      <div data-moni-block-id="old-2">
        <p data-moni-block-id="old-3">Nested paragraph</p>
      </div>
    `

    const result = processClipboardHTML(html)

    // Should still have 3 IDs but all should be new
    const matches = result.match(/data-moni-block-id="([^"]+)"/g)
    expect(matches).toHaveLength(3)

    // None of the old IDs should remain
    expect(result).not.toContain('old-1')
    expect(result).not.toContain('old-2')
    expect(result).not.toContain('old-3')

    // All IDs should follow the new pattern
    matches?.forEach(match => {
      const id = match.match(/data-moni-block-id="([^"]+)"/)?.[1]
      expect(id).toMatch(/^block-\d+-[a-z0-9]+$/)
    })
  })

  it('should handle HTML without existing IDs', () => {
    const html = '<p>Clean paragraph</p><h1>Clean heading</h1>'

    const result = processClipboardHTML(html)

    // Should add new IDs
    const matches = result.match(/data-moni-block-id/g)
    expect(matches).toHaveLength(2)
  })

  it('should be idempotent for clean HTML', () => {
    const html = '<p>Clean content</p>'

    const result1 = processClipboardHTML(html)
    const result2 = processClipboardHTML(result1)

    // Should have same number of IDs
    const matches1 = result1.match(/data-moni-block-id/g)
    const matches2 = result2.match(/data-moni-block-id/g)
    expect(matches1).toHaveLength(1)
    expect(matches2).toHaveLength(1)

    // But IDs should be different (because stripMoniBlockIds removes them)
    expect(result1).not.toBe(result2)
  })
})
