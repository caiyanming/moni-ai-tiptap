import { expect, test } from '@playwright/test'

import { SimplifiedDragHelper } from '../utils/SimplifiedDragHelper.ts'

/**
 * 🎯 简化的拖拽测试 - 基于成功的simple-drag-test模式
 * 用于验证修复后的ProseMirror拖拽功能
 */
test.describe('简化拖拽测试 - 验证修复', () => {
  let dragHelper: SimplifiedDragHelper

  test.beforeEach(async ({ page }) => {
    await page.goto('/src/Extensions/DragHandle/React/')
    await page.waitForSelector('.ProseMirror', { state: 'visible' })
    await page.waitForTimeout(1000)

    dragHelper = new SimplifiedDragHelper(page)
  })

  test('段落拖拽 - 简化版本', async () => {
    console.log('🎯 [SIMPLIFIED-TEST] 开始段落拖拽测试')

    // 使用简化的拖拽助手
    const result = await dragHelper.executeParagraphDrag()

    console.log('📊 [SIMPLIFIED-TEST] 拖拽结果:', {
      success: result.success,
      beforeTexts: result.beforeTexts.length,
      afterTexts: result.afterTexts.length,
      changed: result.beforeTexts[0] !== result.afterTexts[0],
    })

    if (!result.success) {
      console.log('❌ [SIMPLIFIED-TEST] 拖拽前后段落对比:')
      console.log('   拖拽前:', result.beforeTexts)
      console.log('   拖拽后:', result.afterTexts)
    }

    // 验证拖拽是否成功
    expect(result.success).toBe(true)
    expect(result.beforeTexts).not.toEqual(result.afterTexts)
  })

  test('拖拽验证助手', async () => {
    console.log('🎯 [SIMPLIFIED-TEST] 验证简化拖拽助手')

    const success = await dragHelper.verifyDragSuccess()

    console.log('📊 [SIMPLIFIED-TEST] 助手验证结果:', { success })
    expect(success).toBe(true)
  })
})
