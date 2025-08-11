import { expect, test } from '@playwright/test'

/**
 * 🎯 最简单的编辑器拖拽测试
 * 直接使用编辑器API来验证拖拽功能是否工作
 */
test.describe('简单编辑器拖拽测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/Extensions/DragHandle/React/')
    await page.waitForSelector('.ProseMirror', { state: 'visible' })
    
    // 等待编辑器实例就绪
    await page.waitForFunction(() => {
      return (window as any).__tiptapEditor !== undefined
    }, { timeout: 5000 })
    
    await page.waitForTimeout(1000)
  })

  test('直接使用编辑器API移动段落', async ({ page }) => {
    console.log('🎯 [SIMPLE] 开始直接编辑器API测试')

    // 获取拖拽前的段落内容
    const beforeTexts = await page.evaluate(() => {
      const paragraphs = Array.from(document.querySelectorAll('p'))
      return paragraphs.map(p => p.textContent?.trim() || '')
    })

    console.log('🔍 [SIMPLE] 拖拽前段落:', beforeTexts)

    // 使用编辑器API直接移动段落
    const moveResult = await page.evaluate(() => {
      const editor = (window as any).__tiptapEditor
      if (!editor) {
        console.log('❌ [SIMPLE] 编辑器实例不存在')
        return false
      }

      console.log('✅ [SIMPLE] 编辑器实例存在:', {
        hasView: !!editor.view,
        hasState: !!editor.view?.state,
        hasDoc: !!editor.view?.state?.doc,
        isEditable: editor.isEditable
      })

      try {
        const { view } = editor
        const { state } = view
        const { doc, tr } = state

        // 找到第一个和第二个段落
        let firstParagraphPos = -1, secondParagraphPos = -1
        let firstParagraphNode = null

        doc.descendants((node, pos) => {
          if (node.type.name === 'paragraph') {
            if (firstParagraphPos === -1) {
              firstParagraphPos = pos
              firstParagraphNode = node
            } else if (secondParagraphPos === -1) {
              secondParagraphPos = pos
              return false // 停止遍历
            }
          }
          return true
        })

        if (firstParagraphPos === -1 || secondParagraphPos === -1 || !firstParagraphNode) {
          console.log('❌ [SIMPLE] 无法找到段落位置')
          return false
        }

        console.log('🔍 [SIMPLE] 段落位置:', {
          firstPos: firstParagraphPos,
          secondPos: secondParagraphPos,
          firstText: firstParagraphNode.textContent?.slice(0, 30)
        })

        // 计算节点大小和目标位置
        const firstNodeSize = firstParagraphNode.nodeSize
        const secondNodeEnd = secondParagraphPos + doc.nodeAt(secondParagraphPos).nodeSize

        // 创建移动事务：将第一个段落移动到第二个段落之后
        let newTr = tr
        
        // 1. 删除第一个段落
        newTr = newTr.delete(firstParagraphPos, firstParagraphPos + firstNodeSize)
        
        // 2. 在第二个段落后插入（调整位置因为已经删除了第一个段落）
        const adjustedInsertPos = secondNodeEnd - firstNodeSize
        newTr = newTr.insert(adjustedInsertPos, firstParagraphNode)
        
        // 3. 应用事务
        view.dispatch(newTr)
        
        console.log('✅ [SIMPLE] 段落移动事务已执行')
        return true

      } catch (error) {
        console.error('❌ [SIMPLE] 段落移动失败:', error)
        return false
      }
    })

    console.log('📊 [SIMPLE] 移动操作结果:', moveResult)

    // 等待DOM更新
    await page.waitForTimeout(500)

    // 获取拖拽后的段落内容
    const afterTexts = await page.evaluate(() => {
      const paragraphs = Array.from(document.querySelectorAll('p'))
      return paragraphs.map(p => p.textContent?.trim() || '')
    })

    console.log('🔍 [SIMPLE] 拖拽后段落:', afterTexts)

    // 验证结果
    expect(moveResult).toBe(true)
    expect(beforeTexts).not.toEqual(afterTexts)
    expect(beforeTexts.length).toBe(afterTexts.length)

    // 验证第一个段落确实移动到了第二个位置
    expect(afterTexts[1]).toBe(beforeTexts[0])
    expect(afterTexts[0]).toBe(beforeTexts[1])

    console.log('✅ [SIMPLE] 测试通过：段落成功交换位置')
  })

  test('验证拖拽手柄可见性', async ({ page }) => {
    console.log('🎯 [SIMPLE] 验证拖拽手柄可见性')

    // 移动到第一个段落上
    await page.locator('p').first().hover()
    await page.waitForTimeout(500)

    // 检查SVG拖拽手柄是否出现
    const svgHandle = page.locator('svg[draggable="true"]')
    await expect(svgHandle).toBeVisible()

    const handleBox = await svgHandle.boundingBox()
    expect(handleBox).not.toBeNull()
    expect(handleBox?.width).toBeGreaterThan(0)
    expect(handleBox?.height).toBeGreaterThan(0)

    console.log('✅ [SIMPLE] 拖拽手柄可见性验证通过')
  })
})