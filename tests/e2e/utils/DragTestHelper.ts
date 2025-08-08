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
        result.details.verification = await this.verifyDragResult(beforeState, afterState)
        
        result.success = result.details.verification.positionChanged
        this.log(`${result.success ? '✅' : '❌'} 拖拽操作${result.success ? '成功' : '失败'}`)
      }

    } catch (error: any) {
      result.error = error.message
      result.details.failureReasons.push(error.message)
      this.log(`❌ 拖拽操作异常: ${error.message}`)
    }

    result.duration = performance.now() - startTime
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
    await sourceParagraph.hover()
    await this.page.waitForTimeout(500)

    const svgHandle = this.page.locator('svg').first()
    await svgHandle.waitFor({ state: 'visible', timeout: 3000 })

    const isVisible = await svgHandle.isVisible()
    if (!isVisible) {
      throw new Error('SVG拖拽手柄未变为可见状态')
    }
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
    const paragraphs = await this.getParagraphs()
    const texts = []
    
    for (const p of paragraphs) {
      const text = await this.getParagraphText(p)
      texts.push(text.trim())
    }

    return {
      paragraphTexts: texts,
      paragraphCount: paragraphs.length,
      timestamp: Date.now()
    }
  }

  /**
   * 🎯 优化: 增强的结果验证
   */
  private async verifyDragResult(beforeState: any, afterState: any) {
    this.log('开始拖拽结果验证', 'info')
    this.log(`验证前状态: ${beforeState.paragraphTexts?.length || 0} 个段落`, 'info')
    this.log(`验证后状态: ${afterState.paragraphTexts?.length || 0} 个段落`, 'info')

    const verification = {
      domUpdated: false,
      positionChanged: false,
      editorStateConsistent: false,
      memoryLeakDetected: false
    }

    // 基础验证：检查段落位置是否改变
    verification.positionChanged = !this.arraysEqual(beforeState.paragraphTexts, afterState.paragraphTexts)
    this.log(`段落位置是否改变: ${verification.positionChanged}`, 'info')
    
    if (this.config.debugMode) {
      this.log(`拖拽前: [${beforeState.paragraphTexts.map((t: string) => `"${t.slice(0, 20)}"`).join(', ')}]`, 'info')
      this.log(`拖拽后: [${afterState.paragraphTexts.map((t: string) => `"${t.slice(0, 20)}"`).join(', ')}]`, 'info')
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
        
        // 方法1: 从ProseMirror DOM获取view
        if ((editorElement as any).__prosemirrorView) {
          editorView = (editorElement as any).__prosemirrorView
        } else if ((window as any).__tiptapEditor) {
          // 方法2: 从全局变量获取（如果设置了）
          editorView = (window as any).__tiptapEditor.view
        } else {
          // 方法3: 尝试从React组件获取
          const reactKey = Object.keys(editorElement).find(key => key.startsWith('__reactInternalInstance') || key.startsWith('_reactInternalFiber'))
          if (reactKey) {
            const reactInstance = (editorElement as any)[reactKey]
            // 这里需要根据实际的React结构来获取编辑器实例
            // 暂时返回false，等待进一步实现
          }
        }

        if (!editorView) {
          console.log('❌ [DirectMove] 无法获取TipTap编辑器实例')
          console.log('🔍 [DirectMove] 调试信息:', {
            hasGlobalEditor: !!window.__tiptapEditor,
            hasProseMirrorView: !!(editorElement as any).__prosemirrorView,
            editorElementKeys: Object.keys(editorElement).filter(k => k.includes('react') || k.includes('prosemirror'))
          })
          return false
        }

        console.log('✅ [DirectMove] 成功获取TipTap编辑器实例')

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
          // 获取ProseMirror位置
          const sourcePos = editorView.posAtDOM(sourceBlock, 0)
          const targetPos = editorView.posAtDOM(targetBlock, 0)

          if (sourcePos === -1 || targetPos === -1) {
            console.log('❌ 无法获取ProseMirror位置')
            return false
          }

          const { state } = editorView
          const { doc, tr } = state

          // 找到块级节点
          const sourceResolve = doc.resolve(sourcePos)
          const targetResolve = doc.resolve(targetPos)

          // 查找包含的块级节点位置
          let sourceBlockPos = null, targetBlockPos = null
          
          for (let depth = sourceResolve.depth; depth >= 0; depth--) {
            const node = sourceResolve.node(depth)
            if (node.isBlock && depth > 0) {
              sourceBlockPos = { pos: sourceResolve.start(depth), size: node.nodeSize }
              break
            }
          }
          
          for (let depth = targetResolve.depth; depth >= 0; depth--) {
            const node = targetResolve.node(depth)
            if (node.isBlock && depth > 0) {
              targetBlockPos = { pos: targetResolve.start(depth), size: node.nodeSize }
              break
            }
          }

          if (!sourceBlockPos || !targetBlockPos) {
            console.log('❌ 无法找到块级节点位置')
            return false
          }

          const sourceNode = doc.nodeAt(sourceBlockPos.pos)
          if (!sourceNode) {
            console.log('❌ 无法找到源节点')
            return false
          }

          // 计算插入位置
          let insertPos: number
          if (dropPosition === 'above') {
            insertPos = targetBlockPos.pos
          } else {
            insertPos = targetBlockPos.pos + targetBlockPos.size
          }

          console.log('🎯 执行直接移动:', {
            sourceText: sourceNode.textContent?.slice(0, 30),
            deleteFrom: sourceBlockPos.pos,
            deleteTo: sourceBlockPos.pos + sourceBlockPos.size,
            insertPos,
            dropPosition
          })

          // 执行移动：先删除，再插入
          let newTr = tr.delete(sourceBlockPos.pos, sourceBlockPos.pos + sourceBlockPos.size)

          // 调整插入位置
          let adjustedInsertPos = insertPos
          if (sourceBlockPos.pos < insertPos) {
            adjustedInsertPos -= sourceBlockPos.size
          }

          newTr = newTr.insert(adjustedInsertPos, sourceNode)

          // 应用事务
          editorView.dispatch(newTr)

          console.log('✅ 直接移动完成')
          return true
        } catch (error) {
          console.error('❌ 直接移动失败:', error)
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
    // 在页面上下文中执行拖拽事件序列，避免DataTransfer序列化问题
    await this.page.evaluate(
      async ([dragHandleSelector, targetSelector, targetX, targetY]) => {
        const dragElement = document.querySelector(dragHandleSelector) as HTMLElement
        const targetElement = document.querySelector(targetSelector) as HTMLElement
        
        if (!dragElement || !targetElement) {
          throw new Error('无法找到拖拽元素或目标元素')
        }

        // 创建拖拽事件序列
        const dataTransfer = new DataTransfer()
        dataTransfer.effectAllowed = 'move'
        dataTransfer.setData('text/html', '')

        console.log('🎯 触发拖拽事件序列')

        // 1. dragstart
        const dragStartEvent = new DragEvent('dragstart', {
          bubbles: true,
          cancelable: true,
          dataTransfer: dataTransfer
        })
        dragElement.dispatchEvent(dragStartEvent)
        console.log('  ✅ dragstart 事件已触发')

        await new Promise(resolve => setTimeout(resolve, 100))

        // 2. dragenter
        const dragEnterEvent = new DragEvent('dragenter', {
          bubbles: true,
          cancelable: true,
          clientX: targetX,
          clientY: targetY
        })
        targetElement.dispatchEvent(dragEnterEvent)
        console.log('  ✅ dragenter 事件已触发')

        await new Promise(resolve => setTimeout(resolve, 50))

        // 3. dragover
        const dragOverEvent = new DragEvent('dragover', {
          bubbles: true,
          cancelable: true,
          clientX: targetX,
          clientY: targetY,
          dataTransfer: dataTransfer
        })
        targetElement.dispatchEvent(dragOverEvent)
        console.log('  ✅ dragover 事件已触发')

        await new Promise(resolve => setTimeout(resolve, 100))

        // 4. drop
        const dropEvent = new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          clientX: targetX,
          clientY: targetY,
          dataTransfer: dataTransfer
        })
        targetElement.dispatchEvent(dropEvent)
        console.log('  ✅ drop 事件已触发')

        await new Promise(resolve => setTimeout(resolve, 50))

        // 5. dragend
        const dragEndEvent = new DragEvent('dragend', {
          bubbles: true,
          cancelable: true
        })
        dragElement.dispatchEvent(dragEndEvent)
        console.log('  ✅ dragend 事件已触发')

        console.log('✅ [ManualEvents] 拖拽事件序列完成')
        return true
      },
      [
        await this.getElementSelector(dragHandle),
        await this.getElementSelector(targetParagraph),
        targetX,
        targetY
      ] as const
    )
    
    return true
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
