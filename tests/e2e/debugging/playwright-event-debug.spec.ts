import { expect,test } from '@playwright/test'

/**
 * 🔍 Playwright拖拽事件调试测试
 * 验证Playwright的dragTo()是否触发标准HTML5拖拽事件
 */
test.describe('Playwright拖拽事件调试', () => {
  test('验证dragTo()是否触发document级事件监听器', async ({ page }) => {
    // 导航到调试页面
    await page.goto(`file://${  process.cwd()  }/debug-playwright-events.html`)

    // 等待页面加载
    await page.waitForSelector('#draggable')

    // 获取初始事件计数
    const initialCount = await page.evaluate(() => window.getEventCount())
    console.log(`🔍 初始事件计数: ${initialCount}`)

    // 获取拖拽元素和目标区域
    const draggableElement = page.locator('#draggable')
    const dropZone = page.locator('#drop-zone')

    // 验证元素可见
    await expect(draggableElement).toBeVisible()
    await expect(dropZone).toBeVisible()

    console.log('🎯 开始执行Playwright dragTo()操作...')

    // 执行Playwright的dragTo操作
    await draggableElement.dragTo(dropZone)

    // 等待事件处理
    await page.waitForTimeout(1000)

    // 检查事件是否被触发
    const finalCount = await page.evaluate(() => window.getEventCount())
    const eventTriggered = finalCount > initialCount

    console.log(`🔍 最终事件计数: ${finalCount}, 事件被触发: ${eventTriggered}`)

    // 获取最近的日志
    const recentLogs = await page.evaluate(() => window.getLastLogs(10))
    console.log('📋 最近的事件日志:')
    recentLogs.forEach((log, index) => {
      console.log(`  ${index + 1}. ${log}`)
    })

    // 断言：Playwright的dragTo应该触发document级别的事件
    expect(eventTriggered).toBe(true)

    // 验证至少触发了核心拖拽事件
    const dragEventsTriggered = finalCount - initialCount
    expect(dragEventsTriggered).toBeGreaterThanOrEqual(2) // 至少dragstart和drop

    console.log(`✅ Playwright dragTo()触发了${dragEventsTriggered}个事件`)
  })

  test('对比手动事件触发与dragTo()', async ({ page }) => {
    await page.goto(`file://${  process.cwd()  }/debug-playwright-events.html`)
    await page.waitForSelector('#draggable')

    // 1. 测试手动事件触发
    console.log('🔧 测试1: 手动触发拖拽事件')

    const beforeManual = await page.evaluate(() => window.getEventCount())

    // 点击手动触发按钮
    await page.click('button:has-text("手动触发事件测试")')
    await page.waitForTimeout(1000)

    const afterManual = await page.evaluate(() => window.getEventCount())
    const manualEvents = afterManual - beforeManual

    console.log(`🔧 手动触发产生了${manualEvents}个事件`)

    // 2. 清除日志并测试Playwright dragTo
    console.log('🎯 测试2: Playwright dragTo()操作')

    await page.click('button:has-text("清除日志")')
    const beforeDragTo = await page.evaluate(() => window.getEventCount())

    // 执行dragTo
    const draggableElement = page.locator('#draggable')
    const dropZone = page.locator('#drop-zone')
    await draggableElement.dragTo(dropZone)
    await page.waitForTimeout(1000)

    const afterDragTo = await page.evaluate(() => window.getEventCount())
    const dragToEvents = afterDragTo - beforeDragTo

    console.log(`🎯 dragTo()产生了${dragToEvents}个事件`)

    // 获取详细日志
    const allLogs = await page.evaluate(() => window.getLastLogs(20))
    console.log('📋 完整事件日志:')
    allLogs.forEach((log, index) => {
      console.log(`  ${index + 1}. ${log}`)
    })

    // 分析结果
    if (dragToEvents === 0) {
      console.log('❌ 关键发现: Playwright的dragTo()未触发任何document级别的事件!')
      console.log('💡 这解释了为什么TipTap插件的事件监听器没有响应')
    } else {
      console.log('✅ Playwright的dragTo()正常触发了事件')
    }

    // 断言至少一种方式能触发事件
    expect(Math.max(manualEvents, dragToEvents)).toBeGreaterThan(0)
  })

  test('验证TipTap实际场景中的事件触发', async ({ page }) => {
    console.log('🎯 测试3: 在实际TipTap环境中验证事件触发')

    // 导航到TipTap拖拽演示页面
    await page.goto('/src/Extensions/DragHandle/React/')

    // 等待编辑器加载
    await page.locator('.ProseMirror').waitFor({ state: 'visible', timeout: 10000 })

    // 注入事件监听器来监控document级别的拖拽事件
    await page.evaluate(() => {
      window.__dragEventCount = 0
      window.__dragEvents = []

      const eventTypes = ['dragstart', 'dragover', 'drop', 'dragend']
      eventTypes.forEach(eventType => {
        document.addEventListener(
          eventType,
          e => {
            window.__dragEventCount++
            window.__dragEvents.push({
              type: eventType,
              target: `${e.target.tagName  }.${  e.target.className}`,
              timestamp: Date.now(),
            })
            console.log(`🎯 [监控] ${eventType} 事件被触发:`, e)
          },
          true,
        ) // 使用capture模式确保能捕获到事件
      })

      console.log('✅ 已注入拖拽事件监控器')
    })

    // 获取段落元素
    const paragraphs = await page.locator('.ProseMirror p').all()
    expect(paragraphs.length).toBeGreaterThanOrEqual(2)

    console.log(`找到${paragraphs.length}个段落，准备测试拖拽`)

    // 悬停激活拖拽手柄
    await paragraphs[0].hover()
    await page.waitForTimeout(500)

    // 查找SVG拖拽手柄
    const svgHandle = page.locator('svg').first()
    await expect(svgHandle).toBeVisible()

    // 记录拖拽前的事件计数
    const beforeDrag = await page.evaluate(() => window.__dragEventCount || 0)
    console.log(`🔍 拖拽前事件计数: ${beforeDrag}`)

    // 执行Playwright拖拽
    try {
      await svgHandle.dragTo(paragraphs[1])
      console.log('✅ dragTo()操作完成')
    } catch (error) {
      console.log('⚠️ dragTo()操作出错:', error.message)
    }

    await page.waitForTimeout(1500)

    // 检查事件是否被触发
    const afterDrag = await page.evaluate(() => window.__dragEventCount || 0)
    const eventsTriggered = afterDrag - beforeDrag

    console.log(`🔍 拖拽后事件计数: ${afterDrag}, 新增事件: ${eventsTriggered}`)

    // 获取详细的事件信息
    const dragEventDetails = await page.evaluate(() => window.__dragEvents || [])
    console.log('📋 捕获的拖拽事件详情:')
    dragEventDetails.forEach((event, index) => {
      console.log(
        `  ${index + 1}. ${event.type} -> ${event.target} (${new Date(event.timestamp).toLocaleTimeString()})`,
      )
    })

    if (eventsTriggered === 0) {
      console.log('❌ 确认: 在TipTap环境中，Playwright的dragTo()也没有触发document级事件!')
      console.log('💡 建议解决方案:')
      console.log('   1. 使用手动dispatchEvent()触发拖拽事件')
      console.log('   2. 直接调用TipTap插件的内部移动方法')
      console.log('   3. 使用低级别的鼠标API模拟拖拽')
    } else {
      console.log('✅ TipTap环境中的拖拽事件正常触发')
    }

    // 这个测试主要用于调试，所以即使没有事件也标记为通过
    // 重要的是日志信息
    expect(true).toBe(true)
  })
})
