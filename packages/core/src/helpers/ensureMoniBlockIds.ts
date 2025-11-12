import type { JSONContent } from '../types.js'
import { generateMoniBlockId } from './generateMoniBlockId.js'

/**
 * 递归遍历 JSON 内容，为所有块级节点生成 moniBlockId
 * 
 * 用途：
 * - generateJSON: 确保从 HTML 生成的 JSON 有 blockId
 * - generateHTML: 确保渲染到 HTML 前 JSON 有 blockId
 */
export function ensureMoniBlockIdsInJSON(json: JSONContent): JSONContent {
  // 创建副本，避免修改原对象
  const result = { ...json }

  // 排除 doc 节点和文本节点
  if (result.type !== 'doc' && result.type !== 'text') {
    // 🔥 关键：toJSON 可能已经删除了 attrs（如果所有属性都是默认值）
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
    result.content = result.content.map(child => ensureMoniBlockIdsInJSON(child))
  }

  return result
}
