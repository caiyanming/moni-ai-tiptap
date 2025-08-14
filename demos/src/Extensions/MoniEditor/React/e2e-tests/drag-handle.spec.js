import { expect, test } from '@playwright/test'

/**
 * Playwright E2E 测试 - DragHandle Extension 真实浏览器测试
 * 这些测试在真实浏览器中运行，验证实际的用户交互
 */

test.describe('🎯 DragHandle Extension - 真实浏览器测试', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到 MoniEditor demo 页面
    await page.goto('/src/Extensions/MoniEditor/React/')

    // 等待编辑器加载完成
    await page.waitForSelector('[data-testid="editor-content"]', { state: 'visible' })

    // 等待编辑器内容渲染
    await page.waitForSelector('.ProseMirror p', { state: 'visible' })
  })

  test('应该在鼠标悬停时显示拖拽手柄', async ({ page }) => {
    // 获取第一个段落
    const firstParagraph = page.locator('p[data-moni-block-id]').first()
    await expect(firstParagraph).toBeVisible()

    // 验证初始状态没有拖拽手柄
    await expect(page.locator('.drag-handle')).not.toBeVisible()

    // 鼠标悬停到段落上
    await firstParagraph.hover()

    // 验证拖拽手柄出现
    await expect(page.locator('.drag-handle')).toBeVisible({ timeout: 2000 })

    // 验证拖拽手柄位置（应该在段落左侧）
    const paragraphBox = await firstParagraph.boundingBox()
    const handleBox = await page.locator('.drag-handle').boundingBox()

    if (paragraphBox && handleBox) {
      // 验证手柄在段落左侧
      expect(handleBox.x).toBeLessThan(paragraphBox.x)
      // 验证手柄与段落垂直对齐
      expect(Math.abs(handleBox.y - paragraphBox.y)).toBeLessThan(10)
    }

    // 截图记录状态
    await page.screenshot({
      path: './test-results/drag-handle-hover.png',
      fullPage: true,
    })
  })

  test('应该能够通过拖拽手柄的+按钮添加新段落', async ({ page }) => {
    const firstParagraph = page.locator('p[data-moni-block-id]').first()

    // 悬停显示拖拽手柄
    await firstParagraph.hover()
    await expect(page.locator('.drag-handle')).toBeVisible()

    // 查找并点击+按钮
    const addButton = page.locator('.drag-handle').locator('button, [role="button"]', { hasText: '+' })
    await expect(addButton).toBeVisible()
    await addButton.click()

    // 验证新段落被添加
    await expect(page.locator('p[data-moni-block-id]')).toHaveCount(3) // 原来2个+新增1个

    // 验证新段落内容
    const newParagraph = page.locator('p:has-text("New paragraph added via drag handle")')
    await expect(newParagraph).toBeVisible()

    // 截图记录结果
    await page.screenshot({
      path: './test-results/drag-handle-add-paragraph.png',
      fullPage: true,
    })
  })

  test('应该支持拖拽重排段落', async ({ page }) => {
    // 获取原始段落顺序
    const paragraphs = page.locator('p[data-moni-block-id]')
    await expect(paragraphs).toHaveCount(2)

    const firstText = await paragraphs.first().textContent()
    const secondText = await paragraphs.nth(1).textContent()

    // 悬停第一个段落显示拖拽手柄
    await paragraphs.first().hover()
    const dragHandle = page.locator('.drag-handle')
    await expect(dragHandle).toBeVisible()

    // 执行拖拽操作：将第一个段落拖到第二个段落下方
    const firstParagraphBox = await paragraphs.first().boundingBox()
    const secondParagraphBox = await paragraphs.nth(1).boundingBox()

    if (firstParagraphBox && secondParagraphBox) {
      // 开始拖拽
      await dragHandle.hover()
      await page.mouse.down()

      // 拖拽到第二个段落下方
      await page.mouse.move(
        secondParagraphBox.x + secondParagraphBox.width / 2,
        secondParagraphBox.y + secondParagraphBox.height + 10,
        { steps: 10 },
      )

      // 验证拖拽指示器显示
      await expect(page.locator('.drag-indicator')).toBeVisible()

      // 完成拖拽
      await page.mouse.up()
    }

    // 等待拖拽完成
    await page.waitForTimeout(500)

    // 验证段落顺序改变
    const newFirstText = await paragraphs.first().textContent()
    const newSecondText = await paragraphs.nth(1).textContent()

    expect(newFirstText).toBe(secondText) // 原来的第二个现在是第一个
    expect(newSecondText).toBe(firstText) // 原来的第一个现在是第二个

    // 截图记录结果
    await page.screenshot({
      path: './test-results/drag-handle-reorder.png',
      fullPage: true,
    })
  })

  test('应该在鼠标离开时隐藏拖拽手柄', async ({ page }) => {
    const firstParagraph = page.locator('p[data-moni-block-id]').first()

    // 悬停显示手柄
    await firstParagraph.hover()
    await expect(page.locator('.drag-handle')).toBeVisible()

    // 移动鼠标到其他区域
    await page.locator('h1').hover()

    // 验证手柄消失
    await expect(page.locator('.drag-handle')).not.toBeVisible({ timeout: 1000 })
  })

  test('🔧 验证键盘焦点时拖拽手柄行为（上游修复）', async ({ page }) => {
    // 使用键盘导航到编辑器
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab') // 导航到编辑器内容区域

    // 验证编辑器获得焦点
    await expect(page.locator('.ProseMirror')).toBeFocused()

    // 在键盘焦点状态下，拖拽手柄不应该显示
    await expect(page.locator('.drag-handle')).not.toBeVisible()

    // 使用鼠标点击编辑器外部
    await page.locator('h1').click()

    // 现在鼠标悬停应该正常显示手柄
    await page.locator('p[data-moni-block-id]').first().hover()
    await expect(page.locator('.drag-handle')).toBeVisible()
  })

  test('应该正确显示拖拽指示器样式', async ({ page }) => {
    const firstParagraph = page.locator('p[data-moni-block-id]').first()

    // 开始拖拽操作
    await firstParagraph.hover()
    const dragHandle = page.locator('.drag-handle')
    await expect(dragHandle).toBeVisible()

    await dragHandle.hover()
    await page.mouse.down()

    // 移动鼠标触发拖拽指示器
    const secondParagraph = page.locator('p[data-moni-block-id]').nth(1)
    const box = await secondParagraph.boundingBox()

    if (box) {
      await page.mouse.move(box.x, box.y + box.height / 2, { steps: 5 })
    }

    // 验证拖拽指示器出现
    const indicator = page.locator('.drag-indicator')
    await expect(indicator).toBeVisible()

    // 验证指示器样式
    const indicatorStyles = await indicator.evaluate(el => {
      const styles = window.getComputedStyle(el)
      return {
        backgroundColor: styles.backgroundColor,
        height: styles.height,
        opacity: styles.opacity,
      }
    })

    // 验证指示器是蓝色的
    expect(indicatorStyles.backgroundColor).toMatch(/rgb\(59, 130, 246\)/) // #3b82f6
    expect(parseFloat(indicatorStyles.opacity)).toBeGreaterThan(0.5)

    await page.mouse.up()

    // 截图记录指示器效果
    await page.screenshot({
      path: './test-results/drag-indicator.png',
      fullPage: true,
    })
  })

  test('应该在不同屏幕尺寸下正常工作', async ({ page }) => {
    // 测试桌面尺寸
    await page.setViewportSize({ width: 1920, height: 1080 })

    let firstParagraph = page.locator('p[data-moni-block-id]').first()
    await firstParagraph.hover()
    await expect(page.locator('.drag-handle')).toBeVisible()

    // 测试平板尺寸
    await page.setViewportSize({ width: 768, height: 1024 })

    firstParagraph = page.locator('p[data-moni-block-id]').first()
    await firstParagraph.hover()
    await expect(page.locator('.drag-handle')).toBeVisible()

    // 测试手机尺寸
    await page.setViewportSize({ width: 375, height: 667 })

    firstParagraph = page.locator('p[data-moni-block-id]').first()
    await firstParagraph.hover()
    await expect(page.locator('.drag-handle')).toBeVisible()

    // 验证手机尺寸下拖拽手柄尺寸调整
    const handleBox = await page.locator('.drag-handle').boundingBox()
    if (handleBox) {
      // 在小屏幕上，拖拽手柄应该稍小一些
      expect(handleBox.width).toBeLessThanOrEqual(24)
      expect(handleBox.height).toBeLessThanOrEqual(24)
    }

    // 截图记录移动端效果
    await page.screenshot({
      path: './test-results/drag-handle-mobile.png',
      fullPage: true,
    })
  })

  test('应该处理高频拖拽操作而不出现性能问题', async ({ page }) => {
    const startTime = Date.now()

    // 快速连续执行多次拖拽悬停操作
    for (let i = 0; i < 10; i++) {
      const paragraph = page.locator('p[data-moni-block-id]').first()
      await paragraph.hover()
      await expect(page.locator('.drag-handle')).toBeVisible()

      // 移动到其他位置
      await page.locator('h1').hover()
      await expect(page.locator('.drag-handle')).not.toBeVisible()
    }

    const endTime = Date.now()
    const duration = endTime - startTime

    // 验证操作在合理时间内完成（应该在3秒内）
    expect(duration).toBeLessThan(3000)

    // 验证页面仍然响应
    await expect(page.locator('h1')).toHaveText('MoniAI TipTap Editor Demo')
  })
})

test.describe('🔄 多浏览器兼容性测试', () => {
  test('拖拽功能在所有浏览器中一致工作', async ({ page, browserName }) => {
    await page.goto('/src/Extensions/MoniEditor/React/')
    await page.waitForSelector('[data-testid="editor-content"]')

    // 测试基础拖拽手柄显示
    const firstParagraph = page.locator('p[data-moni-block-id]').first()
    await firstParagraph.hover()

    // 在所有浏览器中都应该显示拖拽手柄
    await expect(page.locator('.drag-handle')).toBeVisible()

    // 记录不同浏览器的截图
    await page.screenshot({
      path: `./test-results/drag-handle-${browserName}.png`,
      fullPage: true,
    })

    // 浏览器特定的验证
    if (browserName === 'webkit') {
      // Safari 特定测试
      console.log('Testing Safari-specific behavior')
    } else if (browserName === 'firefox') {
      // Firefox 特定测试
      console.log('Testing Firefox-specific behavior')
    }
  })
})
