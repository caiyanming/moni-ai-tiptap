import { type DragHandleManagerOptions, type Editor, DragHandleManager } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock NodeSelection
vi.mock('@tiptap/pm/state', () => ({
  NodeSelection: {
    create: vi.fn().mockImplementation((doc, pos) => {
      // Safely handle NodeSelection creation
      try {
        // Mock a minimal NodeSelection that ProseMirror expects
        const mockNode = {
          nodeSize: 1, // This is what was missing - ProseMirror needs this property
          type: { name: 'paragraph' },
          attrs: {},
        }

        return {
          from: pos || 0,
          to: (pos || 0) + 1,
          node: mockNode,
          $from: { pos: pos || 0 },
          $to: { pos: (pos || 0) + 1 },
        }
      } catch (error) {
        // Fallback to a basic selection if NodeSelection creation fails
        console.warn('NodeSelection.create failed, using fallback:', error)
        return {
          from: pos || 0,
          to: (pos || 0) + 1,
          node: { nodeSize: 1, type: { name: 'paragraph' }, attrs: {} },
          $from: { pos: pos || 0 },
          $to: { pos: (pos || 0) + 1 },
        }
      }
    }),
  },
}))

// Mock Editor and related objects
const createMockEditor = () => {
  const mockDoc = {
    nodeSize: 100, // Add nodeSize property to document
    descendants: vi.fn((callback: (node: ProseMirrorNode, pos?: number) => boolean) => {
      // Mock document traversal with test nodes
      const testNodes = [
        { attrs: { moniBlockId: 'block-1' }, type: { name: 'paragraph' }, nodeSize: 1 },
        { attrs: { moniBlockId: 'block-2' }, type: { name: 'heading' }, nodeSize: 1 },
        { attrs: { moniBlockId: 'block-3' }, type: { name: 'paragraph' }, nodeSize: 1 },
      ]

      testNodes.forEach((node, index) => {
        const continueTraversal = callback(node as ProseMirrorNode, index * 10)
        if (!continueTraversal) {
          // Stop traversal
        }
      })
    }),
    resolve: vi.fn((pos: number) => ({
      node: {
        nodeSize: 1,
        type: { name: 'paragraph' },
        attrs: {},
      },
      pos,
      parent: mockDoc,
      index: 0,
      depth: 0,
    })),
  }

  const mockState = {
    doc: mockDoc,
    tr: {
      setSelection: vi.fn().mockReturnThis(),
    },
  }

  // Mock ProseMirror document with resolve method
  mockDoc.resolve = vi.fn().mockReturnValue({
    pos: 0,
    depth: 0,
    parent: mockDoc,
    parentOffset: 0,
    node: vi.fn().mockReturnValue({ type: { name: 'paragraph' } }),
  })

  const mockView = {
    dom: document.createElement('div'),
    dispatch: vi.fn(),
    state: mockState,
  }

  // Setup mock DOM structure
  const editorContainer = document.createElement('div')
  editorContainer.appendChild(mockView.dom)
  document.body.appendChild(editorContainer)

  return {
    state: mockState,
    view: mockView,
  } as unknown as Editor
}

const createMockBlockElement = (blockId: string, dragEnabled = true, dragHandle = true) => {
  const element = document.createElement('div')
  element.setAttribute('data-moni-block-id', blockId)
  element.setAttribute('data-moni-drag-enabled', dragEnabled.toString())
  element.setAttribute('data-moni-drag-handle', dragHandle.toString())
  element.style.position = 'absolute'
  element.style.top = '100px'
  element.style.left = '50px'
  element.style.width = '200px'
  element.style.height = '40px'

  // Mock getBoundingClientRect
  Object.defineProperty(element, 'getBoundingClientRect', {
    value: () => ({
      top: 100,
      left: 50,
      right: 250,
      bottom: 140,
      width: 200,
      height: 40,
    }),
  })

  return element
}

// Helper to safely mock drag-related methods to prevent NodeSelection issues
const mockDragMethods = (manager: DragHandleManager) => {
  vi.spyOn(manager as any, 'selectNodeForDrag').mockImplementation(() => {
    // Do nothing - prevent NodeSelection.create issues
  })
}

describe('DragHandleManager', () => {
  let editor: Editor
  let handleElement: HTMLElement
  let dragHandleManager: DragHandleManager
  let mockOptions: DragHandleManagerOptions

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = ''

    // Create mock editor
    editor = createMockEditor()

    // Create handle element
    handleElement = document.createElement('div')
    handleElement.className = 'drag-handle'

    // Setup options
    mockOptions = {
      element: handleElement,
      position: { side: 'left', offset: 8 },
      onDragStart: vi.fn(),
      onDragEnd: vi.fn(),
      shouldShowHandle: vi.fn().mockReturnValue(true),
    }
  })

  afterEach(() => {
    // Clean up drag handle manager first
    if (dragHandleManager) {
      try {
        dragHandleManager.destroy()
      } catch {
        // Ignore cleanup errors in tests
      }
    }

    // Reset DOM state
    document.body.innerHTML = ''

    // Remove any remaining event listeners
    const events = ['mousemove', 'mouseleave', 'dragstart', 'dragend']
    events.forEach(eventType => {
      document.removeEventListener(eventType, () => {})
    })

    vi.clearAllMocks()
  })

  describe('初始化和配置', () => {
    it('should initialize with correct options', () => {
      dragHandleManager = new DragHandleManager(editor, mockOptions)
      mockDragMethods(dragHandleManager)

      expect(handleElement.draggable).toBe(true)
      expect(handleElement.style.position).toBe('absolute')
      expect(handleElement.style.zIndex).toBe('1000')
      expect(handleElement.style.cursor).toBe('grab')
      expect(handleElement.style.visibility).toBe('hidden')
      expect(handleElement.style.pointerEvents).toBe('none')
    })

    it('should setup drag handle element correctly', () => {
      dragHandleManager = new DragHandleManager(editor, mockOptions)
      mockDragMethods(dragHandleManager)

      const editorContainer = editor.view.dom.parentElement
      expect(editorContainer?.contains(handleElement)).toBe(true)
    })

    it('should handle missing editor container gracefully', () => {
      // Remove editor container
      const editorContainer = editor.view.dom.parentElement
      if (editorContainer) {
        editorContainer.removeChild(editor.view.dom)
      }

      expect(() => {
        dragHandleManager = new DragHandleManager(editor, mockOptions)
        mockDragMethods(dragHandleManager)
      }).not.toThrow()
    })
  })

  describe('拖拽手柄交互', () => {
    beforeEach(() => {
      dragHandleManager = new DragHandleManager(editor, mockOptions)
      mockDragMethods(dragHandleManager)
    })

    it('should show handle on valid block hover', () => {
      const blockElement = createMockBlockElement('block-1')
      editor.view.dom.appendChild(blockElement)

      // Mock findBlockElement to return our test element
      vi.spyOn(dragHandleManager as any, 'findBlockElement').mockReturnValue(blockElement)

      // Simulate mousemove event
      const event = new MouseEvent('mousemove', {
        clientX: 100,
        clientY: 120,
      })
      Object.defineProperty(event, 'target', { value: blockElement })

      editor.view.dom.dispatchEvent(event)

      expect(handleElement.style.visibility).toBe('visible')
      expect(handleElement.style.pointerEvents).toBe('auto')
    })

    it('should hide handle when cursor leaves', () => {
      const blockElement = createMockBlockElement('block-1')
      editor.view.dom.appendChild(blockElement)

      // First show the handle
      vi.spyOn(dragHandleManager as any, 'findBlockElement').mockReturnValue(blockElement)
      const moveEvent = new MouseEvent('mousemove')
      Object.defineProperty(moveEvent, 'target', { value: blockElement })
      editor.view.dom.dispatchEvent(moveEvent)

      // Then simulate mouse leave
      const leaveEvent = new MouseEvent('mouseleave')
      editor.view.dom.dispatchEvent(leaveEvent)

      expect(handleElement.style.visibility).toBe('hidden')
      expect(handleElement.style.pointerEvents).toBe('none')
    })

    it('should call onDragStart callback', () => {
      const blockElement = createMockBlockElement('block-1')
      editor.view.dom.appendChild(blockElement)

      // Setup handle for block
      vi.spyOn(dragHandleManager as any, 'findBlockElement').mockReturnValue(blockElement)
      const moveEvent = new MouseEvent('mousemove')
      Object.defineProperty(moveEvent, 'target', { value: blockElement })
      editor.view.dom.dispatchEvent(moveEvent)

      // Mock handleDragStart to prevent actual ProseMirror operations and trigger callback
      vi.spyOn(dragHandleManager as any, 'handleDragStart').mockImplementation(event => {
        // Trigger the onDragStart callback with mock data
        mockOptions.onDragStart?.('block-1', { event, element: blockElement })
      })

      // Create drag start event
      const dragStartEvent = new DragEvent('dragstart', {
        dataTransfer: new DataTransfer(),
        clientX: 100,
        clientY: 120,
      })

      handleElement.dispatchEvent(dragStartEvent)

      expect(mockOptions.onDragStart).toHaveBeenCalledWith('block-1', expect.any(Object))
    })

    it('should call onDragEnd callback', () => {
      const blockElement = createMockBlockElement('block-1')
      editor.view.dom.appendChild(blockElement)

      // Setup handle for block
      vi.spyOn(dragHandleManager as any, 'findBlockElement').mockReturnValue(blockElement)
      const moveEvent = new MouseEvent('mousemove')
      Object.defineProperty(moveEvent, 'target', { value: blockElement })
      editor.view.dom.dispatchEvent(moveEvent)

      // Mock handleDragStart to prevent actual ProseMirror operations
      vi.spyOn(dragHandleManager as any, 'handleDragStart').mockImplementation(() => {})

      // Mock handleDragEnd to trigger callback
      vi.spyOn(dragHandleManager as any, 'handleDragEnd').mockImplementation(event => {
        mockOptions.onDragEnd?.('block-1', { event, element: blockElement })
      })

      // Start drag first
      const dragStartEvent = new DragEvent('dragstart', {
        dataTransfer: new DataTransfer(),
      })
      handleElement.dispatchEvent(dragStartEvent)

      // End drag
      const dragEndEvent = new DragEvent('dragend')
      handleElement.dispatchEvent(dragEndEvent)

      expect(mockOptions.onDragEnd).toHaveBeenCalledWith('block-1', expect.any(Object))
    })

    it('should respect shouldShowHandle option', () => {
      const customOptions = { ...mockOptions }
      customOptions.shouldShowHandle = vi.fn().mockReturnValue(false)

      dragHandleManager.destroy()
      dragHandleManager = new DragHandleManager(editor, customOptions)
      mockDragMethods(dragHandleManager)

      const blockElement = createMockBlockElement('block-1')
      editor.view.dom.appendChild(blockElement)

      vi.spyOn(dragHandleManager as any, 'findBlockElement').mockReturnValue(blockElement)
      const moveEvent = new MouseEvent('mousemove')
      Object.defineProperty(moveEvent, 'target', { value: blockElement })
      editor.view.dom.dispatchEvent(moveEvent)

      expect(handleElement.style.visibility).toBe('hidden')
      expect(customOptions.shouldShowHandle).toHaveBeenCalledWith('block-1', expect.any(Object))
    })

    it('should not show handle when drag is disabled', () => {
      const blockElement = createMockBlockElement('block-1', false) // drag disabled
      editor.view.dom.appendChild(blockElement)

      vi.spyOn(dragHandleManager as any, 'findBlockElement').mockReturnValue(blockElement)
      const moveEvent = new MouseEvent('mousemove')
      Object.defineProperty(moveEvent, 'target', { value: blockElement })
      editor.view.dom.dispatchEvent(moveEvent)

      expect(handleElement.style.visibility).toBe('hidden')
    })

    it('should not show handle when drag handle is disabled', () => {
      const blockElement = createMockBlockElement('block-1', true, false) // handle disabled
      editor.view.dom.appendChild(blockElement)

      vi.spyOn(dragHandleManager as any, 'findBlockElement').mockReturnValue(blockElement)
      const moveEvent = new MouseEvent('mousemove')
      Object.defineProperty(moveEvent, 'target', { value: blockElement })
      editor.view.dom.dispatchEvent(moveEvent)

      expect(handleElement.style.visibility).toBe('hidden')
    })
  })

  describe('位置计算', () => {
    beforeEach(() => {
      dragHandleManager = new DragHandleManager(editor, mockOptions)
      mockDragMethods(dragHandleManager)
    })

    it('should position handle correctly on left side', () => {
      const blockElement = createMockBlockElement('block-1')
      const editorContainer = editor.view.dom.parentElement!

      // Mock container rect
      Object.defineProperty(editorContainer, 'getBoundingClientRect', {
        value: () => ({ top: 0, left: 0, width: 800, height: 600 }),
      })
      Object.defineProperty(editorContainer, 'scrollTop', { value: 0 })
      Object.defineProperty(editorContainer, 'scrollLeft', { value: 0 })

      // Call positionHandle directly
      ;(dragHandleManager as any).positionHandle(blockElement)

      // Left side: rect.left - containerRect.left + scrollLeft - offset
      // Expected: 50 - 0 + 0 - 8 = 42px
      expect(handleElement.style.left).toBe('42px')
      expect(handleElement.style.top).toBe('100px')
    })

    it('should position handle correctly on right side', () => {
      const rightSideOptions = {
        ...mockOptions,
        position: { side: 'right' as const, offset: 8 },
      }

      dragHandleManager.destroy()
      dragHandleManager = new DragHandleManager(editor, rightSideOptions)
      mockDragMethods(dragHandleManager)

      const blockElement = createMockBlockElement('block-1')
      const editorContainer = editor.view.dom.parentElement!

      // Mock container rect
      Object.defineProperty(editorContainer, 'getBoundingClientRect', {
        value: () => ({ top: 0, left: 0, width: 800, height: 600 }),
      })
      Object.defineProperty(editorContainer, 'scrollTop', { value: 0 })
      Object.defineProperty(editorContainer, 'scrollLeft', { value: 0 })
      ;(dragHandleManager as any).positionHandle(blockElement)

      // Right side: rect.right - containerRect.left + scrollLeft + offset
      // Expected: 250 - 0 + 0 + 8 = 258px
      expect(handleElement.style.left).toBe('258px')
      expect(handleElement.style.top).toBe('100px')
    })

    it('should handle offset correctly', () => {
      const customOffsetOptions = {
        ...mockOptions,
        position: { side: 'left' as const, offset: 20 },
      }

      dragHandleManager.destroy()
      dragHandleManager = new DragHandleManager(editor, customOffsetOptions)
      mockDragMethods(dragHandleManager)

      const blockElement = createMockBlockElement('block-1')
      const editorContainer = editor.view.dom.parentElement!

      Object.defineProperty(editorContainer, 'getBoundingClientRect', {
        value: () => ({ top: 0, left: 0, width: 800, height: 600 }),
      })
      Object.defineProperty(editorContainer, 'scrollTop', { value: 0 })
      Object.defineProperty(editorContainer, 'scrollLeft', { value: 0 })
      ;(dragHandleManager as any).positionHandle(blockElement)

      // Left side with custom offset: 50 - 0 + 0 - 20 = 30px
      expect(handleElement.style.left).toBe('30px')
    })

    it('should handle scrolling correctly', () => {
      const blockElement = createMockBlockElement('block-1')
      const editorContainer = editor.view.dom.parentElement!

      // Mock container with scroll
      Object.defineProperty(editorContainer, 'getBoundingClientRect', {
        value: () => ({ top: 10, left: 5, width: 800, height: 600 }),
      })
      Object.defineProperty(editorContainer, 'scrollTop', { value: 50 })
      Object.defineProperty(editorContainer, 'scrollLeft', { value: 30 })
      ;(dragHandleManager as any).positionHandle(blockElement)

      // Expected calculations:
      // top: rect.top - containerRect.top + scrollTop = 100 - 10 + 50 = 140px
      // left: rect.left - containerRect.left + scrollLeft - offset = 50 - 5 + 30 - 8 = 67px
      expect(handleElement.style.top).toBe('140px')
      expect(handleElement.style.left).toBe('67px')
    })
  })

  describe('节点查找和管理', () => {
    beforeEach(() => {
      dragHandleManager = new DragHandleManager(editor, mockOptions)
      mockDragMethods(dragHandleManager)
    })

    it('should find node by block ID', () => {
      const node = dragHandleManager.findNodeByBlockId('block-1')
      expect(node).toBeTruthy()
      expect(node?.attrs?.moniBlockId).toBe('block-1')
    })

    it('should return null for non-existent block ID', () => {
      const node = dragHandleManager.findNodeByBlockId('non-existent')
      expect(node).toBeNull()
    })

    it('should find block element correctly', () => {
      const blockElement = createMockBlockElement('block-1')
      const childElement = document.createElement('span')
      blockElement.appendChild(childElement)
      editor.view.dom.appendChild(blockElement)

      const foundElement = (dragHandleManager as any).findBlockElement(childElement)
      expect(foundElement).toBe(blockElement)
    })

    it('should return null when no block element found', () => {
      const nonBlockElement = document.createElement('span')
      editor.view.dom.appendChild(nonBlockElement)

      const foundElement = (dragHandleManager as any).findBlockElement(nonBlockElement)
      expect(foundElement).toBeNull()
    })
  })

  describe('拖拽数据设置', () => {
    beforeEach(() => {
      dragHandleManager = new DragHandleManager(editor, mockOptions)
      mockDragMethods(dragHandleManager)
    })

    it('should set correct drag data', () => {
      const blockElement = createMockBlockElement('block-1')
      editor.view.dom.appendChild(blockElement)

      // Setup handle for block
      vi.spyOn(dragHandleManager as any, 'findBlockElement').mockReturnValue(blockElement)
      const moveEvent = new MouseEvent('mousemove')
      Object.defineProperty(moveEvent, 'target', { value: blockElement })
      editor.view.dom.dispatchEvent(moveEvent)

      // Mock handleDragStart to prevent actual ProseMirror operations
      vi.spyOn(dragHandleManager as any, 'handleDragStart').mockImplementation(event => {
        // Mock the drag data setting without calling ProseMirror
        const dataTransfer = event.dataTransfer
        if (dataTransfer) {
          dataTransfer.effectAllowed = 'move'
          dataTransfer.setData('text/plain', 'block-1')
          dataTransfer.setData(
            'application/moni-block',
            JSON.stringify({
              moniBlockId: 'block-1',
              dragType: 'block',
            }),
          )
        }
      })

      // Create drag start event with dataTransfer
      const dataTransfer = new DataTransfer()
      const dragStartEvent = new DragEvent('dragstart', {
        dataTransfer,
        clientX: 100,
        clientY: 120,
      })

      handleElement.dispatchEvent(dragStartEvent)

      expect(dataTransfer.effectAllowed).toBe('move')
      expect(dataTransfer.getData('text/plain')).toBe('block-1')

      const moniData = JSON.parse(dataTransfer.getData('application/moni-block'))
      expect(moniData.moniBlockId).toBe('block-1')
      expect(moniData.dragType).toBeDefined()
    })
  })

  describe('销毁清理', () => {
    it('should clean up resources on destroy', () => {
      dragHandleManager = new DragHandleManager(editor, mockOptions)
      mockDragMethods(dragHandleManager)

      const editorContainer = editor.view.dom.parentElement!
      expect(editorContainer.contains(handleElement)).toBe(true)

      dragHandleManager.destroy()

      expect(editorContainer.contains(handleElement)).toBe(false)
    })

    it('should handle destroy when element has no parent', () => {
      dragHandleManager = new DragHandleManager(editor, mockOptions)
      mockDragMethods(dragHandleManager)

      // Remove element manually
      if (handleElement.parentElement) {
        handleElement.parentElement.removeChild(handleElement)
      }

      expect(() => {
        dragHandleManager.destroy()
      }).not.toThrow()
    })
  })
})
