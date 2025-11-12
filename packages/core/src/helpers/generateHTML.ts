import { Node } from '@tiptap/pm/model'

import type { Extensions, JSONContent } from '../types.js'
import { ensureMoniBlockIdsInJSON } from './ensureMoniBlockIds.js'
import { getHTMLFromFragment } from './getHTMLFromFragment.js'
import { getSchema } from './getSchema.js'

/**
 * Generate HTML from a JSONContent
 * @param doc The JSONContent to generate HTML from
 * @param extensions The extensions to use for the schema
 * @returns The generated HTML
 */
export function generateHTML(doc: JSONContent, extensions: Extensions): string {
  const schema = getSchema(extensions)

  // 🔥 MoniAI: 确保 JSON 中所有块级节点都有 moniBlockId
  // 这样 HTML 渲染时才能输出 data-moni-block-id 属性
  // 这对拖拽、diff 覆盖层、后端协调至关重要
  const docWithIds = ensureMoniBlockIdsInJSON(doc, schema)
  const contentNode = Node.fromJSON(schema, docWithIds)

  return getHTMLFromFragment(contentNode.content, schema)
}
