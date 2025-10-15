import { Editor } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import { HiddenBlock, HiddenBlockUtils, NULL_UUID } from '@tiptap/extension-hidden-block'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { describe, expect, it } from 'vitest'

describe('HiddenBlock Extension', () => {
  describe('Manual Insertion', () => {
    it('should insert hidden block with correct attributes', () => {
      const editor = new Editor({
        extensions: [Document, Paragraph, Text, HiddenBlock],
        content: '',
      })

      // Manually insert hiddenBlock (as designed)
      const success = editor.commands.insertHiddenBlock()
      expect(success).toBe(true)

      const firstNode = editor.state.doc.firstChild
      expect(firstNode?.type.name).toBe('hiddenBlock')
      expect(firstNode?.attrs.id).toBe(NULL_UUID)
      expect(firstNode?.attrs.moniBlockId).toBe(NULL_UUID)
      expect(firstNode?.attrs.hidden).toBe(true)
      expect(firstNode?.attrs.isInitialBlock).toBe(true)
      expect(firstNode?.attrs.moniDragEnabled).toBe(false)

      editor.destroy()
    })

    it('should insert hidden block before existing content', () => {
      const editor = new Editor({
        extensions: [Document, Paragraph, Text, HiddenBlock],
        content: '<p>Hello</p>',
      })

      editor.commands.insertHiddenBlock()

      const firstNode = editor.state.doc.firstChild
      expect(firstNode?.type.name).toBe('hiddenBlock')

      const secondNode = editor.state.doc.child(1)
      expect(secondNode?.type.name).toBe('paragraph')

      editor.destroy()
    })

    it('should NOT insert duplicate if already exists', () => {
      const editor = new Editor({
        extensions: [Document, Paragraph, Text, HiddenBlock],
        content: '',
      })

      editor.commands.insertHiddenBlock()
      const firstInsert = editor.state.doc.childCount

      // Try to insert again
      const result = editor.commands.insertHiddenBlock()
      expect(result).toBe(false)

      // Should not duplicate
      expect(editor.state.doc.childCount).toBe(firstInsert)

      editor.destroy()
    })

    it('should parse hidden block from HTML', () => {
      const editor = new Editor({
        extensions: [Document, Paragraph, Text, HiddenBlock],
        content: `
          <div data-hidden-block="true" data-id="${NULL_UUID}" data-moni-block-id="${NULL_UUID}" data-initial-block="true" data-moni-drag-enabled="false"></div>
          <p>Content</p>
        `,
      })

      const firstNode = editor.state.doc.firstChild
      expect(firstNode?.type.name).toBe('hiddenBlock')
      expect(firstNode?.attrs.moniBlockId).toBe(NULL_UUID)

      editor.destroy()
    })
  })

  describe('Attributes with Defaults', () => {
    it('should have NULL_UUID as default values', () => {
      const editor = new Editor({
        extensions: [Document, Paragraph, Text, HiddenBlock],
        content: '',
      })

      editor.commands.insertHiddenBlock()

      const firstNode = editor.state.doc.firstChild
      expect(firstNode?.attrs.id).toBe(NULL_UUID)
      expect(firstNode?.attrs.moniBlockId).toBe(NULL_UUID)
      expect(firstNode?.attrs.hidden).toBe(true)
      expect(firstNode?.attrs.isInitialBlock).toBe(true)
      expect(firstNode?.attrs.moniDragEnabled).toBe(false)

      editor.destroy()
    })
  })

  describe('Storage Methods', () => {
    it('hasHiddenBlock should return true when present', () => {
      const editor = new Editor({
        extensions: [Document, Paragraph, Text, HiddenBlock],
        content: '',
      })

      editor.commands.insertHiddenBlock()

      const hasBlock = editor.storage.hiddenBlock.hasHiddenBlock(editor)
      expect(hasBlock).toBe(true)

      editor.destroy()
    })

    it('hasHiddenBlock should return false when absent', () => {
      const editor = new Editor({
        extensions: [Document, Paragraph, Text, HiddenBlock],
        content: '<p>Test</p>',
      })

      const hasBlock = editor.storage.hiddenBlock.hasHiddenBlock(editor)
      expect(hasBlock).toBe(false)

      editor.destroy()
    })

    it('getHiddenBlockInfo should return correct info', () => {
      const editor = new Editor({
        extensions: [Document, Paragraph, Text, HiddenBlock],
        content: '',
      })

      editor.commands.insertHiddenBlock()

      const info = editor.storage.hiddenBlock.getHiddenBlockInfo(editor)
      expect(info.exists).toBe(true)
      expect(info.moniBlockId).toBe(NULL_UUID)
      expect(info.isValid).toBe(true)
      expect(info.position).toBe(0)

      editor.destroy()
    })
  })

  describe('HiddenBlockUtils', () => {
    it('isHiddenBlock should identify hidden blocks', () => {
      const node = { type: { name: 'hiddenBlock' } }
      expect(HiddenBlockUtils.isHiddenBlock(node)).toBe(true)

      const notHiddenBlock = { type: { name: 'paragraph' } }
      expect(HiddenBlockUtils.isHiddenBlock(notHiddenBlock)).toBe(false)
    })

    it('isNullUUIDHiddenBlock should validate NULL_UUID', () => {
      const validNode = {
        type: { name: 'hiddenBlock' },
        attrs: { id: NULL_UUID, moniBlockId: NULL_UUID },
      }
      expect(HiddenBlockUtils.isNullUUIDHiddenBlock(validNode)).toBe(true)

      const invalidNode = {
        type: { name: 'hiddenBlock' },
        attrs: { id: 'other-id', moniBlockId: 'other-id' },
      }
      expect(HiddenBlockUtils.isNullUUIDHiddenBlock(invalidNode)).toBe(false)
    })

    it('createHiddenBlock should generate correct JSON', () => {
      const block = HiddenBlockUtils.createHiddenBlock()

      expect(block.type).toBe('hiddenBlock')
      expect(block.attrs.id).toBe(NULL_UUID)
      expect(block.attrs.moniBlockId).toBe(NULL_UUID)
      expect(block.attrs.hidden).toBe(true)
      expect(block.attrs.isInitialBlock).toBe(true)
      expect(block.attrs.moniDragEnabled).toBe(false)
    })

    it('filterHiddenBlocks should remove hidden blocks', () => {
      const content = [
        HiddenBlockUtils.createHiddenBlock(),
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [] },
      ]

      const filtered = HiddenBlockUtils.filterHiddenBlocks(content)

      expect(filtered.length).toBe(2)
      expect(filtered.every((node: any) => node.type !== 'hiddenBlock')).toBe(true)
    })

    it('restoreHiddenBlock should add hidden block if missing', () => {
      const content = [
        { type: 'paragraph', content: [] },
        { type: 'paragraph', content: [] },
      ]

      const restored = HiddenBlockUtils.restoreHiddenBlock(content)

      expect(restored.length).toBe(3)
      expect(restored[0].type).toBe('hiddenBlock')
    })

    it('restoreHiddenBlock should not duplicate if already present', () => {
      const content = [HiddenBlockUtils.createHiddenBlock(), { type: 'paragraph', content: [] }]

      const restored = HiddenBlockUtils.restoreHiddenBlock(content)

      expect(restored.length).toBe(2)
      expect(restored[0].type).toBe('hiddenBlock')
    })
  })

  describe('NULL_UUID Constant', () => {
    it('should export correct NULL_UUID value', () => {
      expect(NULL_UUID).toBe('13814000-1dd2-11b2-8080-808080808080')
    })

    it('NULL_UUID should be consistent across imports', () => {
      const editor = new Editor({
        extensions: [Document, Paragraph, Text, HiddenBlock],
        content: '',
      })

      editor.commands.insertHiddenBlock()

      const firstNode = editor.state.doc.firstChild
      expect(firstNode?.attrs.moniBlockId).toBe(NULL_UUID)
      expect(firstNode?.attrs.id).toBe(NULL_UUID)

      editor.destroy()
    })
  })
})
