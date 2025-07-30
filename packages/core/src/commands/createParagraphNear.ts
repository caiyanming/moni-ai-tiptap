import { createParagraphNear as originalCreateParagraphNear } from '@tiptap/pm/commands'

import { ensureMoniBlockId } from '../helpers/generateMoniBlockId.js'
import type { RawCommands } from '../types.js'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    createParagraphNear: {
      /**
       * Create a paragraph nearby.
       * @example editor.commands.createParagraphNear()
       */
      createParagraphNear: () => ReturnType
    }
  }
}

export const createParagraphNear: RawCommands['createParagraphNear'] =
  () =>
  ({ state, dispatch }) => {
    // Custom implementation that adds moniBlockId to new paragraphs
    if (dispatch) {
      const { selection } = state
      const { $from } = selection
      const type = state.schema.nodes.paragraph

      if (type) {
        const attrs = ensureMoniBlockId({})
        const node = type.create(attrs)

        // Find insertion position
        let pos = $from.pos
        if ($from.parent.type.isTextblock) {
          pos = $from.end()
        }

        const tr = state.tr.insert(pos, node)
        dispatch(tr)
        return true
      }
    }

    // Fallback to original implementation
    return originalCreateParagraphNear(state, dispatch)
  }
