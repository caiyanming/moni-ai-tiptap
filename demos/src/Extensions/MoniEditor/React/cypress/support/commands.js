/**
 * Cypress 自定义命令
 * 为 MoniEditor demo 测试提供专用的工具命令
 */

// 等待编辑器完全加载
Cypress.Commands.add('waitForEditor', () => {
  cy.get('[data-testid="editor-content"]').should('be.visible')
  cy.get('.ProseMirror').should('be.visible')
  cy.get('p[data-moni-block-id]').should('have.length.greaterThan', 0)
})

// 触发拖拽手柄显示
Cypress.Commands.add('showDragHandle', (blockSelector = 'p[data-moni-block-id]') => {
  cy.get(blockSelector).first().as('targetBlock')
  cy.get('@targetBlock').trigger('mouseenter')
  cy.get('.drag-handle').should('be.visible')
  return cy.get('@targetBlock')
})

// 隐藏拖拽手柄
Cypress.Commands.add('hideDragHandle', () => {
  cy.get('h1').trigger('mouseenter')
  cy.get('.drag-handle').should('not.be.visible')
})

// 等待AI操作队列出现
Cypress.Commands.add('waitForOperations', (timeout = 5000) => {
  cy.contains('Pending AI Operations', { timeout }).should('be.visible')
  cy.get('button:contains("✓ Approve")').should('have.length.greaterThan', 0)
})

// 批准所有AI操作
Cypress.Commands.add('approveAllOperations', () => {
  cy.contains('Approve All').click()
  cy.contains('Pending AI Operations').should('not.exist')
})

// 拒绝所有AI操作
Cypress.Commands.add('rejectAllOperations', () => {
  cy.contains('Reject All').click()
  cy.contains('Pending AI Operations').should('not.exist')
})

// 清除所有操作
Cypress.Commands.add('clearOperations', () => {
  cy.contains('Clear').click()
  cy.contains('Pending AI Operations').should('not.exist')
})

// 启用Debug模式
Cypress.Commands.add('enableDebug', () => {
  cy.contains('Show Debug').click()
  cy.contains('🐛 Debug Panel').should('be.visible')
})

// 禁用Debug模式
Cypress.Commands.add('disableDebug', () => {
  cy.contains('Hide Debug').click()
  cy.contains('🐛 Debug Panel').should('not.exist')
})

// 切换编辑器可编辑状态
Cypress.Commands.add('toggleEditable', () => {
  cy.get('[data-testid="editor-content"]').within(() => {
    // 查找可编辑状态按钮
    cy.get('button').contains(/Editable|Read-only/).click()
  })
})

// 添加示例内容
Cypress.Commands.add('addSampleContent', () => {
  cy.contains('➕ Add Sample').click()
  // 等待内容被插入
  cy.get('p[data-moni-block-id]').should('have.length.greaterThan', 2)
})

// 插入隐藏块
Cypress.Commands.add('insertHiddenBlock', () => {
  const initialCount = cy.get('p[data-moni-block-id]:visible').its('length')
  cy.contains('👁️ Insert Hidden Block').click()
  
  // 验证可见段落数量没有变化
  return initialCount.then(count => {
    cy.get('p[data-moni-block-id]:visible').should('have.length', count)
  })
})

// 运行AI批量操作
Cypress.Commands.add('runBatchOperations', () => {
  cy.contains('🚀 Run Batch Operations').click()
  cy.contains('⏳ Running...').should('be.visible')
  cy.waitForOperations()
})

// 运行实时编辑模拟
Cypress.Commands.add('runRealtimeSimulation', () => {
  cy.contains('✨ Simulate Realtime Editing').click()
  cy.contains('AI Stream Simulation in Progress').should('be.visible')
  cy.waitForOperations(8000) // 实时编辑需要更多时间
})

// 执行自定义操作
Cypress.Commands.add('runCustomOperation', (content, type = 'insert') => {
  cy.get('textarea[placeholder*="Enter custom HTML content"]').clear().type(content)
  cy.get('select').first().select(type)
  cy.contains('🎯 Run Custom Operation').should('not.be.disabled').click()
  cy.contains('AI Stream Simulation in Progress').should('be.visible')
  cy.waitForOperations()
})

// 设置模拟速度
Cypress.Commands.add('setSimulationSpeed', (speed) => {
  cy.get('input[type="range"]').invoke('val', speed).trigger('input')
})

// 验证段落数量
Cypress.Commands.add('shouldHaveParagraphs', (count) => {
  cy.get('p[data-moni-block-id]:visible').should('have.length', count)
})

// 验证包含特定文本的段落
Cypress.Commands.add('shouldContainText', (text) => {
  cy.contains(text).should('be.visible')
})

// 测量性能
Cypress.Commands.add('measurePerformance', (name, testFn) => {
  const startTime = performance.now()
  
  return cy.then(() => {
    return testFn()
  }).then(() => {
    const endTime = performance.now()
    const duration = endTime - startTime
    
    cy.log(`Performance: ${name} took ${duration.toFixed(2)}ms`)
    
    return cy.wrap(duration)
  })
})

// 检查控制台错误
Cypress.Commands.add('checkConsoleErrors', () => {
  cy.window().then(win => {
    const errors = win.console._errors || []
    expect(errors, 'Console should not have errors').to.have.length(0)
  })
})

// 拖拽元素
Cypress.Commands.add('dragElement', { prevSubject: 'element' }, (subject, targetSelector) => {
  cy.wrap(subject).trigger('mousedown', { which: 1 })
  cy.get(targetSelector).trigger('mousemove').trigger('mouseup')
})

// 验证拖拽指示器
Cypress.Commands.add('shouldShowDragIndicator', () => {
  cy.get('.drag-indicator').should('be.visible')
  cy.get('.drag-indicator').should('have.css', 'background-color', 'rgb(59, 130, 246)') // 蓝色
})

// 等待动画完成
Cypress.Commands.add('waitForAnimation', (duration = 500) => {
  cy.wait(duration)
})

// 模拟Tab键导航
Cypress.Commands.add('tab', { prevSubject: 'optional' }, (subject) => {
  const element = subject ? cy.wrap(subject) : cy.focused()
  return element.trigger('keydown', { key: 'Tab', code: 'Tab' })
})

// 验证响应式设计
Cypress.Commands.add('testResponsive', (callback) => {
  const viewports = [
    { width: 1920, height: 1080, name: 'desktop' },
    { width: 768, height: 1024, name: 'tablet' },
    { width: 375, height: 667, name: 'mobile' }
  ]
  
  viewports.forEach(viewport => {
    cy.viewport(viewport.width, viewport.height)
    cy.log(`Testing ${viewport.name} (${viewport.width}x${viewport.height})`)
    callback(viewport)
  })
})

// 截图并添加时间戳
Cypress.Commands.add('screenshotWithTimestamp', (name) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  cy.screenshot(`${name}-${timestamp}`)
})