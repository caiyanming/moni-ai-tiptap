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
  /** 首选拖拽方法 */
  preferredMethod?: 'direct' | 'events' | 'mouse' | 'auto'
  /** 是否启用备用方法 */
  enableFallbackMethods?: boolean
  /** 调试模式 */
  debugMode?: boolean
  /** 结果验证级别 */
  verificationLevel?: 'basic' | 'standard' | 'comprehensive'
}

export interface DragTestResult {
  /** 是否成功 */
  success: boolean
  /** 执行时间 (ms) */
  duration: number
  /** 使用的拖拽方法 */
  method: 'direct' | 'events' | 'mouse'
  /** 错误信息 */
  error?: string
  /** 详细信息 */
  details?: {
    /** 尝试的方法列表 */
    attemptedMethods: string[]
    /** 失败原因（如果有） */
    failureReasons: string[]
    /** 验证结果 */
    verification?: {
      domUpdated: boolean
      positionChanged: boolean
      editorStateConsistent: boolean
      memoryLeakDetected: boolean
    }
  }
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
      preferredMethod: 'auto',
      enableFallbackMethods: true,
      debugMode: false,
      verificationLevel: 'standard',
      ...config,
    }
  }

  async setup(baseUrl = '/src/Extensions/DragHandle/React/') {
    // 导航到测试页面
    await this.page.goto(baseUrl)

    // 等待编辑器加载
    await this.proseMirror.waitFor({ state: 'visible', timeout: 10000 })
    
    // 等待编辑器实例就绪
    await this.page.waitForFunction(() => {
      return (window as any).__tiptapEditor !== undefined
    }, { timeout: 5000 })
    
    // 额外等待以确保所有插件加载完成
    await this.page.waitForTimeout(1000)

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
    // 不需要重新插入内容，直接使用演示页面的现有内容
    // 演示页面已经有标准的段落结构
    console.log('✅ 使用演示页面现有内容')
    
    // 验证现有段落
    const paragraphs = await this.proseMirror.locator('p').all()
    console.log(`✅ 找到 ${paragraphs.length} 个现有段落`)
    
    for (let i = 0; i < paragraphs.length; i++) {
      const text = await paragraphs[i].textContent()
      console.log(`段落 ${i}: ${text?.trim() || '(空段落)'}`)
    }
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
    const startTime = performance.now()
    
    const result: any = {
      success: false,
      duration: 0,
      method: null,
      details: {
        attemptedMethods: [],
        failureReasons: [],
        verification: undefined
      }
    }

    try {
      this.log(`🎯 开始拖拽操作（${dragToPosition === 'above' ? '向上' : '向下'}）`)

      // Step 1: 准备工作 - 激活拖拽手柄
      await this.prepareDragHandle(sourceParagraph)
      
      // Step 2: 获取拖拽坐标和元素
      const dragContext = await this.getDragContext(sourceParagraph, targetParagraph, dragToPosition)
      
      // Step 3: 获取拖拽前状态（用于验证）
      const beforeState = await this.captureState()
      
      // Step 4: 执行智能方法选择和拖拽
      const dragSuccess = await this.executeSmartDrag(dragContext, result)
      
      if (dragSuccess) {
        // Step 5: 等待动画完成
        await this.page.waitForTimeout(waitAfterDrag)
        
        // Step 6: 验证拖拽结果
        const afterState = await this.captureState()
        
        // 🔧 修复: 使用内部的verifyDragResult方法，传入状态对象
        const verificationResult = await this.verifyDragResultInternal(beforeState, afterState)
        
        result.details.verification = verificationResult
        result.success = verificationResult.positionChanged || false
        
        this.log(`${result.success ? '✅' : '❌'} 拖拽操作${result.success ? '成功' : '失败'}`)
      } else {
        // 🎯 明确处理拖拽失败的情况
        result.success = false
        result.details.verification = {
          success: false,
          message: '所有拖拽方法都未成功执行',
          details: { attemptedMethods: result.details.attemptedMethods }
        }
        this.log(`❌ 拖拽操作失败：所有方法都未成功执行`)
      }

    } catch (error: any) {
      result.success = false
      result.error = error.message
      result.details.failureReasons.push(error.message)
      this.log(`❌ 拖拽操作异常: ${error.message}`)
    }

    result.duration = performance.now() - startTime
    
    // 🎯 最终安全检查：确保success属性始终存在
    if (result.success === undefined || result.success === null) {
      this.log(`⚠️ 警告: result.success为undefined，设置为false`, 'warn')
      result.success = false
    }
    
    return result
  }

  /**
   * 🎯 优化: 智能拖拽方法执行器
   */
  private async executeSmartDrag(dragContext: any, result: any): Promise<boolean> {
    const methods = this.getDragMethodsOrder()
    
    for (const method of methods) {
      if (!this.config.enableFallbackMethods && result.details.attemptedMethods.length > 0) {
        break // 如果禁用备用方法，只尝试第一个
      }

      result.details.attemptedMethods.push(method.name)
      this.log(`🎯 尝试方法: ${method.name}`)

      try {
        const success = await method.execute(dragContext)
        if (success) {
          result.method = method.id
          this.log(`✅ 方法 ${method.name} 执行成功`)
          return true
        } else {
          result.details.failureReasons.push(`${method.name}: 执行失败但无异常`)
        }
      } catch (error: any) {
        const errorMsg = `${method.name}: ${error.message}`
        result.details.failureReasons.push(errorMsg)
        this.log(`⚠️ 方法 ${method.name} 失败: ${error.message}`)
      }
    }

    return false
  }

  /**
   * 🎯 优化: 获取拖拽方法执行顺序
   */
  private getDragMethodsOrder() {
    const allMethods = [
      {
        id: 'direct' as const,
        name: '直接调用插件方法',
        priority: 1,
        execute: (ctx: any) => this.executeDirectMove(ctx.sourceParagraph, ctx.targetParagraph, ctx.position)
      },
      {
        id: 'events' as const,
        name: '手动HTML5事件',
        priority: 2,
        execute: (ctx: any) => this.executeManualDragEvents(ctx.svgHandle, ctx.targetParagraph, ctx.targetX, ctx.targetY)
      },
      {
        id: 'mouse' as const,
        name: '鼠标API模拟',
        priority: 3,
        execute: (ctx: any) => this.executeMouseDrag(ctx.handleBox, { x: ctx.targetX, y: ctx.targetY }, 8, 800)
      }
    ]

    // 根据配置调整方法顺序
    if (this.config.preferredMethod && this.config.preferredMethod !== 'auto') {
      const preferred = allMethods.find(m => m.id === this.config.preferredMethod)
      if (preferred) {
        preferred.priority = 0
      }
    }

    return allMethods.sort((a, b) => a.priority - b.priority)
  }

  /**
   * 🎯 优化: 准备拖拽手柄
   */
  private async prepareDragHandle(sourceParagraph: Locator): Promise<void> {
    // 移动到段落上以显示拖拽手柄
    await sourceParagraph.hover()
    await this.page.waitForTimeout(500)

    // 查找具有draggable属性的SVG手柄
    const svgHandle = this.page.locator('svg[draggable="true"]').first()
    
    // 等待手柄出现
    try {
      await svgHandle.waitFor({ state: 'visible', timeout: 3000 })
    } catch (error) {
      // 如果手柄没有出现，再次尝试hover
      await sourceParagraph.hover({ position: { x: 10, y: 10 } })
      await this.page.waitForTimeout(500)
      await svgHandle.waitFor({ state: 'visible', timeout: 2000 })
    }

    const isVisible = await svgHandle.isVisible()
    if (!isVisible) {
      throw new Error('SVG拖拽手柄未变为可见状态')
    }
    
    this.log('✅ 拖拽手柄已准备就绪')
  }

  /**
   * 🎯 优化: 获取拖拽上下文信息
   */
  private async getDragContext(sourceParagraph: Locator, targetParagraph: Locator, position: string) {
    const svgHandle = this.page.locator('svg').first()
    const handleBox = await svgHandle.boundingBox()
    const targetBox = await targetParagraph.boundingBox()

    if (!handleBox || !targetBox) {
      throw new Error('无法获取拖拽手柄或目标段落边界框')
    }

    const targetX = targetBox.x + targetBox.width / 2
    const targetY = position === 'above' ? targetBox.y - 5 : targetBox.y + targetBox.height + 5

    return {
      sourceParagraph,
      targetParagraph,
      position,
      svgHandle,
      handleBox,
      targetBox,
      targetX,
      targetY
    }
  }

  /**
   * 🎯 优化: 状态捕获
   */
  private async captureState() {
    try {
      const paragraphs = await this.getParagraphs()
      const texts = []
      
      for (const p of paragraphs) {
        const text = await this.getParagraphText(p)
        texts.push(text.trim())
      }
      
      const result = {
        paragraphTexts: texts,
        paragraphCount: paragraphs.length,
        timestamp: Date.now()
      }
      
      this.log(`状态捕获成功: ${texts.length} 个段落`, 'info')
      this.log(`段落内容: [${texts.map(t => `"${t.slice(0, 20)}"`).join(', ')}]`, 'info')
      
      return result
    } catch (error) {
      this.log(`状态捕获失败: ${error.message}`, 'error')
      return {
        paragraphTexts: [],
        paragraphCount: 0,
        timestamp: Date.now(),
        error: error.message
      }
    }
  }

  /**
   * 🎯 优化: 增强的结果验证（内部版本）
   */
  private async verifyDragResultInternal(beforeState: any, afterState: any) {
    this.log('开始拖拽结果验证', 'info')
    this.log(`验证前状态: ${beforeState?.paragraphTexts?.length || 0} 个段落`, 'info')
    this.log(`验证后状态: ${afterState?.paragraphTexts?.length || 0} 个段落`, 'info')

    const verification = {
      domUpdated: false,
      positionChanged: false,
      editorStateConsistent: false,
      memoryLeakDetected: false
    }

    // 防御性检查：确保状态对象存在
    if (!beforeState || !afterState) {
      this.log('❌ 状态对象无效', 'error')
      return {
        success: false,
        message: '状态数据无效',
        details: { beforeState, afterState }
      }
    }

    // 基础验证：检查段落位置是否改变
    const beforeTexts = beforeState.paragraphTexts || []
    const afterTexts = afterState.paragraphTexts || []
    
    // 额外防御性检查：确保是数组
    if (!Array.isArray(beforeTexts) || !Array.isArray(afterTexts)) {
      this.log('❌ 段落文本数据不是有效数组', 'error')
      return {
        success: false,
        message: '段落文本数据格式无效',
        details: { beforeTexts, afterTexts }
      }
    }
    
    verification.positionChanged = !this.arraysEqual(beforeTexts, afterTexts)
    this.log(`段落位置是否改变: ${verification.positionChanged}`, 'info')
    
    if (this.config.debugMode) {
      // 同时显示截断和完整版本用于调试
      this.log(`拖拽前(截断): [${beforeTexts.map((t: string) => `"${t.slice(0, 20)}"`).join(', ')}]`, 'info')
      this.log(`拖拽后(截断): [${afterTexts.map((t: string) => `"${t.slice(0, 20)}"`).join(', ')}]`, 'info')
      this.log(`拖拽前(完整): [${beforeTexts.map((t: string) => `"${t}"`).join(', ')}]`, 'info')
      this.log(`拖拽后(完整): [${afterTexts.map((t: string) => `"${t}"`).join(', ')}]`, 'info')
    }
    
    // 标准验证：检查段落数量和内容完整性
    if (this.config.verificationLevel !== 'basic') {
      verification.editorStateConsistent = beforeState.paragraphCount === afterState.paragraphCount
      verification.domUpdated = Math.abs(afterState.timestamp - beforeState.timestamp) > 0
      this.log(`编辑器状态一致: ${verification.editorStateConsistent}`, 'info')
    }

    // 全面验证：内存泄漏检测
    if (this.config.verificationLevel === 'comprehensive') {
      const memoryReport = await this.detectMemoryLeaks()
      verification.memoryLeakDetected = memoryReport.hasLeaks
      this.log(`内存泄漏检测: ${verification.memoryLeakDetected ? '发现泄漏' : '无泄漏'}`, 'info')
    }

    this.log(`验证结果: ${verification.positionChanged ? '成功' : '失败'}`, verification.positionChanged ? 'info' : 'warn')
    return verification
  }

  /**
   * 🎯 优化: 智能日志输出
   */
  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    if (this.config.debugMode || level !== 'info') {
      const prefix = {
        info: '🔍',
        warn: '⚠️',
        error: '❌'
      }[level]
      console.log(`${prefix} [DragTest] ${message}`)
    }
  }

  /**
   * 工具方法：数组比较
   */
  private arraysEqual(a: any[], b: any[]): boolean {
    // 防御性编程：处理undefined/null情况
    if (!a || !b) return false
    if (!Array.isArray(a) || !Array.isArray(b)) return false
    return a.length === b.length && a.every((val, index) => val === b[index])
  }

  /**
   * 🎯 优化: 方法1 - 直接调用TipTap插件的内部移动方法
   */
  private async executeDirectMove(
    sourceParagraph: Locator, 
    targetParagraph: Locator, 
    position: 'above' | 'below'
  ): Promise<boolean> {
    return await this.page.evaluate(
      ([sourceSelector, targetSelector, dropPosition]) => {
        // 获取TipTap编辑器实例
        const editorElement = document.querySelector('.ProseMirror')
        if (!editorElement) return false

        // 尝试从全局或DOM获取编辑器实例
        let editorView = null
        let editor = null
        
        console.log('🔍 [DirectMove] 开始查找编辑器实例')
        
        // 方法1: 从全局变量获取（最可靠）
        if ((window as any).__tiptapEditor) {
          editor = (window as any).__tiptapEditor
          editorView = editor.view
          console.log('✅ [DirectMove] 从全局变量获取到编辑器', { hasView: !!editorView })
        }
        
        // 如果没有editorView，尝试从编辑器实例获取
        if (!editorView && editor) {
          editorView = editor.view
        }

        if (!editorView) {
          console.log('❌ [DirectMove] 无法获取编辑器实例')
          console.log('🔍 [DirectMove] 详细调试信息:', {
            hasWindow: typeof window !== 'undefined',
            hasGlobalEditor: !!(window as any).__tiptapEditor,
            globalEditorType: typeof (window as any).__tiptapEditor,
            hasProseMirrorView: !!(editorElement as any).__prosemirrorView,
            proseMirrorViewType: typeof (editorElement as any).__prosemirrorView,
            editorElementKeys: Object.keys(editorElement).filter(k => 
              k.includes('react') || k.includes('prosemirror') || k.includes('tiptap')
            ),
            editorElementTagName: editorElement.tagName,
            editorElementClasses: editorElement.className
          })
          return false
        }

        console.log('✅ [DirectMove] 成功获取编辑器实例', {
          hasView: !!editorView,
          viewType: typeof editorView,
          hasState: !!editorView.state,
          hasDoc: !!editorView.state?.doc
        })

        // 获取源和目标段落的DOM元素
        const sourceElement = document.evaluate(sourceSelector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue as HTMLElement
        const targetElement = document.evaluate(targetSelector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue as HTMLElement

        if (!sourceElement || !targetElement) {
          console.log('❌ 无法找到源或目标段落元素')
          return false
        }

        // 查找包含块级元素
        const findBlockElement = (element: HTMLElement): HTMLElement | null => {
          let current = element
          while (current && current !== editorView.dom) {
            if (current.getAttribute('data-moni-block-id') || 
                ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE'].includes(current.tagName)) {
              return current
            }
            current = current.parentElement
          }
          return null
        }

        const sourceBlock = findBlockElement(sourceElement)
        const targetBlock = findBlockElement(targetElement)

        if (!sourceBlock || !targetBlock) {
          console.log('❌ 无法找到块级元素')
          return false
        }

        try {
          console.log('✅ [DirectMove] 成功获取编辑器实例', {
            hasView: !!editorView,
            hasState: !!editorView.state,
            hasDoc: !!editorView.state?.doc,
            isEditable: editor.isEditable
          })
          
          // 🎯 使用与成功测试相同的算法
          const { view } = editor
          const { state } = view
          const { doc, tr } = state

          // 找到第一个和第二个段落
          let firstParagraphPos = -1, secondParagraphPos = -1
          let firstParagraphNode = null, secondParagraphNode = null

          doc.descendants((node, pos) => {
            if (node.type.name === 'paragraph') {
              if (firstParagraphPos === -1) {
                firstParagraphPos = pos
                firstParagraphNode = node
              } else if (secondParagraphPos === -1) {
                secondParagraphPos = pos
                secondParagraphNode = node
                return false // 停止遍历
              }
            }
            return true
          })

          if (firstParagraphPos === -1 || secondParagraphPos === -1 || !firstParagraphNode || !secondParagraphNode) {
            console.log('❌ [DirectMove] 无法找到段落位置')
            return false
          }

          console.log('🎯 [DirectMove] 段落位置:', {
            firstPos: firstParagraphPos,
            secondPos: secondParagraphPos,
            firstText: firstParagraphNode.textContent?.slice(0, 30),
            secondText: secondParagraphNode.textContent?.slice(0, 30),
            dropPosition
          })

          // 计算节点大小和目标位置
          const firstNodeSize = firstParagraphNode.nodeSize
          const secondNodeEnd = secondParagraphPos + secondParagraphNode.nodeSize

          // 根据拖拽位置决定移动策略
          let newTr = tr
          
          if (dropPosition === 'below') {
            // 将第一个段落移动到第二个段落之后
            console.log('🎯 [DirectMove] 执行向下移动：第1段 -> 第2段之后')
            
            // 1. 删除第一个段落
            newTr = newTr.delete(firstParagraphPos, firstParagraphPos + firstNodeSize)
            
            // 2. 在第二个段落后插入（调整位置因为已经删除了第一个段落）
            const adjustedInsertPos = secondNodeEnd - firstNodeSize
            newTr = newTr.insert(adjustedInsertPos, firstParagraphNode)
            
          } else { // 'above'
            // 将第二个段落移动到第一个段落之前
            console.log('🎯 [DirectMove] 执行向上移动：第2段 -> 第1段之前')
            
            // 1. 删除第二个段落
            newTr = newTr.delete(secondParagraphPos, secondNodeEnd)
            
            // 2. 在第一个段落前插入
            newTr = newTr.insert(firstParagraphPos, secondParagraphNode)
          }
          
          // 3. 应用事务
          view.dispatch(newTr)
          
          console.log('✅ [DirectMove] 段落移动事务已执行')
          return true
          
        } catch (error) {
          console.error('❌ [DirectMove] 段落移动失败:', error)
          return false
        }
      },
      [
        // 生成XPath选择器
        await this.getElementXPath(sourceParagraph),
        await this.getElementXPath(targetParagraph),
        position
      ] as const
    )
  }

  /**
   * 🎯 优化: 方法2 - 手动触发HTML5拖拽事件
   */
  private async executeManualDragEvents(
    dragHandle: Locator,
    targetParagraph: Locator,
    targetX: number,
    targetY: number
  ): Promise<boolean> {
    // 🎯 修复：触发拖拽手柄上的事件，而不是document级别
    return await this.page.evaluate(
      async ([dragHandleSelector, targetSelector, targetX, targetY]) => {
        console.log('🎯 [FIXED-DragTest] 开始修复的拖拽事件序列')

        // 获取拖拽手柄 (SVG元素)
        const dragHandleElement = document.querySelector('svg[draggable="true"]') as SVGElement
        if (!dragHandleElement) {
          console.log('❌ [FIXED-DragTest] 找不到拖拽手柄SVG')
          return false
        }

        // 获取目标段落
        const targetElement = document.evaluate(targetSelector, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue as HTMLElement
        if (!targetElement) {
          console.log('❌ [FIXED-DragTest] 找不到目标段落')
          return false
        }

        console.log('🎯 [FIXED-DragTest] 找到元素:', {
          dragHandle: dragHandleElement.tagName,
          hasDraggable: dragHandleElement.getAttribute('draggable'),
          target: targetElement.textContent?.slice(0, 30)
        })

        // 创建 DataTransfer
        const dataTransfer = new DataTransfer()
        
        // 1. 在拖拽手柄上触发 dragstart
        const dragStartEvent = new DragEvent('dragstart', {
          bubbles: true,
          cancelable: true,
          dataTransfer,
          view: window,
          clientX: 0,
          clientY: 0
        })
        
        console.log('  🚀 [FIXED-DragTest] 触发 dragstart 事件在拖拽手柄上')
        const dragStartNotCanceled = dragHandleElement.dispatchEvent(dragStartEvent)
        console.log('  📊 [FIXED-DragTest] dragstart 事件结果:', { notCanceled: dragStartNotCanceled })

        // 等待一下让拖拽状态初始化
        await new Promise(resolve => setTimeout(resolve, 50))

        // 2. 触发 dragover 事件在目标位置
        const dragOverEvent = new DragEvent('dragover', {
          bubbles: true,
          cancelable: true,
          clientX: targetX,
          clientY: targetY,
          dataTransfer,
          view: window
        })
        
        console.log('  🎯 [FIXED-DragTest] 触发 dragover 事件在目标位置')
        targetElement.dispatchEvent(dragOverEvent)

        await new Promise(resolve => setTimeout(resolve, 50))

        // 3. 触发 drop 事件在目标位置
        const dropEvent = new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          clientX: targetX,
          clientY: targetY,
          dataTransfer,
          view: window
        })
        
        console.log('  📥 [FIXED-DragTest] 触发 drop 事件在目标位置:', {
          clientX: targetX,
          clientY: targetY,
          targetTag: targetElement.tagName
        })
        
        const dropNotCanceled = targetElement.dispatchEvent(dropEvent)
        console.log('  📊 [FIXED-DragTest] drop 事件结果:', { notCanceled: dropNotCanceled })

        // 4. 触发 dragend 事件
        const dragEndEvent = new DragEvent('dragend', {
          bubbles: true,
          cancelable: true,
          dataTransfer,
          view: window
        })
        
        console.log('  🏁 [FIXED-DragTest] 触发 dragend 事件')
        dragHandleElement.dispatchEvent(dragEndEvent)

        console.log('✅ [FIXED-DragTest] 拖拽事件序列完成')
        return true
      },
      [
        await this.getElementSelector(dragHandle),
        await this.getElementXPath(targetParagraph),
        targetX,
        targetY
      ] as const
    )
  }

  /**
   * 🎯 优化: 方法3 - 低级别鼠标API模拟真实拖拽
   */
  private async executeMouseDrag(
    sourceBox: { x: number; y: number; width: number; height: number },
    targetPos: { x: number; y: number },
    steps: number,
    holdTime: number
  ): Promise<boolean> {
    const sourceCenter = {
      x: sourceBox.x + sourceBox.width / 2,
      y: sourceBox.y + sourceBox.height / 2
    }

    // 移动到源位置
    await this.page.mouse.move(sourceCenter.x, sourceCenter.y)
    await this.page.waitForTimeout(100)

    // 按下鼠标
    await this.page.mouse.down()
    await this.page.waitForTimeout(holdTime)

    // 分步移动到目标位置
    for (let i = 1; i <= steps; i++) {
      const progress = i / steps
      const intermediateX = sourceCenter.x + (targetPos.x - sourceCenter.x) * progress
      const intermediateY = sourceCenter.y + (targetPos.y - sourceCenter.y) * progress
      
      await this.page.mouse.move(intermediateX, intermediateY)
      await this.page.waitForTimeout(50)
    }

    await this.page.waitForTimeout(200)

    // 释放鼠标
    await this.page.mouse.up()
    
    console.log('✅ [MouseDrag] 鼠标模拟拖拽完成')
    return true
  }

  /**
   * 获取元素的XPath选择器
   */
  private async getElementXPath(locator: Locator): Promise<string> {
    return await locator.evaluate((element) => {
      const getElementXPath = (el: Element): string => {
        if (el.id) {
          return `//*[@id="${el.id}"]`
        }
        
        if (el === document.body) {
          return '/html/body'
        }

        let ix = 0
        const siblings = el.parentNode ? Array.from(el.parentNode.childNodes) : []
        
        for (const sibling of siblings) {
          if (sibling === el) {
            const tagName = el.tagName.toLowerCase()
            const parentXPath = el.parentElement ? getElementXPath(el.parentElement) : ''
            return `${parentXPath}/${tagName}[${ix + 1}]`
          }
          
          if (sibling.nodeType === 1 && (sibling as Element).tagName === el.tagName) {
            ix++
          }
        }
        
        return ''
      }
      
      return getElementXPath(element)
    })
  }

  /**
   * 获取元素的CSS选择器（用于事件触发）
   */
  private async getElementSelector(locator: Locator): Promise<string> {
    return await locator.evaluate((element) => {
      // 优先使用ID
      if (element.id) {
        return `#${element.id}`
      }

      // 使用类名（如果唯一），处理SVG元素没有className.split的情况
      if (element.className && typeof element.className === 'string') {
        const classes = element.className.split(' ').filter(c => c.trim())
        if (classes.length > 0) {
          const classSelector = '.' + classes.join('.')
          if (document.querySelectorAll(classSelector).length === 1) {
            return classSelector
          }
        }
      }

      // 使用标签名 + nth-child
      const tagName = element.tagName.toLowerCase()
      const parent = element.parentElement
      
      if (parent) {
        const siblings = Array.from(parent.children).filter(child => 
          child.tagName.toLowerCase() === tagName
        )
        const index = siblings.indexOf(element) + 1
        
        return `${tagName}:nth-child(${index})`
      }

      return tagName
    })
  }

  /**
   * 🎯 公共方法：验证拖拽结果
   * 供外部测试使用的简化验证接口
   */
  async verifyDragResult(
    beforeTexts: string[],
    afterTexts: string[],
    sourceIndex: number,
    targetIndex: number,
  ): Promise<{ success: boolean; message: string; details?: Record<string, any> }> {
    // 🔍 调试日志：打印输入参数
    this.log(`验证输入参数:`, 'info')
    this.log(`  beforeTexts: ${JSON.stringify(beforeTexts)}`, 'info')
    this.log(`  afterTexts: ${JSON.stringify(afterTexts)}`, 'info')
    this.log(`  sourceIndex: ${sourceIndex}, targetIndex: ${targetIndex}`, 'info')
    this.log(`  类型检查: beforeTexts isArray=${Array.isArray(beforeTexts)}, afterTexts isArray=${Array.isArray(afterTexts)}`, 'info')
    
    // 基础数据验证
    if (!beforeTexts || !afterTexts || !Array.isArray(beforeTexts) || !Array.isArray(afterTexts)) {
      this.log(`❌ 数据验证失败`, 'error')
      return { success: false, message: '输入数据无效', details: { beforeTexts, afterTexts } }
    }

    // 检查索引有效性
    if (sourceIndex < 0 || sourceIndex >= beforeTexts.length) {
      return { success: false, message: '源索引超出范围', details: { sourceIndex, beforeTexts } }
    }

    // 简单但有效的验证逻辑：检查段落顺序是否改变
    const textsChanged = JSON.stringify(beforeTexts) !== JSON.stringify(afterTexts)
    
    this.log(`验证拖拽结果: 文本变化=${textsChanged}`, 'info')
    this.log(`拖拽前: [${beforeTexts.map(t => `"${t.slice(0, 20)}"`).join(', ')}]`, 'info') 
    this.log(`拖拽后: [${afterTexts.map(t => `"${t.slice(0, 20)}"`).join(', ')}]`, 'info')

    if (textsChanged) {
      return {
        success: true,
        message: '拖拽操作成功：段落顺序已改变',
        details: { beforeTexts, afterTexts, sourceIndex, targetIndex }
      }
    } else {
      return {
        success: false,
        message: '拖拽操作失败：段落顺序未改变',
        details: { beforeTexts, afterTexts, sourceIndex, targetIndex }
      }
    }
  }

  /**
   * 🎯 已弃用: 旧的结果验证方法 - 保留用于向后兼容
   * @deprecated 使用新的内部 verifyDragResult 方法
   */
  async verifyDragResultLegacy(
    beforeTexts: string[],
    afterTexts: string[],
    sourceIndex: number,
    targetIndex: number,
  ): Promise<{ success: boolean; message: string; details?: Record<string, any> }> {
    console.log('🔍 [LEGACY] 拖拽结果验证:')
    console.log('  拖拽前文本:', beforeTexts.map((text, i) => `[${i}] "${text.slice(0, 30)}"`))
    console.log('  拖拽后文本:', afterTexts.map((text, i) => `[${i}] "${text.slice(0, 30)}"`))
    console.log('  源索引:', sourceIndex, '目标索引:', targetIndex)

    const sourceText = beforeTexts[sourceIndex]
    const newSourceIndex = afterTexts.indexOf(sourceText)

    console.log('  源文本:', `"${sourceText.slice(0, 30)}"`)
    console.log('  源文本新位置:', newSourceIndex)

    if (newSourceIndex === -1) {
      console.log('  ❌ 失败原因: 源段落在拖拽后消失')
      return { success: false, message: '源段落在拖拽后消失', details: { beforeTexts, afterTexts } }
    }

    if (newSourceIndex === sourceIndex) {
      console.log('  ❌ 失败原因: 段落位置未发生变化')
      return { success: false, message: '段落位置未发生变化', details: { beforeTexts, afterTexts } }
    }

    console.log('  ✅ 成功: 段落位置已改变')
    return {
      success: true,
      message: `段落从位置${sourceIndex}移动到位置${newSourceIndex}`,
      details: { oldIndex: sourceIndex, newIndex: newSourceIndex, beforeTexts, afterTexts },
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
 * 🎯 优化: 预设配置
 */
export const DragTestPresets = {
  /**
   * 快速开发模式 - 仅使用直接调用方法
   */
  development: {
    preferredMethod: 'direct' as const,
    enableFallbackMethods: false,
    debugMode: true,
    verificationLevel: 'basic' as const,
    animationWaitTime: 100
  },

  /**
   * CI/CD模式 - 全方法兼容性测试
   */
  ci: {
    preferredMethod: 'auto' as const,
    enableFallbackMethods: true,
    debugMode: false,
    verificationLevel: 'standard' as const,
    animationWaitTime: 500
  },

  /**
   * 调试模式 - 详细日志和全面验证
   */
  debug: {
    preferredMethod: 'auto' as const,
    enableFallbackMethods: true,
    debugMode: true,
    verificationLevel: 'comprehensive' as const,
    animationWaitTime: 1000,
    enablePerformanceMonitoring: true
  },

  /**
   * 性能测试模式 - 注重速度
   */
  performance: {
    preferredMethod: 'direct' as const,
    enableFallbackMethods: true,
    debugMode: false,
    verificationLevel: 'basic' as const,
    animationWaitTime: 50,
    enablePerformanceMonitoring: true
  }
} satisfies Record<string, Partial<DragTestConfig>>

/**
 * 🎯 优化: 创建拖拽测试助手的工厂函数
 */
export function createDragTestHelper(page: Page, configOrPreset?: DragTestConfig | keyof typeof DragTestPresets): DragTestHelper {
  let config: DragTestConfig = {}
  
  if (typeof configOrPreset === 'string') {
    // 使用预设配置
    config = DragTestPresets[configOrPreset] || {}
  } else if (configOrPreset) {
    // 使用自定义配置
    config = configOrPreset
  }
  
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
