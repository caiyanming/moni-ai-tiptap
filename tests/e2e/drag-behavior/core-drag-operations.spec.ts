/**
 * 🎯 核心拖拽操作E2E测试
 * 
 * 使用新的DragTestHelper架构，提供：
 * - 标准化拖拽测试
 * - 性能监控
 * - 内存泄漏检测
 * - 详细错误报告
 */

import { test, expect } from '@playwright/test'
import { DragTestHelper, createDragTestHelper, dragAssert } from '../utils/DragTestHelper'

test.describe('🎯 核心拖拽操作', () => {
  let dragHelper: DragTestHelper

  test.beforeEach(async ({ page }) => {
    // 使用新的配置API创建助手
    dragHelper = createDragTestHelper(page, {
      enablePerformanceMonitoring: true,
      validateIndicators: true,
      timeout: 8000,
      animationWaitTime: 500
    })
    
    await dragHelper.setup()
  })

  test('基础段落拖拽 - 使用新API', async () => {
    const paragraphs = await dragHelper.getParagraphs()
    expect(paragraphs.length).toBeGreaterThanOrEqual(3)

    // 记录拖拽前的顺序
    const beforeOrder: string[] = []
    for (const p of paragraphs) {
      const text = await dragHelper.getParagraphText(p)
      if (text.trim()) beforeOrder.push(text.trim())
    }

    // 使用新的performDrag API
    const result = await dragHelper.performDrag(
      paragraphs[0],
      paragraphs[2], 
      { position: 'after' }
    )

    // 使用新的断言API
    await dragAssert.successful(result)
    await dragAssert.performant(result, 300) // 最大300ms
    await dragAssert.noMemoryLeaks(dragHelper)

    // 验证结果
    await dragHelper.expectParagraphOrder([
      beforeOrder[1], // 原第二个段落现在是第一个
      beforeOrder[2], // 原第三个段落现在是第二个  
      beforeOrder[0], // 原第一个段落现在是第三个
      ...beforeOrder.slice(3)
    ])

    console.log(`✅ 拖拽操作成功，耗时: ${result.duration.toFixed(2)}ms`)
    if (result.performance) {
      console.log(`📊 性能指标: 渲染${result.performance.renderTime.toFixed(1)}ms, DOM更新${result.performance.domUpdates}次`)
    }
  })

  test('跨距离拖拽 - 性能优化验证', async () => {
    const paragraphs = await dragHelper.getParagraphs()
    expect(paragraphs.length).toBeGreaterThanOrEqual(5)

    // 长距离拖拽：第一段拖到最后
    const result = await dragHelper.performDrag(
      paragraphs[0],
      paragraphs[paragraphs.length - 1],
      { position: 'after' }
    )

    await dragAssert.successful(result)
    
    // 长距离拖拽的性能要求更宽松
    await dragAssert.performant(result, 500)
    
    // 验证内存没有泄漏
    await dragAssert.noMemoryLeaks(dragHelper)

    // 验证DOM更新次数合理（长距离拖拽可能需要更多DOM操作）
    if (result.performance) {
      expect(result.performance.domUpdates).toBeLessThan(100)
      console.log(`📊 长距离拖拽性能: ${result.duration.toFixed(2)}ms, DOM更新${result.performance.domUpdates}次`)
    }
  })

  test('批量拖拽操作 - 稳定性测试', async () => {
    const paragraphs = await dragHelper.getParagraphs()
    expect(paragraphs.length).toBeGreaterThanOrEqual(4)

    // 定义批量拖拽操作
    const operations = [
      {
        source: paragraphs[0],
        target: paragraphs[1],
        dropInfo: { position: 'after' as const }
      },
      {
        source: paragraphs[2], // 注意：索引会因为上一步操作而改变
        target: paragraphs[0], // 现在应该是原来的第二个段落
        dropInfo: { position: 'before' as const }
      }
    ]

    // 使用批量测试API
    const results = await dragHelper.batchDragTest(operations)

    // 验证每个操作都成功
    for (const result of results) {
      await dragAssert.successful(result)
      await dragAssert.performant(result, 400)
    }

    // 验证整体没有内存泄漏
    await dragAssert.noMemoryLeaks(dragHelper)

    // 计算总体性能
    const totalDuration = results.reduce((sum, result) => sum + result.duration, 0)
    console.log(`📊 批量拖拽总耗时: ${totalDuration.toFixed(2)}ms`)
    
    expect(totalDuration).toBeLessThan(1000) // 1秒内完成所有操作
  })

  test('拖拽动画完整性验证', async () => {
    const paragraphs = await dragHelper.getParagraphs()
    expect(paragraphs.length).toBeGreaterThanOrEqual(2)

    // 启用拖拽指示器验证
    const result = await dragHelper.performDrag(
      paragraphs[0],
      paragraphs[1],
      { position: 'after' }
    )

    await dragAssert.successful(result)

    // 等待动画完成
    await dragHelper.waitForDragAnimationComplete()

    // 验证没有残留的动画状态
    const animationElements = dragHelper.page.locator('[style*="transition"], [style*="transform"]')
    const animationCount = await animationElements.count()
    
    // 可能会有一些合理的CSS过渡，但不应该太多
    expect(animationCount).toBeLessThan(5)
    
    console.log(`🎭 动画验证通过，发现${animationCount}个过渡元素`)
  })

  test('错误边界测试 - 无效拖拽目标', async () => {
    const paragraphs = await dragHelper.getParagraphs()
    expect(paragraphs.length).toBeGreaterThanOrEqual(1)

    // 尝试拖拽到不存在的元素
    const result = await dragHelper.performDrag(
      paragraphs[0],
      'non-existent-element'
    )

    // 应该优雅失败
    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
    console.log(`❌ 预期的错误: ${result.error}`)

    // 验证错误不会导致内存泄漏
    await dragAssert.noMemoryLeaks(dragHelper)
  })

  test('高频拖拽压力测试', async () => {
    const paragraphs = await dragHelper.getParagraphs()
    expect(paragraphs.length).toBeGreaterThanOrEqual(3)

    const startTime = performance.now()
    const successfulOperations: number[] = []

    // 执行快速连续拖拽
    for (let i = 0; i < 5; i++) {
      const currentParagraphs = await dragHelper.getParagraphs()
      
      const result = await dragHelper.performDrag(
        currentParagraphs[0],
        currentParagraphs[Math.min(1 + i % 2, currentParagraphs.length - 1)],
        { position: i % 2 === 0 ? 'after' : 'before' }
      )

      if (result.success) {
        successfulOperations.push(result.duration)
      }

      // 短暂间隔，模拟用户操作
      await dragHelper.page.waitForTimeout(100)
    }

    const totalTime = performance.now() - startTime
    const avgTime = successfulOperations.reduce((a, b) => a + b, 0) / successfulOperations.length

    console.log(`⚡ 压力测试结果: ${successfulOperations.length}/5 成功, 平均 ${avgTime.toFixed(2)}ms`)
    
    // 验证成功率和性能
    expect(successfulOperations.length).toBeGreaterThanOrEqual(4) // 至少80%成功率
    expect(avgTime).toBeLessThan(500) // 平均响应时间
    expect(totalTime).toBeLessThan(5000) // 总时间不超过5秒

    // 压力测试后检查内存泄漏
    await dragAssert.noMemoryLeaks(dragHelper)
  })

  test.afterEach(async () => {
    // 清理和报告
    const { hasLeaks, report } = await dragHelper.detectMemoryLeaks()
    
    if (hasLeaks) {
      console.warn(`⚠️ 内存泄漏检测报告:\n${report}`)
    }

    const summary = dragHelper.getTestSummary()
    console.log(`📊 测试总结: ${summary.passedTests}/${summary.totalTests} 通过 (${summary.successRate}%)`)
  })
})