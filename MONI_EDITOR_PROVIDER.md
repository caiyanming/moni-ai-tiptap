# MoniEditorProvider

## 🎯 Overview

`MoniEditorProvider` is a new React component that solves architectural challenges when you need to:

1. **Provide editor instance at the top level** for components like `useStreamOperationManager`
2. **Control EditorContent rendering position** manually instead of automatic rendering
3. **Support complex layouts** where editor context and content rendering happen at different levels

## 🚀 Key Features

- ✅ **Instance-only Provider**: Creates and provides editor instance without auto-rendering content
- ✅ **Manual Content Control**: You decide where to render `EditorContent`
- ✅ **Cross-level Access**: Support `useCurrentEditor()` and `useStreamOperationManager()` at any nesting level
- ✅ **Full Compatibility**: Works with all existing TipTap hooks and components
- ✅ **Backward Compatible**: Doesn't affect existing `EditorProvider` usage

## 📖 Usage

### Basic Example

```tsx
import { MoniEditorProvider, EditorContent, useCurrentEditor } from '@tiptap/react'
import { Document, Paragraph, Text } from '@tiptap/extension-*'

// Component that uses editor instance at top level
function TopLevelInfo() {
  const { editor } = useCurrentEditor()
  return <div>Editor ready: {editor ? '✅' : '❌'}</div>
}

// Component that manually renders content
function ManualEditorContent() {
  const { editor } = useCurrentEditor()
  return editor ? <EditorContent editor={editor} /> : null
}

// Main App
function App() {
  const extensions = [Document, Paragraph, Text]
  const content = { type: 'doc', content: [] }

  return (
    <MoniEditorProvider extensions={extensions} content={content}>
      {/* Top level can access editor */}
      <TopLevelInfo />

      <div className="complex-layout">
        <div className="sidebar">
          {/* Deeply nested components can still access editor */}
          <SomeNestedComponent />
        </div>

        <div className="main-content">
          {/* Manually render editor content where needed */}
          <ManualEditorContent />
        </div>
      </div>
    </MoniEditorProvider>
  )
}
```

### Advanced: Solving DocumentContainer Problem

```tsx
// Problem: useStreamOperationManager needs editor at DocumentContainer level
// But EditorContent needs to render inside DocumentEditor

;<MoniEditorProvider extensions={extensions} content={content}>
  <DocumentContainer>
    {' '}
    {/* Can use useStreamOperationManager here */}
    <DocumentChat /> {/* Can access editor for AI features */}
  </DocumentContainer>

  <PanelGroup>
    <DocumentEditor>
      <MoniEditor>
        <MoniEditorContent>
          {/* Manual render EditorContent at correct position */}
          <EditorContentRenderer />
        </MoniEditorContent>
      </MoniEditor>
    </DocumentEditor>
  </PanelGroup>
</MoniEditorProvider>

function EditorContentRenderer() {
  const { editor } = useCurrentEditor()
  return <EditorContent editor={editor} />
}
```

## 🔧 API Reference

### MoniEditorProvider Props

Accepts all `useEditor` options plus:

```tsx
interface MoniEditorProviderProps {
  children?: ReactNode
  // All UseEditorOptions
  extensions: Extension[]
  content?: Content
  editable?: boolean
  onCreate?: (props: { editor: Editor }) => void
  onUpdate?: (props: { editor: Editor }) => void
  // ... all other useEditor options
}
```

### Comparison with EditorProvider

| Feature                 | EditorProvider          | MoniEditorProvider      |
| ----------------------- | ----------------------- | ----------------------- |
| **Editor Instance**     | ✅ Creates and provides | ✅ Creates and provides |
| **Auto Render Content** | ✅ Automatic            | ❌ Manual control       |
| **useCurrentEditor**    | ✅ Supported            | ✅ Supported            |
| **Complex Layouts**     | ❌ Limited              | ✅ Full control         |
| **Content Position**    | 🔒 Fixed                | 🎯 Flexible             |

## 🧪 Testing

The component includes comprehensive tests:

```bash
# Run unit tests
npm run test:unit tests/unit/components/react/moni-editor-provider.test.tsx

# Run demo
npm run dev
# Visit: /src/Extensions/MoniEditor/MoniEditorProvider/React/
```

## 🎮 Demo

Interactive demo available at:
`/demos/src/Extensions/MoniEditor/MoniEditorProvider/React/`

Features demonstrated:

- ✅ Top-level editor info access
- ✅ Manual content rendering control
- ✅ Cross-level editor instance sharing
- ✅ Complex nested component access
- ✅ Editor commands from any level

## 🔄 Migration Guide

### From EditorProvider to MoniEditorProvider

**Before:**

```tsx
<EditorProvider extensions={extensions} content={content}>
  <MyComponent /> {/* EditorContent auto-rendered here */}
</EditorProvider>
```

**After:**

```tsx
;<MoniEditorProvider extensions={extensions} content={content}>
  <MyComponent />
  {/* Manual render where needed */}
  <EditorContentRenderer />
</MoniEditorProvider>

function EditorContentRenderer() {
  const { editor } = useCurrentEditor()
  return <EditorContent editor={editor} />
}
```

## 🎯 Use Cases

Perfect for:

1. **Complex Dashboard Layouts**: Editor context at top, content in panels
2. **AI Integration**: Stream operation managers need top-level access
3. **Multi-Panel Apps**: Sidebar controls, main content area
4. **Collaborative Features**: Multiple components need editor access
5. **Portal-based Modals**: Content rendering in React portals

## 🤝 Backward Compatibility

- ✅ Doesn't affect existing `EditorProvider` usage
- ✅ All existing hooks work unchanged
- ✅ Can be used alongside `EditorProvider` in same app
- ✅ Same API as `useEditor` for options

## 📝 Notes

- Editor instance creation follows same lifecycle as `useEditor`
- All editor options and callbacks supported
- Context value structure identical to `EditorProvider`
- Memory management handled automatically

---

**Version**: 3.0.0-beta.22+
**Added in**: MoniAI TipTap Fork
**Compatibility**: React 16.8+
