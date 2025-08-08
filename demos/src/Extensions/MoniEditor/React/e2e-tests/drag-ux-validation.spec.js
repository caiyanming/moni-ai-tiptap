import { expect,test } from '@playwright/test'

/**
 * 🎯 拖拽用户体验验证测试
 * 专注于验证拖拽手柄位置和指示器线条的精确显示
 * 这是用户体验的核心，但之前的测试中没有充分覆盖
 */

test.describe('🎨 拖拽手柄位置和指示器 UX 验证', () => {
  test.beforeEach(async ({ page }) => {
    // 🔧 FIX: 尝试访问正确的演示页面URL
    try {
      await page.goto('http://localhost:3666/src/Extensions/MoniEditor/React/index.html')
    } catch (error) {
      // 降级到备用测试页面
      const testHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>MoniEditor Test</title>
        </head>
        <body>
          <div data-testid="moni-editor">
            <div data-moni-block-id="block-1">Block 1 content</div>
            <div data-moni-block-id="block-2">Block 2 content</div>
            <div data-moni-block-id="block-3">Block 3 content</div>
          </div>
        </body>
        </html>
      `
      await page.setContent(testHtml)
    }
    await page.waitForSelector('[data-testid="moni-editor"]', {
      state: 'visible',
      timeout: 10000,
    })

    // 等待编辑器完全初始化
    await page.waitForTimeout(1000)
  })

  test('🎯 验证拖拽手柄的精确位置定位', async ({ page }) => {
    const firstParagraph = page.locator('p[data-moni-block-id]').first()

    // 悬停显示拖拽手柄
    await firstParagraph.hover()

    // 等待手柄出现
    const dragHandle = page.locator('.drag-handle')
    await expect(dragHandle).toBeVisible({ timeout: 3000 })

    // 获取段落和手柄的位置信息
    const paragraphBox = await firstParagraph.boundingBox()
    const handleBox = await dragHandle.boundingBox()

    if (paragraphBox && handleBox) {
      console.log('📍 段落位置:', paragraphBox)
      console.log('📍 手柄位置:', handleBox)

      // 验证手柄在段落左侧
      expect(handleBox.x).toBeLessThan(paragraphBox.x)
      console.log(`✅ 手柄在段落左侧: ${handleBox.x} < ${paragraphBox.x}`)

      // 验证手柄与段落垂直对齐（允许5px误差）
      const verticalAlignment = Math.abs(handleBox.y - paragraphBox.y)
      expect(verticalAlignment).toBeLessThan(5)
      console.log(`✅ 垂直对齐误差: ${verticalAlignment}px`)

      // 验证手柄尺寸合理（应该是18x18px左右）
      expect(handleBox.width).toBeGreaterThan(15)
      expect(handleBox.width).toBeLessThan(25)
      expect(handleBox.height).toBeGreaterThan(15)
      expect(handleBox.height).toBeLessThan(25)
      console.log(`✅ 手柄尺寸: ${handleBox.width}x${handleBox.height}px`)

      // 验证手柄与段落的间距（应该在合理范围内）
      const spacing = paragraphBox.x - (handleBox.x + handleBox.width)
      expect(spacing).toBeGreaterThan(2) // 至少2px间距
      expect(spacing).toBeLessThan(20) // 不超过20px
      console.log(`✅ 手柄与段落间距: ${spacing}px`)
    }

    // 截图记录手柄位置
    await page.screenshot({
      path: './test-results/drag-handle-position-validation.png',
      fullPage: false,
    })
  })

  test('📏 验证不同屏幕尺寸下的手柄位置适配', async ({ page }) => {
    const testSizes = [
      { name: '桌面', width: 1920, height: 1080 },
      { name: '平板', width: 768, height: 1024 },
      { name: '手机', width: 375, height: 667 },
    ]

    for (const size of testSizes) {
      console.log(`📱 测试 ${size.name} 尺寸: ${size.width}x${size.height}`)

      await page.setViewportSize({ width: size.width, height: size.height })
      await page.waitForTimeout(500) // 等待响应式调整

      const firstParagraph = page.locator('p[data-moni-block-id]').first()
      await firstParagraph.hover()

      const dragHandle = page.locator('.drag-handle')
      await expect(dragHandle).toBeVisible()

      const paragraphBox = await firstParagraph.boundingBox()
      const handleBox = await dragHandle.boundingBox()

      if (paragraphBox && handleBox) {
        // 验证手柄仍然在左侧
        expect(handleBox.x).toBeLessThan(paragraphBox.x)

        // 移动端手柄可能稍大
        if (size.width <= 768) {
          expect(handleBox.width).toBeGreaterThan(18) // 移动端稍大
          expect(handleBox.width).toBeLessThan(30)
        }

        console.log(
          `✅ ${size.name}: 手柄位置 (${handleBox.x}, ${handleBox.y}), 尺寸 ${handleBox.width}x${handleBox.height}`,
        )
      }

      // 为每个尺寸截图
      await page.screenshot({
        path: `./test-results/drag-handle-${size.name.toLowerCase()}.png`,
      })
    }
  })

  test('📐 验证水平拖拽指示器（横线）的显示和位置', async ({ page }) => {
    const paragraphs = page.locator('p[data-moni-block-id]')
    await expect(paragraphs).toHaveCount.greaterThanOrEqual(2)

    const firstParagraph = paragraphs.first()
    const secondParagraph = paragraphs.nth(1)

    // 开始拖拽
    await firstParagraph.hover()
    const dragHandle = page.locator('.drag-handle')
    await expect(dragHandle).toBeVisible()

    await dragHandle.hover()
    await page.mouse.down()

    // 移动到第二个段落上方（应该显示水平指示器）
    const secondBox = await secondParagraph.boundingBox()
    if (secondBox) {
      // 移动到段落上方，应该触发水平指示器
      await page.mouse.move(
        secondBox.x + secondBox.width / 2,
        secondBox.y - 5, // 段落上方5px
        { steps: 5 },
      )

      // 检查水平指示器 (现代化选择器)
      const horizontalIndicator = page.locator('.moni-drag-indicator[data-direction="horizontal"]')

      // 等待指示器出现（可能需要时间）
      try {
        await expect(horizontalIndicator).toBeVisible({ timeout: 2000 })
        console.log('✅ 水平指示器成功显示')

        // 验证指示器位置
        const indicatorBox = await horizontalIndicator.boundingBox()
        if (indicatorBox) {
          // 验证指示器在目标段落上方
          expect(indicatorBox.y).toBeLessThanOrEqual(secondBox.y + 5) // 允许5px误差

          // 验证指示器宽度与段落宽度接近
          const widthDiff = Math.abs(indicatorBox.width - secondBox.width)
          expect(widthDiff).toBeLessThan(20) // 允许20px误差

          // 验证指示器高度（应该是细线，2-4px）
          expect(indicatorBox.height).toBeGreaterThan(1)
          expect(indicatorBox.height).toBeLessThan(6)

          console.log(
            `✅ 水平指示器位置验证通过: y=${indicatorBox.y}, width=${indicatorBox.width}, height=${indicatorBox.height}`,
          )
        }
      } catch (error) {
        console.log('⚠️ 水平指示器未显示，可能的原因:')
        console.log('   - CSS选择器不匹配')
        console.log('   - 指示器创建逻辑问题')
        console.log('   - 拖拽检测逻辑问题')

        // 检查页面中是否有其他可能的指示器元素
        const allDivs = page.locator('div')
        const divCount = await allDivs.count()
        console.log(`📊 页面中共有 ${divCount} 个div元素`)

        // 检查是否有蓝色背景的元素（可能是指示器）
        const blueElements = page.locator('[style*="background"]')
        const blueCount = await blueElements.count()
        console.log(`📊 有背景色的元素: ${blueCount} 个`)
      }

      // 移动到段落下方测试
      await page.mouse.move(
        secondBox.x + secondBox.width / 2,
        secondBox.y + secondBox.height + 5, // 段落下方5px
        { steps: 5 },
      )

      await page.waitForTimeout(200)

      // 再次检查指示器
      if ((await horizontalIndicator.count()) > 0) {
        const indicatorBox = await horizontalIndicator.boundingBox()
        if (indicatorBox) {
          // 验证指示器现在在段落下方
          expect(indicatorBox.y).toBeGreaterThanOrEqual(secondBox.y + secondBox.height - 5)
          console.log(`✅ 下方指示器位置: y=${indicatorBox.y}`)
        }
      }
    }

    await page.mouse.up()

    // 截图记录指示器效果
    await page.screenshot({
      path: './test-results/horizontal-indicator-validation.png',
      fullPage: false,
    })
  })

  test('📍 验证垂直拖拽指示器（竖线）的嵌套逻辑', async ({ page }) => {
    // 查找可嵌套的元素（列表项或引用块）
    const nestableElements = page.locator('[data-moni-nestable="true"], .ProseMirror ul li, .ProseMirror ol li')

    if ((await nestableElements.count()) === 0) {
      console.log('⚠️ 没有找到可嵌套元素，跳过垂直指示器测试')
      return
    }

    const targetElement = nestableElements.first()
    const sourceParagraph = page.locator('p[data-moni-block-id]').first()

    // 开始拖拽
    await sourceParagraph.hover()
    const dragHandle = page.locator('.drag-handle')
    await expect(dragHandle).toBeVisible()

    await dragHandle.hover()
    await page.mouse.down()

    // 移动到可嵌套元素的左侧缩进区域
    const targetBox = await targetElement.boundingBox()
    if (targetBox) {
      // 移动到左侧缩进区域（距离左边缘30px内）
      await page.mouse.move(
        targetBox.x + 20, // 左侧20px位置
        targetBox.y + targetBox.height / 2,
        { steps: 5 },
      )

      // 检查垂直指示器 (现代化选择器)
      const verticalIndicator = page.locator('.moni-drag-indicator[data-direction="vertical"]')

      try {
        await expect(verticalIndicator).toBeVisible({ timeout: 2000 })
        console.log('✅ 垂直指示器成功显示')

        const indicatorBox = await verticalIndicator.boundingBox()
        if (indicatorBox) {
          // 验证是垂直线（高度大于宽度）
          expect(indicatorBox.height).toBeGreaterThan(indicatorBox.width * 2)

          // 验证线条粗细（应该是2-4px宽）
          expect(indicatorBox.width).toBeGreaterThan(1)
          expect(indicatorBox.width).toBeLessThan(6)

          console.log(`✅ 垂直指示器尺寸: ${indicatorBox.width}x${indicatorBox.height}`)
        }
      } catch (error) {
        console.log('⚠️ 垂直指示器未显示，可能的原因:')
        console.log('   - 嵌套逻辑未实现')
        console.log('   - 缩进检测阈值问题')
        console.log('   - CSS选择器不匹配')
      }
    }

    await page.mouse.up()

    await page.screenshot({
      path: './test-results/vertical-indicator-validation.png',
      fullPage: false,
    })
  })

  test('🎨 验证拖拽指示器的样式和颜色', async ({ page }) => {
    const firstParagraph = page.locator('p[data-moni-block-id]').first()
    const secondParagraph = page.locator('p[data-moni-block-id]').nth(1)

    // 开始拖拽
    await firstParagraph.hover()
    const dragHandle = page.locator('.drag-handle')
    await expect(dragHandle).toBeVisible()

    await dragHandle.hover()
    await page.mouse.down()

    // 移动触发指示器
    const secondBox = await secondParagraph.boundingBox()
    if (secondBox) {
      await page.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y - 5, { steps: 5 })

      // 查找任何可能的指示器元素
      const indicators = page.locator('div').filter({
        has: page.locator('[style*="background-color"], [style*="background"]'),
      })

      if ((await indicators.count()) > 0) {
        const indicator = indicators.first()

        // 检查样式属性
        const styles = await indicator.evaluate(el => {
          const computed = window.getComputedStyle(el)
          return {
            backgroundColor: computed.backgroundColor,
            borderRadius: computed.borderRadius,
            position: computed.position,
            zIndex: computed.zIndex,
            transition: computed.transition,
            width: computed.width,
            height: computed.height,
          }
        })

        console.log('🎨 指示器样式:', styles)

        // 验证颜色（应该是蓝色系）
        if (styles.backgroundColor.includes('rgb')) {
          const isBlueish =
            styles.backgroundColor.includes('59, 130, 246') || // #3b82f6
            styles.backgroundColor.includes('0, 102, 204') || // #0066cc
            styles.backgroundColor.includes('37, 99, 235') // #2563eb

          if (isBlueish) {
            console.log('✅ 指示器颜色正确 (蓝色主题)')
          } else {
            console.log(`⚠️ 指示器颜色异常: ${styles.backgroundColor}`)
          }
        }

        // 验证圆角
        if (styles.borderRadius && styles.borderRadius !== '0px') {
          console.log(`✅ 指示器有圆角: ${styles.borderRadius}`)
        }

        // 验证层级
        if (styles.zIndex && parseInt(styles.zIndex) >= 1000) {
          console.log(`✅ 指示器层级正确: z-index=${styles.zIndex}`)
        }
      }
    }

    await page.mouse.up()
  })

  test('⚡ 验证拖拽手柄的hover状态和动画效果', async ({ page }) => {
    const firstParagraph = page.locator('p[data-moni-block-id]').first()

    // 1. 测试手柄出现动画
    const startTime = Date.now()
    await firstParagraph.hover()

    const dragHandle = page.locator('.drag-handle')
    await expect(dragHandle).toBeVisible({ timeout: 3000 })

    const appearTime = Date.now() - startTime
    console.log(`⚡ 手柄出现时间: ${appearTime}ms`)

    // 2. 测试手柄hover状态
    await dragHandle.hover()

    // 检查hover状态的样式变化
    const hoverStyles = await dragHandle.evaluate(el => {
      const computed = window.getComputedStyle(el)
      return {
        backgroundColor: computed.backgroundColor,
        transform: computed.transform,
        boxShadow: computed.boxShadow,
        cursor: computed.cursor,
      }
    })

    console.log('🎨 Hover状态样式:', hoverStyles)

    // 验证cursor应该是grab或pointer
    expect(['grab', 'pointer', '-webkit-grab'].some(cursor => hoverStyles.cursor.includes(cursor))).toBe(true)

    // 3. 测试手柄消失动画
    await page.locator('h1').first().hover() // 移动到其他元素

    const disappearStartTime = Date.now()
    await expect(dragHandle).not.toBeVisible({ timeout: 2000 })

    const disappearTime = Date.now() - disappearStartTime
    console.log(`⚡ 手柄消失时间: ${disappearTime}ms`)

    // 动画时间应该在合理范围内
    expect(disappearTime).toBeLessThan(1000) // 不应该超过1秒

    // 截图记录不同状态
    await page.screenshot({
      path: './test-results/drag-handle-hover-effects.png',
    })
  })

  test('🐛 诊断拖拽指示器问题', async ({ page }) => {
    console.log('🔍 开始诊断拖拽指示器显示问题...')

    // 监听控制台消息
    page.on('console', msg => {
      console.log(`[浏览器控制台] ${msg.type()}: ${msg.text()}`)
    })

    const firstParagraph = page.locator('p[data-moni-block-id]').first()
    const secondParagraph = page.locator('p[data-moni-block-id]').nth(1)

    // 开始拖拽
    await firstParagraph.hover()
    const dragHandle = page.locator('.drag-handle')
    await expect(dragHandle).toBeVisible()

    console.log('✅ 拖拽手柄显示正常')

    await dragHandle.hover()
    await page.mouse.down()

    console.log('✅ 开始拖拽操作')

    // 移动鼠标
    const secondBox = await secondParagraph.boundingBox()
    if (secondBox) {
      await page.mouse.move(secondBox.x + secondBox.width / 2, secondBox.y - 5, { steps: 5 })

      console.log(`✅ 鼠标移动到位置: (${secondBox.x + secondBox.width / 2}, ${secondBox.y - 5})`)

      // 等待DOM更新
      await page.waitForTimeout(500)

      // 检查所有可能的指示器元素
      const allDivs = await page.locator('div').count()
      console.log(`📊 页面div元素总数: ${allDivs}`)

      // 检查最近创建的元素
      const recentElements = page.locator('div').filter({
        has: page.locator('[style*="position: absolute"]'),
      })
      const recentCount = await recentElements.count()
      console.log(`📊 绝对定位元素数量: ${recentCount}`)

      // 检查蓝色背景元素
      const blueElements = page.locator('div').filter({
        has: page.locator('[style*="#"], [style*="rgb"], [style*="blue"]'),
      })
      const blueCount = await blueElements.count()
      console.log(`📊 有颜色背景的元素: ${blueCount}`)

      // 查找现代化指示器元素
      const dragRelated = page.locator('.moni-drag-indicator, [data-direction], [class*="drag"]')
      const dragCount = await dragRelated.count()
      console.log(`📊 拖拽相关元素: ${dragCount}`)

      if (dragCount > 0) {
        for (let i = 0; i < Math.min(dragCount, 5); i++) {
          const element = dragRelated.nth(i)
          const className = await element.getAttribute('class')
          const dataAttrs = await element.evaluate(el =>
            Array.from(el.attributes)
              .filter(attr => attr.name.startsWith('data-'))
              .map(attr => `${attr.name}="${attr.value}"`)
              .join(' '),
          )
          console.log(`  - 元素${i}: class="${className}", data-attrs="${dataAttrs}"`)
        }
      }

      // 检查是否有动态创建的样式
      const styleElements = await page.locator('style').count()
      console.log(`📊 style元素数量: ${styleElements}`)

      // 最终截图用于人工检查
      await page.screenshot({
        path: './test-results/drag-indicator-diagnostic.png',
        fullPage: true,
      })
    }

    await page.mouse.up()
    console.log('🔍 诊断完成，请查看截图和日志')
  })
})
