import { Editor } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Heading from '@tiptap/extension-heading'
import { Nesting } from '@tiptap/extension-nesting'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { afterEach,describe, expect, it } from 'vitest'

describe('Nesting Extension', () => {
  let editor: Editor | null = null

  afterEach(() => {
    if (editor) {
      editor.destroy()
      editor = null
    }
  })

  describe('Extension Configuration', () => {
    it('should create extension with default options', () => {
      editor = new Editor({
        extensions: [Document, Paragraph, Heading, Text, Nesting],
        content: '',
      })

      expect(editor.extensionManager.extensions.find(ext => ext.name === 'nesting')).toBeDefined()
    })

    it('should accept custom configuration options', () => {
      editor = new Editor({
        extensions: [
          Document,
          Paragraph,
          Heading,
          Text,
          Nesting.configure({
            maxNestingLevel: 3,
          }),
        ],
        content: '',
      })

      const nestingExt = editor.extensionManager.extensions.find(ext => ext.name === 'nesting')
      expect(nestingExt?.options.maxNestingLevel).toBe(3)
    })
  })

  describe('Commands - updateNestingLevel', () => {
    it('should update block nesting level', () => {
      editor = new Editor({
        extensions: [Document, Paragraph, Text, Nesting],
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              attrs: { moniBlockId: 'block-1', moniLevel: 0 },
              content: [{ type: 'text', text: 'Block 1' }],
            },
          ],
        },
      })

      const result = editor.commands.updateNestingLevel('block-1', 2)
      expect(result).toBe(true)

      const firstNode = editor.state.doc.firstChild
      expect(firstNode?.attrs.moniLevel).toBe(2)
    })

    it('should clamp nesting level to maximum allowed', () => {
      editor = new Editor({
        extensions: [Document, Paragraph, Text, Nesting.configure({ maxNestingLevel: 3 })],
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              attrs: { moniBlockId: 'block-1', moniLevel: 0 },
              content: [{ type: 'text', text: 'Block 1' }],
            },
          ],
        },
      })

      editor.commands.updateNestingLevel('block-1', 5)

      const firstNode = editor.state.doc.firstChild
      expect(firstNode?.attrs.moniLevel).toBe(3)
    })

    it('should return false for non-existent block', () => {
      editor = new Editor({
        extensions: [Document, Paragraph, Text, Nesting],
        content: '<p>Content</p>',
      })

      const result = editor.commands.updateNestingLevel('nonexistent-block', 2)
      expect(result).toBe(false)
    })
  })

  describe('Commands - setBlockParent', () => {
    it('should set block parent and calculate level', () => {
      editor = new Editor({
        extensions: [Document, Paragraph, Text, Nesting],
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              attrs: { moniBlockId: 'parent-1', moniLevel: 0 },
              content: [{ type: 'text', text: 'Parent' }],
            },
            {
              type: 'paragraph',
              attrs: { moniBlockId: 'child-1', moniLevel: 0 },
              content: [{ type: 'text', text: 'Child' }],
            },
          ],
        },
      })

      const result = editor.commands.setBlockParent('child-1', 'parent-1')
      expect(result).toBe(true)

      const childNode = editor.state.doc.child(1)
      expect(childNode.attrs.moniParentId).toBe('parent-1')
      expect(childNode.attrs.moniLevel).toBe(1)
    })

    it('should clear parent when set to null', () => {
      editor = new Editor({
        extensions: [Document, Paragraph, Text, Nesting],
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              attrs: { moniBlockId: 'block-1', moniParentId: 'parent-1', moniLevel: 1 },
              content: [{ type: 'text', text: 'Block' }],
            },
          ],
        },
      })

      editor.commands.setBlockParent('block-1', null)

      const firstNode = editor.state.doc.firstChild
      expect(firstNode?.attrs.moniParentId).toBeNull()
      expect(firstNode?.attrs.moniLevel).toBe(0)
    })
  })

  describe('Commands - batchUpdateNesting', () => {
    it('should batch update multiple blocks', () => {
      editor = new Editor({
        extensions: [Document, Paragraph, Text, Nesting],
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              attrs: { moniBlockId: 'block-1', moniLevel: 0 },
              content: [{ type: 'text', text: 'Block 1' }],
            },
            {
              type: 'paragraph',
              attrs: { moniBlockId: 'block-2', moniLevel: 0 },
              content: [{ type: 'text', text: 'Block 2' }],
            },
          ],
        },
      })

      const updates = [
        { moniBlockId: 'block-1', level: 1, parentId: 'parent-1' },
        { moniBlockId: 'block-2', level: 2, parentId: 'parent-2' },
      ]

      const result = editor.commands.batchUpdateNesting(updates)
      expect(result).toBe(true)

      const firstNode = editor.state.doc.child(0)
      expect(firstNode.attrs.moniLevel).toBe(1)
      expect(firstNode.attrs.moniParentId).toBe('parent-1')

      const secondNode = editor.state.doc.child(1)
      expect(secondNode.attrs.moniLevel).toBe(2)
      expect(secondNode.attrs.moniParentId).toBe('parent-2')
    })
  })

  describe('Commands - recalculateAllNesting', () => {
    it('should recalculate all nesting levels', () => {
      editor = new Editor({
        extensions: [Document, Paragraph, Text, Nesting],
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              attrs: { moniBlockId: 'parent', moniParentId: null, moniLevel: 0 },
              content: [{ type: 'text', text: 'Parent' }],
            },
            {
              type: 'paragraph',
              attrs: { moniBlockId: 'child', moniParentId: 'parent', moniLevel: 5 }, // Wrong level
              content: [{ type: 'text', text: 'Child' }],
            },
          ],
        },
      })

      const result = editor.commands.recalculateAllNesting()
      expect(result).toBe(true)

      const childNode = editor.state.doc.child(1)
      expect(childNode.attrs.moniLevel).toBe(1) // Corrected to 1
    })
  })

  describe('Commands - fixNestingInconsistency', () => {
    it('should fix inconsistent nesting', () => {
      editor = new Editor({
        extensions: [Document, Paragraph, Text, Nesting],
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              attrs: { moniBlockId: 'parent', moniParentId: null, moniLevel: 0 },
              content: [{ type: 'text', text: 'Parent' }],
            },
            {
              type: 'paragraph',
              attrs: { moniBlockId: 'child', moniParentId: 'parent', moniLevel: 3 }, // Inconsistent
              content: [{ type: 'text', text: 'Child' }],
            },
          ],
        },
      })

      const result = editor.commands.fixNestingInconsistency()
      expect(result).toBe(true)

      const childNode = editor.state.doc.child(1)
      expect(childNode.attrs.moniLevel).toBe(1)
    })

    it('should return false if no inconsistencies found', () => {
      editor = new Editor({
        extensions: [Document, Paragraph, Text, Nesting],
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              attrs: { moniBlockId: 'parent', moniParentId: null, moniLevel: 0 },
              content: [{ type: 'text', text: 'Parent' }],
            },
            {
              type: 'paragraph',
              attrs: { moniBlockId: 'child', moniParentId: 'parent', moniLevel: 1 },
              content: [{ type: 'text', text: 'Child' }],
            },
          ],
        },
      })

      const result = editor.commands.fixNestingInconsistency()
      expect(result).toBe(false)
    })
  })

  describe('Storage - getBlockChildren', () => {
    it('should get direct children of a block', () => {
      editor = new Editor({
        extensions: [Document, Paragraph, Text, Nesting],
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              attrs: { moniBlockId: 'parent', moniParentId: null, moniLevel: 0 },
              content: [{ type: 'text', text: 'Parent' }],
            },
            {
              type: 'paragraph',
              attrs: { moniBlockId: 'child-1', moniParentId: 'parent', moniLevel: 1 },
              content: [{ type: 'text', text: 'Child 1' }],
            },
            {
              type: 'paragraph',
              attrs: { moniBlockId: 'child-2', moniParentId: 'parent', moniLevel: 1 },
              content: [{ type: 'text', text: 'Child 2' }],
            },
            {
              type: 'paragraph',
              attrs: { moniBlockId: 'other', moniParentId: 'other-parent', moniLevel: 1 },
              content: [{ type: 'text', text: 'Other' }],
            },
          ],
        },
      })

      const children = editor.storage.nesting.getBlockChildren(editor.state, 'parent')
      expect(children).toHaveLength(2)
      expect(children).toContain('child-1')
      expect(children).toContain('child-2')
      expect(children).not.toContain('other')
    })
  })

  describe('Storage - getBlockDescendants', () => {
    it('should get all descendants of a block', () => {
      editor = new Editor({
        extensions: [Document, Paragraph, Text, Nesting],
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              attrs: { moniBlockId: 'parent', moniParentId: null, moniLevel: 0 },
              content: [{ type: 'text', text: 'Parent' }],
            },
            {
              type: 'paragraph',
              attrs: { moniBlockId: 'child', moniParentId: 'parent', moniLevel: 1 },
              content: [{ type: 'text', text: 'Child' }],
            },
            {
              type: 'paragraph',
              attrs: { moniBlockId: 'grandchild', moniParentId: 'child', moniLevel: 2 },
              content: [{ type: 'text', text: 'Grandchild' }],
            },
          ],
        },
      })

      const descendants = editor.storage.nesting.getBlockDescendants(editor.state, 'parent')
      expect(descendants).toHaveLength(2)
      expect(descendants).toContain('child')
      expect(descendants).toContain('grandchild')
    })

    it('should handle circular references without infinite loop', () => {
      editor = new Editor({
        extensions: [Document, Paragraph, Text, Nesting],
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              attrs: { moniBlockId: 'block-a', moniParentId: 'block-b', moniLevel: 1 },
              content: [{ type: 'text', text: 'Block A' }],
            },
            {
              type: 'paragraph',
              attrs: { moniBlockId: 'block-b', moniParentId: 'block-a', moniLevel: 1 },
              content: [{ type: 'text', text: 'Block B' }],
            },
          ],
        },
      })

      const descendants = editor.storage.nesting.getBlockDescendants(editor.state, 'block-a')
      expect(Array.isArray(descendants)).toBe(true)
      // Should not hang or throw
    })
  })

  describe('Storage - validateNestingConsistency', () => {
    it('should validate consistent nesting structure', () => {
      editor = new Editor({
        extensions: [Document, Paragraph, Text, Nesting],
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              attrs: { moniBlockId: 'parent', moniParentId: null, moniLevel: 0 },
              content: [{ type: 'text', text: 'Parent' }],
            },
            {
              type: 'paragraph',
              attrs: { moniBlockId: 'child', moniParentId: 'parent', moniLevel: 1 },
              content: [{ type: 'text', text: 'Child' }],
            },
          ],
        },
      })

      const result = editor.storage.nesting.validateNestingConsistency(editor.state)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect inconsistent nesting level', () => {
      editor = new Editor({
        extensions: [Document, Paragraph, Text, Nesting],
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              attrs: { moniBlockId: 'parent', moniParentId: null, moniLevel: 0 },
              content: [{ type: 'text', text: 'Parent' }],
            },
            {
              type: 'paragraph',
              attrs: { moniBlockId: 'child', moniParentId: 'parent', moniLevel: 3 }, // Should be 1
              content: [{ type: 'text', text: 'Child' }],
            },
          ],
        },
      })

      const result = editor.storage.nesting.validateNestingConsistency(editor.state)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('inconsistent nesting level')
    })
  })
})
