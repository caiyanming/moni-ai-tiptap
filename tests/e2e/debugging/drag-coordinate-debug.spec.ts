/**
 * 🔧 拖拽坐标调试测试
 * 专门用于调试拖拽坐标计算和执行
 */

import { test, expect } from '@playwright/test'
import { DragTestHelper } from '../utils/DragTestHelper'

test.describe('拖拽坐标调试', () => {
  let dragHelper: DragTestHelper

  test.beforeEach(async ({ page }) => {
    dragHelper = new DragTestHelper(page)
    await dragHelper.setup()
  })

  test('调试向下拖拽坐标计算', async ({ page }) => {
    const paragraphs = await dragHelper.getParagraphs()
    expect(paragraphs.length).toBeGreaterThanOrEqual(2)
    
    // 如果只有2个段落，拖拽第一个到第二个下方
    if (paragraphs.length === 2) {
      console.log('⚠️ 只有2个段落，调整测试策略')
    }

    // 获取拖拽前的段落文本和位置
    const beforeTexts = []
    for (const p of paragraphs) {
      const text = await dragHelper.getParagraphText(p)
      beforeTexts.push(text.trim())
    }

    console.log('📍 拖拽前段落信息:')
    for (let i = 0; i < Math.min(3, paragraphs.length); i++) {
      const box = await paragraphs[i].boundingBox()
      const text = beforeTexts[i]
      console.log(`[${i}] ${text.slice(0, 30)}... 位置: ${JSON.stringify(box)}`)
    }

    // 悬停第一个段落，显示拖拽手柄
    await paragraphs[0].hover()
    await page.waitForTimeout(500)

    // 获取拖拽手柄信息
    const svgHandle = page.locator('svg').first()
    await svgHandle.waitFor({ state: 'visible', timeout: 3000 })
    const handleBox = await svgHandle.boundingBox()
    console.log('🎯 拖拽手柄位置:', handleBox)

    // 获取目标段落位置（如果有3个段落则用第3个，否则用第2个）
    const targetIndex = paragraphs.length >= 3 ? 2 : 1
    const targetBox = await paragraphs[targetIndex].boundingBox()
    console.log(`📍 目标段落位置（段落${targetIndex}）:`, targetBox)

    if (handleBox && targetBox) {
      // 计算向下拖拽的目标坐标
      const targetX = targetBox.x + targetBox.width / 2
      const targetYBelow = targetBox.y + targetBox.height + 5
      console.log('🎯 向下拖拽目标坐标:', { x: targetX, y: targetYBelow })

      // 手动执行拖拽操作并记录详细过程
      console.log('🚀 开始拖拽操作...')
      const startX = handleBox.x + handleBox.width / 2
      const startY = handleBox.y + handleBox.height / 2
      
      await page.mouse.move(startX, startY)
      await page.waitForTimeout(200)
      console.log('📍 移动到拖拽手柄:', { x: startX, y: startY })

      await page.mouse.down()
      await page.waitForTimeout(800)
      console.log('✊ 鼠标按下')

      // 分步移动到目标位置
      const steps = 8
      for (let i = 1; i <= steps; i++) {
        const progress = i / steps
        const currentX = startX + (targetX - startX) * progress
        const currentY = startY + (targetYBelow - startY) * progress
        
        await page.mouse.move(currentX, currentY)
        console.log(`📍 移动步骤 ${i}/${steps}: (${Math.round(currentX)}, ${Math.round(currentY)})`)
        await page.waitForTimeout(100)
      }

      await page.mouse.up()
      await page.waitForTimeout(1000)
      console.log('🔓 鼠标释放')

      // 检查拖拽后的结果
      const newParagraphs = await dragHelper.getParagraphs()
      const afterTexts = []
      for (const p of newParagraphs) {
        const text = await dragHelper.getParagraphText(p)
        afterTexts.push(text.trim())
      }

      console.log('📊 拖拽结果对比:')
      console.log('拖拽前:', beforeTexts.map((t, i) => `[${i}] ${t.slice(0, 20)}...`))
      console.log('拖拽后:', afterTexts.map((t, i) => `[${i}] ${t.slice(0, 20)}...`))

      // 验证第一个段落是否成功移动
      const firstParagraphText = beforeTexts[0]
      const newPosition = afterTexts.indexOf(firstParagraphText)
      console.log(`第一个段落从位置 0 移动到位置 ${newPosition}`)

      // 分析结果
      if (newPosition === -1) {
        console.error('❌ 错误：第一个段落消失了')
      } else if (newPosition === 0) {
        console.error('❌ 错误：第一个段落没有移动')
        
        // 进一步调试：检查DOM结构
        const proseMirror = page.locator('.ProseMirror')
        const html = await proseMirror.innerHTML()
        console.log('🔍 当前DOM结构（前500字符）:', html.slice(0, 500))
      } else {
        console.log('✅ 成功：第一个段落成功移动')
      }

      // 使用 DragTestHelper 的验证逻辑
      const verifyResult = await dragHelper.verifyDragResult(beforeTexts, afterTexts, 0, targetIndex)
      console.log('🧪 DragTestHelper验证结果:', verifyResult)
    }
  })

  test('对比向上拖拽和向下拖拽', async ({ page }) => {
    // 测试向上拖拽（已知工作正常）
    console.log('🔼 测试向上拖拽...')
    await page.reload()
    await dragHelper.setup()

    let paragraphs = await dragHelper.getParagraphs()
    const beforeTextsUp = []
    for (const p of paragraphs) {
      const text = await dragHelper.getParagraphText(p)
      beforeTextsUp.push(text.trim())
    }

    // 如果段落少于3个，调整拖拽策略
    let upResult
    if (paragraphs.length >= 3) {
      upResult = await dragHelper.dragParagraph(paragraphs[2], paragraphs[0], {
        dragToPosition: 'above'
      })
    } else if (paragraphs.length === 2) {
      // 拖拽第二个段落到第一个段落上方
      upResult = await dragHelper.dragParagraph(paragraphs[1], paragraphs[0], {
        dragToPosition: 'above'
      })
    } else {
      console.log('❌ 段落数量不足，跳过向上拖拽测试')
      upResult = { success: false, error: '段落数量不足' }
    }
    console.log('向上拖拽结果:', upResult)

    // 测试向下拖拽（已知有问题）
    console.log('🔽 测试向下拖拽...')
    await page.reload()
    await dragHelper.setup()

    paragraphs = await dragHelper.getParagraphs()
    const beforeTextsDown = []
    for (const p of paragraphs) {
      const text = await dragHelper.getParagraphText(p)
      beforeTextsDown.push(text.trim())
    }

    // 如果段落少于3个，调整拖拽策略
    let downResult
    if (paragraphs.length >= 3) {
      downResult = await dragHelper.dragParagraph(paragraphs[0], paragraphs[2], {
        dragToPosition: 'below'
      })
    } else if (paragraphs.length === 2) {
      // 拖拽第一个段落到第二个段落下方
      downResult = await dragHelper.dragParagraph(paragraphs[0], paragraphs[1], {
        dragToPosition: 'below'
      })
    } else {
      console.log('❌ 段落数量不足，跳过向下拖拽测试')
      downResult = { success: false, error: '段落数量不足' }
    }
    console.log('向下拖拽结果:', downResult)

    // 对比两个结果
    console.log('📊 拖拽操作对比:')
    console.log('向上拖拽:', upResult.success ? '✅ 成功' : `❌ 失败: ${upResult.error}`)
    console.log('向下拖拽:', downResult.success ? '✅ 成功' : `❌ 失败: ${downResult.error}`)
  })
})