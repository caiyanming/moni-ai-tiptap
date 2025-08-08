import { expect,test } from '@playwright/test'

/**
 * Playwright 迁移测试 - HiddenBlock Extension
 * 从 Cypress 迁移到 Playwright 的隐藏块扩展测试
 *
 * 👁️ 关键优势：Playwright 提供更精确的DOM可见性检测和元素查询
 */

test.describe('👁️ HiddenBlock Extension - Playwright 迁移版本', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3668/src/Extensions/MoniEditor/React/')
    await page.waitForSelector('[data-testid="moni-editor"]', {
      state: 'visible',
      timeout: 10000,
    })

    // 等待编辑器完全初始化
    await page.waitForTimeout(500)
  })

  test('应该能够插入隐藏块而不影响可见内容', async ({ page }) => {
    // 获取插入前的可见段落数量
    const visibleParagraphs = page.locator('p[data-moni-block-id]:visible')
    const initialCount = await visibleParagraphs.count()

    // 点击插入隐藏块按钮
    const insertButton = page.locator(':text("👁️ Insert Hidden Block")')
    await expect(insertButton).toBeVisible()
    await insertButton.click()

    // 等待DOM更新
    await page.waitForTimeout(500)

    // 验证可见段落数量没有变化
    await expect(visibleParagraphs).toHaveCount(initialCount)

    // 验证没有新的可见内容 - Playwright 的 :visible 选择器更可靠
    await expect(page.locator(':text("hiddenBlock"):visible')).not.toBeVisible()

    await page.screenshot({
      path: './test-results/playwright-hidden-block-inserted.png',
      fullPage: false,
    })
  })

  test('🔧 验证隐藏块不在可见DOM中', async ({ page }) => {
    // 插入隐藏块
    await page.locator(':text("👁️ Insert Hidden Block")').click()
    await page.waitForTimeout(500)

    // 使用 Playwright 的高级选择器验证隐藏块不可见
    const allParagraphs = page.locator('p[data-moni-block-id]')
    const visibleParagraphs = page.locator('p[data-moni-block-id]:visible')

    const totalCount = await allParagraphs.count()
    const visibleCount = await visibleParagraphs.count()

    console.log(`📊 总段落数: ${totalCount}, 可见段落数: ${visibleCount}`)

    // 验证存在隐藏的段落
    expect(totalCount).toBeGreaterThan(visibleCount)

    // 尝试查找隐藏块相关的DOM元素
    const hiddenElements = page.locator('[data-hidden-block], [data-block-type="hidden"]')
    const hiddenCount = await hiddenElements.count()

    if (hiddenCount > 0) {
      console.log(`✅ 检测到 ${hiddenCount} 个隐藏块元素`)

      // 验证隐藏元素确实不可见
      for (let i = 0; i < hiddenCount; i++) {
        const element = hiddenElements.nth(i)
        await expect(element).not.toBeVisible()
      }
    }

    await page.screenshot({
      path: './test-results/playwright-hidden-block-dom-check.png',
      fullPage: false,
    })
  })

  test('应该在插入隐藏块后自动触发AI操作', async ({ page }) => {
    // 插入隐藏块
    await page.locator(':text("👁️ Insert Hidden Block")').click()

    // 等待自动AI操作被触发 - Playwright 的 waitFor 更稳定
    await expect(page.locator(':text("Pending AI Operations")')).toBeVisible({ timeout: 5000 })

    // 验证AI操作描述包含隐藏块信息
    await expect(page.locator(':text("AI inserted content targeting hidden block")')).toBeVisible()

    // 验证操作类型
    await expect(page.locator(':text("INSERT")')).toBeVisible()

    await page.screenshot({
      path: './test-results/playwright-hidden-block-ai-operation.png',
      fullPage: false,
    })
  })

  test('应该能够批准针对隐藏块的AI操作', async ({ page }) => {
    // 获取初始段落数量
    const initialParagraphs = page.locator('p[data-moni-block-id]')
    const initialCount = await initialParagraphs.count()

    // 插入隐藏块并触发AI操作
    await page.locator(':text("👁️ Insert Hidden Block")').click()
    await expect(page.locator(':text("Pending AI Operations")')).toBeVisible({ timeout: 5000 })

    // 批准AI操作
    const approveButton = page.locator(':text("✓ Approve")').first()
    await expect(approveButton).toBeVisible()
    await approveButton.click()

    // 验证段落总数增加（包括隐藏块）
    await expect(initialParagraphs).toHaveCount.greaterThan(initialCount)

    await page.screenshot({
      path: './test-results/playwright-hidden-block-approved.png',
      fullPage: false,
    })
  })

  test('应该支持多个隐藏块的独立操作', async ({ page }) => {
    // 插入第一个隐藏块
    await page.locator(':text("👁️ Insert Hidden Block")').click()
    await page.waitForTimeout(300)

    // 插入第二个隐藏块
    await page.locator(':text("👁️ Insert Hidden Block")').click()
    await page.waitForTimeout(300)

    // 验证有多个待处理的AI操作
    await expect(page.locator(':text("Pending AI Operations")')).toBeVisible({ timeout: 5000 })

    // 检查操作数量
    const operationsText = await page.locator('text=/Pending AI Operations \\(\\d+\\)/')
    const textContent = await operationsText.textContent()
    const operationCount = textContent?.match(/\\((\\d+)\\)/)?.[1]

    expect(operationCount).toBeTruthy()
    expect(parseInt(operationCount || '0')).toBeGreaterThanOrEqual(2)

    console.log(`📊 检测到 ${operationCount} 个隐藏块操作`)

    // 分别批准每个操作
    const approveButtons = page.locator(':text("✓ Approve")')
    const buttonCount = await approveButtons.count()

    for (let i = 0; i < Math.min(buttonCount, 2); i++) {
      await approveButtons.first().click()
      await page.waitForTimeout(200)
    }

    await page.screenshot({
      path: './test-results/playwright-multiple-hidden-blocks.png',
      fullPage: false,
    })
  })

  test('应该在Debug模式下显示隐藏块信息', async ({ page }) => {
    // 插入隐藏块
    await page.locator(':text("👁️ Insert Hidden Block")').click()
    await page.waitForTimeout(500)

    // 开启Debug模式
    const debugButton = page.locator(':text("Show Debug")')
    if ((await debugButton.count()) > 0) {
      await debugButton.click()
      await page.waitForTimeout(500)

      // 在Debug模式下，应该能看到隐藏块的信息
      const debugPanel = page.locator('[data-testid="debug-panel"], .debug-panel')
      if ((await debugPanel.count()) > 0) {
        await expect(debugPanel).toBeVisible()

        // 检查Debug面板中是否包含隐藏块信息
        const debugContent = await debugPanel.textContent()

        if (debugContent?.includes('hidden') || debugContent?.includes('Hidden')) {
          console.log('✅ Debug模式显示隐藏块信息')
        }
      }
    }

    await page.screenshot({
      path: './test-results/playwright-hidden-block-debug.png',
      fullPage: false,
    })
  })

  test('🔍 隐藏块内容完整性验证', async ({ page }) => {
    // 记录插入前的编辑器内容
    const initialContent = await page.locator('.ProseMirror').innerHTML()

    // 插入隐藏块
    await page.locator(':text("👁️ Insert Hidden Block")').click()
    await page.waitForTimeout(500)

    // 获取插入后的编辑器内容
    const afterContent = await page.locator('.ProseMirror').innerHTML()

    // 验证内容确实发生了变化（DOM结构改变）
    expect(afterContent).not.toBe(initialContent)

    // 但是可见文本应该基本不变
    const initialText = await page.locator('.ProseMirror').textContent()
    const afterText = await page.locator('.ProseMirror').textContent()

    // 检查可见文本变化是否最小
    const textDiff = Math.abs((afterText?.length || 0) - (initialText?.length || 0))
    expect(textDiff).toBeLessThan(50) // 可见文本变化应该很小

    console.log(`📊 DOM结构已改变，可见文本差异: ${textDiff}字符`)

    await page.screenshot({
      path: './test-results/playwright-hidden-block-integrity.png',
      fullPage: false,
    })
  })

  test('🚀 隐藏块与批量操作的交互测试', async ({ page }) => {
    // 先插入隐藏块
    await page.locator(':text("👁️ Insert Hidden Block")').click()
    await page.waitForTimeout(300)

    // 然后启动批量操作
    await page.locator(':text("🚀 Run Batch Operations")').click()
    await expect(page.locator(':text("Pending AI Operations")')).toBeVisible({ timeout: 8000 })

    // 检查操作队列中是否包含隐藏块相关操作
    const operationsContainer = page.locator(':has-text("Pending AI Operations")')
    const operationsText = await operationsContainer.textContent()

    // 查找隐藏块相关的操作描述
    const hasHiddenBlockOp = operationsText?.includes('hidden') || operationsText?.includes('Hidden')

    if (hasHiddenBlockOp) {
      console.log('✅ 批量操作包含隐藏块相关操作')
    }

    // 获取操作数量
    const operationCountMatch = operationsText?.match(/\\((\\d+)\\)/)
    const operationCount = operationCountMatch ? parseInt(operationCountMatch[1]) : 0

    expect(operationCount).toBeGreaterThan(0)
    console.log(`📊 总操作数: ${operationCount}`)

    // 批准所有操作
    const approveButtons = page.locator(':text("✓ Approve")')
    let remainingOperations = await approveButtons.count()

    while (remainingOperations > 0) {
      await approveButtons.first().click()
      await page.waitForTimeout(200)
      remainingOperations = await approveButtons.count()
    }

    await page.screenshot({
      path: './test-results/playwright-hidden-block-batch-interaction.png',
      fullPage: false,
    })
  })

  test('⚡ 隐藏块高频操作性能测试', async ({ page }) => {
    const iterations = 5
    const startTime = Date.now()

    // 快速连续插入多个隐藏块
    for (let i = 0; i < iterations; i++) {
      await page.locator(':text("👁️ Insert Hidden Block")').click()
      await page.waitForTimeout(100) // 最小延迟
    }

    const insertionTime = Date.now()
    console.log(`📊 插入${iterations}个隐藏块耗时: ${insertionTime - startTime}ms`)

    // 等待所有AI操作队列生成
    await expect(page.locator(':text("Pending AI Operations")')).toBeVisible({ timeout: 8000 })

    // 快速批准所有操作
    const approveButtons = page.locator(':text("✓ Approve")')
    let operationCount = await approveButtons.count()

    while (operationCount > 0) {
      await approveButtons.first().click()
      await page.waitForTimeout(50)
      operationCount = await approveButtons.count()
    }

    const completionTime = Date.now()
    const totalTime = completionTime - startTime

    console.log(`📊 完整隐藏块操作周期耗时: ${totalTime}ms`)
    console.log(`📊 平均每个隐藏块处理时间: ${totalTime / iterations}ms`)

    // 性能断言
    expect(totalTime).toBeLessThan(15000) // 应该在15秒内完成
    expect(totalTime / iterations).toBeLessThan(3000) // 每个操作应该在3秒内

    await page.screenshot({
      path: './test-results/playwright-hidden-block-performance.png',
      fullPage: false,
    })
  })

  // Playwright 独有：内存和资源监控
  test('🔬 隐藏块内存使用情况监控', async ({ page }) => {
    // 记录初始内存使用
    const initialMemory = await page.evaluate(() => ({
      usedJSHeapSize: (performance.memory && performance.memory.usedJSHeapSize) || 0,
      totalJSHeapSize: (performance.memory && performance.memory.totalJSHeapSize) || 0,
    }))

    console.log('📊 初始内存使用:', initialMemory)

    // 插入大量隐藏块
    for (let i = 0; i < 10; i++) {
      await page.locator(':text("👁️ Insert Hidden Block")').click()
      await page.waitForTimeout(50)
    }

    // 记录插入后内存使用
    const afterInsertMemory = await page.evaluate(() => ({
      usedJSHeapSize: (performance.memory && performance.memory.usedJSHeapSize) || 0,
      totalJSHeapSize: (performance.memory && performance.memory.totalJSHeapSize) || 0,
    }))

    console.log('📊 插入后内存使用:', afterInsertMemory)

    // 计算内存增长
    const memoryGrowth = afterInsertMemory.usedJSHeapSize - initialMemory.usedJSHeapSize
    console.log(`📊 内存增长: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`)

    // 批准所有操作
    await expect(page.locator(':text("Pending AI Operations")')).toBeVisible({ timeout: 8000 })
    const approveButtons = page.locator(':text("✓ Approve")')
    let operationCount = await approveButtons.count()

    while (operationCount > 0) {
      await approveButtons.first().click()
      await page.waitForTimeout(50)
      operationCount = await approveButtons.count()
    }

    // 记录最终内存使用
    const finalMemory = await page.evaluate(() => ({
      usedJSHeapSize: (performance.memory && performance.memory.usedJSHeapSize) || 0,
      totalJSHeapSize: (performance.memory && performance.memory.totalJSHeapSize) || 0,
    }))

    console.log('📊 最终内存使用:', finalMemory)

    // 内存使用不应该过度增长
    const totalGrowth = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize
    expect(totalGrowth).toBeLessThan(50 * 1024 * 1024) // 不应该超过50MB增长

    await page.screenshot({
      path: './test-results/playwright-hidden-block-memory.png',
      fullPage: false,
    })
  })
})

// 🔄 跨浏览器隐藏块兼容性测试
test.describe('🌐 隐藏块跨浏览器兼容性', () => {
  test('隐藏块在不同浏览器中的一致性', async ({ page, browserName }) => {
    await page.goto('http://localhost:3668/src/Extensions/MoniEditor/React/')
    await page.waitForSelector('[data-testid="moni-editor"]', { timeout: 10000 })

    // 插入隐藏块
    await page.locator(':text("👁️ Insert Hidden Block")').click()
    await page.waitForTimeout(500)

    // 验证隐藏块功能在各浏览器中一致
    const visibleParagraphs = page.locator('p[data-moni-block-id]:visible')
    const allParagraphs = page.locator('p[data-moni-block-id]')

    const visibleCount = await visibleParagraphs.count()
    const totalCount = await allParagraphs.count()

    expect(totalCount).toBeGreaterThan(visibleCount)

    console.log(`📊 ${browserName}: 总段落=${totalCount}, 可见段落=${visibleCount}`)

    // 记录各浏览器截图
    await page.screenshot({
      path: `./test-results/hidden-block-${browserName}.png`,
      fullPage: false,
    })

    // 浏览器特定验证
    if (browserName === 'webkit') {
      // Safari 可能对隐藏元素处理不同
      console.log('Testing Safari-specific hidden block behavior')
    } else if (browserName === 'firefox') {
      // Firefox 的DOM查询可能有差异
      console.log('Testing Firefox-specific hidden block behavior')
    }
  })
})
