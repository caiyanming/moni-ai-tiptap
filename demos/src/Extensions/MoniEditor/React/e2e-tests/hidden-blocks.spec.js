import { test, expect } from '@playwright/test'

/**
 * HiddenBlock Extension E2E 测试
 * 验证隐藏块扩展在真实浏览器中的行为
 */

test.describe('👁️ HiddenBlock Extension - 真实浏览器测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/Extensions/MoniEditor/React/')
    await page.waitForSelector('[data-testid="editor-content"]', { state: 'visible' })
  })

  test('应该能够插入隐藏块而不影响可见内容', async ({ page }) => {
    // 获取插入前的可见段落数量
    const initialParagraphs = await page.locator('p[data-moni-block-id]:visible').count()
    
    // 点击插入隐藏块按钮
    const hiddenBlockButton = page.locator('button:has-text("👁️ Insert Hidden Block")')
    await expect(hiddenBlockButton).toBeVisible()
    await hiddenBlockButton.click()
    
    // 验证可见段落数量没有变化
    await page.waitForTimeout(500) // 等待DOM更新
    const afterParagraphs = await page.locator('p[data-moni-block-id]:visible').count()
    expect(afterParagraphs).toBe(initialParagraphs)
    
    // 验证没有新的可见内容被添加
    await expect(page.locator('text=hiddenBlock')).not.toBeVisible()
    
    // 但是在Debug模式下应该能看到隐藏块的痕迹
    const debugButton = page.locator('button:has-text("Show Debug")')
    await debugButton.click()
    
    // 检查Debug面板中是否有隐藏块的信息
    await expect(page.locator('text=🐛 Debug Panel')).toBeVisible()
    
    // 截图记录状态
    await page.screenshot({ 
      path: './test-results/hidden-block-inserted.png',
      fullPage: true 
    })
  })

  test('应该在插入隐藏块后自动触发AI操作', async ({ page }) => {
    // 插入隐藏块
    const hiddenBlockButton = page.locator('button:has-text("👁️ Insert Hidden Block")')
    await hiddenBlockButton.click()
    
    // 等待自动AI操作被触发（设置了1秒延迟）
    await expect(page.locator('text=Pending AI Operations')).toBeVisible({ timeout: 2000 })
    
    // 验证AI操作描述包含隐藏块相关信息
    const operationDescription = page.locator('text*=AI inserted content targeting hidden block')
    await expect(operationDescription).toBeVisible()
    
    // 验证操作类型是INSERT
    const insertOperation = page.locator('text=INSERT')
    await expect(insertOperation).toBeVisible()
    
    // 截图记录AI操作队列
    await page.screenshot({ 
      path: './test-results/hidden-block-ai-operation.png',
      fullPage: true 
    })
  })

  test('应该能够批准针对隐藏块的AI操作', async ({ page }) => {
    // 获取初始段落数量
    const initialParagraphs = await page.locator('p[data-moni-block-id]:visible').count()
    
    // 插入隐藏块并等待AI操作
    await page.locator('button:has-text("👁️ Insert Hidden Block")').click()
    await expect(page.locator('text=Pending AI Operations')).toBeVisible({ timeout: 2000 })
    
    // 批准AI操作
    const approveButton = page.locator('button:has-text("✓ Approve")').first()
    await approveButton.click()
    
    // 验证新内容被插入到编辑器中
    await expect(page.locator('p[data-moni-block-id]:visible')).toHaveCount(initialParagraphs + 1, { timeout: 2000 })
    
    // 验证插入的内容包含预期文本
    const targetContent = page.locator('p:has-text("This content was inserted via a hidden block target")')
    await expect(targetContent).toBeVisible()
    
    // 截图记录执行结果
    await page.screenshot({ 
      path: './test-results/hidden-block-operation-executed.png',
      fullPage: true 
    })
  })

  test('🔧 验证隐藏块不在渲染的DOM中', async ({ page }) => {
    // 插入隐藏块
    await page.locator('button:has-text("👁️ Insert Hidden Block")').click()
    await page.waitForTimeout(500)
    
    // 检查DOM中是否存在隐藏块相关的可见元素
    const hiddenBlockElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('[data-type="hiddenBlock"], .moni-hidden-block, .hidden-block')
      return Array.from(elements).map(el => ({
        tagName: el.tagName,
        className: el.className,
        visible: el.offsetParent !== null,
        display: window.getComputedStyle(el).display
      }))
    })
    
    // 验证隐藏块元素要么不存在，要么不可见
    hiddenBlockElements.forEach(element => {
      expect(element.visible).toBe(false)
      if (element.display !== 'none') {
        console.warn('Hidden block element found but not hidden:', element)
      }
    })
    
    // 验证隐藏块相关的CSS类生效
    const hiddenElements = await page.locator('.moni-hidden-block').all()
    for (const element of hiddenElements) {
      await expect(element).not.toBeVisible()
    }
  })

  test('应该在Debug模式下显示隐藏块信息', async ({ page }) => {
    // 插入多个隐藏块
    for (let i = 0; i < 3; i++) {
      await page.locator('button:has-text("👁️ Insert Hidden Block")').click()
      await page.waitForTimeout(200)
    }
    
    // 启用Debug模式
    await page.locator('button:has-text("Show Debug")').click()
    await expect(page.locator('text=🐛 Debug Panel')).toBeVisible()
    
    // 检查Debug面板中的文档结构
    const documentNodes = page.locator('text=🌳 Document Nodes')
    await expect(documentNodes).toBeVisible()
    
    // 虽然隐藏块不可见，但在Debug信息中可能有记录
    // 检查是否有隐藏块相关的操作记录
    const streamOperations = page.locator('text=🔄 Stream Operations')
    if (await streamOperations.isVisible()) {
      // 应该能看到插入隐藏块触发的操作
      const hiddenBlockOperations = page.locator('text*=hidden block')
      await expect(hiddenBlockOperations.first()).toBeVisible()
    }
    
    // 截图记录Debug状态
    await page.screenshot({ 
      path: './test-results/hidden-block-debug-info.png',
      fullPage: true 
    })
  })

  test('应该支持多个隐藏块的独立操作', async ({ page }) => {
    const initialParagraphs = await page.locator('p[data-moni-block-id]:visible').count()
    
    // 插入3个隐藏块
    for (let i = 0; i < 3; i++) {
      await page.locator('button:has-text("👁️ Insert Hidden Block")').click()
      await page.waitForTimeout(1200) // 等待AI操作触发
    }
    
    // 验证生成了3个AI操作
    await expect(page.locator('text=Pending AI Operations')).toBeVisible({ timeout: 5000 })
    
    const approveButtons = page.locator('button:has-text("✓ Approve")')
    const operationCount = await approveButtons.count()
    expect(operationCount).toBe(3)
    
    // 批准所有操作
    await page.locator('button:has-text("Approve All")').click()
    
    // 验证3个新段落被添加
    await expect(page.locator('p[data-moni-block-id]:visible')).toHaveCount(initialParagraphs + 3, { timeout: 3000 })
    
    // 验证每个新段落都包含隐藏块目标内容
    const targetParagraphs = page.locator('p:has-text("This content was inserted via a hidden block target")')
    await expect(targetParagraphs).toHaveCount(3)
  })

  test('🔧 验证NULL_UUID系统实现', async ({ page }) => {
    // 插入隐藏块
    await page.locator('button:has-text("👁️ Insert Hidden Block")').click()
    
    // 通过开发者工具检查UUID系统
    const uuidInfo = await page.evaluate(() => {
      // 查找可能的UUID相关属性
      const allElements = document.querySelectorAll('*[data-moni-block-id], *[id*="hidden"]')
      const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
      
      const foundUUIDs = []
      allElements.forEach(el => {
        const blockId = el.getAttribute('data-moni-block-id') || el.id
        if (blockId && uuidPattern.test(blockId)) {
          foundUUIDs.push({
            element: el.tagName,
            id: blockId,
            visible: el.offsetParent !== null
          })
        }
      })
      
      return foundUUIDs
    })
    
    // 验证找到了隐藏块的UUID
    const hiddenBlockUUIDs = uuidInfo.filter(item => item.id.includes('hidden') || !item.visible)
    expect(hiddenBlockUUIDs.length).toBeGreaterThan(0)
    
    // 验证UUID格式正确
    hiddenBlockUUIDs.forEach(item => {
      expect(item.id).toMatch(/^hidden-\d+$|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
    })
  })

  test('应该在不同编辑器状态下正确处理隐藏块', async ({ page }) => {
    // 测试只读模式下的隐藏块
    const editableButton = page.locator('button:has-text("✏️ Editable")')
    await editableButton.click() // 切换到只读模式
    
    // 验证隐藏块按钮被禁用
    const hiddenBlockButton = page.locator('button:has-text("👁️ Insert Hidden Block")')
    await expect(hiddenBlockButton).toBeDisabled()
    
    // 切换回编辑模式
    const readOnlyButton = page.locator('button:has-text("🔒 Read-only")')
    await readOnlyButton.click()
    
    // 验证隐藏块按钮重新启用
    await expect(hiddenBlockButton).not.toBeDisabled()
    
    // 在编辑模式下插入隐藏块应该正常工作
    await hiddenBlockButton.click()
    await expect(page.locator('text=Pending AI Operations')).toBeVisible({ timeout: 2000 })
  })

  test('应该处理隐藏块操作的性能影响', async ({ page }) => {
    const startTime = Date.now()
    
    // 快速插入多个隐藏块
    for (let i = 0; i < 10; i++) {
      await page.locator('button:has-text("👁️ Insert Hidden Block")').click()
      // 不等待，快速连续插入
    }
    
    const insertTime = Date.now()
    const insertDuration = insertTime - startTime
    
    // 插入操作应该很快完成（小于2秒）
    expect(insertDuration).toBeLessThan(2000)
    
    // 等待AI操作队列稳定
    await expect(page.locator('text=Pending AI Operations')).toBeVisible({ timeout: 5000 })
    
    // 验证页面仍然响应
    await expect(page.locator('h1')).toHaveText('MoniAI TipTap Editor Demo')
    
    // 验证操作队列数量合理
    const approveButtons = page.locator('button:has-text("✓ Approve")')
    const operationCount = await approveButtons.count()
    expect(operationCount).toBeLessThanOrEqual(10) // 应该不超过插入的隐藏块数量
    
    const endTime = Date.now()
    const totalDuration = endTime - startTime
    
    // 整个过程应该在合理时间内完成
    expect(totalDuration).toBeLessThan(10000) // 10秒内
    
    // 截图记录性能测试结果
    await page.screenshot({ 
      path: './test-results/hidden-block-performance.png',
      fullPage: true 
    })
  })
})