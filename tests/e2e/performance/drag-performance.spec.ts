import { test, expect } from '@playwright/test'
import { DragTestHelper } from '../utils/DragTestHelper'

/**
 * 🎯 拖拽性能E2E测试
 * 验证拖拽操作的性能表现
 */
test.describe('拖拽性能测试', () => {
  let dragHelper: DragTestHelper

  test.beforeEach(async ({ page }) => {
    dragHelper = new DragTestHelper(page)
    await dragHelper.setup()
  })

  test('批量拖拽性能基准', async () => {
    const paragraphs = await dragHelper.getParagraphs()
    expect(paragraphs.length).toBeGreaterThanOrEqual(2)

    const performanceResults = []
    const testRounds = 3

    for (let round = 1; round <= testRounds; round++) {
      console.log(`📊 执行第${round}轮性能测试...`)
      
      const startTime = Date.now()
      
      // 执行标准拖拽操作
      const currentParagraphs = await dragHelper.getParagraphs()
      const dragResult = await dragHelper.dragParagraph(
        currentParagraphs[0], 
        currentParagraphs[Math.min(2, currentParagraphs.length - 1)],
        { 
          dragToPosition: 'below',
          holdTime: 100,
          moveSteps: 2,
          waitAfterDrag: 500
        }
      )
      
      const endTime = Date.now()
      const roundTime = endTime - startTime
      performanceResults.push(roundTime)
      
      expect(dragResult.success).toBe(true)
      console.log(`  第${round}轮耗时: ${roundTime}ms`)
      
      if (round < testRounds) {
        await dragHelper.page.waitForTimeout(100)
      }
    }

    // 计算性能统计
    const avgTime = performanceResults.reduce((a, b) => a + b, 0) / performanceResults.length
    const maxTime = Math.max(...performanceResults)
    const minTime = Math.min(...performanceResults)

    console.log(`📊 性能测试结果:`)
    console.log(`  平均耗时: ${avgTime.toFixed(2)}ms`)
    console.log(`  最大耗时: ${maxTime}ms`)
    console.log(`  最小耗时: ${minTime}ms`)

    // 性能基准：平均耗时应小于3秒，最大耗时应小于5秒
    const performanceGood = avgTime < 3000 && maxTime < 5000
    expect(performanceGood).toBe(true)

    dragHelper.recordTest('批量拖拽性能', performanceGood, {
      avgTime: avgTime.toFixed(2),
      maxTime,
      minTime,
      rounds: testRounds
    })
  })

  test('拖拽流畅度验证', async ({ page }) => {
    const paragraphs = await dragHelper.getParagraphs()
    expect(paragraphs.length).toBeGreaterThanOrEqual(2)

    // 监控帧率和流畅度指标
    let frameCount = 0
    let startTime = Date.now()

    // 启用性能监控
    await page.evaluate(() => {
      (window as any).performanceData = {
        frames: 0,
        startTime: performance.now()
      }
      
      function countFrame() {
        (window as any).performanceData.frames++
        requestAnimationFrame(countFrame)
      }
      countFrame()
    })

    // 执行拖拽操作
    const dragResult = await dragHelper.dragParagraph(paragraphs[0], paragraphs[1], {
      dragToPosition: 'below',
      holdTime: 1000, // 较长的拖拽时间以测试流畅度
      moveSteps: 10
    })

    expect(dragResult.success).toBe(true)

    // 获取性能数据
    const performanceData = await page.evaluate(() => {
      const data = (window as any).performanceData
      return {
        frames: data.frames,
        duration: performance.now() - data.startTime
      }
    })

    const fps = performanceData.frames / (performanceData.duration / 1000)
    console.log(`🎮 拖拽流畅度: ${fps.toFixed(1)} FPS`)

    // 流畅度基准：应保持在30 FPS以上
    const isSmoothEnough = fps >= 30
    expect(isSmoothEnough).toBe(true)

    dragHelper.recordTest('拖拽流畅度', isSmoothEnough, {
      fps: fps.toFixed(1),
      duration: performanceData.duration.toFixed(2),
      frames: performanceData.frames
    })
  })

  test('内存泄漏检测', async ({ page }) => {
    const paragraphs = await dragHelper.getParagraphs()
    expect(paragraphs.length).toBeGreaterThanOrEqual(2)

    // 获取初始内存使用情况
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize
      } : null
    })

    if (!initialMemory) {
      console.log('⚠️  浏览器不支持内存监控，跳过内存泄漏检测')
      return
    }

    // 执行多轮拖拽操作
    for (let i = 0; i < 5; i++) {
      const currentParagraphs = await dragHelper.getParagraphs()
      await dragHelper.dragParagraph(currentParagraphs[0], currentParagraphs[1], {
        dragToPosition: 'below',
        holdTime: 200,
        moveSteps: 3,
        waitAfterDrag: 200
      })
    }

    // 强制垃圾回收（如果支持）
    await page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc()
      }
    })

    await page.waitForTimeout(1000)

    // 获取最终内存使用情况
    const finalMemory = await page.evaluate(() => {
      return {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize
      }
    })

    const memoryIncrease = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize
    const memoryIncreasePercent = (memoryIncrease / initialMemory.usedJSHeapSize) * 100

    console.log(`🧠 内存使用变化: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB (${memoryIncreasePercent.toFixed(1)}%)`)

    // 内存泄漏基准：内存增长应小于10%
    const noMemoryLeak = memoryIncreasePercent < 10
    expect(noMemoryLeak).toBe(true)

    dragHelper.recordTest('内存泄漏检测', noMemoryLeak, {
      memoryIncreaseMB: (memoryIncrease / 1024 / 1024).toFixed(2),
      memoryIncreasePercent: memoryIncreasePercent.toFixed(1)
    })
  })

  test.afterEach(async () => {
    if (dragHelper) {
      const summary = dragHelper.getTestSummary()
      console.log(`\n📊 性能测试总结: ${summary.passedTests}/${summary.totalTests} 通过`)
    }
  })
})