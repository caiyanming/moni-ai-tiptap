import { Node } from '@tiptap/core'
import { describe, expect, it } from 'vitest'

import { CodeBlock } from '../../packages/extension-code-block/src/code-block.js'
import { ListItem } from '../../packages/extension-list/src/item/list-item.js'
// Import the core nodes that we've modified
import { Paragraph } from '../../packages/extension-paragraph/src/paragraph.js'
import { Table } from '../../packages/extension-table/src/table/table.js'

describe('Moni Stream System', () => {
  describe('Node Base Class Stream Attributes', () => {
    it('should include all 7 stream atomic capabilities', () => {
      const testNode = Node.create({ name: 'testNode' })
      const attributes = testNode.config.addAttributes?.()

      expect(attributes).toBeDefined()

      // Stream identification capabilities
      expect(attributes?.moniStreamId).toBeDefined()
      expect(attributes?.moniStreamTarget).toBeDefined()

      // Stream type capabilities
      expect(attributes?.moniStreamType).toBeDefined()
      expect(attributes?.moniStreamMode).toBeDefined()

      // Stream status capabilities
      expect(attributes?.moniOperationQueue).toBeDefined()
      expect(attributes?.moniStreamProgress).toBeDefined()
      expect(attributes?.moniStreamStatus).toBeDefined()
    })

    it('should have correct default values for stream attributes', () => {
      const testNode = Node.create({ name: 'testNode' })
      const attributes = testNode.config.addAttributes?.()

      expect(attributes?.moniStreamId?.default).toBe(null)
      expect(attributes?.moniStreamTarget?.default).toBe(false)
      expect(attributes?.moniStreamType?.default).toBe('text')
      expect(attributes?.moniStreamMode?.default).toBe('replace')
      expect(attributes?.moniOperationQueue?.default).toBe(null)
      expect(attributes?.moniStreamProgress?.default).toBe(0)
      expect(attributes?.moniStreamStatus?.default).toBe('idle')
    })

    it('should correctly parse and render stream attributes', () => {
      const testNode = Node.create({ name: 'testNode' })
      const attributes = testNode.config.addAttributes?.()

      // Test stream-id parsing
      const mockElement = {
        getAttribute: (attr: string) => {
          if (attr === 'moni-stream-id') {return 'stream-123'}
          if (attr === 'moni-stream-target') {return 'true'}
          if (attr === 'moni-stream-type') {return 'code'}
          if (attr === 'moni-stream-mode') {return 'append'}
          if (attr === 'moni-stream-progress') {return '0.5'}
          if (attr === 'moni-stream-status') {return 'processing'}
          return null
        },
      }

      expect(attributes?.moniStreamId?.parseHTML(mockElement)).toBe('stream-123')
      expect(attributes?.moniStreamTarget?.parseHTML(mockElement)).toBe(true)
      expect(attributes?.moniStreamType?.parseHTML(mockElement)).toBe('code')
      expect(attributes?.moniStreamMode?.parseHTML(mockElement)).toBe('append')
      expect(attributes?.moniStreamProgress?.parseHTML(mockElement)).toBe(0.5)
      expect(attributes?.moniStreamStatus?.parseHTML(mockElement)).toBe('processing')
    })
  })

  describe('Node Specialization', () => {
    it('should configure Paragraph for text stream type', () => {
      const paragraph = Paragraph.configure()
      const attributes = paragraph.config.addAttributes?.()

      expect(attributes?.moniStreamType?.default).toBe('text')
      expect(attributes?.moniStreamMode?.default).toBe('replace')
    })

    it('should configure ListItem for list stream type', () => {
      const listItem = ListItem.configure()
      const attributes = listItem.config.addAttributes?.()

      expect(attributes?.moniStreamType?.default).toBe('list')
      expect(attributes?.moniStreamMode?.default).toBe('insert')
    })

    it('should configure CodeBlock for code stream type', () => {
      const codeBlock = CodeBlock.configure()
      const attributes = codeBlock.config.addAttributes?.()

      expect(attributes?.moniStreamType?.default).toBe('code')
      expect(attributes?.moniStreamMode?.default).toBe('append')
    })

    it('should configure Table for table stream type', () => {
      const table = Table.configure()
      const attributes = table.config.addAttributes?.()

      expect(attributes?.moniStreamType?.default).toBe('table')
      expect(attributes?.moniStreamMode?.default).toBe('replace')
    })
  })

  describe('Operation Queue Serialization', () => {
    it('should correctly serialize and deserialize operation queue', () => {
      const testNode = Node.create({ name: 'testNode' })
      const attributes = testNode.config.addAttributes?.()

      const testQueue = ['operation1', 'operation2', 'operation3']

      // Test rendering
      const renderResult = attributes?.moniOperationQueue?.renderHTML({
        moniOperationQueue: testQueue,
      })
      expect(renderResult).toEqual({
        'moni-operation-queue': JSON.stringify(testQueue),
      })

      // Test parsing
      const mockElement = {
        getAttribute: () => JSON.stringify(testQueue),
      }
      const parseResult = attributes?.moniOperationQueue?.parseHTML(mockElement)
      expect(parseResult).toEqual(testQueue)
    })

    it('should handle empty operation queue', () => {
      const testNode = Node.create({ name: 'testNode' })
      const attributes = testNode.config.addAttributes?.()

      const renderResult = attributes?.moniOperationQueue?.renderHTML({
        moniOperationQueue: null,
      })
      expect(renderResult).toEqual({})
    })
  })

  describe('Stream Progress and Status', () => {
    it('should handle progress values correctly', () => {
      const testNode = Node.create({ name: 'testNode' })
      const attributes = testNode.config.addAttributes?.()

      // Test progress rendering
      const renderResult = attributes?.moniStreamProgress?.renderHTML({
        moniStreamProgress: 0.75,
      })
      expect(renderResult).toEqual({
        'moni-stream-progress': '0.75',
      })

      // Test zero progress (should not render)
      const zeroResult = attributes?.moniStreamProgress?.renderHTML({
        moniStreamProgress: 0,
      })
      expect(zeroResult).toEqual({})
    })

    it('should handle status values correctly', () => {
      const testNode = Node.create({ name: 'testNode' })
      const attributes = testNode.config.addAttributes?.()

      // Test non-default status
      const renderResult = attributes?.moniStreamStatus?.renderHTML({
        moniStreamStatus: 'processing',
      })
      expect(renderResult).toEqual({
        'moni-stream-status': 'processing',
      })

      // Test default status (should not render)
      const defaultResult = attributes?.moniStreamStatus?.renderHTML({
        moniStreamStatus: 'idle',
      })
      expect(defaultResult).toEqual({})
    })
  })

  describe('Integration with Existing Drag System', () => {
    it('should include both drag and stream attributes', () => {
      const testNode = Node.create({ name: 'testNode' })
      const attributes = testNode.config.addAttributes?.()

      // Verify drag attributes still exist
      expect(attributes?.moniBlockId).toBeDefined()
      expect(attributes?.moniParentId).toBeDefined()
      expect(attributes?.moniDragEnabled).toBeDefined()
      expect(attributes?.moniDragHandle).toBeDefined()

      // Verify stream attributes exist
      expect(attributes?.moniStreamId).toBeDefined()
      expect(attributes?.moniStreamTarget).toBeDefined()
      expect(attributes?.moniStreamType).toBeDefined()
      expect(attributes?.moniStreamMode).toBeDefined()
    })

    it('should have total of 18 moni attributes (11 drag + 7 stream)', () => {
      const testNode = Node.create({ name: 'testNode' })
      const attributes = testNode.config.addAttributes?.()

      const moniAttributes = Object.keys(attributes || {}).filter(key => key.startsWith('moni'))

      expect(moniAttributes).toHaveLength(18)
    })
  })

  describe('Performance Validation', () => {
    it('should create nodes with stream attributes efficiently', () => {
      const startTime = performance.now()

      for (let i = 0; i < 100; i += 1) {
        const testNode = Node.create({ name: `testNode${i}` })
        testNode.config.addAttributes?.()
      }

      const endTime = performance.now()
      const duration = endTime - startTime

      // Should complete 100 node creations in less than 100ms
      expect(duration).toBeLessThan(100)
    })
  })
})
