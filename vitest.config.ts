import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.{test,spec}.{js,ts}', 'packages/**/__tests__/**/*.{test,spec}.{js,ts,tsx}'],
    exclude: ['node_modules/**', 'demos/**', 'packages-deprecated/**', 'tests/cypress/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        'dist/',
        'demos/',
        'packages/*/dist/',
        'packages-deprecated/',
      ],
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
      '@': resolve(__dirname, './packages/core/src'),
    },
  },
})
