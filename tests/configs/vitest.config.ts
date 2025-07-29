import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: '@tiptap/core',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['../setup.ts'],
    include: ['../unit/**/*.{test,spec}.{js,ts,tsx}', '../../packages/**/__tests__/**/*.{test,spec}.{js,ts,tsx}'],
    exclude: ['../../node_modules/**', '../../demos/**', '../../packages-deprecated/**', '../cypress/**', '../e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['../../packages/*/src/**/*.ts', '../../packages/*/src/**/*.tsx'],
      exclude: [
        '../../node_modules/',
        '../',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        '../../dist/',
        '../../demos/',
        '../../packages/*/dist/',
        '../../packages-deprecated/',
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 75,
          statements: 75,
        },
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '../../packages/core/src'),
      '@tiptap/core/jsx-dev-runtime': resolve(__dirname, '../../packages/core/jsx-dev-runtime/index.js'),
      '@tiptap/core/jsx-runtime': resolve(__dirname, '../../packages/core/jsx-runtime/index.js'),
      '@tiptap/core': resolve(__dirname, '../../packages/core/src'),
      '@tiptap/extension-document': resolve(__dirname, '../../packages/extension-document/src'),
      '@tiptap/extension-paragraph': resolve(__dirname, '../../packages/extension-paragraph/src'),
      '@tiptap/extension-text': resolve(__dirname, '../../packages/extension-text/src'),
      '@tiptap/extension-bold': resolve(__dirname, '../../packages/extension-bold/src'),
      '@tiptap/extension-image': resolve(__dirname, '../../packages/extension-image/src'),
      '@tiptap/extension-mention': resolve(__dirname, '../../packages/extension-mention/src'),
      '@tiptap/starter-kit': resolve(__dirname, '../../packages/starter-kit/src'),
      '@tiptap/pm/model': resolve(__dirname, '../../packages/pm/model'),
      '@tiptap/react': resolve(__dirname, '../../packages/react/src'),
      '@tiptap/extension-drag-handle': resolve(__dirname, '../../packages/extension-drag-handle/src'),
      '@tiptap/extension-hidden-block': resolve(__dirname, '../../packages/extension-hidden-block/src'),
    },
  },
})
