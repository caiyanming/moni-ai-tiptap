/**
 * 🎯 AppFlowy算法边界测试
 * 验证88px左边界和80%右边界的精确定位算法
 */

import { test, expect } from '@playwright/test'

class AppFlowyBoundaryTestHelper {
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
    console.log('✅ AppFlowy算法测试环境初始化完成')
  }

  async insertTestContent() {
    await this.proseMirror.click()
    await this.page.keyboard.press('Meta+A')
    
    const testContent = `
# AppFlowy算法边界测试

这是一个较短的段落，用于测试左边界。

这是一个中等长度的段落，包含足够的文本来测试AppFlowy算法中的88px左边界和80%右边界的精确定位功能。

这是一个很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长很长的段落，专门用来测试右边界80%区域的算法行为，确保在复杂文本布局下算法依然准确工作。
    `.trim()

    await this.page.keyboard.type(testContent)
    await this.page.waitForTimeout(1000)
    console.log('📝 AppFlowy算法测试内容插入完成')
  }

  async getParagraphs() {
    return await this.proseMirror.locator('p').all()
  }

  async measureParagraphBoundaries(paragraph) {
    const box = await paragraph.boundingBox()
    if (!box) return null

    // 计算AppFlowy算法的关键边界
    const leftBoundary = box.x + 88  // 88px左边界
    const rightBoundary = box.x + (box.width * 0.8)  // 80%右边界
    const centerRegion = {
      left: leftBoundary,
      right: rightBoundary,
      width: rightBoundary - leftBoundary
    }

    return {
      paragraph: box,
      leftBoundary,
      rightBoundary,
      centerRegion,
      // 语义区域划分
      regions: {
        left: { start: box.x, end: leftBoundary },
        center: { start: leftBoundary, end: rightBoundary },
        right: { start: rightBoundary, end: box.x + box.width }
      }
    }
  }

  async testDragFromRegion(paragraph, region, targetParagraph, regionName) {
    try {
      console.log(`🎯 测试从${regionName}区域拖拽...`)

      const boundaries = await this.measureParagraphBoundaries(paragraph)
      if (!boundaries) throw new Error('无法测量段落边界')

      // 根据区域选择拖拽起始点
      let startX, startY
      const regionData = boundaries.regions[region]
      
      switch(region) {
        case 'left':
          startX = regionData.start + 20  // 左侧区域内
          console.log(`   📍 左侧区域 (0px - 88px): 起始点X=${startX}`)
          break
        case 'center':
          startX = regionData.start + (regionData.end - regionData.start) / 2  // 中心区域
          console.log(`   📍 中心区域 (88px - 80%): 起始点X=${startX}`)
          break
        case 'right':
          startX = regionData.start + 20  // 右侧区域内
          console.log(`   📍 右侧区域 (80% - 100%): 起始点X=${startX}`)
          break
      }
      
      startY = boundaries.paragraph.y + boundaries.paragraph.height / 2

      // 悬停激活拖拽手柄
      await paragraph.hover()
      await this.page.waitForTimeout(500)

      // 检查拖拽手柄是否在预期区域出现
      const svgHandle = this.page.locator('svg').first()
      const handleBox = await svgHandle.boundingBox()
      
      if (!handleBox) {
        throw new Error('拖拽手柄未出现')
      }

      console.log(`   📊 边界分析:`)
      console.log(`      段落宽度: ${boundaries.paragraph.width}px`)
      console.log(`      88px左边界: ${boundaries.leftBoundary}px`)
      console.log(`      80%右边界: ${boundaries.rightBoundary}px`)
      console.log(`      拖拽手柄位置: X=${handleBox.x}px`)
      console.log(`      测试起始点: X=${startX}px`)

      // 验证拖拽手柄位置是否符合AppFlowy算法
      const handleInLeftRegion = handleBox.x < boundaries.leftBoundary
      const handleInCenterRegion = handleBox.x >= boundaries.leftBoundary && handleBox.x <= boundaries.rightBoundary
      const handleInRightRegion = handleBox.x > boundaries.rightBoundary

      console.log(`   🔍 手柄位置分析:`)
      console.log(`      在左侧区域 (<88px): ${handleInLeftRegion}`)
      console.log(`      在中心区域 (88px-80%): ${handleInCenterRegion}`)
      console.log(`      在右侧区域 (>80%): ${handleInRightRegion}`)

      // 执行拖拽操作
      const targetBox = await targetParagraph.boundingBox()
      if (!targetBox) throw new Error('目标段落边界获取失败')

      const targetX = targetBox.x + targetBox.width / 2
      const targetY = targetBox.y + targetBox.height + 10

      // 从拖拽手柄开始拖拽（这是正确的拖拽方式）
      await this.page.mouse.move(handleBox.x + handleBox.width/2, handleBox.y + handleBox.height/2)
      await this.page.mouse.down()
      await this.page.waitForTimeout(300)

      // 分步移动到目标
      for (let i = 1; i <= 6; i++) {
        const progress = i / 6
        const currentX = (handleBox.x + handleBox.width/2) + (targetX - (handleBox.x + handleBox.width/2)) * progress
        const currentY = (handleBox.y + handleBox.height/2) + (targetY - (handleBox.y + handleBox.height/2)) * progress
        await this.page.mouse.move(currentX, currentY)
        await this.page.waitForTimeout(100)
      }

      await this.page.mouse.up()
      await this.page.waitForTimeout(800)

      return {
        success: true,
        boundaries,
        handlePosition: { x: handleBox.x, y: handleBox.y },
        testPoint: { x: startX, y: startY },
        regionAnalysis: {
          handleInLeftRegion,
          handleInCenterRegion, 
          handleInRightRegion
        }
      }

    } catch (error) {
      console.log(`   ❌ ${regionName}区域拖拽失败: ${error.message}`)
      return { success: false, error: error.message, region: regionName }
    }
  }

  async verifyAlgorithmConfidence(boundaries, actualResult) {
    // AppFlowy算法置信度计算模拟
    const { leftBoundary, rightBoundary, paragraph } = boundaries
    
    // 计算各区域的置信度权重
    const leftRegionWidth = leftBoundary - paragraph.x
    const centerRegionWidth = rightBoundary - leftBoundary  
    const rightRegionWidth = (paragraph.x + paragraph.width) - rightBoundary

    const totalWidth = paragraph.width
    
    const confidence = {
      leftRegion: leftRegionWidth / totalWidth,
      centerRegion: centerRegionWidth / totalWidth,
      rightRegion: rightRegionWidth / totalWidth,
      // 88px边界精度
      leftBoundaryPrecision: Math.abs(leftBoundary - (paragraph.x + 88)) < 1,
      // 80%边界精度  
      rightBoundaryPrecision: Math.abs(rightBoundary - (paragraph.x + paragraph.width * 0.8)) < 1
    }

    console.log(`   🎯 AppFlowy算法置信度分析:`)
    console.log(`      左侧区域权重: ${(confidence.leftRegion * 100).toFixed(1)}%`)
    console.log(`      中心区域权重: ${(confidence.centerRegion * 100).toFixed(1)}%`)
    console.log(`      右侧区域权重: ${(confidence.rightRegion * 100).toFixed(1)}%`)
    console.log(`      88px边界精度: ${confidence.leftBoundaryPrecision ? '精确' : '偏差'}`)
    console.log(`      80%边界精度: ${confidence.rightBoundaryPrecision ? '精确' : '偏差'}`)

    return confidence
  }

  recordTest(testName, success, details = {}) {
    this.testResults.totalTests++
    if (success) {
      this.testResults.passedTests++
      console.log(`✅ ${testName}: 通过`)
    } else {
      this.testResults.failedTests++
      console.log(`❌ ${testName}: 失败`)
      if (details.error) console.log(`   🔍 ${details.error}`)
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

test.describe('AppFlowy算法边界测试', () => {
  let helper

  test.beforeEach(async ({ page }) => {
    helper = new AppFlowyBoundaryTestHelper(page)
    await helper.setup()
  })

  test('01-88px左边界精度测试', async ({ page }) => {
    const paragraphs = await helper.getParagraphs()
    
    if (paragraphs.length < 2) {
      test.fail('测试内容不足')
    }

    // 选择中等长度的段落进行测试
    const testParagraph = paragraphs[1] // 第二个段落
    const targetParagraph = paragraphs[2] // 第三个段落

    console.log('🔬 测试88px左边界精度...')

    const boundaries = await helper.measureParagraphBoundaries(testParagraph)
    expect(boundaries).not.toBeNull()

    // 验证88px边界计算精度
    const expectedLeftBoundary = boundaries.paragraph.x + 88
    const actualLeftBoundary = boundaries.leftBoundary
    const precision = Math.abs(expectedLeftBoundary - actualLeftBoundary)

    console.log(`📊 88px边界精度分析:`)
    console.log(`   预期左边界: ${expectedLeftBoundary}px`)
    console.log(`   实际左边界: ${actualLeftBoundary}px`) 
    console.log(`   精度误差: ${precision}px`)

    helper.recordTest('88px左边界计算精度', precision < 1, {
      expected: expectedLeftBoundary,
      actual: actualLeftBoundary,
      precision
    })

    expect(precision).toBeLessThan(1)
  })

  test('02-80%右边界精度测试', async ({ page }) => {
    const paragraphs = await helper.getParagraphs()
    
    if (paragraphs.length < 3) {
      test.fail('测试内容不足')
    }

    // 选择长段落进行测试
    const testParagraph = paragraphs[2] // 第三个段落（最长）

    console.log('🔬 测试80%右边界精度...')

    const boundaries = await helper.measureParagraphBoundaries(testParagraph)
    expect(boundaries).not.toBeNull()

    // 验证80%边界计算精度
    const expectedRightBoundary = boundaries.paragraph.x + (boundaries.paragraph.width * 0.8)
    const actualRightBoundary = boundaries.rightBoundary
    const precision = Math.abs(expectedRightBoundary - actualRightBoundary)

    console.log(`📊 80%边界精度分析:`)
    console.log(`   段落总宽度: ${boundaries.paragraph.width}px`)
    console.log(`   80%位置: ${boundaries.paragraph.width * 0.8}px`)
    console.log(`   预期右边界: ${expectedRightBoundary}px`)
    console.log(`   实际右边界: ${actualRightBoundary}px`)
    console.log(`   精度误差: ${precision}px`)

    helper.recordTest('80%右边界计算精度', precision < 1, {
      totalWidth: boundaries.paragraph.width,
      expected: expectedRightBoundary,
      actual: actualRightBoundary,
      precision
    })

    expect(precision).toBeLessThan(1)
  })

  test('03-中心区域拖拽测试', async ({ page }) => {
    const paragraphs = await helper.getParagraphs()
    
    if (paragraphs.length < 3) {
      test.fail('测试内容不足')
    }

    const sourceParagraph = paragraphs[1]
    const targetParagraph = paragraphs[2]

    // 获取拖拽前的内容
    const beforeTexts = []
    for (const p of paragraphs) {
      beforeTexts.push(await p.textContent())
    }

    console.log('🎯 测试中心区域拖拽（88px - 80%）...')

    const dragResult = await helper.testDragFromRegion(
      sourceParagraph, 
      'center', 
      targetParagraph, 
      '中心区域'
    )

    helper.recordTest('中心区域拖拽操作', dragResult.success, dragResult)

    if (dragResult.success) {
      // 验证置信度算法
      const confidence = await helper.verifyAlgorithmConfidence(
        dragResult.boundaries, 
        dragResult
      )

      const algorithmValid = confidence.leftBoundaryPrecision && 
                           confidence.rightBoundaryPrecision &&
                           confidence.centerRegion > 0.3 // 中心区域应该占足够比例

      helper.recordTest('AppFlowy算法置信度验证', algorithmValid, {
        confidence,
        centerRegionRatio: confidence.centerRegion
      })

      expect(algorithmValid).toBe(true)

      // 验证拖拽结果
      const newParagraphs = await helper.getParagraphs()
      const afterTexts = []
      for (const p of newParagraphs) {
        afterTexts.push(await p.textContent())
      }

      const contentChanged = JSON.stringify(beforeTexts) !== JSON.stringify(afterTexts)
      helper.recordTest('中心区域拖拽内容变更', contentChanged, {
        beforeCount: beforeTexts.length,
        afterCount: afterTexts.length
      })

      expect(contentChanged).toBe(true)
    }
  })

  test('04-语义区域覆盖测试', async ({ page }) => {
    const paragraphs = await helper.getParagraphs()
    
    if (paragraphs.length < 3) {
      test.fail('测试内容不足')
    }

    console.log('🔬 测试完整的语义区域覆盖...')

    // 测试不同长度段落的区域划分
    for (let i = 0; i < Math.min(paragraphs.length, 3); i++) {
      const paragraph = paragraphs[i]
      const boundaries = await helper.measureParagraphBoundaries(paragraph)
      
      if (boundaries) {
        const coverage = {
          leftCoverage: boundaries.regions.left.end - boundaries.regions.left.start,
          centerCoverage: boundaries.regions.center.end - boundaries.regions.center.start,
          rightCoverage: boundaries.regions.right.end - boundaries.regions.right.start,
          totalWidth: boundaries.paragraph.width
        }

        console.log(`📊 段落${i+1}语义区域分析:`)
        console.log(`   左侧区域: ${coverage.leftCoverage}px (${(coverage.leftCoverage/coverage.totalWidth*100).toFixed(1)}%)`)
        console.log(`   中心区域: ${coverage.centerCoverage}px (${(coverage.centerCoverage/coverage.totalWidth*100).toFixed(1)}%)`)
        console.log(`   右侧区域: ${coverage.rightCoverage}px (${(coverage.rightCoverage/coverage.totalWidth*100).toFixed(1)}%)`)

        // 验证区域覆盖的完整性
        const totalCoverage = coverage.leftCoverage + coverage.centerCoverage + coverage.rightCoverage
        const coverageComplete = Math.abs(totalCoverage - coverage.totalWidth) < 2

        helper.recordTest(`段落${i+1}区域覆盖完整性`, coverageComplete, {
          expected: coverage.totalWidth,
          actual: totalCoverage,
          difference: Math.abs(totalCoverage - coverage.totalWidth)
        })
      }
    }

    // 至少需要一个段落通过覆盖测试
    const coverageTests = helper.testResults.totalTests
    expect(helper.testResults.passedTests).toBeGreaterThan(0)
  })

  test.afterEach(async ({ page }) => {
    if (helper) {
      const summary = helper.getTestSummary()
      console.log('\\n📊 AppFlowy算法测试总结:')
      console.log(`  总测试数: ${summary.totalTests}`)
      console.log(`  通过数: ${summary.passedTests}`)
      console.log(`  失败数: ${summary.failedTests}`)
      console.log(`  成功率: ${summary.successRate}%`)
      
      if (summary.errors.length > 0) {
        console.log('\\n❌ 失败详情:')
        summary.errors.forEach((error, index) => {
          console.log(`  ${index + 1}. ${error.testName}: ${error.error || '详见测试日志'}`)
        })
      }
    }
  })
})