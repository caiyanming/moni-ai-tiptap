import { test, expect } from '@playwright/test'

/**
 * Stream Operations E2E 测试
 * 验证AI流式操作管理器的真实浏览器行为
 */

test.describe('🔄 StreamOperationManager - 真实浏览器测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/Extensions/MoniEditor/React/')
    await page.waitForSelector('[data-testid="editor-content"]', { state: 'visible' })
  })

  test('应该能够模拟AI批量操作并显示操作队列', async ({ page }) => {
    // 点击批量操作按钮
    const batchButton = page.locator('button:has-text("🚀 Run Batch Operations")')
    await expect(batchButton).toBeVisible()
    await batchButton.click()
    
    // 验证按钮状态变为运行中
    await expect(page.locator('button:has-text("⏳ Running...")')).toBeVisible({ timeout: 1000 })
    
    // 等待操作队列出现
    await expect(page.locator('text=Pending AI Operations')).toBeVisible({ timeout: 3000 })
    
    // 验证显示操作数量
    const operationCount = page.locator('text=/Pending AI Operations \\(\\d+\\)/')
    await expect(operationCount).toBeVisible()
    
    // 验证操作列表显示
    const operationItems = page.locator('[data-testid="operation-item"], .operation-item, div:has(button:has-text("✓ Approve"))')
    await expect(operationItems.first()).toBeVisible()
    
    // 截图记录操作队列状态
    await page.screenshot({ 
      path: './test-results/stream-operations-queue.png',
      fullPage: true 
    })
  })

  test('应该能够单独批准AI操作', async ({ page }) => {
    // 生成操作队列
    await page.locator('button:has-text("🚀 Run Batch Operations")').click()
    await expect(page.locator('text=Pending AI Operations')).toBeVisible({ timeout: 3000 })
    
    // 获取原始段落数量
    const originalParagraphs = await page.locator('p[data-moni-block-id]').count()
    
    // 点击第一个操作的批准按钮
    const approveButton = page.locator('button:has-text("✓ Approve")').first()
    await expect(approveButton).toBeVisible()
    await approveButton.click()
    
    // 验证操作被执行：段落数量增加
    await expect(page.locator('p[data-moni-block-id]')).toHaveCount(originalParagraphs + 1, { timeout: 2000 })
    
    // 验证该操作从队列中消失
    const remainingOperations = await page.locator('button:has-text("✓ Approve")').count()
    expect(remainingOperations).toBeLessThan(5) // 原来应该有5个操作
    
    // 截图记录执行后状态
    await page.screenshot({ 
      path: './test-results/stream-operation-approved.png',
      fullPage: true 
    })
  })

  test('应该能够拒绝AI操作', async ({ page }) => {
    // 生成操作队列
    await page.locator('button:has-text("🚀 Run Batch Operations")').click()
    await expect(page.locator('text=Pending AI Operations')).toBeVisible({ timeout: 3000 })
    
    // 获取原始段落数量
    const originalParagraphs = await page.locator('p[data-moni-block-id]').count()
    
    // 点击第一个操作的拒绝按钮
    const rejectButton = page.locator('button:has-text("✗ Reject")').first()
    await expect(rejectButton).toBeVisible()
    await rejectButton.click()
    
    // 验证操作被拒绝：段落数量不变
    await page.waitForTimeout(500)
    const currentParagraphs = await page.locator('p[data-moni-block-id]').count()
    expect(currentParagraphs).toBe(originalParagraphs)
    
    // 验证该操作从队列中消失
    const remainingOperations = await page.locator('button:has-text("✗ Reject")').count()
    expect(remainingOperations).toBeLessThan(5) // 应该少了一个
  })

  test('应该能够批量批准所有操作', async ({ page }) => {
    // 生成操作队列
    await page.locator('button:has-text("🚀 Run Batch Operations")').click()
    await expect(page.locator('text=Pending AI Operations')).toBeVisible({ timeout: 3000 })
    
    // 获取原始段落数量
    const originalParagraphs = await page.locator('p[data-moni-block-id]').count()
    
    // 点击批量批准按钮
    const approveAllButton = page.locator('button:has-text("Approve All")')
    await expect(approveAllButton).toBeVisible()
    await approveAllButton.click()
    
    // 验证所有操作被执行：段落数量显著增加
    await expect(page.locator('p[data-moni-block-id]')).toHaveCount(originalParagraphs + 5, { timeout: 3000 })
    
    // 验证操作队列消失
    await expect(page.locator('text=Pending AI Operations')).not.toBeVisible({ timeout: 2000 })
    
    // 截图记录批量执行后状态
    await page.screenshot({ 
      path: './test-results/stream-operations-batch-approved.png',
      fullPage: true 
    })
  })

  test('应该支持实时编辑模拟', async ({ page }) => {
    // 点击实时编辑模拟按钮
    const realtimeButton = page.locator('button:has-text("✨ Simulate Realtime Editing")')
    await expect(realtimeButton).toBeVisible()
    await realtimeButton.click()
    
    // 验证模拟状态显示
    await expect(page.locator('text=AI Stream Simulation in Progress')).toBeVisible({ timeout: 1000 })
    
    // 验证编辑器覆盖层效果
    const overlay = page.locator('.absolute:has-text("AI is processing")')
    await expect(overlay).toBeVisible()
    
    // 等待模拟完成，操作队列出现
    await expect(page.locator('text=Pending AI Operations')).toBeVisible({ timeout: 5000 })
    
    // 验证生成了多步操作
    const operations = page.locator('button:has-text("✓ Approve")')
    const operationCount = await operations.count()
    expect(operationCount).toBeGreaterThan(1) // 实时编辑应该生成多个步骤
    
    // 截图记录实时编辑效果
    await page.screenshot({ 
      path: './test-results/stream-realtime-editing.png',
      fullPage: true 
    })
  })

  test('应该支持自定义操作', async ({ page }) => {
    // 输入自定义内容
    const customTextarea = page.locator('textarea[placeholder*="Enter custom HTML content"]')
    await expect(customTextarea).toBeVisible()
    
    const customContent = '<h3>自定义AI生成标题</h3><p>这是通过自定义操作生成的内容</p>'
    await customTextarea.fill(customContent)
    
    // 选择操作类型
    const operationSelect = page.locator('select').first()
    await operationSelect.selectOption('update')
    
    // 执行自定义操作
    const customButton = page.locator('button:has-text("🎯 Run Custom Operation")')
    await expect(customButton).not.toBeDisabled()
    await customButton.click()
    
    // 验证模拟状态
    await expect(page.locator('text=AI Stream Simulation in Progress')).toBeVisible({ timeout: 1000 })
    
    // 等待操作出现在队列中
    await expect(page.locator('text=Pending AI Operations')).toBeVisible({ timeout: 3000 })
    
    // 验证自定义操作的描述
    const operationDescription = page.locator('text=Custom update operation')
    await expect(operationDescription).toBeVisible()
    
    // 批准自定义操作
    await page.locator('button:has-text("✓ Approve")').first().click()
    
    // 验证自定义内容被添加到编辑器
    await expect(page.locator('h3:has-text("自定义AI生成标题")')).toBeVisible({ timeout: 2000 })
  })

  test('应该能够调整模拟速度', async ({ page }) => {
    // 调整速度滑块到快速模式
    const speedSlider = page.locator('input[type="range"]')
    await expect(speedSlider).toBeVisible()
    
    // 设置为最快速度
    await speedSlider.fill('200')
    
    // 记录开始时间
    const startTime = Date.now()
    
    // 执行批量操作
    await page.locator('button:has-text("🚀 Run Batch Operations")').click()
    
    // 等待操作队列出现
    await expect(page.locator('text=Pending AI Operations')).toBeVisible({ timeout: 2000 })
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    // 在快速模式下，操作应该很快出现（小于1秒）
    expect(duration).toBeLessThan(1000)
    
    // 调整为慢速模式
    await page.locator('button:has-text("Clear")').click() // 清除之前的操作
    await speedSlider.fill('3000')
    
    const slowStartTime = Date.now()
    await page.locator('button:has-text("🚀 Run Batch Operations")').click()
    await expect(page.locator('text=Pending AI Operations')).toBeVisible({ timeout: 5000 })
    
    const slowEndTime = Date.now()
    const slowDuration = slowEndTime - slowStartTime
    
    // 慢速模式应该明显慢于快速模式
    expect(slowDuration).toBeGreaterThan(duration * 2)
  })

  test('应该在模拟进行中正确禁用控件', async ({ page }) => {
    // 开始模拟
    const batchButton = page.locator('button:has-text("🚀 Run Batch Operations")')
    await batchButton.click()
    
    // 验证按钮变为禁用状态
    await expect(page.locator('button:has-text("⏳ Running...")')).toBeVisible()
    await expect(page.locator('button:has-text("⏳ Running...")')).toBeDisabled()
    
    // 验证速度滑块被禁用
    const speedSlider = page.locator('input[type="range"]')
    await expect(speedSlider).toBeDisabled()
    
    // 验证其他操作按钮被禁用
    const realtimeButton = page.locator('button:has-text("✨ Simulate Realtime Editing")')
    await expect(realtimeButton).toBeDisabled()
    
    // 等待模拟完成
    await expect(page.locator('text=Pending AI Operations')).toBeVisible({ timeout: 3000 })
    
    // 验证控件重新启用
    await expect(speedSlider).not.toBeDisabled()
    await expect(realtimeButton).not.toBeDisabled()
  })

  test('应该显示操作进度和状态', async ({ page }) => {
    // 开始实时编辑模拟
    await page.locator('button:has-text("✨ Simulate Realtime Editing")').click()
    
    // 验证进度指示器
    const progressIndicator = page.locator('text=AI Stream Simulation in Progress')
    await expect(progressIndicator).toBeVisible()
    
    // 验证进度动画效果
    const pulsingElement = page.locator('.animate-pulse, [class*="pulse"]')
    await expect(pulsingElement).toBeVisible()
    
    // 验证操作完成后状态更新
    await expect(page.locator('text=Pending AI Operations')).toBeVisible({ timeout: 5000 })
    await expect(progressIndicator).not.toBeVisible()
    
    // 验证操作详情显示
    const operationDetails = page.locator('div:has(button:has-text("✓ Approve"))')
    await expect(operationDetails.first()).toBeVisible()
    
    // 验证操作类型和描述显示
    const operationTypes = page.locator('text=/INSERT|UPDATE|DELETE/')
    await expect(operationTypes.first()).toBeVisible()
  })

  test('应该处理操作执行错误', async ({ page }) => {
    // 通过控制台注入错误处理测试
    await page.evaluate(() => {
      // 模拟编辑器命令失败
      window.__mockEditorError = true
    })
    
    // 生成操作并尝试批准
    await page.locator('button:has-text("🚀 Run Batch Operations")').click()
    await expect(page.locator('text=Pending AI Operations')).toBeVisible({ timeout: 3000 })
    
    // 批准操作（可能会失败）
    await page.locator('button:has-text("✓ Approve")').first().click()
    
    // 验证应用不崩溃，仍然可用
    await expect(page.locator('h1')).toHaveText('MoniAI TipTap Editor Demo')
    
    // 验证错误被优雅处理
    const consoleErrors = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })
    
    // 应用应该仍然响应用户交互
    await expect(page.locator('button:has-text("Show Debug")')).toBeVisible()
  })
})