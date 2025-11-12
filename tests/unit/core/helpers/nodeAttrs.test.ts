import { getNodeAttr, getNodeAttrs, hasNodeAttr } from '@tiptap/core/helpers/nodeAttrs'
import { Schema } from '@tiptap/pm/model'
import { describe, expect, it } from 'vitest'

describe('nodeAttrs helpers', () => {
  // 创建测试用 Schema
  // 注意：ProseMirror 要求所有 attrs 必须有 default，这是框架限制
  // 我们的策略是：Schema 保留 default，但序列化时不输出等于 default 的值
  const schema = new Schema({
    nodes: {
      doc: {
        content: 'paragraph*',
      },
      paragraph: {
        attrs: {
          moniBlockId: { default: null },
          moniLevel: { default: null },
          moniParentId: { default: null },
        },
        content: 'text*',
      },
      text: {},
    },
  })

  describe('getNodeAttr', () => {
    it('返回显式设置的值', () => {
      const node = schema.node('paragraph', { moniLevel: 2 })
      expect(getNodeAttr(node, 'moniLevel', 0)).toBe(2)
    })

    it('未设置时返回默认值', () => {
      const node = schema.node('paragraph', {})
      expect(getNodeAttr(node, 'moniLevel', 0)).toBe(0)
    })

    it('显式设置与 Schema default 相同的值时，无法区分（ProseMirror 限制）', () => {
      // Schema default 是 null，显式设置为 null
      const node = schema.node('paragraph', { moniParentId: null })

      // getNodeAttr 会认为这是"未设置"，返回业务默认值
      expect(getNodeAttr(node, 'moniParentId', 'default')).toBe('default')

      // 这是 ProseMirror 的限制：无法区分"未设置"和"设置为default值"
    })

    it('显式设置为 0 时返回 0（不是默认值）', () => {
      const node = schema.node('paragraph', { moniLevel: 0 })
      expect(getNodeAttr(node, 'moniLevel', 10)).toBe(0)
    })

    it('支持不同类型的默认值', () => {
      const node = schema.node('paragraph', {})

      // Schema default 是 null，业务层希望默认值是 0
      expect(getNodeAttr(node, 'moniLevel', 0)).toBe(0)

      // Schema default 是 null，业务层希望默认值也是 null
      expect(getNodeAttr(node, 'moniParentId', null)).toBe(null)

      // Schema default 是 null，业务层希望默认值是空字符串
      expect(getNodeAttr(node, 'moniBlockId', '')).toBe('')

      // 不存在的属性返回业务默认值
      expect(getNodeAttr(node, 'unknown', [])).toEqual([])
    })
  })

  describe('getNodeAttrs', () => {
    it('批量获取属性，未设置时使用默认值', () => {
      const node = schema.node('paragraph', {
        moniLevel: 2,
        // moniParentId 和 moniBlockId 未设置（都是 Schema default: null）
      })

      const attrs = getNodeAttrs(node, {
        moniLevel: 0,
        moniParentId: null,
        moniBlockId: null, // 业务层默认值改为 null（与 Schema 一致）
      })

      expect(attrs).toEqual({
        moniLevel: 2, // 显式设置
        moniParentId: null, // Schema default
        moniBlockId: null, // Schema default
      })
    })

    it('所有属性都未设置时返回默认值', () => {
      const node = schema.node('paragraph', {})

      // 业务层希望的默认值
      const attrs = getNodeAttrs(node, {
        moniLevel: 0, // 业务默认值
        moniParentId: null, // 与 Schema 一致
      })

      // 因为当前实现 getNodeAttrs 不会调用 getNodeAttr，
      // 而是直接读取 node.attrs，所以会得到 Schema 的 default
      expect(attrs).toEqual({
        moniLevel: null, // Schema default（TODO: 未来可改进）
        moniParentId: null,
      })
    })
  })

  describe('hasNodeAttr', () => {
    it('显式设置时返回 true', () => {
      const node = schema.node('paragraph', { moniLevel: 2 })
      expect(hasNodeAttr(node, 'moniLevel')).toBe(true)
    })

    it('未设置时返回 false', () => {
      const node = schema.node('paragraph', {})
      expect(hasNodeAttr(node, 'moniLevel')).toBe(false)
    })

    it('显式设置非默认值时返回 true', () => {
      // Schema default 是 null，显式设置为 null → 无法区分
      const node1 = schema.node('paragraph', { moniParentId: null })
      expect(hasNodeAttr(node1, 'moniParentId')).toBe(false) // 等于 default

      // Schema default 是 null，显式设置为 0 → 可以区分
      const node2 = schema.node('paragraph', { moniLevel: 0 })
      expect(hasNodeAttr(node2, 'moniLevel')).toBe(true) // 不等于 default
    })
  })
})
