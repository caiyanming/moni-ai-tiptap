/**
 * Cypress E2E 支持文件
 * 全局配置、自定义命令和工具函数
 */

// 导入 Cypress 命令
import './commands'

// 全局配置
Cypress.config('defaultCommandTimeout', 10000)
Cypress.config('viewportWidth', 1280)
Cypress.config('viewportHeight', 720)

// 全局钩子
beforeEach(() => {
  // 设置基础URL
  cy.visit('/', { failOnStatusCode: false })

  // 等待页面基本元素加载
  cy.get('body').should('be.visible')

  // 清理控制台错误监听
  cy.window().then(win => {
    win.console.originalError = win.console.error
    win.console.error = (...args) => {
      // 记录但不阻止测试
      win.console.originalError(...args)
    }
  })
})

afterEach(() => {
  // 清理可能的定时器和监听器
  cy.window().then(win => {
    // 清理任何全局状态
    if (win.__mockEditorError) {
      delete win.__mockEditorError
    }
  })

  // 截图（如果测试失败）
  if (Cypress.currentTest.state === 'failed') {
    cy.screenshot(`failed-${Cypress.currentTest.title}`)
  }
})

// 全局异常处理
Cypress.on('uncaught:exception', (err, runnable) => {
  // 返回 false 阻止 Cypress 因为未捕获异常而失败测试
  // 但记录错误用于调试
  console.warn('Uncaught exception:', err.message)

  // 某些预期的错误不应该导致测试失败
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false
  }

  if (err.message.includes('Non-Error promise rejection captured')) {
    return false
  }

  // 其他错误继续抛出
  return true
})

// 网络错误处理
Cypress.on('fail', (err, runnable) => {
  if (err.message.includes('cy.visit() failed')) {
    console.error('访问页面失败，请确保开发服务器正在运行')
  }
  throw err
})
