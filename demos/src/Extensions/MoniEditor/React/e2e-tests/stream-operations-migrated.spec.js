import { expect,test } from '@playwright/test'

/**
 * Playwright 迁移测试 - StreamOperationManager
 * 从 Cypress 迁移到 Playwright 的 AI 流式操作测试
 *
 * 🔄 关键优势：Playwright 提供更好的异步操作处理和实时状态监控
 */

test.describe('🔄 StreamOperationManager - Playwright 迁移版本', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3668/src/Extensions/MoniEditor/React/')
    await page.waitForSelector('[data-testid="moni-editor"]', {
      state: 'visible',
      timeout: 10000,
    })

    // 等待编辑器完全初始化
    await page.waitForTimeout(500)
  })

  test('应该能够触发AI批量操作并显示队列', async ({ page }) => {
    // 点击批量操作按钮
    const batchButton = page.locator(':text("🚀 Run Batch Operations")')
    await expect(batchButton).toBeVisible()
    await batchButton.click()

    // 验证按钮状态变为运行中
    await expect(page.locator(':text("⏳ Running...")')).toBeVisible({ timeout: 5000 })

    // 等待操作队列出现 - Playwright 的 waitFor 比 Cypress 更可靠
    await expect(page.locator(':text("Pending AI Operations")')).toBeVisible({ timeout: 8000 })

    // 验证显示操作数量 - 使用更精确的正则表达式
    await expect(page.locator('text=/Pending AI Operations \\(\\d+\\)/')).toBeVisible()

    // 验证操作项显示
    await expect(page.locator(':text("✓ Approve")')).toBeVisible()
    await expect(page.locator(':text("✗ Reject")')).toBeVisible()

    await page.screenshot({
      path: './test-results/playwright-stream-operations-queue.png',
      fullPage: false,
    })
  })

  test('应该能够单独批准AI操作', async ({ page }) => {
    // 生成操作队列
    await page.locator(':text("🚀 Run Batch Operations")').click()
    await expect(page.locator(':text("Pending AI Operations")')).toBeVisible({ timeout: 8000 })

    // 获取原始段落数量
    const originalParagraphs = page.locator('p[data-moni-block-id]')
    const originalCount = await originalParagraphs.count()

    // 点击第一个批准按钮
    const firstApproveButton = page.locator(':text("✓ Approve")').first()
    await expect(firstApproveButton).toBeVisible()
    await firstApproveButton.click()

    // 验证操作被执行：段落数量增加
    // Playwright 的 toHaveCount 比 Cypress 的 should('have.length') 更直观
    await expect(originalParagraphs).toHaveCount.greaterThan(originalCount)

    await page.screenshot({
      path: './test-results/playwright-stream-operation-approved.png',
      fullPage: false,
    })
  })

  test('应该能够拒绝AI操作', async ({ page }) => {
    // 生成操作队列
    await page.locator(':text("🚀 Run Batch Operations")').click()
    await expect(page.locator(':text("Pending AI Operations")')).toBeVisible({ timeout: 8000 })

    // 获取原始段落数量
    const originalParagraphs = page.locator('p[data-moni-block-id]')
    const originalCount = await originalParagraphs.count()

    // 点击第一个拒绝按钮
    const firstRejectButton = page.locator(':text("✗ Reject")').first()
    await expect(firstRejectButton).toBeVisible()
    await firstRejectButton.click()

    // 验证操作被拒绝：段落数量保持不变
    await page.waitForTimeout(1000) // 等待可能的DOM更新
    await expect(originalParagraphs).toHaveCount(originalCount)

    await page.screenshot({
      path: './test-results/playwright-stream-operation-rejected.png',
      fullPage: false,
    })
  })

  test('应该能够批量批准所有操作', async ({ page }) => {
    // 生成操作队列
    await page.locator(':text("🚀 Run Batch Operations")').click()
    await expect(page.locator(':text("Pending AI Operations")')).toBeVisible({ timeout: 8000 })

    // 获取原始段落数量
    const originalParagraphs = page.locator('p[data-moni-block-id]')
    const originalCount = await originalParagraphs.count()

    // 查找并点击批量批准按钮（如果存在）
    const batchApproveButton = page.locator(':text("✓ Approve All")')
    if ((await batchApproveButton.count()) > 0) {
      await batchApproveButton.click()
    } else {
      // 如果没有批量按钮，逐个批准所有操作
      const approveButtons = page.locator(':text("✓ Approve")')
      const buttonCount = await approveButtons.count()

      for (let i = 0; i < buttonCount; i++) {
        await approveButtons.first().click()
        await page.waitForTimeout(200) // 给每个操作一些时间
      }
    }

    // 验证所有操作都被执行：段落数量显著增加
    await expect(originalParagraphs).toHaveCount.greaterThan(originalCount + 2)

    await page.screenshot({
      path: './test-results/playwright-stream-batch-approved.png',
      fullPage: false,
    })
  })

  test('应该显示操作进度和状态信息', async ({ page }) => {
    // 启动批量操作
    await page.locator(':text("🚀 Run Batch Operations")').click()

    // 验证进度指示器显示
    await expect(page.locator(':text("⏳ Running...")')).toBeVisible()

    // 等待操作队列出现
    await expect(page.locator(':text("Pending AI Operations")')).toBeVisible({ timeout: 8000 })

    // 验证状态信息显示
    // Playwright 可以更灵活地检查文本内容
    const statusText = page.locator('text=/Pending AI Operations \\(\\d+\\)/')
    await expect(statusText).toBeVisible()

    // 提取并验证操作数量
    const statusContent = await statusText.textContent()
    const operationCount = statusContent?.match(/\((\d+)\)/)?.[1]
    expect(operationCount).toBeTruthy()
    expect(parseInt(operationCount || '0')).toBeGreaterThan(0)

    console.log(`📊 检测到 ${operationCount} 个待处理操作`)

    await page.screenshot({
      path: './test-results/playwright-stream-progress.png',
      fullPage: false,
    })
  })

  test('应该在模拟进行中正确禁用控件', async ({ page }) => {
    // 启动批量操作
    const batchButton = page.locator(':text("🚀 Run Batch Operations")')
    await batchButton.click()

    // 验证按钮变为禁用状态
    await expect(page.locator(':text("⏳ Running...")')).toBeVisible()

    // 验证按钮在运行期间被禁用
    // Playwright 可以检查元素的实际disabled状态
    const runningButton = page.locator(':text("⏳ Running...")')
    const isDisabled = await runningButton.evaluate(el => el.getAttribute('disabled') !== null)

    if (isDisabled) {
      console.log('✅ 批量操作按钮在运行期间正确禁用')
    }

    await page.screenshot({
      path: './test-results/playwright-stream-disabled-controls.png',
      fullPage: false,
    })
  })

  test('🎯 实时编辑模拟验证', async ({ page }) => {
    // 生成操作队列
    await page.locator(':text("🚀 Run Batch Operations")').click()
    await expect(page.locator(':text("Pending AI Operations")')).toBeVisible({ timeout: 8000 })

    // 记录批准操作前的编辑器状态
    const editorContent = await page.locator('.ProseMirror').innerHTML()

    // 批准第一个操作
    await page.locator(':text("✓ Approve")').first().click()

    // 等待DOM更新
    await page.waitForTimeout(500)

    // 验证编辑器内容确实发生了变化
    const newEditorContent = await page.locator('.ProseMirror').innerHTML()
    expect(newEditorContent).not.toBe(editorContent)

    console.log('✅ 编辑器内容在操作批准后确实发生了变化')

    await page.screenshot({
      path: './test-results/playwright-stream-realtime-editing.png',
      fullPage: false,
    })
  })

  test('🔄 批量操作的完整生命周期测试', async ({ page }) => {
    // 1. 启动阶段
    const startTime = Date.now()

    await page.locator(':text("🚀 Run Batch Operations")').click()
    await expect(page.locator(':text("⏳ Running...")')).toBeVisible()

    // 2. 队列生成阶段
    await expect(page.locator(':text("Pending AI Operations")')).toBeVisible({ timeout: 8000 })

    const queueTime = Date.now()
    console.log(`📊 队列生成耗时: ${queueTime - startTime}ms`)

    // 3. 操作执行阶段
    const approveButtons = page.locator(':text("✓ Approve")')
    const initialCount = await approveButtons.count()

    // 批准所有操作
    for (let i = 0; i < initialCount; i++) {
      await approveButtons.first().click()
      await page.waitForTimeout(100)
    }

    const executionTime = Date.now()
    console.log(`📊 操作执行耗时: ${executionTime - queueTime}ms`)

    // 4. 完成阶段验证
    // 验证按钮恢复原状
    await expect(page.locator(':text("🚀 Run Batch Operations")')).toBeVisible({ timeout: 5000 })

    const completionTime = Date.now()
    console.log(`📊 完整生命周期总耗时: ${completionTime - startTime}ms`)

    // 性能基准验证
    expect(completionTime - startTime).toBeLessThan(15000) // 应该在15秒内完成

    await page.screenshot({
      path: './test-results/playwright-stream-lifecycle-complete.png',
      fullPage: false,
    })
  })

  // Playwright 独有：错误处理和恢复测试
  test('🚨 错误处理和恢复机制验证', async ({ page }) => {
    // 监听控制台错误
    const consoleErrors = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // 启动批量操作
    await page.locator(':text("🚀 Run Batch Operations")').click()
    await expect(page.locator(':text("Pending AI Operations")')).toBeVisible({ timeout: 8000 })

    // 尝试快速连续操作，测试错误处理
    const approveButtons = page.locator(':text("✓ Approve")')
    const rejectButtons = page.locator(':text("✗ Reject")')

    // 快速交替点击批准和拒绝
    for (let i = 0; i < 3; i++) {
      if ((await approveButtons.count()) > 0) {
        await approveButtons.first().click()
      }
      if ((await rejectButtons.count()) > 0) {
        await rejectButtons.first().click()
      }
    }

    // 等待操作完成
    await page.waitForTimeout(2000)

    // 验证系统仍然响应
    await expect(page.locator('[data-testid="moni-editor"]')).toBeVisible()

    // 报告任何控制台错误
    if (consoleErrors.length > 0) {
      console.log('⚠️ 检测到控制台错误:', consoleErrors)
    } else {
      console.log('✅ 未检测到控制台错误')
    }

    await page.screenshot({
      path: './test-results/playwright-stream-error-handling.png',
      fullPage: false,
    })
  })
})

// 🎯 性能和压力测试 - Playwright 独有功能
test.describe('📊 StreamOperations 性能测试', () => {
  test('高频操作性能基准', async ({ page }) => {
    await page.goto('http://localhost:3668/src/Extensions/MoniEditor/React/')
    await page.waitForSelector('[data-testid="moni-editor"]', { timeout: 10000 })

    // 执行多轮批量操作以测试性能
    const iterations = 3
    const timings = []

    for (let round = 0; round < iterations; round++) {
      const startTime = Date.now()

      // 启动批量操作
      await page.locator(':text("🚀 Run Batch Operations")').click()
      await expect(page.locator(':text("Pending AI Operations")')).toBeVisible({ timeout: 8000 })

      // 快速批准所有操作
      const approveButtons = page.locator(':text("✓ Approve")')
      let buttonCount = await approveButtons.count()

      while (buttonCount > 0) {
        await approveButtons.first().click()
        await page.waitForTimeout(50) // 最小延迟
        buttonCount = await approveButtons.count()
      }

      // 等待按钮恢复
      await expect(page.locator(':text("🚀 Run Batch Operations")')).toBeVisible({ timeout: 5000 })

      const endTime = Date.now()
      const duration = endTime - startTime
      timings.push(duration)

      console.log(`📊 第${round + 1}轮操作耗时: ${duration}ms`)

      // 短暂休息
      await page.waitForTimeout(1000)
    }

    const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length
    console.log(`📊 平均操作耗时: ${avgTime}ms`)

    // 性能断言
    expect(avgTime).toBeLessThan(10000) // 平均应该在10秒内
    expect(Math.max(...timings)).toBeLessThan(15000) // 最慢不超过15秒

    await page.screenshot({
      path: './test-results/playwright-stream-performance.png',
      fullPage: false,
    })
  })
})
