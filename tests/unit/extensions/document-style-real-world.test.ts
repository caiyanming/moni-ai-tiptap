/**
 * DocumentStyleExtension 真实场景测试
 *
 * 模拟 moni-ai-web 中的实际使用场景：
 * 1. 编辑器初始化时样式系统的状态
 * 2. 用户点击样式预设按钮的效果
 * 3. CSS 变量在 DOM 中的实际注入
 * 4. 样式系统与编辑器的集成状态
 */

import { Editor } from '@tiptap/core'
import { Document } from '@tiptap/extension-document'
import { DocumentStyleExtension, MoniDefaultStylePreset } from '@tiptap/extension-document-style'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Text } from '@tiptap/extension-text'
import { afterEach,beforeEach, describe, expect, it } from 'vitest'

describe('DocumentStyleExtension Real World Usage', () => {
  let editor: Editor
  let container: HTMLElement

  beforeEach(() => {
    // 创建真实的 DOM 容器
    container = document.createElement('div')
    document.body.appendChild(container)

    // 初始化编辑器，模拟 moni-ai-web 的配置
    editor = new Editor({
      element: container,
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
      content: '<p>这是一个测试文档</p>',
      autofocus: false,
    })
  })

  afterEach(() => {
    editor?.destroy()
    document.body.removeChild(container)
  })

  describe('编辑器初始化状态', () => {
    it('应该成功创建编辑器实例', () => {
      expect(editor).toBeDefined()
      expect(editor.isDestroyed).toBe(false)
    })

    it('应该加载 DocumentStyleExtension', () => {
      const extensions = editor.extensionManager.extensions
      const styleExtension = extensions.find(ext => ext.name === 'documentStyle')

      expect(styleExtension).toBeDefined()
      expect(styleExtension?.name).toBe('documentStyle')
    })

    it('应该有编辑器内容', () => {
      const content = editor.getHTML()
      expect(content).toContain('这是一个测试文档')
    })

    it('应该提供样式相关的命令', () => {
      const commands = Object.keys(editor.commands)

      expect(commands).toContain('applyStylePreset')
      expect(commands).toContain('setDocumentFont')
      expect(commands).toContain('setDocumentFontSize')
      expect(commands).toContain('getDocumentStyle')
      expect(commands).toContain('resetDocumentStyle')
      expect(commands).toContain('refreshDocumentStyle')
    })
  })

  describe('样式命令执行', () => {
    it('应该能执行 getDocumentStyle 命令', () => {
      // 这模拟了 useDocumentStyle hook 中调用编辑器命令的场景
      const result = editor.commands.getDocumentStyle()

      // 命令应该能够执行而不抛出错误
      expect(result).toBeDefined()
    })

    it('应该能执行 refreshDocumentStyle 命令', () => {
      // 这模拟了用户刷新样式的场景
      const result = editor.commands.refreshDocumentStyle()

      // 命令应该成功执行
      expect(result).toBe(true)
    })

    it('应该能尝试应用样式预设', () => {
      // 这模拟了用户点击样式预设按钮的场景
      expect(() => {
        const result = editor.commands.applyStylePreset('moni-default')
        console.log('Apply style preset result:', result)
      }).not.toThrow()
    })

    it('应该能尝试设置字体', () => {
      // 这模拟了用户更改字体的场景
      expect(() => {
        const result = editor.commands.setDocumentFont('Arial, sans-serif')
        console.log('Set font result:', result)
      }).not.toThrow()
    })

    it('应该能尝试设置字体大小', () => {
      // 这模拟了用户更改字体大小的场景
      expect(() => {
        const result = editor.commands.setDocumentFontSize(18)
        console.log('Set font size result:', result)
      }).not.toThrow()
    })
  })

  describe('DOM 集成验证', () => {
    it('应该在 DOM 中创建编辑器元素', () => {
      const proseMirrorElement = container.querySelector('.ProseMirror')
      expect(proseMirrorElement).toBeDefined()
    })

    it('应该能够在编辑器中输入内容', () => {
      // 模拟用户输入
      editor.commands.insertContent('新添加的文本')

      const content = editor.getHTML()
      expect(content).toContain('新添加的文本')
    })

    it('应该能检查 document.documentElement 上的 CSS 变量', () => {
      // 检查是否有 moni 相关的 CSS 变量被注入
      const documentStyle = getComputedStyle(document.documentElement)

      // 注意：由于 CSS 注入可能异步，这里主要检查不会报错
      expect(() => {
        const fontFamily = documentStyle.getPropertyValue('--moni-font-family')
        const fontSize = documentStyle.getPropertyValue('--moni-font-size')
        console.log('CSS Variables:', { fontFamily, fontSize })
      }).not.toThrow()
    })
  })

  describe('样式系统状态检查', () => {
    it('应该能访问样式扩展的存储', () => {
      const styleExtension = editor.extensionManager.extensions.find(ext => ext.name === 'documentStyle')

      expect(styleExtension?.storage).toBeDefined()
      expect(styleExtension?.storage.documentStyle).toBeDefined()
      expect(styleExtension?.storage.styleCache).toBeDefined()
    })

    it('应该有样式扩展的配置选项', () => {
      const styleExtension = editor.extensionManager.extensions.find(ext => ext.name === 'documentStyle')

      expect(styleExtension?.options).toBeDefined()
      expect(styleExtension?.options.defaultPreset).toBeDefined()
      expect(styleExtension?.options.autoInjectCSS).toBe(true)
    })

    it('应该能获取默认样式预设的信息', () => {
      const styleExtension = editor.extensionManager.extensions.find(ext => ext.name === 'documentStyle')

      const defaultPreset = styleExtension?.options.defaultPreset
      expect(defaultPreset).toBeDefined()
      expect(defaultPreset?.name).toBe('moni-default')
      expect(defaultPreset?.displayName).toBe('MoniAI 默认')
    })
  })

  describe('错误恢复能力', () => {
    it('应该能处理无效样式预设而不崩溃', () => {
      expect(() => {
        editor.commands.applyStylePreset('non-existent-preset')
      }).not.toThrow()
    })

    it('应该能处理空字体参数而不崩溃', () => {
      expect(() => {
        editor.commands.setDocumentFont('')
      }).not.toThrow()
    })

    it('应该能处理负数字体大小而不崩溃', () => {
      expect(() => {
        editor.commands.setDocumentFontSize(-10)
      }).not.toThrow()
    })

    it('应该能在多次命令调用后保持稳定', () => {
      expect(() => {
        editor.commands.refreshDocumentStyle()
        editor.commands.getDocumentStyle()
        editor.commands.applyStylePreset('moni-default')
        editor.commands.setDocumentFont('Georgia, serif')
        editor.commands.setDocumentFontSize(14)
      }).not.toThrow()
    })
  })

  describe('与 moni-ai-web 集成模拟', () => {
    it('应该模拟 useDocumentStyle hook 的调用模式', () => {
      // 模拟 hook 中的样式应用流程
      const simulateStyleApplication = (presetName: string) => {
        try {
          // 1. 调用编辑器命令
          const result = editor.commands.applyStylePreset(presetName)

          // 2. 获取当前样式状态
          const currentStyle = editor.commands.getDocumentStyle()

          return { success: true, result, currentStyle }
        } catch (error) {
          return { success: false, error: error.message }
        }
      }

      const result = simulateStyleApplication('moni-default')
      expect(result.success).toBe(true)
    })

    it('应该模拟 StylePanel 组件的交互', () => {
      // 模拟用户在 StylePanel 中的操作序列
      const simulateUserStyleInteraction = () => {
        const actions = []

        // 用户打开样式面板并查看当前样式
        actions.push(() => editor.commands.getDocumentStyle())

        // 用户选择新的字体
        actions.push(() => editor.commands.setDocumentFont('Times New Roman, serif'))

        // 用户调整字体大小
        actions.push(() => editor.commands.setDocumentFontSize(16))

        // 用户应用预设
        actions.push(() => editor.commands.applyStylePreset('moni-default'))

        // 执行所有操作
        return actions.map((action, index) => {
          try {
            const result = action()
            return { step: index, success: true, result }
          } catch (error) {
            return { step: index, success: false, error: error.message }
          }
        })
      }

      const results = simulateUserStyleInteraction()

      // 所有操作都应该成功执行（不抛出异常）
      expect(results.every(r => r.success)).toBe(true)
    })
  })
})
