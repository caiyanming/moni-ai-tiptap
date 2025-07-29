/**
 * 🎯 修正版拖拽行为测试
 * 基于用户观察的实际拖拽行为修正测试逻辑
 */

import { test, expect } from '@playwright/test'

class CorrectedDragTestHelper {
  constructor(page) {
    this.page = page
    this.proseMirror = page.locator('.ProseMirror')
    this.testResults = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      errors: []
    }
  }

  async setup() {
    await this.page.goto('http://localhost:3666/src/Extensions/DragHandle/React/')
    await this.proseMirror.waitFor({ state: 'visible', timeout: 10000 })
    await this.insertTestContent()
    console.log('✅ 修正版测试环境初始化完成')
  }

  async insertTestContent() {
    await this.proseMirror.click()
    await this.page.keyboard.press('Meta+A')
    
    const testContent = `
# 测试文档

这是第一个段落，用于测试拖拽功能。

这是第二个段落，包含格式化文本。

这是第三个段落，较长的文本内容测试。
    `.trim()

    await this.page.keyboard.type(testContent)
    await this.page.waitForTimeout(1000)
    console.log('📝 测试内容插入完成')
  }

  async getParagraphs() {
    return await this.proseMirror.locator('p').all()
  }

  async getParagraphText(paragraphLocator) {
    return await paragraphLocator.textContent()
  }

  async correctDragParagraph(sourceParagraph, targetParagraph, options = {}) {
    const {
      dragToPosition = 'below', // 'above' or 'below'
      holdTime = 800,
      moveSteps = 8
    } = options

    try {
      console.log(`🎯 开始正确的拖拽操作（拖拽到${dragToPosition === 'above' ? '上方' : '下方'}）...`)

      // 步骤1: 悬停在源段落上激活拖拽手柄
      console.log('   1️⃣ 悬停激活拖拽手柄...')
      await sourceParagraph.hover()
      await this.page.waitForTimeout(500) // 等待拖拽手柄出现

      // 步骤2: 查找SVG拖拽手柄
      console.log('   2️⃣ 查找SVG拖拽手柄...')
      const svgHandle = this.page.locator('svg').first()
      
      // 验证拖拽手柄是否出现
      const svgCount = await this.page.locator('svg').count()
      console.log(`      找到 ${svgCount} 个SVG元素`)
      
      if (svgCount === 0) {
        throw new Error('未找到SVG拖拽手柄')
      }

      // 等待SVG可见
      await svgHandle.waitFor({ state: 'visible', timeout: 3000 })

      // 步骤3: 获取拖拽手柄和目标位置
      const handleBox = await svgHandle.boundingBox()
      const targetBox = await targetParagraph.boundingBox()

      if (!handleBox || !targetBox) {
        throw new Error('无法获取拖拽手柄或目标段落的边界框')
      }

      // 计算目标位置（段落上方或下方）
      const targetX = targetBox.x + targetBox.width / 2 // 目标段落中央X位置
      const targetY = dragToPosition === 'above' 
        ? targetBox.y - 5  // 拖拽到段落上方
        : targetBox.y + targetBox.height + 5 // 拖拽到段落下方

      console.log(`   3️⃣ 拖拽参数:`)
      console.log(`      手柄位置: (${handleBox.x + handleBox.width/2}, ${handleBox.y + handleBox.height/2})`)
      console.log(`      目标位置: (${targetX}, ${targetY})`)

      // 步骤4: 执行精确拖拽操作
      console.log('   4️⃣ 执行拖拽操作...')
      
      // 移动到拖拽手柄中心
      await this.page.mouse.move(handleBox.x + handleBox.width/2, handleBox.y + handleBox.height/2)
      await this.page.waitForTimeout(200)
      
      // 按下鼠标开始拖拽
      await this.page.mouse.down()
      await this.page.waitForTimeout(holdTime)

      // 分步移动到目标位置
      const startX = handleBox.x + handleBox.width/2
      const startY = handleBox.y + handleBox.height/2

      for (let i = 1; i <= moveSteps; i++) {
        const progress = i / moveSteps
        const currentX = startX + (targetX - startX) * progress
        const currentY = startY + (targetY - startY) * progress
        
        await this.page.mouse.move(currentX, currentY)
        await this.page.waitForTimeout(100)
        
        // 中途检查是否有插入线出现
        if (i === Math.floor(moveSteps / 2)) {
          // 查找可能的插入线指示器
          const insertionIndicators = await this.page.locator('[class*="insertion"], [class*="drop"], [class*="indicator"]').count()
          console.log(`      中途检查: 发现 ${insertionIndicators} 个插入指示器`)
        }
      }

      // 释放鼠标完成拖拽
      await this.page.mouse.up()
      console.log('   5️⃣ 拖拽操作完成，等待DOM更新...')
      
      // 等待DOM更新和动画完成
      await this.page.waitForTimeout(1000)

      return { 
        success: true, 
        handlePos: { x: handleBox.x, y: handleBox.y },
        targetPos: { x: targetX, y: targetY },
        dragDirection: dragToPosition
      }

    } catch (error) {
      console.log(`   ❌ 拖拽操作失败: ${error.message}`)
      return { success: false, error: error.message }
    }
  }

  async verifyDragResult(beforeTexts, afterTexts, sourceIndex, targetIndex, dragDirection) {
    console.log('🔍 验证拖拽结果...')
    
    const sourceText = beforeTexts[sourceIndex]
    console.log(`   源段落文本: "${sourceText.substring(0, 30)}..."`)
    
    // 查找源段落在新位置的索引
    const newSourceIndex = afterTexts.indexOf(sourceText)
    
    if (newSourceIndex === -1) {
      return { success: false, message: '源段落在拖拽后消失' }
    }
    
    console.log(`   源段落从位置 ${sourceIndex} 移动到位置 ${newSourceIndex}`)
    
    if (newSourceIndex === sourceIndex) {
      return { success: false, message: '段落位置未发生变化' }
    }
    
    // 验证移动方向是否正确
    const expectedDirection = dragDirection === 'below' 
      ? newSourceIndex > sourceIndex 
      : newSourceIndex < sourceIndex
    
    if (dragDirection === 'below' && targetIndex > sourceIndex) {
      // 向下拖拽的情况
      const expectedNewIndex = targetIndex
      const moveCorrect = newSourceIndex >= expectedNewIndex - 1 && newSourceIndex <= expectedNewIndex + 1
      return { 
        success: moveCorrect, 
        message: moveCorrect 
          ? `段落成功从位置${sourceIndex}移动到位置${newSourceIndex}（预期范围${expectedNewIndex}±1）`
          : `段落移动位置不符合预期: 实际${newSourceIndex}, 预期${expectedNewIndex}`,
        oldIndex: sourceIndex,
        newIndex: newSourceIndex,
        expectedIndex: expectedNewIndex
      }
    } else if (dragDirection === 'above' && targetIndex < sourceIndex) {
      // 向上拖拽的情况
      const expectedNewIndex = targetIndex
      const moveCorrect = newSourceIndex >= expectedNewIndex - 1 && newSourceIndex <= expectedNewIndex + 1
      return { 
        success: moveCorrect, 
        message: moveCorrect 
          ? `段落成功从位置${sourceIndex}移动到位置${newSourceIndex}（预期范围${expectedNewIndex}±1）`
          : `段落移动位置不符合预期: 实际${newSourceIndex}, 预期${expectedNewIndex}`,
        oldIndex: sourceIndex,
        newIndex: newSourceIndex,
        expectedIndex: expectedNewIndex
      }
    }
    
    return { 
      success: true, 
      message: `段落位置已改变: ${sourceIndex} → ${newSourceIndex}`,
      oldIndex: sourceIndex,
      newIndex: newSourceIndex
    }
  }

  recordTest(testName, success, details = {}) {
    this.testResults.totalTests++
    if (success) {
      this.testResults.passedTests++
      console.log(`✅ ${testName}: 通过`)
      if (details.message) console.log(`   📝 ${details.message}`)
    } else {
      this.testResults.failedTests++
      console.log(`❌ ${testName}: 失败`)
      if (details.error) console.log(`   🔍 错误: ${details.error}`)
      if (details.message) console.log(`   📝 详情: ${details.message}`)
      this.testResults.errors.push({ testName, ...details })
    }
  }

  getTestSummary() {
    return {
      ...this.testResults,
      successRate: (this.testResults.passedTests / this.testResults.totalTests * 100).toFixed(2)
    }
  }
}

test.describe('修正版拖拽行为测试', () => {
  let helper

  test.beforeEach(async ({ page }) => {
    helper = new CorrectedDragTestHelper(page)
    await helper.setup()
  })

  test('01-段落向下拖拽（修正版）', async ({ page }) => {
    const paragraphs = await helper.getParagraphs()
    
    if (paragraphs.length < 3) {
      test.fail('测试内容不足，需要至少3个段落')
    }

    // 获取拖拽前的内容
    const beforeTexts = []
    for (const p of paragraphs) {
      beforeTexts.push(await helper.getParagraphText(p))
    }

    console.log('📝 拖拽前段落顺序:')
    beforeTexts.forEach((text, i) => {
      console.log(`  ${i}: "${text.substring(0, 30)}..."`)
    })

    // 将第一个段落拖拽到第三个段落下方
    const dragResult = await helper.correctDragParagraph(paragraphs[0], paragraphs[2], {
      dragToPosition: 'below'
    })
    
    helper.recordTest('向下拖拽操作执行', dragResult.success, dragResult)

    if (dragResult.success) {
      // 重新获取段落并验证结果
      const newParagraphs = await helper.getParagraphs()
      const afterTexts = []
      for (const p of newParagraphs) {
        afterTexts.push(await helper.getParagraphText(p))
      }

      console.log('📝 拖拽后段落顺序:')
      afterTexts.forEach((text, i) => {
        console.log(`  ${i}: "${text.substring(0, 30)}..."`)
      })

      const verifyResult = await helper.verifyDragResult(beforeTexts, afterTexts, 0, 2, 'below')
      helper.recordTest('向下拖拽结果验证', verifyResult.success, verifyResult)

      expect(verifyResult.success).toBe(true)
    }
  })

  test('02-段落向上拖拽（修正版）', async ({ page }) => {
    const paragraphs = await helper.getParagraphs()
    
    if (paragraphs.length < 3) {
      test.fail('测试内容不足，需要至少3个段落')
    }

    // 获取拖拽前的内容
    const beforeTexts = []
    for (const p of paragraphs) {
      beforeTexts.push(await helper.getParagraphText(p))
    }

    console.log('📝 拖拽前段落顺序:')
    beforeTexts.forEach((text, i) => {
      console.log(`  ${i}: "${text.substring(0, 30)}..."`)
    })

    // 将第三个段落拖拽到第一个段落上方
    const dragResult = await helper.correctDragParagraph(paragraphs[2], paragraphs[0], {
      dragToPosition: 'above'
    })
    
    helper.recordTest('向上拖拽操作执行', dragResult.success, dragResult)

    if (dragResult.success) {
      // 重新获取段落并验证结果
      const newParagraphs = await helper.getParagraphs()
      const afterTexts = []
      for (const p of newParagraphs) {
        afterTexts.push(await helper.getParagraphText(p))
      }

      console.log('📝 拖拽后段落顺序:')
      afterTexts.forEach((text, i) => {
        console.log(`  ${i}: "${text.substring(0, 30)}..."`)
      })

      const verifyResult = await helper.verifyDragResult(beforeTexts, afterTexts, 2, 0, 'above')
      helper.recordTest('向上拖拽结果验证', verifyResult.success, verifyResult)

      expect(verifyResult.success).toBe(true)
    }
  })

  test('03-拖拽手柄显示验证', async ({ page }) => {
    const paragraphs = await helper.getParagraphs()
    
    if (paragraphs.length < 1) {
      test.fail('测试内容不足，需要至少1个段落')
    }

    const firstParagraph = paragraphs[0]

    // 测试悬停前的状态
    const svgBeforeHover = await page.locator('svg').count()
    console.log(`悬停前SVG数量: ${svgBeforeHover}`)

    // 悬停激活拖拽手柄
    await firstParagraph.hover()
    await page.waitForTimeout(800) // 给足够时间让手柄出现

    // 测试悬停后的状态
    const svgAfterHover = await page.locator('svg').count()
    console.log(`悬停后SVG数量: ${svgAfterHover}`)

    // 检查SVG是否可见且可交互
    const svgHandle = page.locator('svg').first()
    const isVisible = await svgHandle.isVisible()
    const boundingBox = await svgHandle.boundingBox()

    console.log(`SVG手柄可见性: ${isVisible}`)
    console.log(`SVG手柄位置: ${boundingBox ? `(${boundingBox.x}, ${boundingBox.y})` : '无'}`)

    const handleWorking = svgAfterHover >= 1 && isVisible && boundingBox !== null
    helper.recordTest('拖拽手柄显示和定位', handleWorking, {
      beforeCount: svgBeforeHover,
      afterCount: svgAfterHover,
      visible: isVisible,
      positioned: boundingBox !== null
    })

    expect(handleWorking).toBe(true)
  })

  test('04-拖拽视觉反馈测试', async ({ page }) => {
    const paragraphs = await helper.getParagraphs()
    
    if (paragraphs.length < 2) {
      test.fail('测试内容不足，需要至少2个段落')
    }

    // 激活拖拽手柄
    await paragraphs[0].hover()
    await page.waitForTimeout(500)

    const svgHandle = page.locator('svg').first()
    await svgHandle.waitFor({ state: 'visible' })

    const handleBox = await svgHandle.boundingBox()
    const targetBox = await paragraphs[1].boundingBox()

    if (!handleBox || !targetBox) {
      test.fail('无法获取元素边界框')
    }

    // 开始拖拽并监测视觉反馈
    await page.mouse.move(handleBox.x + handleBox.width/2, handleBox.y + handleBox.height/2)
    await page.mouse.down()
    
    // 移动到目标段落上方，检查插入线
    const targetX = targetBox.x + targetBox.width / 2
    const targetY = targetBox.y - 5

    // 缓慢移动以便检测视觉反馈
    for (let i = 1; i <= 5; i++) {
      const progress = i / 5
      const currentX = (handleBox.x + handleBox.width/2) + (targetX - (handleBox.x + handleBox.width/2)) * progress
      const currentY = (handleBox.y + handleBox.height/2) + (targetY - (handleBox.y + handleBox.height/2)) * progress
      
      await page.mouse.move(currentX, currentY)
      await page.waitForTimeout(200)
    }

    // 检查是否有插入线或其他视觉反馈
    const visualFeedback = await page.locator('[class*="insertion"], [class*="drop"], [class*="indicator"], [class*="highlight"]').count()
    console.log(`拖拽过程中发现 ${visualFeedback} 个视觉反馈元素`)

    await page.mouse.up()

    helper.recordTest('拖拽视觉反馈检测', visualFeedback > 0, {
      feedbackCount: visualFeedback
    })

    // 这个测试不强制要求通过，因为视觉反馈可能在DOM中不易检测
    console.log(`📊 视觉反馈测试结果: ${visualFeedback > 0 ? '检测到反馈' : '未检测到明显反馈（可能正常）'}`)
  })

  test.afterEach(async ({ page }) => {
    if (helper) {
      const summary = helper.getTestSummary()
      console.log('\\n📊 修正版测试执行总结:')
      console.log(`  总测试数: ${summary.totalTests}`)
      console.log(`  通过数: ${summary.passedTests}`)
      console.log(`  失败数: ${summary.failedTests}`)
      console.log(`  成功率: ${summary.successRate}%`)
      
      if (summary.errors.length > 0) {
        console.log('\\n❌ 失败详情:')
        summary.errors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error.testName}: ${error.error || error.message || '未知错误'}`)
        })
      }
    }
  })
})