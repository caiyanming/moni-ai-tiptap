import { Editor } from '@tiptap/core'
import { Document } from '@tiptap/extension-document'
import { FileChildrenBlock, NULL_UUID } from '@tiptap/extension-file-children-block'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Text } from '@tiptap/extension-text'
import { UniqueID } from '@tiptap/extension-unique-id'
import { beforeEach, describe, expect, it } from 'vitest'

/**
 * FileChildrenBlock 扩展完整集成测试
 *
 * 这个测试文件专注于验证 FileChildrenBlock 的核心功能：
 * 1. ✅ 基础扩展注册和配置
 * 2. ✅ NULL_UUID 作为 AI Block Stream 目标锚点
 * 3. ✅ 块属性的正确管理（collapsed, displayMode）
 * 4. ✅ 命令接口和存储方法
 * 5. ✅ HTML 序列化和反序列化
 * 6. ✅ 与 UniqueID 扩展的集成
 */

describe('FileChildrenBlock Extension - Real-World Integration', () => {
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
          types: ['paragraph', 'fileChildrenBlock'],
          generateID: () => crypto.randomUUID(),
        }),
        // 🔥 FileChildrenBlock 扩展 - AI Block Stream 目标
        FileChildrenBlock.configure({
          // 零配置设计
        }),
      ],
      content: '<p>Initial content</p>',
    })
  })

  describe('🔧 基础扩展功能', () => {
    it('should register the extension correctly', () => {
      expect(editor.isActive('fileChildrenBlock')).toBe(false)
      expect(editor.extensionManager.extensions.find(ext => ext.name === 'fileChildrenBlock')).toBeDefined()
    })

    it('should use NULL_UUID as default id and moniBlockId', () => {
      const extension = editor.extensionManager.extensions.find(ext => ext.name === 'fileChildrenBlock')
      expect(extension?.options.nullUUID).toBe(NULL_UUID)
      expect(NULL_UUID).toBe('13814000-1dd2-11b2-8080-808080808080')
    })

    it('should have correct default attributes', () => {
      editor.chain().focus().insertFileChildrenBlock().run()

      const json = editor.getJSON()
      const fileChildrenBlock = json.content?.find(node => node.type === 'fileChildrenBlock')

      expect(fileChildrenBlock).toBeDefined()
      expect(fileChildrenBlock?.attrs).toEqual({
        id: NULL_UUID,
        moniBlockId: NULL_UUID,
        collapsed: true,
        displayMode: 'list',
        moniDragEnabled: false,
      })
    })
  })

  describe('🎯 AI Block Stream 目标功能', () => {
    it('should maintain fixed NULL_UUID for AI targeting', () => {
      // 插入 FileChildrenBlock
      editor.chain().focus().insertFileChildrenBlock().run()

      // 验证 NULL_UUID 不变
      const json = editor.getJSON()
      const block = json.content?.find(node => node.type === 'fileChildrenBlock')

      expect(block?.attrs.id).toBe(NULL_UUID)
      expect(block?.attrs.moniBlockId).toBe(NULL_UUID)

      // 即使尝试更新属性，NULL_UUID 也应该保持
      // 需要先选中该节点才能更新属性
      const info = editor.storage.fileChildrenBlock.getFileChildrenBlockInfo(editor)
      editor.commands.setNodeSelection(info.pos)
      editor.commands.updateAttributes('fileChildrenBlock', { collapsed: false })

      const updatedJson = editor.getJSON()
      const updatedBlock = updatedJson.content?.find(node => node.type === 'fileChildrenBlock')

      expect(updatedBlock?.attrs.id).toBe(NULL_UUID)
      expect(updatedBlock?.attrs.moniBlockId).toBe(NULL_UUID)
      expect(updatedBlock?.attrs.collapsed).toBe(false)
    })

    it('should be easily findable by AI Block Stream operations', () => {
      editor.chain().focus().insertFileChildrenBlock().run()

      // 模拟 AI Block Stream 查找目标块
      let targetBlock = null
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'fileChildrenBlock' && node.attrs.id === NULL_UUID) {
          targetBlock = { node, pos }
          return false
        }
      })

      expect(targetBlock).not.toBeNull()
      expect(targetBlock.node.attrs.id).toBe(NULL_UUID)
    })
  })

  describe('🎛️ 块状态管理', () => {
    beforeEach(() => {
      editor.chain().focus().insertFileChildrenBlock().run()
    })

    it('should toggle collapsed state correctly', () => {
      // 首先需要插入 FileChildrenBlock，然后获取它的当前属性
      const info = editor.storage.fileChildrenBlock.getFileChildrenBlockInfo(editor)
      expect(info.attrs.collapsed).toBe(true)

      editor.commands.setNodeSelection(info.pos)
      editor.commands.updateAttributes('fileChildrenBlock', { collapsed: false })
      const updatedInfo = editor.storage.fileChildrenBlock.getFileChildrenBlockInfo(editor)
      expect(updatedInfo.attrs.collapsed).toBe(false)

      editor.commands.setNodeSelection(updatedInfo.pos)
      editor.commands.updateAttributes('fileChildrenBlock', { collapsed: true })
      const finalInfo = editor.storage.fileChildrenBlock.getFileChildrenBlockInfo(editor)
      expect(finalInfo.attrs.collapsed).toBe(true)
    })

    it('should cycle display modes correctly', () => {
      const modes = ['list', 'grid', 'cards']

      // 默认是 list
      const initialInfo = editor.storage.fileChildrenBlock.getFileChildrenBlockInfo(editor)
      expect(initialInfo.attrs.displayMode).toBe('list')

      // 循环切换显示模式
      modes.forEach(mode => {
        const currentInfo = editor.storage.fileChildrenBlock.getFileChildrenBlockInfo(editor)
        editor.commands.setNodeSelection(currentInfo.pos)
        editor.commands.updateAttributes('fileChildrenBlock', { displayMode: mode })
        const updatedInfo = editor.storage.fileChildrenBlock.getFileChildrenBlockInfo(editor)
        expect(updatedInfo.attrs.displayMode).toBe(mode)
      })
    })

    it('should maintain moniDragEnabled as false', () => {
      const info = editor.storage.fileChildrenBlock.getFileChildrenBlockInfo(editor)
      expect(info.attrs.moniDragEnabled).toBe(false)

      // 系统应该强制保持moniDragEnabled为false，即使使用updateAttributes
      editor.commands.setNodeSelection(info.pos)
      editor.commands.updateAttributes('fileChildrenBlock', { moniDragEnabled: true })
      const updatedInfo = editor.storage.fileChildrenBlock.getFileChildrenBlockInfo(editor)

      // ProseMirror插件应该拦截并修正这个更新
      expect(updatedInfo.attrs.moniDragEnabled).toBe(false)
    })
  })

  describe('💾 存储方法', () => {
    it('should detect if document has FileChildrenBlock', () => {
      const storage = editor.storage.fileChildrenBlock

      // 初始状态没有 FileChildrenBlock
      expect(storage.hasFileChildrenBlock(editor)).toBe(false)

      // 插入 FileChildrenBlock
      editor.chain().focus().insertFileChildrenBlock().run()

      // 现在应该检测到
      expect(storage.hasFileChildrenBlock(editor)).toBe(true)
    })

    it('should get FileChildrenBlock info correctly', () => {
      const storage = editor.storage.fileChildrenBlock

      // 初始状态没有信息
      expect(storage.getFileChildrenBlockInfo(editor)).toBeNull()

      // 插入 FileChildrenBlock
      editor.chain().focus().insertFileChildrenBlock().run()

      // 获取块信息
      const info = storage.getFileChildrenBlockInfo(editor)
      expect(info).not.toBeNull()
      expect(info.node.type.name).toBe('fileChildrenBlock')
      expect(info.attrs.id).toBe(NULL_UUID)
      expect(info.pos).toBeGreaterThanOrEqual(0)
    })

    it('should update block state through storage methods', () => {
      const storage = editor.storage.fileChildrenBlock

      // 插入 FileChildrenBlock
      editor.chain().focus().insertFileChildrenBlock().run()

      // 获取块信息并选中节点 (updateAttributes需要选中节点)
      const initialInfo = storage.getFileChildrenBlockInfo(editor)
      editor.commands.setNodeSelection(initialInfo.pos)

      // 通过存储方法更新状态
      const success = storage.updateFileChildrenBlockState(editor, {
        collapsed: false,
        displayMode: 'grid',
      })

      expect(success).toBe(true)

      const info = storage.getFileChildrenBlockInfo(editor)
      expect(info.attrs.collapsed).toBe(false)
      expect(info.attrs.displayMode).toBe('grid')

      // 验证存储方法正确处理了核心属性
      expect(info.attrs.id).toBe(NULL_UUID)
      expect(info.attrs.moniBlockId).toBe(NULL_UUID)
    })
  })

  describe('🔄 HTML 序列化', () => {
    it('should serialize to correct HTML structure', () => {
      editor.chain().focus().insertFileChildrenBlock().run()

      const html = editor.getHTML()

      // 应该包含正确的 data 属性
      expect(html).toContain('data-file-children-block="true"')
      expect(html).toContain(`data-id="${NULL_UUID}"`)
      expect(html).toContain(`data-moni-block-id="${NULL_UUID}"`)
      expect(html).toContain(`data-ai-target="${NULL_UUID}"`)
      expect(html).toContain('class="file-children-block-container"')
      expect(html).toContain('data-collapsed="true"')
      expect(html).toContain('data-display-mode="list"')
      expect(html).toContain('data-moni-drag-enabled="false"')
    })

    it('should parse HTML correctly', () => {
      const html = `
        <div
          data-file-children-block="true"
          data-id="${NULL_UUID}"
          data-moni-block-id="${NULL_UUID}"
          data-collapsed="false"
          data-display-mode="grid"
          class="file-children-block-container"
        ></div>
      `

      editor.commands.setContent(html)

      const json = editor.getJSON()
      const block = json.content?.find(node => node.type === 'fileChildrenBlock')

      expect(block).toBeDefined()
      expect(block?.attrs.id).toBe(NULL_UUID)
      expect(block?.attrs.moniBlockId).toBe(NULL_UUID)
      expect(block?.attrs.collapsed).toBe(false)
      expect(block?.attrs.displayMode).toBe('grid')
    })
  })

  describe('🏗️ 真实场景集成', () => {
    it('should work in complex document structure', () => {
      // 创建复杂文档结构
      const complexContent = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: '这是一个包含 FileChildrenBlock 的复杂文档' }],
          },
          {
            type: 'fileChildrenBlock',
            attrs: {
              id: NULL_UUID,
              moniBlockId: NULL_UUID,
              collapsed: false,
              displayMode: 'cards',
              moniDragEnabled: false,
            },
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'FileChildrenBlock 之后的内容' }],
          },
        ],
      }

      editor.commands.setContent(complexContent)

      const storage = editor.storage.fileChildrenBlock
      expect(storage.hasFileChildrenBlock(editor)).toBe(true)

      const info = storage.getFileChildrenBlockInfo(editor)
      expect(info.attrs.displayMode).toBe('cards')
      expect(info.attrs.collapsed).toBe(false)
    })

    it('should maintain data integrity during document operations', () => {
      // 插入初始内容
      editor.chain().focus().insertFileChildrenBlock().run()
      editor.chain().focus().insertContent('<p>After block</p>').run()

      // 验证初始状态
      const storage = editor.storage.fileChildrenBlock
      expect(storage.hasFileChildrenBlock(editor)).toBe(true)

      // 注释掉撤销/重做操作，因为没有History扩展
      // editor.commands.undo()
      // expect(storage.hasFileChildrenBlock(editor)).toBe(true)

      // editor.commands.redo()
      // expect(storage.hasFileChildrenBlock(editor)).toBe(true)

      // 验证 NULL_UUID 始终保持不变
      const info = storage.getFileChildrenBlockInfo(editor)
      expect(info.attrs.id).toBe(NULL_UUID)
      expect(info.attrs.moniBlockId).toBe(NULL_UUID)
    })
  })

  describe('⚠️ 错误处理', () => {
    it('should handle missing block gracefully', () => {
      const storage = editor.storage.fileChildrenBlock

      // 在没有 FileChildrenBlock 的情况下调用更新
      const result = storage.updateFileChildrenBlockState(editor, { collapsed: false })
      expect(result).toBe(false)
    })

    it('should validate display mode values', () => {
      editor.chain().focus().insertFileChildrenBlock().run()

      const storage = editor.storage.fileChildrenBlock

      // 确保默认值正确
      const initialInfo = storage.getFileChildrenBlockInfo(editor)
      expect(initialInfo.attrs.displayMode).toBe('list')

      // 选中节点
      editor.commands.setNodeSelection(initialInfo.pos)

      // 系统应该拒绝无效的displayMode值
      editor.commands.updateAttributes('fileChildrenBlock', { displayMode: 'invalid' })
      const updatedInfo = storage.getFileChildrenBlockInfo(editor)

      // ProseMirror插件应该自动修正无效值为默认值
      expect(updatedInfo.attrs.displayMode).toBe('list')
    })
  })
})
