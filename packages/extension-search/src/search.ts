import { Extension } from '@tiptap/core'
import type { EditorState, Transaction } from '@tiptap/pm/state'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export interface SearchResult {
  from: number
  to: number
}

export interface SearchPluginState {
  query: string
  results: SearchResult[]
  currentIndex: number
}

export interface SearchOptions {
  /**
   * Whether the search should be case sensitive.
   *
   * @default false
   */
  caseSensitive: boolean
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    search: {
      /**
       * Set the current search query and recompute all matches in the document.
       */
      setSearchQuery: (query: string) => ReturnType

      /**
       * Move the selection to the next match, if any.
       */
      findNext: () => ReturnType

      /**
       * Move the selection to the previous match, if any.
       */
      findPrevious: () => ReturnType

      /**
       * Clear all search state and decorations.
       */
      clearSearch: () => ReturnType
    }
  }
}

export const searchPluginKey = new PluginKey<SearchPluginState>('search')

const createEmptyState = (): SearchPluginState => ({
  query: '',
  results: [],
  currentIndex: -1,
})

const collectResults = (state: EditorState, query: string, caseSensitive: boolean): SearchResult[] => {
  const results: SearchResult[] = []

  if (!query) {
    return results
  }

  const searchText = caseSensitive ? query : query.toLowerCase()

  state.doc.descendants((node, pos: number) => {
    if (!node.isText || !node.text) {
      return true
    }

    let text = node.text

    if (!caseSensitive) {
      text = text.toLowerCase()
    }

    let index = text.indexOf(searchText)

    while (index !== -1) {
      results.push({
        from: pos + index,
        to: pos + index + query.length,
      })

      // Avoid infinite loops on empty query, though we already guard above
      const nextFrom = index + Math.max(query.length, 1)
      index = text.indexOf(searchText, nextFrom)
    }

    return true
  })

  return results
}

/**
 * Minimal search extension for simple string matching inside the editor.
 *
 * - Single string query
 * - Case-sensitive toggle
 * - Inline decorations for all matches
 * - Keeps track of "current" match for easier navigation
 *
 * This extension intentionally does not inject any CSS.
 * Consumers are expected to style the following classes:
 *
 * - `.moni-search-result`
 * - `.moni-search-result-current`
 */
export const Search = Extension.create<SearchOptions>({
  name: 'search',

  addOptions() {
    return {
      caseSensitive: false,
    }
  },

  addCommands() {
    return {
      setSearchQuery:
        rawQuery =>
        ({ state, dispatch }) => {
          if (!dispatch) {
            return true
          }

          const query = rawQuery || ''
          const results = collectResults(state, query, this.options.caseSensitive)
          const hasResults = results.length > 0

          const nextState: Partial<SearchPluginState> = {
            query,
            results,
            currentIndex: hasResults ? 0 : -1,
          }

          let tr = state.tr.setMeta(searchPluginKey, nextState)

          if (hasResults) {
            const first = results[0]
            tr = tr.setSelection(TextSelection.create(tr.doc, first.from)).scrollIntoView()
          }

          dispatch(tr)
          return true
        },

      findNext:
        () =>
        ({ state, dispatch }) => {
          const pluginState = searchPluginKey.getState(state)

          if (!pluginState || pluginState.results.length === 0) {
            return false
          }

          const nextIndex = (pluginState.currentIndex + 1) % pluginState.results.length
          const target = pluginState.results[nextIndex]

          if (!dispatch) {
            return true
          }

          const tr = state.tr
            .setMeta(searchPluginKey, {
              currentIndex: nextIndex,
            } satisfies Partial<SearchPluginState>)
            .setSelection(TextSelection.create(state.doc, target.from))
            .scrollIntoView()

          dispatch(tr)
          return true
        },

      findPrevious:
        () =>
        ({ state, dispatch }) => {
          const pluginState = searchPluginKey.getState(state)

          if (!pluginState || pluginState.results.length === 0) {
            return false
          }

          const total = pluginState.results.length
          const prevIndex = (pluginState.currentIndex - 1 + total) % total
          const target = pluginState.results[prevIndex]

          if (!dispatch) {
            return true
          }

          const tr = state.tr
            .setMeta(searchPluginKey, {
              currentIndex: prevIndex,
            } satisfies Partial<SearchPluginState>)
            .setSelection(TextSelection.create(state.doc, target.from))
            .scrollIntoView()

          dispatch(tr)
          return true
        },

      clearSearch:
        () =>
        ({ state, dispatch }) => {
          const pluginState = searchPluginKey.getState(state)

          if (!pluginState || (!pluginState.query && pluginState.results.length === 0)) {
            return false
          }

          if (!dispatch) {
            return true
          }

          const tr = state.tr.setMeta(searchPluginKey, createEmptyState())

          dispatch(tr)
          return true
        },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<SearchPluginState>({
        key: searchPluginKey,

        state: {
          init: () => createEmptyState(),

          apply(tr: Transaction, value: SearchPluginState) {
            const meta = tr.getMeta(searchPluginKey) as Partial<SearchPluginState> | undefined

            if (meta) {
              return { ...value, ...meta }
            }

            // Simple behaviour: if the document changed, drop previous results.
            // The user can re-run the search with their UI / keyboard shortcut.
            if (tr.docChanged && value.results.length > 0) {
              return {
                query: value.query,
                results: [],
                currentIndex: -1,
              }
            }

            return value
          },
        },

        props: {
          decorations(state: EditorState) {
            const pluginState = searchPluginKey.getState(state)

            if (!pluginState || pluginState.results.length === 0) {
              return null
            }

            const decorations = pluginState.results.map((result: SearchResult, index: number) =>
              Decoration.inline(result.from, result.to, {
                class: index === pluginState.currentIndex ? 'moni-search-result-current' : 'moni-search-result',
              }),
            )

            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]
  },
})

export default Search
