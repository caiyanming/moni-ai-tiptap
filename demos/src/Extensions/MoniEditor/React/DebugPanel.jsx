import React, { useEffect, useState } from 'react'

const DebugPanel = ({ editor, streamOperations }) => {
  const [editorState, setEditorState] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [refreshCount, setRefreshCount] = useState(0)

  useEffect(() => {
    if (!editor) {
      return
    }

    const updateState = () => {
      try {
        const state = editor.state
        const selection = state.selection
        const doc = state.doc

        // Get current selection info
        const selectionInfo = {
          from: selection.from,
          to: selection.to,
          empty: selection.empty,
          type: selection.constructor.name,
        }

        // Get document info
        const docInfo = {
          nodeSize: doc.nodeSize,
          childCount: doc.childCount,
          textContent: doc.textContent.substring(0, 100) + (doc.textContent.length > 100 ? '...' : ''),
        }

        // Get node at cursor
        let nodeAtCursor = null
        if (!selection.empty) {
          try {
            const node = doc.nodeAt(selection.from)
            if (node) {
              nodeAtCursor = {
                type: node.type.name,
                content: node.textContent?.substring(0, 50) + (node.textContent?.length > 50 ? '...' : ''),
                attrs: node.attrs,
                marks:
                  node.marks?.map(mark => ({
                    type: mark.type.name,
                    attrs: mark.attrs,
                  })) || [],
              }
            }
          } catch (e) {
            nodeAtCursor = { error: 'Could not resolve node' }
          }
        }

        // Get all nodes with their positions
        const allNodes = []
        doc.descendants((node, pos) => {
          if (allNodes.length < 20) {
            // Limit to prevent performance issues
            allNodes.push({
              pos,
              type: node.type.name,
              content: node.textContent?.substring(0, 30) + (node.textContent?.length > 30 ? '...' : ''),
              attrs: node.attrs,
              nodeSize: node.nodeSize,
            })
          }
        })

        setEditorState({
          selection: selectionInfo,
          document: docInfo,
          nodeAtCursor,
          allNodes,
          canUndo: editor.can().undo(),
          canRedo: editor.can().redo(),
          isEditable: editor.isEditable,
        })
      } catch (error) {
        console.error('Error updating debug state:', error)
        setEditorState({ error: error.message })
      }
    }

    // Initial state
    updateState()

    // Listen for changes
    editor.on('selectionUpdate', updateState)
    editor.on('update', updateState)

    return () => {
      editor.off('selectionUpdate', updateState)
      editor.off('update', updateState)
    }
  }, [editor, refreshCount])

  const refreshState = () => {
    setRefreshCount(prev => prev + 1)
  }

  const selectNode = nodeInfo => {
    if (editor && nodeInfo.pos >= 0) {
      try {
        editor.chain().focus().setTextSelection(nodeInfo.pos).run()
        setSelectedNode(nodeInfo)
      } catch (error) {
        console.error('Error selecting node:', error)
      }
    }
  }

  const exportJSON = () => {
    if (editor) {
      const json = editor.getJSON()
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'editor-content.json'
      link.click()
      URL.revokeObjectURL(url)
    }
  }

  const exportHTML = () => {
    if (editor) {
      const html = editor.getHTML()
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'editor-content.html'
      link.click()
      URL.revokeObjectURL(url)
    }
  }

  if (!editor) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="font-medium text-gray-800 mb-2">🐛 Debug Panel</h3>
        <p className="text-gray-500 text-sm">Editor not initialized</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-gray-800">🐛 Debug Panel</h3>
          <button
            onClick={refreshState}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
          >
            🔄 Refresh
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={exportJSON}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
          >
            📤 JSON
          </button>
          <button
            onClick={exportHTML}
            className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
          >
            📤 HTML
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
        {/* Stream Operations */}
        {streamOperations.length > 0 && (
          <div>
            <h4 className="font-medium text-sm text-gray-700 mb-2">🔄 Stream Operations</h4>
            <div className="space-y-2">
              {streamOperations.map(op => (
                <div key={op.id} className="bg-yellow-50 p-2 rounded text-xs border border-yellow-200">
                  <div className="font-medium text-yellow-800">{op.type.toUpperCase()}</div>
                  {op.targetId && <div className="text-yellow-700">Target: {op.targetId}</div>}
                  {op.description && <div className="text-yellow-600 mt-1">{op.description}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Editor State */}
        {editorState && !editorState.error && (
          <>
            {/* General Info */}
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-2">📝 Editor State</h4>
              <div className="bg-gray-50 p-2 rounded text-xs space-y-1">
                <div>Editable: {editorState.isEditable ? '✅' : '❌'}</div>
                <div>Can Undo: {editorState.canUndo ? '✅' : '❌'}</div>
                <div>Can Redo: {editorState.canRedo ? '✅' : '❌'}</div>
              </div>
            </div>

            {/* Selection Info */}
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-2">🎯 Selection</h4>
              <div className="bg-gray-50 p-2 rounded text-xs space-y-1">
                <div>From: {editorState.selection.from}</div>
                <div>To: {editorState.selection.to}</div>
                <div>Empty: {editorState.selection.empty ? '✅' : '❌'}</div>
                <div>Type: {editorState.selection.type}</div>
              </div>
            </div>

            {/* Node at Cursor */}
            {editorState.nodeAtCursor && !editorState.nodeAtCursor.error && (
              <div>
                <h4 className="font-medium text-sm text-gray-700 mb-2">📍 Node at Cursor</h4>
                <div className="bg-blue-50 p-2 rounded text-xs space-y-1 border border-blue-200">
                  <div>
                    Type: <span className="font-mono">{editorState.nodeAtCursor.type}</span>
                  </div>
                  {editorState.nodeAtCursor.content && <div>Content: "{editorState.nodeAtCursor.content}"</div>}
                  {Object.keys(editorState.nodeAtCursor.attrs || {}).length > 0 && (
                    <div>
                      Attrs:
                      <pre className="mt-1 bg-white p-1 rounded text-xs overflow-x-auto">
                        {JSON.stringify(editorState.nodeAtCursor.attrs, null, 2)}
                      </pre>
                    </div>
                  )}
                  {editorState.nodeAtCursor.marks?.length > 0 && (
                    <div>Marks: {editorState.nodeAtCursor.marks.map(mark => mark.type).join(', ')}</div>
                  )}
                </div>
              </div>
            )}

            {/* Document Structure */}
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-2">📄 Document</h4>
              <div className="bg-gray-50 p-2 rounded text-xs space-y-1">
                <div>Size: {editorState.document.nodeSize}</div>
                <div>Children: {editorState.document.childCount}</div>
                <div>Text: "{editorState.document.textContent}"</div>
              </div>
            </div>

            {/* All Nodes */}
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-2">🌳 Document Nodes</h4>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {editorState.allNodes.map((node, index) => (
                  <div
                    key={index}
                    onClick={() => selectNode(node)}
                    className={`bg-gray-50 p-2 rounded text-xs cursor-pointer hover:bg-blue-50 transition-colors border ${
                      selectedNode?.pos === node.pos ? 'border-blue-400 bg-blue-50' : 'border-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-mono text-blue-600">{node.type}</span>
                      <span className="text-gray-500">@{node.pos}</span>
                    </div>
                    {node.content && <div className="mt-1 text-gray-600">"{node.content}"</div>}
                    {Object.keys(node.attrs || {}).length > 0 && (
                      <div className="mt-1 text-gray-500 text-xs">
                        {Object.entries(node.attrs).map(([key, value]) => (
                          <span key={key} className="mr-2">
                            {key}: {JSON.stringify(value)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Error State */}
        {editorState?.error && (
          <div className="bg-red-50 p-2 rounded text-xs border border-red-200">
            <div className="font-medium text-red-800">Error:</div>
            <div className="text-red-700">{editorState.error}</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default DebugPanel
