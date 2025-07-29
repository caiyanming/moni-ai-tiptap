/**
 * 🎯 拖拽手柄UI定位分析
 * 检查拖拽手柄的位置、间距和空行显示行为
 */

import { test, expect } from '@playwright/test'

class UIPositioningAnalyzer {
  constructor(page) {
    this.page = page
    this.proseMirror = page.locator('.ProseMirror')
  }

  async setup() {
    await this.page.goto('http://localhost:3666/src/Extensions/DragHandle/React/')
    await this.proseMirror.waitFor({ state: 'visible', timeout: 10000 })
    console.log('✅ UI定位分析环境初始化完成')
  }

  async insertMixedContent() {
    await this.proseMirror.click()
    await this.page.keyboard.press('Meta+A')
    
    // 插入多种类型的内容进行分析
    const testContent = `# 标题测试

这是一个正常段落，用于测试拖拽手柄的垂直定位。

**这是加粗段落**，测试格式化内容的手柄位置。



这是空行后的段落，测试空行是否显示拖拽手柄。`

    await this.page.keyboard.type(testContent)
    await this.page.waitForTimeout(1000)
    console.log('📝 混合内容插入完成')
  }

  async analyzeHandlePositioning() {
    console.log('🔍 分析拖拽手柄定位...')
    
    const results = []
    
    // 获取所有块级元素
    const blocks = await this.proseMirror.locator('h1, p').all()
    console.log(`发现 ${blocks.length} 个块级元素`)

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i]
      
      // 获取块的基本信息
      const tagName = await block.evaluate(el => el.tagName.toLowerCase())
      const text = await block.textContent()
      const isEmpty = text.trim() === ''
      
      console.log(`\\n--- 分析块 ${i + 1}: <${tagName}> ---`)
      console.log(`内容: "${text.length > 30 ? text.substring(0, 30) + '...' : text}"`)
      console.log(`是否为空: ${isEmpty}`)
      
      // 悬停激活拖拽手柄
      await block.hover()
      await this.page.waitForTimeout(500)
      
      // 获取块的边界框
      const blockBox = await block.boundingBox()
      if (!blockBox) {
        console.log('❌ 无法获取块边界框')
        continue
      }
      
      // 获取拖拽手柄位置
      const svgHandle = this.page.locator('svg').first()
      const handleVisible = await svgHandle.isVisible()
      
      if (!handleVisible) {
        console.log('⚠️  拖拽手柄不可见')
        results.push({
          blockIndex: i,
          tagName,
          text: text.substring(0, 20),
          isEmpty,
          handleVisible: false,
          analysis: '手柄不显示'
        })
        continue
      }
      
      const handleBox = await svgHandle.boundingBox()
      if (!handleBox) {
        console.log('❌ 无法获取手柄边界框')
        continue
      }
      
      // 计算定位数据
      const blockCenterY = blockBox.y + blockBox.height / 2
      const handleCenterY = handleBox.y + handleBox.height / 2
      const verticalOffset = handleCenterY - blockCenterY
      const leftGap = handleBox.x - blockBox.x
      
      console.log(`📊 定位分析:`)
      console.log(`   块位置: x=${blockBox.x}, y=${blockBox.y}, w=${blockBox.width}, h=${blockBox.height}`)
      console.log(`   块中心Y: ${blockCenterY}`)
      console.log(`   手柄位置: x=${handleBox.x}, y=${handleBox.y}, w=${handleBox.width}, h=${handleBox.height}`)
      console.log(`   手柄中心Y: ${handleCenterY}`)
      console.log(`   垂直偏移: ${verticalOffset.toFixed(2)}px (${verticalOffset > 0 ? '偏下' : verticalOffset < 0 ? '偏上' : '居中'})`)
      console.log(`   左侧间距: ${leftGap}px`)
      
      results.push({
        blockIndex: i,
        tagName,
        text: text.substring(0, 20),
        isEmpty,
        handleVisible: true,
        blockBox,
        handleBox,
        verticalOffset,
        leftGap,
        analysis: {
          verticalPosition: Math.abs(verticalOffset) < 2 ? '居中' : (verticalOffset > 0 ? '偏下' : '偏上'),
          leftGapAppropriate: leftGap > 5 && leftGap < 30,
          showsOnEmpty: isEmpty
        }
      })
    }
    
    return results
  }

  async testEmptyLineHandles() {
    console.log('\\n🔍 专门测试空行拖拽手柄...')
    
    // 清空内容并创建特定的空行测试
    await this.proseMirror.click()
    await this.page.keyboard.press('Meta+A')
    
    // 创建空行测试内容
    await this.page.keyboard.type('第一行内容')
    await this.page.keyboard.press('Enter')
    await this.page.keyboard.press('Enter') // 创建空行
    await this.page.keyboard.press('Enter') // 再创建一个空行
    await this.page.keyboard.type('第二行内容')
    
    await this.page.waitForTimeout(800)
    
    const paragraphs = await this.proseMirror.locator('p').all()
    console.log(`创建了 ${paragraphs.length} 个段落`)
    
    const emptyLineResults = []
    
    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i]
      const text = await p.textContent()
      const isEmpty = text.trim() === ''
      
      if (isEmpty) {
        console.log(`\\n测试空行 ${i + 1}:`)
        
        await p.hover()
        await this.page.waitForTimeout(500)
        
        const svgHandle = this.page.locator('svg').first()
        const handleVisible = await svgHandle.isVisible()
        
        console.log(`   空行显示拖拽手柄: ${handleVisible}`)
        
        emptyLineResults.push({
          lineIndex: i,
          isEmpty: true,
          handleVisible
        })
      } else {
        console.log(`段落 ${i + 1}: "${text}" (非空)`)
      }
    }
    
    return emptyLineResults
  }

  summarizeFindings(results, emptyLineResults) {
    console.log('\\n📊 UI定位分析总结:')
    
    // 垂直定位分析
    const verticalAnalysis = results.filter(r => r.handleVisible).map(r => r.analysis.verticalPosition)
    const centerCount = verticalAnalysis.filter(pos => pos === '居中').length
    const topCount = verticalAnalysis.filter(pos => pos === '偏上').length
    const bottomCount = verticalAnalysis.filter(pos => pos === '偏下').length
    
    console.log('\\n1. 垂直定位分析:')
    console.log(`   居中: ${centerCount} 个`)
    console.log(`   偏上: ${topCount} 个`)
    console.log(`   偏下: ${bottomCount} 个`)
    console.log(`   结论: ${centerCount > topCount + bottomCount ? '主要居中' : '位置不一致'}`)
    
    // 左侧间距分析
    const leftGaps = results.filter(r => r.handleVisible).map(r => r.leftGap)
    const avgLeftGap = leftGaps.reduce((a, b) => a + b, 0) / leftGaps.length
    const minGap = Math.min(...leftGaps)
    const maxGap = Math.max(...leftGaps)
    
    console.log('\\n2. 左侧间距分析:')
    console.log(`   平均间距: ${avgLeftGap.toFixed(2)}px`)
    console.log(`   最小间距: ${minGap}px`)
    console.log(`   最大间距: ${maxGap}px`)
    console.log(`   结论: ${avgLeftGap > 10 ? '间距充足' : '间距过小'}`)
    
    // 空行显示分析
    const emptyLinesWithHandle = emptyLineResults.filter(r => r.handleVisible).length
    const totalEmptyLines = emptyLineResults.length
    
    console.log('\\n3. 空行手柄显示分析:')
    console.log(`   空行总数: ${totalEmptyLines}`)  
    console.log(`   显示手柄的空行: ${emptyLinesWithHandle}`)
    console.log(`   空行显示率: ${totalEmptyLines > 0 ? (emptyLinesWithHandle / totalEmptyLines * 100).toFixed(1) : 0}%`)
    console.log(`   结论: ${emptyLinesWithHandle > 0 ? '空行显示拖拽手柄' : '空行不显示拖拽手柄'}`)
    
    return {
      verticalPositioning: centerCount > topCount + bottomCount ? 'centered' : 'inconsistent',
      averageLeftGap: avgLeftGap,
      emptyLineHandleCount: emptyLinesWithHandle,
      totalEmptyLines: totalEmptyLines,
      recommendations: []
    }
  }
}

test.describe('拖拽手柄UI定位分析', () => {
  let analyzer

  test.beforeEach(async ({ page }) => {
    analyzer = new UIPositioningAnalyzer(page)
    await analyzer.setup()
  })

  test('拖拽手柄定位全面分析', async ({ page }) => {
    // 插入混合内容
    await analyzer.insertMixedContent()
    
    // 分析手柄定位
    const results = await analyzer.analyzeHandlePositioning()
    
    // 测试空行手柄
    const emptyLineResults = await analyzer.testEmptyLineHandles()
    
    // 生成总结
    const summary = analyzer.summarizeFindings(results, emptyLineResults)
    
    console.log('\\n🎯 分析完成，建议对比Notion的实现')
    
    // 不强制断言，仅记录分析结果供改进参考
    expect(results.length).toBeGreaterThan(0)
  })
})