import { Node as ProseMirrorNode } from '@tiptap/pm/model'

/**
 * Patch ProseMirror Node.prototype.toJSON
 *
 * 目标：序列化时只输出"非默认值"的属性，遵循 HTML 哲学
 *
 * 原理：
 * 1. ProseMirror 默认序列化所有 attrs（包括默认值）
 * 2. 我们拦截 toJSON，过滤掉等于 Schema default 的值
 * 3. 这样 editor.getJSON() / generateJSON() 自动返回清洁的 JSON
 *
 * 影响范围：全局生效，所有 Node 类型
 */

let patched = false

export function patchNodeToJSON() {
  // 防止重复 patch
  if (patched) {
    return
  }

  const originalToJSON = ProseMirrorNode.prototype.toJSON

  // 覆写 toJSON 方法
  ProseMirrorNode.prototype.toJSON = function (this: ProseMirrorNode) {
    // 调用原始方法获取基础 JSON
    const json = originalToJSON.call(this) as any

    // 只处理有 attrs 的节点
    if (json.attrs && this.type.spec.attrs) {
      const filtered: Record<string, any> = {}

      Object.entries(json.attrs).forEach(([name, value]) => {
        const attrSpec = this.type.spec.attrs![name]

        // 如果没有定义或者值不等于默认值，则保留
        if (!attrSpec || !Object.is(value, attrSpec.default)) {
          filtered[name] = value
        }
      })

      // 如果所有属性都被过滤掉，删除 attrs 字段
      if (Object.keys(filtered).length === 0) {
        delete json.attrs
      } else {
        json.attrs = filtered
      }
    }

    return json
  }

  patched = true

  // 返回恢复函数（用于测试）
  return () => {
    ProseMirrorNode.prototype.toJSON = originalToJSON
    patched = false
  }
}

/**
 * 检查是否已 patch
 */
export function isNodeToJSONPatched(): boolean {
  return patched
}
