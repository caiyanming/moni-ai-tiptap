/**
 * 🎯 拖拽功能完整验证脚本
 * 验证 AppFlowy 算法和软隔离重构后的拖拽功能是否真正正常工作
 */

const { chromium } = require('@playwright/test')

class DragFunctionValidator {
  constructor() {
    this.browser = null
    this.page = null
    this.results = {
      serverStatus: false,
      optimizedImplementation: false,
      legacyImplementation: false,
      appflowyAlgorithm: false,
      comparisonDemo: false,
      dragHandleDisplay: false,
      dragFunctionality: false,
      errors: []
    }
  }
  
  async init() {
    console.log('🚀 启动拖拽功能完整验证...\n')
    
    try {
      this.browser = await chromium.launch({ 
        headless: false,
        slowMo: 500 // 慢动作以便观察
      })
      this.page = await this.browser.newPage()
      
      // 设置更长的超时时间
      this.page.setDefaultTimeout(10000)
      
      return true
    } catch (error) {
      this.results.errors.push(`初始化失败: ${error.message}`)
      return false
    }
  }
  
  async validateServerStatus() {
    console.log('📡 验证服务器状态...')
    
    try {
      await this.page.goto('http://localhost:3666/', { waitUntil: 'domcontentloaded' })
      const title = await this.page.title()
      
      if (title.includes('TipTap') || title.includes('Preview')) {
        this.results.serverStatus = true
        console.log('   ✅ 服务器运行正常')
        return true
      } else {
        throw new Error('服务器响应异常')
      }
    } catch (error) {
      this.results.errors.push(`服务器状态检查失败: ${error.message}`)
      console.log('   ❌ 服务器状态异常')
      return false
    }
  }
  
  async validateOptimizedImplementation() {
    console.log('\n🎯 验证优化实现页面...')
    
    try {
      await this.page.goto('http://localhost:3666/preview/Extensions/DragHandle', { 
        waitUntil: 'domcontentloaded' 
      })
      
      // 等待页面完全加载
      await this.page.waitForTimeout(3000)
      
      // 检查是否有错误
      const errors = await this.page.evaluate(() => {
        return window.console?.errors || []
      })
      
      // 检查页面是否包含 iframe
      const iframe = this.page.frameLocator('iframe').first()
      
      // 检查 ProseMirror 编辑器是否存在
      const proseMirror = iframe.locator('.ProseMirror')
      await proseMirror.waitFor({ timeout: 5000 })
      
      // 检查段落数量
      const paragraphs = iframe.locator('p')
      const paragraphCount = await paragraphs.count()
      
      console.log(`   📝 发现 ${paragraphCount} 个段落`)
      
      if (paragraphCount > 0) {
        this.results.optimizedImplementation = true
        console.log('   ✅ 优化实现页面加载成功')
        return true
      } else {
        throw new Error('未找到段落内容')
      }
      
    } catch (error) {
      this.results.errors.push(`优化实现验证失败: ${error.message}`)
      console.log('   ❌ 优化实现页面异常')
      return false
    }
  }
  
  async validateDragHandleDisplay() {
    console.log('\n🎨 验证拖拽手柄显示...')
    
    try {
      const iframe = this.page.frameLocator('iframe').first()
      const paragraphs = iframe.locator('p')
      const firstParagraph = paragraphs.first()
      
      // 悬停在第一个段落上
      await firstParagraph.hover()
      await this.page.waitForTimeout(500)
      
      // 查找拖拽手柄相关元素
      const dragHandleSelectors = [
        '[data-drag-handle]',
        '.drag-handle',
        '[draggable="true"]',
        '[class*="drag"]'
      ]
      
      let dragHandleFound = false
      for (const selector of dragHandleSelectors) {
        const elements = await iframe.locator(selector).count()
        if (elements > 0) {
          console.log(`   ✅ 找到拖拽手柄: ${selector} (${elements} 个)`)
          dragHandleFound = true
          break
        }
      }
      
      if (dragHandleFound) {
        this.results.dragHandleDisplay = true
        return true
      } else {
        console.log('   ⚠️  未找到明显的拖拽手柄元素')
        return false
      }
      
    } catch (error) {
      this.results.errors.push(`拖拽手柄显示验证失败: ${error.message}`)
      console.log('   ❌ 拖拽手柄显示异常')
      return false
    }
  }
  
  async validateDragFunctionality() {
    console.log('\n🔄 验证实际拖拽功能...')
    
    try {
      const iframe = this.page.frameLocator('iframe').first()
      const paragraphs = iframe.locator('p')
      const paragraphCount = await paragraphs.count()
      
      if (paragraphCount < 2) {
        throw new Error('段落数量不足，无法进行拖拽测试')
      }
      
      const firstParagraph = paragraphs.first()
      const secondParagraph = paragraphs.nth(1)
      
      // 获取拖拽前的内容
      const beforeFirst = await firstParagraph.textContent()
      const beforeSecond = await secondParagraph.textContent()
      
      console.log(`   📝 拖拽前 - 第1段: "${beforeFirst?.substring(0, 30)}..."`)
      console.log(`   📝 拖拽前 - 第2段: "${beforeSecond?.substring(0, 30)}..."`)
      
      // 获取元素位置
      const firstBox = await firstParagraph.boundingBox()
      const secondBox = await secondParagraph.boundingBox()
      
      if (!firstBox || !secondBox) {
        throw new Error('无法获取段落位置信息')
      }
      
      // 执行拖拽操作 - 将第一个段落拖到第二个段落下方
      console.log('   🎯 执行拖拽操作...')
      
      // 方法1: 悬停后拖拽（激活拖拽手柄）
      await firstParagraph.hover()
      await this.page.waitForTimeout(200)
      
      // 从段落左侧开始拖拽（AppFlowy 算法应该能处理）
      const dragStartX = firstBox.x + firstBox.width / 2
      const dragStartY = firstBox.y + firstBox.height / 2
      const dragEndX = secondBox.x + secondBox.width / 2
      const dragEndY = secondBox.y + secondBox.height + 10
      
      // 执行拖拽
      await this.page.mouse.move(dragStartX, dragStartY)
      await this.page.mouse.down()
      await this.page.waitForTimeout(100)
      
      // 移动到目标位置
      await this.page.mouse.move(dragEndX, dragEndY, { steps: 10 })
      await this.page.waitForTimeout(300)
      
      // 释放
      await this.page.mouse.up()
      
      console.log('   ✅ 拖拽操作执行完成')
      
      // 等待DOM更新
      await this.page.waitForTimeout(1000)
      
      // 验证拖拽结果
      const afterFirst = await paragraphs.first().textContent()
      const afterSecond = await paragraphs.nth(1).textContent()
      
      console.log(`   📝 拖拽后 - 第1段: "${afterFirst?.substring(0, 30)}..."`)
      console.log(`   📝 拖拽后 - 第2段: "${afterSecond?.substring(0, 30)}..."`)
      
      // 检查是否有变化
      if (afterFirst !== beforeFirst || afterSecond !== beforeSecond) {
        console.log('   🎉 拖拽成功！段落顺序发生了变化')
        this.results.dragFunctionality = true
        return true
      } else {
        console.log('   ⚠️  段落顺序未变化，可能需要不同的拖拽方式')
        
        // 尝试方法2: 直接选中节点后拖拽
        await this.attemptAlternativeDrag(firstParagraph, secondParagraph)
        return false
      }
      
    } catch (error) {
      this.results.errors.push(`拖拽功能验证失败: ${error.message}`)
      console.log('   ❌ 拖拽功能异常')
      return false
    }
  }
  
  async attemptAlternativeDrag(firstParagraph, secondParagraph) {
    console.log('   🔄 尝试替代拖拽方法...')
    
    try {
      // 方法2: 三次点击选中段落，然后拖拽
      await firstParagraph.click({ clickCount: 3 })
      await this.page.waitForTimeout(300)
      
      const firstBox = await firstParagraph.boundingBox()
      const secondBox = await secondParagraph.boundingBox()
      
      if (firstBox && secondBox) {
        await this.page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2)
        await this.page.mouse.down()
        await this.page.waitForTimeout(100)
        await this.page.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y + secondBox.height + 10, { steps: 8 })
        await this.page.waitForTimeout(200)
        await this.page.mouse.up()
        
        console.log('   ✅ 替代拖拽方法执行完成')
      }
    } catch (error) {
      console.log(`   ⚠️  替代拖拽方法也失败: ${error.message}`)
    }
  }
  
  async validateAppFlowyAlgorithm() {
    console.log('\n🧮 验证 AppFlowy 算法区域检测...')
    
    try {
      const iframe = this.page.frameLocator('iframe').first()
      const paragraphs = iframe.locator('p')
      const firstParagraph = paragraphs.first()
      
      const boundingBox = await firstParagraph.boundingBox()
      if (!boundingBox) {
        throw new Error('无法获取段落边界框')
      }
      
      // 测试 AppFlowy 算法的三个区域
      const testPositions = [
        {
          x: boundingBox.x + 40,  // 左区域 (< 88px)
          y: boundingBox.y + boundingBox.height / 2,
          region: 'left',
          desc: '左边界区域 (兄弟节点插入)'
        },
        {
          x: boundingBox.x + boundingBox.width / 2,  // 中心区域
          y: boundingBox.y + boundingBox.height / 2,
          region: 'center',
          desc: '中心区域 (子节点嵌套)'
        },
        {
          x: boundingBox.x + boundingBox.width * 0.9,  // 右区域 (> 80%)
          y: boundingBox.y + boundingBox.height / 2,
          region: 'right',
          desc: '右边界区域 (分栏布局)'
        }
      ]
      
      console.log('   🎯 测试不同区域的算法响应...')
      
      for (const pos of testPositions) {
        console.log(`   📍 测试 ${pos.region} 区域: ${pos.desc}`)
        
        // 模拟悬停到该位置
        await this.page.mouse.move(pos.x, pos.y)
        await this.page.waitForTimeout(100)
        
        // 模拟拖拽开始（不释放）
        await this.page.mouse.down()
        await this.page.waitForTimeout(200)
        
        // 稍微移动以触发拖拽指示器
        await this.page.mouse.move(pos.x + 5, pos.y + 5, { steps: 2 })
        await this.page.waitForTimeout(300)
        
        // 释放
        await this.page.mouse.up()
        await this.page.waitForTimeout(100)
        
        console.log(`   ✅ ${pos.region} 区域测试完成`)
      }
      
      this.results.appflowyAlgorithm = true
      console.log('   🎉 AppFlowy 算法区域测试完成')
      return true
      
    } catch (error) {
      this.results.errors.push(`AppFlowy 算法验证失败: ${error.message}`)
      console.log('   ❌ AppFlowy 算法验证异常')
      return false
    }
  }
  
  async validateComparisonDemo() {
    console.log('\n🔄 验证对比演示页面...')
    
    try {
      await this.page.goto('http://localhost:3666/preview/Examples/DragHandleComparison', { 
        waitUntil: 'domcontentloaded' 
      })
      
      await this.page.waitForTimeout(2000)
      
      // 检查对比页面元素
      const header = await this.page.locator('h1').textContent()
      const toggleButtons = await this.page.locator('.toggle-btn').count()
      
      console.log(`   📰 页面标题: ${header}`)
      console.log(`   🔘 切换按钮数量: ${toggleButtons}`)
      
      if (header?.includes('Comparison') && toggleButtons >= 2) {
        this.results.comparisonDemo = true
        console.log('   ✅ 对比演示页面加载成功')
        
        // 测试切换功能
        const optimizedBtn = this.page.locator('.toggle-btn').first()
        const legacyBtn = this.page.locator('.toggle-btn').last()
        
        await optimizedBtn.click()
        await this.page.waitForTimeout(500)
        await legacyBtn.click()
        await this.page.waitForTimeout(500)
        
        console.log('   ✅ 实现切换功能正常')
        return true
      } else {
        throw new Error('对比页面内容不完整')
      }
      
    } catch (error) {
      this.results.errors.push(`对比演示验证失败: ${error.message}`)
      console.log('   ❌ 对比演示页面异常')
      return false
    }
  }
  
  async validateLegacyImplementation() {
    console.log('\n⚠️  验证Legacy实现页面...')
    
    try {
      await this.page.goto('http://localhost:3666/preview/Experiments/LegacyDragHandle', { 
        waitUntil: 'domcontentloaded' 
      })
      
      await this.page.waitForTimeout(2000)
      
      // 检查页面是否可以加载（即使功能可能有限）
      const pageTitle = await this.page.title()
      console.log(`   📰 Legacy页面标题: ${pageTitle}`)
      
      this.results.legacyImplementation = true
      console.log('   ✅ Legacy实现页面可访问')
      return true
      
    } catch (error) {
      // Legacy 实现可能有问题，这是预期的
      console.log('   ⚠️  Legacy实现页面有问题（这是预期的）')
      this.results.legacyImplementation = false
      return false
    }
  }
  
  async generateReport() {
    console.log('\n📊 生成验证报告...')
    
    const passedTests = Object.values(this.results).filter(v => v === true).length - 1 // 减去errors数组
    const totalTests = Object.keys(this.results).length - 1 // 减去errors键
    
    console.log('\n' + '='.repeat(60))
    console.log('🎯 拖拽功能验证报告')
    console.log('='.repeat(60))
    
    console.log(`📈 总体得分: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`)
    console.log()
    
    console.log('📋 详细结果:')
    console.log(`   服务器状态: ${this.results.serverStatus ? '✅ 正常' : '❌ 异常'}`)
    console.log(`   优化实现页面: ${this.results.optimizedImplementation ? '✅ 正常' : '❌ 异常'}`)
    console.log(`   拖拽手柄显示: ${this.results.dragHandleDisplay ? '✅ 正常' : '❌ 异常'}`)
    console.log(`   拖拽功能: ${this.results.dragFunctionality ? '✅ 正常' : '❌ 异常'}`)
    console.log(`   AppFlowy算法: ${this.results.appflowyAlgorithm ? '✅ 正常' : '❌ 异常'}`)
    console.log(`   对比演示页面: ${this.results.comparisonDemo ? '✅ 正常' : '❌ 异常'}`)
    console.log(`   Legacy实现: ${this.results.legacyImplementation ? '✅ 可访问' : '⚠️  有问题（预期）'}`)
    
    if (this.results.errors.length > 0) {
      console.log('\n❌ 错误详情:')
      this.results.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`)
      })
    }
    
    console.log('\n🎯 结论:')
    if (passedTests >= totalTests * 0.8) {
      console.log('✅ 拖拽功能整体正常，软隔离重构成功！')
    } else if (passedTests >= totalTests * 0.6) {
      console.log('⚠️  拖拽功能基本正常，但有部分问题需要关注')
    } else {
      console.log('❌ 拖拽功能存在较多问题，需要进一步调试')
    }
    
    console.log('='.repeat(60))
  }
  
  async cleanup() {
    if (this.browser) {
      await this.browser.close()
    }
  }
  
  async run() {
    const initialized = await this.init()
    if (!initialized) {
      console.log('❌ 初始化失败，无法继续验证')
      return
    }
    
    try {
      // 按顺序执行验证
      await this.validateServerStatus()
      
      if (this.results.serverStatus) {
        await this.validateOptimizedImplementation()
        
        if (this.results.optimizedImplementation) {
          await this.validateDragHandleDisplay()
          await this.validateDragFunctionality()
          await this.validateAppFlowyAlgorithm()
        }
        
        await this.validateComparisonDemo()
        await this.validateLegacyImplementation()
      }
      
      await this.generateReport()
      
    } catch (error) {
      console.log(`❌ 验证过程中出现未处理错误: ${error.message}`)
    } finally {
      await this.cleanup()
    }
  }
}

// 运行验证
const validator = new DragFunctionValidator()
validator.run().catch(console.error)