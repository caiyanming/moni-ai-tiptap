/// <reference types="cypress" />
/* eslint-disable no-unused-expressions, @typescript-eslint/no-unused-expressions, no-void */

import { Editor, moniDefaultBlockIdGenerator, Node } from '@tiptap/core'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'

describe('Moni Node Enhancement', () => {
  describe('moniDefaultBlockIdGenerator', () => {
    it('should generate unique block IDs with moni prefix', () => {
      const id1 = moniDefaultBlockIdGenerator()
      const id2 = moniDefaultBlockIdGenerator()

      expect(id1).to.match(/^moni-block-\d+-[a-z0-9]+$/)
      expect(id2).to.match(/^moni-block-\d+-[a-z0-9]+$/)
      expect(id1).to.not.eq(id2)
    })

    it('should generate consistent format', () => {
      const id = moniDefaultBlockIdGenerator()
      const parts = id.split('-')

      expect(parts[0]).to.eq('moni')
      expect(parts[1]).to.eq('block')
      expect(parts[2]).to.match(/^\d+$/) // timestamp
      expect(parts[3]).to.match(/^[a-z0-9]+$/) // random string
    })
  })

  describe('Node Configuration', () => {
    it('should create a node with default moni configuration', () => {
      const testNode = Node.create({
        name: 'testNode',
        content: 'block*',
        group: 'block',
      })

      expect(testNode.name).to.eq('testNode')
      expect(testNode.type).to.eq('node')
      expect(testNode.config).to.not.be.undefined
    })

    it('should create a node with moni features enabled', () => {
      const nodeWithMoniFeatures = Node.create({
        name: 'moniNode',
        content: 'inline*',
        group: 'block',
        moniEnableBlockId: true,
        moniEnableParentId: true,
        moniBlockIdGenerator: () => 'custom-moni-block-id',
      })

      expect(nodeWithMoniFeatures.name).to.eq('moniNode')
      expect(nodeWithMoniFeatures.config.moniEnableBlockId).to.eq(true)
      expect(nodeWithMoniFeatures.config.moniEnableParentId).to.eq(true)
      expect(nodeWithMoniFeatures.config.moniBlockIdGenerator).to.be.a('function')
    })

    it('should create a node with moni features disabled', () => {
      const nodeWithoutMoniFeatures = Node.create({
        name: 'regularNode',
        content: 'text*',
        moniEnableBlockId: false,
        moniEnableParentId: false,
      })

      expect(nodeWithoutMoniFeatures.name).to.eq('regularNode')
      expect(nodeWithoutMoniFeatures.config.moniEnableBlockId).to.eq(false)
      expect(nodeWithoutMoniFeatures.config.moniEnableParentId).to.eq(false)
    })

    it('should use default moni configuration when not specified', () => {
      const defaultNode = Node.create({
        name: 'defaultNode',
        content: 'text*',
      })

      // moni features should default to enabled (true) or undefined
      expect(defaultNode.config.moniEnableBlockId).to.not.eq(false)
      expect(defaultNode.config.moniEnableParentId).to.not.eq(false)
    })
  })

  describe('Node Extension', () => {
    it('should extend a node with additional moni features', () => {
      const baseNode = Node.create({
        name: 'baseNode',
        content: 'text*',
      })

      const extendedNode = baseNode.extend({
        name: 'extendedNode',
        moniEnableBlockId: true,
        moniEnableParentId: true,
      })

      expect(extendedNode.name).to.eq('extendedNode')
      expect(extendedNode.config.moniEnableBlockId).to.eq(true)
      expect(extendedNode.config.moniEnableParentId).to.eq(true)
    })

    it('should preserve moni configuration during extension', () => {
      const nodeWithMoni = Node.create({
        name: 'originalNode',
        content: 'text*',
        moniEnableBlockId: true,
        moniBlockIdGenerator: moniDefaultBlockIdGenerator,
      })

      const extendedNode = nodeWithMoni.extend({
        name: 'extendedMoniNode',
        moniEnableParentId: true,
      })

      expect(extendedNode.config.moniEnableBlockId).to.eq(true)
      expect(extendedNode.config.moniEnableParentId).to.eq(true)
      expect(extendedNode.config.moniBlockIdGenerator).to.eq(moniDefaultBlockIdGenerator)
    })
  })

  describe('Editor Integration', () => {
    it('should work with Editor instance', () => {
      // Create a custom paragraph with moni features
      const MoniParagraph = Paragraph.extend({
        name: 'moniParagraph',
        moniEnableBlockId: true,
        moniEnableParentId: true,
      })

      const editor = new Editor({
        extensions: [Document, MoniParagraph, Text],
        content: '<p>Test paragraph with moni features</p>',
      })

      void expect(editor).to.exist
      void expect(editor.getJSON()).to.exist

      // The editor should work normally even with moni enhancements
      editor.commands.setContent('<p>Updated content</p>')
      expect(editor.getHTML()).to.include('Updated content')
    })

    it('should handle multiple nodes with moni features', () => {
      const MoniParagraph = Paragraph.extend({
        name: 'moniParagraph',
        moniEnableBlockId: true,
      })

      const MoniHeading = Node.create({
        name: 'moniHeading',
        content: 'inline*',
        group: 'block',
        moniEnableBlockId: true,
        moniEnableParentId: true,
        parseHTML() {
          return [{ tag: 'h1' }]
        },
        renderHTML() {
          return ['h1', 0]
        },
      })

      const editor = new Editor({
        extensions: [Document, MoniParagraph, MoniHeading, Text],
        content: '<h1>Heading</h1><p>Paragraph</p>',
      })

      void expect(editor.getJSON()).to.exist
      const json = editor.getJSON()

      // Should have both nodes in content
      expect(json.content).to.have.length(2)
      expect(json.content[0].type).to.eq('moniHeading')
      expect(json.content[1].type).to.eq('moniParagraph')
    })
  })

  describe('Configuration Validation', () => {
    it('should handle custom moni block ID generator', () => {
      const customGenerator = () => 'my-custom-moni-id'
      const nodeWithCustomGenerator = Node.create({
        name: 'customGeneratorNode',
        content: 'text*',
        moniBlockIdGenerator: customGenerator,
      })

      expect(nodeWithCustomGenerator.config.moniBlockIdGenerator).to.eq(customGenerator)
      expect(nodeWithCustomGenerator.config.moniBlockIdGenerator()).to.eq('my-custom-moni-id')
    })

    it('should handle invalid moni configuration gracefully', () => {
      // Test that invalid configurations don't break the node creation
      expect(() => {
        Node.create({
          name: 'errorNode',
          content: 'text*',
          moniEnableBlockId: 'invalid' as any, // Should be boolean
        })
      }).to.not.throw()
    })

    it('should handle missing name gracefully', () => {
      // Test that missing name doesn't break moni features
      expect(() => {
        Node.create({
          // Missing name
          content: 'text*',
          moniEnableBlockId: true,
        } as any)
      }).to.not.throw()
    })
  })

  describe('Attribute Generation', () => {
    it('should support moni attributes in node configuration', () => {
      const nodeWithMoniAttributes = Node.create({
        name: 'testNode',
        content: 'text*',
        moniEnableBlockId: true,
        moniEnableParentId: true,
        addAttributes() {
          return {
            customAttr: {
              default: 'test',
            },
          }
        },
      })

      expect(nodeWithMoniAttributes.config.moniEnableBlockId).to.eq(true)
      expect(nodeWithMoniAttributes.config.moniEnableParentId).to.eq(true)
      expect(nodeWithMoniAttributes.config.addAttributes).to.be.a('function')
    })
  })

  describe('Performance', () => {
    it('should not significantly impact node creation performance', () => {
      const startTime = Date.now()

      // Create multiple nodes with moni features
      for (let i = 0; i < 100; i += 1) {
        Node.create({
          name: `testNode${i}`,
          content: 'text*',
          moniEnableBlockId: true,
          moniEnableParentId: true,
          moniBlockIdGenerator: moniDefaultBlockIdGenerator,
        })
      }

      const endTime = Date.now()
      const duration = endTime - startTime

      // Should complete in reasonable time (less than 1 second for 100 nodes)
      expect(duration).to.be.lessThan(1000)
    })
  })
})
