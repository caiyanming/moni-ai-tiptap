/**
 * 🔍 拖拽功能状态检查
 * 快速验证拖拽功能的实际状态和可用性
 */

import { test, expect } from '@playwright/test'

test.describe('🔍 拖拽功能状态检查', () => {
  test('快速检查拖拽功能实际状态', async ({ page }) => {
    await page.goto('/preview/Extensions/DragHandle')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)
    
    console.log('🔍 开始拖拽功能状态检查...')
    
    // 进入 iframe
    const iframe = page.frameLocator('iframe').first()
    await iframe.locator('.ProseMirror').waitFor({ timeout: 5000 })
    
    // 在 iframe 中执行检查脚本
    const dragStatus = await iframe.locator('body').evaluate(() => {
      const results = {
        editors: 0,
        paragraphs: 0,
        paragraphContent: [],
        dragElements: [],
        tiptapInstance: false,
        extensions: [],
        errors: []
      }
      
      try {
        // 1. 检查编辑器
        const proseMirrorElements = document.querySelectorAll('.ProseMirror')
        results.editors = proseMirrorElements.length
        
        if (proseMirrorElements.length > 0) {
          const editor = proseMirrorElements[0]
          
          // 2. 检查段落
          const paragraphs = editor.querySelectorAll('p')
          results.paragraphs = paragraphs.length
          
          paragraphs.forEach((p, index) => {
            results.paragraphContent.push({
              index,
              text: p.textContent,
              draggable: p.draggable,
              className: p.className
            })
          })
          
          // 3. 检查拖拽相关元素
          const dragSelectors = [
            '[data-drag-handle]',
            '.drag-handle',
            '[class*="drag"]',
            '.tiptap-drag-handle',
            '.moni-drag-indicator',
            '[draggable="true"]'
          ]
          
          dragSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector)
            if (elements.length > 0) {
              results.dragElements.push({
                selector,
                count: elements.length,
                visible: Array.from(elements).map(el => 
                  el.offsetWidth > 0 && el.offsetHeight > 0
                )
              })
            }
          })
        }
        
        // 4. 检查全局变量中的 TipTap 实例
        const globalEditor = (window as any).editor || (window as any).__tiptap_editor
        if (globalEditor) {
          results.tiptapInstance = true
          if (globalEditor.extensionManager && globalEditor.extensionManager.extensions) {
            results.extensions = globalEditor.extensionManager.extensions.map((ext: any) => ext.name)
          }
        }
        
      } catch (error) {
        results.errors.push(error.message)
      }
      
      return results
    })
    
    // 输出检查结果
    console.log('📊 拖拽功能状态检查结果:')
    console.log(`📝 编辑器数量: ${dragStatus.editors}`)
    console.log(`📄 段落数量: ${dragStatus.paragraphs}`)
    console.log(`🎯 TipTap 实例: ${dragStatus.tiptapInstance}`)
    console.log(`🔌 扩展列表: ${dragStatus.extensions.join(', ')}`)
    console.log(`🎪 拖拽元素:`, dragStatus.dragElements)
    
    if (dragStatus.paragraphContent.length > 0) {
      console.log('\n📝 段落详情:')
      dragStatus.paragraphContent.forEach(p => {
        console.log(`  段落 ${p.index}: "${p.text}" (draggable: ${p.draggable}, class: "${p.className}")`)
      })
    }
    
    if (dragStatus.errors.length > 0) {
      console.log('❌ 错误:', dragStatus.errors)
    }
    
    // 尝试触发悬停事件
    if (dragStatus.paragraphs > 0) {
      console.log('\n🎯 测试悬停触发拖拽手柄...')
      
      const paragraph = iframe.locator('p').first()
      await paragraph.hover()
      await page.waitForTimeout(1000) // 等待拖拽手柄出现
      
      // 再次检查是否有新的拖拽元素出现
      const afterHoverDragElements = await iframe.locator('body').evaluate(() => {
        const dragSelectors = [
          '[data-drag-handle]',
          '.drag-handle', 
          '[class*="drag"]',
          '.tiptap-drag-handle',
          '.moni-drag-indicator'
        ]
        
        const results = []
        dragSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector)
          if (elements.length > 0) {
            results.push({
              selector,
              count: elements.length,
              visible: Array.from(elements).map(el => {
                const rect = el.getBoundingClientRect()
                return rect.width > 0 && rect.height > 0
              }),
              positions: Array.from(elements).map(el => {
                const rect = el.getBoundingClientRect()
                return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
              })
            })
          }
        })
        return results
      })
      
      console.log('🔍 悬停后的拖拽元素:', afterHoverDragElements)
      
      if (afterHoverDragElements.length > 0) {
        console.log('✅ 悬停触发了拖拽相关元素！')
        afterHoverDragElements.forEach(element => {
          console.log(`  ${element.selector}: ${element.count} 个元素`)
          element.visible.forEach((visible, index) => {
            if (visible) {
              const pos = element.positions[index]
              console.log(`    元素 ${index}: 可见，位置 (${pos.x}, ${pos.y}), 大小 ${pos.width}x${pos.height}`)
            }
          })
        })
      } else {
        console.log('ℹ️ 悬停后未发现明显的拖拽手柄元素')
      }
    }
    
    // 基本断言
    expect(dragStatus.editors).toBeGreaterThan(0)
    expect(dragStatus.paragraphs).toBeGreaterThan(0)
    
    console.log('\n🎉 拖拽功能状态检查完成！')
  })
})