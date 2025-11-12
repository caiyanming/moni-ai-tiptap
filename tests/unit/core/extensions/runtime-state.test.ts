import { Editor } from '@tiptap/core'
import { RuntimeState } from '@tiptap/core/extensions/runtime-state'
import { Document } from '@tiptap/extension-document'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Text } from '@tiptap/extension-text'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

describe('RuntimeState Extension', () => {
  let editor: Editor

  beforeEach(() => {
    editor = new Editor({
      extensions: [Document, Paragraph, Text, RuntimeState],
      content: '<p>Hello</p>',
    })
  })

  afterEach(() => {
    editor.destroy()
  })

  describe('dragEnabled state', () => {
    it('默认返回 undefined（未设置）', () => {
      const storage = editor.storage.runtimeState
      expect(storage.dragEnabled.get('block-123')).toBeUndefined()
    })

    it('可以设置和读取拖拽状态', () => {
      const storage = editor.storage.runtimeState

      editor.commands.setDragEnabled('block-123', false)
      expect(storage.dragEnabled.get('block-123')).toBe(false)

      editor.commands.setDragEnabled('block-123', true)
      expect(storage.dragEnabled.get('block-123')).toBe(true)
    })

    it('不同节点的状态独立', () => {
      const storage = editor.storage.runtimeState

      editor.commands.setDragEnabled('block-1', true)
      editor.commands.setDragEnabled('block-2', false)

      expect(storage.dragEnabled.get('block-1')).toBe(true)
      expect(storage.dragEnabled.get('block-2')).toBe(false)
    })
  })

  describe('streamMode state', () => {
    it('默认返回 undefined（未设置）', () => {
      const storage = editor.storage.runtimeState
      expect(storage.streamMode.get('block-123')).toBeUndefined()
    })

    it('可以设置和读取 Stream 模式', () => {
      const storage = editor.storage.runtimeState

      editor.commands.setStreamMode('block-123', 'insert')
      expect(storage.streamMode.get('block-123')).toBe('insert')

      editor.commands.setStreamMode('block-123', 'replace')
      expect(storage.streamMode.get('block-123')).toBe('replace')
    })
  })

  describe('diffTemp state', () => {
    it('默认没有临时 ID', () => {
      const storage = editor.storage.runtimeState
      expect(storage.diffTempIds.has('temp-123')).toBe(false)
    })

    it('可以添加和检查临时 ID', () => {
      const storage = editor.storage.runtimeState

      editor.commands.addDiffTempId('temp-123')
      expect(storage.diffTempIds.has('temp-123')).toBe(true)
    })

    it('可以清除所有临时 ID', () => {
      const storage = editor.storage.runtimeState

      editor.commands.addDiffTempId('temp-1')
      editor.commands.addDiffTempId('temp-2')

      editor.commands.clearDiffTemp()

      expect(storage.diffTempIds.has('temp-1')).toBe(false)
      expect(storage.diffTempIds.has('temp-2')).toBe(false)
    })
  })

  describe('tempBlock state', () => {
    it('默认没有临时块', () => {
      const storage = editor.storage.runtimeState
      expect(storage.tempBlocks.get('block-123')).toBeUndefined()
    })

    it('可以设置和读取临时块', () => {
      const storage = editor.storage.runtimeState
      const blockData = { type: 'paragraph', content: 'test' }

      editor.commands.setTempBlock('block-123', blockData)
      expect(storage.tempBlocks.get('block-123')).toEqual(blockData)
    })

    it('可以清除临时块', () => {
      const storage = editor.storage.runtimeState

      editor.commands.setTempBlock('block-123', { data: 'test' })
      editor.commands.clearTempBlock('block-123')

      expect(storage.tempBlocks.get('block-123')).toBeUndefined()
    })

    it('clearDiffTemp 会清除所有临时块', () => {
      const storage = editor.storage.runtimeState

      editor.commands.setTempBlock('block-1', { data: 'test1' })
      editor.commands.setTempBlock('block-2', { data: 'test2' })

      editor.commands.clearDiffTemp()

      expect(storage.tempBlocks.get('block-1')).toBeUndefined()
      expect(storage.tempBlocks.get('block-2')).toBeUndefined()
    })
  })

  describe('序列化隔离', () => {
    it('运行时状态不会出现在 getJSON 输出中', () => {
      editor.commands.setDragEnabled('block-123', false)
      editor.commands.setStreamMode('block-456', 'insert')
      editor.commands.addDiffTempId('temp-789')

      const json = editor.getJSON()

      // JSON 中不应该包含任何运行时状态
      expect(JSON.stringify(json)).not.toContain('dragEnabled')
      expect(JSON.stringify(json)).not.toContain('streamMode')
      expect(JSON.stringify(json)).not.toContain('diffTempId')
    })
  })

  describe('生命周期', () => {
    it('销毁编辑器时清理所有状态', () => {
      editor.commands.setDragEnabled('block-1', false)
      editor.commands.setStreamMode('block-2', 'insert')

      const storage = editor.storage.runtimeState

      editor.destroy()

      // 验证 Map/Set 已清空
      expect(storage.dragEnabled.size).toBe(0)
      expect(storage.streamMode.size).toBe(0)
      expect(storage.diffTempIds.size).toBe(0)
      expect(storage.tempBlocks.size).toBe(0)
    })
  })
})
