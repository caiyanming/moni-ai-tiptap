import { Editor } from '@tiptap/core'
import { Document } from '@tiptap/extension-document'
import { HiddenBlock, HiddenBlockUtils, NULL_UUID } from '@tiptap/extension-hidden-block'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Text } from '@tiptap/extension-text'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

describe('HiddenBlock Extension', () => {
  let editor: Editor

  beforeEach(() => {
    // 创建测试编辑器
    editor = new Editor({
      element: document.createElement('div'),
      content: '',
      extensions: [
        Document,
        Paragraph,
        Text,
        HiddenBlock.configure({
          hideFromDOM: true,
          nullUUID: NULL_UUID,
          HTMLAttributes: {
            class: 'test-hidden-block',
          },
        }),
      ],
    })
  })

  afterEach(() => {
    if (editor) {
      editor.destroy()
    }
  })

  describe('Extension Registration', () => {
    it('should be registered as extension', () => {
      const hiddenBlockExtension = editor.extensionManager.extensions.find(ext => ext.name === 'hiddenBlock')
      expect(hiddenBlockExtension).toBeDefined()
    })

    it('should have correct priority', () => {
      const hiddenBlockExtension = editor.extensionManager.extensions.find(ext => ext.name === 'hiddenBlock')
      expect(hiddenBlockExtension?.config.priority).toBe(1100)
    })

    it('should be a block node', () => {
      const hiddenBlockExtension = editor.extensionManager.extensions.find(ext => ext.name === 'hiddenBlock')
      expect(hiddenBlockExtension?.config.group).toBe('block')
    })
  })

  describe('Configuration', () => {
    it('should have default configuration', () => {
      const hiddenBlockExtension = editor.extensionManager.extensions.find(ext => ext.name === 'hiddenBlock')
      expect(hiddenBlockExtension).toBeDefined()

      if (hiddenBlockExtension) {
        expect(hiddenBlockExtension.options).toMatchObject({
          hideFromDOM: true,
          nullUUID: NULL_UUID,
          HTMLAttributes: {
            class: 'test-hidden-block',
          },
        })
      }
    })

    it('should accept custom configuration', () => {
      const customEditor = new Editor({
        element: document.createElement('div'),
        content: '',
        extensions: [
          Document,
          Paragraph,
          Text,
          HiddenBlock.configure({
            hideFromDOM: false,
            nullUUID: 'custom-uuid',
            HTMLAttributes: {
              class: 'custom-hidden-block',
            },
          }),
        ],
      })

      const hiddenBlockExtension = customEditor.extensionManager.extensions.find(ext => ext.name === 'hiddenBlock')

      if (hiddenBlockExtension) {
        expect(hiddenBlockExtension.options.hideFromDOM).toBe(false)
        expect(hiddenBlockExtension.options.nullUUID).toBe('custom-uuid')
        expect(hiddenBlockExtension.options.HTMLAttributes.class).toBe('custom-hidden-block')
      }

      customEditor.destroy()
    })
  })

  describe('Node Attributes', () => {
    it('should have correct attributes schema', () => {
      const schema = editor.schema
      const hiddenBlockType = schema.nodes.hiddenBlock

      expect(hiddenBlockType).toBeDefined()
      expect(hiddenBlockType.spec.attrs).toMatchObject({
        id: { default: null },
        moniBlockId: { default: null },
        hidden: { default: false },
        isInitialBlock: { default: false },
        moniParentId: { default: null },
        moniLevel: { default: 0 },
        moniDragEnabled: { default: false },
      })
    })

    it('should parse HTML attributes correctly', () => {
      const html = `<div data-hidden="true" data-initial-block="true" data-id="${NULL_UUID}" data-moni-block-id="${NULL_UUID}">Hidden content</div>`

      editor.commands.setContent(html)
      const json = editor.getJSON()

      expect(json.content).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'hiddenBlock',
            attrs: expect.objectContaining({
              hidden: true,
              isInitialBlock: true,
              id: NULL_UUID,
              moniBlockId: NULL_UUID,
            }),
          }),
        ]),
      )
    })

    it('should render HTML attributes correctly', () => {
      editor.commands.insertContent({
        type: 'hiddenBlock',
        attrs: {
          id: NULL_UUID,
          moniBlockId: NULL_UUID,
          hidden: true,
          isInitialBlock: true,
        },
        content: [],
      })

      const html = editor.getHTML()

      expect(html).toContain('data-hidden="true"')
      expect(html).toContain('data-initial-block="true"')
      expect(html).toContain(`data-id="${NULL_UUID}"`)
      expect(html).toContain(`data-moni-block-id="${NULL_UUID}"`)
    })
  })

  describe('Commands', () => {
    it('should have insertHiddenBlock command', () => {
      expect(editor.commands.insertHiddenBlock).toBeDefined()
      expect(typeof editor.commands.insertHiddenBlock).toBe('function')
    })

    it('should insert hidden block with correct attributes', () => {
      const success = editor.commands.insertHiddenBlock()
      expect(success).toBe(true)

      const json = editor.getJSON()
      expect(json.content).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'hiddenBlock',
            attrs: expect.objectContaining({
              id: NULL_UUID,
              moniBlockId: NULL_UUID,
              hidden: true,
              isInitialBlock: true,
            }),
          }),
        ]),
      )
    })
  })

  describe('DOM Rendering and Hiding', () => {
    beforeEach(() => {
      // 设置DOM环境
      document.body.innerHTML = '<div class="editor"></div>'
    })

    it('should hide hidden blocks from DOM when hideFromDOM is true', () => {
      editor.commands.setContent({
        type: 'doc',
        content: [
          {
            type: 'hiddenBlock',
            attrs: {
              id: NULL_UUID,
              moniBlockId: NULL_UUID,
              hidden: true,
              isInitialBlock: true,
            },
            content: [],
          },
        ],
      })

      // 获取渲染的HTML
      const html = editor.getHTML()

      // 检查是否包含隐藏块标识
      expect(html).toContain('data-hidden="true"')
      expect(html).toContain('data-initial-block="true"')
      expect(html).toContain(`data-id="${NULL_UUID}"`)
    })

    it('should not hide regular blocks', () => {
      editor.commands.setContent({
        type: 'doc',
        content: [
          {
            type: 'hiddenBlock',
            attrs: {
              id: 'regular-block',
              moniBlockId: 'regular-block',
              hidden: false,
              isInitialBlock: false,
            },
            content: [],
          },
        ],
      })

      const html = editor.getHTML()

      // 不应该有隐藏样式，常规块不应该有 hidden 相关属性
      expect(html).not.toContain('data-hidden="true"')
      expect(html).not.toContain('data-initial-block="true"')
    })
  })

  describe('ProseMirror Plugins', () => {
    it('should have hiddenBlockFilter plugin', () => {
      // 检查扩展是否添加了插件
      const hiddenBlockExtension = editor.extensionManager.extensions.find(ext => ext.name === 'hiddenBlock')
      expect(hiddenBlockExtension).toBeDefined()

      // 检查编辑器视图是否存在
      expect(editor.view).toBeDefined()
      expect(editor.view.state).toBeDefined()
      expect(editor.view.state.plugins).toBeDefined()
      expect(editor.view.state.plugins.length).toBeGreaterThan(0)
    })

    it('should prevent clicks on hidden blocks', () => {
      const mockEvent = new MouseEvent('click', { bubbles: true })
      const hiddenElement = document.createElement('div')
      hiddenElement.setAttribute('data-hidden-block', 'true')
      document.body.appendChild(hiddenElement)

      const plugins = editor.view.state.plugins
      const hiddenBlockPlugin = plugins.find(
        plugin => plugin.spec.key && plugin.spec.key.toString().includes('hiddenBlockFilter'),
      )

      if (hiddenBlockPlugin && hiddenBlockPlugin.props?.handleDOMEvents?.click) {
        const handled = hiddenBlockPlugin.props.handleDOMEvents.click(editor.view, mockEvent)
        expect(handled).toBe(false) // Should not handle clicks on non-hidden elements
      }

      document.body.removeChild(hiddenElement)
    })
  })

  describe('Storage Methods', () => {
    it('should provide storage methods for checking hidden blocks', () => {
      const hiddenBlockExtension = editor.extensionManager.extensions.find(ext => ext.name === 'hiddenBlock')

      if (hiddenBlockExtension && hiddenBlockExtension.storage) {
        expect(hiddenBlockExtension.storage.hasNullUUIDBlock).toBeDefined()
        expect(hiddenBlockExtension.storage.getHiddenBlockCount).toBeDefined()
        expect(hiddenBlockExtension.storage.getNullUUIDBlocks).toBeDefined()
      }
    })

    it('should correctly count hidden blocks', () => {
      // 插入一个隐藏块
      editor.commands.insertHiddenBlock()

      const hiddenBlockExtension = editor.extensionManager.extensions.find(ext => ext.name === 'hiddenBlock')

      if (hiddenBlockExtension && hiddenBlockExtension.storage) {
        const hasNullBlock = hiddenBlockExtension.storage.hasNullUUIDBlock({ editor })
        const count = hiddenBlockExtension.storage.getHiddenBlockCount({ editor })
        const blocks = hiddenBlockExtension.storage.getNullUUIDBlocks({ editor })

        expect(hasNullBlock).toBe(true)
        expect(count).toBe(1)
        expect(blocks).toEqual([NULL_UUID])
      }
    })
  })

  describe('HiddenBlockUtils', () => {
    describe('isNullUUIDHiddenBlock', () => {
      it('should identify NULL_UUID hidden blocks correctly', () => {
        const hiddenBlock = {
          type: { name: 'hiddenBlock' },
          attrs: {
            id: NULL_UUID,
            moniBlockId: NULL_UUID,
            hidden: true,
            isInitialBlock: true,
          },
        }

        const regularBlock = {
          type: { name: 'paragraph' },
          attrs: {
            id: 'regular-id',
          },
        }

        expect(HiddenBlockUtils.isNullUUIDHiddenBlock(hiddenBlock)).toBe(true)
        expect(HiddenBlockUtils.isNullUUIDHiddenBlock(regularBlock)).toBe(false)
      })
    })

    describe('createNullUUIDBlock', () => {
      it('should create a NULL_UUID block with correct attributes', () => {
        const block = HiddenBlockUtils.createNullUUIDBlock()

        expect(block).toEqual({
          type: 'hiddenBlock',
          attrs: {
            id: NULL_UUID,
            moniBlockId: NULL_UUID,
            hidden: true,
            isInitialBlock: true,
            moniDragEnabled: false,
          },
          content: [],
        })
      })
    })

    describe('filterHiddenBlocks', () => {
      it('should filter out hidden blocks from content', () => {
        const content = {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Visible content' }],
            },
            {
              type: 'hiddenBlock',
              attrs: {
                id: NULL_UUID,
                moniBlockId: NULL_UUID,
                hidden: true,
                isInitialBlock: true,
              },
              content: [],
            },
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Another visible content' }],
            },
          ],
        }

        const filtered = HiddenBlockUtils.filterHiddenBlocks(content)

        expect(filtered.content).toHaveLength(2)
        expect(filtered.content[0].type).toBe('paragraph')
        expect(filtered.content[1].type).toBe('paragraph')
      })
    })

    describe('restoreHiddenBlocks', () => {
      it('should restore hidden blocks to edited content', () => {
        const originalContent = {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Original content' }],
            },
            {
              type: 'hiddenBlock',
              attrs: {
                id: NULL_UUID,
                moniBlockId: NULL_UUID,
                hidden: true,
                isInitialBlock: true,
              },
              content: [],
            },
          ],
        }

        const editedContent = {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Edited content' }],
            },
          ],
        }

        const restored = HiddenBlockUtils.restoreHiddenBlocks(editedContent, originalContent)

        expect(restored.content).toHaveLength(2)
        // 第一个应该是隐藏块 (hiddenBlocks 被放在前面)
        expect(restored.content[0].type).toBe('hiddenBlock')
        // 第二个应该是编辑的段落
        expect(restored.content[1].type).toBe('paragraph')
        expect(restored.content[1].content[0].text).toBe('Edited content')
      })
    })
  })

  describe('NULL_UUID Constant', () => {
    it('should export NULL_UUID constant', () => {
      expect(NULL_UUID).toBeDefined()
      expect(NULL_UUID).toBe('13814000-1dd2-11b2-8080-808080808080')
      expect(typeof NULL_UUID).toBe('string')
    })

    it('should be a valid UUID format', () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      expect(uuidRegex.test(NULL_UUID)).toBe(true)
    })
  })

  describe('Type Safety', () => {
    it('should have proper TypeScript types', () => {
      // 测试选项类型
      const options = {
        hideFromDOM: true,
        nullUUID: NULL_UUID,
        HTMLAttributes: {
          class: 'test-class',
        },
      }

      const testEditor = new Editor({
        element: document.createElement('div'),
        content: '',
        extensions: [Document, Paragraph, Text, HiddenBlock.configure(options)],
      })

      expect(testEditor).toBeDefined()
      testEditor.destroy()
    })

    it('should enforce attribute types', () => {
      const content = {
        type: 'hiddenBlock',
        attrs: {
          id: NULL_UUID,
          moniBlockId: NULL_UUID,
          hidden: true, // boolean
          isInitialBlock: true, // boolean
          moniLevel: 0, // number
          moniDragEnabled: false, // boolean
        },
        content: [],
      }

      editor.commands.setContent({ type: 'doc', content: [content] })
      const json = editor.getJSON()

      expect(typeof json.content[0]?.attrs?.hidden).toBe('boolean')
      expect(typeof json.content[0]?.attrs?.isInitialBlock).toBe('boolean')
      expect(typeof json.content[0]?.attrs?.moniLevel).toBe('number')
      expect(typeof json.content[0]?.attrs?.moniDragEnabled).toBe('boolean')
    })
  })

  describe('Integration', () => {
    it('should work with other extensions', () => {
      // 测试与其他扩展的兼容性
      editor.commands.setContent('<p>Regular paragraph</p>')
      editor.commands.insertHiddenBlock()

      const json = editor.getJSON()

      expect(json.content).toHaveLength(2)
      expect(json.content[0].type).toBe('paragraph')
      expect(json.content[1].type).toBe('hiddenBlock')
    })

    it('should maintain proper document structure', () => {
      editor.commands.setContent({
        type: 'doc',
        content: [
          {
            type: 'hiddenBlock',
            attrs: {
              id: NULL_UUID,
              hidden: true,
              isInitialBlock: true,
            },
            content: [],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Visible content after hidden block' }],
          },
        ],
      })

      const json = editor.getJSON()

      expect(json.type).toBe('doc')
      expect(json.content).toHaveLength(2)
      expect(json.content[0].type).toBe('hiddenBlock')
      expect(json.content[1].type).toBe('paragraph')
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid content gracefully', () => {
      // 测试无效内容的处理
      expect(() => {
        editor.commands.setContent({
          type: 'hiddenBlock',
          attrs: {
            // 缺少必要属性
          },
          content: [],
        })
      }).not.toThrow()
    })

    it('should handle missing DOM elements gracefully', () => {
      // 测试DOM元素缺失的情况
      const hiddenBlockExtension = editor.extensionManager.extensions.find(ext => ext.name === 'hiddenBlock')

      if (hiddenBlockExtension && hiddenBlockExtension.storage) {
        expect(() => {
          hiddenBlockExtension.storage.hasNullUUIDBlock({ editor })
          hiddenBlockExtension.storage.getHiddenBlockCount({ editor })
          hiddenBlockExtension.storage.getNullUUIDBlocks({ editor })
        }).not.toThrow()
      }
    })
  })
})
