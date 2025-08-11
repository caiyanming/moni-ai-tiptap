import { defineConfig, devices } from '@playwright/test'

/**
 * 🎯 统一的Playwright E2E测试配置
 * 支持拖拽行为、UI定位、性能和跨浏览器测试
 */
export default defineConfig({
  testDir: '../e2e',
  testMatch: '**/*.{spec,test}.{js,ts}',

  /* 基础配置 */
  timeout: 60000,
  expect: {
    timeout: 5000,
  },

  /* 并行配置 - E2E测试需要串行避免干扰 */
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 1,

  /* 报告配置 */
  reporter: [
    ['html', { outputFolder: '../../playwright-report' }],
    ['json', { outputFile: '../../test-results/e2e-results.json' }],
    ['list'],
  ],

  /* 全局设置和清理 */
  globalSetup: './global-drag-setup.ts',
  globalTeardown: './global-drag-teardown.ts',

  /* 全局配置 */
  use: {
    /* 基础 URL */
    baseURL: 'http://localhost:3666',

    /* 追踪和调试 */
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',

    /* E2E测试特定设置 */
    actionTimeout: 10000,
    navigationTimeout: 30000,

    /* 拖拽测试优化 */
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    hasTouch: false,
  },

  /* 测试项目配置 */
  projects: [
    {
      name: 'chromium-e2e',
      use: {
        ...devices['Desktop Chrome'],

        /* Chrome性能优化 */
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=TranslateUI',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-background-timer-throttling',
            '--enable-precise-memory-info',
            '--force-color-profile=srgb',
            '--disable-ipc-flooding-protection',
          ],
        },
      },
    },

    {
      name: 'firefox-e2e',
      use: {
        ...devices['Desktop Firefox'],
        // Firefox特定设置
      },
    },

    {
      name: 'webkit-e2e',
      use: {
        ...devices['Desktop Safari'],
        // Safari特定设置
      },
    },
  ],

  /* Web服务器配置 */
  webServer: {
    command: 'npx vite --host --port 3667',
    url: 'http://localhost:3667',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
    cwd: '../../demos',
  },
})
