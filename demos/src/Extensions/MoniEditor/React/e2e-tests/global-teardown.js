/**
 * Playwright 全局清理
 * 在所有测试运行后执行的清理工作
 */

import path from 'path'
import fs from 'fs'

async function globalTeardown() {
  console.log('🧹 开始 E2E 测试全局清理...')
  
  const testResultsDir = path.join(process.cwd(), 'test-results')
  
  try {
    // 生成测试总结报告
    const summaryReport = await generateTestSummary(testResultsDir)
    
    // 保存测试总结
    fs.writeFileSync(
      path.join(testResultsDir, 'test-summary.json'),
      JSON.stringify(summaryReport, null, 2)
    )
    
    // 清理临时文件
    await cleanupTempFiles(testResultsDir)
    
    // 输出测试结果统计
    console.log('📊 测试结果统计:')
    console.log(`   总测试数: ${summaryReport.totalTests}`)
    console.log(`   通过: ${summaryReport.passedTests}`)
    console.log(`   失败: ${summaryReport.failedTests}`)
    console.log(`   截图数: ${summaryReport.screenshots}`)
    console.log(`   视频数: ${summaryReport.videos}`)
    
    if (summaryReport.failedTests > 0) {
      console.log('❌ 部分测试失败，请查看详细报告')
    } else {
      console.log('✅ 所有测试通过！')
    }
    
    console.log(`📁 详细报告: ${path.join(testResultsDir, 'playwright-report')}`)
    
  } catch (error) {
    console.error('❌ 清理过程中出现错误:', error.message)
  }
  
  console.log('🎯 全局清理完成')
}

async function generateTestSummary(testResultsDir) {
  const summary = {
    timestamp: new Date().toISOString(),
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    screenshots: 0,
    videos: 0,
    traces: 0,
    duration: 0,
    browsers: [],
    testFiles: []
  }
  
  try {
    // 统计截图文件
    const screenshots = fs.readdirSync(testResultsDir)
      .filter(file => file.endsWith('.png'))
    summary.screenshots = screenshots.length
    
    // 统计视频文件
    const videos = fs.readdirSync(testResultsDir)
      .filter(file => file.endsWith('.webm'))
    summary.videos = videos.length
    
    // 统计trace文件
    const traces = fs.readdirSync(testResultsDir)
      .filter(file => file.endsWith('.zip'))
    summary.traces = traces.length
    
    // 读取Playwright结果文件（如果存在）
    const resultsFile = path.join(testResultsDir, 'e2e-results.json')
    if (fs.existsSync(resultsFile)) {
      const results = JSON.parse(fs.readFileSync(resultsFile, 'utf-8'))
      
      if (results.suites) {
        results.suites.forEach(suite => {
          suite.specs?.forEach(spec => {
            summary.totalTests++
            if (spec.ok) {
              summary.passedTests++
            } else {
              summary.failedTests++
            }
          })
        })
      }
      
      summary.duration = results.stats?.duration || 0
    }
    
    // 检测测试的浏览器
    const browserDirs = ['chromium', 'firefox', 'webkit', 'Mobile Chrome', 'Mobile Safari']
    browserDirs.forEach(browser => {
      const browserResults = screenshots.filter(file => file.includes(browser.toLowerCase()))
      if (browserResults.length > 0) {
        summary.browsers.push(browser)
      }
    })
    
    // 列出测试文件
    summary.testFiles = [
      'drag-handle.spec.js',
      'stream-operations.spec.js', 
      'hidden-blocks.spec.js'
    ]
    
  } catch (error) {
    console.warn('生成测试总结时出现错误:', error.message)
  }
  
  return summary
}

async function cleanupTempFiles(testResultsDir) {
  try {
    // 清理临时文件（如果有的话）
    const tempFiles = fs.readdirSync(testResultsDir)
      .filter(file => file.startsWith('temp-') || file.endsWith('.tmp'))
    
    tempFiles.forEach(file => {
      const filePath = path.join(testResultsDir, file)
      fs.unlinkSync(filePath)
      console.log(`🗑️  清理临时文件: ${file}`)
    })
    
    // 组织截图文件到子目录
    const screenshots = fs.readdirSync(testResultsDir)
      .filter(file => file.endsWith('.png'))
    
    if (screenshots.length > 0) {
      const screenshotsDir = path.join(testResultsDir, 'screenshots')
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir)
      }
      
      screenshots.forEach(screenshot => {
        const oldPath = path.join(testResultsDir, screenshot)
        const newPath = path.join(screenshotsDir, screenshot)
        
        if (oldPath !== newPath) {
          fs.renameSync(oldPath, newPath)
        }
      })
      
      console.log(`📸 整理了 ${screenshots.length} 个截图文件`)
    }
    
  } catch (error) {
    console.warn('清理临时文件时出现错误:', error.message)
  }
}

export default globalTeardown