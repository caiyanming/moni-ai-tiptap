/**
 * useMultiBlockSelection Hook E2E 集成测试
 *
 * 通过真实的 TipTap 编辑器和 DOM 环境测试多块选择功能
 * 避免复杂的 mock 策略，直接测试端到端行为
 */

import { expect,test } from '@playwright/test'

test.describe('useMultiBlockSelection E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // 设置测试页面
    await page.goto('/react/multi-block-selection/')
    await page.waitForLoadState('networkidle')

    // 等待编辑器初始化完成
    await page.waitForSelector('.tiptap-editor', { timeout: 5000 })
  })

  test.describe('基础块选择功能', () => {
    test('应该能够选择单个块', async ({ page }) => {
      // 创建一些测试内容
      await page.click('.tiptap-editor')
      await page.type('.tiptap-editor', 'First paragraph')
      await page.press('.tiptap-editor', 'Enter')
      await page.type('.tiptap-editor', 'Second paragraph')

      // 选择第一个段落块
      const firstBlock = page.locator('.tiptap-editor p').first()
      await firstBlock.click({ modifiers: ['Control'] }) // Ctrl+Click 选择块

      // 验证块被选中
      await expect(firstBlock).toHaveClass(/tiptap-multi-block-selected/)
      await expect(firstBlock).toHaveAttribute('data-multi-block-selected', 'true')

      // 验证选择状态显示
      await expect(page.locator('[data-testid="selection-count"]')).toHaveText('1')
      await expect(page.locator('[data-testid="has-selection"]')).toHaveText('true')
    })

    test('应该能够选择多个块', async ({ page }) => {
      // 创建多个段落
      await page.click('.tiptap-editor')
      await page.type('.tiptap-editor', 'First paragraph')
      await page.press('.tiptap-editor', 'Enter')
      await page.type('.tiptap-editor', 'Second paragraph')
      await page.press('.tiptap-editor', 'Enter')
      await page.type('.tiptap-editor', 'Third paragraph')

      // 选择多个块
      const firstBlock = page.locator('.tiptap-editor p').nth(0)
      const secondBlock = page.locator('.tiptap-editor p').nth(1)

      await firstBlock.click({ modifiers: ['Control'] })
      await secondBlock.click({ modifiers: ['Control'] })

      // 验证两个块都被选中
      await expect(firstBlock).toHaveClass(/tiptap-multi-block-selected/)
      await expect(secondBlock).toHaveClass(/tiptap-multi-block-selected/)

      // 验证选择计数
      await expect(page.locator('[data-testid="selection-count"]')).toHaveText('2')
      await expect(page.locator('[data-testid="has-selection"]')).toHaveText('true')
    })

    test('应该能够切换块的选择状态', async ({ page }) => {
      // 创建测试内容
      await page.click('.tiptap-editor')
      await page.type('.tiptap-editor', 'Test paragraph')

      const block = page.locator('.tiptap-editor p').first()

      // 选择块
      await block.click({ modifiers: ['Control'] })
      await expect(block).toHaveClass(/tiptap-multi-block-selected/)
      await expect(page.locator('[data-testid="has-selection"]')).toHaveText('true')

      // 再次点击取消选择
      await block.click({ modifiers: ['Control'] })
      await expect(block).not.toHaveClass(/tiptap-multi-block-selected/)
      await expect(page.locator('[data-testid="has-selection"]')).toHaveText('false')
    })

    test('应该能够清除所有选择', async ({ page }) => {
      // 创建并选择多个块
      await page.click('.tiptap-editor')
      await page.type('.tiptap-editor', 'First paragraph')
      await page.press('.tiptap-editor', 'Enter')
      await page.type('.tiptap-editor', 'Second paragraph')

      await page
        .locator('.tiptap-editor p')
        .nth(0)
        .click({ modifiers: ['Control'] })
      await page
        .locator('.tiptap-editor p')
        .nth(1)
        .click({ modifiers: ['Control'] })

      // 验证有选择
      await expect(page.locator('[data-testid="selection-count"]')).toHaveText('2')

      // 点击清除按钮
      await page.click('[data-testid="clear-selection"]')

      // 验证选择被清除
      await expect(page.locator('[data-testid="selection-count"]')).toHaveText('0')
      await expect(page.locator('[data-testid="has-selection"]')).toHaveText('false')
      await expect(page.locator('.tiptap-multi-block-selected')).toHaveCount(0)
    })
  })

  test.describe('格式化操作', () => {
    test('应该能够对选中的块应用格式', async ({ page }) => {
      // 创建测试内容
      await page.click('.tiptap-editor')
      await page.type('.tiptap-editor', 'Test paragraph')

      // 选择块
      const block = page.locator('.tiptap-editor p').first()
      await block.click({ modifiers: ['Control'] })

      // 应用粗体格式
      await page.click('[data-testid="format-bold"]')

      // 验证格式应用
      await expect(block).toHaveCSS('font-weight', '700') // 或其他粗体样式检查
    })

    test('应该能够对多个选中块应用格式', async ({ page }) => {
      // 创建多个段落
      await page.click('.tiptap-editor')
      await page.type('.tiptap-editor', 'First paragraph')
      await page.press('.tiptap-editor', 'Enter')
      await page.type('.tiptap-editor', 'Second paragraph')

      // 选择两个块
      const firstBlock = page.locator('.tiptap-editor p').nth(0)
      const secondBlock = page.locator('.tiptap-editor p').nth(1)

      await firstBlock.click({ modifiers: ['Control'] })
      await secondBlock.click({ modifiers: ['Control'] })

      // 应用标题格式
      await page.click('[data-testid="format-heading"]')

      // 验证两个块都变成了标题
      await expect(page.locator('.tiptap-editor h1, .tiptap-editor h2, .tiptap-editor h3')).toHaveCount(2)
    })
  })

  test.describe('删除操作', () => {
    test('应该能够删除选中的块', async ({ page }) => {
      // 创建测试内容
      await page.click('.tiptap-editor')
      await page.type('.tiptap-editor', 'To be deleted')
      await page.press('.tiptap-editor', 'Enter')
      await page.type('.tiptap-editor', 'To remain')

      // 选择第一个段落
      const firstBlock = page.locator('.tiptap-editor p').first()
      await firstBlock.click({ modifiers: ['Control'] })

      // 删除选中的块
      await page.click('[data-testid="delete-selected"]')

      // 验证块被删除
      await expect(page.locator('.tiptap-editor p')).toHaveCount(1)
      await expect(page.locator('.tiptap-editor p')).toHaveText('To remain')
    })

    test('应该能够删除多个选中的块', async ({ page }) => {
      // 创建多个段落
      await page.click('.tiptap-editor')
      await page.type('.tiptap-editor', 'Delete me 1')
      await page.press('.tiptap-editor', 'Enter')
      await page.type('.tiptap-editor', 'Keep me')
      await page.press('.tiptap-editor', 'Enter')
      await page.type('.tiptap-editor', 'Delete me 2')

      // 选择第一个和第三个段落
      await page
        .locator('.tiptap-editor p')
        .nth(0)
        .click({ modifiers: ['Control'] })
      await page
        .locator('.tiptap-editor p')
        .nth(2)
        .click({ modifiers: ['Control'] })

      // 删除选中的块
      await page.click('[data-testid="delete-selected"]')

      // 验证只剩下中间的段落
      await expect(page.locator('.tiptap-editor p')).toHaveCount(1)
      await expect(page.locator('.tiptap-editor p')).toHaveText('Keep me')
    })
  })

  test.describe('键盘快捷键', () => {
    test('应该支持 Escape 清除选择', async ({ page }) => {
      // 创建并选择块
      await page.click('.tiptap-editor')
      await page.type('.tiptap-editor', 'Test paragraph')

      const block = page.locator('.tiptap-editor p').first()
      await block.click({ modifiers: ['Control'] })
      await expect(page.locator('[data-testid="has-selection"]')).toHaveText('true')

      // 按 Escape 清除选择
      await page.press('.tiptap-editor', 'Escape')

      // 验证选择被清除
      await expect(page.locator('[data-testid="has-selection"]')).toHaveText('false')
    })

    test('应该支持 Delete 键删除选中块', async ({ page }) => {
      // 创建测试内容
      await page.click('.tiptap-editor')
      await page.type('.tiptap-editor', 'Delete with key')

      // 选择块
      const block = page.locator('.tiptap-editor p').first()
      await block.click({ modifiers: ['Control'] })

      // 按 Delete 键
      await page.press('.tiptap-editor', 'Delete')

      // 验证块被删除
      await expect(page.locator('.tiptap-editor p')).toHaveCount(0)
    })
  })

  test.describe('同构选择检测', () => {
    test('应该正确检测同构选择', async ({ page }) => {
      // 创建相同类型的块
      await page.click('.tiptap-editor')
      await page.type('.tiptap-editor', 'First paragraph')
      await page.press('.tiptap-editor', 'Enter')
      await page.type('.tiptap-editor', 'Second paragraph')

      // 选择两个段落
      await page
        .locator('.tiptap-editor p')
        .nth(0)
        .click({ modifiers: ['Control'] })
      await page
        .locator('.tiptap-editor p')
        .nth(1)
        .click({ modifiers: ['Control'] })

      // 验证同构选择状态
      await expect(page.locator('[data-testid="is-homogeneous"]')).toHaveText('true')
      await expect(page.locator('[data-testid="primary-block-type"]')).toHaveText('paragraph')
    })

    test('应该正确检测异构选择', async ({ page }) => {
      // 创建不同类型的块
      await page.click('.tiptap-editor')
      await page.type('.tiptap-editor', 'Paragraph')
      await page.press('.tiptap-editor', 'Enter')

      // 创建标题
      await page.press('.tiptap-editor', 'Control+1') // 假设这是创建 H1 的快捷键
      await page.type('.tiptap-editor', 'Heading')

      // 选择段落和标题
      await page.locator('.tiptap-editor p').click({ modifiers: ['Control'] })
      await page.locator('.tiptap-editor h1').click({ modifiers: ['Control'] })

      // 验证异构选择状态
      await expect(page.locator('[data-testid="is-homogeneous"]')).toHaveText('false')
      await expect(page.locator('[data-testid="primary-block-type"]')).toHaveText('null')
    })
  })

  test.describe('回调功能', () => {
    test('应该在选择变化时触发回调', async ({ page }) => {
      // 监听回调事件
      await page.evaluate(() => {
        window.selectionChangeEvents = []
        window.addEventListener('multiBlockSelectionChange', e => {
          window.selectionChangeEvents.push(e.detail)
        })
      })

      // 选择块
      await page.click('.tiptap-editor')
      await page.type('.tiptap-editor', 'Test paragraph')
      await page
        .locator('.tiptap-editor p')
        .first()
        .click({ modifiers: ['Control'] })

      // 验证回调被触发
      const events = await page.evaluate(() => window.selectionChangeEvents)
      expect(events.length).toBeGreaterThan(0)
      expect(events[events.length - 1].selectedBlocks).toHaveLength(1)
    })
  })

  test.describe('样式管理', () => {
    test('应该为选中的块添加正确的样式类', async ({ page }) => {
      // 创建测试内容
      await page.click('.tiptap-editor')
      await page.type('.tiptap-editor', 'Styled paragraph')

      // 选择块
      const block = page.locator('.tiptap-editor p').first()
      await block.click({ modifiers: ['Control'] })

      // 验证样式类被添加
      await expect(block).toHaveClass(/tiptap-multi-block-selected/)
      await expect(block).toHaveAttribute('data-multi-block-selected', 'true')
    })

    test('应该在取消选择时移除样式类', async ({ page }) => {
      // 创建并选择块
      await page.click('.tiptap-editor')
      await page.type('.tiptap-editor', 'Styled paragraph')

      const block = page.locator('.tiptap-editor p').first()
      await block.click({ modifiers: ['Control'] })
      await expect(block).toHaveClass(/tiptap-multi-block-selected/)

      // 取消选择
      await block.click({ modifiers: ['Control'] })

      // 验证样式类被移除
      await expect(block).not.toHaveClass(/tiptap-multi-block-selected/)
      await expect(block).not.toHaveAttribute('data-multi-block-selected')
    })
  })

  test.describe('最大选择数量限制', () => {
    test('应该遵守最大选择数量限制', async ({ page }) => {
      // 假设最大选择数量是 3
      await page.click('.tiptap-editor')

      // 创建 5 个段落
      for (let i = 1; i <= 5; i++) {
        await page.type('.tiptap-editor', `Paragraph ${i}`)
        if (i < 5) {await page.press('.tiptap-editor', 'Enter')}
      }

      // 尝试选择所有 5 个段落
      for (let i = 0; i < 5; i++) {
        await page
          .locator('.tiptap-editor p')
          .nth(i)
          .click({ modifiers: ['Control'] })
      }

      // 验证只有前 3 个被选中（假设限制是 3）
      const maxCount = await page.locator('[data-testid="max-selection-count"]').textContent()
      const actualCount = await page.locator('[data-testid="selection-count"]').textContent()

      expect(parseInt(actualCount)).toBeLessThanOrEqual(parseInt(maxCount))
    })
  })
})
