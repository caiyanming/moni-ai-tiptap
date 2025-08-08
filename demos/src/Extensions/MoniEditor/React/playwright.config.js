import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e-tests',

  // 并行测试配置
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // 报告配置
  reporter: [
    ['html'],
    ['json', { outputFile: './test-results/e2e-results.json' }],
    ['junit', { outputFile: './test-results/e2e-results.xml' }],
  ],

  use: {
    // 基础URL - 需要先启动开发服务器
    baseURL: 'http://localhost:3666',

    // 截图和视频
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',

    // 浏览器配置
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,

    // 等待策略
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  // 测试项目配置
  projects: [
    // 桌面浏览器 - 完整功能测试
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // 真实拖拽需要的配置
        hasTouch: false,
        isMobile: false,
      },
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        hasTouch: false,
        isMobile: false,
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        hasTouch: false,
        isMobile: false,
      },
    },

    // 移动设备 - 触摸交互测试
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        // 移动端拖拽配置
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
        hasTouch: true,
        isMobile: true,
      },
    },

    // 高分辨率测试
    {
      name: 'Desktop High DPI',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 2560, height: 1440 },
        deviceScaleFactor: 2,
      },
    },
  ],

  // 开发服务器配置
  webServer: {
    command: 'npm start',
    url: 'http://localhost:3666',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  // 全局设置 - temporarily disabled for POC
  // globalSetup: './e2e-tests/global-setup.js',
  // globalTeardown: './e2e-tests/global-teardown.js'
})
