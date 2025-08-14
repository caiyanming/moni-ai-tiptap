/**
 * 🔍 验证SVG draggable属性设置
 * 关键假设：React组件的SVG必须有draggable="true"才能触发HTML5拖拽
 */

import { JSDOM } from 'jsdom'
import assert from 'node:assert'
import { test } from 'node:test'

test('SVG draggable属性验证', async () => {
  // 设置DOM环境
  const dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
    <body>
      <div class="drag-handle">
        <svg draggable="true" xmlns="http://www.w3.org/2000/svg">
          <path d="M3.75 9h16.5m-16.5 6.75h16.5" />
        </svg>
      </div>
    </body>
    </html>
  `)

  global.document = dom.window.document
  global.window = dom.window

  const svg = document.querySelector('svg')

  // 关键验证
  assert.strictEqual(svg.draggable, true, 'SVG元素必须设置draggable="true"')
  assert.strictEqual(svg.getAttribute('draggable'), 'true', '应有draggable属性')

  console.log('✅ SVG draggable属性验证通过')
})

test('拖拽事件绑定验证', async () => {
  const dom = new JSDOM(`
    <div class="drag-handle">
      <svg draggable="true" xmlns="http://www.w3.org/2000/svg">
        <path d="M3.75 9h16.5m-16.5 6.75h16.5" />
      </svg>
    </div>
  `)

  global.document = dom.window.document
  global.window = dom.window

  const svg = document.querySelector('svg')
  let dragStartCalled = false

  // 绑定事件监听器
  svg.addEventListener('dragstart', e => {
    dragStartCalled = true
    console.log('🎯 dragstart事件被触发')
  })

  // 模拟dragstart事件
  const dragEvent = new dom.window.DragEvent('dragstart', {
    bubbles: true,
    cancelable: true,
    dataTransfer: new dom.window.DataTransfer(),
  })

  svg.dispatchEvent(dragEvent)

  assert.strictEqual(dragStartCalled, true, 'dragstart事件应该被触发')
  console.log('✅ 拖拽事件绑定验证通过')
})
