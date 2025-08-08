/**
 * Cypress E2E 测试 - HiddenBlock Extension
 * 验证隐藏块扩展在真实浏览器中的行为
 */

describe('👁️ HiddenBlock Extension - 真实浏览器测试', () => {
  beforeEach(() => {
    cy.visit('/src/Extensions/MoniEditor/React/')
    cy.get('[data-testid="moni-editor"]').should('be.visible')
  })

  it('应该能够插入隐藏块而不影响可见内容', () => {
    // 获取插入前的段落数量
    cy.get('p[data-moni-block-id]:visible').its('length').as('initialCount')

    // 点击插入隐藏块按钮
    cy.contains('👁️ Insert Hidden Block').click()

    // 等待DOM更新
    cy.wait(500)

    // 验证可见段落数量没有变化
    cy.get('@initialCount').then(initialCount => {
      cy.get('p[data-moni-block-id]:visible').should('have.length', initialCount)
    })

    // 验证没有新的可见内容
    cy.contains('hiddenBlock').should('not.be.visible')

    cy.screenshot('hidden-block-inserted')
  })

  it('应该在插入隐藏块后自动触发AI操作', () => {
    // 插入隐藏块
    cy.contains('👁️ Insert Hidden Block').click()

    // 等待自动AI操作被触发
    cy.contains('Pending AI Operations', { timeout: 3000 }).should('be.visible')

    // 验证AI操作描述包含隐藏块信息
    cy.contains('AI inserted content targeting hidden block').should('be.visible')

    // 验证操作类型
    cy.contains('INSERT').should('be.visible')

    cy.screenshot('hidden-block-ai-operation')
  })

  it('应该能够批准针对隐藏块的AI操作', () => {
    // 获取初始段落数量
    cy.get('p[data-moni-block-id]:visible').its('length').as('initialCount')

    // 插入隐藏块并等待AI操作
    cy.contains('👁️ Insert Hidden Block').click()
    cy.contains('Pending AI Operations', { timeout: 3000 }).should('be.visible')

    // 批准AI操作
    cy.contains('✓ Approve').first().click()

    // 验证新内容被插入
    cy.get('@initialCount').then(initialCount => {
      cy.get('p[data-moni-block-id]:visible').should('have.length', initialCount + 1)
    })

    // 验证插入的内容
    cy.contains('This content was inserted via a hidden block target').should('be.visible')

    cy.screenshot('hidden-block-operation-executed')
  })

  it('🔧 验证隐藏块不在可见DOM中', () => {
    // 插入隐藏块
    cy.contains('👁️ Insert Hidden Block').click()
    cy.wait(500)

    // 检查隐藏块相关元素不可见
    cy.get('[data-type="hiddenBlock"]').should('not.be.visible')
    cy.get('.moni-hidden-block').should('not.be.visible')

    // 验证通过CSS隐藏
    cy.get('.moni-hidden-block').should('have.css', 'display', 'none')
  })

  it('应该在Debug模式下显示隐藏块信息', () => {
    // 插入多个隐藏块
    for (let i = 0; i < 3; i++) {
      cy.contains('👁️ Insert Hidden Block').click()
      cy.wait(300)
    }

    // 启用Debug模式
    cy.contains('Show Debug').click()
    cy.contains('🐛 Debug Panel').should('be.visible')

    // 检查Debug面板中的信息
    cy.contains('🌳 Document Nodes').should('be.visible')

    // 应该能看到Stream Operations相关信息
    cy.get('[data-testid="debug-panel"], .debug-panel').within(() => {
      cy.contains('🔄 Stream Operations').should('be.visible')
    })

    cy.screenshot('hidden-block-debug-info')
  })

  it('应该支持多个隐藏块的独立操作', () => {
    // 获取初始段落数量
    cy.get('p[data-moni-block-id]:visible').its('length').as('initialCount')

    // 插入3个隐藏块
    for (let i = 0; i < 3; i++) {
      cy.contains('👁️ Insert Hidden Block').click()
      cy.wait(1200) // 等待AI操作触发
    }

    // 验证生成了3个AI操作
    cy.contains('Pending AI Operations', { timeout: 8000 }).should('be.visible')
    cy.get('button:contains("✓ Approve")').should('have.length', 3)

    // 批准所有操作
    cy.contains('Approve All').click()

    // 验证3个新段落被添加
    cy.get('@initialCount').then(initialCount => {
      cy.get('p[data-moni-block-id]:visible').should('have.length', initialCount + 3)
    })

    // 验证每个新段落都包含目标内容
    cy.get('p:contains("This content was inserted via a hidden block target")').should('have.length', 3)
  })

  it('🔧 验证UUID系统实现', () => {
    // 插入隐藏块
    cy.contains('👁️ Insert Hidden Block').click()

    // 检查UUID相关属性
    cy.window().then(win => {
      const elements = win.document.querySelectorAll('*[data-moni-block-id], *[id*="hidden"]')
      const uuidPattern = /[0-9a-f-]{36}|hidden-\d+/i

      let foundHiddenUUIDs = 0
      elements.forEach(el => {
        const blockId = el.getAttribute('data-moni-block-id') || el.id
        if (blockId && (blockId.includes('hidden') || uuidPattern.test(blockId))) {
          foundHiddenUUIDs++
        }
      })

      expect(foundHiddenUUIDs).to.be.greaterThan(0)
    })
  })

  it('应该在不同编辑器状态下正确处理隐藏块', () => {
    // 测试只读模式
    cy.contains('✏️ Editable').click() // 切换到只读模式

    // 验证隐藏块按钮被禁用
    cy.contains('👁️ Insert Hidden Block').should('be.disabled')

    // 切换回编辑模式
    cy.contains('🔒 Read-only').click()

    // 验证隐藏块按钮重新启用
    cy.contains('👁️ Insert Hidden Block').should('not.be.disabled')

    // 在编辑模式下插入应该正常工作
    cy.contains('👁️ Insert Hidden Block').click()
    cy.contains('Pending AI Operations', { timeout: 3000 }).should('be.visible')
  })

  it('应该处理高频隐藏块操作的性能', () => {
    const startTime = Date.now()

    // 快速插入多个隐藏块
    for (let i = 0; i < 5; i++) {
      cy.contains('👁️ Insert Hidden Block').click()
      // 不等待，快速连续插入
    }

    cy.then(() => {
      const insertDuration = Date.now() - startTime
      expect(insertDuration).to.be.lessThan(2000) // 插入应该很快
    })

    // 等待AI操作队列稳定
    cy.contains('Pending AI Operations', { timeout: 8000 }).should('be.visible')

    // 验证页面仍然响应
    cy.get('h1').should('contain.text', 'MoniAI TipTap Editor Demo')

    // 验证操作队列数量合理
    cy.get('button:contains("✓ Approve")').should('have.length.lessThan', 6)

    cy.screenshot('hidden-block-performance')
  })

  it('应该正确处理隐藏块与其他功能的交互', () => {
    // 插入隐藏块
    cy.contains('👁️ Insert Hidden Block').click()

    // 同时添加可见内容
    cy.contains('➕ Add Sample').click()

    // 启动AI模拟
    cy.contains('🚀 Run Batch Operations').click()

    // 应该看到多种类型的操作
    cy.contains('Pending AI Operations', { timeout: 5000 }).should('be.visible')

    // 验证操作队列包含不同类型的操作
    cy.get('button:contains("✓ Approve")').should('have.length.greaterThan', 1)

    // 批准所有操作
    cy.contains('Approve All').click()

    // 验证内容被正确添加
    cy.get('p[data-moni-block-id]:visible').should('have.length.greaterThan', 2)
  })
})
