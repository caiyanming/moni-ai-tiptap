/**
 * 🎯 E2E拖拽测试通用工具类
 * 提供标准化的拖拽测试方法和断言
 */

import { Page, Locator, expect } from '@playwright/test'

export interface DragOptions {
  dragToPosition?: 'above' | 'below'
  holdTime?: number
  moveSteps?: number
  waitAfterDrag?: number
}

export interface TestResults {
  totalTests: number
  passedTests: number
  failedTests: number
  errors: Array<{ testName: string; error: string; details?: any }>
}

export class DragTestHelper {
  private page: Page
  private proseMirror: Locator
  private testResults: TestResults

  constructor(page: Page) {
    this.page = page
    this.proseMirror = page.locator('.ProseMirror')
    this.testResults = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      errors: []
    }
  }

  async setup(baseUrl = 'http://localhost:3666/src/Extensions/DragHandle/React/') {
    // 导航到测试页面
    await this.page.goto(baseUrl)
    
    // 等待编辑器加载
    await this.proseMirror.waitFor({ state: 'visible', timeout: 10000 })
    
    // 插入标准测试内容
    await this.insertStandardTestContent()
    
    console.log('✅ DragTestHelper 初始化完成')
  }

  async insertStandardTestContent() {
    await this.proseMirror.click()
    await this.page.keyboard.press('Meta+A') // 全选
    
    const testContent = `# 标准拖拽测试文档

这是第一个段落，用于测试基础拖拽功能。

这是第二个段落，包含格式化文本：**加粗**和*斜体*。

这是第三个段落，较长文本用于测试复杂拖拽场景的处理能力和性能表现。

## 子标题区域

这是子标题下的第一个段落。

这是子标题下的第二个段落，用于测试跨结构拖拽。`

    await this.page.keyboard.type(testContent.trim())
    await this.page.waitForTimeout(1000) // 等待内容渲染完成
  }

  async getParagraphs(): Promise<Locator[]> {
    return await this.proseMirror.locator('p').all()
  }

  async getParagraphText(paragraphLocator: Locator): Promise<string> {
    return paragraphLocator.textContent() || ''
  }

  async dragParagraph(
    sourceParagraph: Locator, 
    targetParagraph: Locator, 
    options: DragOptions = {}
  ): Promise<{ success: boolean; error?: string; details?: any }> {
    const {
      dragToPosition = 'below',
      holdTime = 800,
      moveSteps = 8,
      waitAfterDrag = 1000
    } = options

    try {
      console.log(`🎯 执行拖拽操作（拖拽到${dragToPosition === 'above' ? '上方' : '下方'}）`)

      // Step 1: 悬停激活拖拽手柄
      await sourceParagraph.hover()
      await this.page.waitForTimeout(500)

      // Step 2: 等待SVG拖拽手柄可见
      const svgHandle = this.page.locator('svg').first()
      await svgHandle.waitFor({ state: 'visible', timeout: 3000 })
      
      const isVisible = await svgHandle.isVisible()
      if (!isVisible) {
        throw new Error('SVG拖拽手柄未变为可见状态')
      }

      // Step 3: 计算拖拽坐标
      const handleBox = await svgHandle.boundingBox()
      const targetBox = await targetParagraph.boundingBox()

      if (!handleBox || !targetBox) {
        throw new Error('无法获取拖拽手柄或目标段落边界框')
      }

      const targetX = targetBox.x + targetBox.width / 2
      const targetY = dragToPosition === 'above' 
        ? targetBox.y - 5 
        : targetBox.y + targetBox.height + 5

      // Step 4: 执行精确拖拽
      await this.page.mouse.move(handleBox.x + handleBox.width/2, handleBox.y + handleBox.height/2)
      await this.page.waitForTimeout(200)
      
      await this.page.mouse.down()
      await this.page.waitForTimeout(holdTime)

      // 分步移动
      const startX = handleBox.x + handleBox.width/2
      const startY = handleBox.y + handleBox.height/2

      for (let i = 1; i <= moveSteps; i += 1) {
        const progress = i / moveSteps
        const currentX = startX + (targetX - startX) * progress
        const currentY = startY + (targetY - startY) * progress
        
        await this.page.mouse.move(currentX, currentY)
        await this.page.waitForTimeout(100)
      }

      await this.page.mouse.up()
      await this.page.waitForTimeout(waitAfterDrag)

      return { success: true, details: { handlePos: handleBox, targetPos: { x: targetX, y: targetY } } }

    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  async verifyDragResult(
    beforeTexts: string[], 
    afterTexts: string[], 
    sourceIndex: number, 
    targetIndex: number
  ): Promise<{ success: boolean; message: string; details?: Record<string, any> }> {
    const sourceText = beforeTexts[sourceIndex]
    const newSourceIndex = afterTexts.indexOf(sourceText)
    
    if (newSourceIndex === -1) {
      return { success: false, message: '源段落在拖拽后消失' }
    }
    
    if (newSourceIndex === sourceIndex) {
      return { success: false, message: '段落位置未发生变化' }
    }
    
    return { 
      success: true, 
      message: `段落从位置${sourceIndex}移动到位置${newSourceIndex}`,
      details: { oldIndex: sourceIndex, newIndex: newSourceIndex }
    }
  }

  async checkSVGHandleVisibility(paragraph: Locator): Promise<{
    isVisible: boolean
    hasValidBounds: boolean
    details: any
  }> {
    await paragraph.hover()
    await this.page.waitForTimeout(500)

    const svgHandle = this.page.locator('svg').first()
    const isVisible = await svgHandle.isVisible()
    const boundingBox = await svgHandle.boundingBox()
    const hasValidBounds = boundingBox !== null && boundingBox.width > 0 && boundingBox.height > 0

    return {
      isVisible,
      hasValidBounds,
      details: { boundingBox }
    }
  }

  recordTest(testName: string, success: boolean, details: Record<string, any> = {}) {
    this.testResults.totalTests += 1
    if (success) {
      this.testResults.passedTests += 1
      console.log(`✅ ${testName}: 通过`)
    } else {
      this.testResults.failedTests += 1
      console.log(`❌ ${testName}: 失败`)
      this.testResults.errors.push({ testName, error: details.error || '未知错误', details })
    }
  }

  getTestSummary() {
    const successRate = this.testResults.totalTests > 0 
      ? (this.testResults.passedTests / this.testResults.totalTests * 100).toFixed(2)
      : '0'

    return {
      ...this.testResults,
      successRate: parseFloat(successRate)
    }
  }

  // Playwright断言增强
  async expectParagraphOrder(expectedOrder: string[]) {
    const paragraphs = await this.getParagraphs()
    const actualTexts = []
    
    for (const p of paragraphs) {
      const text = await this.getParagraphText(p)
      if (text.trim()) actualTexts.push(text.trim())
    }

    expect(actualTexts).toEqual(expectedOrder)
  }

  async expectHandleVisible(paragraph: Locator) {
    const result = await this.checkSVGHandleVisibility(paragraph)
    expect(result.isVisible && result.hasValidBounds).toBe(true)
  }
}