/**
 * Cypress E2E 测试 - StreamOperationManager
 * 验证AI流式操作在真实浏览器中的行为
 */

describe('🔄 StreamOperationManager - 真实浏览器测试', () => {
  beforeEach(() => {
    cy.visit('/src/Extensions/MoniEditor/React/')
    cy.get('[data-testid="moni-editor"]').should('be.visible')
  })

  it('应该能够触发AI批量操作并显示队列', () => {
    // 点击批量操作按钮
    cy.contains('🚀 Run Batch Operations').click()
    
    // 验证按钮状态变为运行中
    cy.contains('⏳ Running...').should('be.visible')
    
    // 等待操作队列出现
    cy.contains('Pending AI Operations', { timeout: 5000 }).should('be.visible')
    
    // 验证显示操作数量
    cy.contains(/Pending AI Operations \(\d+\)/).should('be.visible')
    
    // 验证操作项显示
    cy.contains('✓ Approve').should('be.visible')
    cy.contains('✗ Reject').should('be.visible')
    
    cy.screenshot('stream-operations-queue')
  })

  it('应该能够单独批准AI操作', () => {
    // 生成操作队列
    cy.contains('🚀 Run Batch Operations').click()
    cy.contains('Pending AI Operations', { timeout: 5000 }).should('be.visible')
    
    // 获取原始段落数量
    cy.get('p[data-moni-block-id]').its('length').as('originalCount')
    
    // 点击第一个批准按钮
    cy.contains('✓ Approve').first().click()
    
    // 验证操作被执行：段落数量增加
    cy.get('@originalCount').then(originalCount => {
      cy.get('p[data-moni-block-id]').should('have.length.greaterThan', originalCount)
    })
    
    cy.screenshot('stream-operation-approved')
  })

  it('应该能够拒绝AI操作', () => {
    // 生成操作队列
    cy.contains('🚀 Run Batch Operations').click()
    cy.contains('Pending AI Operations', { timeout: 5000 }).should('be.visible')
    
    // 获取原始段落数量
    cy.get('p[data-moni-block-id]').its('length').as('originalCount')
    
    // 记录拒绝前的操作数量
    cy.get('button:contains("✗ Reject")').its('length').as('operationCount')
    
    // 点击第一个拒绝按钮
    cy.contains('✗ Reject').first().click()
    
    // 验证操作被拒绝：段落数量不变
    cy.get('@originalCount').then(originalCount => {
      cy.get('p[data-moni-block-id]').should('have.length', originalCount)
    })
    
    // 验证操作从队列中消失
    cy.get('@operationCount').then(operationCount => {
      cy.get('button:contains("✗ Reject")').should('have.length.lessThan', operationCount)
    })
  })

  it('应该能够批量批准所有操作', () => {
    // 生成操作队列
    cy.contains('🚀 Run Batch Operations').click()
    cy.contains('Pending AI Operations', { timeout: 5000 }).should('be.visible')
    
    // 获取原始段落数量
    cy.get('p[data-moni-block-id]').its('length').as('originalCount')
    
    // 点击批量批准按钮
    cy.contains('Approve All').click()
    
    // 验证所有操作被执行：段落数量显著增加
    cy.get('@originalCount').then(originalCount => {
      cy.get('p[data-moni-block-id]').should('have.length.greaterThan', originalCount + 3)
    })
    
    // 验证操作队列消失
    cy.contains('Pending AI Operations').should('not.exist')
    
    cy.screenshot('stream-operations-batch-approved')
  })

  it('应该支持实时编辑模拟', () => {
    // 点击实时编辑模拟按钮
    cy.contains('✨ Simulate Realtime Editing').click()
    
    // 验证模拟状态显示
    cy.contains('AI Stream Simulation in Progress').should('be.visible')
    
    // 验证编辑器覆盖层效果
    cy.get('.absolute').contains('AI is processing').should('be.visible')
    
    // 等待模拟完成，操作队列出现
    cy.contains('Pending AI Operations', { timeout: 8000 }).should('be.visible')
    
    // 验证生成了多步操作
    cy.get('button:contains("✓ Approve")').should('have.length.greaterThan', 1)
    
    cy.screenshot('stream-realtime-editing')
  })

  it('应该支持自定义操作', () => {
    const customContent = '<h3>自定义AI生成标题</h3><p>这是通过自定义操作生成的内容</p>'
    
    // 输入自定义内容
    cy.get('textarea[placeholder*="Enter custom HTML content"]').type(customContent)
    
    // 选择操作类型
    cy.get('select').first().select('update')
    
    // 执行自定义操作
    cy.contains('🎯 Run Custom Operation').should('not.be.disabled').click()
    
    // 验证模拟状态
    cy.contains('AI Stream Simulation in Progress').should('be.visible')
    
    // 等待操作出现在队列中
    cy.contains('Pending AI Operations', { timeout: 5000 }).should('be.visible')
    
    // 验证自定义操作的描述
    cy.contains('Custom update operation').should('be.visible')
    
    // 批准自定义操作
    cy.contains('✓ Approve').first().click()
    
    // 验证自定义内容被添加
    cy.contains('自定义AI生成标题').should('be.visible')
  })

  it('应该能够调整模拟速度', () => {
    // 调整速度滑块到快速模式
    cy.get('input[type="range"]').invoke('val', 200).trigger('input')
    
    // 记录开始时间
    const startTime = Date.now()
    
    // 执行批量操作
    cy.contains('🚀 Run Batch Operations').click()
    
    // 等待操作队列出现
    cy.contains('Pending AI Operations', { timeout: 3000 }).should('be.visible')
    
    cy.then(() => {
      const duration = Date.now() - startTime
      expect(duration).to.be.lessThan(1500) // 快速模式应该很快
    })
    
    // 清除操作并测试慢速模式
    cy.contains('Clear').click()
    cy.get('input[type="range"]').invoke('val', 3000).trigger('input')
    
    const slowStartTime = Date.now()
    cy.contains('🚀 Run Batch Operations').click()
    cy.contains('Pending AI Operations', { timeout: 8000 }).should('be.visible')
    
    cy.then(() => {
      const slowDuration = Date.now() - slowStartTime
      expect(slowDuration).to.be.greaterThan(2000) // 慢速模式应该慢一些
    })
  })

  it('应该在模拟进行中正确禁用控件', () => {
    // 开始模拟
    cy.contains('🚀 Run Batch Operations').click()
    
    // 验证按钮变为禁用状态
    cy.contains('⏳ Running...').should('be.visible').and('be.disabled')
    
    // 验证速度滑块被禁用
    cy.get('input[type="range"]').should('be.disabled')
    
    // 验证其他操作按钮被禁用
    cy.contains('✨ Simulate Realtime Editing').should('be.disabled')
    
    // 等待模拟完成
    cy.contains('Pending AI Operations', { timeout: 5000 }).should('be.visible')
    
    // 验证控件重新启用
    cy.get('input[type="range"]').should('not.be.disabled')
    cy.contains('✨ Simulate Realtime Editing').should('not.be.disabled')
  })

  it('应该显示操作进度和状态信息', () => {
    // 开始实时编辑模拟
    cy.contains('✨ Simulate Realtime Editing').click()
    
    // 验证进度指示器
    cy.contains('AI Stream Simulation in Progress').should('be.visible')
    
    // 验证进度动画效果
    cy.get('[class*="animate-pulse"], [class*="pulse"]').should('be.visible')
    
    // 验证操作完成后状态更新
    cy.contains('Pending AI Operations', { timeout: 8000 }).should('be.visible')
    cy.contains('AI Stream Simulation in Progress').should('not.exist')
    
    // 验证操作详情显示
    cy.get('button:contains("✓ Approve")').should('be.visible')
    
    // 验证操作类型显示
    cy.contains(/INSERT|UPDATE|DELETE/).should('be.visible')
  })

  it('应该优雅处理错误情况', () => {
    // 注入错误模拟
    cy.window().then(win => {
      win.__mockEditorError = true
    })
    
    // 生成操作并尝试批准
    cy.contains('🚀 Run Batch Operations').click()
    cy.contains('Pending AI Operations', { timeout: 5000 }).should('be.visible')
    
    // 批准操作（可能会失败）
    cy.contains('✓ Approve').first().click()
    
    // 验证应用不崩溃，仍然可用
    cy.get('h1').should('contain.text', 'MoniAI TipTap Editor Demo')
    cy.contains('Show Debug').should('be.visible')
  })
})