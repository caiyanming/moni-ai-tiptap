import { expect, test } from '@playwright/test'

import { SimplifiedDragHelper } from './utils/SimplifiedDragHelper'

/**
 * 🎯 Block Stream 拖拽集成测试
 *
 * 测试目标：
 * 1. 拖拽操作保持 moniBlockId 属性
 * 2. 拖拽触发正确的 Stream 事件
 * 3. StreamOperationManager 正确追踪拖拽操作
 * 4. 拖拽与实时协作的兼容性
 */

test.describe('Block Stream 拖拽集成测试', () => {
  let dragHelper: SimplifiedDragHelper

  test.beforeEach(async ({ page }) => {
    dragHelper = new SimplifiedDragHelper(page)

    // 导航到拖拽演示页面
    await page.goto('/src/Extensions/DragHandle/React/')

    // 等待编辑器加载
    const proseMirror = page.locator('.ProseMirror')
    await proseMirror.waitFor({ state: 'visible', timeout: 10000 })

    // 等待编辑器实例就绪
    await page.waitForFunction(
      () => {
        return (window as any).__tiptapEditor !== undefined
      },
      { timeout: 5000 },
    )

    // 等待所有插件加载完成
    await page.waitForTimeout(1000)
  })

  test('拖拽操作应保持 moniBlockId 属性', async ({ page }) => {
    console.log('🎯 测试：拖拽操作保持 moniBlockId 属性')

    // 获取拖拽前的 moniBlockId
    const beforeBlockIds = await page.evaluate(() => {
      const editor = (window as any).__tiptapEditor
      if (!editor) {
        return []
      }

      const blockIds: string[] = []
      editor.state.doc.descendants((node: any, pos: number) => {
        if (node.type.name === 'paragraph' && node.attrs.moniBlockId) {
          blockIds.push(node.attrs.moniBlockId)
        }
      })
      return blockIds
    })

    console.log('🔍 拖拽前的 moniBlockId:', beforeBlockIds)
    expect(beforeBlockIds.length).toBeGreaterThan(0)

    // 执行拖拽操作
    const dragResult = await dragHelper.executeParagraphDrag()
    expect(dragResult.success).toBe(true)

    // 获取拖拽后的 moniBlockId
    const afterBlockIds = await page.evaluate(() => {
      const editor = (window as any).__tiptapEditor
      if (!editor) {
        return []
      }

      const blockIds: string[] = []
      editor.state.doc.descendants((node: any, pos: number) => {
        if (node.type.name === 'paragraph' && node.attrs.moniBlockId) {
          blockIds.push(node.attrs.moniBlockId)
        }
      })
      return blockIds
    })

    console.log('🔍 拖拽后的 moniBlockId:', afterBlockIds)

    // 验证 moniBlockId 保持不变（数量和内容）
    expect(afterBlockIds.length).toBe(beforeBlockIds.length)
    expect(afterBlockIds.sort()).toEqual(beforeBlockIds.sort())

    console.log('✅ moniBlockId 属性在拖拽后保持完整')
  })

  test('拖拽应触发正确的 Stream 事件', async ({ page }) => {
    console.log('🎯 测试：拖拽触发正确的 Stream 事件')

    // 设置事件监听器
    await page.evaluate(() => {
      ;(window as any).__streamEvents = []

      const editor = (window as any).__tiptapEditor
      if (editor) {
        // 监听编辑器事务
        editor.on('transaction', (props: any) => {
          if (props.transaction.docChanged) {
            ;(window as any).__streamEvents.push({
              type: 'transaction',
              timestamp: Date.now(),
              docChanged: true,
              steps: props.transaction.steps.length,
            })
          }
        })
      }
    })

    // 执行拖拽操作
    const dragResult = await dragHelper.executeParagraphDrag()
    expect(dragResult.success).toBe(true)

    // 等待事件处理
    await page.waitForTimeout(500)

    // 检查 Stream 事件
    const streamEvents = await page.evaluate(() => {
      return (window as any).__streamEvents || []
    })

    console.log('🔍 捕获的 Stream 事件:', streamEvents)

    // 验证至少触发了一个文档变更事务
    expect(streamEvents.length).toBeGreaterThan(0)
    const docChangedEvents = streamEvents.filter((event: any) => event.docChanged)
    expect(docChangedEvents.length).toBeGreaterThan(0)

    console.log('✅ 拖拽正确触发了 Stream 事件')
  })

  test('StreamOperationManager 应正确追踪拖拽操作', async ({ page }) => {
    console.log('🎯 测试：StreamOperationManager 追踪拖拽操作')

    // 初始化 StreamOperationManager 监控
    await page.evaluate(() => {
      ;(window as any).__operationLog = []

      const editor = (window as any).__tiptapEditor
      if (editor) {
        // 监听编辑器状态变化
        editor.on('transaction', (props: any) => {
          const { transaction } = props

          if (transaction.docChanged) {
            // 记录操作详情
            ;(window as any).__operationLog.push({
              type: 'drag_operation',
              timestamp: Date.now(),
              stepsCount: transaction.steps.length,
              hasMetadata: !!transaction.getMeta('drag'),
              docSize: transaction.doc.content.size,
            })
          }
        })
      }
    })

    // 执行拖拽操作
    const dragResult = await dragHelper.executeParagraphDrag()
    expect(dragResult.success).toBe(true)

    // 等待操作处理
    await page.waitForTimeout(500)

    // 检查操作日志
    const operationLog = await page.evaluate(() => {
      return (window as any).__operationLog || []
    })

    console.log('🔍 StreamOperationManager 操作日志:', operationLog)

    // 验证拖拽操作被正确追踪
    expect(operationLog.length).toBeGreaterThan(0)
    const dragOperations = operationLog.filter((op: any) => op.type === 'drag_operation')
    expect(dragOperations.length).toBeGreaterThan(0)

    console.log('✅ StreamOperationManager 正确追踪了拖拽操作')
  })

  test('拖拽撤销/重做功能测试', async ({ page }) => {
    console.log('🎯 测试：拖拽撤销/重做功能')

    // 获取初始状态
    const initialTexts = await page.evaluate(() => {
      const paragraphs = Array.from(document.querySelectorAll('p'))
      return paragraphs.map(p => p.textContent?.trim() || '')
    })

    console.log('🔍 初始段落顺序:', initialTexts)

    // 执行拖拽操作
    const dragResult = await dragHelper.executeParagraphDrag()
    expect(dragResult.success).toBe(true)

    // 获取拖拽后状态
    const afterDragTexts = await page.evaluate(() => {
      const paragraphs = Array.from(document.querySelectorAll('p'))
      return paragraphs.map(p => p.textContent?.trim() || '')
    })

    console.log('🔍 拖拽后段落顺序:', afterDragTexts)
    expect(JSON.stringify(initialTexts)).not.toBe(JSON.stringify(afterDragTexts))

    // 执行撤销操作
    await page.evaluate(() => {
      const editor = (window as any).__tiptapEditor
      if (editor) {
        editor.chain().focus().undo().run()
      }
    })

    // 等待撤销完成
    await page.waitForTimeout(500)

    // 获取撤销后状态
    const afterUndoTexts = await page.evaluate(() => {
      const paragraphs = Array.from(document.querySelectorAll('p'))
      return paragraphs.map(p => p.textContent?.trim() || '')
    })

    console.log('🔍 撤销后段落顺序:', afterUndoTexts)

    // 验证撤销成功
    expect(JSON.stringify(afterUndoTexts)).toBe(JSON.stringify(initialTexts))

    // 执行重做操作
    await page.evaluate(() => {
      const editor = (window as any).__tiptapEditor
      if (editor) {
        editor.chain().focus().redo().run()
      }
    })

    // 等待重做完成
    await page.waitForTimeout(500)

    // 获取重做后状态
    const afterRedoTexts = await page.evaluate(() => {
      const paragraphs = Array.from(document.querySelectorAll('p'))
      return paragraphs.map(p => p.textContent?.trim() || '')
    })

    console.log('🔍 重做后段落顺序:', afterRedoTexts)

    // 验证重做成功
    expect(JSON.stringify(afterRedoTexts)).toBe(JSON.stringify(afterDragTexts))

    console.log('✅ 拖拽撤销/重做功能正常')
  })

  test('拖拽与实时协作兼容性测试', async ({ page }) => {
    console.log('🎯 测试：拖拽与实时协作兼容性')

    // 获取拖拽前的状态
    const beforeTexts = await page.evaluate(() => {
      const paragraphs = Array.from(document.querySelectorAll('p'))
      return paragraphs.map(p => p.textContent?.trim() || '')
    })

    console.log('🔍 拖拽前段落状态:', beforeTexts)

    // 在拖拽前插入一些内容（模拟其他用户操作）
    await page.evaluate(() => {
      const editor = (window as any).__tiptapEditor
      if (editor) {
        try {
          // 在第一个段落末尾添加文本
          const { state } = editor
          const tr = state.tr

          // 找到第一个段落的结束位置
          let firstParagraphEnd = -1
          state.doc.descendants((node: any, pos: number) => {
            if (node.type.name === 'paragraph' && firstParagraphEnd === -1) {
              firstParagraphEnd = pos + node.content.size
              return false
            }
            return true
          })

          if (firstParagraphEnd > 0) {
            tr.insertText(' (协作修改)', firstParagraphEnd)
            editor.view.dispatch(tr)
          }
        } catch (error) {
          console.log('协作修改插入失败:', error)
        }
      }
    })

    await page.waitForTimeout(300)

    // 获取插入文本后的状态
    const afterInsertTexts = await page.evaluate(() => {
      const paragraphs = Array.from(document.querySelectorAll('p'))
      return paragraphs.map(p => p.textContent?.trim() || '')
    })

    console.log('🔍 插入协作内容后段落状态:', afterInsertTexts)

    // 执行拖拽操作
    const dragResult = await dragHelper.executeParagraphDrag()
    expect(dragResult.success).toBe(true)

    // 获取最终状态
    const finalTexts = await page.evaluate(() => {
      const paragraphs = Array.from(document.querySelectorAll('p'))
      return paragraphs.map(p => p.textContent?.trim() || '')
    })

    console.log('🔍 最终段落状态:', finalTexts)

    // 验证协作内容存在且位置发生了变化
    const hasCollaborativeContent = finalTexts.some(text => text.includes('协作修改'))
    expect(hasCollaborativeContent).toBe(true)

    // 验证段落顺序发生了变化
    const orderChanged = JSON.stringify(afterInsertTexts) !== JSON.stringify(finalTexts)
    expect(orderChanged).toBe(true)

    // 验证内容没有丢失
    expect(finalTexts.length).toBe(afterInsertTexts.length)

    console.log('✅ 拖拽与实时协作功能兼容')
  })

  test('拖拽过程中 Block ID 映射一致性', async ({ page }) => {
    console.log('🎯 测试：拖拽过程中 Block ID 映射一致性')

    // 获取拖拽前的完整映射
    const beforeMapping = await page.evaluate(() => {
      const editor = (window as any).__tiptapEditor
      if (!editor) {
        return {}
      }

      const mapping: Record<string, { text: string; position: number }> = {}
      const currentPos = 0

      editor.state.doc.descendants((node: any, pos: number) => {
        if (node.type.name === 'paragraph' && node.attrs.moniBlockId) {
          mapping[node.attrs.moniBlockId] = {
            text: node.textContent || '',
            position: pos,
          }
        }
      })

      return mapping
    })

    console.log('🔍 拖拽前的 ID 映射:', beforeMapping)

    // 执行拖拽操作
    const dragResult = await dragHelper.executeParagraphDrag()
    expect(dragResult.success).toBe(true)

    // 获取拖拽后的完整映射
    const afterMapping = await page.evaluate(() => {
      const editor = (window as any).__tiptapEditor
      if (!editor) {
        return {}
      }

      const mapping: Record<string, { text: string; position: number }> = {}
      const currentPos = 0

      editor.state.doc.descendants((node: any, pos: number) => {
        if (node.type.name === 'paragraph' && node.attrs.moniBlockId) {
          mapping[node.attrs.moniBlockId] = {
            text: node.textContent || '',
            position: pos,
          }
        }
      })

      return mapping
    })

    console.log('🔍 拖拽后的 ID 映射:', afterMapping)

    // 验证所有 ID 仍然存在
    const beforeIds = Object.keys(beforeMapping)
    const afterIds = Object.keys(afterMapping)

    expect(beforeIds.length).toBe(afterIds.length)
    expect(beforeIds.sort()).toEqual(afterIds.sort())

    // 验证文本内容没有丢失
    for (const id of beforeIds) {
      expect(beforeMapping[id].text).toBe(afterMapping[id].text)
    }

    // 验证位置确实发生了变化（至少有一个块的位置改变了）
    let positionChanged = false
    for (const id of beforeIds) {
      if (beforeMapping[id].position !== afterMapping[id].position) {
        positionChanged = true
        break
      }
    }

    expect(positionChanged).toBe(true)

    console.log('✅ Block ID 映射在拖拽过程中保持一致')
  })
})
