import { defineConfig, devices } from '@playwright/test';

/**
 * 🎯 拖拽流畅度真实浏览器测试配置
 * 基于 AppFlowy 最佳实践，验证 Notion 级别的拖拽体验
 */
export default defineConfig({
  testDir: './playwright-tests',
  testMatch: '**/e2e/**/*.spec.ts',
  
  /* 基础配置 */
  timeout: 60000,
  expect: {
    timeout: 5000,
  },
  
  /* 并行配置 - 拖拽测试需要串行避免干扰 */
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : 1,
  
  /* 报告配置 */
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/playwright-results.json' }],
    ['list'],
  ],
  
  /* 全局配置 */
  use: {
    /* 基础 URL */
    baseURL: 'http://localhost:3666',
    
    /* 追踪和调试 */
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    
    /* 性能测试特定设置 */
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  /* 测试项目配置 */
  projects: [
    {
      name: 'chromium-drag-fluidity',
      use: {
        ...devices['Desktop Chrome'],
        
        /* 拖拽测试优化设置 */
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1, // 确保像素精确
        hasTouch: false,      // 纯鼠标拖拽
        
        /* Chrome 性能优化 */
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
    
    // 可选：其他浏览器测试
    // {
    //   name: 'firefox-drag-test',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit-drag-test', 
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /* Web 服务器配置 */
  webServer: {
    command: 'cd demos && pnpm start -- --port 3666',
    url: 'http://localhost:3666',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});