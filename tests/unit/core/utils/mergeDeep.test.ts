// Converted from Cypress: tests/cypress/integration/core/mergeDeep.spec.ts
import { mergeDeep } from '@tiptap/core'
import { describe, expect, it } from 'vitest'

describe('mergeDeep', () => {
  it('should merge simple objects', () => {
    const one = {
      a: 1,
    }
    const two = {
      b: 1,
    }
    const result = {
      a: 1,
      b: 1,
    }
    const merged = mergeDeep(one, two)

    expect(merged).toEqual(result)
  })

  it('should merge when source has null value', () => {
    const one = {
      a: null,
    }
    const two = {
      a: { c: 3 },
    }
    const result = {
      a: { c: 3 },
    }
    const merged = mergeDeep(one, two)

    expect(merged).toEqual(result)
  })

  it('should not merge arrays (replace them)', () => {
    const one = {
      a: [1],
    }
    const two = {
      a: [2],
    }
    const result = {
      a: [2],
    }
    const merged = mergeDeep(one, two)

    expect(merged).toEqual(result)
  })

  it('should allow nulling a value', () => {
    const one = {
      a: { c: 3 },
    }
    const two = {
      a: { c: null },
    }
    const result = {
      a: { c: null },
    }
    const merged = mergeDeep(one, two)

    expect(merged).toEqual(result)
  })

  it('should merge deep nested objects', () => {
    const one = {
      a: 1,
      b: {
        c: true,
      },
      d: {
        e: true,
        f: [1],
      },
    }
    const two = {
      b: 1,
      d: {
        f: [2],
        g: 1,
      },
    }
    const result = {
      a: 1,
      b: 1,
      d: {
        e: true,
        f: [2],
        g: 1,
      },
    }
    const merged = mergeDeep(one, two)

    expect(merged).toEqual(result)
  })
})
