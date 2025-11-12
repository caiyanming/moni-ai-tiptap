import { Editor } from '@tiptap/core'
import { RuntimeState } from '@tiptap/core/extensions/runtime-state'
import { Document } from '@tiptap/extension-document'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Text } from '@tiptap/extension-text'
import { afterEach,beforeEach, describe, expect, it } from 'vitest'

describe('Paragraph Extension - 新架构验证', () => {
  let editor: Editor

  beforeEach(() => {
    editor = new Editor({
      extensions: [Document, Paragraph, Text, RuntimeState],
      content: '<p>Hello World</p>',
    })
  })

  afterEach(() => {
    editor.destroy()
  })

  describe('持久化属性', () => {
    it('默认情况下不序列化默认值（Phase 5 完成）', () => {
      const json = editor.getJSON()

      // Phase 5 后：默认值已被过滤
      const para = json.content?.[0]

      // moniBlockId 仍会被自动生成（Phase 4 要修复）
      // 其他默认值应该不存在
      if (para.attrs) {
        // 如果有 attrs，应该只包含非默认值
        expect(para.attrs.moniLevel).toBeUndefined() // 0 是默认值，被过滤
        expect(para.attrs.moniParentId).toBeUndefined() // null 是默认值，被过滤
      }
    })

    it('显式设置 moniBlockId 后会被序列化', () => {
      // 使用 ProseMirror Transaction 直接设置
      editor.view.dispatch(
        editor.state.tr.setNodeMarkup(0, null, {
          moniBlockId: 'block-123',
        }),
      )

      const json = editor.getJSON()
      expect(json.content?.[0].attrs?.moniBlockId).toBe('block-123')
    })

    it('显式设置 moniLevel 后会被序列化', () => {
      editor.view.dispatch(
        editor.state.tr.setNodeMarkup(0, null, {
          moniLevel: 2,
        }),
      )

      const json = editor.getJSON()
      expect(json.content?.[0].attrs?.moniLevel).toBe(2)
    })

    it('设置 moniLevel 为 0（默认值）不会被序列化（Phase 5 完成）', () => {
      editor.view.dispatch(
        editor.state.tr.setNodeMarkup(0, null, {
          moniBlockId: 'test', // 非默认值
          moniLevel: 0, // 默认值
        }),
      )

      const json = editor.getJSON()

      // Phase 5 后：等于默认值会被过滤
      expect(json.content?.[0].attrs?.moniBlockId).toBe('test') // 保留
      expect(json.content?.[0].attrs?.moniLevel).toBeUndefined() // 被过滤
    })

    it('同时设置多个属性', () => {
      editor.view.dispatch(
        editor.state.tr.setNodeMarkup(0, null, {
          moniBlockId: 'block-abc',
          moniParentId: 'parent-xyz',
          moniLevel: 1,
        }),
      )

      const json = editor.getJSON()

      expect(json.content?.[0].attrs?.moniBlockId).toBe('block-abc')
      expect(json.content?.[0].attrs?.moniParentId).toBe('parent-xyz')
      expect(json.content?.[0].attrs?.moniLevel).toBe(1)
    })
  })

  describe('运行时属性分离', () => {
    it('拖拽状态存储在 RuntimeState，不会被序列化', () => {
      const storage = editor.storage.runtimeState

      // 设置拖拽状态
      editor.commands.setDragEnabled('block-123', false)

      // 验证状态已保存
      expect(storage.dragEnabled.get('block-123')).toBe(false)

      // 验证不会出现在 JSON 中
      const json = editor.getJSON()
      expect(JSON.stringify(json)).not.toContain('dragEnabled')
      expect(JSON.stringify(json)).not.toContain('moniDragEnabled')
    })

    it('Stream 模式存储在 RuntimeState，不会被序列化', () => {
      const storage = editor.storage.runtimeState

      // 设置 Stream 模式
      editor.commands.setStreamMode('block-456', 'insert')

      // 验证状态已保存
      expect(storage.streamMode.get('block-456')).toBe('insert')

      // 验证不会出现在 JSON 中
      const json = editor.getJSON()
      expect(JSON.stringify(json)).not.toContain('streamMode')
      expect(JSON.stringify(json)).not.toContain('moniStreamMode')
    })
  })

  describe('HTML 渲染', () => {
    it('默认段落会渲染自动生成的 moniBlockId（Phase 4 前）', () => {
      const html = editor.getHTML()
      // Phase 4 前：commands 自动生成 blockId
      // Phase 4 后：不会自动生成
      expect(html).toContain('data-moni-block-id')
    })

    it('有 moniBlockId 时渲染 data 属性', () => {
      editor.view.dispatch(
        editor.state.tr.setNodeMarkup(0, null, {
          moniBlockId: 'block-123',
        }),
      )

      const html = editor.getHTML()
      expect(html).toContain('data-moni-block-id="block-123"')
    })

    it('moniLevel 为 0 时不渲染', () => {
      editor.view.dispatch(
        editor.state.tr.setNodeMarkup(0, null, {
          moniBlockId: 'test', // 需要设置，否则 setNodeMarkup 报错
          moniLevel: 0,
        }),
      )

      const html = editor.getHTML()
      expect(html).not.toContain('data-moni-level')
    })

    it('moniLevel 非 0 时渲染', () => {
      editor.view.dispatch(
        editor.state.tr.setNodeMarkup(0, null, {
          moniBlockId: 'test',
          moniLevel: 2,
        }),
      )

      const html = editor.getHTML()
      expect(html).toContain('data-moni-level="2"')
    })
  })

  describe('保存 → 加载往返', () => {
    it('序列化 → 反序列化后保持一致', () => {
      // 设置属性
      editor.view.dispatch(
        editor.state.tr.setNodeMarkup(0, null, {
          moniBlockId: 'block-test',
          moniLevel: 3,
        }),
      )

      // 序列化
      const json = editor.getJSON()

      // 创建新编辑器加载
      const editor2 = new Editor({
        extensions: [Document, Paragraph, Text],
        content: json,
      })

      // 验证属性正确恢复
      const para = editor2.state.doc.firstChild
      expect(para?.attrs.moniBlockId).toBe('block-test')
      expect(para?.attrs.moniLevel).toBe(3)

      // 验证默认值也正确
      expect(para?.attrs.moniParentId).toBe(null)

      editor2.destroy()
    })

    it('默认值在加载后由 Schema 自动填充', () => {
      const json = {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            // ← 没有 attrs
            content: [{ type: 'text', text: 'Test' }],
          },
        ],
      }

      const editor2 = new Editor({
        extensions: [Document, Paragraph, Text],
        content: json,
      })

      const para = editor2.state.doc.firstChild

      // ProseMirror 自动填充 Schema 默认值
      expect(para?.attrs.moniBlockId).toBe(null)
      expect(para?.attrs.moniParentId).toBe(null)
      expect(para?.attrs.moniLevel).toBe(0)

      editor2.destroy()
    })
  })
})
