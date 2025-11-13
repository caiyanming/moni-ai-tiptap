import type { ExtensionAttribute } from '@tiptap/core'
import { Editor, getRenderedAttributes } from '@tiptap/core'
import { Document } from '@tiptap/extension-document'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Text } from '@tiptap/extension-text'
import { beforeEach, describe, expect, it } from 'vitest'

describe('DOM 属性命名规范测试', () => {
  let editor: Editor

  beforeEach(() => {
    editor = new Editor({
      extensions: [Document, Paragraph, Text],
      content: '<p data-moni-block-id="test-block-123">测试段落</p>',
    })
  })

  describe('getRenderedAttributes 函数', () => {
    it('应该为 moniBlockId 属性生成正确的 kebab-case HTML 属性名', () => {
      // 获取第一个段落节点
      const paragraphNode = editor.state.doc.firstChild!

      // 模拟扩展属性定义
      const mockExtensionAttributes: ExtensionAttribute[] = [
        {
          type: 'paragraph',
          name: 'moniBlockId',
          attribute: {
            default: 'test-id',
            rendered: true,
            renderHTML: attributes => {
              if (attributes.moniBlockId) {
                return { 'data-moni-block-id': attributes.moniBlockId }
              }
              return {}
            },
          },
        },
      ]

      // 测试正常情况：有 renderHTML 方法
      const renderedAttributes = getRenderedAttributes(paragraphNode, mockExtensionAttributes)

      // 应该生成正确的 kebab-case 属性名
      expect(renderedAttributes).toHaveProperty('data-moni-block-id')
      expect(renderedAttributes).not.toHaveProperty('moniBlockId')
      expect(renderedAttributes).not.toHaveProperty('data-moniBlockId')
    })

    it('应该处理缺少 renderHTML 方法的属性（修复后应该正确转换）', () => {
      const paragraphNode = editor.state.doc.firstChild!

      // 模拟缺少 renderHTML 方法的扩展属性定义
      const problematicExtensionAttributes: ExtensionAttribute[] = [
        {
          type: 'paragraph',
          name: 'moniBlockId', // 驼峰命名
          attribute: {
            default: 'test-id',
            rendered: true,
            // 注意：这里故意缺少 renderHTML 方法
            // renderHTML: undefined
          },
        },
      ]

      const renderedAttributes = getRenderedAttributes(paragraphNode, problematicExtensionAttributes)

      console.log('修复后生成的属性:', renderedAttributes)

      // 🎉 修复后的行为：应该自动转换为正确的 kebab-case 格式
      expect(renderedAttributes).toHaveProperty('data-moni-block-id')
      expect(renderedAttributes).not.toHaveProperty('moniBlockId')
      expect(renderedAttributes).not.toHaveProperty('data-moniBlockId')

      // 验证值也正确传递
      expect(renderedAttributes['data-moni-block-id']).toBe('test-block-123')
    })

    it('应该正确转换各种 moni 属性名格式', () => {
      const paragraphNode = editor.state.doc.firstChild!

      // 测试多种 moni 属性的转换
      const multipleProblematicAttributes: ExtensionAttribute[] = [
        {
          type: 'paragraph',
          name: 'moniBlockId',
          attribute: { default: 'block-123', rendered: true },
        },
        {
          type: 'paragraph',
          name: 'moniParentId',
          attribute: { default: 'parent-456', rendered: true },
        },
      ]

      const renderedAttributes = getRenderedAttributes(paragraphNode, multipleProblematicAttributes)

      console.log('多属性转换结果:', renderedAttributes)

      // 验证所有属性都正确转换为 kebab-case
      expect(renderedAttributes).toHaveProperty('data-moni-block-id', 'test-block-123')
      expect(renderedAttributes).toHaveProperty('data-moni-parent-id', null) // 从节点 attrs 获取

      // 验证没有驼峰命名的属性
      expect(renderedAttributes).not.toHaveProperty('moniBlockId')
      expect(renderedAttributes).not.toHaveProperty('moniParentId')
      expect(renderedAttributes).not.toHaveProperty('moniStreamType')
    })

    it('应该正确处理多个 data 属性', () => {
      const paragraphNode = editor.state.doc.firstChild!

      const multipleDataAttributes: ExtensionAttribute[] = [
        {
          type: 'paragraph',
          name: 'moniBlockId',
          attribute: {
            default: 'test-id',
            rendered: true,
            renderHTML: attributes => ({ 'data-moni-block-id': attributes.moniBlockId }),
          },
        },
        {
          type: 'paragraph',
          name: 'moniParentId',
          attribute: {
            default: null,
            rendered: true,
            renderHTML: attributes => ({ 'data-moni-parent-id': attributes.moniParentId }),
          },
        },
      ]

      const renderedAttributes = getRenderedAttributes(paragraphNode, multipleDataAttributes)

      // 所有属性都应该使用正确的 kebab-case 格式
      expect(renderedAttributes).toHaveProperty('data-moni-block-id')
      expect(renderedAttributes).toHaveProperty('data-moni-parent-id')

      // 不应该有驼峰命名的属性
      expect(renderedAttributes).not.toHaveProperty('moniBlockId')
      expect(renderedAttributes).not.toHaveProperty('moniParentId')
    })
  })

  describe('React 组件集成测试', () => {
    it('应该生成 React 兼容的 DOM 属性', () => {
      // 设置节点属性
      const attrs = {
        moniBlockId: 'test-block-123',
        moniParentId: 'parent-456',
      }

      // 模拟节点
      const mockNode = {
        attrs,
        type: { name: 'paragraph' },
      }

      // 获取段落扩展的属性定义
      const extensionAttributes = editor.extensionManager.attributes.filter(attr => attr.type === 'paragraph')

      const renderedAttributes = getRenderedAttributes(mockNode as any, extensionAttributes)

      console.log('生成的 HTML 属性:', renderedAttributes)

      // 验证所有 data 属性都使用了正确的命名格式
      Object.keys(renderedAttributes).forEach(key => {
        if (key.startsWith('data-')) {
          // data 属性应该全部小写，使用连字符分隔
          expect(key).toMatch(/^data-[a-z-]+$/)
          expect(key).not.toMatch(/[A-Z]/) // 不应该包含大写字母
        }
      })
    })
  })

  describe('边界情况测试', () => {
    it('应该处理空属性', () => {
      const paragraphNode = editor.state.doc.firstChild!
      const emptyAttributes: ExtensionAttribute[] = []

      const result = getRenderedAttributes(paragraphNode, emptyAttributes)
      expect(result).toEqual({})
    })

    it('应该处理非渲染属性', () => {
      const paragraphNode = editor.state.doc.firstChild!
      const nonRenderedAttributes: ExtensionAttribute[] = [
        {
          type: 'paragraph',
          name: 'moniBlockId',
          attribute: {
            default: 'test-id',
            rendered: false, // 不渲染
          },
        },
      ]

      const result = getRenderedAttributes(paragraphNode, nonRenderedAttributes)
      expect(result).toEqual({})
    })

    it('应该处理不匹配的节点类型', () => {
      const paragraphNode = editor.state.doc.firstChild!
      const headingAttributes: ExtensionAttribute[] = [
        {
          type: 'heading', // 不匹配 paragraph
          name: 'level',
          attribute: {
            default: 1,
            rendered: true,
          },
        },
      ]

      const result = getRenderedAttributes(paragraphNode, headingAttributes)
      expect(result).toEqual({})
    })
  })
})
