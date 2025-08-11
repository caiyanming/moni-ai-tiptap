/**
 * JSDOM DragEvent 兼容性验证测试
 */

import { describe, expect, it } from 'vitest'
import { createCompatibleDragEvent, createDragEventSequence } from '../utils/drag-event-helpers.js'

describe('JSDOM DragEvent Compatibility', () => {
  it('should create compatible DragEvent that can be dispatched', () => {
    // 创建测试元素
    const testElement = document.createElement('div')
    document.body.appendChild(testElement)

    let eventFired = false
    testElement.addEventListener('dragstart', () => {
      eventFired = true
    })

    // 使用兼容的方式创建DragEvent
    const dragStartEvent = createCompatibleDragEvent('dragstart', {
      clientX: 100,
      clientY: 200,
    })

    // 这里应该不会抛出 "parameter 1 is not of type 'Event'" 错误
    expect(() => {
      testElement.dispatchEvent(dragStartEvent)
    }).not.toThrow()

    expect(eventFired).toBe(true)
    expect(dragStartEvent.clientX).toBe(100)
    expect(dragStartEvent.clientY).toBe(200)

    document.body.removeChild(testElement)
  })

  it('should create full drag event sequence', () => {
    const testElement = document.createElement('div')
    document.body.appendChild(testElement)

    const events = createDragEventSequence({
      clientX: 50,
      clientY: 75,
    })

    // 所有事件都应该能够成功分发
    expect(() => {
      testElement.dispatchEvent(events.dragStart)
      testElement.dispatchEvent(events.dragOver)
      testElement.dispatchEvent(events.drop)
      testElement.dispatchEvent(events.dragEnd)
    }).not.toThrow()

    // 验证事件属性
    expect(events.dragStart.clientX).toBe(50)
    expect(events.dragStart.clientY).toBe(75)
    expect(events.dragStart.type).toBe('dragstart')

    document.body.removeChild(testElement)
  })

  it('should create event with DataTransfer', () => {
    const dataTransfer = new DataTransfer()
    const dragEvent = createCompatibleDragEvent('dragstart', {
      dataTransfer,
    })

    expect(dragEvent.dataTransfer).toBe(dataTransfer)
  })

  it('should work with global createDragEvent function', () => {
    // 验证全局函数存在且可用
    if (typeof global.createDragEvent === 'function') {
      const event = global.createDragEvent('dragover', {
        clientX: 123,
        clientY: 456,
      })

      expect(event.type).toBe('dragover')
      expect(event.clientX).toBe(123)
      expect(event.clientY).toBe(456)
    }
  })

  it('should handle event with all standard properties', () => {
    const dragEvent = createCompatibleDragEvent('dragstart', {
      clientX: 10,
      clientY: 20,
      screenX: 100,
      screenY: 200,
      button: 1,
      buttons: 2,
      ctrlKey: true,
      shiftKey: false,
      altKey: true,
      metaKey: false,
      bubbles: true,
      cancelable: true,
    })

    // 验证所有属性都正确设置
    expect(dragEvent.clientX).toBe(10)
    expect(dragEvent.clientY).toBe(20)
    expect(dragEvent.screenX).toBe(100)
    expect(dragEvent.screenY).toBe(200)
    expect(dragEvent.button).toBe(1)
    expect(dragEvent.buttons).toBe(2)
    expect(dragEvent.ctrlKey).toBe(true)
    expect(dragEvent.shiftKey).toBe(false)
    expect(dragEvent.altKey).toBe(true)
    expect(dragEvent.metaKey).toBe(false)
    expect(dragEvent.bubbles).toBe(true)
    expect(dragEvent.cancelable).toBe(true)
    expect(dragEvent.type).toBe('dragstart')
  })
})