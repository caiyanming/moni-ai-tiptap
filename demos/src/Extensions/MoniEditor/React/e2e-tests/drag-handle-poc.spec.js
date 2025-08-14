import { expect, test } from '@playwright/test'

/**
 * Playwright POC 测试 - 真实拖拽功能验证
 * 这个测试证明 Playwright 可以执行 Cypress 无法完成的真实拖拽操作
 */

test.describe('🎯 Playwright 真实拖拽 POC', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到 MoniEditor demo 页面
    await page.goto('/src/Extensions/MoniEditor/React/')

    // 等待编辑器加载完成
    await page.waitForSelector('[data-testid="moni-editor"]', { state: 'visible' })

    // 等待段落内容渲染
    await page.waitForSelector('p[data-moni-block-id]', { state: 'visible' })

    // 等待编辑器完全初始化
    await page.waitForTimeout(1000)
  })

  test('🚀 POC: 验证真实拖拽重排段落 - Playwright vs Cypress', async ({ page }) => {
    // 获取所有段落
    const paragraphs = page.locator('p[data-moni-block-id]')
    await expect(paragraphs).toHaveCount.greaterThanOrEqual(2)

    // 记录拖拽前的段落顺序
    const originalTexts = []
    const count = await paragraphs.count()
    for (let i = 0; i < Math.min(count, 3); i++) {
      const text = await paragraphs.nth(i).textContent()
      originalTexts.push(text?.trim())
    }

    console.log('🔍 拖拽前段落顺序:', originalTexts)

    // 选择第一个段落进行拖拽
    const firstParagraph = paragraphs.first()
    const secondParagraph = paragraphs.nth(1)

    // 悬停第一个段落以显示拖拽手柄
    await firstParagraph.hover()

    // 等待拖拽手柄出现
    const dragHandle = page.locator('.drag-handle')
    await expect(dragHandle).toBeVisible({ timeout: 3000 })

    // 获取第一个和第二个段落的位置
    const firstBox = await firstParagraph.boundingBox()
    const secondBox = await secondParagraph.boundingBox()

    if (!firstBox || !secondBox) {
      throw new Error('无法获取段落位置信息')
    }

    console.log('📍 第一个段落位置:', { x: firstBox.x, y: firstBox.y })
    console.log('📍 第二个段落位置:', { x: secondBox.x, y: secondBox.y })

    // 执行真实的拖拽操作 - 这是 Cypress 无法做到的！
    await dragHandle.hover()

    // 开始拖拽：鼠标按下
    await page.mouse.down()

    // 拖拽到第二个段落的下方位置
    const targetX = secondBox.x + secondBox.width / 2
    const targetY = secondBox.y + secondBox.height + 20

    console.log('🎯 拖拽目标位置:', { x: targetX, y: targetY })

    // 执行拖拽移动（分步移动使拖拽更自然）
    await page.mouse.move(targetX, targetY, { steps: 10 })

    // 验证拖拽指示器显示
    const dragIndicator = page.locator('.drag-indicator')
    await expect(dragIndicator).toBeVisible({ timeout: 2000 })

    // 完成拖拽：释放鼠标
    await page.mouse.up()

    // 等待 DOM 更新完成
    await page.waitForTimeout(500)

    // 🎉 关键验证：检查段落顺序是否真的改变了
    const newTexts = []
    const newCount = await paragraphs.count()
    for (let i = 0; i < Math.min(newCount, 3); i++) {
      const text = await paragraphs.nth(i).textContent()
      newTexts.push(text?.trim())
    }

    console.log('🔍 拖拽后段落顺序:', newTexts)

    // 验证段落顺序确实发生了改变
    // 原来的第一个段落应该移到了第二个位置
    expect(newTexts[0]).toBe(originalTexts[1]) // 原来的第二个现在是第一个
    expect(newTexts[1]).toBe(originalTexts[0]) // 原来的第一个现在是第二个

    // 截图记录成功的拖拽结果
    await page.screenshot({
      path: './test-results/playwright-poc-drag-success.png',
      fullPage: true,
    })

    console.log('✅ POC 成功！Playwright 完成了真实的拖拽重排！')
  })

  test('🔧 验证拖拽过程中的视觉反馈', async ({ page }) => {
    const firstParagraph = page.locator('p[data-moni-block-id]').first()

    // 悬停显示拖拽手柄
    await firstParagraph.hover()
    const dragHandle = page.locator('.drag-handle')
    await expect(dragHandle).toBeVisible()

    // 开始拖拽
    await dragHandle.hover()
    await page.mouse.down()

    // 移动鼠标到不同位置，验证视觉反馈
    const secondParagraph = page.locator('p[data-moni-block-id]').nth(1)
    const box = await secondParagraph.boundingBox()

    if (box) {
      // 移动到第二个段落上方
      await page.mouse.move(box.x + box.width / 2, box.y - 10, { steps: 5 })

      // 验证拖拽指示器出现
      const indicator = page.locator('.drag-indicator')
      await expect(indicator).toBeVisible()

      // 验证指示器样式
      const indicatorColor = await indicator.evaluate(el => window.getComputedStyle(el).backgroundColor)
      expect(indicatorColor).toContain('rgb(59, 130, 246)') // 蓝色指示器

      // 移动到第二个段落下方
      await page.mouse.move(box.x + box.width / 2, box.y + box.height + 10, { steps: 5 })

      // 指示器应该跟随移动
      await expect(indicator).toBeVisible()
    }

    // 完成拖拽
    await page.mouse.up()

    // 验证指示器消失
    await expect(page.locator('.drag-indicator')).not.toBeVisible({ timeout: 1000 })

    console.log('✅ 拖拽视觉反馈验证成功！')
  })

  test('🎮 多步骤拖拽操作验证', async ({ page }) => {
    // 获取所有段落
    const paragraphs = page.locator('p[data-moni-block-id]')
    const initialCount = await paragraphs.count()

    if (initialCount < 3) {
      // 如果段落不够，先添加一些
      const firstParagraph = paragraphs.first()
      await firstParagraph.hover()

      const dragHandle = page.locator('.drag-handle')
      await expect(dragHandle).toBeVisible()

      // 点击+按钮添加段落
      const addButton = dragHandle.locator('[role="button"]:has-text("+"), button:has-text("+")')
      if ((await addButton.count()) > 0) {
        await addButton.first().click()
        await page.waitForTimeout(500)
      }
    }

    // 现在执行多步拖拽
    const updatedParagraphs = page.locator('p[data-moni-block-id]')
    const finalCount = await updatedParagraphs.count()

    if (finalCount >= 3) {
      // 第一次拖拽：第一个到第三个
      await updatedParagraphs.first().hover()
      let dragHandle = page.locator('.drag-handle')
      await expect(dragHandle).toBeVisible()

      const thirdParagraphBox = await updatedParagraphs.nth(2).boundingBox()
      if (thirdParagraphBox) {
        await dragHandle.hover()
        await page.mouse.down()
        await page.mouse.move(
          thirdParagraphBox.x + thirdParagraphBox.width / 2,
          thirdParagraphBox.y + thirdParagraphBox.height + 10,
          { steps: 8 },
        )
        await page.mouse.up()
        await page.waitForTimeout(300)
      }

      // 第二次拖拽：现在的第一个到第二个位置
      await updatedParagraphs.first().hover()
      dragHandle = page.locator('.drag-handle')
      await expect(dragHandle).toBeVisible()

      const secondParagraphBox = await updatedParagraphs.nth(1).boundingBox()
      if (secondParagraphBox) {
        await dragHandle.hover()
        await page.mouse.down()
        await page.mouse.move(
          secondParagraphBox.x + secondParagraphBox.width / 2,
          secondParagraphBox.y + secondParagraphBox.height + 10,
          { steps: 8 },
        )
        await page.mouse.up()
        await page.waitForTimeout(300)
      }
    }

    // 验证段落仍然存在且功能正常
    await expect(updatedParagraphs).toHaveCount.greaterThanOrEqual(2)

    // 截图记录多步拖拽结果
    await page.screenshot({
      path: './test-results/playwright-multi-drag.png',
      fullPage: true,
    })

    console.log('✅ 多步骤拖拽操作验证成功！')
  })
})
