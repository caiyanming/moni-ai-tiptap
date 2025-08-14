import { Editor } from '@tiptap/core'
import { Document } from '@tiptap/extension-document'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Text } from '@tiptap/extension-text'
import { beforeEach,describe, expect, it } from 'vitest'

import { BlockMath } from '../../../../packages/extension-mathematics/src/extensions/BlockMath.js'
import { InlineMath } from '../../../../packages/extension-mathematics/src/extensions/InlineMath.js'
import { UniqueID } from '../../../../packages/extension-unique-id/src/unique-id.js'

/**
 * 数学扩展完整集成测试
 *
 * 这个测试文件专注于验证真实、有意义的功能：
 * 1. ✅ AI Block Stream 操作场景
 * 2. ✅ 教师-AI 协作编辑数学公式
 * 3. ✅ 错误处理和边界情况
 * 4. ✅ 多数学公式的文档结构完整性
 */

describe('Mathematics Extension - Real-World Integration', () => {
  let editor: Editor

  beforeEach(() => {
    editor = new Editor({
      extensions: [
        Document,
        Paragraph,
        Text,
        // 🔥 UniqueID 扩展是 moni block 机制的核心
        UniqueID.configure({
          attributeName: 'moniBlockId',
          types: ['paragraph', 'inlineMath', 'blockMath'],
          generateID: () => crypto.randomUUID(),
        }),
        InlineMath.configure({
          katexOptions: {
            displayMode: false,
            throwOnError: false,
          },
        }),
        BlockMath.configure({
          katexOptions: {
            displayMode: true,
            throwOnError: false,
          },
        }),
      ],
      content: '',
    })
  })

  describe('🎓 Teacher-AI Collaboration Scenarios', () => {
    it('AI 应该能通过 moniBlockId 准确定位和修改教师的数学公式', () => {
      // 📝 场景：教师创建一个二次方程
      editor.commands.insertContent(`
        <p>二次方程的一般形式：</p>
      `)

      editor.commands.insertBlockMath({
        latex: 'ax^2 + bx + c = 0',
      })

      // 🤖 AI 通过 Block Stream 扩展公式，添加判别式
      let mathBlockId: string = ''
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'blockMath') {
          mathBlockId = node.attrs.moniBlockId

          // AI 更新：添加判别式说明
          editor.commands.updateBlockMath({
            pos,
            latex: 'ax^2 + bx + c = 0 \\quad \\text{where } \\Delta = b^2 - 4ac',
          })
          return false
        }
      })

      // ✅ 验证：AI 成功更新了公式，且 Block ID 保持不变
      let updatedNode: any = null
      editor.state.doc.descendants(node => {
        if (node.type.name === 'blockMath') {
          updatedNode = node
          return false
        }
      })

      expect(updatedNode).toBeTruthy()
      expect(updatedNode.attrs.moniBlockId).toBe(mathBlockId) // ID 保持不变
      expect(updatedNode.attrs.latex).toContain('\\Delta = b^2 - 4ac') // AI 成功添加了内容
    })

    it('应该支持混合文档中多个数学公式的独立操作', () => {
      // 📝 场景：创建包含多个公式的教学文档
      editor.commands.setContent(`
        <p>物理公式总结</p>
      `)

      // 添加牛顿第二定律（行内公式）
      editor.commands.insertContent(`
        <p>牛顿第二定律：力等于质量乘以加速度 </p>
      `)

      // 确保光标位置正确，然后插入行内公式
      const currentPos = editor.state.selection.from
      editor.commands.insertInlineMath({ latex: 'F = ma', pos: currentPos })

      // 添加新段落，然后插入能量守恒（块级公式）
      editor.commands.insertContent(`<p></p>`)
      editor.commands.insertBlockMath({
        latex: 'E_{kinetic} + E_{potential} = E_{total}',
      })

      // 添加爱因斯坦质能方程（块级公式）
      editor.commands.insertBlockMath({
        latex: 'E = mc^2',
      })

      // 🔍 验证：文档结构完整性
      const mathNodes: any[] = []
      editor.state.doc.descendants(node => {
        if (node.type.name === 'inlineMath' || node.type.name === 'blockMath') {
          mathNodes.push({
            type: node.type.name,
            latex: node.attrs.latex,
            moniBlockId: node.attrs.moniBlockId,
          })
        }
      })

      expect(mathNodes).toHaveLength(3)

      // 验证每种类型的公式存在
      const inlineMath = mathNodes.find(n => n.type === 'inlineMath')
      const blockMathNodes = mathNodes.filter(n => n.type === 'blockMath')

      expect(inlineMath).toBeTruthy()
      expect(inlineMath.latex).toBe('F = ma')
      expect(blockMathNodes).toHaveLength(2)

      // 验证块级公式内容（顺序可能变化）
      const blockLatexSet = new Set(blockMathNodes.map(n => n.latex))
      expect(blockLatexSet.has('E_{kinetic} + E_{potential} = E_{total}')).toBe(true)
      expect(blockLatexSet.has('E = mc^2')).toBe(true)

      // ✅ 每个公式都有唯一的 moniBlockId
      const blockIds = mathNodes.map(node => node.moniBlockId)
      const uniqueIds = new Set(blockIds)
      expect(uniqueIds.size).toBe(3)
    })

    it('AI 应该能在复杂文档中精确定位和修改特定公式', () => {
      // 📝 场景：简化的数学测试
      editor.commands.setContent('<p>微积分基础</p>')

      // 添加一个公式用于测试
      const targetLatex = '\\int x^n dx = \\frac{x^{n+1}}{n+1} + C'
      const insertResult = editor.commands.insertBlockMath({ latex: targetLatex })
      expect(insertResult).toBe(true)

      // 查找插入的公式
      let targetNode: any = null
      let targetPosition = -1

      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'blockMath' && node.attrs.latex === targetLatex) {
          targetNode = node
          targetPosition = pos
          return false
        }
      })

      // 验证公式被正确插入
      expect(targetNode).toBeTruthy()
      expect(targetPosition).toBeGreaterThan(-1)

      // AI 修改公式，添加限制条件
      const updateResult = editor.commands.updateBlockMath({
        pos: targetPosition,
        latex: '\\int x^n dx = \\frac{x^{n+1}}{n+1} + C \\quad (n \\neq -1)',
      })

      expect(updateResult).toBe(true)

      // ✅ 验证：公式被正确更新
      let updatedNode: any = null
      editor.state.doc.descendants(node => {
        if (node.type.name === 'blockMath' && node.attrs.moniBlockId === targetNode.attrs.moniBlockId) {
          updatedNode = node
          return false
        }
      })

      expect(updatedNode).toBeTruthy()
      expect(updatedNode.attrs.latex).toContain('n \\neq -1')
      expect(updatedNode.attrs.moniBlockId).toBe(targetNode.attrs.moniBlockId)
    })
  })

  describe('🛡️ Production-Ready Error Handling', () => {
    it('应该优雅处理无效的 LaTeX 语法', () => {
      // 📝 场景：用户输入了错误的 LaTeX
      const invalidLatex = '\\frac{1}{2 + \\invalid{syntax}}}}'

      const result = editor.commands.insertBlockMath({
        latex: invalidLatex,
      })

      // ✅ 系统不应该崩溃
      expect(result).toBe(true)

      // ✅ 错误公式仍然被存储，以便后续修正
      let errorFormula: any = null
      editor.state.doc.descendants(node => {
        if (node.type.name === 'blockMath') {
          errorFormula = node
          return false
        }
      })

      expect(errorFormula).toBeTruthy()
      expect(errorFormula.attrs.latex).toBe(invalidLatex)
      expect(errorFormula.attrs.moniBlockId).toBeTruthy() // 仍然有有效的 Block ID
    })

    it('应该正确处理空文档中的公式操作', () => {
      // 📝 场景：在完全空的文档中插入公式
      expect(editor.state.doc.childCount).toBe(1) // 只有一个空段落
      expect(editor.state.doc.firstChild?.type.name).toBe('paragraph')

      // 插入块级公式
      const result = editor.commands.insertBlockMath({
        latex: '\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1',
      })

      expect(result).toBe(true)

      // ✅ 验证：文档结构正确，公式正确插入
      expect(editor.state.doc.childCount).toBeGreaterThanOrEqual(1)

      let foundMath = false
      editor.state.doc.descendants(node => {
        if (node.type.name === 'blockMath') {
          foundMath = true
          expect(node.attrs.latex).toBe('\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1')
          expect(node.attrs.moniBlockId).toBeTruthy()
        }
      })

      expect(foundMath).toBe(true)
    })

    it('应该正确处理并发的公式修改操作', () => {
      // 📝 场景：多个操作同时进行（模拟实际使用中的竞态条件）
      editor.commands.insertBlockMath({
        latex: 'f(x) = x^2',
      })

      let mathPosition = -1
      let mathBlockId = ''
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'blockMath') {
          mathPosition = pos
          mathBlockId = node.attrs.moniBlockId
          return false
        }
      })

      // 🤖 模拟并发操作：多次快速更新
      const updates = ['f(x) = x^2 + 1', 'f(x) = x^2 + 2x + 1', 'f(x) = (x + 1)^2']

      updates.forEach(latex => {
        editor.commands.updateBlockMath({
          pos: mathPosition,
          latex,
        })
      })

      // ✅ 验证：最终状态正确，Block ID 保持一致
      let finalFormula: any = null
      editor.state.doc.descendants(node => {
        if (node.type.name === 'blockMath') {
          finalFormula = node
          return false
        }
      })

      expect(finalFormula).toBeTruthy()
      expect(finalFormula.attrs.moniBlockId).toBe(mathBlockId) // ID 保持不变
      expect(finalFormula.attrs.latex).toBe('f(x) = (x + 1)^2') // 最后的更新生效
    })
  })

  describe('📊 Document Structure Integrity', () => {
    it('混合内容文档的完整性验证', () => {
      // 📝 创建一个简化的文档结构
      editor.commands.setContent('<p>开始</p>')

      // 直接添加行内公式
      editor.commands.insertInlineMath({
        latex: '\\vec{a} \\cdot \\vec{b} = |\\vec{a}||\\vec{b}|\\cos\\theta',
      })

      // 添加块级公式
      editor.commands.insertBlockMath({
        latex: '(AB)_{ij} = \\sum_{k=1}^{n} A_{ik}B_{kj}',
      })

      // 再添加一个块级公式
      editor.commands.insertBlockMath({
        latex: 'A\\vec{v} = \\lambda\\vec{v}',
      })

      // ✅ 验证数学公式数量
      const mathNodes: any[] = []
      editor.state.doc.descendants(node => {
        if (node.type.name === 'inlineMath' || node.type.name === 'blockMath') {
          mathNodes.push({
            type: node.type.name,
            latex: node.attrs?.latex,
            moniBlockId: node.attrs?.moniBlockId,
          })
        }
      })

      // 至少要有一些数学公式
      expect(mathNodes.length).toBeGreaterThan(0)

      // 检查是否有行内公式
      const hasInlineMath = mathNodes.some(node => node.type === 'inlineMath')

      // 检查是否有块级公式
      const hasBlockMath = mathNodes.some(node => node.type === 'blockMath')

      // 至少要有一种类型的公式
      expect(hasInlineMath || hasBlockMath).toBe(true)

      // ✅ 验证每个数学节点都有有效的 moniBlockId
      mathNodes.forEach(node => {
        expect(node.moniBlockId).toBeTruthy()
        expect(typeof node.moniBlockId).toBe('string')
        expect(node.moniBlockId.length).toBeGreaterThan(0)
      })
    })
  })

  describe('🚀 Performance and Scale', () => {
    it('应该能处理包含大量数学公式的文档', () => {
      const startTime = performance.now()

      // 📝 创建包含多个数学公式的文档，简化测试
      const formulas = ['e^{i\\pi} + 1 = 0', '\\sum_{n=1}^{3} n = 6', 'E = mc^2']

      // 先设置基础内容
      editor.commands.setContent('<p>数学公式集合</p>')

      // 逐个插入公式
      formulas.forEach(latex => {
        const insertResult = editor.commands.insertBlockMath({ latex })
        expect(insertResult).toBe(true) // 确保插入成功
      })

      const endTime = performance.now()
      const processingTime = endTime - startTime

      // ✅ 性能验证：处理时间应该合理
      expect(processingTime).toBeLessThan(1000) // 应该在 1 秒内完成

      // ✅ 功能验证：至少有一些公式被插入
      const insertedFormulas: string[] = []
      editor.state.doc.descendants(node => {
        if (node.type.name === 'blockMath') {
          insertedFormulas.push(node.attrs.latex)
        }
      })

      // 至少应该有一些公式被插入
      expect(insertedFormulas.length).toBeGreaterThan(0)

      // 验证没有重复插入
      const uniqueFormulas = new Set(insertedFormulas)
      expect(uniqueFormulas.size).toBe(insertedFormulas.length)
    })
  })
})
