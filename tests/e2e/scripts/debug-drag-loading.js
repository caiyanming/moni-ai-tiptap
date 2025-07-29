/**
 * 🔍 调试拖拽页面加载问题
 * 捕获浏览器控制台错误和网络请求
 */

const { chromium } = require('@playwright/test')

async function debugDragLoading() {
  console.log('🔍 启动拖拽页面加载调试...\n')
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  })
  
  const page = await browser.newPage()
  
  // 监听控制台消息和错误
  page.on('console', msg => {
    const type = msg.type()
    const text = msg.text()
    console.log(`   🖥️  Console [${type}]: ${text}`)
  })
  
  page.on('pageerror', error => {
    console.log(`   ❌ Page Error: ${error.message}`)
  })
  
  // 监听网络请求
  page.on('request', request => {
    console.log(`   📡 Request: ${request.method()} ${request.url()}`)
  })
  
  page.on('response', response => {
    const status = response.status()
    const url = response.url()
    if (status >= 400) {
      console.log(`   🚨 Failed Response: ${status} ${url}`)
    }
  })
  
  try {
    console.log('📱 加载 React 拖拽页面...')
    await page.goto('http://localhost:3666/preview/Extensions/DragHandle/React', {
      waitUntil: 'networkidle',
      timeout: 30000
    })
    
    console.log('   ⏳ 等待页面完全加载...')
    await page.waitForTimeout(15000) // 15秒
    
    // 检查页面内容
    const bodyText = await page.textContent('body')
    console.log(`   📄 页面内容长度: ${bodyText?.length || 0} 字符`)
    
    if (bodyText && bodyText.length > 100) {
      console.log(`   📄 页面内容预览: ${bodyText.substring(0, 200)}...`)
    }
    
    // 检查是否有 React 根元素
    const appElement = await page.locator('#app').count()
    console.log(`   🔍 #app 元素数量: ${appElement}`)
    
    // 检查 app 元素的内容
    if (appElement > 0) {
      const appContent = await page.locator('#app').textContent()
      console.log(`   📱 #app 内容: "${appContent}"`)
      const appHTML = await page.locator('#app').innerHTML()
      console.log(`   📱 #app HTML: ${appHTML.substring(0, 300)}...`)
    }
    
    // 尝试查找任何编辑器相关元素
    const prosemirrorCount = await page.locator('.ProseMirror').count()
    const editableCount = await page.locator('[contenteditable]').count()
    const tiptapCount = await page.locator('[class*="tip"]').count()
    
    console.log(`   📝 .ProseMirror 元素: ${prosemirrorCount}`)
    console.log(`   📝 [contenteditable] 元素: ${editableCount}`)
    console.log(`   📝 TipTap 相关元素: ${tiptapCount}`)
    
    // 等待更长时间看是否有延迟加载
    console.log('   ⏳ 再等待 10 秒看是否有延迟加载...')
    await page.waitForTimeout(10000)
    
    const finalProsemirrorCount = await page.locator('.ProseMirror').count()
    console.log(`   📝 最终 .ProseMirror 元素: ${finalProsemirrorCount}`)
    
    if (finalProsemirrorCount > 0) {
      console.log('   🎉 拖拽页面最终加载成功！')
    } else {
      console.log('   ❌ 拖拽页面加载失败，没有找到编辑器')
    }
    
  } catch (error) {
    console.log(`❌ 调试过程中出现错误: ${error.message}`)
  } finally {
    // 保持浏览器打开以便手动检查
    console.log('🔍 浏览器将保持打开 30 秒以供手动检查...')
    await page.waitForTimeout(30000)
    await browser.close()
  }
}

// 运行调试
debugDragLoading().catch(console.error)