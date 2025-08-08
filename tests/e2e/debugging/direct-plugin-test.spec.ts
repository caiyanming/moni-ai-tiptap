import { test } from '@playwright/test'

/**
 * 🎯 直接测试拖拽插件的事件响应
 * 验证插件是否正确初始化和响应事件
 */
test.describe('拖拽插件直接测试', () => {
  test('验证插件事件监听器是否被正确添加', async ({ page }) => {
    // 导航到演示页面
    await page.goto('/src/Extensions/DragHandle/React/')
    await page.waitForSelector('.ProseMirror', { state: 'visible' })

    // 等待编辑器初始化
    await page.waitForTimeout(2000)

    // 在页面上下文中直接测试插件状态
    const pluginStatus = await page.evaluate(() => {
      const editor = (window as any).__tiptapEditor
      if (!editor) {
        return { error: '编辑器未找到' }
      }

      const proseMirrorView = editor.view
      if (!proseMirrorView) {
        return { error: 'ProseMirror View未找到' }
      }

      // 检查插件是否已加载
      const plugins = proseMirrorView.state.plugins
      const dragPlugins = plugins.filter((p: any) => 
        p.key && (p.key.toString().includes('drag') || p.key.toString().includes('Drag'))
      )

      return {
        success: true,
        totalPlugins: plugins.length,
        dragPlugins: dragPlugins.length,
        dragPluginKeys: dragPlugins.map((p: any) => p.key.toString()),
        editorExtensions: editor.extensionManager.extensions.map((ext: any) => ext.name)
      }
    })

    console.log('🔍 [DEBUG] 插件状态检查结果:', pluginStatus)

    // 手动触发拖拽事件，直接在页面上下文中监听
    const eventTestResult = await page.evaluate(() => {
      let eventsCaught = []
      
      // 添加临时事件监听器来捕获我们的测试事件
      const captureEvent = (e: Event) => {
        eventsCaught.push({
          type: e.type,
          target: (e.target as Element)?.tagName,
          timestamp: Date.now()
        })
      }

      // 监听所有拖拽事件
      document.addEventListener('dragstart', captureEvent)
      document.addEventListener('dragover', captureEvent)  
      document.addEventListener('drop', captureEvent)
      document.addEventListener('dragend', captureEvent)

      // 获取第一个段落
      const firstParagraph = document.querySelector('p')
      if (!firstParagraph) {
        return { error: '段落未找到' }
      }

      // 创建并触发拖拽事件
      const dataTransfer = new DataTransfer()
      dataTransfer.setData('text/html', '')

      // 触发一系列拖拽事件
      const events = [
        new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer }),
        new DragEvent('dragover', { bubbles: true, cancelable: true, clientX: 100, clientY: 200 }),
        new DragEvent('drop', { bubbles: true, cancelable: true, clientX: 100, clientY: 200, dataTransfer }),
        new DragEvent('dragend', { bubbles: true, cancelable: true })
      ]

      events.forEach(event => {
        // 在document上触发事件
        document.dispatchEvent(event)
        // 也在段落元素上触发
        firstParagraph.dispatchEvent(event)
      })

      // 等待事件处理
      setTimeout(() => {
        // 清理事件监听器
        document.removeEventListener('dragstart', captureEvent)
        document.removeEventListener('dragover', captureEvent)
        document.removeEventListener('drop', captureEvent)  
        document.removeEventListener('dragend', captureEvent)
      }, 100)

      return {
        success: true,
        eventsCaught: eventsCaught.length,
        eventDetails: eventsCaught
      }
    })

    console.log('🎯 [DEBUG] 事件测试结果:', eventTestResult)

    // 等待一下让所有事件处理完成
    await page.waitForTimeout(500)

    // 检查段落是否有变化
    const finalState = await page.evaluate(() => {
      const paragraphs = Array.from(document.querySelectorAll('p'))
      return {
        paragraphCount: paragraphs.length,
        paragraphTexts: paragraphs.map(p => p.textContent?.slice(0, 30))
      }
    })

    console.log('📋 [DEBUG] 最终状态:', finalState)
    console.log('✅ [TEST] 插件直接测试完成')
  })
})