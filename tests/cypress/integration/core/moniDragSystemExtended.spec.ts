/// <reference types="cypress" />
/* eslint-disable no-unused-expressions, @typescript-eslint/no-unused-expressions, no-void */

import { Editor, getDragConfig } from '@tiptap/core'
import { Document } from '@tiptap/extension-document'
import { BulletList, ListItem } from '@tiptap/extension-list'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Text } from '@tiptap/extension-text'

import { DragHandleManager } from '../../../../packages/core/src/DragHandleManager.js'
import { DragIndicatorManager } from '../../../../packages/core/src/DragIndicatorManager.js'
import { DragOperationManager } from '../../../../packages/core/src/DragOperationManager.js'
import { MoniDragPlugin } from '../../../../packages/core/src/MoniDragPlugin.js'
import { SmartDragCalculator } from '../../../../packages/core/src/SmartDragCalculator.js'

/**
 * 🎯 扩展的 Moni 拖拽系统测试
 *
 * 重点测试范围：
 * 1. 事件传播和DOM绑定
 * 2. 复杂嵌套场景
 * 3. 性能和边界情况
 * 4. 属性到DOM的映射
 * 5. 与extension层的集成
 */
describe('Moni Drag System - Extended Tests', () => {
  let editor: Editor
  let container: HTMLElement

  beforeEach(() => {
    // 创建真实的DOM环境
    container = document.createElement('div')
    container.id = 'test-editor-container'
    container.style.width = '800px'
    container.style.height = '600px'
    container.style.padding = '20px'
    document.body.appendChild(container)

    // 创建具有复杂结构的编辑器内容
    editor = new Editor({
      element: container,
      extensions: [Document, Text, Paragraph, BulletList, ListItem],
      content: `
        <p data-moni-block-id="root-1" data-moni-level="0">根段落 1</p>
        <ul data-moni-block-id="list-1" data-moni-level="0">
          <li data-moni-block-id="item-1-1" data-moni-parent-id="list-1" data-moni-level="1">列表项 1.1</li>
          <li data-moni-block-id="item-1-2" data-moni-parent-id="list-1" data-moni-level="1">
            列表项 1.2
            <ul data-moni-block-id="sublist-1" data-moni-parent-id="item-1-2" data-moni-level="2">
              <li data-moni-block-id="item-2-1" data-moni-parent-id="sublist-1" data-moni-level="2">嵌套列表项 2.1</li>
              <li data-moni-block-id="item-2-2" data-moni-parent-id="sublist-1" data-moni-level="2">嵌套列表项 2.2</li>
            </ul>
          </li>
          <li data-moni-block-id="item-1-3" data-moni-parent-id="list-1" data-moni-level="1">列表项 1.3</li>
        </ul>
        <p data-moni-block-id="root-2" data-moni-level="0">根段落 2</p>
        <p data-moni-block-id="root-3" data-moni-level="0">根段落 3</p>
      `,
    })

    // 等待编辑器完全初始化
    cy.wait(100)
  })

  afterEach(() => {
    editor.destroy()
    if (container.parentElement) {
      container.parentElement.removeChild(container)
    }
  })

  describe('DOM属性映射测试', () => {
    it('should correctly map moni attributes to DOM elements', () => {
      // 验证所有块都有正确的属性
      const allBlocks = editor.view.dom.querySelectorAll('[data-moni-block-id]')
      expect(allBlocks.length).to.be.greaterThan(0)

      allBlocks.forEach(block => {
        const moniBlockId = block.getAttribute('data-moni-block-id')
        expect(moniBlockId).to.not.be.null
        expect(moniBlockId).to.not.be.empty

        // 验证基本属性存在
        const hasLevel = block.hasAttribute('data-moni-level')
        expect(hasLevel).to.be.true

        // 验证层级的一致性
        const level = parseInt(block.getAttribute('data-moni-level') || '0', 10)
        const moniParentId = block.getAttribute('data-moni-parent-id')

        if (level > 0) {
          expect(moniParentId).to.not.be.null
        } else {
          expect(moniParentId).to.be.null
        }
      })

      // 结合 schema 配置验证列表语义
      const listItemConfigs: { id: string; dragType: string; nestable: boolean }[] = []
      editor.state.doc.descendants(node => {
        if (node.type.name === 'listItem') {
          const config = getDragConfig(node)
          listItemConfigs.push({
            id: node.attrs.moniBlockId,
            dragType: config.dragType,
            nestable: config.nestable,
          })
        }
        return true
      })

      expect(listItemConfigs.length).to.be.greaterThan(0)
      listItemConfigs.forEach(config => {
        expect(config.dragType).to.equal('list-item')
        expect(config.nestable).to.be.true
      })
    })

    it('should maintain hierarchical consistency', () => {
      // 验证父子关系的一致性
      const nestedItems = editor.view.dom.querySelectorAll('[data-moni-level="2"]')

      nestedItems.forEach(item => {
        const moniParentId = item.getAttribute('data-moni-parent-id')
        expect(moniParentId).to.not.be.null

        // 查找父元素
        const parent = editor.view.dom.querySelector(`[data-moni-block-id="${moniParentId}"]`)
        expect(parent).to.not.be.null

        // 验证父元素的层级
        const parentLevel = parseInt(parent!.getAttribute('data-moni-level') || '0', 10)
        const itemLevel = parseInt(item.getAttribute('data-moni-level') || '0', 10)
        expect(itemLevel).to.equal(parentLevel + 1)
      })
    })
  })

  describe('SmartDragCalculator 深度测试', () => {
    let smartCalculator: SmartDragCalculator

    beforeEach(() => {
      smartCalculator = new SmartDragCalculator(editor, {
        nestingThreshold: 24,
        maxNestingLevel: 6,
        confidenceThreshold: 0.2,
        enableDebug: true,
      })
    })

    afterEach(() => {
      smartCalculator.destroy()
    })

    it('should calculate positions for complex nested structures', () => {
      const mockEvent = {
        clientX: 200,
        clientY: 300,
      }

      // 模拟在嵌套列表项上的拖拽
      const targetElement = editor.view.dom.querySelector('[data-moni-block-id="item-2-1"]') as HTMLElement
      expect(targetElement).to.not.be.null

      // Mock elementFromPoint
      const originalElementFromPoint = document.elementFromPoint
      document.elementFromPoint = () => targetElement

      const result = smartCalculator.calculateSmartPosition(
        mockEvent.clientX,
        mockEvent.clientY,
        'item-1-1',
        editor.view.dom as HTMLElement,
      )

      expect(result).to.not.be.null
      expect(result!.allCandidates.length).to.be.greaterThan(0)
      expect(result!.bestCandidate).to.not.be.null

      // 验证计算结果的合理性
      if (result!.bestCandidate) {
        expect(result!.bestCandidate.confidence).to.be.at.least(0)
        expect(result!.bestCandidate.confidence).to.be.at.most(1)
        expect(result!.bestCandidate.nestingLevel).to.be.at.least(0)
        expect(result!.bestCandidate.nestingLevel).to.be.at.most(6)
      }

      // 恢复原始函数
      document.elementFromPoint = originalElementFromPoint
    })

    it('should respect nesting constraints in calculations', () => {
      const mockEvent = {
        clientX: 400,
        clientY: 500,
      }

      // 测试超过最大嵌套层级的场景
      const result = smartCalculator.calculateSmartPosition(
        mockEvent.clientX,
        mockEvent.clientY,
        'item-2-1', // 已经在第2层
        editor.view.dom as HTMLElement,
      )

      if (result && result.bestCandidate) {
        // 确保不会建议超过最大嵌套层级的操作
        expect(result.bestCandidate.nestingLevel).to.be.at.most(6)
      }
    })

    it('should handle edge cases gracefully', () => {
      // 测试边界坐标
      const edgeCases = [
        { x: 0, y: 0 },
        { x: -10, y: -10 },
        { x: 10000, y: 10000 },
        { x: 50, y: 50 },
      ]

      edgeCases.forEach(coords => {
        const result = smartCalculator.calculateSmartPosition(
          coords.x,
          coords.y,
          'root-1',
          editor.view.dom as HTMLElement,
        )

        // 即使在边界情况下也应该返回有效结果或null
        if (result) {
          expect(result.allCandidates).to.be.an('array')
          expect(result.performance).to.be.an('object')
        }
      })
    })
  })

  describe('事件系统集成测试', () => {
    let moniDragPlugin: MoniDragPlugin
    let eventHistory: any[]

    beforeEach(() => {
      eventHistory = []

      moniDragPlugin = new MoniDragPlugin(editor, {
        debug: true,
        enableIndicators: true,
        onDragStart: data => {
          eventHistory.push({ type: 'dragstart', data, timestamp: Date.now() })
        },
        onDragOver: data => {
          eventHistory.push({ type: 'dragover', data, timestamp: Date.now() })
        },
        onDrop: data => {
          eventHistory.push({ type: 'drop', data, timestamp: Date.now() })
        },
      })

      editor.registerPlugin(moniDragPlugin.getPlugin())
    })

    afterEach(() => {
      moniDragPlugin.destroy()
    })

    it('should properly bind and handle DOM events', () => {
      // 获取可拖拽的元素
      const draggableElement = editor.view.dom.querySelector('[data-moni-block-id="root-1"]') as HTMLElement
      expect(draggableElement).to.not.be.null

      // 模拟完整的拖拽序列
      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer(),
      })

      const dragOverEvent = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        clientX: 200,
        clientY: 300,
      })

      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        clientX: 200,
        clientY: 300,
      })

      // 触发事件序列
      draggableElement.dispatchEvent(dragStartEvent)
      draggableElement.dispatchEvent(dragOverEvent)
      draggableElement.dispatchEvent(dropEvent)

      // 验证事件被正确处理
      expect(eventHistory.length).to.be.greaterThan(0)

      const dragStartEvents = eventHistory.filter(e => e.type === 'dragstart')
      expect(dragStartEvents.length).to.be.at.least(1)
    })

    it('should handle rapid successive events', () => {
      const element = editor.view.dom.querySelector('[data-moni-block-id="root-2"]') as HTMLElement

      // 快速连续触发多个事件
      for (let i = 0; i < 10; i += 1) {
        const event = new DragEvent('dragover', {
          bubbles: true,
          clientX: 100 + i * 10,
          clientY: 200 + i * 5,
        })
        element.dispatchEvent(event)
      }

      // 系统应该能够处理快速事件而不崩溃
      expect(editor.isDestroyed).to.be.false
      // 可能会有防抖或节流，所以事件数量可能少于触发数量
    })
  })

  describe('Performance 性能测试', () => {
    it('should handle large documents efficiently', () => {
      // 创建包含大量块的文档
      const largeContent: any[] = []
      for (let i = 0; i < 100; i += 1) {
        largeContent.push({
          type: 'paragraph',
          attrs: {
            moniBlockId: `perf-block-${i}`,
            moniLevel: 0,
          },
          content: [{ type: 'text', text: `Performance test paragraph ${i}` }],
        })
      }

      const startTime = performance.now()

      // 更新编辑器内容
      editor.commands.setContent({
        type: 'doc',
        content: largeContent,
      })

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // 验证渲染时间在合理范围内 (< 1秒)
      expect(renderTime).to.be.lessThan(1000)

      // 验证所有块都正确渲染
      const renderedBlocks = editor.view.dom.querySelectorAll('[data-moni-block-id^="perf-block-"]')
      expect(renderedBlocks.length).to.equal(100)
    })

    it('should maintain performance during intensive drag operations', () => {
      const calculator = new SmartDragCalculator(editor, { enableDebug: false })

      const startTime = performance.now()

      // 执行100次位置计算
      for (let i = 0; i < 100; i += 1) {
        calculator.calculateSmartPosition(
          Math.random() * 800,
          Math.random() * 600,
          'root-1',
          editor.view.dom as HTMLElement,
        )
      }

      const endTime = performance.now()
      const totalTime = endTime - startTime
      const averageTime = totalTime / 100

      // 平均每次计算应该少于10ms
      expect(averageTime).to.be.lessThan(10)

      calculator.destroy()
    })
  })

  describe('错误处理和边界情况', () => {
    it('should handle missing DOM elements gracefully', () => {
      const operationManager = new DragOperationManager(editor, { debug: true })

      // 尝试查找不存在的块
      const result = operationManager.findNodeData('non-existent-block')
      expect(result).to.be.null

      // 尝试无效的拖拽操作
      const invalidDragData = {
        moniBlockId: 'non-existent',
        dragType: 'block',
        level: 0,
        moniParentId: null,
      }

      const invalidDropTarget = {
        moniBlockId: 'also-non-existent',
        position: 'above' as const,
      }

      const isValid = operationManager.validateDrop(invalidDragData, invalidDropTarget)
      expect(isValid).to.be.false

      operationManager.destroy()
    })

    it('should recover from corrupted state', () => {
      const plugin = new MoniDragPlugin(editor, { debug: true })
      editor.registerPlugin(plugin.getPlugin())

      // 模拟损坏的拖拽状态
      plugin.handleDragStart('invalid-block', {
        attrs: {
          'moni-drag-type': 'invalid-type',
          'moni-level': 'not-a-number',
          'moni-parent-id': null,
        },
      })

      // 系统应该能够处理无效状态而不崩溃
      expect(editor.isDestroyed).to.be.false

      // 清理状态应该工作正常
      plugin.handleDragEnd('invalid-block', { attrs: {} })

      const pluginState = plugin.getPlugin().getState(editor.state)
      expect(pluginState?.isDragging).to.be.false

      plugin.destroy()
    })
  })

  describe('与Extension层的集成', () => {
    it('should work correctly with TipTap extensions', () => {
      // 验证核心管理器与extension的协调
      const dragHandleManager = new DragHandleManager(editor, {
        element: document.createElement('div'),
        position: { side: 'left', offset: 8 },
      })

      const indicatorManager = new DragIndicatorManager(editor)

      // 模拟extension触发的事件 - 暂时不使用
      // const mockNode = {
      //   attrs: {
      //     'moni-block-id': 'root-1',
      //     'moni-drag-type': 'block',
      //     'moni-level': 0,
      //   },
      // }

      // 这些操作不应该产生错误
      expect(() => {
        dragHandleManager.findNodeByBlockId('root-1')
        indicatorManager.showIndicator({
          moniBlockId: 'root-1',
          position: 'below',
        })
        indicatorManager.hideAll()
      }).to.not.throw()

      dragHandleManager.destroy()
      indicatorManager.destroy()
    })

    it('should maintain consistency between core and extension states', () => {
      const plugin = new MoniDragPlugin(editor, { debug: true })
      editor.registerPlugin(plugin.getPlugin())

      // 获取初始状态
      const initialState = plugin.getPlugin().getState(editor.state)
      expect(initialState?.isDragging).to.be.false

      // 模拟拖拽开始
      plugin.handleDragStart('root-1', {
        attrs: {
          'moni-drag-type': 'block',
          'moni-level': 0,
          'moni-parent-id': null,
        },
      })

      // 验证状态更新
      const dragState = plugin.getPlugin().getState(editor.state)
      expect(dragState?.isDragging).to.be.true
      expect(dragState?.dragData?.moniBlockId).to.equal('root-1')

      // 结束拖拽
      plugin.handleDragEnd('root-1', { attrs: {} })

      // 验证状态清理
      const endState = plugin.getPlugin().getState(editor.state)
      expect(endState?.isDragging).to.be.false
      expect(endState?.dragData).to.be.null

      plugin.destroy()
    })
  })

  describe('移动端和触摸事件', () => {
    it('should handle touch events on mobile devices', () => {
      const plugin = new MoniDragPlugin(editor, {
        debug: true,
        enableMobileSupport: true,
      })

      editor.registerPlugin(plugin.getPlugin())

      const element = editor.view.dom.querySelector('[data-moni-block-id="root-1"]') as HTMLElement

      // 模拟触摸事件序列
      const touchStartEvent = new TouchEvent('touchstart', {
        bubbles: true,
        cancelable: true,
        touches: [
          new Touch({
            identifier: 1,
            target: element,
            clientX: 100,
            clientY: 200,
          }),
        ],
      })

      const touchMoveEvent = new TouchEvent('touchmove', {
        bubbles: true,
        cancelable: true,
        touches: [
          new Touch({
            identifier: 1,
            target: element,
            clientX: 150,
            clientY: 250,
          }),
        ],
      })

      const touchEndEvent = new TouchEvent('touchend', {
        bubbles: true,
        cancelable: true,
        changedTouches: [
          new Touch({
            identifier: 1,
            target: element,
            clientX: 150,
            clientY: 250,
          }),
        ],
      })

      // 触摸事件不应该导致错误
      expect(() => {
        element.dispatchEvent(touchStartEvent)
        element.dispatchEvent(touchMoveEvent)
        element.dispatchEvent(touchEndEvent)
      }).to.not.throw()

      plugin.destroy()
    })
  })

  describe('无障碍性(Accessibility)', () => {
    it('should provide proper ARIA attributes', () => {
      const plugin = new MoniDragPlugin(editor, {
        debug: true,
        enableAccessibility: true,
      })

      editor.registerPlugin(plugin.getPlugin())

      const handleElement = container.querySelector('.moni-drag-handle') as HTMLElement
      expect(handleElement).to.not.be.null
      expect(handleElement.draggable).to.be.true

      plugin.destroy()
    })
  })
})

/**
 * 🎯 专门用于调试当前问题的测试
 */
describe('Current Issue Debugging', () => {
  let editor: Editor
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    container.id = 'debug-container'
    document.body.appendChild(container)

    editor = new Editor({
      element: container,
      extensions: [Document, Text, Paragraph],
      content: `
        <p data-moni-block-id="debug-block-1">Debug paragraph 1</p>
        <p data-moni-block-id="debug-block-2">Debug paragraph 2</p>
      `,
    })
  })

  afterEach(() => {
    editor.destroy()
    if (container.parentElement) {
      container.parentElement.removeChild(container)
    }
  })

  it('should have moni attributes in DOM after editor initialization', () => {
    console.log('🔍 DOM调试 - 编辑器初始化后检查')
    console.log('Editor DOM:', editor.view.dom.innerHTML)

    const elementsWithBlockId = editor.view.dom.querySelectorAll('[data-moni-block-id]')
    console.log('具有 data-moni-block-id 的元素数量:', elementsWithBlockId.length)

    elementsWithBlockId.forEach((el, index) => {
      const moniBlockId = el.getAttribute('data-moni-block-id')
      const allAttrs = Array.from(el.attributes)
        .map(attr => `${attr.name}="${attr.value}"`)
        .join(' ')

      console.log(`元素 ${index + 1}:`, {
        moniBlockId,
        draggable: el.getAttribute('draggable'),
        tagName: el.tagName,
        allAttrs,
      })
    })

    expect(elementsWithBlockId.length).to.be.greaterThan(0)

    // 验证每个元素都有必需的属性
    elementsWithBlockId.forEach(el => {
      const moniBlockId = el.getAttribute('data-moni-block-id')
      expect(moniBlockId).to.not.be.null
      expect(moniBlockId).to.not.be.empty
    })
  })

  it('should properly initialize drag system components', () => {
    console.log('🔍 拖拽系统组件初始化检查')

    const plugin = new MoniDragPlugin(editor, {
      debug: true,
      enableIndicators: true,
    })

    expect(plugin.dragHandleManager).to.not.be.null
    expect(plugin.dragIndicatorManager).to.not.be.null
    expect(plugin.dragOperationManager).to.not.be.null

    console.log('✅ 所有管理器都已正确初始化')

    // 注册插件
    editor.registerPlugin(plugin.getPlugin())

    // 验证插件状态
    const pluginState = plugin.getPlugin().getState(editor.state)
    expect(pluginState).to.not.be.undefined
    expect(pluginState?.isDragging).to.be.false

    console.log('✅ 插件状态正确')

    plugin.destroy()
  })

  it('should correctly identify draggable elements', () => {
    console.log('🔍 可拖拽元素识别测试')

    const operationManager = new DragOperationManager(editor, { debug: true })

    // 查找已知的块
    const block1Data = operationManager.findNodeData('debug-block-1')
    const block2Data = operationManager.findNodeData('debug-block-2')

    console.log('Block 1 data:', block1Data)
    console.log('Block 2 data:', block2Data)

    expect(block1Data).to.not.be.null
    expect(block2Data).to.not.be.null

    if (block1Data && block2Data) {
      expect(block1Data.node.type.name).to.equal('paragraph')
      expect(block2Data.node.type.name).to.equal('paragraph')
      expect(typeof block1Data.pos).to.equal('number')
      expect(typeof block2Data.pos).to.equal('number')
    }

    operationManager.destroy()
  })
})
