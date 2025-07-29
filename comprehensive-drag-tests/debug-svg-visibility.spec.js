/**
 * 🔍 SVG拖拽手柄可见性调试测试
 * 专门调试SVG显示和检测的问题
 */

import { test, expect } from '@playwright/test'

test.describe('SVG拖拽手柄可见性调试', () => {
  
  test('SVG手柄详细调试分析', async ({ page }) => {
    console.log('🔍 开始SVG拖拽手柄详细调试...')
    
    // 导航到测试页面
    await page.goto('http://localhost:3666/src/Extensions/DragHandle/React/')
    
    const proseMirror = page.locator('.ProseMirror')
    await proseMirror.waitFor({ state: 'visible', timeout: 10000 })
    
    // 插入测试内容
    await proseMirror.click()
    await page.keyboard.press('Meta+A')
    await page.keyboard.type('这是第一个测试段落。\\n\\n这是第二个测试段落。')
    await page.waitForTimeout(1000)
    
    const paragraphs = await proseMirror.locator('p').all()
    console.log(`📝 发现 ${paragraphs.length} 个段落`)
    
    if (paragraphs.length === 0) {
      console.log('❌ 没有找到段落元素')
      return
    }
    
    const firstParagraph = paragraphs[0]
    
    console.log('\\n=== 初始状态检测 ===')
    
    // 1. 检测初始SVG状态
    const initialSvgs = await page.locator('svg').all()
    console.log(`1️⃣ 初始SVG数量: ${initialSvgs.length}`)
    
    for (let i = 0; i < initialSvgs.length; i++) {
      const svg = initialSvgs[i]
      const isVisible = await svg.isVisible()
      const box = await svg.boundingBox()
      const opacity = await svg.evaluate(el => window.getComputedStyle(el).opacity)
      const display = await svg.evaluate(el => window.getComputedStyle(el).display)
      const visibility = await svg.evaluate(el => window.getComputedStyle(el).visibility)
      
      console.log(`   SVG ${i+1}:`)
      console.log(`     isVisible(): ${isVisible}`)
      console.log(`     boundingBox: ${box ? `${box.x},${box.y} ${box.width}x${box.height}` : 'null'}`)
      console.log(`     opacity: ${opacity}`)
      console.log(`     display: ${display}`)
      console.log(`     visibility: ${visibility}`)
    }
    
    console.log('\\n=== 悬停前状态 ===')
    
    // 2. 悬停前的详细检查
    const allElements = await page.locator('*').all()
    const svgRelatedElements = []
    
    for (const element of allElements.slice(0, 50)) { // 只检查前50个元素避免过多
      try {
        const tagName = await element.evaluate(el => el.tagName.toLowerCase())
        if (tagName === 'svg' || 
            (await element.evaluate(el => el.className && el.className.includes && (
              el.className.includes('drag') || 
              el.className.includes('handle') ||
              el.className.includes('svg')
            )))) {
          svgRelatedElements.push({
            tagName,
            className: await element.evaluate(el => el.className || ''),
            visible: await element.isVisible()
          })
        }
      } catch (e) {
        // 忽略无法访问的元素
      }
    }
    
    console.log(`2️⃣ 找到 ${svgRelatedElements.length} 个疑似拖拽相关元素:`)
    svgRelatedElements.forEach((el, i) => {
      console.log(`   ${i+1}. <${el.tagName}> class="${el.className}" visible=${el.visible}`)
    })
    
    console.log('\\n=== 执行悬停操作 ===')
    
    // 3. 悬停操作
    console.log('3️⃣ 悬停在第一个段落上...')
    await firstParagraph.hover()
    await page.waitForTimeout(1000) // 给足够时间让动画完成
    
    console.log('\\n=== 悬停后状态检测 ===')
    
    // 4. 悬停后重新检测SVG
    const afterHoverSvgs = await page.locator('svg').all()
    console.log(`4️⃣ 悬停后SVG数量: ${afterHoverSvgs.length}`)
    
    for (let i = 0; i < afterHoverSvgs.length; i++) {
      const svg = afterHoverSvgs[i]
      const isVisible = await svg.isVisible()
      const box = await svg.boundingBox()
      const opacity = await svg.evaluate(el => window.getComputedStyle(el).opacity)
      const display = await svg.evaluate(el => window.getComputedStyle(el).display)
      const visibility = await svg.evaluate(el => window.getComputedStyle(el).visibility)
      const zIndex = await svg.evaluate(el => window.getComputedStyle(el).zIndex)
      const position = await svg.evaluate(el => window.getComputedStyle(el).position)
      
      console.log(`   SVG ${i+1}:`)
      console.log(`     isVisible(): ${isVisible}`)
      console.log(`     boundingBox: ${box ? `${box.x},${box.y} ${box.width}x${box.height}` : 'null'}`)
      console.log(`     opacity: ${opacity}`)
      console.log(`     display: ${display}`)
      console.log(`     visibility: ${visibility}`)
      console.log(`     z-index: ${zIndex}`)
      console.log(`     position: ${position}`)
      
      // 尝试获取SVG内容
      try {
        const innerHTML = await svg.innerHTML()
        console.log(`     innerHTML: ${innerHTML}`)
      } catch (e) {
        console.log(`     innerHTML: 获取失败 - ${e.message}`)
      }
    }
    
    console.log('\\n=== 其他选择器测试 ===')
    
    // 5. 尝试其他可能的选择器
    const alternativeSelectors = [
      'svg',
      '[data-drag-handle]', 
      '.drag-handle',
      '[class*="drag"]',
      '[class*="handle"]',
      'button[class*="drag"]',
      '*[role="button"]',
      'div[draggable="true"]'
    ]
    
    console.log('5️⃣ 测试各种可能的选择器:')
    for (const selector of alternativeSelectors) {
      try {
        const elements = await page.locator(selector).all()
        console.log(`   "${selector}": ${elements.length} 个元素`)
        
        if (elements.length > 0) {
          const firstEl = elements[0]
          const visible = await firstEl.isVisible()
          const box = await firstEl.boundingBox()
          console.log(`     第一个元素: visible=${visible}, box=${box ? 'exists' : 'null'}`)
        }
      } catch (e) {
        console.log(`   "${selector}": 选择器错误 - ${e.message}`)
      }
    }
    
    console.log('\\n=== DOM结构分析 ===')
    
    // 6. 分析DOM结构
    console.log('6️⃣ 分析ProseMirror周围的DOM结构:')
    try {
      const proseMirrorParent = page.locator('.ProseMirror').locator('..')
      const siblingElements = await proseMirrorParent.locator('> *').all()
      
      console.log(`   ProseMirror同级元素数量: ${siblingElements.length}`)
      for (let i = 0; i < Math.min(siblingElements.length, 10); i++) {
        const sibling = siblingElements[i]
        const tagName = await sibling.evaluate(el => el.tagName.toLowerCase())
        const className = await sibling.evaluate(el => el.className || '')
        const visible = await sibling.isVisible()
        console.log(`     ${i+1}. <${tagName}> class="${className}" visible=${visible}`)
      }
    } catch (e) {
      console.log(`   DOM结构分析失败: ${e.message}`)
    }
    
    console.log('\\n=== 鼠标交互测试 ===')
    
    // 7. 尝试点击检测
    console.log('7️⃣ 尝试在不同位置查找可点击元素:')
    const paragraphBox = await firstParagraph.boundingBox()
    
    if (paragraphBox) {
      const testPoints = [
        { x: paragraphBox.x - 30, y: paragraphBox.y + paragraphBox.height/2, name: '段落左侧' },
        { x: paragraphBox.x + 10, y: paragraphBox.y + paragraphBox.height/2, name: '段落内部' },
        { x: paragraphBox.x + 50, y: paragraphBox.y + paragraphBox.height/2, name: '段落前50px' }
      ]
      
      for (const point of testPoints) {
        console.log(`   测试点 ${point.name} (${point.x}, ${point.y}):`)
        
        await page.mouse.move(point.x, point.y)
        await page.waitForTimeout(300)
        
        // 检查此位置的元素
        try {
          const elementAtPoint = await page.evaluate(({ x, y }) => {
            const el = document.elementFromPoint(x, y)
            if (el) {
              return {
                tagName: el.tagName.toLowerCase(),
                className: el.className || '',
                id: el.id || '',
                cursor: window.getComputedStyle(el).cursor
              }
            }
            return null
          }, point)
          
          if (elementAtPoint) {
            console.log(`     元素: <${elementAtPoint.tagName}> class="${elementAtPoint.className}" cursor="${elementAtPoint.cursor}"`)
          } else {
            console.log(`     没有找到元素`)
          }
        } catch (e) {
          console.log(`     检测失败: ${e.message}`)
        }
      }
    }
    
    console.log('\\n=== 总结 ===')
    console.log('🎯 调试总结:')
    console.log(`   初始SVG数量: ${initialSvgs.length}`)
    console.log(`   悬停后SVG数量: ${afterHoverSvgs.length}`)
    console.log(`   SVG可见性变化: ${initialSvgs.length !== afterHoverSvgs.length ? '有变化' : '无变化'}`)
    
    // 简单断言 - 不强制失败，只记录结果
    const hasSvgElements = afterHoverSvgs.length > 0
    console.log(`\\n📊 测试结果: ${hasSvgElements ? '找到SVG元素' : '未找到SVG元素'}`)
    
    // 保持浏览器打开以便人工检查
    console.log('\\n🔍 保持浏览器打开10秒供人工检查...')
    await page.waitForTimeout(10000)
  })
})