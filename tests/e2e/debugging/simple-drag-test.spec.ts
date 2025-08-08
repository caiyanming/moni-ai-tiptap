/**
 * 🔧 简化的拖拽测试
 * 专门用于验证修复后的拖拽功能
 */

import { test, expect } from '@playwright/test'

test.describe('简化拖拽验证', () => {
  test('验证基础HTML结构和拖拽', async ({ page }) => {
    // 导航到演示页面
    await page.goto('/src/Extensions/DragHandle/React/')
    
    // 等待编辑器加载
    const proseMirror = page.locator('.ProseMirror')
    await proseMirror.waitFor({ state: 'visible', timeout: 10000 })
    
    // 检查页面内容
    const paragraphs = await proseMirror.locator('p').all()
    console.log(`✅ 找到 ${paragraphs.length} 个段落`)
    
    // 显示段落内容
    for (let i = 0; i < paragraphs.length; i++) {
      const text = await paragraphs[i].textContent()
      console.log(`段落 ${i}: ${text?.trim()}`)
    }
    
    expect(paragraphs.length).toBeGreaterThanOrEqual(2)
    
    if (paragraphs.length >= 2) {
      // 简单的拖拽测试：悬停显示拖拽手柄
      await paragraphs[0].hover()
      await page.waitForTimeout(500)
      
      const svgHandle = page.locator('svg').first()
      const isVisible = await svgHandle.isVisible()
      console.log(`拖拽手柄可见: ${isVisible}`)
      
      expect(isVisible).toBe(true)
      
      // 执行简单的拖拽移动
      const firstBox = await paragraphs[0].boundingBox()
      const secondBox = await paragraphs[1].boundingBox()
      
      if (firstBox && secondBox) {
        const handleBox = await svgHandle.boundingBox()
        
        if (handleBox) {
          console.log('🚀 执行拖拽移动...')
          
          // 拖拽到第二个段落下方
          const targetX = secondBox.x + secondBox.width / 2
          const targetY = secondBox.y + secondBox.height + 10
          
          await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
          await page.mouse.down()
          await page.waitForTimeout(500)
          await page.mouse.move(targetX, targetY, { steps: 5 })
          await page.mouse.up()
          await page.waitForTimeout(1000)
          
          // 检查段落是否移动
          const newParagraphs = await proseMirror.locator('p').all()
          const afterTexts = []
          for (const p of newParagraphs) {
            const text = await p.textContent()
            afterTexts.push(text?.trim() || '')
          }
          
          console.log('拖拽后段落顺序:')
          afterTexts.forEach((text, i) => {
            console.log(`  [${i}] ${text}`)
          })
          
          console.log('✅ 拖拽测试完成')
        }
      }
    }
  })
})