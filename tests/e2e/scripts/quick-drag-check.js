/**
 * 🔍 快速拖拽功能检查脚本
 * 直接在浏览器控制台中运行，检查拖拽相关功能的实际状态
 */

// 在浏览器控制台中运行此脚本
(function() {
  console.log('🔍 开始快速拖拽功能检查...');
  
  // 1. 检查页面中的编辑器
  const proseMirrorElements = document.querySelectorAll('.ProseMirror');
  console.log(`📝 找到 ${proseMirrorElements.length} 个 ProseMirror 编辑器`);
  
  if (proseMirrorElements.length > 0) {
    const editor = proseMirrorElements[0];
    console.log('✅ 编辑器元素:', editor);
    
    // 2. 检查段落元素
    const paragraphs = editor.querySelectorAll('p');
    console.log(`📝 找到 ${paragraphs.length} 个段落`);
    
    if (paragraphs.length > 0) {
      const firstParagraph = paragraphs[0];
      console.log('📍 第一个段落:', firstParagraph);
      console.log('📝 段落内容:', firstParagraph.textContent);
      console.log('🏷️ 段落类名:', firstParagraph.className);
      console.log('🎯 拖拽属性:', firstParagraph.draggable);
      
      // 3. 检查拖拽相关的事件监听器
      const events = getEventListeners ? getEventListeners(firstParagraph) : 'getEventListeners not available';
      console.log('👂 事件监听器:', events);
    }
  }
  
  // 4. 检查是否有拖拽手柄相关的元素
  const dragSelectors = [
    '[data-drag-handle]',
    '.drag-handle',
    '[class*="drag"]',
    '.tiptap-drag-handle',
    '.moni-drag-indicator'
  ];
  
  dragSelectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`✅ 找到拖拽元素 ${selector}:`, elements);
    }
  });
  
  // 5. 检查 TipTap 实例和扩展
  if (window.editor || window.__tiptap_editor) {
    const editor = window.editor || window.__tiptap_editor;
    console.log('🎯 TipTap 编辑器实例:', editor);
    
    if (editor.extensionManager) {
      const extensions = editor.extensionManager.extensions;
      console.log('🔌 加载的扩展:', extensions.map(ext => ext.name));
      
      const dragExtension = extensions.find(ext => 
        ext.name.toLowerCase().includes('drag') || 
        ext.name.toLowerCase().includes('handle')
      );
      
      if (dragExtension) {
        console.log('✅ 找到拖拽扩展:', dragExtension);
      } else {
        console.log('⚠️ 未找到拖拽扩展');
      }
    }
  } else {
    console.log('⚠️ 未找到 TipTap 编辑器实例');
  }
  
  // 6. 尝试触发拖拽相关事件
  if (proseMirrorElements.length > 0 && proseMirrorElements[0].querySelector('p')) {
    const paragraph = proseMirrorElements[0].querySelector('p');
    console.log('🎯 尝试触发鼠标悬停事件...');
    
    // 触发 mouseenter 事件
    const mouseEnterEvent = new MouseEvent('mouseenter', {
      bubbles: true,
      cancelable: true,
      clientX: 100,
      clientY: 100
    });
    
    paragraph.dispatchEvent(mouseEnterEvent);
    
    setTimeout(() => {
      // 检查是否有新元素出现
      const newDragElements = document.querySelectorAll('[class*="drag"], [class*="handle"]');
      console.log(`🔍 悬停后发现的拖拽相关元素: ${newDragElements.length} 个`, newDragElements);
    }, 500);
  }
  
  console.log('✅ 快速检查完成！');
})();