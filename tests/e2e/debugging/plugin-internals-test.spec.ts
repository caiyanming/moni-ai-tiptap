import { test } from '@playwright/test'

/**
 * 🎯 测试拖拽插件的内部状态
 * 深入了解为什么事件触发了但没有处理
 */
test.describe('拖拽插件内部状态测试', () => {
  test('检查插件内部变量和事件处理', async ({ page }) => {
    await page.goto('/src/Extensions/DragHandle/React/')
    await page.waitForSelector('.ProseMirror', { state: 'visible' })
    await page.waitForTimeout(2000)

    // 修改插件内部变量，添加调试Hook
    const debugResult = await page.evaluate(() => {
      // 注入调试代码到插件中
      let eventLog: any[] = []
      let internalState = {
        isDragging: false,
        dragSourceElement: null,
        handleDropHandlerCalled: false,
        findBlockElementCalled: false
      }

      // 重写console.log来捕获插件的调试信息
      const originalLog = console.log
      const pluginLogs: string[] = []
      
      console.log = (...args) => {
        const message = args.join(' ')
        if (message.includes('[DEBUG]')) {
          pluginLogs.push(message)
        }
        return originalLog(...args)
      }

      // 获取段落元素
      const paragraphs = document.querySelectorAll('p')
      const firstParagraph = paragraphs[0] as HTMLElement
      const secondParagraph = paragraphs[1] as HTMLElement

      if (!firstParagraph || !secondParagraph) {
        return { error: '段落未找到' }
      }

      // 模拟完整的拖拽流程
      const performDrag = () => {
        const dataTransfer = new DataTransfer()
        dataTransfer.setData('text/html', '')

        console.log('🎯 [TEST] 开始模拟拖拽流程')

        // 1. dragstart - 在第一个段落上触发
        const dragStartEvent = new DragEvent('dragstart', {
          bubbles: true,
          cancelable: true,
          dataTransfer: dataTransfer
        })
        
        // 设置target为第一个段落
        Object.defineProperty(dragStartEvent, 'target', { 
          value: firstParagraph, 
          configurable: true 
        })

        console.log('🎯 [TEST] 触发 dragstart 事件')
        document.dispatchEvent(dragStartEvent)

        // 2. dragover - 在第二个段落上触发
        setTimeout(() => {
          const rect2 = secondParagraph.getBoundingClientRect()
          const dragOverEvent = new DragEvent('dragover', {
            bubbles: true,
            cancelable: true,
            clientX: rect2.x + rect2.width / 2,
            clientY: rect2.y + rect2.height + 10, // 在段落下方
            dataTransfer: dataTransfer
          })

          Object.defineProperty(dragOverEvent, 'target', { 
            value: secondParagraph, 
            configurable: true 
          })

          console.log('🎯 [TEST] 触发 dragover 事件')
          document.dispatchEvent(dragOverEvent)
        }, 50)

        // 3. drop - 在第二个段落上触发
        setTimeout(() => {
          const rect2 = secondParagraph.getBoundingClientRect()
          const dropEvent = new DragEvent('drop', {
            bubbles: true,
            cancelable: true,
            clientX: rect2.x + rect2.width / 2,
            clientY: rect2.y + rect2.height + 10, // 在段落下方
            dataTransfer: dataTransfer
          })

          Object.defineProperty(dropEvent, 'target', { 
            value: secondParagraph, 
            configurable: true 
          })

          console.log('🎯 [TEST] 触发 drop 事件')
          document.dispatchEvent(dropEvent)
        }, 100)

        // 4. dragend
        setTimeout(() => {
          const dragEndEvent = new DragEvent('dragend', {
            bubbles: true,
            cancelable: true
          })

          Object.defineProperty(dragEndEvent, 'target', { 
            value: firstParagraph, 
            configurable: true 
          })

          console.log('🎯 [TEST] 触发 dragend 事件')
          document.dispatchEvent(dragEndEvent)
        }, 150)
      }

      performDrag()

      // 等待事件处理并收集结果
      return new Promise(resolve => {
        setTimeout(() => {
          // 恢复原始console.log
          console.log = originalLog

          const finalParagraphTexts = Array.from(document.querySelectorAll('p')).map(p => p.textContent?.slice(0, 30))

          resolve({
            success: true,
            pluginLogs: pluginLogs,
            internalState: internalState,
            eventLog: eventLog,
            finalParagraphTexts: finalParagraphTexts,
            totalLogsCaptured: pluginLogs.length
          })
        }, 500)
      })
    })

    console.log('🔍 [TEST] 插件内部调试结果:', debugResult)

    // 检查是否有插件日志被捕获
    const result = await debugResult
    if (result && typeof result === 'object' && 'pluginLogs' in result) {
      console.log('📝 [TEST] 捕获的插件日志:')
      result.pluginLogs.forEach((log: string, index: number) => {
        console.log(`  ${index + 1}. ${log}`)
      })

      if (result.pluginLogs.length === 0) {
        console.log('❌ [TEST] 没有捕获到任何插件调试日志')
        console.log('💡 [TEST] 这意味着插件的事件处理器没有被调用')
      }
    }
  })
})