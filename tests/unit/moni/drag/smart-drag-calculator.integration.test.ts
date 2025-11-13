import { Editor } from '@tiptap/core'
import { BulletList, ListItem } from '@tiptap/extension-list'
import { Document } from '@tiptap/extension-document'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Text } from '@tiptap/extension-text'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { SmartDragCalculator } from '@tiptap/core'

describe('SmartDragCalculator (integration)', () => {
  let editor: Editor
  let container: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)

    editor = new Editor({
      element: container,
      extensions: [Document, Text, Paragraph, BulletList, ListItem],
      content: `
        <p data-moni-block-id="block-1">Paragraph</p>
        <ul data-moni-block-id="block-2">
          <li data-moni-block-id="block-3" data-moni-parent-id="block-2" data-moni-level="1">List item</li>
        </ul>
      `,
    })
  })

  afterEach(() => {
    editor.destroy()
    if (container.parentElement) {
      container.parentElement.removeChild(container)
    }
  })

  it('uses schema-driven config for nesting detection even without DOM attributes', () => {
    const calculator = new SmartDragCalculator(editor, { searchRadius: 500 })
    const blockElements = editor.view.dom.querySelectorAll('[data-moni-block-id]')

    blockElements.forEach((element, index) => {
      const top = index * 60
      Object.defineProperty(element, 'getBoundingClientRect', {
        value: () => ({
          top,
          bottom: top + 40,
          left: 0,
          right: 200,
          width: 200,
          height: 40,
        }),
        configurable: true,
      })
    })

    const listItemElement = editor.view.dom.querySelector('[data-moni-block-id="block-3"]') as HTMLElement
    expect(listItemElement).toBeTruthy()

    // Set misleading legacy attribute to ensure DOM dataset is ignored
    listItemElement.setAttribute('data-moni-nestable', 'false')

    const listItemRect = listItemElement.getBoundingClientRect()
    const result = calculator.calculateSmartPosition(
      listItemRect.left + listItemRect.width * 0.6,
      listItemRect.top + listItemRect.height / 2,
      'block-1',
    )

    const nestedCandidate = result.allCandidates.find(
      candidate => candidate.type === 'nested' && candidate.targetBlockId === 'block-3',
    )

    expect(nestedCandidate).toBeTruthy()
  })
})
