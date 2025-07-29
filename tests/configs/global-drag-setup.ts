/**
 * 🎯 拖拽流畅度测试全局设置
 * 用于配置测试环境和性能监控
 */

import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  console.log('🚀 开始拖拽流畅度测试环境设置...')
  
  // 1. 预热浏览器和服务器
  const browser = await chromium.launch()
  const page = await browser.newPage()
  
  try {
    console.log('🔧 预热服务器连接...')
    await page.goto('http://localhost:3000/src/Extensions/MoniEditor/React/index.html', {
      waitUntil: 'networkidle',
      timeout: 60000
    })
    
    // 2. 检查关键组件是否加载
    console.log('✅ 检查编辑器组件加载状态...')
    await page.waitForSelector('.ProseMirror', { timeout: 30000 })
    await page.waitForSelector('[data-moni-block-id]', { timeout: 10000 })
    
    // 3. 初始化性能监控
    console.log('📊 初始化性能监控工具...')
    await page.addInitScript(() => {
      // 全局性能监控
      window.dragTestMetrics = {
        startTime: Date.now(),
        frames: [],
        dragEvents: [],
        memoryUsage: []
      }
      
      // 监控内存使用
      if ((performance as any).memory) {
        setInterval(() => {
          const memory = (performance as any).memory
          window.dragTestMetrics.memoryUsage.push({
            timestamp: Date.now(),
            used: memory.usedJSHeapSize,
            total: memory.totalJSHeapSize,
            limit: memory.jsHeapSizeLimit
          })
        }, 1000)
      }
      
      // 监控长任务
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.duration > 50) { // 长任务阈值
              console.warn(`长任务检测: ${entry.name} - ${entry.duration}ms`)
            }
          })
        })
        observer.observe({ entryTypes: ['longtask'] })
      }
    })
    
    // 4. 预创建测试内容
    console.log('📝 预创建测试文档内容...')
    await page.fill('.ProseMirror', '')
    await page.keyboard.type('测试段落 1 - 用于拖拽流畅度验证')
    await page.keyboard.press('Enter')
    await page.keyboard.type('测试段落 2 - 拖拽目标段落')
    await page.keyboard.press('Enter')
    await page.keyboard.type('测试段落 3 - 可嵌套段落')
    
    // 5. 测试基本拖拽功能
    console.log('🧪 验证基础拖拽功能...')
    const firstParagraph = page.locator('p').first()
    await firstParagraph.hover()
    
    const dragHandle = page.locator('.drag-handle').first()
    const isHandleVisible = await dragHandle.isVisible({ timeout: 3000 })
    
    if (!isHandleVisible) {
      console.warn('⚠️ 警告: 拖拽手柄未正确显示，某些测试可能失败')
    } else {
      console.log('✅ 拖拽手柄显示正常')
    }
    
    console.log('🎯 测试环境设置完成')
    
  } catch (error) {
    console.error('❌ 测试环境设置失败:', error)
    throw error
  } finally {
    await browser.close()
  }
}

export default globalSetup