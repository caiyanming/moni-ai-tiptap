import { EditorContent } from '@tiptap/react'
import React, { useEffect, useState } from 'react'

const MoniEditor = ({ editor, onStreamOperation, isSimulating }) => {
  const [isEditable, setIsEditable] = useState(true)
  const [wordCount, setWordCount] = useState(0)
  const [characterCount, setCharacterCount] = useState(0)

  useEffect(() => {
    if (!editor) {
      return
    }

    // Update counts when content changes
    const updateCounts = () => {
      const text = editor.getText()
      setWordCount(text.split(/\s+/).filter(word => word.length > 0).length)
      setCharacterCount(text.length)
    }

    // Initial count
    updateCounts()

    // Listen for content updates
    editor.on('update', updateCounts)

    return () => {
      editor.off('update', updateCounts)
    }
  }, [editor])

  const toggleEditable = () => {
    if (editor) {
      const newEditableState = !isEditable
      editor.setEditable(newEditableState)
      setIsEditable(newEditableState)
    }
  }

  const insertHiddenBlock = () => {
    if (editor) {
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'hiddenBlock',
          attrs: {
            id: `hidden-${Date.now()}`,
          },
        })
        .run()

      // Simulate an AI operation targeting the hidden block
      setTimeout(() => {
        onStreamOperation({
          type: 'insert',
          targetId: `hidden-${Date.now()}`,
          content: '<p data-type="paragraph">🎯 This content was inserted via a hidden block target!</p>',
          description: 'AI inserted content targeting hidden block',
        })
      }, 1000)
    }
  }

  const addSampleContent = () => {
    if (editor) {
      const sampleContent = `
<h2 data-type="heading" data-level="2">Sample Content Block</h2>
<p data-type="paragraph">This is a sample paragraph with <strong>bold text</strong> and <em>italic text</em>.</p>
<ul data-type="bulletList">
  <li data-type="listItem"><p>First item in the list</p></li>
  <li data-type="listItem"><p>Second item with <code>inline code</code></p></li>
</ul>
<blockquote data-type="blockquote">
  <p>This is a blockquote that demonstrates the formatting capabilities.</p>
</blockquote>
      `
      editor.chain().focus().insertContent(sampleContent).run()
    }
  }

  const clearContent = () => {
    if (editor) {
      editor.chain().focus().clearContent().run()
    }
  }

  if (!editor) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6 mx-auto"></div>
        </div>
        <p className="text-gray-500 mt-4">Loading editor...</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Editor Toolbar */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={toggleEditable}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isEditable
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              {isEditable ? '✏️ Editable' : '🔒 Read-only'}
            </button>

            <button
              onClick={addSampleContent}
              disabled={!isEditable}
              className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md text-sm font-medium hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ➕ Add Sample
            </button>

            <button
              onClick={insertHiddenBlock}
              disabled={!isEditable}
              className="px-3 py-2 bg-purple-100 text-purple-700 rounded-md text-sm font-medium hover:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              👁️ Insert Hidden Block
            </button>

            <button
              onClick={clearContent}
              disabled={!isEditable}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              🗑️ Clear
            </button>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>Words: {wordCount}</span>
            <span>Characters: {characterCount}</span>
            {isSimulating && (
              <span className="flex items-center gap-1 text-blue-600">
                <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                AI Simulating
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div className="relative">
        <EditorContent editor={editor} className="moni-editor-wrapper" />

        {/* Overlay for visual feedback */}
        {isSimulating && (
          <div className="absolute inset-0 bg-blue-50/30 pointer-events-none rounded-b-lg flex items-center justify-center">
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-blue-200">
              <span className="text-blue-600 font-medium">AI is processing...</span>
            </div>
          </div>
        )}
      </div>

      {/* Usage Instructions */}
      <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-lg">
        <h4 className="font-medium text-gray-800 mb-2">💡 Try these features:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>
            • <strong>Drag Handles:</strong> Hover over any block to see the drag handle appear
          </li>
          <li>
            • <strong>Block Operations:</strong> Click the + button on drag handles to add new blocks
          </li>
          <li>
            • <strong>AI Simulation:</strong> Use the Stream Simulator on the right to test AI operations
          </li>
          <li>
            • <strong>Hidden Blocks:</strong> Insert hidden blocks that serve as AI operation targets
          </li>
          <li>
            • <strong>Debug Mode:</strong> Enable debug mode to see internal editor state
          </li>
        </ul>
      </div>
    </div>
  )
}

export default MoniEditor
