import type { Editor, EditorOptions } from '@tiptap/core'
import { vi } from 'vitest'

/**
 * Creates a mock Editor instance for testing
 */
export const createMockEditor = (options?: Partial<EditorOptions>): Partial<Editor> => {
  return {
    isActive: vi.fn().mockReturnValue(false),
    isEditable: true,
    isEmpty: false,
    isDestroyed: false,
    isFocused: false,

    // Commands
    commands: {
      focus: vi.fn().mockReturnValue(true),
      blur: vi.fn().mockReturnValue(true),
      clearContent: vi.fn().mockReturnValue(true),
      setContent: vi.fn().mockReturnValue(true),
      insertContent: vi.fn().mockReturnValue(true),
      deleteSelection: vi.fn().mockReturnValue(true),
      selectAll: vi.fn().mockReturnValue(true),
      toggleBold: vi.fn().mockReturnValue(true),
      toggleItalic: vi.fn().mockReturnValue(true),
      toggleStrike: vi.fn().mockReturnValue(true),
      toggleCode: vi.fn().mockReturnValue(true),
      toggleMark: vi.fn().mockReturnValue(true),
    },

    // Chain commands
    chain: vi.fn().mockReturnValue({
      focus: vi.fn().mockReturnThis(),
      toggleBold: vi.fn().mockReturnThis(),
      run: vi.fn().mockReturnValue(true),
    }),

    // Can commands
    can: vi.fn().mockReturnValue({
      toggleBold: vi.fn().mockReturnValue(true),
      toggleItalic: vi.fn().mockReturnValue(true),
    }),

    // Content methods
    getHTML: vi.fn().mockReturnValue('<p>Mock content</p>'),
    getJSON: vi.fn().mockReturnValue({ type: 'doc', content: [] }),
    getText: vi.fn().mockReturnValue('Mock content'),

    // State
    state: {
      doc: {
        nodeSize: 10,
        content: { size: 8 },
        descendants: vi.fn(),
        textContent: 'Mock content',
      },
      selection: {
        from: 0,
        to: 0,
        empty: true,
      },
      tr: {
        setNodeMarkup: vi.fn(),
        insert: vi.fn(),
        delete: vi.fn(),
        replaceWith: vi.fn(),
      },
    },

    // View
    view: {
      state: {},
      dispatch: vi.fn(),
      dom: document.createElement('div'),
    },

    // Schema
    schema: {
      nodes: {
        doc: { create: vi.fn() },
        paragraph: { create: vi.fn() },
        text: { create: vi.fn() },
      },
      marks: {
        bold: { create: vi.fn() },
        italic: { create: vi.fn() },
      },
    },

    // Events
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),

    // Lifecycle
    destroy: vi.fn(),

    // Extensions access
    extensionManager: {
      extensions: [],
    },

    // Storage
    storage: {},

    // Options
    options: {
      content: '',
      editable: true,
      autofocus: false,
      ...options,
    },
  }
}

/**
 * Creates a mock ProseMirror schema for testing
 */
export const createMockSchema = () => {
  return {
    nodes: {
      doc: {
        create: vi.fn().mockReturnValue({
          type: { name: 'doc' },
          nodeSize: 2,
          content: null,
        }),
      },
      paragraph: {
        create: vi.fn().mockReturnValue({
          type: { name: 'paragraph' },
          nodeSize: 2,
          content: null,
        }),
      },
      text: {
        create: vi.fn().mockReturnValue({
          type: { name: 'text' },
          nodeSize: 1,
          textContent: 'test',
        }),
      },
    },
    marks: {
      bold: { create: vi.fn() },
      italic: { create: vi.fn() },
    },
    nodeFromJSON: vi.fn().mockImplementation(json => ({
      type: { name: json.type },
      attrs: json.attrs || {},
      content: json.content || [],
      textContent: json.text || '',
      nodeSize: 1,
    })),
  }
}

/**
 * Creates a mock ProseMirror view for testing
 */
export const createMockView = () => {
  return {
    state: {
      doc: {
        descendants: vi.fn(),
        nodeSize: 10,
        content: { size: 8 },
        textContent: 'Mock content',
      },
      selection: {
        from: 0,
        to: 0,
        empty: true,
      },
      tr: {
        setNodeMarkup: vi.fn(),
        insert: vi.fn(),
        delete: vi.fn(),
        replaceWith: vi.fn(),
      },
    },
    dispatch: vi.fn(),
    dom: document.createElement('div'),
    coordsAtPos: vi.fn().mockReturnValue({ left: 0, top: 0 }),
  }
}
