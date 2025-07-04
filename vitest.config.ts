import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/demos/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
    ],
  },
  resolve: {
    alias: {
      '@tiptap/core': resolve(__dirname, './packages/core/src'),
      '@tiptap/react': resolve(__dirname, './packages/react/src'),
      '@tiptap/extension-document': resolve(__dirname, './packages/extension-document/src'),
      '@tiptap/extension-paragraph': resolve(__dirname, './packages/extension-paragraph/src'),
      '@tiptap/extension-text': resolve(__dirname, './packages/extension-text/src'),
      '@tiptap/pm': resolve(__dirname, './packages/pm'),
    },
  },
})
