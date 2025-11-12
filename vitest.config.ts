import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
  },
  resolve: {
    alias: {
      '@tiptap/core': resolve(__dirname, 'packages/core/src'),
      '@tiptap/pm/model': resolve(__dirname, 'packages/pm/model'),
      '@tiptap/extension-document': resolve(__dirname, 'packages/extension-document/src'),
      '@tiptap/extension-paragraph': resolve(__dirname, 'packages/extension-paragraph/src'),
      '@tiptap/extension-text': resolve(__dirname, 'packages/extension-text/src'),
      '@tiptap/extension-heading': resolve(__dirname, 'packages/extension-heading/src'),
      '@tiptap/extension-history': resolve(__dirname, 'packages/extension-history/src'),
      '@tiptap/extension-hidden-block': resolve(__dirname, 'packages/extension-hidden-block/src'),
      '@tiptap/extension-unique-id': resolve(__dirname, 'packages/extension-unique-id/src'),
      '@tiptap/extension-drag-handle': resolve(__dirname, 'packages/extension-drag-handle/src'),
      '@tiptap/extension-drag-handle-react': resolve(__dirname, 'packages/extension-drag-handle-react/src'),
      '@tiptap/extension-nesting': resolve(__dirname, 'packages/extension-nesting/src'),
    },
  },
})
