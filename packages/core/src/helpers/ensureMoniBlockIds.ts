import type { Schema } from '@tiptap/pm/model'

import type { JSONContent } from '../types.js'
import { generateMoniBlockId } from './generateMoniBlockId.js'

/**
 * 判断节点是否需要 moniBlockId。
 *
 * 策略：仅当 Schema 中的该节点类型定义了 moniBlockId 属性时才认为是“真正的 Notion block”。
 * 这样可以避免给内联节点或未声明的类型强行添加属性。
 */
function shouldAssignMoniBlockId(schema: Schema, typeName?: string): boolean {
  if (!typeName) {
    return false
  }

  const nodeType = schema.nodes[typeName]
  if (!nodeType || !nodeType.spec?.attrs) {
    return false
  }

  return Object.prototype.hasOwnProperty.call(nodeType.spec.attrs, 'moniBlockId')
}

export function ensureMoniBlockIdsInJSON(json: JSONContent, schema: Schema): JSONContent {
  // 创建副本，避免修改原对象
  const result = { ...json }

  // 🔥 只给 Schema 中声明了 moniBlockId 属性的节点生成 ID
  if (shouldAssignMoniBlockId(schema, result.type)) {
    // toJSON 可能已经删除了 attrs（如果所有属性都是默认值）
    // 我们需要重新创建它
    if (!result.attrs) {
      result.attrs = {}
    }

    // 如果没有 moniBlockId 或者 moniBlockId 是 null，生成一个
    if (!result.attrs.moniBlockId || result.attrs.moniBlockId === null) {
      result.attrs.moniBlockId = generateMoniBlockId()
    }
  }

  // 递归处理子节点
  if (result.content && Array.isArray(result.content)) {
    result.content = result.content.map(child => ensureMoniBlockIdsInJSON(child, schema))
  }

  return result
}
