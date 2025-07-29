/**
 * 🔍 调试拖拽手柄元素
 * 直接检查页面上的所有元素
 */
const { chromium } = require('@playwright/test');

(async () => {
  console.log('🔍 调试拖拽手柄...');
  
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const page = await browser.newPage();
  
  try {
    // 测试两个页面
    const pages = [
      'http://localhost:3666/preview/Extensions/DragHandle',
      'http://localhost:3666/preview/Experiments/GlobalDragHandle'
    ];
    
    for (const url of pages) {
      console.log(`\n📍 测试页面: ${url}`);
      
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      // 等待加载
      await page.locator('iframe').waitFor({ timeout: 10000 });
      const iframe = page.frameLocator('iframe');
      await iframe.locator('.ProseMirror').waitFor({ timeout: 5000 });
      
      console.log('📝 页面加载完成，检查所有元素...');
      
      // 检查页面上的所有元素
      const allElements = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        return elements.map(el => ({
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          draggable: el.draggable,
          visible: el.offsetParent !== null,
          style: {
            position: getComputedStyle(el).position,
            cursor: getComputedStyle(el).cursor,
            display: getComputedStyle(el).display
          }
        })).filter(el => 
          el.className.includes('drag') || 
          el.className.includes('handle') ||
          el.draggable === true ||
          el.style.cursor === 'grab' ||
          el.style.cursor === 'move'
        );
      });
      
      console.log('🔍 拖拽相关元素:', allElements);
      
      // 检查 iframe 内的元素
      const iframeElements = await iframe.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        return elements.map(el => ({
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          draggable: el.draggable,
          visible: el.offsetParent !== null,
          style: {
            position: getComputedStyle(el).position,
            cursor: getComputedStyle(el).cursor,
            display: getComputedStyle(el).display
          }
        })).filter(el => 
          el.className.includes('drag') || 
          el.className.includes('handle') ||
          el.draggable === true ||
          el.style.cursor === 'grab' ||
          el.style.cursor === 'move'
        );
      });
      
      console.log('🔍 iframe 内拖拽相关元素:', iframeElements);
      
      // 检查是否有隐藏的拖拽手柄
      const hiddenElements = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'));
        return elements.filter(el => 
          el.className.includes('global-drag-handle') ||
          el.className.includes('drag-handle')
        ).map(el => ({
          tagName: el.tagName,
          className: el.className,
          visible: el.offsetParent !== null,
          style: getComputedStyle(el).cssText
        }));
      });
      
      console.log('🔍 所有拖拽手柄元素（包括隐藏）:', hiddenElements);
      
      // 尝试触发鼠标移动事件
      console.log('🎯 触发鼠标移动事件...');
      const paragraphs = iframe.locator('p');
      const firstP = paragraphs.first();
      
      if (await firstP.count() > 0) {
        await firstP.hover();
        await page.waitForTimeout(1000);
        
        // 再次检查是否有新元素出现
        const afterHoverElements = await page.evaluate(() => {
          return Array.from(document.querySelectorAll('.global-drag-handle')).map(el => ({
            visible: el.offsetParent !== null,
            left: el.style.left,
            top: el.style.top,
            draggable: el.draggable
          }));
        });
        
        console.log('🔍 悬停后的拖拽手柄:', afterHoverElements);
      }
    }
    
  } catch (error) {
    console.error('❌ 调试失败:', error.message);
  } finally {
    await browser.close();
  }
})();