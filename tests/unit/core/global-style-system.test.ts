import { Editor } from '@tiptap/core'
import {
  type DocumentStylePreset,
  type MoniGlobalStyleAttributes,
  type SemanticStyle,
  addGlobalStyleAttributes,
  extractGlobalStyleAttributes,
  generateInlineStyleForNode,
  hasGlobalStyleAttributes,
} from '@tiptap/core'
import { Document } from '@tiptap/extension-document'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Text } from '@tiptap/extension-text'
import { beforeEach,describe, expect, it } from 'vitest'

describe('Global Style System', () => {
  let editor: Editor

  beforeEach(() => {
    editor = new Editor({
      extensions: [Document, Paragraph, Text],
    })
  })

  describe('addGlobalStyleAttributes', () => {
    it('应该返回完整的全局样式属性定义', () => {
      const attributes = addGlobalStyleAttributes()

      expect(attributes).toHaveProperty('moniGlobalFontFamily')
      expect(attributes).toHaveProperty('moniGlobalFontSize')
      expect(attributes).toHaveProperty('moniSemanticStyle')
      expect(attributes).toHaveProperty('moniStyleVersion')

      // 检查属性结构
      expect(attributes.moniGlobalFontFamily).toMatchObject({
        default: null,
        parseHTML: expect.any(Function),
        renderHTML: expect.any(Function),
      })

      expect(attributes.moniStyleVersion).toMatchObject({
        default: 1,
        parseHTML: expect.any(Function),
        renderHTML: expect.any(Function),
      })
    })

    it('应该正确解析HTML属性', () => {
      const attributes = addGlobalStyleAttributes()

      // 创建模拟HTML元素
      const mockElement = {
        getAttribute: (name: string) => {
          const attrs: Record<string, string> = {
            'data-moni-global-font-family': '"Inter", sans-serif',
            'data-moni-global-font-size': '18',
            'data-moni-semantic-style': '{"fontSize": 16, "fontWeight": 600}',
            'data-moni-style-version': '2',
          }
          return attrs[name] || null
        },
      } as HTMLElement

      expect(attributes.moniGlobalFontFamily.parseHTML(mockElement)).toBe('"Inter", sans-serif')
      expect(attributes.moniGlobalFontSize.parseHTML(mockElement)).toBe(18)
      expect(attributes.moniSemanticStyle.parseHTML(mockElement)).toBe('{"fontSize": 16, "fontWeight": 600}')
      expect(attributes.moniStyleVersion.parseHTML(mockElement)).toBe(2)
    })

    it('应该正确渲染HTML属性', () => {
      const attributes = addGlobalStyleAttributes()

      const testAttrs = {
        moniGlobalFontFamily: '"Arial", serif',
        moniGlobalFontSize: 20,
        moniSemanticStyle: '{"color": "#333"}',
        moniStyleVersion: 3,
      }

      expect(attributes.moniGlobalFontFamily.renderHTML(testAttrs)).toEqual({
        'data-moni-global-font-family': '"Arial", serif',
      })
      expect(attributes.moniGlobalFontSize.renderHTML(testAttrs)).toEqual({ 'data-moni-global-font-size': '20' })
      expect(attributes.moniSemanticStyle.renderHTML(testAttrs)).toEqual({
        'data-moni-semantic-style': '{"color": "#333"}',
      })
      expect(attributes.moniStyleVersion.renderHTML(testAttrs)).toEqual({ 'data-moni-style-version': '3' })
    })
  })

  describe('generateInlineStyleForNode', () => {
    it('应该生成空样式当没有样式属性时', () => {
      const attributes = {}
      const result = generateInlineStyleForNode(attributes)
      expect(result).toBeNull()
    })

    it('应该正确生成字体族样式', () => {
      const attributes = {
        moniGlobalFontFamily: '"Helvetica", sans-serif',
      }
      const result = generateInlineStyleForNode(attributes)
      expect(result).toBe('font-family: "Helvetica", sans-serif')
    })

    it('应该正确生成字体大小样式', () => {
      const attributes = {
        moniGlobalFontSize: 24,
      }
      const result = generateInlineStyleForNode(attributes)
      expect(result).toBe('font-size: 24px')
    })

    it('应该正确解析和应用语义样式', () => {
      const semanticStyle: SemanticStyle = {
        fontSize: 18,
        fontWeight: 700,
        color: '#f97316',
        marginBottom: 16,
        lineHeight: 1.4,
      }

      const attributes = {
        moniSemanticStyle: JSON.stringify(semanticStyle),
      }

      const result = generateInlineStyleForNode(attributes)
      expect(result).toContain('font-size: 18px')
      expect(result).toContain('font-weight: 700')
      expect(result).toContain('color: #f97316')
      expect(result).toContain('margin-bottom: 16px')
      expect(result).toContain('line-height: 1.4')
    })

    it('应该组合多个样式属性', () => {
      const attributes = {
        moniGlobalFontFamily: '"Inter", sans-serif',
        moniGlobalFontSize: 16,
        moniSemanticStyle: JSON.stringify({
          color: '#333',
          fontWeight: 500,
        }),
      }

      const result = generateInlineStyleForNode(attributes)
      expect(result).toContain('font-family: "Inter", sans-serif')
      expect(result).toContain('font-size: 16px')
      expect(result).toContain('color: #333')
      expect(result).toContain('font-weight: 500')
    })

    it('应该处理无效的语义样式JSON', () => {
      const attributes = {
        moniSemanticStyle: 'invalid json',
      }

      // 应该不抛出错误，只是忽略无效的语义样式
      const result = generateInlineStyleForNode(attributes)
      expect(result).toBeNull()
    })

    it('应该正确处理驼峰命名转换', () => {
      const attributes = {
        moniSemanticStyle: JSON.stringify({
          backgroundColor: '#f0f0f0',
          borderRadius: 8,
          marginTop: 12,
        }),
      }

      const result = generateInlineStyleForNode(attributes)
      expect(result).toContain('background-color: #f0f0f0')
      expect(result).toContain('border-radius: 8px')
      expect(result).toContain('margin-top: 12px')
    })
  })

  describe('hasGlobalStyleAttributes', () => {
    it('应该检测到存在的全局样式属性', () => {
      const attributes = {
        moniGlobalFontFamily: '"Arial", sans-serif',
        otherAttr: 'value',
      }

      expect(hasGlobalStyleAttributes(attributes)).toBe(true)
    })

    it('应该检测样式版本变化', () => {
      const attributes = {
        moniStyleVersion: 2,
      }

      expect(hasGlobalStyleAttributes(attributes)).toBe(true)
    })

    it('应该返回false当没有样式属性时', () => {
      const attributes = {
        otherAttr: 'value',
        moniStyleVersion: 1, // 默认值，不算
      }

      expect(hasGlobalStyleAttributes(attributes)).toBe(false)
    })
  })

  describe('extractGlobalStyleAttributes', () => {
    it('应该提取所有全局样式属性', () => {
      const attributes = {
        moniGlobalFontFamily: '"Times", serif',
        moniGlobalFontSize: 14,
        moniSemanticStyle: '{"color": "blue"}',
        moniStyleVersion: 5,
        otherAttr: 'ignored',
      }

      const result = extractGlobalStyleAttributes(attributes)

      expect(result).toEqual({
        moniGlobalFontFamily: '"Times", serif',
        moniGlobalFontSize: 14,
        moniSemanticStyle: '{"color": "blue"}',
        moniStyleVersion: 5,
      })
    })

    it('应该为缺失的属性提供默认值', () => {
      const attributes = {
        moniGlobalFontFamily: '"Georgia", serif',
      }

      const result = extractGlobalStyleAttributes(attributes)

      expect(result).toEqual({
        moniGlobalFontFamily: '"Georgia", serif',
        moniGlobalFontSize: null,
        moniSemanticStyle: null,
        moniStyleVersion: 1,
      })
    })
  })

  describe('Integration with Editor', () => {
    it('应该在段落中包含全局样式属性', () => {
      editor.commands.setContent('<p>Hello World</p>')

      const paragraph = editor.state.doc.firstChild
      expect(paragraph?.attrs).toHaveProperty('moniGlobalFontFamily')
      expect(paragraph?.attrs).toHaveProperty('moniGlobalFontSize')
      expect(paragraph?.attrs).toHaveProperty('moniSemanticStyle')
      expect(paragraph?.attrs).toHaveProperty('moniStyleVersion')
    })

    it('应该正确渲染带样式属性的段落', () => {
      editor.commands.setContent({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            attrs: {
              moniGlobalFontFamily: '"Roboto", sans-serif',
              moniGlobalFontSize: 18,
              moniSemanticStyle: JSON.stringify({
                color: '#f97316',
                fontWeight: 600,
              }),
            },
            content: [{ type: 'text', text: 'Styled paragraph' }],
          },
        ],
      })

      const html = editor.getHTML()

      // 检查数据属性是否存在（HTML编码后的）
      expect(html).toContain('data-moni-global-font-family')
      expect(html).toContain('data-moni-global-font-size')
      expect(html).toContain('data-moni-semantic-style')

      // 检查数据属性的值是否正确（HTML编码后的）
      expect(html).toContain('&quot;Roboto&quot;, sans-serif')
      expect(html).toContain('18')
      expect(html).toContain('#f97316')
      expect(html).toContain('600')

      // 检查是否包含行内样式（当前实现应该包含style属性）
      expect(html).toContain('style=')
      expect(html).toContain('font-family: &quot;Roboto&quot;, sans-serif')
      expect(html).toContain('font-size: 18px')
      expect(html).toContain('color: #f97316')
      expect(html).toContain('font-weight: 600')
    })
  })

  describe('CSS Property Formatting', () => {
    it('应该为数字属性添加px单位', () => {
      const attributes = {
        moniSemanticStyle: JSON.stringify({
          fontSize: 16,
          marginTop: 24,
          padding: 12,
          lineHeight: 1.5, // 无单位
          fontWeight: 700, // 无单位
        }),
      }

      const result = generateInlineStyleForNode(attributes)
      expect(result).toContain('font-size: 16px')
      expect(result).toContain('margin-top: 24px')
      expect(result).toContain('padding: 12px')
      expect(result).toContain('line-height: 1.5')
      expect(result).toContain('font-weight: 700')
    })

    it('应该保持字符串值不变', () => {
      const attributes = {
        moniSemanticStyle: JSON.stringify({
          color: '#f97316',
          fontFamily: '"Inter", sans-serif',
          textAlign: 'center',
        }),
      }

      const result = generateInlineStyleForNode(attributes)
      expect(result).toContain('color: #f97316')
      expect(result).toContain('font-family: "Inter", sans-serif')
      expect(result).toContain('text-align: center')
    })
  })
})
