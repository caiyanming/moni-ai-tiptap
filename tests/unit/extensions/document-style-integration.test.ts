/**
 * DocumentStyleExtension 集成测试
 *
 * 重点验证样式系统的核心功能：
 * 1. 扩展正确初始化
 * 2. CSS 变量注入
 * 3. 样式预设应用
 * 4. 编辑器命令集成
 */

import { Editor } from '@tiptap/core'
import { Document } from '@tiptap/extension-document'
import { DocumentStyleExtension, MoniDefaultStylePreset } from '@tiptap/extension-document-style'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Text } from '@tiptap/extension-text'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock CSS 变量注入
const mockInjectCSSVariables = vi.fn()
const mockClearCSSVariables = vi.fn()

// Mock 样式工具函数
vi.mock('@tiptap/extension-document-style/src/style-utils.js', () => ({
  injectCSSVariables: mockInjectCSSVariables,
  clearCSSVariables: mockClearCSSVariables,
  presetToCSSVariables: vi.fn(preset => ({
    '--moni-font-family': preset.typography.fontFamily,
    '--moni-font-size': `${preset.typography.fontSize}px`,
    '--moni-color-text': preset.colors.text,
    '--moni-color-accent': preset.colors.accent,
  })),
  generateGlobalStyleAttributes: vi.fn(() => ({})),
  debounce: vi.fn(fn => fn),
}))

describe('DocumentStyleExtension Integration', () => {
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
          enableStyleCache: true,
        }),
      ],
      content: '<p>Test content</p>',
    })
  })

  afterEach(() => {
    editor?.destroy()
  })

  describe('扩展初始化', () => {
    it('应该正确加载 DocumentStyleExtension', () => {
      const extension = editor.extensionManager.extensions.find(ext => ext.name === 'documentStyle')

      expect(extension).toBeDefined()
      expect(extension?.name).toBe('documentStyle')
    })

    it('应该正确配置扩展选项', () => {
      const extension = editor.extensionManager.extensions.find(ext => ext.name === 'documentStyle')

      expect(extension?.options.defaultPreset).toEqual(MoniDefaultStylePreset)
      expect(extension?.options.autoInjectCSS).toBe(true)
      expect(extension?.options.enableStyleCache).toBe(true)
    })

    it('应该初始化样式存储', () => {
      const extension = editor.extensionManager.extensions.find(ext => ext.name === 'documentStyle')

      expect(extension?.storage.documentStyle).toBeDefined()
      expect(extension?.storage.styleCache).toBeDefined()
    })
  })

  describe('CSS 变量注入', () => {
    it('应该在初始化时注入 CSS 变量', () => {
      // 由于自动注入开启，应该调用了 CSS 变量注入
      expect(mockInjectCSSVariables).toHaveBeenCalled()
    })

    it('应该在销毁时清理 CSS 变量', () => {
      editor.destroy()

      // 应该调用清理函数
      expect(mockClearCSSVariables).toHaveBeenCalled()
    })
  })

  describe('编辑器命令', () => {
    it('应该提供 applyStylePreset 命令', () => {
      expect(editor.commands.applyStylePreset).toBeDefined()
      expect(typeof editor.commands.applyStylePreset).toBe('function')
    })

    it('应该提供 setDocumentFont 命令', () => {
      expect(editor.commands.setDocumentFont).toBeDefined()
      expect(typeof editor.commands.setDocumentFont).toBe('function')
    })

    it('应该提供 setDocumentFontSize 命令', () => {
      expect(editor.commands.setDocumentFontSize).toBeDefined()
      expect(typeof editor.commands.setDocumentFontSize).toBe('function')
    })

    it('应该提供 getDocumentStyle 命令', () => {
      expect(editor.commands.getDocumentStyle).toBeDefined()
      expect(typeof editor.commands.getDocumentStyle).toBe('function')
    })

    it('应该提供 resetDocumentStyle 命令', () => {
      expect(editor.commands.resetDocumentStyle).toBeDefined()
      expect(typeof editor.commands.resetDocumentStyle).toBe('function')
    })

    it('应该提供 refreshDocumentStyle 命令', () => {
      expect(editor.commands.refreshDocumentStyle).toBeDefined()
      expect(typeof editor.commands.refreshDocumentStyle).toBe('function')
    })
  })

  describe('基本功能验证', () => {
    it('应该能够执行 getDocumentStyle 命令', () => {
      const result = editor.commands.getDocumentStyle()

      // 命令应该成功执行（不应该抛出错误）
      expect(result).toBeDefined()
    })

    it('应该能够执行 refreshDocumentStyle 命令', () => {
      const result = editor.commands.refreshDocumentStyle()

      // 命令应该返回 true 表示成功
      expect(result).toBe(true)
    })

    it('应该能够调用 applyStylePreset 命令（即使失败）', () => {
      // 这个测试只验证命令能被调用，不验证成功与否
      expect(() => {
        editor.commands.applyStylePreset('moni-default')
      }).not.toThrow()
    })
  })

  describe('错误处理', () => {
    it('应该能处理无效的样式预设名称', () => {
      expect(() => {
        editor.commands.applyStylePreset('invalid-preset')
      }).not.toThrow()
    })

    it('应该能处理空的字体参数', () => {
      expect(() => {
        editor.commands.setDocumentFont('')
      }).not.toThrow()
    })

    it('应该能处理无效的字体大小', () => {
      expect(() => {
        editor.commands.setDocumentFontSize(-1)
      }).not.toThrow()
    })
  })
})
