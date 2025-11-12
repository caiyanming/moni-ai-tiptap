import type { Node } from '@tiptap/pm/model'

/**
 * 获取节点属性，自动应用默认值
 *
 * 当属性值等于 Schema 的 default 时，返回业务层指定的默认值。
 * 这样业务代码可以不依赖 Schema 的 default 定义。
 *
 * @example
 * ```typescript
 * // Schema 定义：moniLevel: { default: null }
 * // 节点创建：schema.node('paragraph', {})
 * // → node.attrs.moniLevel === null（Schema default）
 *
 * // 业务代码希望默认值是 0
 * const level = getNodeAttr(node, 'moniLevel', 0)  // → 0
 * ```
 *
 * @param node - ProseMirror Node
 * @param attrName - 属性名
 * @param defaultValue - 默认值（当属性等于 Schema default 时返回）
 * @returns 属性值或默认值
 */
export function getNodeAttr<T>(node: Node, attrName: string, defaultValue: T): T {
  const value = node.attrs[attrName]
  const schemaDefault = node.type.spec.attrs?.[attrName]?.default

  // 如果当前值等于 Schema 默认值，返回业务默认值
  if (Object.is(value, schemaDefault)) {
    return defaultValue
  }

  return value
}

/**
 * 批量获取节点属性
 *
 * @example
 * ```typescript
 * const { moniLevel, moniBlockId } = getNodeAttrs(node, {
 *   moniLevel: 0,
 *   moniBlockId: null,
 * })
 * ```
 */
export function getNodeAttrs<T extends Record<string, any>>(node: Node, defaults: T): T {
  const result = { ...defaults }

  Object.keys(defaults).forEach(key => {
    const value = node.attrs[key]
    if (value !== undefined) {
      result[key] = value
    }
  })

  return result
}

/**
 * 检查属性是否被显式设置（非默认值）
 *
 * @example
 * ```typescript
 * // Schema 定义：moniLevel: { default: null }
 * // 节点创建：schema.node('paragraph', { moniLevel: 2 })
 *
 * if (hasNodeAttr(node, 'moniLevel')) {
 *   // → true（用户显式设置了）
 * }
 *
 * // 节点创建：schema.node('paragraph', {})
 * if (hasNodeAttr(node, 'moniLevel')) {
 *   // → false（等于 Schema default）
 * }
 * ```
 */
export function hasNodeAttr(node: Node, attrName: string): boolean {
  const value = node.attrs[attrName]
  const schemaDefault = node.type.spec.attrs?.[attrName]?.default

  // 如果当前值不等于 Schema 默认值，说明被显式设置了
  return !Object.is(value, schemaDefault)
}
