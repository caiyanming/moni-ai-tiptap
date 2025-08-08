/**
 * Playwright 全局设置
 * 在所有测试运行前执行的准备工作
 */

import { chromium } from '@playwright/test'
import fs from 'fs'
import path from 'path'

async function globalSetup() {
  console.log('🚀 开始 E2E 测试全局设置...')

  // 创建测试结果目录
  const testResultsDir = path.join(process.cwd(), 'test-results')
  if (!fs.existsSync(testResultsDir)) {
    fs.mkdirSync(testResultsDir, { recursive: true })
  }

  // 创建截图目录
  const screenshotsDir = path.join(testResultsDir, 'screenshots')
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true })
  }

  // 启动浏览器进行预热和基础检查
  console.log('🌐 预热浏览器...')
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // 检查开发服务器是否运行
    console.log('🔍 检查开发服务器状态...')
    await page.goto('http://localhost:3666/src/Extensions/MoniEditor/React/', {
      waitUntil: 'networkidle',
      timeout: 30000,
    })

    // 验证页面基本元素加载
    await page.waitForSelector('h1:has-text("MoniAI TipTap Editor Demo")', { timeout: 10000 })
    await page.waitForSelector('[data-testid="editor-content"]', { timeout: 10000 })

    console.log('✅ 开发服务器运行正常')

    // 预加载关键资源
    await page.locator('button:has-text("Show Debug")').waitFor()
    await page.locator('button:has-text("🚀 Run Batch Operations")').waitFor()

    console.log('✅ 关键组件加载完成')

    // 检查控制台错误
    const consoleErrors = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    // 等待一下看是否有初始化错误
    await page.waitForTimeout(2000)

    if (consoleErrors.length > 0) {
      console.warn('⚠️  发现控制台错误:', consoleErrors)
    } else {
      console.log('✅ 无控制台错误')
    }

    // 生成预热截图
    await page.screenshot({
      path: path.join(testResultsDir, 'global-setup-success.png'),
      fullPage: true,
    })
  } catch (error) {
    console.error('❌ 全局设置失败:', error.message)

    // 生成错误截图
    await page.screenshot({
      path: path.join(testResultsDir, 'global-setup-error.png'),
      fullPage: true,
    })

    throw error
  } finally {
    await browser.close()
  }

  // 创建测试环境信息文件
  const envInfo = {
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    baseURL: 'http://localhost:3666',
    testDir: testResultsDir,
    browsers: ['chromium', 'firefox', 'webkit'],
    setupSuccess: true,
  }

  fs.writeFileSync(path.join(testResultsDir, 'test-environment.json'), JSON.stringify(envInfo, null, 2))

  console.log('🎉 全局设置完成！')
  console.log(`📁 测试结果将保存到: ${testResultsDir}`)

  return envInfo
}

export default globalSetup
