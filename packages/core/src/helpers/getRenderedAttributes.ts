import type { Mark, Node } from '@tiptap/pm/model'

import type { ExtensionAttribute } from '../types.js'
import { mergeAttributes } from '../utilities/mergeAttributes.js'

/**
 * 将驼峰命名的 moni 属性转换为正确的 HTML data 属性格式
 * 例如: moniBlockId -> data-moni-block-id
 */
function convertMoniAttributeName(attributeName: string): string {
  // 只处理 moni 开头的属性
  if (!attributeName.startsWith('moni')) {
    return attributeName
  }

  // 将驼峰命名转换为 kebab-case 并添加 data- 前缀
  // moniBlockId -> data-moni-block-id
  // moniParentId -> data-moni-parent-id
  // moniDragEnabled -> data-moni-drag-enabled
  const kebabCase = attributeName
    .replace(/([A-Z])/g, '-$1') // 在大写字母前添加连字符
    .toLowerCase() // 转为小写

  return `data-${kebabCase}`
}

export function getRenderedAttributes(
  nodeOrMark: Node | Mark,
  extensionAttributes: ExtensionAttribute[],
): Record<string, any> {
  return extensionAttributes
    .filter(attribute => attribute.type === nodeOrMark.type.name)
    .filter(item => item.attribute.rendered)
    .map(item => {
      if (!item.attribute.renderHTML) {
        // 🔥 修复：当缺少 renderHTML 方法时，正确转换属性名
        const value = nodeOrMark.attrs[item.name]
        const htmlAttributeName = convertMoniAttributeName(item.name)

        return {
          [htmlAttributeName]: value,
        }
      }

      return item.attribute.renderHTML(nodeOrMark.attrs) || {}
    })
    .reduce((attributes, attribute) => mergeAttributes(attributes, attribute), {})
}
