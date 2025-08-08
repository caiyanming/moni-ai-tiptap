/**
 * 🎯 E2E拖拽测试助手类
 *
 * 提供统一的拖拽测试工具，包括：
 * - 标准化拖拽操作
 * - 智能等待机制
 * - 性能监控
 * - 详细错误报告
 */

import type { Locator,Page} from '@playwright/test'
import { expect } from '@playwright/test'

export interface DragTestConfig {
  /** 拖拽操作超时时间 (ms) */
  timeout?: number
  /** 是否启用性能监控 */
  enablePerformanceMonitoring?: boolean
  /** 拖拽动画等待时间 (ms) */
  animationWaitTime?: number
  /** 是否验证拖拽指示器 */
  validateIndicators?: boolean
}

export interface DragTestResult {
  /** 是否成功 */
  success: boolean
  /** 执行时间 (ms) */
  duration: number
  /** 错误信息 */
  error?: string
  /** 性能指标 */
  performance?: {
    renderTime: number
    animationTime: number
    domUpdates: number
  }
}

export interface DropInfo {
  /** 目标元素 */
  target: Locator
  /** 插入位置 */
  position: 'before' | 'after' | 'inside'
  /** 坐标信息 */
  coordinates: { x: number; y: number }
}

// 兼容性接口（保持旧API）
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

/**
 * E2E拖拽测试助手类
 */
export class DragTestHelper {
  private page: Page
  private proseMirror: Locator
  private testResults: TestResults
  private config: Required<DragTestConfig>

  constructor(page: Page, config: DragTestConfig = {}) {
    this.page = page
    this.proseMirror = page.locator('.ProseMirror')
    this.testResults = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      errors: [],
    }
    this.config = {
      timeout: 5000,
      enablePerformanceMonitoring: true,
      animationWaitTime: 300,
      validateIndicators: true,
      ...config,
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

  /**
   * 执行标准拖拽操作
   */
  async performDrag(
    source: Locator | string,
    target: Locator | string,
    dropInfo?: Partial<DropInfo>,
  ): Promise<DragTestResult> {
    const startTime = performance.now()

    try {
      // 性能监控开始
      const performanceData = this.config.enablePerformanceMonitoring
        ? await this.startPerformanceMonitoring()
        : undefined

      // 获取源和目标元素
      const sourceElement = typeof source === 'string' ? this.page.locator(source) : source
      const targetElement = typeof target === 'string' ? this.page.locator(target) : target

      // 验证元素存在
      await expect(sourceElement).toBeVisible({ timeout: this.config.timeout })
      await expect(targetElement).toBeVisible({ timeout: this.config.timeout })

      // 获取源元素的拖拽手柄
      const dragHandle = await this.findDragHandle(sourceElement)

      // 执行拖拽操作
      await this.executeDragOperation(dragHandle, targetElement, dropInfo)

      // 等待拖拽动画完成
      if (this.config.animationWaitTime > 0) {
        await this.page.waitForTimeout(this.config.animationWaitTime)
      }

      // 验证拖拽指示器（如果启用）
      if (this.config.validateIndicators) {
        await this.validateDragIndicators()
      }

      // 结束性能监控
      const performance = performanceData ? await this.endPerformanceMonitoring(performanceData) : undefined

      const duration = performance.now() - startTime

      return {
        success: true,
        duration,
        performance,
      }
    } catch (error) {
      const duration = performance.now() - startTime

      return {
        success: false,
        duration,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * 查找元素的拖拽手柄
   */
  private async findDragHandle(element: Locator): Promise<Locator> {
    // 尝试多种拖拽手柄选择器
    const handleSelectors = [
      '[data-moni-menu-drag="true"]',
      '.drag-handle',
      '[draggable="true"]',
      'svg[data-moni-menu-drag]',
    ]

    for (const selector of handleSelectors) {
      const handle = element.locator(selector).first()

      try {
        await expect(handle).toBeVisible({ timeout: 1000 })
        return handle
      } catch {
        continue
      }
    }

    // 如果找不到专用手柄，hover元素让手柄显示
    await element.hover()
    await this.page.waitForTimeout(200)

    // 再次尝试查找手柄
    for (const selector of handleSelectors) {
      const handle = element.locator(selector).first()

      try {
        await expect(handle).toBeVisible({ timeout: 500 })
        return handle
      } catch {
        continue
      }
    }

    throw new Error(`无法找到拖拽手柄，尝试的选择器: ${handleSelectors.join(', ')}`)
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
    options: DragOptions = {},
  ): Promise<{ success: boolean; error?: string; details?: any }> {
    const { dragToPosition = 'below', holdTime = 800, moveSteps = 8, waitAfterDrag = 1000 } = options

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
      const targetY = dragToPosition === 'above' ? targetBox.y - 5 : targetBox.y + targetBox.height + 5

      // Step 4: 执行精确拖拽
      await this.page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
      await this.page.waitForTimeout(200)

      await this.page.mouse.down()
      await this.page.waitForTimeout(holdTime)

      // 分步移动
      const startX = handleBox.x + handleBox.width / 2
      const startY = handleBox.y + handleBox.height / 2

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
    targetIndex: number,
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
      details: { oldIndex: sourceIndex, newIndex: newSourceIndex },
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
      details: { boundingBox },
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
    const successRate =
      this.testResults.totalTests > 0
        ? ((this.testResults.passedTests / this.testResults.totalTests) * 100).toFixed(2)
        : '0'

    return {
      ...this.testResults,
      successRate: parseFloat(successRate),
    }
  }

  /**
   * 执行具体的拖拽操作
   */
  private async executeDragOperation(
    dragHandle: Locator,
    target: Locator,
    dropInfo?: Partial<DropInfo>,
  ): Promise<void> {
    // 获取源和目标的边界框
    const sourceBox = await dragHandle.boundingBox()
    const targetBox = await target.boundingBox()

    if (!sourceBox || !targetBox) {
      throw new Error('无法获取元素边界框')
    }

    // 计算拖拽起点和终点
    const sourceCenter = {
      x: sourceBox.x + sourceBox.width / 2,
      y: sourceBox.y + sourceBox.height / 2,
    }

    let dropPoint = {
      x: targetBox.x + targetBox.width / 2,
      y: targetBox.y + targetBox.height / 2,
    }

    // 根据dropInfo调整落点位置
    if (dropInfo?.position) {
      switch (dropInfo.position) {
        case 'before':
          dropPoint.y = targetBox.y - 5
          break
        case 'after':
          dropPoint.y = targetBox.y + targetBox.height + 5
          break
        case 'inside':
          // 保持默认的中心位置
          break
      }
    }

    if (dropInfo?.coordinates) {
      dropPoint = dropInfo.coordinates
    }

    // 执行拖拽操作
    await this.page.mouse.move(sourceCenter.x, sourceCenter.y)
    await this.page.mouse.down()

    // 移动到目标位置（分多步移动，模拟真实拖拽）
    const steps = 5
    for (let i = 1; i <= steps; i++) {
      const progress = i / steps
      const intermediateX = sourceCenter.x + (dropPoint.x - sourceCenter.x) * progress
      const intermediateY = sourceCenter.y + (dropPoint.y - sourceCenter.y) * progress

      await this.page.mouse.move(intermediateX, intermediateY)
      await this.page.waitForTimeout(20)
    }

    await this.page.mouse.up()
  }

  /**
   * 验证拖拽指示器
   */
  private async validateDragIndicators(): Promise<void> {
    // 验证拖拽指示器已清理
    const indicators = this.page.locator('.drag-indicator, .drop-indicator, .drag-ghost')
    await expect(indicators).toHaveCount(0, { timeout: 1000 })
  }

  /**
   * 开始性能监控
   */
  private async startPerformanceMonitoring() {
    await this.page.evaluate(() => {
      ;(window as any).__dragTestMetrics = {
        startTime: performance.now(),
        domUpdateCount: 0,
        renderStart: null,
      }

      // 监听DOM变化
      const observer = new MutationObserver(() => {
        ;(window as any).__dragTestMetrics.domUpdateCount++
      })

      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
      })
      ;(window as any).__dragTestObserver = observer
    })

    return { started: true }
  }

  /**
   * 结束性能监控
   */
  private async endPerformanceMonitoring(startData: any) {
    return await this.page.evaluate(() => {
      const metrics = (window as any).__dragTestMetrics
      const observer = (window as any).__dragTestObserver

      if (observer) {
        observer.disconnect()
      }

      const endTime = performance.now()

      return {
        renderTime: endTime - metrics.startTime,
        animationTime: endTime - metrics.startTime,
        domUpdates: metrics.domUpdateCount,
      }
    })
  }

  /**
   * 检测内存泄漏
   */
  async detectMemoryLeaks(): Promise<{ hasLeaks: boolean; report: string }> {
    const report = await this.page.evaluate(() => {
      const dragElements = document.querySelectorAll(
        '.drag-handle, .drag-indicator, .drop-indicator, [draggable="true"]',
      )

      const eventListeners = (window as any).__dragEventListeners?.length || 0
      const observers = (window as any).__dragObservers?.length || 0

      return {
        dragElements: dragElements.length,
        eventListeners,
        observers,
        memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
      }
    })

    const hasLeaks = report.eventListeners > 0 || report.observers > 0

    return {
      hasLeaks,
      report: `内存检测报告:
- 拖拽相关DOM元素: ${report.dragElements}
- 未清理事件监听器: ${report.eventListeners}
- 未清理观察器: ${report.observers}
- JS堆内存使用: ${Math.round(report.memoryUsage / 1024 / 1024)}MB
- 存在内存泄漏: ${hasLeaks ? '是' : '否'}`,
    }
  }

  // Playwright断言增强
  async expectParagraphOrder(expectedOrder: string[]) {
    const paragraphs = await this.getParagraphs()
    const actualTexts = []

    for (const p of paragraphs) {
      const text = await this.getParagraphText(p)
      if (text.trim()) {actualTexts.push(text.trim())}
    }

    expect(actualTexts).toEqual(expectedOrder)
  }

  async expectHandleVisible(paragraph: Locator) {
    const result = await this.checkSVGHandleVisibility(paragraph)
    expect(result.isVisible && result.hasValidBounds).toBe(true)
  }
}

/**
 * 创建拖拽测试助手的工厂函数
 */
export function createDragTestHelper(page: Page, config?: DragTestConfig): DragTestHelper {
  return new DragTestHelper(page, config)
}

/**
 * 拖拽测试断言辅助函数
 */
export const dragAssert = {
  /**
   * 断言拖拽操作成功
   */
  async successful(result: DragTestResult): Promise<void> {
    expect(result.success).toBe(true)
    if (result.error) {
      throw new Error(`拖拽操作失败: ${result.error}`)
    }
  },

  /**
   * 断言性能符合要求
   */
  async performant(result: DragTestResult, maxDuration: number = 200): Promise<void> {
    expect(result.duration).toBeLessThan(maxDuration)

    if (result.performance) {
      expect(result.performance.renderTime).toBeLessThan(100)
      expect(result.performance.domUpdates).toBeLessThan(50)
    }
  },

  /**
   * 断言无内存泄漏
   */
  async noMemoryLeaks(helper: DragTestHelper): Promise<void> {
    const { hasLeaks, report } = await helper.detectMemoryLeaks()

    if (hasLeaks) {
      throw new Error(`检测到内存泄漏:\n${report}`)
    }
  },
}
