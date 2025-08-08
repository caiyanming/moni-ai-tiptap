import { test } from '@playwright/test'

/**
 * 🎯 获取插件详细日志信息
 * 修改console.log来正确序列化调试对象
 */
test.describe('插件详细日志测试', () => {
  test('获取序列化的调试信息', async ({ page }) => {
    await page.goto('/src/Extensions/DragHandle/React/')
    await page.waitForSelector('.ProseMirror', { state: 'visible' })
    await page.waitForTimeout(2000)

    // 在页面上下文中重写console.log来捕获详细信息
    const detailedDebugResult = await page.evaluate(() => {
      const logs: any[] = []
      
      // 重写console.log
      const originalLog = console.log
      const originalError = console.error
      
      console.log = (...args) => {
        if (args[0] && typeof args[0] === 'string' && args[0].includes('[DEBUG]')) {
          try {
            // 尝试序列化所有参数
            const serializedArgs = args.map(arg => {
              if (typeof arg === 'object' && arg !== null) {
                return JSON.stringify(arg, null, 2)
              }
              return arg
            })
            logs.push({
              type: 'log',
              message: serializedArgs.join(' '),
              timestamp: Date.now()
            })
          } catch (e) {
            logs.push({
              type: 'log',
              message: args[0] + ' [对象无法序列化]',
              timestamp: Date.now()
            })
          }
        }
        return originalLog(...args)
      }

      console.error = (...args) => {
        logs.push({
          type: 'error',
          message: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg).join(' '),
          timestamp: Date.now()
        })
        return originalError(...args)
      }

      // 执行拖拽测试
      const paragraphs = document.querySelectorAll('p')
      const firstParagraph = paragraphs[0] as HTMLElement
      const secondParagraph = paragraphs[1] as HTMLElement

      if (!firstParagraph || !secondParagraph) {
        return { error: '段落未找到' }
      }

      // 简化的拖拽流程，专注于drop事件
      const performDragTest = () => {
        const dataTransfer = new DataTransfer()
        dataTransfer.setData('text/html', '')

        // 1. 先触发 dragstart
        const dragStartEvent = new DragEvent('dragstart', {
          bubbles: true,
          cancelable: true,
          dataTransfer: dataTransfer
        })
        Object.defineProperty(dragStartEvent, 'target', { 
          value: firstParagraph, 
          configurable: true 
        })
        document.dispatchEvent(dragStartEvent)

        // 2. 等待50ms后触发 drop
        setTimeout(() => {
          const rect2 = secondParagraph.getBoundingClientRect()
          const dropEvent = new DragEvent('drop', {
            bubbles: true,
            cancelable: true,
            clientX: rect2.x + rect2.width / 2,
            clientY: rect2.y + rect2.height + 10,
            dataTransfer: dataTransfer
          })

          Object.defineProperty(dropEvent, 'target', { 
            value: secondParagraph, 
            configurable: true 
          })
          
          document.dispatchEvent(dropEvent)
        }, 50)
      }

      performDragTest()

      // 收集结果
      return new Promise(resolve => {
        setTimeout(() => {
          // 恢复原始console方法
          console.log = originalLog
          console.error = originalError

          resolve({
            success: true,
            logs: logs,
            totalLogs: logs.length
          })
        }, 800)
      })
    })

    console.log('🎯 [TEST] 详细调试结果:')
    const result = await detailedDebugResult
    
    if (result && typeof result === 'object' && 'logs' in result) {
      result.logs.forEach((log: any, index: number) => {
        console.log(`\n📝 [${index + 1}] ${log.type.toUpperCase()}:`)
        console.log(log.message)
      })
      
      console.log(`\n📊 [TEST] 总共捕获 ${result.totalLogs} 条日志`)
    }
  })
})