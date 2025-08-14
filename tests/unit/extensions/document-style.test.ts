import type { DocumentStylePreset } from '@tiptap/core'
import { Editor } from '@tiptap/core'
import { Document } from '@tiptap/extension-document'
import { DocumentStyleExtension, MoniDefaultStylePreset } from '@tiptap/extension-document-style'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Text } from '@tiptap/extension-text'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock document.documentElement.style for CSS variable injection
const mockStyle = {
  setProperty: vi.fn(),
  removeProperty: vi.fn(),
}

Object.defineProperty(document, 'documentElement', {
  value: {
    style: mockStyle,
  },
  writable: true,
})

describe('DocumentStyleExtension', () => {
  let editor: Editor

  beforeEach(async () => {
    vi.clearAllMocks()

    editor = new Editor({
      extensions: [
        Document,
        Paragraph,
        Text,
        DocumentStyleExtension.configure({
          defaultPreset: MoniDefaultStylePreset,
          autoInjectCSS: true,
          enableStyleCache: true,
        }),
      ],
    })

    // Wait for lifecycle methods to complete
    await new Promise(resolve => setTimeout(resolve, 10))
  })

  describe('初始化', () => {
    it('应该正确初始化默认样式预设', () => {
      const documentStyle = editor.extensionManager.extensions.find(ext => ext.name === 'documentStyle')

      expect(documentStyle).toBeDefined()
      expect(documentStyle?.storage.currentPreset).toEqual(MoniDefaultStylePreset)
      expect(documentStyle?.storage.styleVersion).toBe(1)
      expect(documentStyle?.storage.isInjected).toBe(true)
    })

    it('应该自动注入CSS变量', () => {
      // 检查是否调用了 setProperty 来注入CSS变量
      expect(mockStyle.setProperty).toHaveBeenCalled()

      // 检查是否注入了基础CSS变量
      const calls = mockStyle.setProperty.mock.calls
      const propertyNames = calls.map(call => call[0])

      expect(propertyNames).toContain('--moni-font-family')
      expect(propertyNames).toContain('--moni-font-size')
      expect(propertyNames).toContain('--moni-color-accent')
    })
  })

  describe('applyStylePreset', () => {
    it('应该应用新的样式预设', () => {
      const customPreset: DocumentStylePreset = {
        name: 'test-preset',
        displayName: '测试预设',
        description: '测试用的样式预设',
        typography: {
          fontFamily: '"Test Font", sans-serif',
          fontSize: 14,
          lineHeight: 1.4,
          letterSpacing: '0em',
          scale: { ratio: 1.2, base: 14 },
        },
        colors: {
          text: '#000000',
          textSecondary: '#666666',
          background: '#ffffff',
          accent: '#007acc',
          highlight: 'rgba(0, 122, 204, 0.1)',
          success: '#00aa00',
          warning: '#ff9900',
          error: '#cc0000',
        },
        spacing: {
          blockSpacing: 20,
          paragraphSpacing: 12,
          listIndent: 28,
        },
        semantic: {
          title: { fontSize: 24, fontWeight: 700 },
          heading1: { fontSize: 20, fontWeight: 600 },
          heading2: { fontSize: 18, fontWeight: 600 },
          heading3: { fontSize: 16, fontWeight: 600 },
          heading4: { fontSize: 14, fontWeight: 600 },
          heading5: { fontSize: 12, fontWeight: 600 },
          heading6: { fontSize: 11, fontWeight: 600 },
          paragraph: { fontSize: 14, fontWeight: 400 },
          blockquote: { fontSize: 14, fontWeight: 400 },
          codeBlock: { fontSize: 12, fontWeight: 400 },
          inlineCode: { fontSize: 12, fontWeight: 500 },
          orderedList: { fontSize: 14, fontWeight: 400 },
          bulletList: { fontSize: 14, fontWeight: 400 },
          listItem: { marginBottom: 4 },
        },
      }

      // 添加自定义预设到可用预设列表
      const extension = editor.extensionManager.extensions.find(ext => ext.name === 'documentStyle')!
      extension.options.availablePresets.push(customPreset)

      const result = editor.commands.applyStylePreset('test-preset')
      expect(result).toBe(true)

      // Check through the command API since it gives the correct storage instance
      const currentStyle = editor.commands.getDocumentStyle()
      expect(currentStyle.currentPreset?.name).toBe('test-preset')
      expect(currentStyle.styleVersion).toBe(2) // 应该递增
      expect(currentStyle.isInjected).toBe(true)
    })

    it('应该拒绝不存在的样式预设', () => {
      const result = editor.commands.applyStylePreset('non-existent')
      expect(result).toBe(false)
    })

    it('应该传播样式到所有段落', () => {
      editor.commands.setContent('<p>第一段</p><p>第二段</p>')
      editor.commands.applyStylePreset('moni-default')

      const paragraphs = []
      editor.state.doc.descendants(node => {
        if (node.type.name === 'paragraph') {
          paragraphs.push(node)
        }
      })

      expect(paragraphs).toHaveLength(2)
      paragraphs.forEach(paragraph => {
        expect(paragraph.attrs.moniStyleVersion).toBe(2) // 应用后递增
        expect(paragraph.attrs).toHaveProperty('moniGlobalFontFamily')
        expect(paragraph.attrs).toHaveProperty('moniSemanticStyle')
      })
    })
  })

  describe('setDocumentFont', () => {
    it('应该更新全局字体', () => {
      const result = editor.commands.setDocumentFont('"Custom Font", serif')
      expect(result).toBe(true)

      const currentStyle = editor.commands.getDocumentStyle()
      expect(currentStyle.currentPreset?.typography.fontFamily).toBe('"Custom Font", serif')
      expect(currentStyle.styleVersion).toBe(2)
    })

    it('应该在没有当前预设时失败', () => {
      // 使用命令API清除当前预设，而非直接操作存储
      editor.commands.clearDocumentStyle()

      const result = editor.commands.setDocumentFont('"Test Font", sans-serif')
      expect(result).toBe(false)
    })
  })

  describe('setDocumentFontSize', () => {
    it('应该更新全局字体大小', () => {
      const result = editor.commands.setDocumentFontSize(20)
      expect(result).toBe(true)

      const currentStyle = editor.commands.getDocumentStyle()
      expect(currentStyle.currentPreset?.typography.fontSize).toBe(20)
      expect(currentStyle.styleVersion).toBe(2)
    })
  })

  describe('getDocumentStyle', () => {
    it('应该返回当前文档样式状态', () => {
      const documentStyle = editor.commands.getDocumentStyle()

      expect(documentStyle).toBeDefined()
      expect(documentStyle?.currentPreset).toEqual(MoniDefaultStylePreset)
      expect(documentStyle?.styleVersion).toBe(1)
      expect(documentStyle?.isInjected).toBe(true)
      expect(documentStyle?.cssVariables).toBeDefined()
    })
  })

  describe('resetDocumentStyle', () => {
    it('应该重置为默认样式', () => {
      // 先改变样式
      editor.commands.setDocumentFontSize(24)

      // 然后重置
      const result = editor.commands.resetDocumentStyle()
      expect(result).toBe(true)

      const extension = editor.extensionManager.extensions.find(ext => ext.name === 'documentStyle')!
      const currentPreset = extension.storage.currentPreset

      expect(currentPreset?.name).toBe('moni-default')
      expect(currentPreset?.typography.fontSize).toBe(17) // 默认字体大小
    })
  })

  describe('refreshDocumentStyle', () => {
    it('应该强制刷新文档样式', () => {
      const result = editor.commands.refreshDocumentStyle()
      expect(result).toBe(true)

      const currentStyle = editor.commands.getDocumentStyle()
      expect(currentStyle.styleVersion).toBe(2) // 应该递增
    })
  })

  describe('样式传播', () => {
    it('应该为新插入的段落应用当前样式', () => {
      // 插入新段落
      editor.commands.setContent('<p>测试段落</p>')

      // 设置一个自定义字体 (这会传播样式到现有内容)
      editor.commands.setDocumentFont('"New Font", sans-serif')

      const paragraph = editor.state.doc.firstChild
      expect(paragraph?.attrs.moniGlobalFontFamily).toBe('"New Font", sans-serif')
      expect(paragraph?.attrs.moniStyleVersion).toBe(2)
    })

    it('应该根据节点类型应用正确的语义样式', () => {
      editor.commands.setContent('<p>段落</p>')
      editor.commands.applyStylePreset('moni-default')

      const paragraph = editor.state.doc.firstChild
      const semanticStyle = JSON.parse(paragraph?.attrs.moniSemanticStyle || '{}')

      // 应该包含段落的语义样式属性
      expect(semanticStyle.fontSize).toBe(17)
      expect(semanticStyle.fontWeight).toBe(400)
      expect(semanticStyle.lineHeight).toBe(1.65)
    })
  })

  describe('性能优化', () => {
    it('应该缓存样式计算结果', () => {
      const extension = editor.extensionManager.extensions.find(ext => ext.name === 'documentStyle')!

      // 初始缓存应该为空
      expect(extension.storage.styleCache.size).toBe(0)

      // 执行样式操作
      editor.commands.applyStylePreset('moni-default')

      // 这里我们主要测试缓存机制的存在，具体的缓存逻辑在 StreamStyleIntelligence 中
      expect(extension.storage.styleCache).toBeDefined()
    })

    it('应该正确处理防抖更新', () => {
      // 快速连续更新
      editor.commands.setDocumentFontSize(18)
      editor.commands.setDocumentFontSize(20)
      editor.commands.setDocumentFontSize(22)

      const currentStyle = editor.commands.getDocumentStyle()

      // 最终应该是最后一次更新的值
      expect(currentStyle.currentPreset?.typography.fontSize).toBe(22)
    })
  })

  describe('错误处理', () => {
    it('应该处理无效的样式预设名称', () => {
      const result = editor.commands.applyStylePreset('')
      expect(result).toBe(false)
    })

    it('应该在扩展销毁时清理CSS变量', () => {
      editor.destroy()

      // 应该调用 removeProperty 来清理CSS变量
      expect(mockStyle.removeProperty).toHaveBeenCalled()
    })
  })
})
