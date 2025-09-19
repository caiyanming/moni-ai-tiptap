import type { Mark, Node } from '@tiptap/pm/model'

import type { ExtensionAttribute } from '../types.js'
import { mergeAttributes } from '../utilities/mergeAttributes.js'
import { convertMoniAttributeName } from './convertMoniAttributeName.js'

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
