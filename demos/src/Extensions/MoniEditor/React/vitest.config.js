import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'MoniEditor Demo Tests',
    environment: 'jsdom',
    setupFiles: ['./test-setup.js'],
    globals: true,

    // 测试匹配模式
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],

    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['index.jsx', 'MoniEditor.jsx', 'DebugPanel.jsx', 'StreamSimulator.jsx'],
      exclude: ['node_modules/', '**/*.test.js', '**/*.spec.js', 'test-setup.js', 'vitest.config.js'],
      thresholds: {
        global: {
          statements: 80,
          branches: 75,
          functions: 80,
          lines: 80,
        },
      },
    },

    // 测试超时配置
    testTimeout: 10000,
    hookTimeout: 10000,

    // 并发配置
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
      },
    },

    // 报告配置
    reporter: ['verbose', 'json', 'html'],
    outputFile: {
      json: './test-results/results.json',
      html: './test-results/index.html',
    },

    // 监控模式配置
    watch: false,

    // 环境变量
    env: {
      NODE_ENV: 'test',
      VITEST: 'true',
    },
  },

  // 解析配置
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
      '@components': resolve(__dirname, './'),
      '@utils': resolve(__dirname, './utils'),
    },
  },

  // 定义全局变量
  define: {
    __TEST__: true,
    __DEV__: false,
  },
})
