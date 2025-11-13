import { expect, test } from '@playwright/test'

/**
 * 数学公式扩展 E2E 集成测试
 *
 * 测试场景:
 * 1. moni block 机制完整集成
 * 2. 拖拽功能
 * 3. Stream 操作
 * 4. 实际渲染效果
 * 5. 用户交互
 */

test.describe('Mathematics Extension - E2E Integration', () => {
  test.beforeEach(async ({ page }) => {
    console.log('🧮 设置数学公式测试环境...')

    // 访问 Mathematics 扩展演示页面
    await page.goto('/src/Extensions/Mathematics/React/')
    console.log('✅ 使用专用数学扩展演示页面')

    // 等待页面加载完成
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000) // 给页面一些时间完全初始化

    console.log('✅ 数学公式测试环境设置完成')
  })

  test.describe('🔥 Inline Math - Moni Block Integration', () => {
    test('应该正常加载数学公式扩展演示页面', async ({ page }) => {
      // 基础页面加载验证
      console.log('🧮 验证数学公式页面基础元素...')

      // 验证编辑器存在
      const editor = page.locator('.ProseMirror')
      await expect(editor).toBeVisible({ timeout: 10000 })
      console.log('✅ TipTap编辑器已加载')

      // 验证按钮存在
      const inlineMathBtn = page.locator('button:has-text("Insert inline math")')
      await expect(inlineMathBtn).toBeVisible()
      console.log('✅ 插入行内数学公式按钮存在')

      const blockMathBtn = page.locator('button:has-text("Insert block math")')
      await expect(blockMathBtn).toBeVisible()
      console.log('✅ 插入块级数学公式按钮存在')

      // 验证现有的数学公式元素
      const existingMath = page.locator('[data-type="inline-math"]')
      const mathCount = await existingMath.count()
      console.log(`📊 发现现有数学公式: ${mathCount} 个`)
      expect(mathCount).toBeGreaterThan(0)

      // 验证第一个数学公式
      const firstMath = existingMath.first()
      const latexAttr = await firstMath.getAttribute('data-latex')
      console.log(`🔍 第一个数学公式内容: ${latexAttr}`)
      expect(latexAttr).toBeTruthy()

      console.log('✅ 数学公式扩展页面验证完成')
    })

    test.skip('应该正确渲染 KaTeX 数学公式', async ({ page }) => {
      // 插入复杂的数学公式
      await page.evaluate(() => {
        window.testEditor.insertInlineMath('\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', {
          moniBlockId: 'quadratic-formula',
        })
      })

      const mathElement = page.locator('[data-type="inline-math"]')
      await expect(mathElement).toBeVisible()

      // 验证 KaTeX 渲染结果
      const katexContent = mathElement.locator('.katex')
      await expect(katexContent).toBeVisible()

      // 验证包含分数结构
      const fraction = mathElement.locator('.katex .frac')
      await expect(fraction).toBeVisible()
    })

    test.skip('应该支持多个行内数学公式', async ({ page }) => {
      // 插入多个公式
      await page.evaluate(() => {
        window.testEditor.insertInlineMath('\\alpha + \\beta', {
          moniBlockId: 'formula-1',
        })
        window.testEditor.insertInlineMath('\\gamma \\cdot \\delta', {
          moniBlockId: 'formula-2',
        })
        window.testEditor.insertInlineMath('\\int_0^1 f(x) dx', {
          moniBlockId: 'formula-3',
        })
      })

      // 验证所有公式都存在
      const mathElements = page.locator('[data-type="inline-math"]')
      await expect(mathElements).toHaveCount(3)

      // 验证每个公式的 moniBlockId
      await expect(mathElements.nth(0)).toHaveAttribute('data-moni-block-id', 'formula-1')
      await expect(mathElements.nth(1)).toHaveAttribute('data-moni-block-id', 'formula-2')
      await expect(mathElements.nth(2)).toHaveAttribute('data-moni-block-id', 'formula-3')
    })

    test.skip('应该在悬停时显示 block ID 指示器', async ({ page }) => {
      // 插入数学公式
      await page.evaluate(() => {
        window.testEditor.insertInlineMath('\\sum_{i=1}^{n} x_i', {
          moniBlockId: 'summation-formula',
        })
      })

      const mathElement = page.locator('[data-moni-block-id="summation-formula"]')

      // 悬停在元素上
      await mathElement.hover()

      // 验证伪元素指示器出现（通过 CSS 样式检查）
      const elementStyle = await mathElement.evaluate(el => {
        return window.getComputedStyle(el, '::before').content
      })
      expect(elementStyle).toContain('🔗')
    })
  })

  test.describe('🔥 Block Math - Moni Block Integration', () => {
    test.skip('应该创建带有完整 moni block 属性的块级数学公式', async ({ page }) => {
      // 插入块级数学公式
      await page.evaluate(() => {
        window.testEditor.insertBlockMath('\\displaystyle \\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}', {
          moniBlockId: 'gaussian-integral',
          moniStreamType: 'math',
          moniLevel: 1,
        })
      })

      // 验证元素存在并具有正确属性
      const mathElement = page.locator('[data-type="block-math"]')
      await expect(mathElement).toBeVisible()
      await expect(mathElement).toHaveAttribute('data-moni-block-id', 'gaussian-integral')
      await expect(mathElement).toHaveAttribute('data-moni-stream-type', 'math')
      await expect(mathElement).toHaveAttribute('data-moni-level', '1')
    })

    test.skip('应该正确渲染复杂的块级数学公式', async ({ page }) => {
      // 插入矩阵公式
      await page.evaluate(() => {
        window.testEditor.insertBlockMath('\\begin{bmatrix} 1 & 2 & 3 \\\\ 4 & 5 & 6 \\\\ 7 & 8 & 9 \\end{bmatrix}', {
          moniBlockId: 'matrix-example',
        })
      })

      const mathElement = page.locator('[data-type="block-math"]')
      await expect(mathElement).toBeVisible()

      // 验证 KaTeX 渲染的矩阵结构
      const katexContent = mathElement.locator('.katex-display')
      await expect(katexContent).toBeVisible()

      // 验证矩阵括号
      const matrixDelimiters = mathElement.locator('.katex .delimsizing')
      await expect(matrixDelimiters).toHaveCount(2) // 左右括号
    })

    test.skip('应该支持多个块级数学公式', async ({ page }) => {
      // 插入多个块级公式
      await page.evaluate(() => {
        window.testEditor.insertBlockMath('e^{i\\pi} + 1 = 0', {
          moniBlockId: 'euler-identity',
        })
        window.testEditor.insertBlockMath('\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0}', {
          moniBlockId: 'gauss-law',
        })
        window.testEditor.insertBlockMath('F = ma', {
          moniBlockId: 'newton-second-law',
        })
      })

      // 验证所有公式都存在
      const mathElements = page.locator('[data-type="block-math"]')
      await expect(mathElements).toHaveCount(3)

      // 验证每个公式的唯一性
      await expect(page.locator('[data-moni-block-id="euler-identity"]')).toBeVisible()
      await expect(page.locator('[data-moni-block-id="gauss-law"]')).toBeVisible()
      await expect(page.locator('[data-moni-block-id="newton-second-law"]')).toBeVisible()
    })

    test.skip('应该正确处理数学公式错误', async ({ page }) => {
      // 插入有语法错误的公式
      await page.evaluate(() => {
        window.testEditor.insertBlockMath('\\invalid{syntax}}}', {
          moniBlockId: 'error-formula',
        })
      })

      const mathElement = page.locator('[data-moni-block-id="error-formula"]')
      await expect(mathElement).toBeVisible()

      // 验证错误处理 - 应该显示原始 LaTeX 文本
      await expect(mathElement).toHaveClass(/math-error/)
      await expect(mathElement).toContainText('\\invalid{syntax}}}')
    })
  })

  test.describe('🔄 Dynamic Updates', () => {
    test.skip('应该支持实时更新数学公式内容', async ({ page }) => {
      // 插入初始公式
      await page.evaluate(() => {
        return window.testEditor.insertBlockMath('f(x) = x^2', {
          moniBlockId: 'dynamic-formula',
        })
      })

      // 验证初始内容
      const mathElement = page.locator('[data-moni-block-id="dynamic-formula"]')
      await expect(mathElement).toHaveAttribute('data-latex', 'f(x) = x^2')

      // 更新公式
      await page.evaluate(() => {
        const formulaElement = document.querySelector('[data-moni-block-id="dynamic-formula"]')
        window.testEditor.updateMath(formulaElement, 'f(x) = x^3 + 2x^2 + x + 1')
      })

      // 验证更新后的内容
      await expect(mathElement).toHaveAttribute('data-latex', 'f(x) = x^3 + 2x^2 + x + 1')

      // 验证 KaTeX 重新渲染
      const katexContent = mathElement.locator('.katex')
      await expect(katexContent).toBeVisible()
    })

    test.skip('应该支持从简单公式更新为复杂公式', async ({ page }) => {
      // 插入简单公式
      await page.evaluate(() => {
        window.testEditor.insertInlineMath('x', {
          moniBlockId: 'evolving-formula',
        })
      })

      const mathElement = page.locator('[data-moni-block-id="evolving-formula"]')

      // 逐步更新为更复杂的公式
      const formulas = ['x^2', 'x^2 + y^2', 'x^2 + y^2 = r^2', '\\sqrt{x^2 + y^2} = r', '\\sqrt{x^2 + y^2 + z^2} = r']

      // Process formulas sequentially to avoid await-in-loop
      const updateFormula = async (formula: string) => {
        await page.evaluate(latex => {
          const element = document.querySelector('[data-moni-block-id="evolving-formula"]')
          window.testEditor.updateMath(element, latex)
        }, formula)

        await expect(mathElement).toHaveAttribute('data-latex', formula)
        await page.waitForTimeout(100) // 小延迟以观察变化
      }

      // Use reduce to avoid await-in-loop
      await formulas.reduce(async (promise, formula) => {
        await promise
        return updateFormula(formula)
      }, Promise.resolve())
    })
  })

  test.describe('🎯 Accessibility and Interaction', () => {
    test.skip('应该支持键盘导航', async ({ page }) => {
      // 插入多个数学公式
      await page.evaluate(() => {
        window.testEditor.insertInlineMath('\\alpha', { moniBlockId: 'alpha' })
        window.testEditor.insertInlineMath('\\beta', { moniBlockId: 'beta' })
        window.testEditor.insertInlineMath('\\gamma', { moniBlockId: 'gamma' })
      })

      // 使用 Tab 键导航
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')

      // 验证焦点移动（通过检查活跃元素）
      const activeElement = page.locator(':focus')
      await expect(activeElement).toBeVisible()
    })

    test.skip('应该支持点击交互', async ({ page }) => {
      // 插入可点击的数学公式
      await page.evaluate(() => {
        window.testEditor.insertBlockMath('\\sum_{n=1}^{\\infty} \\frac{1}{n^2}', {
          moniBlockId: 'clickable-formula',
        })

        // 添加点击事件监听
        document.addEventListener('click', e => {
          if (e.target.closest('[data-moni-block-id="clickable-formula"]')) {
            window.clickedFormula = true
          }
        })
      })

      const mathElement = page.locator('[data-moni-block-id="clickable-formula"]')

      // 点击数学公式
      await mathElement.click()

      // 验证点击事件触发
      const clicked = await page.evaluate(() => window.clickedFormula)
      expect(clicked).toBe(true)
    })
  })

  test.describe('🔗 Integration with Block Stream', () => {
    test.skip('应该在 Block Stream 操作中保持 moniBlockId', async ({ page }) => {
      // 插入数学公式
      await page.evaluate(() => {
        window.testEditor.insertBlockMath('\\nabla^2 \\phi = 0', {
          moniBlockId: 'laplace-equation',
          moniStreamType: 'math',
        })
      })

      const mathElement = page.locator('[data-moni-block-id="laplace-equation"]')

      // 模拟 Stream 操作（更新内容但保持 ID）
      await page.evaluate(() => {
        const element = document.querySelector('[data-moni-block-id="laplace-equation"]')
        // 模拟 AI Stream 更新
        window.testEditor.updateMath(element, '\\nabla^2 \\phi = 4\\pi G \\rho')
      })

      // 验证 moniBlockId 保持不变
      await expect(mathElement).toHaveAttribute('data-moni-block-id', 'laplace-equation')
      await expect(mathElement).toHaveAttribute('data-latex', '\\nabla^2 \\phi = 4\\pi G \\rho')
      await expect(mathElement).toHaveAttribute('data-moni-stream-type', 'math')
    })

    test.skip('应该支持嵌套层级的数学公式', async ({ page }) => {
      // 创建层级结构的数学公式
      await page.evaluate(() => {
        // 父级公式
        window.testEditor.insertBlockMath('\\text{Fundamental Theorem}', {
          moniBlockId: 'theorem-title',
          moniLevel: 0,
        })

        // 子级公式
        window.testEditor.insertBlockMath("\\int_a^b f'(x) dx = f(b) - f(a)", {
          moniBlockId: 'theorem-formula',
          moniLevel: 1,
        })

        // 更深层级的公式
        window.testEditor.insertInlineMath("f'(x)", {
          moniBlockId: 'derivative-notation',
          moniLevel: 2,
        })
      })

      // 验证层级关系
      const title = page.locator('[data-moni-block-id="theorem-title"]')
      const formula = page.locator('[data-moni-block-id="theorem-formula"]')
      const notation = page.locator('[data-moni-block-id="derivative-notation"]')

      await expect(title).toHaveAttribute('data-moni-level', '0')
      await expect(formula).toHaveAttribute('data-moni-level', '1')
      await expect(notation).toHaveAttribute('data-moni-level', '2')
    })
  })

  test.describe('🎨 Visual Rendering', () => {
    test.skip('应该正确应用样式和主题', async ({ page }) => {
      // 插入数学公式
      await page.evaluate(() => {
        window.testEditor.insertBlockMath('\\oint_{\\partial \\Omega} \\mathbf{F} \\cdot d\\mathbf{s}', {
          moniBlockId: 'styled-formula',
        })
      })

      const mathElement = page.locator('[data-moni-block-id="styled-formula"]')

      // 验证 CSS 类和样式
      await expect(mathElement).toHaveClass('math-formula-block')

      // 验证计算样式
      const styles = await mathElement.evaluate(el => {
        const computed = window.getComputedStyle(el)
        return {
          display: computed.display,
          margin: computed.marginTop,
          padding: computed.paddingTop,
          borderLeft: computed.borderLeftWidth,
        }
      })

      expect(styles.display).toBe('block')
      expect(parseInt(styles.margin, 10)).toBeGreaterThan(0)
      expect(parseInt(styles.padding, 10)).toBeGreaterThan(0)
      expect(parseInt(styles.borderLeft, 10)).toBeGreaterThan(0)
    })

    test.skip('应该在不同屏幕尺寸下正确显示', async ({ page }) => {
      // 插入复杂的数学公式
      await page.evaluate(() => {
        window.testEditor.insertBlockMath(
          '\\begin{pmatrix} \\cos\\theta & -\\sin\\theta \\\\ \\sin\\theta & \\cos\\theta \\end{pmatrix} \\begin{pmatrix} x \\\\ y \\end{pmatrix} = \\begin{pmatrix} x\\cos\\theta - y\\sin\\theta \\\\ x\\sin\\theta + y\\cos\\theta \\end{pmatrix}',
          { moniBlockId: 'rotation-matrix' },
        )
      })

      const mathElement = page.locator('[data-moni-block-id="rotation-matrix"]')

      // 测试不同屏幕尺寸
      const viewports = [
        { width: 1920, height: 1080 }, // 桌面
        { width: 1024, height: 768 }, // 平板
        { width: 375, height: 667 }, // 手机
      ]

      // Process viewports sequentially to avoid await-in-loop
      const testViewport = async (viewport: { width: number; height: number }) => {
        await page.setViewportSize(viewport)
        await expect(mathElement).toBeVisible()

        // 验证公式不会溢出
        const boundingBox = await mathElement.boundingBox()
        expect(boundingBox?.width).toBeLessThanOrEqual(viewport.width)
      }

      // Use reduce to avoid await-in-loop
      await viewports.reduce(async (promise, viewport) => {
        await promise
        return testViewport(viewport)
      }, Promise.resolve())
    })
  })

  test.describe('🚀 Performance', () => {
    test.skip('应该快速渲染大量数学公式', async ({ page }) => {
      const startTime = Date.now()

      // 插入大量数学公式
      await page.evaluate(() => {
        const formulas = [
          'E = mc^2',
          '\\pi r^2',
          '\\sum_{i=1}^{n} x_i',
          '\\int_0^1 f(x) dx',
          '\\frac{\\partial f}{\\partial x}',
          '\\sqrt{a^2 + b^2}',
          '\\lim_{x \\to \\infty} f(x)',
          '\\nabla \\cdot \\mathbf{F}',
          '\\alpha + \\beta + \\gamma',
          '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',
        ]

        for (let i = 0; i < formulas.length; i += 1) {
          const formula = formulas[i]
          window.testEditor.insertBlockMath(formula, {
            moniBlockId: `perf-formula-${i}`,
          })
        }
      })

      const endTime = Date.now()

      // 验证所有公式都渲染完成
      const mathElements = page.locator('[data-type="block-math"]')
      await expect(mathElements).toHaveCount(10)

      // 验证渲染时间合理
      const renderTime = endTime - startTime
      expect(renderTime).toBeLessThan(5000) // 应该在 5 秒内完成
    })

    test.skip('应该支持延迟加载和懒渲染', async ({ page }) => {
      // 创建长页面以测试懒加载
      await page.evaluate(() => {
        // 添加一些填充内容
        for (let i = 0; i < 10; i += 1) {
          const spacer = document.createElement('div')
          spacer.style.height = '200px'
          spacer.textContent = `Spacer ${i + 1}`
          window.testEditor.element.appendChild(spacer)
        }

        // 在底部添加数学公式
        window.testEditor.insertBlockMath('\\sum_{n=0}^{\\infty} \\frac{x^n}{n!} = e^x', {
          moniBlockId: 'lazy-formula',
        })
      })

      // 滚动到底部
      await page.evaluate(() => {
        document.querySelector('[data-moni-block-id="lazy-formula"]').scrollIntoView()
      })

      // 验证公式正确显示
      const mathElement = page.locator('[data-moni-block-id="lazy-formula"]')
      await expect(mathElement).toBeVisible()
      await expect(mathElement.locator('.katex')).toBeVisible()
    })
  })
})
