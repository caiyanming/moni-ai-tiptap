import './styles.scss'

import DragHandle from '@tiptap/extension-drag-handle'
import HiddenBlock from '@tiptap/extension-hidden-block'
import { UniqueID } from '@tiptap/extension-unique-id'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import React, { useState, useCallback, useRef } from 'react'

import MoniEditor from './MoniEditor'
import DebugPanel from './DebugPanel'
import StreamSimulator from './StreamSimulator'

const initialContent = `
<h1 data-type="heading" data-level="1" data-moni-block-id="block-header-1">MoniAI TipTap Editor Demo</h1>
<p data-type="paragraph" data-moni-block-id="block-intro-1">This demo showcases the MoniAI TipTap editor with custom extensions:</p>
<ul data-type="bulletList" data-moni-block-id="block-list-1">
  <li data-type="listItem"><p data-moni-block-id="block-item-1">🎯 <strong>DragHandle Extension</strong> - Notion-style drag handles with visual indicators</p></li>
  <li data-type="listItem"><p data-moni-block-id="block-item-2">👁️ <strong>HiddenBlock Extension</strong> - Invisible blocks for AI targeting</p></li>
  <li data-type="listItem"><p data-moni-block-id="block-item-3">🔄 <strong>StreamOperationManager</strong> - AI-driven block operations with user confirmation</p></li>
</ul>
<p data-type="paragraph" data-moni-block-id="block-demo-1">Try dragging the blocks around using the drag handles that appear on hover. You can also simulate AI operations using the controls below.</p>
<blockquote data-type="blockquote" data-moni-block-id="block-quote-1">
  <p data-moni-block-id="block-quote-text-1">💡 <strong>Tip:</strong> Hover over any block to see the drag handle appear. Click the + button to add new blocks!</p>
</blockquote>
<p data-type="paragraph" data-moni-block-id="block-final-1">This paragraph demonstrates the interactive editing capabilities.</p>
`

export default () => {
  const [debugMode, setDebugMode] = useState(false)
  const [streamOperations, setStreamOperations] = useState([])
  const [isSimulating, setIsSimulating] = useState(false)
  const editorRef = useRef(null)

  const handleAddBlock = useCallback((options) => {
    console.log('🎯 [DragHandle] Add block:', options)
    
    // Create a new paragraph block with auto-generated ID
    const blockId = `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newContent = `<p data-type="paragraph" data-moni-block-id="${blockId}">New paragraph added via drag handle +</p>`
    
    if (options.position !== undefined) {
      editor?.chain().focus().insertContentAt(options.position, newContent).run()
    } else {
      editor?.chain().focus().insertContent(newContent).run()
    }
  }, [])

  const handleDragStart = useCallback((event, editor) => {
    console.log('🚀 [DragHandle] Drag started')
    event.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDrop = useCallback((event, dropInfo, editor) => {
    console.log('📥 [DragHandle] Drop completed:', dropInfo)
  }, [])

  const handleStreamOperation = useCallback((operation) => {
    console.log('🔄 [StreamOperationManager] New operation:', operation)
    setStreamOperations(prev => [...prev, { ...operation, id: Date.now() }])
  }, [])

  const executeOperation = useCallback((operation, editorInstance) => {
    if (!editorInstance || !editorInstance.view) return
    
    switch (operation.type) {
      case 'insert':
        editorInstance.chain().focus().insertContentAt(operation.position || editorInstance.state.selection.from, operation.content).run()
        break
      case 'update':
        if (operation.targetId) {
          // Find and update the target block
          const targetElement = document.querySelector(`[data-moni-block-id="${operation.targetId}"]`)
          if (targetElement) {
            const pos = editorInstance.view.posAtDOM(targetElement, 0)
            editorInstance.chain().focus().setTextSelection(pos).insertContent(operation.content).run()
          }
        }
        break
      case 'delete':
        if (operation.targetId) {
          const targetElement = document.querySelector(`[data-moni-block-id="${operation.targetId}"]`)
          if (targetElement) {
            const pos = editorInstance.view.posAtDOM(targetElement, 0)
            editorInstance.chain().focus().setTextSelection(pos).deleteNode(operation.nodeType || 'paragraph').run()
          }
        }
        break
    }
  }, [])
  
  const handleApproveOperation = useCallback((operationId) => {
    const operation = streamOperations.find(op => op.id === operationId)
    if (operation) {
      executeOperation(operation, editorRef.current)
    }
    
    // Remove the operation from pending
    setStreamOperations(prev => prev.filter(op => op.id !== operationId))
  }, [streamOperations, executeOperation])

  const handleRejectOperation = useCallback((operationId) => {
    setStreamOperations(prev => prev.filter(op => op.id !== operationId))
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Configure default extensions
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: true,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: true,
        },
      }),
      
      // Add UniqueID extension for block IDs
      UniqueID.configure({
        attributeName: 'moniBlockId',  // This maps to data-moni-block-id
        types: ['paragraph', 'heading', 'bulletList', 'orderedList', 'blockquote', 'codeBlock'],
        generateID: () => `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      }),
      
      DragHandle.configure({
        showIndicators: true,
        onAddBlock: handleAddBlock,
        onDragStart: handleDragStart,
        onDrop: handleDrop,
        indicatorStyles: {
          horizontal: {
            backgroundColor: '#0066cc',
            height: '2px',
            borderRadius: '1px',
            opacity: '0.8',
          },
          vertical: {
            backgroundColor: '#0066cc',
            width: '2px',
            borderRadius: '1px',
            opacity: '0.8',
          },
        },
      }),
      
      HiddenBlock.configure({
        hideFromDOM: true,
        HTMLAttributes: {
          class: 'moni-hidden-block',
        },
      }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'moni-editor-content prose prose-lg max-w-none focus:outline-none',
        'data-testid': 'moni-editor',
      },
    },
  })

  // Set editor ref when editor is ready
  React.useEffect(() => {
    if (editor) {
      editorRef.current = editor
    }
  }, [editor])

  const toggleDebugMode = useCallback(() => {
    setDebugMode(prev => !prev)
  }, [])

  const clearOperations = useCallback(() => {
    setStreamOperations([])
  }, [])

  const approveAllOperations = useCallback(() => {
    streamOperations.forEach(op => handleApproveOperation(op.id))
  }, [streamOperations, handleApproveOperation])

  const rejectAllOperations = useCallback(() => {
    setStreamOperations([])
  }, [])

  return (
    <div className="moni-editor-demo min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            MoniAI TipTap Editor Demo
          </h1>
          <p className="text-gray-600">
            Demonstrating DragHandle, HiddenBlock, and StreamOperationManager extensions
          </p>
        </div>

        {/* Controls */}
        <div className="mb-6 flex flex-wrap gap-4">
          <button
            onClick={toggleDebugMode}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              debugMode 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {debugMode ? 'Hide Debug' : 'Show Debug'}
          </button>

          {streamOperations.length > 0 && (
            <>
              <button
                onClick={approveAllOperations}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                Approve All ({streamOperations.length})
              </button>
              <button
                onClick={rejectAllOperations}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Reject All
              </button>
              <button
                onClick={clearOperations}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                Clear
              </button>
            </>
          )}
        </div>

        {/* Stream Operations Status */}
        {streamOperations.length > 0 && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-medium text-yellow-800 mb-2">
              🔄 Pending AI Operations ({streamOperations.length})
            </h3>
            <div className="space-y-2">
              {streamOperations.map(op => (
                <div key={op.id} className="flex items-center justify-between bg-white p-3 rounded border">
                  <div className="flex-1">
                    <span className="font-medium text-sm">{op.type.toUpperCase()}</span>
                    {op.description && (
                      <span className="ml-2 text-gray-600 text-sm">{op.description}</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveOperation(op.id)}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 transition-colors"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleRejectOperation(op.id)}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition-colors"
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Editor */}
          <div className="lg:col-span-3">
            <MoniEditor 
              editor={editor}
              onStreamOperation={handleStreamOperation}
              isSimulating={isSimulating}
            />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Stream Simulator */}
            <StreamSimulator
              editor={editor}
              onStreamOperation={handleStreamOperation}
              isSimulating={isSimulating}
              setIsSimulating={setIsSimulating}
            />

            {/* Debug Panel */}
            {debugMode && (
              <DebugPanel 
                editor={editor}
                streamOperations={streamOperations}
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200 text-center text-gray-500">
          <p>
            <strong>MoniAI TipTap Editor Demo</strong> - Testing custom extensions and upstream fixes
          </p>
          <p className="text-sm mt-2">
            Built with TipTap v3.0.0-beta.22 (MoniAI Fork) + React 18 + Tailwind CSS
          </p>
        </div>
      </div>
    </div>
  )
}