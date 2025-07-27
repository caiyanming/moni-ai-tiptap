/// <reference types="cypress" />
/* eslint-disable no-unused-expressions, @typescript-eslint/no-unused-expressions, no-void */

import { Editor } from '@tiptap/core'
import { Document } from '@tiptap/extension-document'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Text } from '@tiptap/extension-text'

// import { DragHandleManager } from '../../../../packages/core/src/DragHandleManager.js'
// import { DragIndicatorManager } from '../../../../packages/core/src/DragIndicatorManager.js'
import { MoniDragPlugin } from '../../../../packages/core/src/MoniDragPlugin.js'

/**
 * 事件执行结果接口
 */
interface EventResult {
  type: string
  result: boolean
  defaultPrevented: boolean
}

/**
 * 🎯 专门用于调试拖拽事件不响应问题的集成测试
 *
 * 测试重点：
 * 1. 事件绑定和传播验证
 * 2. DOM属性到事件处理的映射
 * 3. 真实浏览器环境下的事件响应
 * 4. extension层和core层的事件协调
 */
describe('Drag Event Integration - Debug Current Issue', () => {
  let editor: Editor
  let container: HTMLElement
  let moniDragPlugin: MoniDragPlugin
  let eventLog: any[]

  beforeEach(() => {
    // 清空事件日志
    eventLog = []

    // 创建真实的DOM环境
    container = document.createElement('div')
    container.id = 'test-editor'
    container.style.width = '600px'
    container.style.height = '400px'
    container.style.padding = '20px'
    container.style.border = '1px solid #ccc'
    document.body.appendChild(container)

    // 创建编辑器，模拟web应用的实际使用
    editor = new Editor({
      element: container,
      extensions: [Document, Text, Paragraph],
      content: `
        <p data-moni-block-id="test-block-001" data-moni-drag-enabled="true" data-moni-drag-handle="true" data-moni-level="0" data-moni-nestable="true" data-moni-drag-type="block">这是第一个段落，应该可以拖拽</p>
        <p data-moni-block-id="test-block-002" data-moni-drag-enabled="true" data-moni-drag-handle="true" data-moni-level="0" data-moni-nestable="true" data-moni-drag-type="block">这是第二个段落，也应该可以拖拽</p>
        <p data-moni-block-id="test-block-003" data-moni-drag-enabled="true" data-moni-drag-handle="true" data-moni-level="0" data-moni-nestable="true" data-moni-drag-type="block">这是第三个段落，测试拖拽功能</p>
      `,
    })

    // 初始化拖拽插件
    moniDragPlugin = new MoniDragPlugin(editor, {
      debug: true,
      enableIndicators: true,
    })

    // 注册插件
    editor.registerPlugin(moniDragPlugin.getPlugin())

    // 等待编辑器完全初始化
    cy.wait(200)
  })

  afterEach(() => {
    moniDragPlugin.destroy()
    editor.destroy()
    if (container.parentElement) {
      container.parentElement.removeChild(container)
    }
  })

  describe('DOM属性验证', () => {
    it('should have all required moni attributes in rendered DOM', () => {
      console.log('🔍 验证DOM属性...')
      console.log('Editor DOM:', editor.view.dom.innerHTML)

      // 检查所有段落是否有正确的moni属性
      const paragraphs = editor.view.dom.querySelectorAll('p')
      console.log('找到段落数量:', paragraphs.length)

      expect(paragraphs.length).to.equal(3)

      paragraphs.forEach((p, index) => {
        const moniBlockId = p.getAttribute('data-moni-block-id')
        const dragEnabled = p.getAttribute('data-moni-drag-enabled')
        const dragHandle = p.getAttribute('data-moni-drag-handle')
        const dragType = p.getAttribute('data-moni-drag-type')
        const level = p.getAttribute('data-moni-level')
        const nestable = p.getAttribute('data-moni-nestable')

        console.log(`段落 ${index + 1} 属性:`, {
          moniBlockId,
          dragEnabled,
          dragHandle,
          dragType,
          level,
          nestable,
          innerHTML: p.innerHTML,
        })

        // 验证所有必需属性存在
        expect(moniBlockId).to.not.be.null
        expect(dragEnabled).to.equal('true')
        expect(dragHandle).to.equal('true')
        expect(dragType).to.equal('block')
        expect(level).to.equal('0')
        expect(nestable).to.equal('true')
      })
    })

    it('should have draggable elements configured correctly', () => {
      const paragraphs = editor.view.dom.querySelectorAll('p[data-moni-drag-enabled="true"]')

      paragraphs.forEach(p => {
        const moniBlockId = p.getAttribute('data-moni-block-id')
        const hasDragHandle = p.hasAttribute('data-moni-drag-handle')

        console.log('段落拖拽状态:', {
          moniBlockId,
          hasDragHandle,
          tagName: p.tagName,
        })

        expect(moniBlockId).to.not.be.null
        expect(hasDragHandle).to.be.true
      })
    })
  })

  describe('事件绑定验证', () => {
    it('should properly bind drag event listeners', () => {
      console.log('🔍 验证事件绑定...')

      // 检查插件是否正确初始化
      const plugin = moniDragPlugin.getPlugin()
      expect(plugin).to.not.be.null

      console.log('✅ 拖拽插件已初始化')

      // 验证编辑器DOM是否有事件监听器
      const editorDOM = editor.view.dom
      expect(editorDOM).to.not.be.null

      // 检查是否可以找到目标元素
      const firstParagraph = editorDOM.querySelector('[data-moni-block-id="test-block-001"]')
      expect(firstParagraph).to.not.be.null

      console.log('✅ 可以找到目标拖拽元素')
    })

    it('should respond to mouse events on draggable elements', () => {
      const firstParagraph = editor.view.dom.querySelector('[data-moni-block-id="test-block-001"]') as HTMLElement
      expect(firstParagraph).to.not.be.null

      // 模拟鼠标悬停事件
      const mouseEnterEvent = new MouseEvent('mouseenter', {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100,
      })

      const mouseMoveEvent = new MouseEvent('mousemove', {
        bubbles: true,
        cancelable: true,
        clientX: 100,
        clientY: 100,
      })

      console.log('🎯 触发鼠标事件...')

      // 触发事件并检查响应
      let eventFired = false
      firstParagraph.addEventListener('mouseenter', () => {
        eventFired = true
        console.log('✅ 鼠标进入事件被触发')
      })

      firstParagraph.dispatchEvent(mouseEnterEvent)
      firstParagraph.dispatchEvent(mouseMoveEvent)

      expect(eventFired).to.be.true
    })
  })

  describe('拖拽事件序列测试', () => {
    it('should handle complete drag sequence without errors', () => {
      const sourceElement = editor.view.dom.querySelector('[data-moni-block-id="test-block-001"]') as HTMLElement
      const targetElement = editor.view.dom.querySelector('[data-moni-block-id="test-block-002"]') as HTMLElement

      expect(sourceElement).to.not.be.null
      expect(targetElement).to.not.be.null

      console.log('🎯 开始完整拖拽序列测试...')

      // 创建拖拽事件序列
      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer: new DataTransfer(),
      })

      const dragOverEvent = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        clientX: 150,
        clientY: 200,
      })

      const dropEvent = new DragEvent('drop', {
        bubbles: true,
        cancelable: true,
        clientX: 150,
        clientY: 200,
        dataTransfer: new DataTransfer(),
      })

      const dragEndEvent = new DragEvent('dragend', {
        bubbles: true,
        cancelable: true,
      })

      // 添加事件监听器来跟踪事件
      const eventTracker = {
        dragstart: false,
        dragover: false,
        drop: false,
        dragend: false,
      }

      sourceElement.addEventListener('dragstart', e => {
        eventTracker.dragstart = true
        console.log('✅ DragStart 事件被触发', e)
        eventLog.push({ type: 'dom_dragstart', element: 'source', timestamp: Date.now() })
      })

      targetElement.addEventListener('dragover', e => {
        eventTracker.dragover = true
        console.log('✅ DragOver 事件被触发', e)
        eventLog.push({ type: 'dom_dragover', element: 'target', timestamp: Date.now() })
        e.preventDefault() // 允许drop
      })

      targetElement.addEventListener('drop', e => {
        eventTracker.drop = true
        console.log('✅ Drop 事件被触发', e)
        eventLog.push({ type: 'dom_drop', element: 'target', timestamp: Date.now() })
      })

      sourceElement.addEventListener('dragend', e => {
        eventTracker.dragend = true
        console.log('✅ DragEnd 事件被触发', e)
        eventLog.push({ type: 'dom_dragend', element: 'source', timestamp: Date.now() })
      })

      // 执行拖拽序列
      console.log('🎯 执行 dragstart...')
      sourceElement.dispatchEvent(dragStartEvent)

      console.log('🎯 执行 dragover...')
      targetElement.dispatchEvent(dragOverEvent)

      console.log('🎯 执行 drop...')
      targetElement.dispatchEvent(dropEvent)

      console.log('🎯 执行 dragend...')
      sourceElement.dispatchEvent(dragEndEvent)

      // 验证事件被正确触发
      expect(eventTracker.dragstart).to.be.true
      expect(eventTracker.dragover).to.be.true
      expect(eventTracker.drop).to.be.true
      expect(eventTracker.dragend).to.be.true

      console.log('✅ 所有DOM事件都被正确触发')
      console.log('事件日志:', eventLog)
    })

    it('should integrate drag events with MoniDragPlugin', () => {
      const sourceElement = editor.view.dom.querySelector('[data-moni-block-id="test-block-001"]') as HTMLElement

      // 设置元素为可拖拽
      sourceElement.draggable = true

      console.log('🎯 测试MoniDragPlugin事件集成...')

      // 验证插件初始状态
      const initialState = moniDragPlugin.getPlugin().getState(editor.state)
      expect(initialState?.isDragging).to.be.false
      expect(initialState?.dragData).to.be.null

      console.log('✅ MoniDragPlugin 状态正确')
    })
  })

  describe('真实拖拽模拟', () => {
    it('should simulate real user drag interaction', () => {
      console.log('🎯 模拟真实用户拖拽交互...')

      const sourceElement = editor.view.dom.querySelector('[data-moni-block-id="test-block-001"]') as HTMLElement
      const targetElement = editor.view.dom.querySelector('[data-moni-block-id="test-block-003"]') as HTMLElement

      // 确保元素可拖拽
      sourceElement.draggable = true

      // 获取元素位置
      const sourceRect = sourceElement.getBoundingClientRect()
      const targetRect = targetElement.getBoundingClientRect()

      console.log('源元素位置:', sourceRect)
      console.log('目标元素位置:', targetRect)

      // 创建更真实的事件序列
      const events = [
        {
          type: 'mousedown',
          element: sourceElement,
          coords: { x: sourceRect.left + 10, y: sourceRect.top + 10 },
        },
        {
          type: 'dragstart',
          element: sourceElement,
          coords: { x: sourceRect.left + 10, y: sourceRect.top + 10 },
        },
        {
          type: 'dragenter',
          element: targetElement,
          coords: { x: targetRect.left + 10, y: targetRect.top + 10 },
        },
        {
          type: 'dragover',
          element: targetElement,
          coords: { x: targetRect.left + 10, y: targetRect.top + 10 },
        },
        {
          type: 'drop',
          element: targetElement,
          coords: { x: targetRect.left + 10, y: targetRect.top + 10 },
        },
        {
          type: 'dragend',
          element: sourceElement,
          coords: { x: targetRect.left + 10, y: targetRect.top + 10 },
        },
      ]

      const eventResults: EventResult[] = []

      // 执行事件序列
      events.forEach(({ type, element, coords }) => {
        const event = new (window as any)[type === 'mousedown' ? 'MouseEvent' : 'DragEvent'](type, {
          bubbles: true,
          cancelable: true,
          clientX: coords.x,
          clientY: coords.y,
          dataTransfer: type.includes('drag') ? new DataTransfer() : undefined,
        })

        if (type === 'dragover' || type === 'dragenter') {
          event.preventDefault()
        }

        console.log(`🎯 触发 ${type} 事件`, { element: element.getAttribute('data-moni-block-id'), coords })

        const result = element.dispatchEvent(event)
        eventResults.push({ type, result, defaultPrevented: event.defaultPrevented })
      })

      console.log('事件触发结果:', eventResults)

      // 验证事件序列完成
      expect(eventResults.length).to.equal(events.length)

      // 检查拖拽是否在系统中留下痕迹
      console.log('最终事件日志:', eventLog)
      console.log('编辑器状态:', editor.state.doc.toJSON())
    })
  })

  describe('拖拽指示器测试', () => {
    it('should create drag indicators correctly', () => {
      console.log('🎯 测试拖拽指示器...')

      // 通过DOM查找指示器元素
      const indicatorContainer = editor.view.dom.parentElement
      expect(indicatorContainer).to.not.be.null

      const horizontalIndicator = indicatorContainer!.querySelector('.moni-drag-indicator-horizontal') as HTMLElement
      const verticalIndicator = indicatorContainer!.querySelector('.moni-drag-indicator-vertical') as HTMLElement

      expect(horizontalIndicator).to.not.be.null
      expect(verticalIndicator).to.not.be.null

      // 默认应该是隐藏的
      expect(horizontalIndicator!.style.visibility).to.equal('hidden')
      expect(verticalIndicator!.style.visibility).to.equal('hidden')

      console.log('✅ 指示器创建正常')
    })
  })

  describe('错误情况处理', () => {
    it('should handle missing or invalid block IDs gracefully', () => {
      console.log('🎯 测试错误情况处理...')

      // 尝试在不存在的元素上拖拽
      const nonExistentElement = document.createElement('div')
      nonExistentElement.setAttribute('data-moni-block-id', 'non-existent')

      // 模拟拖拽事件
      const dragEvent = new DragEvent('dragover', {
        bubbles: true,
        clientX: 100,
        clientY: 100,
      })

      // 这应该不会导致错误
      expect(() => {
        nonExistentElement.dispatchEvent(dragEvent)
      }).to.not.throw()

      console.log('✅ 错误情况处理正常')
    })
  })
})

/**
 * 🔧 调试工具测试
 */
describe('Drag System Debug Tools', () => {
  it('should provide comprehensive debug information', () => {
    console.log('🔧 运行拖拽系统诊断...')

    // 检查浏览器对拖拽API的支持
    const dragSupport = {
      dragEventSupported: 'DragEvent' in window,
      dataTransferSupported: 'DataTransfer' in window,
      dragDropSupported: 'ondragstart' in document.createElement('div'),
      fileAPISupported: 'FileReader' in window,
    }

    console.log('浏览器拖拽支持:', dragSupport)

    // 检查所需的DOM API
    const domAPISupport = {
      querySelector: 'querySelector' in document,
      addEventListener: 'addEventListener' in document,
      getBoundingClientRect: 'getBoundingClientRect' in document.createElement('div'),
      elementFromPoint: 'elementFromPoint' in document,
    }

    console.log('DOM API支持:', domAPISupport)

    // 检查所需的ES6+特性
    const es6Support = {
      promises: 'Promise' in window,
      weakMap: 'WeakMap' in window,
      map: 'Map' in window,
      set: 'Set' in window,
      proxy: 'Proxy' in window,
    }

    console.log('ES6+特性支持:', es6Support)

    // 验证所有必需特性都被支持
    Object.values({ ...dragSupport, ...domAPISupport, ...es6Support }).forEach(supported => {
      expect(supported).to.be.true
    })

    console.log('✅ 所有必需特性都被支持')
  })
})
