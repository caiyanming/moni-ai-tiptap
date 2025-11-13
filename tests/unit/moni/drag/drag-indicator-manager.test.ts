import { Editor } from '@tiptap/core'
import { BulletList, ListItem } from '@tiptap/extension-list'
import { Document } from '@tiptap/extension-document'
import { Paragraph } from '@tiptap/extension-paragraph'
import { Text } from '@tiptap/extension-text'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { DragIndicatorManager } from '@tiptap/core'

describe('DragIndicatorManager', () => {
  let editor: Editor
  let container: HTMLElement
  let manager: DragIndicatorManager

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

    manager = new DragIndicatorManager(editor)
  })

  afterEach(() => {
    manager.destroy()
    editor.destroy()

    if (container.parentElement) {
      container.parentElement.removeChild(container)
    }
  })

  it('derives nestable state from drag config when DOM dataset is absent', () => {
    const listItem = editor.view.dom.querySelector('[data-moni-block-id="block-3"]') as HTMLElement
    expect(listItem).toBeTruthy()

    // Explicitly clear legacy attributes to prove schema-driven config is used
    listItem.removeAttribute('data-moni-nestable')

    const rect = {
      top: 100,
      bottom: 140,
      left: 10,
      right: 210,
      width: 200,
      height: 40,
    }

    Object.defineProperty(listItem, 'getBoundingClientRect', {
      value: () => rect,
      configurable: true,
    })

    const dropPosition = manager.calculateDropPosition(
      { clientX: rect.left + 10, clientY: rect.top + rect.height / 2 } as DragEvent,
      listItem,
    )

    expect(dropPosition).not.toBeNull()
    expect(dropPosition?.position).toBe('inside')
  })
})
