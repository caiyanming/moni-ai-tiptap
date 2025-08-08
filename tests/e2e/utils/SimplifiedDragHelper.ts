import { type Page, type Locator } from '@playwright/test'

/**
 * 🎯 简化的拖拽测试助手
 * 基于simple-drag-test.spec.ts的成功模式创建
 */
export class SimplifiedDragHelper {
  constructor(private page: Page) {}

  /**
   * 执行简化的拖拽操作，模仿成功的简单测试
   */
  async executeParagraphDrag(): Promise<{ success: boolean; beforeTexts: string[]; afterTexts: string[] }> {
    console.log('🎯 [SimplifiedDragHelper] 开始执行简化拖拽操作')

    // 获取拖拽前的段落顺序
    const beforeTexts = await this.page.evaluate(() => {
      const paragraphs = Array.from(document.querySelectorAll('p'))
      return paragraphs.map(p => p.textContent?.trim() || '')
    })

    console.log('🔍 [SimplifiedDragHelper] 拖拽前段落顺序:', beforeTexts)

    // 执行简化的拖拽事件（完全模仿简单测试的成功模式）
    await this.page.evaluate(() => {
      const paragraphs = document.querySelectorAll('p')
      const firstParagraph = paragraphs[0] as HTMLElement
      const secondParagraph = paragraphs[1] as HTMLElement

      if (!firstParagraph || !secondParagraph) {
        console.log('❌ [SimplifiedDragHelper] 找不到段落')
        return false
      }

      console.log('🎯 [SimplifiedDragHelper] 执行拖拽事件序列')

      // 创建DataTransfer对象
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
      console.log('  ✅ [SimplifiedDragHelper] dragstart 事件已触发')

      // 2. drop on second paragraph (below position) after a delay
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
        console.log('  ✅ [SimplifiedDragHelper] drop 事件已触发在第二段落下方')
      }, 100)

      return true
    })

    // 等待拖拽操作完成
    await this.page.waitForTimeout(1000)

    // 获取拖拽后的段落顺序
    const afterTexts = await this.page.evaluate(() => {
      const paragraphs = Array.from(document.querySelectorAll('p'))
      return paragraphs.map(p => p.textContent?.trim() || '')
    })

    console.log('🔍 [SimplifiedDragHelper] 拖拽后段落顺序:', afterTexts)

    const success = JSON.stringify(beforeTexts) !== JSON.stringify(afterTexts)
    console.log(success ? '✅ [SimplifiedDragHelper] 拖拽成功！' : '❌ [SimplifiedDragHelper] 拖拽失败')

    return { success, beforeTexts, afterTexts }
  }

  /**
   * 验证拖拽结果
   */
  async verifyDragSuccess(): Promise<boolean> {
    const result = await this.executeParagraphDrag()
    return result.success
  }
}