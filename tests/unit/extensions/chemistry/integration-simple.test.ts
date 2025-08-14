import { Editor } from '@tiptap/core'
import { Document } from '@tiptap/extension-document'
import { Heading } from '@tiptap/extension-heading'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Text } from '@tiptap/extension-text'
import { beforeEach, describe, expect, it } from 'vitest'

import { BlockChemical } from '../../../../packages/extension-chemistry/src/extensions/BlockChemical.js'
import { InlineChemical } from '../../../../packages/extension-chemistry/src/extensions/InlineChemical.js'
import { UniqueID } from '../../../../packages/extension-unique-id/src/unique-id.js'

/**
 * 化学扩展简化集成测试 (模仿数学扩展)
 * 专注于核心功能验证，与数学扩展测试对等
 */

describe('Chemistry Extension - Simplified Integration', () => {
  let editor: Editor

  beforeEach(() => {
    editor = new Editor({
      extensions: [
        Document,
        Paragraph,
        Text,
        Heading,
        // 🔥 UniqueID 扩展是 moni block 机制的核心
        UniqueID.configure({
          attributeName: 'moniBlockId',
          types: ['paragraph', 'inlineChemical', 'blockChemical'],
          generateID: () => crypto.randomUUID(),
        }),
        InlineChemical.configure({
          katexOptions: {
            trust: true, // 🔥 mhchem 必需
            throwOnError: false,
          },
        }),
        BlockChemical.configure({
          katexOptions: {
            displayMode: true,
            trust: true, // 🔥 mhchem 必需
            throwOnError: false,
          },
        }),
      ],
      content: '',
    })
  })

  describe('🎓 Teacher-AI Collaboration Scenarios', () => {
    it('AI 应该能通过 moniBlockId 准确定位和修改教师的化学方程式', () => {
      // 📝 场景：教师创建一个化学反应
      editor.commands.setContent(`
        <p>燃烧反应：</p>
      `)

      editor.commands.insertBlockChemical({
        chemical: '\\ce{CH4 + O2 -> CO2 + H2O}',
      })

      // 🤖 AI 通过 Block Stream 扩展化学方程式，配平方程式
      let chemicalBlockId: string = ''
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'blockChemical') {
          chemicalBlockId = node.attrs.moniBlockId

          // AI 更新：配平化学方程式
          editor.commands.updateBlockChemical({
            pos,
            chemical: '\\ce{CH4 + 2O2 -> CO2 + 2H2O}',
          })
          return false
        }
      })

      // ✅ 验证：AI 成功更新了化学方程式，且 Block ID 保持不变
      let updatedNode: any = null
      editor.state.doc.descendants(node => {
        if (node.type.name === 'blockChemical') {
          updatedNode = node
          return false
        }
      })

      expect(updatedNode).toBeTruthy()
      expect(updatedNode.attrs.moniBlockId).toBe(chemicalBlockId)
      expect(updatedNode.attrs.chemical).toContain('2O2') // 配平后的系数
      expect(updatedNode.attrs.chemical).toContain('2H2O') // 配平后的系数
    })

    it('应该支持混合文档中多个化学公式的独立操作', () => {
      // 📝 场景：创建包含多个化学公式的文档
      editor.commands.setContent(`
        <p>酸碱反应：</p>
        <div data-type="block-chemical" data-chemical="\\ce{HCl + NaOH -> NaCl + H2O}"></div>
        <p>氧化还原反应：</p>
        <div data-type="block-chemical" data-chemical="\\ce{Zn + CuSO4 -> ZnSO4 + Cu}"></div>
        <p>行内化学式：<span data-type="inline-chemical" data-chemical="\\ce{H2O}"></span></p>
      `)

      // 🔍 验证：文档包含预期数量的化学节点
      const blockChemicals: any[] = []
      const inlineChemicals: any[] = []

      editor.state.doc.descendants(node => {
        if (node.type.name === 'blockChemical') {
          blockChemicals.push(node)
        } else if (node.type.name === 'inlineChemical') {
          inlineChemicals.push(node)
        }
      })

      expect(blockChemicals).toHaveLength(2)
      expect(inlineChemicals).toHaveLength(1)

      // 验证各自的内容
      expect(blockChemicals[0].attrs.chemical).toContain('HCl')
      expect(blockChemicals[1].attrs.chemical).toContain('Zn')
      expect(inlineChemicals[0].attrs.chemical).toContain('H2O')
    })

    it('AI 应该能在复杂文档中精确定位和修改特定化学公式', () => {
      // 📝 场景：复杂的化学教学文档
      editor.commands.setContent(`
        <h1>化学反应类型</h1>
        <p>1. 化合反应：<span data-type="inline-chemical" data-chemical="\\ce{A + B -> AB}"></span></p>
        <p>2. 分解反应：<span data-type="inline-chemical" data-chemical="\\ce{AB -> A + B}"></span></p>
        <p>示例反应：</p>
        <div data-type="block-chemical" data-chemical="\\ce{H2 + Cl2 -> HCl}"></div>
        <p>更多内容...</p>
      `)

      // 🎯 AI 精确定位第二个行内公式（分解反应）
      let targetNodeId: string = ''
      let foundCount = 0

      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'inlineChemical') {
          foundCount += 1
          if (foundCount === 2) {
            // 第二个行内化学公式
            targetNodeId = node.attrs.moniBlockId

            // AI 更新为更具体的分解反应示例
            editor.commands.updateInlineChemical({
              pos,
              chemical: '\\ce{2H2O2 -> 2H2O + O2}',
            })
            return false
          }
        }
      })

      // ✅ 验证：只有目标公式被更新，其他保持不变
      const inlineChemicals: any[] = []
      editor.state.doc.descendants(node => {
        if (node.type.name === 'inlineChemical') {
          inlineChemicals.push({
            chemical: node.attrs.chemical,
            moniBlockId: node.attrs.moniBlockId,
          })
        }
      })

      expect(inlineChemicals).toHaveLength(2)

      const targetNode = inlineChemicals.find(n => n.moniBlockId === targetNodeId)
      const otherNode = inlineChemicals.find(n => n.moniBlockId !== targetNodeId)

      expect(targetNode.chemical).toBe('\\ce{2H2O2 -> 2H2O + O2}') // 更新后的
      expect(otherNode.chemical).toBe('\\ce{A + B -> AB}') // 保持原样
    })
  })

  describe('🛡️ Production-Ready Error Handling', () => {
    it('应该优雅处理无效的 mhchem 语法', () => {
      // 插入无效语法
      editor.commands.insertInlineChemical({
        chemical: '\\invalid{syntax}',
      })

      // 验证节点仍然创建，但渲染会降级处理
      let chemicalNode: any = null
      editor.state.doc.descendants(node => {
        if (node.type.name === 'inlineChemical') {
          chemicalNode = node
          return false
        }
      })

      expect(chemicalNode).toBeTruthy()
      expect(chemicalNode.attrs.chemical).toBe('\\invalid{syntax}')
      expect(chemicalNode.attrs.moniBlockId).toBeTruthy() // moni 属性仍然存在
    })

    it('应该正确处理空文档中的化学公式操作', () => {
      // 在空文档中插入化学公式
      expect(editor.state.doc.textContent).toBe('')

      const success = editor.commands.insertBlockChemical({
        chemical: '\\ce{H2SO4}',
      })

      expect(success).toBe(true)

      // 验证插入成功
      let chemicalNode: any = null
      editor.state.doc.descendants(node => {
        if (node.type.name === 'blockChemical') {
          chemicalNode = node
          return false
        }
      })

      expect(chemicalNode).toBeTruthy()
      expect(chemicalNode.attrs.chemical).toBe('\\ce{H2SO4}')
    })

    it('应该正确处理并发的化学公式修改操作', () => {
      // 创建初始文档
      editor.commands.setContent(`
        <div data-type="block-chemical" data-chemical="\\ce{NaCl}"></div>
        <div data-type="block-chemical" data-chemical="\\ce{KBr}"></div>
      `)

      // 模拟并发修改
      const modifications: Array<{ pos: number; chemical: string }> = []

      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'blockChemical') {
          modifications.push({
            pos,
            chemical: node.attrs.chemical === '\\ce{NaCl}' ? '\\ce{NaCl (s)}' : '\\ce{KBr (s)}',
          })
        }
      })

      // 执行所有修改
      modifications.forEach(mod => {
        editor.commands.updateBlockChemical(mod)
      })

      // 验证所有修改都成功应用
      const chemicalNodes: any[] = []
      editor.state.doc.descendants(node => {
        if (node.type.name === 'blockChemical') {
          chemicalNodes.push(node.attrs.chemical)
        }
      })

      expect(chemicalNodes).toHaveLength(2)
      expect(chemicalNodes).toContain('\\ce{NaCl (s)}')
      expect(chemicalNodes).toContain('\\ce{KBr (s)}')
    })
  })

  describe('📊 Document Structure Integrity', () => {
    it('混合内容文档的完整性验证', () => {
      // 创建包含多种内容类型的复杂文档
      editor.commands.setContent(`
        <h2>化学实验报告</h2>
        <p>实验目的：研究酸碱中和反应</p>
        <p>理论依据：<span data-type="inline-chemical" data-chemical="\\ce{HCl + NaOH -> NaCl + H2O}"></span></p>
        <div data-type="block-chemical" data-chemical="\\ce{HCl (aq) + NaOH (aq) -> NaCl (aq) + H2O (l)}"></div>
        <p>实验结果：...</p>
      `)

      // 验证文档结构完整性
      const documentStructure = {
        headings: 0,
        paragraphs: 0,
        inlineChemicals: 0,
        blockChemicals: 0,
        text: '',
      }

      editor.state.doc.descendants(node => {
        switch (node.type.name) {
          case 'heading':
            documentStructure.headings += 1
            break
          case 'paragraph':
            documentStructure.paragraphs += 1
            break
          case 'inlineChemical':
            documentStructure.inlineChemicals += 1
            break
          case 'blockChemical':
            documentStructure.blockChemicals += 1
            break
          case 'text':
            documentStructure.text += node.textContent
            break
          default:
            // Handle other node types
            break
        }
      })

      expect(documentStructure.headings).toBeGreaterThan(0)
      expect(documentStructure.paragraphs).toBe(3)
      expect(documentStructure.inlineChemicals).toBe(1)
      expect(documentStructure.blockChemicals).toBe(1)
      expect(documentStructure.text).toContain('化学实验报告')
    })
  })

  describe('🚀 Performance and Scale', () => {
    it('应该能处理包含大量化学公式的文档', () => {
      // 创建包含多个化学公式的文档
      let content = '<h1>化学公式集合</h1>'

      const formulas = ['\\ce{H2SO4}', '\\ce{NaOH}', '\\ce{CaCO3}', '\\ce{NH4Cl}', '\\ce{KMnO4}']

      formulas.forEach((formula, index) => {
        content += `<p>公式 ${index + 1}: <span data-type="inline-chemical" data-chemical="${formula}"></span></p>`
      })

      editor.commands.setContent(content)

      // 验证所有公式都被正确创建
      const chemicalNodes: any[] = []
      editor.state.doc.descendants(node => {
        if (node.type.name === 'inlineChemical') {
          chemicalNodes.push({
            chemical: node.attrs.chemical,
            moniBlockId: node.attrs.moniBlockId,
          })
        }
      })

      expect(chemicalNodes).toHaveLength(formulas.length)

      // 验证每个公式都有唯一的 moniBlockId
      const blockIds = chemicalNodes.map(n => n.moniBlockId)
      const uniqueBlockIds = [...new Set(blockIds)]
      expect(uniqueBlockIds).toHaveLength(formulas.length)

      // 验证公式内容正确
      formulas.forEach(formula => {
        expect(chemicalNodes.some(n => n.chemical === formula)).toBe(true)
      })
    })
  })
})
