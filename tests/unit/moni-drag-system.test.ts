import { Editor } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

describe('Moni Drag System', () => {
  let editor: Editor
  let container: HTMLElement

  beforeEach(() => {
    // Create container element
    container = document.createElement('div')
    if (typeof document !== 'undefined') {
      document.body.appendChild(container)
    }

    // Create moni-enhanced paragraph
    const MoniParagraph = Paragraph.extend({
      name: 'moniParagraph',
    })

    // Create editor with drag system
    editor = new Editor({
      element: container,
      extensions: [Document, Text, MoniParagraph],
      content: `
        <p moni-block-id="block-1" moni-drag-enabled="true">First paragraph</p>
        <p moni-block-id="block-2" moni-drag-enabled="true">Second paragraph</p>
      `,
    })
  })

  afterEach(() => {
    if (editor) {
      editor.destroy()
    }
    if (container && container.parentElement) {
      container.parentElement.removeChild(container)
    }
  })

  describe('原子能力验证', () => {
    it('should have native moni drag attributes', () => {
      const paragraphType = editor.schema.nodes.moniParagraph
      expect(paragraphType).toBeDefined()

      const attributes = paragraphType.spec.attrs || {}

      // 基础属性
      expect(attributes).toHaveProperty('moni-block-id')
      expect(attributes).toHaveProperty('moni-parent-id')

      // 层级结构属性
      expect(attributes).toHaveProperty('moni-level')
      expect(attributes).toHaveProperty('moni-depth')
      expect(attributes).toHaveProperty('moni-index')

      // 拖拽行为属性
      expect(attributes).toHaveProperty('moni-drag-enabled')
      expect(attributes).toHaveProperty('moni-drag-handle')
      expect(attributes).toHaveProperty('moni-nestable')
      expect(attributes).toHaveProperty('moni-drag-type')

      // 拖拽约束属性
      expect(attributes).toHaveProperty('moni-drop-targets')
      expect(attributes).toHaveProperty('moni-max-nest-level')
      expect(attributes).toHaveProperty('moni-can-nest-in')
    })

    it('should have correct default values', () => {
      const doc = editor.state.doc
      let paragraphNode: any = null

      doc.descendants(node => {
        if (node.type.name === 'moniParagraph' && node.attrs['moni-block-id'] === 'block-1') {
          paragraphNode = node
          return false
        }
        return true
      })

      expect(paragraphNode).toBeDefined()
      expect(paragraphNode.attrs['moni-drag-enabled']).toBe(true)
      expect(paragraphNode.attrs['moni-drag-handle']).toBe(true)
      expect(paragraphNode.attrs['moni-nestable']).toBe(false)
      expect(paragraphNode.attrs['moni-drag-type']).toBe('block')
      expect(paragraphNode.attrs['moni-level']).toBe(0)
    })
  })

  describe('HTML 渲染验证', () => {
    it('should render moni attributes in HTML', () => {
      const html = editor.getHTML()
      expect(html).toContain('moni-block-id="block-1"')
      expect(html).toContain('moni-block-id="block-2"')
      // Note: moni-drag-enabled with default value 'true' may not be rendered
      // This is TipTap's standard behavior for default values
    })

    it('should preserve attributes when parsing HTML', () => {
      const testHtml =
        '<p moni-block-id="test-block" moni-parent-id="test-parent" moni-drag-enabled="true">Test content</p>'
      editor.commands.setContent(testHtml)

      const json = editor.getJSON()
      const paragraph = json.content[0]

      expect(paragraph.attrs['moni-block-id']).toBe('test-block')
      expect(paragraph.attrs['moni-parent-id']).toBe('test-parent')
      expect(paragraph.attrs['moni-drag-enabled']).toBe(true)
    })
  })

  describe('属性更新验证', () => {
    it('should allow updating moni attributes', () => {
      editor.commands.updateAttributes('moniParagraph', {
        'moni-block-id': 'updated-block-id',
        'moni-parent-id': 'updated-parent-id',
        'moni-drag-enabled': false,
      })

      const json = editor.getJSON()
      const paragraph = json.content[0]

      expect(paragraph.attrs['moni-block-id']).toBe('updated-block-id')
      expect(paragraph.attrs['moni-parent-id']).toBe('updated-parent-id')
      expect(paragraph.attrs['moni-drag-enabled']).toBe(false)
    })

    it('should update HTML when attributes change', () => {
      editor.commands.updateAttributes('moniParagraph', {
        'moni-block-id': 'new-block-id',
        'moni-drag-enabled': false,
      })

      const html = editor.getHTML()
      expect(html).toContain('moni-block-id="new-block-id"')
      expect(html).toContain('moni-drag-enabled="false"')
    })
  })

  describe('拖拽功能验证', () => {
    it('should identify draggable blocks', () => {
      const doc = editor.state.doc
      const draggableBlocks: string[] = []

      doc.descendants(node => {
        if (node.attrs['moni-drag-enabled'] === true && node.attrs['moni-block-id']) {
          draggableBlocks.push(node.attrs['moni-block-id'])
        }
        return true
      })

      expect(draggableBlocks).toContain('block-1')
      expect(draggableBlocks).toContain('block-2')
    })

    it('should support nested structure attributes', () => {
      const testContent = `
        <p moni-block-id="parent" moni-level="0" moni-nestable="true">Parent block</p>
        <p moni-block-id="child" moni-parent-id="parent" moni-level="1">Child block</p>
      `

      editor.commands.setContent(testContent)

      const json = editor.getJSON()
      const parentBlock = json.content[0]
      const childBlock = json.content[1]

      expect(parentBlock.attrs['moni-level']).toBe(0)
      expect(parentBlock.attrs['moni-nestable']).toBe(true)
      expect(childBlock.attrs['moni-parent-id']).toBe('parent')
      expect(childBlock.attrs['moni-level']).toBe(1)
    })
  })

  describe('JSON 序列化验证', () => {
    it('should maintain attributes in JSON export/import', () => {
      const originalJSON = editor.getJSON()

      // Create moni-enhanced paragraph for new editor
      const MoniParagraph = Paragraph.extend({
        name: 'moniParagraph',
      })

      // Create new editor and import the JSON
      const newEditor = new Editor({
        extensions: [Document, Text, MoniParagraph],
        content: originalJSON,
      })

      const newJSON = newEditor.getJSON()

      // Compare attributes
      expect(newJSON.content[0].attrs['moni-block-id']).toBe('block-1')
      expect(newJSON.content[0].attrs['moni-drag-enabled']).toBe(true)
      expect(newJSON.content[1].attrs['moni-block-id']).toBe('block-2')
      expect(newJSON.content[1].attrs['moni-drag-enabled']).toBe(true)

      newEditor.destroy()
    })
  })

  describe('性能验证', () => {
    it('should handle multiple nodes efficiently', () => {
      const start = performance.now()

      // Create content with many blocks
      const content = Array.from(
        { length: 100 },
        (_, i) => `<p moni-block-id="block-${i}" moni-drag-enabled="true">Block ${i}</p>`,
      ).join('')

      editor.commands.setContent(content)

      const json = editor.getJSON()
      const end = performance.now()

      expect(json.content).toHaveLength(100)
      expect(json.content[0].attrs['moni-block-id']).toBe('block-0')
      expect(json.content[99].attrs['moni-block-id']).toBe('block-99')

      // Performance should be reasonable (less than 1 second)
      expect(end - start).toBeLessThan(1000)
    })
  })
})
