import { expect,test } from '@playwright/test'

import { DragTestHelper } from '../utils/DragTestHelper'

/**
 * 🎯 基础拖拽操作E2E测试
 * 验证段落拖拽的核心功能
 */
test.describe('基础拖拽操作', () => {
  let dragHelper: DragTestHelper

  test.beforeEach(async ({ page }) => {
    dragHelper = new DragTestHelper(page)
    await dragHelper.setup()
  })

  test('段落向下拖拽', async () => {
    const paragraphs = await dragHelper.getParagraphs()
    expect(paragraphs.length).toBeGreaterThanOrEqual(2)

    // 获取拖拽前的段落顺序
    const beforeTexts = []
    for (const p of paragraphs) {
      const text = await dragHelper.getParagraphText(p)
      beforeTexts.push(text.trim())
    }

    // 将第一个段落拖拽到第二个段落下方
    const dragResult = await dragHelper.dragParagraph(paragraphs[0], paragraphs[1], {
      dragToPosition: 'below',
    })

    expect(dragResult.success).toBe(true)

    // 验证拖拽结果
    const newParagraphs = await dragHelper.getParagraphs()
    const afterTexts = []
    for (const p of newParagraphs) {
      const text = await dragHelper.getParagraphText(p)
      afterTexts.push(text.trim())
    }

    const verifyResult = await dragHelper.verifyDragResult(beforeTexts, afterTexts, 0, 1)
    expect(verifyResult.success).toBe(true)

    dragHelper.recordTest('段落向下拖拽', verifyResult.success, verifyResult)
  })

  test('段落向上拖拽', async () => {
    const paragraphs = await dragHelper.getParagraphs()
    expect(paragraphs.length).toBeGreaterThanOrEqual(2)

    const beforeTexts = []
    for (const p of paragraphs) {
      const text = await dragHelper.getParagraphText(p)
      beforeTexts.push(text.trim())
    }

    // 将第二个段落拖拽到第一个段落上方
    const dragResult = await dragHelper.dragParagraph(paragraphs[1], paragraphs[0], {
      dragToPosition: 'above',
    })

    expect(dragResult.success).toBe(true)

    const newParagraphs = await dragHelper.getParagraphs()
    const afterTexts = []
    for (const p of newParagraphs) {
      const text = await dragHelper.getParagraphText(p)
      afterTexts.push(text.trim())
    }

    const verifyResult = await dragHelper.verifyDragResult(beforeTexts, afterTexts, 1, 0)
    expect(verifyResult.success).toBe(true)

    dragHelper.recordTest('段落向上拖拽', verifyResult.success, verifyResult)
  })

  test('相邻段落拖拽', async () => {
    const paragraphs = await dragHelper.getParagraphs()
    expect(paragraphs.length).toBeGreaterThanOrEqual(2)

    const beforeTexts = []
    for (const p of paragraphs) {
      const text = await dragHelper.getParagraphText(p)
      beforeTexts.push(text.trim())
    }

    // 将第一个段落拖拽到第二个段落下方
    const dragResult = await dragHelper.dragParagraph(paragraphs[0], paragraphs[1], {
      dragToPosition: 'below',
    })

    expect(dragResult.success).toBe(true)

    const newParagraphs = await dragHelper.getParagraphs()
    const afterTexts = []
    for (const p of newParagraphs) {
      const text = await dragHelper.getParagraphText(p)
      afterTexts.push(text.trim())
    }

    // 验证相邻段落位置是否交换
    const firstTwoSwapped = afterTexts[0] === beforeTexts[1] && afterTexts[1] === beforeTexts[0]
    expect(firstTwoSwapped).toBe(true)

    dragHelper.recordTest('相邻段落拖拽', firstTwoSwapped)
  })

  test.afterEach(async () => {
    if (dragHelper) {
      const summary = dragHelper.getTestSummary()
      console.log(`\n📊 测试总结: ${summary.passedTests}/${summary.totalTests} 通过 (${summary.successRate}%)`)
    }
  })
})
