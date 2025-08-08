/**
 * 🎯 简化拖拽性能测试
 * 使用新的测试架构快速验证拖拽操作性能
 */

import { test, expect } from '@playwright/test'
import { createDragTestHelper, dragAssert } from '../utils/DragTestHelper'

test.describe('🎯 简化拖拽性能测试', () => {
  test.beforeEach(async ({ page }) => {
    // 使用正确的演示页面URL
    await page.goto('http://localhost:3666/src/Extensions/DragHandle/React/')
    await page.waitForLoadState('networkidle')
    
    console.log('📍 当前页面 URL:', page.url())
  })

  test('快速拖拽性能验证', async ({ page }) => {
    console.log('🚀 开始简化拖拽性能测试...')
    
    // 创建拖拽测试助手 - 启用性能监控
    const dragHelper = createDragTestHelper(page, {
      enablePerformanceMonitoring: true,
      animationWaitTime: 200, // 简化版本，减少等待时间
      timeout: 5000
    })
    
    await dragHelper.setup()
    
    const paragraphs = await dragHelper.getParagraphs()
    expect(paragraphs.length).toBeGreaterThanOrEqual(2)
    
    console.log(`📝 找到 ${paragraphs.length} 个段落，开始性能测试...`)
    
    // 执行简单拖拽操作并监控性能
    const result = await dragHelper.performDrag(
      paragraphs[0],
      paragraphs[1],
      { position: 'after' }
    )
    
    // 验证操作成功和性能
    await dragAssert.successful(result)
    await dragAssert.performant(result, 500) // 简化测试，允许500ms
    
    console.log(`⚡ 拖拽操作耗时: ${result.duration.toFixed(2)}ms`)
    
    if (result.performance) {
      console.log(`📊 性能详情:`)
      console.log(`  - 渲染时间: ${result.performance.renderTime.toFixed(2)}ms`)  
      console.log(`  - DOM更新次数: ${result.performance.domUpdates}`)
      
      // 简化的性能基准
      expect(result.performance.renderTime).toBeLessThan(200)
      expect(result.performance.domUpdates).toBeLessThan(30)
    }
    
    // 检查内存状况
    await dragAssert.noMemoryLeaks(dragHelper)
    
    console.log('🎉 简化性能测试完成！')
  })

  test('AppFlowy算法精度快检', async ({ page }) => {
    const dragHelper = createDragTestHelper(page, {
      enablePerformanceMonitoring: false, // 关闭性能监控，专注位置精度
      validateIndicators: true
    })
    
    await dragHelper.setup()
    
    const paragraphs = await dragHelper.getParagraphs()
    expect(paragraphs.length).toBeGreaterThanOrEqual(3)
    
    // 记录原始顺序
    const beforeOrder: string[] = []
    for (const p of paragraphs) {
      const text = await dragHelper.getParagraphText(p)
      beforeOrder.push(text.trim())
    }
    
    console.log('📝 原始顺序:', beforeOrder.map((text, i) => `${i}: ${text.substring(0, 20)}...`))
    
    // 测试精确位置定位：第1段拖到第3段后
    const result = await dragHelper.performDrag(
      paragraphs[0],
      paragraphs[2], 
      { position: 'after' }
    )
    
    await dragAssert.successful(result)
    
    // 验证新顺序
    const newParagraphs = await dragHelper.getParagraphs()
    const afterOrder: string[] = []
    for (const p of newParagraphs) {
      const text = await dragHelper.getParagraphText(p)
      afterOrder.push(text.trim())
    }
    
    console.log('📝 新顺序:', afterOrder.map((text, i) => `${i}: ${text.substring(0, 20)}...`))
    
    // 验证AppFlowy算法精度：原第1段应该出现在原第3段之后
    const originalFirstText = beforeOrder[0]
    const originalThirdText = beforeOrder[2]
    
    const newFirstIndex = afterOrder.indexOf(originalFirstText)
    const newThirdIndex = afterOrder.indexOf(originalThirdText)
    
    expect(newFirstIndex).toBeGreaterThan(newThirdIndex)
    console.log(`✅ 位置精度验证通过: ${originalFirstText.substring(0, 15)}... 移至 ${originalThirdText.substring(0, 15)}... 之后`)
  })
})