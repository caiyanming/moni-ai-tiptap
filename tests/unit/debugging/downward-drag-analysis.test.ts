/**
 * 🔧 向下拖拽失败问题分析测试
 * 
 * 专门用于调试为什么向下拖拽失败而向上拖拽成功的问题
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

interface DragAnalysisResult {
  direction: 'up' | 'down'
  sourceIndex: number
  targetIndex: number
  expectedNewIndex: number
  actualResult: {
    beforeTexts: string[]
    afterTexts: string[]
    sourceMovedToIndex: number
  }
  isSuccess: boolean
  reason?: string
}

describe('向下拖拽失败分析', () => {
  let mockParagraphs: string[]
  
  beforeEach(() => {
    // 模拟标准测试文档的段落结构
    mockParagraphs = [
      '这是第一个段落，用于测试基础拖拽功能。',
      '这是第二个段落，包含格式化文本：**加粗**和*斜体*。', 
      '这是第三个段落，较长文本用于测试复杂拖拽场景的处理能力和性能表现。',
      '这是子标题下的第一个段落。',
      '这是子标题下的第二个段落，用于测试跨结构拖拽。'
    ]
  })

  /**
   * 模拟拖拽操作的逻辑验证
   */
  function simulateDragOperation(
    paragraphs: string[], 
    sourceIndex: number, 
    targetIndex: number,
    direction: 'up' | 'down'
  ): DragAnalysisResult {
    const beforeTexts = [...paragraphs]
    const sourceText = paragraphs[sourceIndex]
    
    // 模拟拖拽后的段落顺序
    const afterTexts = [...paragraphs]
    
    // 移除源段落
    afterTexts.splice(sourceIndex, 1)
    
    // 计算插入位置
    let insertIndex: number
    if (direction === 'up') {
      insertIndex = targetIndex
    } else {
      // 向下拖拽：插入到目标段落之后
      insertIndex = targetIndex + 1
      // 如果源索引小于目标索引，需要调整插入位置
      if (sourceIndex < targetIndex) {
        insertIndex = targetIndex // 因为已经移除了源段落，所以不需要+1
      }
    }
    
    // 插入到新位置
    afterTexts.splice(insertIndex, 0, sourceText)
    
    const actualNewIndex = afterTexts.indexOf(sourceText)
    
    // 验证拖拽结果
    const isSuccess = actualNewIndex !== sourceIndex && actualNewIndex !== -1
    
    return {
      direction,
      sourceIndex,
      targetIndex,
      expectedNewIndex: insertIndex,
      actualResult: {
        beforeTexts,
        afterTexts,
        sourceMovedToIndex: actualNewIndex
      },
      isSuccess,
      reason: !isSuccess ? '段落位置未发生变化或段落消失' : undefined
    }
  }

  /**
   * 模拟 DragTestHelper.verifyDragResult 的逻辑
   */
  function verifyDragResult(
    beforeTexts: string[],
    afterTexts: string[],
    sourceIndex: number,
    targetIndex: number
  ): { success: boolean; message: string; details?: Record<string, any> } {
    const sourceText = beforeTexts[sourceIndex]
    const newSourceIndex = afterTexts.indexOf(sourceText)
    
    if (newSourceIndex === -1) {
      return { success: false, message: '源段落在拖拽后消失' }
    }
    
    if (newSourceIndex === sourceIndex) {
      return { success: false, message: '段落位置未发生变化' }
    }
    
    return {
      success: true,
      message: `段落从位置${sourceIndex}移动到位置${newSourceIndex}`,
      details: { oldIndex: sourceIndex, newIndex: newSourceIndex }
    }
  }

  describe('向上拖拽分析 (已知成功)', () => {
    it('应该正确将第三个段落拖拽到第一个段落上方', () => {
      // 测试场景：将第三个段落（索引2）拖拽到第一个段落（索引0）上方
      const result = simulateDragOperation(mockParagraphs, 2, 0, 'up')
      
      expect(result.isSuccess).toBe(true)
      expect(result.actualResult.sourceMovedToIndex).toBe(0)
      expect(result.actualResult.afterTexts[0]).toBe(mockParagraphs[2])
      
      // 验证与DragTestHelper的一致性
      const verifyResult = verifyDragResult(
        result.actualResult.beforeTexts,
        result.actualResult.afterTexts,
        2,
        0
      )
      expect(verifyResult.success).toBe(true)
    })
  })

  describe('向下拖拽分析 (已知失败)', () => {
    it('应该正确将第一个段落拖拽到第三个段落下方', () => {
      // 测试场景：将第一个段落（索引0）拖拽到第三个段落（索引2）下方
      const result = simulateDragOperation(mockParagraphs, 0, 2, 'down')
      
      console.log('🔍 向下拖拽分析结果:')
      console.log('  源索引:', result.sourceIndex)
      console.log('  目标索引:', result.targetIndex) 
      console.log('  期望新索引:', result.expectedNewIndex)
      console.log('  实际新索引:', result.actualResult.sourceMovedToIndex)
      console.log('  拖拽前:', result.actualResult.beforeTexts.map((t, i) => `[${i}] ${t.slice(0, 20)}...`))
      console.log('  拖拽后:', result.actualResult.afterTexts.map((t, i) => `[${i}] ${t.slice(0, 20)}...`))
      
      expect(result.isSuccess).toBe(true)
      expect(result.actualResult.sourceMovedToIndex).toBe(2) // 应该移动到位置2
      expect(result.actualResult.afterTexts[2]).toBe(mockParagraphs[0])
      
      // 验证与DragTestHelper的一致性
      const verifyResult = verifyDragResult(
        result.actualResult.beforeTexts,
        result.actualResult.afterTexts,
        0,
        2
      )
      
      console.log('🧪 DragTestHelper验证结果:', verifyResult)
      
      if (!verifyResult.success) {
        console.error('❌ 验证失败原因:', verifyResult.message)
        
        // 进一步分析验证失败的原因
        const sourceText = result.actualResult.beforeTexts[0]
        const actualIndex = result.actualResult.afterTexts.indexOf(sourceText)
        const originalIndex = 0
        
        console.log('🔍 详细分析:')
        console.log('  源文本:', sourceText.slice(0, 30))
        console.log('  原始索引:', originalIndex)
        console.log('  实际索引:', actualIndex)
        console.log('  是否消失:', actualIndex === -1)
        console.log('  是否未移动:', actualIndex === originalIndex)
      }
      
      expect(verifyResult.success).toBe(true)
    })
    
    it('分析向下拖拽的逻辑差异', () => {
      // 对比向上和向下拖拽的逻辑差异
      const upResult = simulateDragOperation(mockParagraphs, 2, 0, 'up')
      const downResult = simulateDragOperation(mockParagraphs, 0, 2, 'down') 
      
      console.log('📊 拖拽方向对比:')
      console.log('向上拖拽:')
      console.log('  源索引 2 → 目标索引 0 → 实际位置', upResult.actualResult.sourceMovedToIndex)
      console.log('  成功:', upResult.isSuccess)
      
      console.log('向下拖拽:')
      console.log('  源索引 0 → 目标索引 2 → 实际位置', downResult.actualResult.sourceMovedToIndex)  
      console.log('  成功:', downResult.isSuccess)
      
      // 两种拖拽都应该成功
      expect(upResult.isSuccess).toBe(true)
      expect(downResult.isSuccess).toBe(true)
    })
  })

  describe('索引计算逻辑验证', () => {
    it('验证向下拖拽的插入位置计算', () => {
      // 场景1：源索引 < 目标索引
      const sourceIndex = 0
      const targetIndex = 2
      
      // 期望：移除源索引0的元素后，插入到目标索引2的位置
      // [0,1,2,3,4] → 移除0 → [1,2,3,4] → 插入到索引2 → [1,2,源,3,4]
      // 所以源元素应该在位置2
      
      const beforeTexts = [...mockParagraphs]
      const afterTexts = [...mockParagraphs]
      const sourceText = afterTexts[sourceIndex]
      
      // 移除源元素
      afterTexts.splice(sourceIndex, 1)
      // 插入到目标位置（因为源索引<目标索引，移除后目标位置不需要调整）
      afterTexts.splice(targetIndex, 0, sourceText)
      
      const newIndex = afterTexts.indexOf(sourceText)
      
      console.log('🧮 索引计算验证:')
      console.log('  源索引:', sourceIndex, '目标索引:', targetIndex)
      console.log('  移除前:', beforeTexts.map((_, i) => i))
      console.log('  移除后:', afterTexts.map((_, i) => i))
      console.log('  源元素新位置:', newIndex)
      console.log('  期望位置:', targetIndex)
      
      expect(newIndex).toBe(targetIndex)
      
      // 使用验证函数检查
      const verifyResult = verifyDragResult(beforeTexts, afterTexts, sourceIndex, targetIndex)
      console.log('  验证结果:', verifyResult)
      
      expect(verifyResult.success).toBe(true)
    })
  })

  describe('真实E2E场景模拟', () => {
    it('模拟E2E测试中的确切场景', () => {
      // E2E测试中的确切操作：将第一个段落拖拽到第三个段落下方
      // dragHelper.dragParagraph(paragraphs[0], paragraphs[2], { dragToPosition: 'below' })
      // verifyDragResult(beforeTexts, afterTexts, 0, 2)
      
      const beforeTexts = [...mockParagraphs]
      const sourceIndex = 0
      const targetIndex = 2
      
      // 模拟拖拽操作成功后的预期结果
      const expectedAfterTexts = [...mockParagraphs]
      const sourceText = expectedAfterTexts.splice(sourceIndex, 1)[0]
      expectedAfterTexts.splice(targetIndex, 0, sourceText)
      
      console.log('🎯 E2E场景模拟:')
      console.log('拖拽前段落顺序:')
      beforeTexts.forEach((text, i) => {
        console.log(`  [${i}] ${text.slice(0, 30)}...`)
      })
      
      console.log('预期拖拽后段落顺序:')
      expectedAfterTexts.forEach((text, i) => {
        console.log(`  [${i}] ${text.slice(0, 30)}...`)
      })
      
      // 验证拖拽结果
      const verifyResult = verifyDragResult(beforeTexts, expectedAfterTexts, sourceIndex, targetIndex)
      console.log('验证结果:', verifyResult)
      
      expect(verifyResult.success).toBe(true)
      
      // 检查源段落的新位置
      const sourceTextForCheck = beforeTexts[sourceIndex]
      const newIndex = expectedAfterTexts.indexOf(sourceTextForCheck)
      console.log(`源段落从位置 ${sourceIndex} 移动到位置 ${newIndex}`)
      
      expect(newIndex).toBe(2) // 应该移动到位置2
      expect(newIndex).not.toBe(sourceIndex) // 不应该还在原位置
    })
  })
})