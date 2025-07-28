const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3003',
    supportFile: './cypress/support/e2e.js',
    specPattern: './cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    fixturesFolder: './cypress/fixtures',
    screenshotsFolder: './cypress/screenshots',
    videosFolder: './cypress/videos',
    
    // 视窗配置
    viewportWidth: 1280,
    viewportHeight: 720,
    
    // 超时配置
    defaultCommandTimeout: 10000,
    requestTimeout: 10000,
    responseTimeout: 10000,
    pageLoadTimeout: 30000,
    
    // 测试配置
    video: true,
    screenshotOnRunFailure: true,
    trashAssetsBeforeRuns: true,
    
    // 实验性功能
    experimentalStudio: true,
    
    setupNodeEvents(on, config) {
      // 自定义任务
      on('task', {
        log(message) {
          console.log(message)
          return null
        },
        
        // 性能监控任务
        measurePerformance(name) {
          const startTime = Date.now()
          return {
            name,
            start: startTime,
            end: () => Date.now() - startTime
          }
        }
      })
      
      // 浏览器启动配置
      on('before:browser:launch', (browser = {}, launchOptions) => {
        if (browser.name === 'chrome') {
          launchOptions.args.push('--disable-dev-shm-usage')
          launchOptions.args.push('--no-sandbox')
        }
        
        return launchOptions
      })
      
      return config
    },
  },
  
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
    supportFile: './cypress/support/component.js',
    specPattern: './cypress/component/**/*.cy.{js,jsx,ts,tsx}',
  },
})