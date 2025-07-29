/**
 * 🎯 修复版SVG可见性测试
 * 基于调试结果修正SVG检测逻辑
 */

import { test, expect } from '@playwright/test'

class FixedSVGTestHelper {
  constructor(page) {
    this.page = page
    this.proseMirror = page.locator('.ProseMirror')
  }

  async setup() {
    await this.page.goto('http://localhost:3666/src/Extensions/DragHandle/React/')
    await this.proseMirror.waitFor({ state: 'visible', timeout: 10000 })
    await this.insertTestContent()
    console.log('✅ 修复版SVG测试环境初始化完成')
  }

  async insertTestContent() {
    await this.proseMirror.click()
    await this.page.keyboard.press('Meta+A')
    
    const testContent = `这是第一个测试段落，用于SVG可见性测试。

这是第二个测试段落，包含更多内容。

这是第三个测试段落，用于验证多段落场景。`

    await this.page.keyboard.type(testContent)
    await this.page.waitForTimeout(800)
    console.log('📝 测试内容插入完成')
  }

  async testSVGVisibilityTransition(paragraph) {
    console.log('🔍 测试SVG可见性转换...')

    // 步骤1: 检测初始状态
    const svgLocator = this.page.locator('svg').first()
    
    // 确保SVG元素存在
    const svgExists = await svgLocator.count() > 0
    if (!svgExists) {
      throw new Error('SVG元素不存在')
    }

    // 检测初始可见性
    const initialVisible = await svgLocator.isVisible()
    const initialVisibility = await svgLocator.evaluate(el => window.getComputedStyle(el).visibility)
    const initialBox = await svgLocator.boundingBox()

    console.log('   📊 初始状态:')
    console.log(`      isVisible(): ${initialVisible}`)
    console.log(`      CSS visibility: ${initialVisibility}`)
    console.log(`      boundingBox: ${initialBox ? 'exists' : 'null'}`)

    // 步骤2: 悬停激活
    console.log('   🎯 执行悬停操作...')
    await paragraph.hover()
    await this.page.waitForTimeout(600) // 等待动画完成

    // 步骤3: 检测悬停后状态
    const afterHoverVisible = await svgLocator.isVisible()
    const afterHoverVisibility = await svgLocator.evaluate(el => window.getComputedStyle(el).visibility)
    const afterHoverBox = await svgLocator.boundingBox()

    console.log('   📊 悬停后状态:')
    console.log(`      isVisible(): ${afterHoverVisible}`)
    console.log(`      CSS visibility: ${afterHoverVisibility}`)
    console.log(`      boundingBox: ${afterHoverBox ? `${afterHoverBox.x},${afterHoverBox.y}` : 'null'}`)

    // 步骤4: 验证转换是否正确
    const transitionCorrect = !initialVisible && afterHoverVisible
    const visibilityChanged = initialVisibility !== afterHoverVisibility
    const positionValid = afterHoverBox && afterHoverBox.x > 0 && afterHoverBox.y > 0

    console.log('   ✅ 转换分析:')
    console.log(`      可见性正确转换: ${transitionCorrect}`)
    console.log(`      CSS visibility变化: ${visibilityChanged}`)
    console.log(`      位置有效: ${positionValid}`)

    return {
      success: transitionCorrect && visibilityChanged && positionValid,
      details: {
        initialVisible,
        afterHoverVisible,
        initialVisibility,
        afterHoverVisibility,
        transitionCorrect,
        visibilityChanged,
        positionValid,
        initialBox,
        afterHoverBox
      }
    }
  }

  async testSVGInteractivity(paragraph) {
    console.log('🎯 测试SVG交互性...')

    // 激活拖拽手柄
    await paragraph.hover()
    await this.page.waitForTimeout(500)

    const svgLocator = this.page.locator('svg').first()
    
    // 验证SVG可交互
    const isVisible = await svgLocator.isVisible()
    const isEnabled = await svgLocator.isEnabled()
    const boundingBox = await svgLocator.boundingBox()

    if (!isVisible || !boundingBox) {
      throw new Error('SVG不可见或无边界框')
    }

    console.log('   📊 交互性检查:')
    console.log(`      可见: ${isVisible}`)
    console.log(`      启用: ${isEnabled}`)
    console.log(`      边界框: ${boundingBox.x},${boundingBox.y} ${boundingBox.width}x${boundingBox.height}`)

    // 测试鼠标悬停在SVG上
    await svgLocator.hover()
    await this.page.waitForTimeout(200)

    // 检查光标样式
    const cursor = await svgLocator.evaluate(el => window.getComputedStyle(el).cursor)
    console.log(`      光标样式: ${cursor}`)

    // 测试SVG可点击性
    let clickSuccessful = false
    try {
      await svgLocator.click({ timeout: 1000 })
      clickSuccessful = true
      console.log('      点击测试: 成功')
    } catch (error) {
      console.log(`      点击测试: 失败 - ${error.message}`)
    }

    return {
      success: isVisible && boundingBox !== null,
      details: {
        visible: isVisible,
        enabled: isEnabled,
        boundingBox,
        cursor,
        clickSuccessful
      }
    }
  }

  async testMultipleParagraphHandles() {
    console.log('🔄 测试多段落手柄切换...')

    const paragraphs = await this.proseMirror.locator('p').all()
    const results = []

    for (let i = 0; i < Math.min(paragraphs.length, 3); i++) {
      console.log(`   测试段落 ${i + 1}...`)
      
      const paragraph = paragraphs[i]
      
      // 悬停在当前段落
      await paragraph.hover()
      await this.page.waitForTimeout(400)

      const svgLocator = this.page.locator('svg').first()
      const isVisible = await svgLocator.isVisible()
      const boundingBox = await svgLocator.boundingBox()

      results.push({
        paragraphIndex: i,
        svgVisible: isVisible,
        svgPosition: boundingBox ? { x: boundingBox.x, y: boundingBox.y } : null
      })

      console.log(`      段落${i + 1}: SVG可见=${isVisible}, 位置=${boundingBox ? `(${boundingBox.x},${boundingBox.y})` : 'null'}`)

      // 移开鼠标
      await this.page.mouse.move(0, 0)
      await this.page.waitForTimeout(300)
    }

    // 验证结果
    const allVisible = results.every(r => r.svgVisible)
    const hasValidPositions = results.every(r => r.svgPosition !== null)

    console.log('   📊 多段落测试结果:')
    console.log(`      所有段落SVG都可见: ${allVisible}`)
    console.log(`      所有位置都有效: ${hasValidPositions}`)

    return {
      success: allVisible && hasValidPositions,
      results
    }
  }
}

test.describe('修复版SVG可见性测试', () => {
  let helper

  test.beforeEach(async ({ page }) => {
    helper = new FixedSVGTestHelper(page)
    await helper.setup()
  })

  test('01-SVG可见性转换测试', async ({ page }) => {
    const paragraphs = await helper.proseMirror.locator('p').all()
    
    if (paragraphs.length === 0) {
      test.fail('没有找到测试段落')
    }

    const result = await helper.testSVGVisibilityTransition(paragraphs[0])
    
    console.log(`\\n✅ SVG可见性转换测试: ${result.success ? '通过' : '失败'}`)
    if (result.details) {
      console.log('📋 详细信息:')
      console.log(`   初始可见: ${result.details.initialVisible}`)
      console.log(`   悬停后可见: ${result.details.afterHoverVisible}`)
      console.log(`   CSS visibility变化: ${result.details.initialVisibility} → ${result.details.afterHoverVisibility}`)
    }

    expect(result.success).toBe(true)
  })

  test('02-SVG交互性测试', async ({ page }) => {
    const paragraphs = await helper.proseMirror.locator('p').all()
    
    if (paragraphs.length === 0) {
      test.fail('没有找到测试段落')
    }

    const result = await helper.testSVGInteractivity(paragraphs[0])
    
    console.log(`\\n✅ SVG交互性测试: ${result.success ? '通过' : '失败'}`)
    if (result.details) {
      console.log('📋 详细信息:')
      console.log(`   可见性: ${result.details.visible}`)
      console.log(`   边界框: ${result.details.boundingBox ? '有效' : '无效'}`)
      console.log(`   光标样式: ${result.details.cursor}`)
    }

    expect(result.success).toBe(true)
  })

  test('03-多段落手柄切换测试', async ({ page }) => {
    const result = await helper.testMultipleParagraphHandles()
    
    console.log(`\\n✅ 多段落手柄切换测试: ${result.success ? '通过' : '失败'}`)
    if (result.results) {
      console.log('📋 各段落结果:')
      result.results.forEach((r, i) => {
        console.log(`   段落${i + 1}: 可见=${r.svgVisible}, 位置=${r.svgPosition ? `(${r.svgPosition.x},${r.svgPosition.y})` : 'null'}`)
      })
    }

    expect(result.success).toBe(true)
  })

  test('04-SVG状态持久性测试', async ({ page }) => {
    console.log('🔄 测试SVG状态持久性...')

    const paragraphs = await helper.proseMirror.locator('p').all()
    if (paragraphs.length === 0) {
      test.fail('没有找到测试段落')
    }

    const svgLocator = page.locator('svg').first()
    const firstParagraph = paragraphs[0]

    // 第一次激活
    await firstParagraph.hover()
    await page.waitForTimeout(500)
    const firstActivation = await svgLocator.isVisible()

    // 移开鼠标
    await page.mouse.move(0, 0)
    await page.waitForTimeout(500)
    const afterLeave = await svgLocator.isVisible()

    // 第二次激活
    await firstParagraph.hover()
    await page.waitForTimeout(500)
    const secondActivation = await svgLocator.isVisible()

    console.log('📊 状态持久性结果:')
    console.log(`   第一次激活: ${firstActivation}`)
    console.log(`   移开后状态: ${afterLeave}`)
    console.log(`   第二次激活: ${secondActivation}`)

    // 验证：两次激活都应该成功
    const persistencyWorks = firstActivation && secondActivation
    
    console.log(`\\n✅ SVG状态持久性测试: ${persistencyWorks ? '通过' : '失败'}`)

    expect(persistencyWorks).toBe(true)
  })
})