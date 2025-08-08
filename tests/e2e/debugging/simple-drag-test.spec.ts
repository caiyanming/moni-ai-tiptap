import { test } from '@playwright/test'

/**
 * 🎯 简单拖拽测试
 * 快速验证拖拽功能是否工作
 */
test.describe('简单拖拽测试', () => {
  test('快速验证拖拽功能', async ({ page }) => {
    await page.goto('/src/Extensions/DragHandle/React/')
    await page.waitForSelector('.ProseMirror', { state: 'visible' })
    await page.waitForTimeout(1000)

    // 获取段落顺序（拖拽前）
    const beforeTexts = await page.evaluate(() => {
      const paragraphs = Array.from(document.querySelectorAll('p'))
      return paragraphs.map(p => p.textContent?.trim() || '')
    })

    console.log('🔍 拖拽前段落顺序:', beforeTexts)

    // 触发拖拽事件
    await page.evaluate(() => {
      const paragraphs = document.querySelectorAll('p')
      const firstParagraph = paragraphs[0] as HTMLElement
      const secondParagraph = paragraphs[1] as HTMLElement

      if (!firstParagraph || !secondParagraph) return

      // 简化的拖拽事件序列
      const dataTransfer = new DataTransfer()
      
      // 1. dragstart on first paragraph
      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer
      })
      Object.defineProperty(dragStartEvent, 'target', { 
        value: firstParagraph, 
        configurable: true 
      })
      document.dispatchEvent(dragStartEvent)

      // 2. drop on second paragraph (below position)
      setTimeout(() => {
        const rect = secondParagraph.getBoundingClientRect()
        const dropEvent = new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          clientX: rect.x + rect.width / 2,
          clientY: rect.y + rect.height + 5,
          dataTransfer
        })
        Object.defineProperty(dropEvent, 'target', { 
          value: secondParagraph, 
          configurable: true 
        })
        document.dispatchEvent(dropEvent)
      }, 100)
    })

    // 等待拖拽操作完成
    await page.waitForTimeout(1000)

    // 获取段落顺序（拖拽后）
    const afterTexts = await page.evaluate(() => {
      const paragraphs = Array.from(document.querySelectorAll('p'))
      return paragraphs.map(p => p.textContent?.trim() || '')
    })

    console.log('🔍 拖拽后段落顺序:', afterTexts)

    // 检查是否成功
    const isSuccess = JSON.stringify(beforeTexts) !== JSON.stringify(afterTexts)
    console.log(isSuccess ? '✅ 拖拽成功！段落顺序已改变' : '❌ 拖拽失败：段落顺序未改变')
    
    if (isSuccess) {
      console.log('🎉 测试通过：拖拽功能正常工作')
    }
  })
})