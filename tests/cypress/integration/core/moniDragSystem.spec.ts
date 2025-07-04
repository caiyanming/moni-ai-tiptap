/// <reference types="cypress" />
/* eslint-disable no-unused-expressions, @typescript-eslint/no-unused-expressions, no-void */

import { Editor } from '@tiptap/core'
import { Document } from '@tiptap/extension-document'
import { BulletList, ListItem } from '@tiptap/extension-list'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Text } from '@tiptap/extension-text'

import { DragHandleManager } from '../../../../packages/core/src/DragHandleManager.js'
import { DragIndicatorManager } from '../../../../packages/core/src/DragIndicatorManager.js'
import { DragOperationManager } from '../../../../packages/core/src/DragOperationManager.js'
import { MoniDragPlugin } from '../../../../packages/core/src/MoniDragPlugin.js'

describe('Moni Drag System', () => {
  let editor: Editor
  let container: HTMLElement

  beforeEach(() => {
    // Create container element
    container = document.createElement('div')
    document.body.appendChild(container)

    // Create editor with drag system
    editor = new Editor({
      element: container,
      extensions: [Document, Text, Paragraph, BulletList, ListItem],
      content: `
        <p moni-block-id="block-1">First paragraph</p>
        <ul moni-block-id="block-2">
          <li moni-block-id="block-3" moni-parent-id="block-2" moni-level="1">First list item</li>
          <li moni-block-id="block-4" moni-parent-id="block-2" moni-level="1">Second list item</li>
        </ul>
        <p moni-block-id="block-5">Second paragraph</p>
      `,
    })
  })

  afterEach(() => {
    editor.destroy()
    if (container.parentElement) {
      container.parentElement.removeChild(container)
    }
  })

  describe('原子能力测试', () => {
    it('should have native moni attributes in Node base class', () => {
      // Get the paragraph extension
      const paragraphExtension = Paragraph

      // Create editor instance to get schema
      const testEditor = new Editor({
        extensions: [Document, Text, paragraphExtension],
        content: '<p>test</p>',
      })

      // Get the paragraph node type from schema
      const paragraphNodeType = testEditor.schema.nodes.paragraph

      // Check that all moni attributes are included in the node spec
      const attributes = paragraphNodeType.spec.attrs || {}

      // Basic attributes
      expect(attributes).to.have.property('moni-block-id')
      expect(attributes).to.have.property('moni-parent-id')

      // Hierarchical structure attributes
      expect(attributes).to.have.property('moni-level')
      expect(attributes).to.have.property('moni-depth')
      expect(attributes).to.have.property('moni-index')

      // Drag behavior attributes
      expect(attributes).to.have.property('moni-drag-enabled')
      expect(attributes).to.have.property('moni-drag-handle')
      expect(attributes).to.have.property('moni-nestable')
      expect(attributes).to.have.property('moni-drag-type')

      // Drag constraints attributes
      expect(attributes).to.have.property('moni-drop-targets')
      expect(attributes).to.have.property('moni-max-nest-level')
      expect(attributes).to.have.property('moni-can-nest-in')

      testEditor.destroy()
    })

    it('should have correct default values for basic nodes', () => {
      const doc = editor.state.doc
      let paragraphNode: any = null

      doc.descendants(node => {
        if (node.type.name === 'paragraph' && node.attrs['moni-block-id'] === 'block-1') {
          paragraphNode = node
          return false
        }
        return true
      })

      expect(paragraphNode).to.not.be.null
      expect(paragraphNode.attrs['moni-drag-enabled']).to.be.true
      expect(paragraphNode.attrs['moni-drag-handle']).to.be.true
      expect(paragraphNode.attrs['moni-nestable']).to.be.false
      expect(paragraphNode.attrs['moni-drag-type']).to.equal('block')
      expect(paragraphNode.attrs['moni-level']).to.equal(0)
    })

    it('should have correct list item specific configurations', () => {
      const doc = editor.state.doc
      let listItemNode: any = null

      doc.descendants(node => {
        if (node.type.name === 'listItem' && node.attrs['moni-block-id'] === 'block-3') {
          listItemNode = node
          return false
        }
        return true
      })

      expect(listItemNode).to.not.be.null
      expect(listItemNode.attrs['moni-drag-type']).to.equal('list-item')
      expect(listItemNode.attrs['moni-nestable']).to.be.true
      expect(listItemNode.attrs['moni-can-nest-in']).to.deep.equal(['bulletList', 'orderedList', 'listItem'])
      expect(listItemNode.attrs['moni-drop-targets']).to.deep.equal(['listItem', 'bulletList', 'orderedList'])
      expect(listItemNode.attrs['moni-max-nest-level']).to.equal(6)
    })
  })

  describe('DragHandleManager', () => {
    let dragHandleManager: DragHandleManager
    let handleElement: HTMLElement

    beforeEach(() => {
      handleElement = document.createElement('div')
      handleElement.className = 'test-drag-handle'
      handleElement.style.width = '24px'
      handleElement.style.height = '24px'

      dragHandleManager = new DragHandleManager(editor, {
        element: handleElement,
        position: { side: 'left', offset: 8 },
      })
    })

    afterEach(() => {
      dragHandleManager.destroy()
    })

    it('should initialize drag handle correctly', () => {
      expect(handleElement.draggable).to.be.true
      expect(handleElement.style.position).to.equal('absolute')
      expect(handleElement.style.zIndex).to.equal('1000')
      expect(handleElement.style.visibility).to.equal('hidden')
    })

    it('should show handle on mouse move over block', () => {
      const blockElement = editor.view.dom.querySelector('[moni-block-id="block-1"]') as HTMLElement
      expect(blockElement).to.not.be.null

      // Simulate mouse move event
      const mouseEvent = new MouseEvent('mousemove', {
        bubbles: true,
        clientX: 100,
        clientY: 100,
      })

      Object.defineProperty(mouseEvent, 'target', {
        value: blockElement,
        writable: false,
      })

      editor.view.dom.dispatchEvent(mouseEvent)

      // Handle should be visible now (this would be tested in a more complete integration)
      expect(handleElement.style.visibility).to.equal('visible')
    })

    it('should hide handle on mouse leave', () => {
      const mouseLeaveEvent = new MouseEvent('mouseleave', {
        bubbles: true,
      })

      editor.view.dom.dispatchEvent(mouseLeaveEvent)
      expect(handleElement.style.visibility).to.equal('hidden')
    })

    it('should find nodes by block ID correctly', () => {
      const nodeData = dragHandleManager.findNodeByBlockId('block-1')
      expect(nodeData).to.not.be.null
      expect(nodeData.type.name).to.equal('paragraph')
    })
  })

  describe('DragIndicatorManager', () => {
    let dragIndicatorManager: DragIndicatorManager

    beforeEach(() => {
      dragIndicatorManager = new DragIndicatorManager(editor)
    })

    afterEach(() => {
      dragIndicatorManager.destroy()
    })

    it('should create horizontal and vertical indicators', () => {
      const horizontalIndicator = dragIndicatorManager.horizontalIndicator
      const verticalIndicator = dragIndicatorManager.verticalIndicator

      expect(horizontalIndicator).to.not.be.null
      expect(verticalIndicator).to.not.be.null
      expect(horizontalIndicator!.className).to.equal('moni-drag-indicator-horizontal')
      expect(verticalIndicator!.className).to.equal('moni-drag-indicator-vertical')
    })

    it('should show position indicator correctly', () => {
      const dropTarget = {
        blockId: 'block-1',
        position: 'below' as const,
      }

      dragIndicatorManager.showIndicator(dropTarget)

      const horizontalIndicator = dragIndicatorManager.horizontalIndicator
      expect(horizontalIndicator!.style.visibility).to.equal('visible')
    })

    it('should show nesting indicator for inside drops', () => {
      const dropTarget = {
        blockId: 'block-2',
        position: 'inside' as const,
      }

      dragIndicatorManager.showIndicator(dropTarget)

      const horizontalIndicator = dragIndicatorManager.horizontalIndicator
      const verticalIndicator = dragIndicatorManager.verticalIndicator

      expect(horizontalIndicator!.style.visibility).to.equal('visible')
      expect(verticalIndicator!.style.visibility).to.equal('visible')
    })

    it('should hide all indicators', () => {
      dragIndicatorManager.hideAll()

      const horizontalIndicator = dragIndicatorManager.horizontalIndicator
      const verticalIndicator = dragIndicatorManager.verticalIndicator

      expect(horizontalIndicator!.style.visibility).to.equal('hidden')
      expect(verticalIndicator!.style.visibility).to.equal('hidden')
    })
  })

  describe('DragOperationManager', () => {
    let dragOperationManager: DragOperationManager

    beforeEach(() => {
      dragOperationManager = new DragOperationManager(editor, { debug: true })
    })

    afterEach(() => {
      dragOperationManager.destroy()
    })

    it('should validate drop operations correctly', () => {
      const validDragData = {
        blockId: 'block-1',
        dragType: 'block',
        level: 0,
        parentId: null,
      }

      const validDropTarget = {
        blockId: 'block-5',
        position: 'above' as const,
      }

      const isValid = dragOperationManager.validateDrop(validDragData, validDropTarget)
      expect(isValid).to.be.true
    })

    it('should reject self-drops', () => {
      const dragData = {
        blockId: 'block-1',
        dragType: 'block',
        level: 0,
        parentId: null,
      }

      const dropTarget = {
        blockId: 'block-1',
        position: 'below' as const,
      }

      const isValid = dragOperationManager.validateDrop(dragData, dropTarget)
      expect(isValid).to.be.false
    })

    it('should find node data correctly', () => {
      const nodeData = dragOperationManager.findNodeData('block-1')
      expect(nodeData).to.not.be.null
      expect(nodeData!.node.type.name).to.equal('paragraph')
      expect(nodeData!.pos).to.be.a('number')
    })

    it('should calculate new positions correctly', () => {
      const sourceData = dragOperationManager.findNodeData('block-1')!
      const targetData = dragOperationManager.findNodeData('block-5')!

      const dropTarget = {
        blockId: 'block-5',
        position: 'above' as const,
      }

      const result = dragOperationManager.calculateNewPosition(sourceData, targetData, dropTarget)

      expect(result.newPos).to.be.a('number')
      expect(result.newLevel).to.equal(0)
      expect(result.newParentId).to.be.null
    })
  })

  describe('MoniDragPlugin Integration', () => {
    let moniDragPlugin: MoniDragPlugin

    beforeEach(() => {
      moniDragPlugin = new MoniDragPlugin(editor, {
        debug: true,
        enableIndicators: true,
      })

      // Register the plugin with the editor
      editor.registerPlugin(moniDragPlugin.getPlugin())
    })

    afterEach(() => {
      moniDragPlugin.destroy()
    })

    it('should create default drag handle', () => {
      const handleElement = moniDragPlugin.createDragHandle()
      expect(handleElement).to.not.be.null
      expect(handleElement.className).to.equal('moni-drag-handle')
      expect(handleElement.draggable).to.be.true
    })

    it('should initialize all managers', () => {
      expect(moniDragPlugin.dragHandleManager).to.not.be.null
      expect(moniDragPlugin.dragIndicatorManager).to.not.be.null
      expect(moniDragPlugin.dragOperationManager).to.not.be.null
    })

    it('should handle drag start correctly', () => {
      const mockNode = {
        attrs: {
          'moni-drag-type': 'block',
          'moni-level': 0,
          'moni-parent-id': null,
        },
      }

      moniDragPlugin.handleDragStart('block-1', mockNode)

      // Check if drag state was set in plugin state
      const pluginState = moniDragPlugin.getPlugin().getState(editor.state)
      expect(pluginState?.isDragging).to.be.true
      expect(pluginState?.dragData?.blockId).to.equal('block-1')
    })

    it('should handle drag end correctly', () => {
      const mockNode = {
        attrs: {
          'moni-drag-type': 'block',
          'moni-level': 0,
          'moni-parent-id': null,
        },
      }

      moniDragPlugin.handleDragEnd('block-1', mockNode)

      // Check if drag state was cleared
      const pluginState = moniDragPlugin.getPlugin().getState(editor.state)
      expect(pluginState?.isDragging).to.be.false
      expect(pluginState?.dragData).to.be.null
    })

    it('should calculate drop targets correctly', () => {
      const mockDragEvent = {
        clientX: 100,
        clientY: 100,
      } as DragEvent

      // Mock elementFromPoint
      const originalElementFromPoint = document.elementFromPoint
      document.elementFromPoint = () => {
        const element = editor.view.dom.querySelector('[moni-block-id="block-1"]')
        return element
      }

      const dropTarget = moniDragPlugin.calculateDropTarget(mockDragEvent)
      expect(dropTarget).to.not.be.null
      expect(dropTarget!.blockId).to.equal('block-1')

      // Restore original function
      document.elementFromPoint = originalElementFromPoint
    })
  })

  describe('End-to-End Drag Operation', () => {
    it('should perform complete drag and drop operation', () => {
      // Create a complete drag system
      const moniDragPlugin = new MoniDragPlugin(editor, {
        debug: true,
        enableIndicators: true,
      })

      editor.registerPlugin(moniDragPlugin.getPlugin())

      // Get initial document state
      const initialContent = editor.getHTML()

      // Simulate drag data
      const dragData = {
        blockId: 'block-1',
        dragType: 'block',
        level: 0,
        parentId: null,
      }

      const dropTarget = {
        blockId: 'block-5',
        position: 'above' as const,
      }

      // Perform drop operation
      const success = moniDragPlugin.dragOperationManager!.performDrop(dragData, dropTarget)
      expect(success).to.be.true

      // Verify document changed
      const finalContent = editor.getHTML()
      expect(finalContent).to.not.equal(initialContent)

      moniDragPlugin.destroy()
    })
  })
})
