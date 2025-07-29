/**
 * 快速验证拖拽功能基本可用性
 */

const { chromium } = require('playwright');

(async () => {
  console.log('🚀 快速验证拖拽功能...');
  
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // 访问页面
    await page.goto('http://localhost:3666/preview/Extensions/DragHandle', { 
      waitUntil: 'networkidle',
      timeout: 10000 
    });
    
    // 检查 iframe
    const iframe = page.frameLocator('iframe');
    
    // 等待内容加载
    await iframe.locator('p').first().waitFor({ timeout: 5000 });
    
    // 获取段落数量和内容
    const paragraphs = iframe.locator('p');
    const count = await paragraphs.count();
    const content = await paragraphs.allTextContents();
    
    console.log(`✅ 找到 ${count} 个段落`);
    console.log('📝 段落内容:', content);
    
    // 检查是否有拖拽相关属性
    const firstP = paragraphs.first();
    const isDraggable = await firstP.getAttribute('draggable');
    
    console.log(`🔍 第一段落 draggable 属性: ${isDraggable}`);
    
    // 简单的拖拽测试
    if (count >= 2) {
      const box1 = await paragraphs.nth(0).boundingBox();
      const box2 = await paragraphs.nth(1).boundingBox();
      
      if (box1 && box2) {
        console.log('🎯 尝试简单拖拽...');
        
        // 在第一段落中心点击并拖拽到第二段落
        await page.mouse.move(box1.x + box1.width/2, box1.y + box1.height/2);
        await page.mouse.down();
        await page.mouse.move(box2.x + box2.width/2, box2.y + box2.height + 10);
        await page.mouse.up();
        
        // 等待并检查内容变化
        await page.waitForTimeout(1000);
        const newContent = await paragraphs.allTextContents();
        
        const changed = JSON.stringify(content) !== JSON.stringify(newContent);
        console.log(`📊 拖拽结果: ${changed ? '✅ 成功改变顺序' : '❌ 未改变顺序'}`);
        
        if (changed) {
          console.log('   拖拽前:', content);
          console.log('   拖拽后:', newContent);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    await browser.close();
  }
})();