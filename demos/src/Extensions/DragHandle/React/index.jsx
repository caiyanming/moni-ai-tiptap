import './styles.scss'

import { DragHandle } from '@tiptap/extension-drag-handle-react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import React from 'react'

export default () => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      // Note: DragHandle extension is automatically added by the <DragHandle> component
    ],
    content: `
      <h1>
        This is a very unique heading.
      </h1>
      <p>
        This is a unique paragraph. It's so unique, it even has an ID attached to it.
      </p>
      <p>
        And this one, too.
      </p>
    `,
  })

  // 🎯 [TEST FIX] 将编辑器实例暴露给全局，供测试使用
  React.useEffect(() => {
    if (editor) {
      window.__tiptapEditor = editor
      console.log('✅ TipTap编辑器已暴露到全局：window.__tiptapEditor')
    }
  }, [editor])

  const toggleEditable = () => {
    editor.setEditable(!editor.isEditable)
    editor.view.dispatch(editor.view.state.tr)
  }

  return (
    <>
      <div>
        <button onClick={toggleEditable}>Toggle editable</button>
      </div>
      <DragHandle
        editor={editor}
        showIndicators={true}
        onDragStart={() => {
          console.log('🚀 [REACT] 拖拽开始回调触发')
        }}
        onDrop={(event, dropInfo) => {
          console.log('📥 [REACT] 拖拽完成回调触发:', dropInfo)
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          draggable="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
        </svg>
      </DragHandle>
      <EditorContent editor={editor} />
    </>
  )
}
