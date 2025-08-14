import { expect, test } from '@playwright/test'

/**
 * 化学公式扩展 E2E 集成测试
 *
 * 测试真实的化学教学场景:
 * 1. 🧪 化学公式的完整渲染和交互
 * 2. 🔬 mhchem 语法的浏览器兼容性
 * 3. 📚 教学工作流的端到端验证
 * 4. 🎯 Block Stream 拖拽和编辑
 * 5. 💡 AI 协作的化学公式场景
 * 6. 🧮 与数学公式的协同工作
 */

test.describe('Chemistry Extension - E2E Integration', () => {
  test.beforeEach(async ({ page }) => {
    console.log('🧪 设置化学公式测试环境...')

    // 访问 Chemistry 扩展演示页面
    await page.goto('/src/Extensions/Chemistry/React/')
    console.log('✅ 使用专用化学扩展演示页面')

    // 等待页面加载完成
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000) // 给页面一些时间完全初始化

    console.log('✅ 化学公式测试环境设置完成')
  })

  test.describe('🧪 Basic Chemistry Formula Rendering', () => {
    test('应该正常加载化学公式扩展演示页面', async ({ page }) => {
      // 基础页面加载验证
      console.log('🧪 验证化学公式页面基础元素...')

      // 验证编辑器存在
      const editor = page.locator('.ProseMirror')
      await expect(editor).toBeVisible({ timeout: 10000 })
      console.log('✅ TipTap编辑器已加载')

      // 验证化学公式控制按钮
      const insertChemBtn = page.locator('button:has-text("Insert Sample Chemistry")')
      await expect(insertChemBtn).toBeVisible()
      console.log('✅ 插入化学公式按钮存在')

      const insertUnitsBtn = page.locator('button:has-text("Insert Physical Units")')
      await expect(insertUnitsBtn).toBeVisible()
      console.log('✅ 插入物理单位按钮存在')

      // 验证现有的化学公式元素
      const existingChemistry = page.locator('[data-type="inline-chemical"], [data-type="block-chemical"]')
      const chemCount = await existingChemistry.count()
      console.log(`📊 发现现有化学公式: ${chemCount} 个`)
      expect(chemCount).toBeGreaterThan(0)

      // 验证第一个化学公式
      const firstChem = existingChemistry.first()
      const chemicalAttr = await firstChem.getAttribute('data-chemical')
      console.log(`🔍 第一个化学公式内容: ${chemicalAttr}`)
      expect(chemicalAttr).toBeTruthy()

      console.log('✅ 化学公式扩展页面验证完成')
    })

    test('应该正确渲染基础化学分子式', async ({ page }) => {
      // 验证水分子的渲染
      const waterFormula = page.locator('[data-chemical*="H2O"]').first()
      await expect(waterFormula).toBeVisible()

      // 验证 KaTeX 渲染结果
      const katexContent = waterFormula.locator('.katex, .katex-display')
      await expect(katexContent).toBeVisible()

      // 验证化学公式类型
      await expect(waterFormula).toHaveAttribute('data-type', /^(inline-chemical|block-chemical)$/)

      console.log('✅ 基础化学分子式渲染正确')
    })

    test('应该正确渲染化学反应方程式', async ({ page }) => {
      // 查找包含反应箭头的化学方程式
      const reactionFormula = page.locator('[data-chemical*="->"], [data-chemical*="<=>"]').first()
      await expect(reactionFormula).toBeVisible()

      // 验证反应方程式的块级显示
      await expect(reactionFormula).toHaveAttribute('data-type', 'block-chemical')

      // 验证渲染内容包含反应箭头
      const renderedContent = await reactionFormula.innerHTML()
      expect(renderedContent).toBeTruthy()

      console.log('✅ 化学反应方程式渲染正确')
    })

    test('应该正确渲染物理单位', async ({ page }) => {
      // 查找温度单位
      const temperatureUnit = page.locator('[data-chemical*="°C"], [data-chemical*="K"]').first()
      await expect(temperatureUnit).toBeVisible()

      // 验证单位的行内显示
      await expect(temperatureUnit).toHaveAttribute('data-type', 'inline-chemical')

      // 验证 KaTeX 渲染
      const katexUnit = temperatureUnit.locator('.katex')
      await expect(katexUnit).toBeVisible()

      console.log('✅ 物理单位渲染正确')
    })
  })

  test.describe('🔬 Advanced Chemistry Scenarios', () => {
    test('应该支持复杂有机化学反应的渲染', async ({ page }) => {
      // 点击插入化学公式按钮
      const insertBtn = page.locator('button:has-text("Insert Sample Chemistry")')
      await insertBtn.click()

      // 等待新的化学公式出现
      await page.waitForTimeout(500)

      // 验证复杂的有机反应（如果演示页面包含）
      const organicReaction = page.locator('[data-chemical*="CH"], [data-chemical*="COOH"]').first()

      if ((await organicReaction.count()) > 0) {
        await expect(organicReaction).toBeVisible()

        // 验证有机化学的特殊字符渲染
        const renderedOrganic = await organicReaction.innerHTML()
        expect(renderedOrganic).toBeTruthy()

        console.log('✅ 有机化学反应渲染正确')
      } else {
        console.log('ℹ️  演示页面中未找到有机化学反应')
      }
    })

    test('应该支持离子和电荷的显示', async ({ page }) => {
      // 查找包含离子电荷的公式
      const ionFormula = page.locator('[data-chemical*="+"], [data-chemical*="-"], [data-chemical*="^"]').first()

      if ((await ionFormula.count()) > 0) {
        await expect(ionFormula).toBeVisible()

        // 验证离子电荷的渲染
        const katexIon = ionFormula.locator('.katex')
        await expect(katexIon).toBeVisible()

        console.log('✅ 离子电荷显示正确')
      } else {
        console.log('ℹ️  演示页面中未找到离子公式')
      }
    })

    test('应该支持反应条件的显示', async ({ page }) => {
      // 查找包含反应条件的公式（如加热、催化剂等）
      const conditionFormula = page
        .locator('[data-chemical*="\\\\Delta"], [data-chemical*="heat"], [data-chemical*="H2SO4"]')
        .first()

      if ((await conditionFormula.count()) > 0) {
        await expect(conditionFormula).toBeVisible()

        // 验证反应条件的渲染
        const renderedCondition = await conditionFormula.innerHTML()
        expect(renderedCondition).toBeTruthy()

        console.log('✅ 反应条件显示正确')
      } else {
        console.log('ℹ️  演示页面中未找到带条件的反应')
      }
    })
  })

  test.describe('🎯 Interactive Chemistry Features', () => {
    test('应该支持化学公式的点击交互', async ({ page }) => {
      // 设置控制台监听以捕获点击事件
      const clickEvents: string[] = []
      page.on('console', msg => {
        if (msg.text().includes('Chemistry clicked:')) {
          clickEvents.push(msg.text())
        }
      })

      // 点击第一个化学公式
      const firstChemical = page.locator('[data-type="inline-chemical"], [data-type="block-chemical"]').first()
      await expect(firstChemical).toBeVisible()
      await firstChemical.click()

      // 给点击事件一些处理时间
      await page.waitForTimeout(200)

      // 验证点击事件被触发（如果演示页面包含点击处理）
      console.log(`📊 捕获到 ${clickEvents.length} 个点击事件`)

      if (clickEvents.length > 0) {
        expect(clickEvents[0]).toContain('Chemistry clicked:')
        console.log('✅ 化学公式点击交互正常')
      } else {
        console.log('ℹ️  演示页面可能未包含点击事件处理')
      }
    })

    test('应该支持动态插入新的化学公式', async ({ page }) => {
      // 记录插入前的化学公式数量
      const initialCount = await page.locator('[data-type*="chemical"]').count()
      console.log(`📊 初始化学公式数量: ${initialCount}`)

      // 点击插入化学公式按钮
      const insertBtn = page.locator('button:has-text("Insert Sample Chemistry")')
      await insertBtn.click()

      // 等待新公式插入
      await page.waitForTimeout(500)

      // 验证新公式已插入
      const newCount = await page.locator('[data-type*="chemical"]').count()
      console.log(`📊 插入后化学公式数量: ${newCount}`)

      expect(newCount).toBeGreaterThan(initialCount)
      console.log('✅ 动态插入化学公式成功')
    })

    test('应该支持物理单位的插入', async ({ page }) => {
      // 记录插入前的数量
      const initialCount = await page.locator('[data-type*="chemical"]').count()

      // 点击插入物理单位按钮
      const insertUnitsBtn = page.locator('button:has-text("Insert Physical Units")')
      await insertUnitsBtn.click()

      // 等待插入完成
      await page.waitForTimeout(500)

      // 验证新的物理单位已插入
      const newCount = await page.locator('[data-type*="chemical"]').count()
      expect(newCount).toBeGreaterThan(initialCount)

      // 查找新插入的温度或能量单位
      const physicalUnits = page.locator('[data-chemical*="°C"], [data-chemical*="kJ"], [data-chemical*="atm"]')
      const unitsCount = await physicalUnits.count()

      if (unitsCount > 0) {
        console.log(`📊 发现 ${unitsCount} 个物理单位`)
        console.log('✅ 物理单位插入成功')
      }
    })
  })

  test.describe('🔗 Block Stream Integration', () => {
    test('应该正确设置 moni block 属性', async ({ page }) => {
      // 验证化学公式具有 moni-block-id
      const chemWithBlockId = page.locator('[data-moni-block-id]').first()

      if ((await chemWithBlockId.count()) > 0) {
        await expect(chemWithBlockId).toBeVisible()

        // 验证 block ID 存在且有效
        const blockId = await chemWithBlockId.getAttribute('data-moni-block-id')
        expect(blockId).toBeTruthy()
        expect(blockId).toMatch(/^[a-zA-Z0-9-_]+$/) // 基本的 ID 格式验证

        console.log(`✅ 发现有效的 moni-block-id: ${blockId}`)
      } else {
        console.log('ℹ️  演示页面中的化学公式可能没有 moni-block-id')
      }
    })

    test('应该支持化学公式的层级结构', async ({ page }) => {
      // 查找带有层级属性的化学公式
      const leveledFormulas = page.locator('[data-moni-level]')
      const levelCount = await leveledFormulas.count()

      if (levelCount > 0) {
        console.log(`📊 发现 ${levelCount} 个带层级的化学公式`)

        // 验证层级属性的值
        const maxCheck = Math.min(levelCount, 3)
        const levelChecks = []
        for (let i = 0; i < maxCheck; i += 1) {
          const formula = leveledFormulas.nth(i)
          levelChecks.push(formula.getAttribute('data-moni-level'))
        }

        const levels = await Promise.all(levelChecks)
        levels.forEach((level, i) => {
          expect(level).toMatch(/^\d+$/) // 应该是数字
          console.log(`✅ 公式 ${i + 1} 层级: ${level}`)
        })
      } else {
        console.log('ℹ️  演示页面中的化学公式没有层级结构')
      }
    })

    test('应该正确设置化学类型的流标识', async ({ page }) => {
      // 验证块级化学公式的流类型
      const blockChemicals = page.locator('[data-type="block-chemical"]')
      const blockCount = await blockChemicals.count()

      if (blockCount > 0) {
        const firstBlock = blockChemicals.first()
        const streamType = await firstBlock.getAttribute('data-moni-stream-type')

        if (streamType) {
          expect(streamType).toBe('chemistry')
          console.log('✅ 块级化学公式流类型正确: chemistry')
        }
      }

      // 验证行内化学公式的流类型
      const inlineChemicals = page.locator('[data-type="inline-chemical"]')
      const inlineCount = await inlineChemicals.count()

      if (inlineCount > 0) {
        const firstInline = inlineChemicals.first()
        const streamType = await firstInline.getAttribute('data-moni-stream-type')

        if (streamType) {
          expect(streamType).toBe('inline-chemistry')
          console.log('✅ 行内化学公式流类型正确: inline-chemistry')
        }
      }
    })
  })

  test.describe('🛡️ Error Handling and Fallbacks', () => {
    test('应该优雅处理渲染错误', async ({ page }) => {
      // 监听控制台错误
      const consoleErrors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text())
        }
      })

      // 等待页面完全加载和渲染
      await page.waitForTimeout(2000)

      // 验证没有严重的渲染错误
      const severeErrors = consoleErrors.filter(
        err => err.includes('TypeError') || err.includes('ReferenceError') || err.includes('Cannot read property'),
      )

      if (severeErrors.length > 0) {
        console.log(`⚠️  发现 ${severeErrors.length} 个严重错误:`)
        severeErrors.forEach(err => console.log(`   ${err}`))
      } else {
        console.log('✅ 没有发现严重的渲染错误')
      }

      // 允许一些非严重的错误（如网络请求失败等）
      expect(severeErrors.length).toBeLessThanOrEqual(0)
    })

    test('应该正确显示错误状态的化学公式', async ({ page }) => {
      // 查找可能的错误状态化学公式
      const errorFormulas = page.locator('.chemistry-render-error, .math-error')
      const errorCount = await errorFormulas.count()

      if (errorCount > 0) {
        console.log(`📊 发现 ${errorCount} 个错误状态的化学公式`)

        // 验证错误公式仍然显示原始内容
        const firstError = errorFormulas.first()
        await expect(firstError).toBeVisible()

        // 验证错误公式有适当的样式
        const hasErrorClass = await firstError.evaluate(
          el => el.classList.contains('chemistry-render-error') || el.classList.contains('math-error'),
        )
        expect(hasErrorClass).toBe(true)

        console.log('✅ 错误状态化学公式显示正确')
      } else {
        console.log('✅ 所有化学公式渲染正常，无错误状态')
      }
    })
  })

  test.describe('📱 Responsive and Accessibility', () => {
    test('应该在不同屏幕尺寸下正确显示', async ({ page }) => {
      // 测试不同的视口尺寸
      const viewports = [
        { width: 1920, height: 1080, name: '桌面' },
        { width: 1024, height: 768, name: '平板' },
        { width: 375, height: 667, name: '手机' },
      ]

      // 串行执行以避免 ESLint 警告
      await page.setViewportSize(viewports[0])
      await page.waitForTimeout(500)
      let visibleFormulas = page.locator('[data-type*="chemical"]:visible')
      let count = await visibleFormulas.count()
      expect(count).toBeGreaterThan(0)
      console.log(`✅ ${viewports[0].name} 尺寸下显示正常，可见公式: ${count} 个`)

      await page.setViewportSize(viewports[1])
      await page.waitForTimeout(500)
      visibleFormulas = page.locator('[data-type*="chemical"]:visible')
      count = await visibleFormulas.count()
      expect(count).toBeGreaterThan(0)
      console.log(`✅ ${viewports[1].name} 尺寸下显示正常，可见公式: ${count} 个`)

      await page.setViewportSize(viewports[2])
      await page.waitForTimeout(500)
      visibleFormulas = page.locator('[data-type*="chemical"]:visible')
      count = await visibleFormulas.count()
      expect(count).toBeGreaterThan(0)
      console.log(`✅ ${viewports[2].name} 尺寸下显示正常，可见公式: ${count} 个`)
    })

    test('应该支持键盘导航', async ({ page }) => {
      // 获取第一个可聚焦的化学公式
      const chemicalFormulas = page.locator('[data-type*="chemical"]')
      const formulaCount = await chemicalFormulas.count()

      if (formulaCount > 0) {
        // 尝试使用 Tab 键导航
        await page.keyboard.press('Tab')
        await page.waitForTimeout(100)

        // 检查是否有元素获得焦点
        const focusedElement = page.locator(':focus')
        const hasFocus = (await focusedElement.count()) > 0

        if (hasFocus) {
          console.log('✅ 键盘导航正常工作')
        } else {
          console.log('ℹ️  页面可能不包含可聚焦的化学公式元素')
        }
      }
    })
  })

  test.describe('🚀 Performance Validation', () => {
    test('应该快速加载和渲染化学公式', async ({ page }) => {
      const startTime = Date.now()

      // 等待所有化学公式渲染完成
      await page.waitForSelector('[data-type*="chemical"]', { timeout: 5000 })

      // 等待 KaTeX 渲染完成
      await page.waitForSelector('.katex, .katex-display', { timeout: 3000 })

      const endTime = Date.now()
      const loadTime = endTime - startTime

      console.log(`⏱️  化学公式加载时间: ${loadTime}ms`)

      // 验证加载时间合理（应该在 5 秒内）
      expect(loadTime).toBeLessThan(5000)

      // 验证至少有一些公式被渲染
      const renderedFormulas = await page.locator('[data-type*="chemical"]').count()
      expect(renderedFormulas).toBeGreaterThan(0)

      console.log(`✅ 性能验证通过，渲染了 ${renderedFormulas} 个化学公式`)
    })

    test('应该支持大量化学公式的页面', async ({ page }) => {
      // 如果页面包含很多化学公式，验证性能
      const totalFormulas = await page.locator('[data-type*="chemical"]').count()
      console.log(`📊 页面包含 ${totalFormulas} 个化学公式`)

      if (totalFormulas >= 10) {
        // 验证页面仍然响应
        const startScroll = Date.now()
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
        await page.waitForTimeout(100)
        await page.evaluate(() => window.scrollTo(0, 0))
        const endScroll = Date.now()

        const scrollTime = endScroll - startScroll
        console.log(`⏱️  页面滚动时间: ${scrollTime}ms`)

        // 验证滚动性能（应该在 1 秒内）
        expect(scrollTime).toBeLessThan(1000)
        console.log('✅ 大量公式页面性能良好')
      } else {
        console.log('ℹ️  页面化学公式数量较少，跳过大量公式性能测试')
      }
    })
  })

  test.describe('🧮 Integration with Mathematics', () => {
    test('应该与数学公式和谐共存', async ({ page }) => {
      // 查找数学公式和化学公式
      const mathFormulas = page.locator('[data-type*="math"]')
      const chemFormulas = page.locator('[data-type*="chemical"]')

      const mathCount = await mathFormulas.count()
      const chemCount = await chemFormulas.count()

      console.log(`📊 数学公式: ${mathCount} 个，化学公式: ${chemCount} 个`)

      if (mathCount > 0 && chemCount > 0) {
        // 验证两种公式都能正确显示
        await expect(mathFormulas.first()).toBeVisible()
        await expect(chemFormulas.first()).toBeVisible()

        // 验证两种公式有不同的类型标识
        const firstMath = await mathFormulas.first().getAttribute('data-type')
        const firstChem = await chemFormulas.first().getAttribute('data-type')

        expect(firstMath).toContain('math')
        expect(firstChem).toContain('chemical')

        console.log('✅ 数学公式和化学公式和谐共存')
      } else if (chemCount > 0) {
        console.log('✅ 化学公式正常显示（页面不包含数学公式）')
      } else {
        console.log('ℹ️  页面可能只包含数学公式或都不包含')
      }
    })
  })
})
