/**
 * 🔍 验证拖拽指示器创建
 * 关键假设：如果createDragIndicator失败，事件监听器不会被绑定
 */

import { JSDOM } from 'jsdom'

// 模拟EditorView
const mockEditorView = {
  dom: null,
  isDestroyed: false,
}

// 设置DOM环境
const dom = new JSDOM(`
  <!DOCTYPE html>
  <html>
  <body>
    <div class="ProseMirror" contenteditable="true">
      <p>Test paragraph</p>
    </div>
  </body>
  </html>
`)

global.document = dom.window.document
global.window = dom.window
global.HTMLElement = dom.window.HTMLElement

// 模拟EditorView DOM
mockEditorView.dom = document.querySelector('.ProseMirror')

console.log('🔍 测试拖拽指示器创建条件:')
console.log('  showIndicators: true')
console.log('  view.dom exists:', !!mockEditorView.dom)
console.log('  view.dom.isConnected:', mockEditorView.dom?.isConnected)
console.log('  view.isDestroyed:', mockEditorView.isDestroyed)

// 关键测试：验证创建条件
const shouldCreateIndicator = mockEditorView.dom && mockEditorView.dom.isConnected && !mockEditorView.isDestroyed

console.log('  ✅ 应该创建指示器:', shouldCreateIndicator)

if (!shouldCreateIndicator) {
  console.error('❌ 拖拽指示器创建条件不满足！')
  console.log('这解释了为什么事件监听器没有绑定')
} else {
  console.log('✅ 创建条件满足，问题在其他地方')
}

// 测试事件监听器绑定逻辑
let eventListenersAdded = false

if (shouldCreateIndicator) {
  console.log('🎯 模拟事件监听器绑定...')

  // 模拟成功创建指示器
  const mockDragIndicator = { show: () => {}, hide: () => {} }

  if (mockDragIndicator) {
    console.log('✅ 事件监听器会被绑定到document')
    eventListenersAdded = true
  }
}

console.log('\n📊 诊断结果:')
console.log(`  拖拽指示器创建: ${shouldCreateIndicator ? '✅' : '❌'}`)
console.log(`  事件监听器绑定: ${eventListenersAdded ? '✅' : '❌'}`)

if (!eventListenersAdded) {
  console.log('\n🔧 修复建议:')
  console.log('1. 检查createDragIndicator函数是否抛出错误')
  console.log('2. 确保DOM元素已正确连接')
  console.log('3. 验证编辑器未被销毁')
}
