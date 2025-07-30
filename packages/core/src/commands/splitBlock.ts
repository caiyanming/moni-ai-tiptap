import type { EditorState } from '@tiptap/pm/state'
import { NodeSelection, TextSelection } from '@tiptap/pm/state'
import { canSplit } from '@tiptap/pm/transform'

import { defaultBlockAt } from '../helpers/defaultBlockAt.js'
import { getSplittedAttributes } from '../helpers/getSplittedAttributes.js'
import { ensureMoniBlockId } from '../helpers/generateMoniBlockId.js'
import type { RawCommands } from '../types.js'

function ensureMarks(state: EditorState, splittableMarks?: string[]) {
  const marks = state.storedMarks || (state.selection.$to.parentOffset && state.selection.$from.marks())

  if (marks) {
    const filteredMarks = marks.filter(mark => splittableMarks?.includes(mark.type.name))

    state.tr.ensureMarks(filteredMarks)
  }
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    splitBlock: {
      /**
       * Forks a new node from an existing node.
       * @param options.keepMarks Keep marks from the previous node.
       * @example editor.commands.splitBlock()
       * @example editor.commands.splitBlock({ keepMarks: true })
       */
      splitBlock: (options?: { keepMarks?: boolean }) => ReturnType
    }
  }
}

export const splitBlock: RawCommands['splitBlock'] =
  ({ keepMarks = true } = {}) =>
  ({ tr, state, dispatch, editor }) => {
    const { selection, doc } = tr
    const { $from, $to } = selection
    const extensionAttributes = editor.extensionManager.attributes
    const baseAttributes = getSplittedAttributes(extensionAttributes, $from.node().type.name, $from.node().attrs)
    
    // Keep the existing ID from the original block (don't generate a new one yet)
    const originalAttributes = baseAttributes

    if (selection instanceof NodeSelection && selection.node.isBlock) {
      if (!$from.parentOffset || !canSplit(doc, $from.pos)) {
        return false
      }

      if (dispatch) {
        if (keepMarks) {
          ensureMarks(state, editor.extensionManager.splittableMarks)
        }

        tr.split($from.pos).scrollIntoView()
      }

      return true
    }

    if (!$from.parent.isBlock) {
      return false
    }

    const atEnd = $to.parentOffset === $to.parent.content.size

    const deflt = $from.depth === 0 ? undefined : defaultBlockAt($from.node(-1).contentMatchAt($from.indexAfter(-1)))

    let types =
      atEnd && deflt
        ? [
            {
              type: deflt,
              attrs: ensureMoniBlockId({ ...originalAttributes, moniBlockId: undefined }),
            },
          ]
        : undefined

    let can = canSplit(tr.doc, tr.mapping.map($from.pos), 1, types)

    if (!types && !can && canSplit(tr.doc, tr.mapping.map($from.pos), 1, deflt ? [{ type: deflt }] : undefined)) {
      can = true
      types = deflt
        ? [
            {
              type: deflt,
              attrs: ensureMoniBlockId({ ...originalAttributes, moniBlockId: undefined }),
            },
          ]
        : undefined
    }

    if (dispatch) {
      if (can) {
        if (selection instanceof TextSelection) {
          tr.deleteSelection()
        }

        tr.split(tr.mapping.map($from.pos), 1, types)
        
        // After split, ensure the new block has a unique moniBlockId
        // The split creates two blocks, and we need to make sure they have different IDs
        const splitPos = tr.mapping.map($from.pos)
        
        // Ensure unique moniBlockIds for all blocks after split
        // Find and fix any duplicate IDs that may have been created by the split
        let foundDuplicate = false
        tr.doc.descendants((node, pos) => {
          if (node.isBlock && node.attrs.moniBlockId) {
            // Look for another block node with the same ID
            tr.doc.descendants((otherNode, otherPos) => {
              if (otherNode.isBlock && 
                  otherPos !== pos && 
                  otherNode.attrs.moniBlockId === node.attrs.moniBlockId) {
                // Fix the second occurrence (the newly created block)
                if (!foundDuplicate && otherPos > pos) {
                  const newId = ensureMoniBlockId({}).moniBlockId
                  tr.setNodeMarkup(otherPos, otherNode.type, {
                    ...otherNode.attrs,
                    moniBlockId: newId
                  })
                  foundDuplicate = true
                }
              }
            })
          }
        })

        if (deflt && !atEnd && !$from.parentOffset && $from.parent.type !== deflt) {
          const first = tr.mapping.map($from.before())
          const $first = tr.doc.resolve(first)

          if ($from.node(-1).canReplaceWith($first.index(), $first.index() + 1, deflt)) {
            tr.setNodeMarkup(tr.mapping.map($from.before()), deflt)
          }
        }
      }

      if (keepMarks) {
        ensureMarks(state, editor.extensionManager.splittableMarks)
      }

      tr.scrollIntoView()
    }

    return can
  }
