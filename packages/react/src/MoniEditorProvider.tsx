import type { Editor } from '@tiptap/core'
import type { ReactNode } from 'react'
import React, { useMemo } from 'react'

import { EditorContext } from './Context.js'
import type { UseEditorOptions } from './useEditor.js'
import { useEditor } from './useEditor.js'

/**
 * MoniEditorProvider - 只提供 Editor 实例，不自动渲染内容
 *
 * 设计目标：
 * 1. 解决 EditorProvider 强制渲染 EditorContent 导致的布局问题
 * 2. 允许在组件树的上层提供 editor 实例
 * 3. 让 EditorContent 可以在任意位置手动渲染
 * 4. 支持 useCurrentEditor 和 useStreamOperationManager 跨层级访问
 *
 * 与 EditorProvider 的区别：
 * - EditorProvider: 自动渲染 EditorContent，适合简单场景
 * - MoniEditorProvider: 只提供实例，需手动渲染 EditorContent，适合复杂布局
 *
 * 使用示例：
 * ```tsx
 * <MoniEditorProvider extensions={extensions} content={content}>
 *   <TopLevelComponent />  // 可以使用 useCurrentEditor()
 *
 *   <SomewhereDeep>
 *     <EditorContentRenderer />  // 手动渲染 EditorContent
 *   </SomewhereDeep>
 * </MoniEditorProvider>
 *
 * // EditorContentRenderer 组件
 * function EditorContentRenderer() {
 *   const { editor } = useCurrentEditor();
 *   return <EditorContent editor={editor} />;
 * }
 * ```
 */

export type MoniEditorProviderProps = {
  children?: ReactNode
} & UseEditorOptions

/**
 * MoniEditorProvider - 提供 Editor 实例但不自动渲染内容的 Provider
 *
 * 核心特性：
 * 1. 创建并提供 Editor 实例给子组件树
 * 2. 不自动渲染 EditorContent，由用户控制渲染位置
 * 3. 支持所有标准的 useEditor 选项
 * 4. 完全兼容 useCurrentEditor 和 useStreamOperationManager
 */
export function MoniEditorProvider({ children, ...editorOptions }: MoniEditorProviderProps) {
  const editor = useEditor(editorOptions)
  const contextValue = useMemo(() => ({ editor }), [editor])

  // 如果 editor 还未初始化，返回 null（与 EditorProvider 保持一致）
  if (!editor) {
    return null
  }

  return <EditorContext.Provider value={contextValue}>{children}</EditorContext.Provider>
}

/**
 * 类型导出 - 方便外部使用
 */
export type { Editor } from '@tiptap/core'
export type MoniEditorContextValue = {
  editor: Editor | null
}
