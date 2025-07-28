// Converted from Cypress: tests/cypress/integration/extensions/bold.spec.ts
import { starInputRegex, starPasteRegex, underscoreInputRegex, underscorePasteRegex } from '@tiptap/extension-bold'
import { describe, expect, it } from 'vitest'

describe('Bold Extension Regex', () => {
  describe('star input regex', () => {
    it('should match bold text with stars', () => {
      expect('**Test**').toMatch(starInputRegex)
    })

    it('should match bold text with multiple words', () => {
      expect('**Bold text**').toMatch(starInputRegex)
    })

    it('should not match single star', () => {
      expect('*Test*').not.toMatch(starInputRegex)
    })

    it('should not match unmatched stars', () => {
      expect('**Test*').not.toMatch(starInputRegex)
    })
  })

  describe('star paste regex', () => {
    it('should match bold text with stars for paste', () => {
      expect('**Test**').toMatch(starPasteRegex)
    })

    it('should match bold text in longer content', () => {
      expect('Some **bold text** here').toMatch(starPasteRegex)
    })
  })

  describe('underscore input regex', () => {
    it('should match bold text with underscores', () => {
      expect('__Test__').toMatch(underscoreInputRegex)
    })

    it('should match bold text with multiple words', () => {
      expect('__Bold text__').toMatch(underscoreInputRegex)
    })

    it('should not match single underscore', () => {
      expect('_Test_').not.toMatch(underscoreInputRegex)
    })

    it('should not match unmatched underscores', () => {
      expect('__Test_').not.toMatch(underscoreInputRegex)
    })
  })

  describe('underscore paste regex', () => {
    it('should match bold text with underscores for paste', () => {
      expect('__Test__').toMatch(underscorePasteRegex)
    })

    it('should match bold text in longer content', () => {
      expect('Some __bold text__ here').toMatch(underscorePasteRegex)
    })
  })
})
