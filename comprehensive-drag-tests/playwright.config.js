/**
 * 🔧 拖拽测试专用的Playwright配置
 */

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './',
  fullyParallel: false, // 串行执行，避免端口冲突
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1, // 单worker避免并发问题
  
  reporter: [
    ['html', { outputFolder: 'comprehensive-drag-tests/test-results' }],
    ['json', { outputFile: 'comprehensive-drag-tests/test-results.json' }],
    ['list'] // 控制台输出
  ],
  
  use: {
    baseURL: 'http://localhost:3666',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },

  projects: [
    {
      name: 'chromium-drag-tests',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        // 为拖拽测试优化的设置
        launchOptions: {
          slowMo: 100, // 放慢操作以确保稳定性
          args: [
            '--disable-web-security', // 如果需要跨域测试
            '--disable-blink-features=AutomationControlled',
          ]
        }
      },
    },
    
    // 可选：Firefox测试（如果需要跨浏览器验证）
    // {
    //   name: 'firefox-drag-tests',
    //   use: { 
    //     ...devices['Desktop Firefox'],
    //     viewport: { width: 1280, height: 720 },
    //   },
    // },
  ],

  // 启动本地开发服务器
  webServer: {
    command: 'npm run dev',
    port: 3666,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
})