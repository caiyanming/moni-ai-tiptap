import { DOMParser } from '@tiptap/pm/model'

import type { Extensions } from '../types.js'
import { elementFromString } from '../utilities/elementFromString.js'
import { ensureMoniBlockIdsInJSON } from './ensureMoniBlockIds.js'
import { getSchema } from './getSchema.js'

/**
 * Generate JSONContent from HTML
 * @param html The HTML to generate JSONContent from
 * @param extensions The extensions to use for the schema
 * @returns The generated JSONContent
 */
export function generateJSON(html: string, extensions: Extensions): Record<string, any> {
  const schema = getSchema(extensions)
  const dom = elementFromString(html)
  const doc = DOMParser.fromSchema(schema).parse(dom)
  const json = doc.toJSON()

  // 🔥 MoniAI: 确保所有块级节点都有 moniBlockId
  // 这对拖拽、Stream、diff 管道至关重要
  return ensureMoniBlockIdsInJSON(json)
}
