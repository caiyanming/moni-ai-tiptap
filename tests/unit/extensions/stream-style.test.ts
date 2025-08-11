import { Editor } from '@tiptap/core'
import { Document } from '@tiptap/extension-document'
import { DocumentStyleExtension, MoniDefaultStylePreset } from '@tiptap/extension-document-style'
import { Paragraph } from '@tiptap/extension-paragraph'
import { StreamStyleIntelligence } from '@tiptap/extension-stream-style'
import { Text } from '@tiptap/extension-text'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock document.documentElement.style
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

describe('StreamStyleIntelligence Extension', () => {
  let editor: Editor

  beforeEach(() => {
    vi.clearAllMocks()

    editor = new Editor({
      extensions: [
        Document,
        Paragraph,
        Text,
        DocumentStyleExtension.configure({
          defaultPreset: MoniDefaultStylePreset,
          autoInjectCSS: true,
        }),
        StreamStyleIntelligence.configure({
          config: {
            autoApplyDocumentStyle: true,
            inheritParentStyle: true,
            stylePriority: 'document',
            enableStyleCache: true,
          },
          enableStyleInference: true,
          maxCacheSize: 100,
        }),
      ],
    })
  })

  describe('初始化', () => {
    it('应该正确初始化扩展', () => {
      const streamStyleExt = editor.extensionManager.extensions.find(ext => ext.name === 'streamStyle')

      expect(streamStyleExt).toBeDefined()
      expect(streamStyleExt?.storage.styleCache).toBeDefined()
      expect(streamStyleExt?.storage.inferenceCache).toBeDefined()
      expect(streamStyleExt?.storage.stats).toEqual({
        cacheHits: 0,
        cacheMisses: 0,
        inferenceCount: 0,
      })
    })
  })

  describe('insertContentWithDocumentStyle', () => {
    it('应该为AI生成内容自动应用文档样式', () => {
      const content = {
        type: 'paragraph',
        content: [{ type: 'text', text: 'AI生成的内容' }],
      }

      const result = editor.commands.insertContentWithDocumentStyle(content)
      expect(result).toBe(true)

      const paragraph = editor.state.doc.firstChild
      expect(paragraph?.attrs).toHaveProperty('moniGlobalFontFamily')
      expect(paragraph?.attrs).toHaveProperty('moniSemanticStyle')
      expect(paragraph?.attrs.moniStyleVersion).toBe(1)
    })

    it('应该在禁用自动样式时直接插入内容', () => {
      // 重新配置为禁用自动样式
      editor.destroy()
      editor = new Editor({
        extensions: [
          Document,
          Paragraph,
          Text,
          DocumentStyleExtension,
          StreamStyleIntelligence.configure({
            config: {
              autoApplyDocumentStyle: false,
              inheritParentStyle: false,
              stylePriority: 'content',
              enableStyleCache: false,
            },
          }),
        ],
      })

      const content = {
        type: 'paragraph',
        content: [{ type: 'text', text: '普通内容' }],
      }

      const result = editor.commands.insertContentWithDocumentStyle(content)
      expect(result).toBe(true)
    })

    it('应该处理指定位置的内容插入', () => {
      editor.commands.setContent('<p>现有内容</p>')

      const content = {
        type: 'paragraph',
        content: [{ type: 'text', text: '插入的内容' }],
      }

      // 计算正确的插入位置（文档末尾）
      const docSize = editor.state.doc.content.size
      const result = editor.commands.insertContentWithDocumentStyle(content, docSize) // 在现有内容后插入
      expect(result).toBe(true)

      // 应该有两个段落
      const paragraphs = []
      editor.state.doc.descendants(node => {
        if (node.type.name === 'paragraph') {
          paragraphs.push(node)
        }
      })
      expect(paragraphs).toHaveLength(2)
    })
  })

  describe('applyDocumentStyleToContent', () => {
    it('应该为指定范围的内容应用样式', () => {
      editor.commands.setContent('<p>第一段</p><p>第二段</p>')

      const result = editor.commands.applyDocumentStyleToContent(0, editor.state.doc.content.size, 'paragraph')
      expect(result).toBe(true)

      // 检查所有段落是否都应用了样式
      const paragraphs = []
      editor.state.doc.descendants(node => {
        if (node.type.name === 'paragraph') {
          paragraphs.push(node)
        }
      })

      paragraphs.forEach(paragraph => {
        expect(paragraph.attrs).toHaveProperty('moniGlobalFontFamily')
        expect(paragraph.attrs).toHaveProperty('moniSemanticStyle')
      })
    })

    it('应该在没有文档样式扩展时失败', () => {
      // 创建没有DocumentStyleExtension的编辑器
      const simpleEditor = new Editor({
        extensions: [Document, Paragraph, Text, StreamStyleIntelligence],
      })

      const result = simpleEditor.commands.applyDocumentStyleToContent(0, 10, 'paragraph')
      expect(result).toBe(false)

      simpleEditor.destroy()
    })
  })

  describe('inferAndApplyStyle', () => {
    it('应该智能推断内容类型并应用样式', () => {
      const content = {
        type: 'paragraph',
        content: [{ type: 'text', text: '这是一个段落' }],
      }

      const result = editor.commands.inferAndApplyStyle(content)
      expect(result).toBe(true)

      // 检查推断统计 - 使用正确的共享存储对象
      const sharedStorage = (editor as any).extensionStorage.streamStyle
      expect(sharedStorage.stats.inferenceCount).toBeGreaterThan(0)
    })

    it('应该在禁用智能推断时回退到普通插入', () => {
      // 重新配置为禁用智能推断
      editor.destroy()
      editor = new Editor({
        extensions: [
          Document,
          Paragraph,
          Text,
          DocumentStyleExtension,
          StreamStyleIntelligence.configure({
            enableStyleInference: false,
          }),
        ],
      })

      const content = {
        type: 'paragraph',
        content: [{ type: 'text', text: '内容' }],
      }

      const result = editor.commands.inferAndApplyStyle(content)
      expect(result).toBe(true)
    })
  })

  describe('getRecommendedStyle', () => {
    it('应该返回推荐的样式属性', () => {
      const recommendedStyle = editor.commands.getRecommendedStyle('paragraph')

      expect(recommendedStyle).toBeDefined()
      expect(recommendedStyle).toHaveProperty('moniGlobalFontFamily')
      expect(recommendedStyle).toHaveProperty('moniGlobalFontSize')
      expect(recommendedStyle).toHaveProperty('moniSemanticStyle')
      expect(recommendedStyle).toHaveProperty('moniStyleVersion')
    })

    it('应该在没有当前预设时返回null', () => {
      // 创建一个没有默认预设的编辑器实例
      const editorWithoutPreset = new Editor({
        extensions: [
          Document,
          Paragraph,
          Text,
          DocumentStyleExtension.configure({
            // 明确设置 defaultPreset 为 null
            defaultPreset: null,
            autoInjectCSS: false,
          }),
          StreamStyleIntelligence.configure({
            config: {
              autoApplyDocumentStyle: true,
              inheritParentStyle: true,
              stylePriority: 'document',
              enableStyleCache: true,
            },
            enableStyleInference: true,
            maxCacheSize: 100,
          }),
        ],
      })

      // 验证没有预设 - 使用正确的共享存储对象
      const documentSharedStorage = (editorWithoutPreset as any).extensionStorage.documentStyle
      // 验证当前预设已经是 null
      expect(documentSharedStorage.currentPreset).toBeNull()

      const recommendedStyle = editorWithoutPreset.commands.getRecommendedStyle('paragraph')
      expect(recommendedStyle).toBeNull()

      // 清理
      editorWithoutPreset.destroy()
    })

    it('应该使用样式缓存提高性能', () => {
      const sharedStorage = (editor as any).extensionStorage.streamStyle

      // 第一次调用
      const style1 = editor.commands.getRecommendedStyle('paragraph')
      expect(sharedStorage.stats.cacheMisses).toBe(1)
      expect(sharedStorage.stats.cacheHits).toBe(0)

      // 第二次调用相同类型，应该命中缓存
      const style2 = editor.commands.getRecommendedStyle('paragraph')
      expect(sharedStorage.stats.cacheHits).toBe(1)

      expect(style1).toEqual(style2)
    })
  })

  describe('clearStyleCache', () => {
    it('应该清除所有缓存', () => {
      // 先创建一些缓存数据
      editor.commands.getRecommendedStyle('paragraph')
      editor.commands.inferAndApplyStyle({ type: 'paragraph', content: [] })

      const sharedStorage = (editor as any).extensionStorage.streamStyle
      expect(sharedStorage.styleCache.size).toBeGreaterThan(0)
      expect(sharedStorage.stats.inferenceCount).toBeGreaterThan(0)

      const result = editor.commands.clearStyleCache()
      expect(result).toBe(true)

      expect(sharedStorage.styleCache.size).toBe(0)
      expect(sharedStorage.inferenceCache.size).toBe(0)
      expect(sharedStorage.stats).toEqual({
        cacheHits: 0,
        cacheMisses: 0,
        inferenceCount: 0,
      })
    })
  })

  describe('内容类型推断', () => {
    it('应该推断段落类型', () => {
      const sharedStorage = (editor as any).extensionStorage.streamStyle

      const content = { type: 'paragraph', content: [] }
      // 使用命令接口
      const inferredType = editor.commands.inferContentType(content)

      expect(inferredType).toBe('paragraph')
      expect(sharedStorage.stats.inferenceCount).toBe(1)
    })

    it('应该基于上下文推断列表项', () => {
      const content = { type: 'text', text: '列表项内容' }
      const context = { parentType: 'bulletList' }
      const inferredType = editor.commands.inferContentType(content, context)

      expect(inferredType).toBe('listItem')
    })

    it('应该基于内容特征推断标题', () => {
      const content = '# 这是标题'
      const inferredType = editor.commands.inferContentType(content)

      expect(inferredType).toBe('heading')
    })

    it('应该基于内容特征推断代码块', () => {
      const content = '```javascript\nconsole.log("hello")\n```'
      const inferredType = editor.commands.inferContentType(content)

      expect(inferredType).toBe('codeBlock')
    })

    it('应该缓存推断结果', () => {
      const sharedStorage = (editor as any).extensionStorage.streamStyle

      const content = { type: 'paragraph' }

      // 第一次推断
      editor.commands.inferContentType(content)
      expect(sharedStorage.inferenceCache.size).toBe(1)

      // 第二次推断相同内容，应该使用缓存
      const initialInferenceCount = sharedStorage.stats.inferenceCount
      editor.commands.inferContentType(content)
      expect(sharedStorage.stats.inferenceCount).toBe(initialInferenceCount + 1) // 只计算调用次数
    })
  })

  describe('样式应用到内容', () => {
    it('应该为简单内容应用样式', () => {
      const documentStyleExt = editor.extensionManager.extensions.find(ext => ext.name === 'documentStyle')!

      const content = {
        type: 'paragraph',
        content: [{ type: 'text', text: '测试内容' }],
      }

      const styledContent = editor.commands.applyStyleToContent(
        content,
        documentStyleExt.storage.currentPreset,
        'paragraph',
      )

      expect(styledContent.attrs).toHaveProperty('moniGlobalFontFamily')
      expect(styledContent.attrs).toHaveProperty('moniSemanticStyle')
      expect(styledContent.content).toEqual(content.content)
    })

    it('应该递归处理数组内容', () => {
      const documentStyleExt = editor.extensionManager.extensions.find(ext => ext.name === 'documentStyle')!

      const content = [
        { type: 'paragraph', content: [{ type: 'text', text: '第一段' }] },
        { type: 'paragraph', content: [{ type: 'text', text: '第二段' }] },
      ]

      const styledContent = editor.commands.applyStyleToContent(
        content,
        documentStyleExt.storage.currentPreset,
        'paragraph',
      )

      expect(Array.isArray(styledContent)).toBe(true)
      expect(styledContent).toHaveLength(2)
      styledContent.forEach((item: any) => {
        expect(item.attrs).toHaveProperty('moniGlobalFontFamily')
      })
    })

    it('应该处理非对象内容', () => {
      const documentStyleExt = editor.extensionManager.extensions.find(ext => ext.name === 'documentStyle')!

      const content = '纯文本内容'
      const styledContent = editor.commands.applyStyleToContent(
        content,
        documentStyleExt.storage.currentPreset,
        'paragraph',
      )

      expect(styledContent).toBe(content)
    })
  })

  describe('缓存管理', () => {
    it('应该限制缓存大小', () => {
      const streamStyleExt = editor.extensionManager.extensions.find(ext => ext.name === 'streamStyle')!

      // 配置小的缓存限制
      streamStyleExt.options.maxCacheSize = 2

      // 添加超过限制的缓存项
      streamStyleExt.storage.styleCache.set('key1', {} as any)
      streamStyleExt.storage.styleCache.set('key2', {} as any)
      streamStyleExt.storage.styleCache.set('key3', {} as any) // 应该触发清理

      // 缓存大小应该保持在限制内
      expect(streamStyleExt.storage.styleCache.size).toBeLessThanOrEqual(2)
    })
  })

  describe('错误处理', () => {
    it('应该处理缺失的DocumentStyleExtension', () => {
      const simpleEditor = new Editor({
        extensions: [Document, Paragraph, Text, StreamStyleIntelligence],
      })

      const result = simpleEditor.commands.insertContentWithDocumentStyle({
        type: 'paragraph',
        content: [{ type: 'text', text: '内容' }],
      })

      // 应该回退到普通插入
      expect(result).toBe(true)

      simpleEditor.destroy()
    })

    it('应该处理无效的内容类型', () => {
      const invalidContent = null
      const inferredType = editor.commands.inferContentType(invalidContent)

      expect(inferredType).toBe('paragraph') // 默认类型
    })
  })
})
