import { mergeAttributes, Node } from '@tiptap/core'
import type { Node as PMNode } from '@tiptap/pm/model'

import { type ChartContainerElement, ChartRenderer } from './ChartRenderer.js'

export interface MoniChartOptions {
  /**
   * Callback when chart is clicked
   * @param node - The ProseMirror node representing the chart element
   * @param pos - The position of the node within the document
   */
  onClick?: (node: PMNode, pos: number) => void
}

export interface MoniChartAttributes {
  component: string
  data: any[]
  config?: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    moniChart: {
      /**
       * Insert a Moni chart node
       * @param attributes - Chart attributes (component, data, config)
       * @example
       * editor.commands.setMoniChart({
       *   component: 'BarChart',
       *   data: [{ label: '语文', value: 85 }],
       *   config: { highlight: 'max' }
       * })
       */
      setMoniChart: (attributes: MoniChartAttributes) => ReturnType

      /**
       * Update existing Moni chart node
       */
      updateMoniChart: (attributes: Partial<MoniChartAttributes>, pos?: number) => ReturnType

      /**
       * Delete Moni chart node
       */
      deleteMoniChart: (pos?: number) => ReturnType
    }
  }
}

/**
 * MoniChart Extension
 *
 * Renders chart visualizations (BarChart, LineChart, PieChart, etc.) in TipTap editor.
 * Compatible with backend ChartTool output format.
 *
 * @example
 * ```typescript
 * import { MoniChart } from '@tiptap/extension-moni-chart'
 *
 * const editor = new Editor({
 *   extensions: [
 *     MoniChart.configure({
 *       onClick: (node, pos) => {
 *         console.log('Chart clicked:', node.attrs)
 *       }
 *     })
 *   ]
 * })
 * ```
 */
export const MoniChart = Node.create<MoniChartOptions>({
  name: 'moniChart',

  group: 'block',

  atom: true,

  addOptions() {
    return {
      onClick: undefined,
    }
  },

  addAttributes() {
    return {
      component: {
        default: 'BarChart',
        parseHTML: element => element.getAttribute('data-component'),
        renderHTML: attributes => ({
          'data-component': attributes.component,
        }),
      },
      data: {
        default: [],
        parseHTML: element => {
          const dataStr = element.getAttribute('data-chart-data')
          if (!dataStr) {
            return []
          }
          try {
            return JSON.parse(dataStr)
          } catch {
            return []
          }
        },
        renderHTML: attributes => ({
          'data-chart-data': JSON.stringify(attributes.data),
        }),
      },
      config: {
        default: null,
        parseHTML: element => {
          const configStr = element.getAttribute('data-chart-config')
          if (!configStr) {
            return null
          }
          try {
            return JSON.parse(configStr)
          } catch {
            return null
          }
        },
        renderHTML: attributes => {
          if (!attributes.config) {
            return {}
          }
          return {
            'data-chart-config': JSON.stringify(attributes.config),
          }
        },
      },
      // 🔥 Moni block metadata
      moniBlockId: {
        default: null,
        parseHTML: element => element.getAttribute('data-moni-block-id'),
        renderHTML: attributes => {
          if (attributes.moniBlockId) {
            return { 'data-moni-block-id': attributes.moniBlockId }
          }
          return {}
        },
      },
      moniParentId: {
        default: null,
        parseHTML: element => element.getAttribute('data-moni-parent-id'),
        renderHTML: attributes => {
          if (attributes.moniParentId) {
            return { 'data-moni-parent-id': attributes.moniParentId }
          }
          return {}
        },
      },
      moniLevel: {
        default: 0,
        parseHTML: element => {
          const level = element.getAttribute('data-moni-level')
          return level ? parseInt(level, 10) : 0
        },
        renderHTML: attributes => {
          if (attributes.moniLevel !== undefined && attributes.moniLevel !== 0) {
            return { 'data-moni-level': attributes.moniLevel.toString() }
          }
          return {}
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="moni-chart"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'moni-chart' })]
  },

  addCommands() {
    return {
      setMoniChart:
        attributes =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
          })
        },

      updateMoniChart:
        (attributes, pos) =>
        ({ editor, tr }) => {
          const position = pos ?? editor.state.selection.$from.pos
          const node = editor.state.doc.nodeAt(position)

          if (!node || node.type.name !== this.name) {
            return false
          }

          tr.setNodeMarkup(position, this.type, {
            ...node.attrs,
            ...attributes,
          })

          return true
        },

      deleteMoniChart:
        pos =>
        ({ editor, tr }) => {
          const position = pos ?? editor.state.selection.$from.pos
          const node = editor.state.doc.nodeAt(position)

          if (!node || node.type.name !== this.name) {
            return false
          }

          tr.delete(position, position + node.nodeSize)
          return true
        },
    }
  },

  addNodeView() {
    return ({ node, getPos }) => {
      const wrapper = document.createElement('div')
      const chartContainer = document.createElement('div')
      wrapper.className = 'tiptap-moni-chart-render'
      chartContainer.className = 'moni-chart-container'
      wrapper.dataset.type = 'moni-chart'

      if (this.editor.isEditable) {
        wrapper.classList.add('tiptap-moni-chart-render--editable')
      }

      // Set attributes for DOM
      wrapper.setAttribute('data-component', node.attrs.component)
      wrapper.setAttribute('data-chart-data', JSON.stringify(node.attrs.data))
      if (node.attrs.config) {
        wrapper.setAttribute('data-chart-config', JSON.stringify(node.attrs.config))
      }

      // 🔥 Set moni block attributes
      if (node.attrs.moniBlockId) {
        wrapper.setAttribute('data-moni-block-id', node.attrs.moniBlockId)
      }
      if (node.attrs.moniParentId) {
        wrapper.setAttribute('data-moni-parent-id', node.attrs.moniParentId)
      }
      if (node.attrs.moniLevel !== undefined && node.attrs.moniLevel !== 0) {
        wrapper.setAttribute('data-moni-level', node.attrs.moniLevel.toString())
      }

      // Set chart container dimensions
      chartContainer.style.width = '100%'
      chartContainer.style.minHeight = '400px'
      wrapper.appendChild(chartContainer)

      // Render chart using ChartRenderer
      const renderer = new ChartRenderer()
      try {
        renderer.render(
          {
            component: node.attrs.component,
            data: node.attrs.data,
            config: node.attrs.config,
          },
          chartContainer,
        )
      } catch (error) {
        console.error('[MoniChart] Failed to render chart:', error)
        chartContainer.textContent = `Error: ${error instanceof Error ? error.message : 'Failed to render chart'}`
        chartContainer.classList.add('moni-chart-error')
      }

      const handleClick = (event: MouseEvent) => {
        event.preventDefault()
        event.stopPropagation()
        const pos = getPos()

        if (pos == null) {
          return
        }

        if (this.options.onClick) {
          this.options.onClick(node, pos)
        }
      }

      if (this.options.onClick) {
        wrapper.addEventListener('click', handleClick)
      }

      return {
        dom: wrapper,
        destroy() {
          wrapper.removeEventListener('click', handleClick)
          // Clean up chart instance
          const containerWithCleanup = chartContainer as ChartContainerElement
          if (containerWithCleanup.chartCleanup) {
            containerWithCleanup.chartCleanup()
          }
        },
      }
    }
  },
})
