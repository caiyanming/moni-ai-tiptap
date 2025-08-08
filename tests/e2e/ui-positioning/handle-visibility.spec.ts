import { expect,test } from '@playwright/test'

import { DragTestHelper } from '../utils/DragTestHelper.js'

/**
 * 🎯 拖拽手柄可见性E2E测试
 * 验证拖拽手柄的显示/隐藏机制
 */
test.describe('拖拽手柄可见性', () => {
  let dragHelper: DragTestHelper

  test.beforeEach(async ({ page }) => {
    dragHelper = new DragTestHelper(page)
    await dragHelper.setup()
  })

  test('手柄悬停显示机制', async ({ page }) => {
    const paragraphs = await dragHelper.getParagraphs()
    expect(paragraphs.length).toBeGreaterThanOrEqual(1)

    const firstParagraph = paragraphs[0]
    const svgHandle = page.locator('svg').first()

    // 测试悬停前的状态
    const beforeHover = await svgHandle.isVisible()
    expect(beforeHover).toBe(false)

    // 执行悬停
    await firstParagraph.hover()
    await page.waitForTimeout(500)

    // 测试悬停后的状态
    const afterHover = await svgHandle.isVisible()
    const boundingBox = await svgHandle.boundingBox()
    const hasValidBounds = boundingBox !== null && boundingBox.width > 0 && boundingBox.height > 0

    expect(afterHover).toBe(true)
    expect(hasValidBounds).toBe(true)

    dragHelper.recordTest('手柄悬停显示', afterHover && hasValidBounds, {
      beforeHover,
      afterHover,
      hasValidBounds,
      boundingBox,
    })
  })

  test('多段落手柄一致性', async ({ page }) => {
    const paragraphs = await dragHelper.getParagraphs()
    const results = []

    const maxParagraphs = Math.min(paragraphs.length, 3)
    for (let i = 0; i < maxParagraphs; i += 1) {
      const result = await dragHelper.checkSVGHandleVisibility(paragraphs[i])
      results.push({
        index: i,
        ...result,
      })

      // 移开鼠标避免影响下次测试
      await page.mouse.move(0, 0)
      await page.waitForTimeout(200)
    }

    // 验证所有段落的手柄都能正常显示
    const allHandlesWork = results.every(r => r.isVisible && r.hasValidBounds)
    expect(allHandlesWork).toBe(true)

    dragHelper.recordTest('多段落手柄一致性', allHandlesWork, {
      testedParagraphs: results.length,
      workingHandles: results.filter(r => r.isVisible && r.hasValidBounds).length,
    })
  })

  test('空行手柄行为', async ({ page }) => {
    // 创建包含空行的测试内容
    const proseMirror = page.locator('.ProseMirror')
    await proseMirror.click()
    await page.keyboard.press('Meta+A')

    await page.keyboard.type('第一行')
    await page.keyboard.press('Enter')
    await page.keyboard.press('Enter') // 空行1
    await page.keyboard.press('Enter') // 空行2
    await page.keyboard.type('最后一行')

    await page.waitForTimeout(1000)

    const paragraphs = await proseMirror.locator('p').all()
    const emptyLineResults = []

    for (let i = 0; i < paragraphs.length; i += 1) {
      const p = paragraphs[i]
      const text = await p.textContent()
      const isEmpty = text?.trim() === ''

      if (isEmpty) {
        const result = await dragHelper.checkSVGHandleVisibility(p)
        emptyLineResults.push({
          lineIndex: i,
          handleVisible: result.isVisible,
        })

        // 移开鼠标避免干扰
        await page.mouse.move(0, 0)
        await page.waitForTimeout(200)
      }
    }

    // 验证空行手柄行为（允许部分不一致，但大部分应该可见）
    const visibleCount = emptyLineResults.filter(r => r.handleVisible).length
    const consistencyRate = emptyLineResults.length > 0 ? visibleCount / emptyLineResults.length : 0

    const emptyLineHandlesWork = consistencyRate >= 0.7 // 至少70%可见
    expect(emptyLineHandlesWork).toBe(true)

    dragHelper.recordTest('空行手柄行为', emptyLineHandlesWork, {
      emptyLineCount: emptyLineResults.length,
      visibleCount,
      consistencyRate: `${(consistencyRate * 100).toFixed(1)  }%`,
    })
  })

  test.afterEach(async () => {
    if (dragHelper) {
      const summary = dragHelper.getTestSummary()
      console.log(`\n📊 手柄可见性测试总结: ${summary.passedTests}/${summary.totalTests} 通过`)
    }
  })
})
