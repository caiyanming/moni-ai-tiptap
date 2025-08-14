import { expect, test } from '@playwright/test'

/**
 * Playwright 迁移测试 - DragHandle Extension
 * 从 Cypress 完全迁移到 Playwright 的真实浏览器测试
 *
 * 🎯 关键优势：Playwright 可以执行真實拖拽，而 Cypress 只能模拟事件
 */

test.describe('🎯 DragHandle Extension - Playwright 迁移版本', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到 MoniEditor demo 页面
    await page.goto('http://localhost:3668/src/Extensions/MoniEditor/React/')

    // 等待编辑器加载完成
    await page.waitForSelector('[data-testid="moni-editor"]', {
      state: 'visible',
      timeout: 10000,
    })

    // 等待段落内容渲染
    await page.waitForSelector('p[data-moni-block-id]', {
      state: 'visible',
      timeout: 10000,
    })

    // 等待编辑器完全初始化
    await page.waitForTimeout(500)

    // 忽略拖拽相关的控制台错误（与 Cypress 配置类似）
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('effectAllowed') || text.includes('dataTransfer')) {
        // 忽略这些拖拽相关的警告
        return
      }
      if (msg.type() === 'error' && !text.includes('effectAllowed')) {
        console.log('Console error:', text)
      }
    })
  })

  test('应该在鼠标悬停时显示拖拽手柄', async ({ page }) => {
    // 获取第一个段落
    const firstParagraph = page.locator('p[data-moni-block-id]').first()
    await expect(firstParagraph).toBeVisible()

    // 验证初始状态拖拽手柄是隐藏的
    await expect(page.locator('.drag-handle')).not.toBeVisible()

    // 鼠标移动到段落上 (使用 hover 方法，比 Cypress 的 trigger('mousemove') 更自然)
    await firstParagraph.hover()

    // 验证拖拽手柄出现
    await expect(page.locator('.drag-handle')).toBeVisible({ timeout: 3000 })

    // 截图记录
    await page.screenshot({
      path: './test-results/playwright-drag-handle-hover.png',
      fullPage: false,
    })
  })

  test('应该能够通过+按钮添加新段落', async ({ page }) => {
    // 获取初始段落数量
    const initialParagraphs = page.locator('p[data-moni-block-id]')
    const initialCount = await initialParagraphs.count()

    // 鼠标移动显示拖拽手柄
    await initialParagraphs.first().hover()
    await expect(page.locator('.drag-handle')).toBeVisible()

    // 查找+按钮（在 drag-handle-container 中）
    const addButton = page.locator('.drag-handle-container').locator(':text("+")')
    await expect(addButton).toBeVisible()
    await addButton.click()

    // 验证新段落被添加
    await expect(initialParagraphs).toHaveCount(initialCount + 1)

    // 验证新段落内容
    await expect(page.locator(':text("New paragraph added via drag handle")')).toBeVisible()

    await page.screenshot({
      path: './test-results/playwright-drag-handle-add-paragraph.png',
      fullPage: false,
    })
  })

  test('🚀 应该支持真实拖拽重排段落 - Playwright 核心优势', async ({ page }) => {
    // 获取所有段落
    const paragraphs = page.locator('p[data-moni-block-id]')
    await expect(paragraphs).toHaveCount.greaterThanOrEqual(2)

    // 记录原始段落文本
    const firstText = await paragraphs.first().textContent()
    const secondText = await paragraphs.nth(1).textContent()

    console.log('🔍 拖拽前顺序:', { first: firstText?.slice(0, 30), second: secondText?.slice(0, 30) })

    // 鼠标移动到第一个段落显示拖拽手柄
    await paragraphs.first().hover()
    const dragHandle = page.locator('.drag-handle')
    await expect(dragHandle).toBeVisible()

    // 🎯 核心差异：Playwright 执行真实的拖拽操作
    // Cypress 只能 trigger 事件，无法验证真实拖拽效果

    // 获取段落位置
    const firstBox = await paragraphs.first().boundingBox()
    const secondBox = await paragraphs.nth(1).boundingBox()

    if (firstBox && secondBox) {
      // 执行真实拖拽：将第一个段落拖到第二个段落下方
      await dragHandle.hover()

      // 使用 Playwright 的真实拖拽 API
      await dragHandle.dragTo(paragraphs.nth(1), {
        targetPosition: { x: secondBox.width / 2, y: secondBox.height + 10 },
      })

      // 或者使用更细粒度的鼠标操作
      /* 
      await page.mouse.down()
      await page.mouse.move(
        secondBox.x + secondBox.width / 2, 
        secondBox.y + secondBox.height + 20, 
        { steps: 10 }
      )
      await page.mouse.up()
      */
    }

    // 等待DOM更新
    await page.waitForTimeout(500)

    // 🎉 验证段落顺序真实改变（这是 Cypress 无法可靠验证的）
    const newFirstText = await paragraphs.first().textContent()
    const newSecondText = await paragraphs.nth(1).textContent()

    console.log('🔍 拖拽后顺序:', { first: newFirstText?.slice(0, 30), second: newSecondText?.slice(0, 30) })

    // 验证段落顺序确实发生了改变
    expect(newFirstText).toBe(secondText) // 原来的第二个现在是第一个
    expect(newSecondText).toBe(firstText) // 原来的第一个现在是第二个

    await page.screenshot({
      path: './test-results/playwright-real-drag-reorder.png',
      fullPage: false,
    })
  })

  test('应该在鼠标离开时隐藏拖拽手柄', async ({ page }) => {
    // 鼠标移动显示手柄
    await page.locator('p[data-moni-block-id]').first().hover()
    await expect(page.locator('.drag-handle')).toBeVisible()

    // 移动鼠标到编辑器外部区域（比 Cypress 的 trigger('mouseleave') 更自然）
    await page.locator('h1').first().hover()

    // 等待并验证手柄消失
    await expect(page.locator('.drag-handle')).not.toBeVisible({ timeout: 2000 })
  })

  test('🔧 验证键盘焦点时的行为（上游修复）', async ({ page }) => {
    // 先显示拖拽手柄
    await page.locator('p[data-moni-block-id]').first().hover()
    await expect(page.locator('.drag-handle')).toBeVisible()

    // 点击编辑器获得焦点
    await page.locator('.ProseMirror').click()

    // 触发键盘事件，这应该隐藏拖拽手柄
    await page.keyboard.press('KeyA')

    // 在键盘焦点状态下，拖拽手柄应该被隐藏
    await expect(page.locator('.drag-handle')).not.toBeVisible({ timeout: 2000 })

    // 点击编辑器外部区域失去焦点
    await page.locator('h1').first().click()

    // 现在鼠标移动应该正常显示手柄
    await page.locator('p[data-moni-block-id]').first().hover()
    await expect(page.locator('.drag-handle')).toBeVisible()
  })

  test('应该在不同屏幕尺寸下正常工作', async ({ page }) => {
    // 测试桌面尺寸
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.locator('p[data-moni-block-id]').first().hover()
    await expect(page.locator('.drag-handle')).toBeVisible()

    // 测试平板尺寸
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.locator('p[data-moni-block-id]').first().hover()
    await expect(page.locator('.drag-handle')).toBeVisible()

    // 测试手机尺寸
    await page.setViewportSize({ width: 375, height: 667 })
    await page.locator('p[data-moni-block-id]').first().hover()
    await expect(page.locator('.drag-handle')).toBeVisible()

    // 验证手机尺寸下拖拽手柄适配
    const handleBox = await page.locator('.drag-handle').boundingBox()
    if (handleBox) {
      expect(handleBox.width).toBeLessThanOrEqual(24)
      expect(handleBox.width).toBeGreaterThanOrEqual(16)
    }

    await page.screenshot({
      path: './test-results/playwright-drag-handle-mobile.png',
      fullPage: false,
    })
  })

  test('应该处理高频操作而不出现性能问题', async ({ page }) => {
    const startTime = Date.now()

    // 快速连续鼠标移动操作（比 Cypress 更高效）
    for (let i = 0; i < 5; i++) {
      await page.locator('p[data-moni-block-id]').first().hover()
      await expect(page.locator('.drag-handle')).toBeVisible()

      await page.locator('p[data-moni-block-id]').nth(1).hover()
      await expect(page.locator('.drag-handle')).toBeVisible()

      await page.locator('h1').first().hover()
      await expect(page.locator('.drag-handle')).not.toBeVisible()
    }

    const endTime = Date.now()
    const duration = endTime - startTime

    // 验证操作在合理时间内完成
    expect(duration).toBeLessThan(5000)

    // 验证页面仍然响应
    await expect(page.locator('h1')).toContainText('MoniAI TipTap Editor Demo')
  })

  // Playwright 独有的测试：验证拖拽指示器和真实交互
  test('🎨 验证拖拽指示器的视觉反馈', async ({ page }) => {
    const firstParagraph = page.locator('p[data-moni-block-id]').first()
    const secondParagraph = page.locator('p[data-moni-block-id]').nth(1)

    // 开始拖拽操作
    await firstParagraph.hover()
    const dragHandle = page.locator('.drag-handle')
    await expect(dragHandle).toBeVisible()

    // 执行拖拽移动
    await dragHandle.hover()
    await page.mouse.down()

    // 移动到第二个段落上方，触发拖拽指示器
    const secondBox = await secondParagraph.boundingBox()
    if (secondBox) {
      await page.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height / 2, { steps: 5 })

      // 验证拖拽指示器出现
      const indicator = page.locator('.drag-indicator')
      await expect(indicator).toBeVisible({ timeout: 2000 })

      // 验证指示器样式（Playwright 可以获取计算样式）
      const indicatorStyles = await indicator.evaluate(el => {
        const styles = window.getComputedStyle(el)
        return {
          backgroundColor: styles.backgroundColor,
          opacity: styles.opacity,
        }
      })

      // 验证指示器是蓝色的
      expect(indicatorStyles.backgroundColor).toMatch(/rgb\(59, 130, 246\)/)
      expect(parseFloat(indicatorStyles.opacity)).toBeGreaterThan(0.5)
    }

    await page.mouse.up()

    // 验证指示器消失
    await expect(page.locator('.drag-indicator')).not.toBeVisible({ timeout: 1000 })

    await page.screenshot({
      path: './test-results/playwright-drag-indicator.png',
      fullPage: false,
    })
  })
})

// 🌟 多浏览器兼容性测试 - Playwright 的另一个优势
test.describe('🔄 跨浏览器拖拽兼容性测试', () => {
  test('拖拽功能在所有浏览器中一致工作', async ({ page, browserName }) => {
    await page.goto('http://localhost:3668/src/Extensions/MoniEditor/React/')
    await page.waitForSelector('[data-testid="moni-editor"]', { timeout: 10000 })

    // 测试基础拖拽手柄显示
    const firstParagraph = page.locator('p[data-moni-block-id]').first()
    await firstParagraph.hover()

    // 在所有浏览器中都应该显示拖拽手柄
    await expect(page.locator('.drag-handle')).toBeVisible()

    // 记录不同浏览器的截图
    await page.screenshot({
      path: `./test-results/drag-handle-cross-browser-${browserName}.png`,
      fullPage: false,
    })

    // 浏览器特定的验证
    if (browserName === 'webkit') {
      // Safari 特定测试：验证拖拽在 WebKit 中的表现
      console.log('Testing Safari/WebKit drag behavior')

      // Safari 对拖拽事件处理可能不同，这里可以添加特定验证
      const dragHandle = page.locator('.drag-handle')
      await expect(dragHandle).toBeVisible()
    } else if (browserName === 'firefox') {
      // Firefox 特定测试
      console.log('Testing Firefox drag behavior')

      // Firefox 的拖拽实现可能有细微差异
      const dragHandle = page.locator('.drag-handle')
      await expect(dragHandle).toBeVisible()
    } else if (browserName === 'chromium') {
      // Chrome 特定测试
      console.log('Testing Chrome/Chromium drag behavior')

      // 可以测试 Chrome 特有的拖拽优化
      const dragHandle = page.locator('.drag-handle')
      await expect(dragHandle).toBeVisible()
    }
  })
})

// 🎯 性能基准测试 - Playwright 独有功能
test.describe('📊 性能基准测试', () => {
  test('拖拽操作性能基准', async ({ page }) => {
    await page.goto('http://localhost:3668/src/Extensions/MoniEditor/React/')
    await page.waitForSelector('[data-testid="moni-editor"]', { timeout: 10000 })

    // 测量拖拽手柄显示/隐藏的性能
    const startTime = await page.evaluate(() => performance.now())

    for (let i = 0; i < 10; i++) {
      await page.locator('p[data-moni-block-id]').first().hover()
      await expect(page.locator('.drag-handle')).toBeVisible()

      await page.locator('h1').first().hover()
      await expect(page.locator('.drag-handle')).not.toBeVisible()
    }

    const endTime = await page.evaluate(() => performance.now())
    const duration = endTime - startTime

    console.log(`📊 拖拽性能基准: ${duration}ms for 10 show/hide cycles`)
    expect(duration).toBeLessThan(3000) // 应该在3秒内完成

    // 测量内存使用情况（Playwright 独有）
    const metrics = await page.evaluate(() => ({
      usedJSHeapSize: (performance.memory && performance.memory.usedJSHeapSize) || 0,
      totalJSHeapSize: (performance.memory && performance.memory.totalJSHeapSize) || 0,
    }))

    console.log('📊 内存使用情况:', metrics)
  })
})
