import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
  },
  resolve: {
    alias: {
      '@tiptap/core': resolve(__dirname, 'packages/core/src'),
      '@tiptap/extension-document': resolve(__dirname, 'packages/extension-document/src'),
      '@tiptap/extension-paragraph': resolve(__dirname, 'packages/extension-paragraph/src'),
      '@tiptap/extension-text': resolve(__dirname, 'packages/extension-text/src'),
      '@tiptap/extension-history': resolve(__dirname, 'packages/extension-history/src'),
      '@tiptap/extension-file-children-block': resolve(__dirname, 'packages/extension-file-children-block/src'),
      '@tiptap/extension-unique-id': resolve(__dirname, 'packages/extension-unique-id/src'),
      '@tiptap/extension-drag-handle': resolve(__dirname, 'packages/extension-drag-handle/src'),
      '@tiptap/extension-drag-handle-react': resolve(__dirname, 'packages/extension-drag-handle-react/src'),
    },
  },
})
