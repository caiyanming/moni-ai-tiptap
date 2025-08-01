import type { DocumentStylePreset, StylePropagationOptions } from '@tiptap/core'
import { Extension } from '@tiptap/core'

import { DEFAULT_STYLE_PRESETS, MoniDefaultStylePreset } from './default-presets.js'
import {
  clearCSSVariables,
  generateGlobalStyleAttributes,
  getSemanticTypeForNode,
  hasAttributesChanged,
  injectCSSVariables,
  presetToCSSVariables,
} from './style-utils.js'

export interface DocumentStyleOptions {
  /**
   * 默认样式预设
   * @default MoniDefaultStylePreset
   */
  defaultPreset: DocumentStylePreset

  /**
   * 可用的样式预设列表
   * @default DEFAULT_STYLE_PRESETS
   */
  availablePresets: DocumentStylePreset[]

  /**
   * 是否自动注入 CSS 变量
   * @default true
   */
  autoInjectCSS: boolean

  /**
   * 样式传播选项
   */
  propagationOptions: StylePropagationOptions

  /**
   * 样式更新防抖延迟 (ms)
   * @default 100
   */
  debounceDelay: number

  /**
   * 是否启用样式缓存
   * @default true
   */
  enableStyleCache: boolean
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    documentStyle: {
      /**
       * 应用样式预设
       */
      applyStylePreset: (presetName: string) => ReturnType

      /**
       * 设置文档字体
       */
      setDocumentFont: (fontFamily: string) => ReturnType

      /**
       * 设置文档字体大小
       */
      setDocumentFontSize: (fontSize: number) => ReturnType

      /**
       * 获取当前文档样式状态
       */
      getDocumentStyle: () => ReturnType

      /**
       * 重置文档样式
       */
      resetDocumentStyle: () => ReturnType

      /**
       * 刷新文档样式
       */
      refreshDocumentStyle: () => ReturnType
    }
  }
}

/**
 * MoniAI 文档样式扩展
 *
 * 提供类似 Microsoft Word 的文档级样式管理功能：
 * - 样式预设管理
 * - 全局字体和颜色设置
 * - CSS 变量注入
 * - 样式传播到所有块级元素
 * - 性能优化的样式缓存
 *
 * @example
 * ```ts
 * const editor = new Editor({
 *   extensions: [
 *     DocumentStyleExtension.configure({
 *       defaultPreset: MoniDefaultStylePreset,
 *       autoInjectCSS: true
 *     })
 *   ]
 * })
 *
 * // 应用样式预设
 * editor.commands.applyStylePreset('MoniDefault')
 *
 * // 设置全局字体
 * editor.commands.setDocumentFont('"Inter", sans-serif')
 * ```
 */
export const DocumentStyleExtension = Extension.create<DocumentStyleOptions>({
  name: 'documentStyle',

  addOptions() {
    return {
      defaultPreset: MoniDefaultStylePreset,
      availablePresets: DEFAULT_STYLE_PRESETS,
      autoInjectCSS: true,
      propagationOptions: {
        targetNodeTypes: ['paragraph', 'heading', 'blockquote', 'codeBlock', 'bulletList', 'orderedList', 'listItem'],
        batchSize: 100,
        enablePerformanceOptimization: true,
      },
      debounceDelay: 100,
      enableStyleCache: true,
    }
  },

  addStorage() {
    const defaultPreset = this.options?.defaultPreset || MoniDefaultStylePreset

    // 简单返回状态数据
    return {
      currentPreset: defaultPreset,
      styleVersion: 1,
      cssVariables: presetToCSSVariables(defaultPreset),
      isInjected: false,
    }
  },

  addCommands() {
    return {
      applyStylePreset:
        (presetName: string) =>
        ({ tr, dispatch }) => {
          const preset = this.options.availablePresets.find(p => p.name === presetName)
          if (!preset) {
            console.warn(`Style preset "${presetName}" not found`)
            return false
          }

          // 更新存储状态 (扁平化结构)
          const newStyleVersion = this.storage.styleVersion + 1
          this.storage.currentPreset = preset
          this.storage.styleVersion = newStyleVersion
          this.storage.cssVariables = presetToCSSVariables(preset) as Record<string, string>
          this.storage.isInjected = false

          // 注入 CSS 变量
          if (this.options.autoInjectCSS) {
            injectCSSVariables(this.storage.cssVariables)
            this.storage.isInjected = true
          }

          // 传播样式到所有块
          if (dispatch) {
            // 简单内联实现，不需要单独方法
            const { propagationOptions } = this.options
            const { targetNodeTypes = [] } = propagationOptions

            tr.doc.descendants((node: any, pos: number) => {
              if (!targetNodeTypes.includes(node.type.name)) {
                return true
              }

              const semanticType = getSemanticTypeForNode(node.type.name)
              if (!semanticType || !(semanticType in preset.semantic)) {
                return true
              }

              const newAttributes = generateGlobalStyleAttributes(preset, semanticType, newStyleVersion)
              const currentAttrs = node.attrs || {}
              const updatedAttrs = { ...currentAttrs, ...newAttributes }

              if (hasAttributesChanged(currentAttrs, updatedAttrs)) {
                tr.setNodeMarkup(pos, undefined, updatedAttrs)
              }
              return true
            })

            dispatch(tr)
          }

          return true
        },

      setDocumentFont:
        (fontFamily: string) =>
        ({ tr, dispatch }) => {
          const currentPreset = this.storage.currentPreset
          if (!currentPreset) {
            console.warn('No current style preset found')
            return false
          }

          // 更新字体设置
          const updatedPreset = {
            ...currentPreset,
            typography: {
              ...currentPreset.typography,
              fontFamily,
            },
          }

          const newStyleVersion = this.storage.styleVersion + 1
          this.storage.currentPreset = updatedPreset
          this.storage.styleVersion = newStyleVersion
          this.storage.cssVariables = presetToCSSVariables(updatedPreset)
          // 重新注入 CSS 变量
          if (this.options.autoInjectCSS) {
            injectCSSVariables(this.storage.cssVariables)
          }

          // 传播样式更新
          if (dispatch) {
            // 内联传播逻辑
            const { propagationOptions } = this.options
            const { targetNodeTypes = [] } = propagationOptions

            tr.doc.descendants((node: any, pos: number) => {
              if (!targetNodeTypes.includes(node.type.name)) {
                return true
              }

              const semanticType = getSemanticTypeForNode(node.type.name)
              if (!semanticType || !(semanticType in updatedPreset.semantic)) {
                return true
              }

              const newAttributes = generateGlobalStyleAttributes(updatedPreset, semanticType, newStyleVersion)
              const currentAttrs = node.attrs || {}
              const updatedAttrs = { ...currentAttrs, ...newAttributes }

              if (hasAttributesChanged(currentAttrs, updatedAttrs)) {
                tr.setNodeMarkup(pos, undefined, updatedAttrs)
              }
              return true
            })

            dispatch(tr)
          }

          return true
        },

      setDocumentFontSize:
        (fontSize: number) =>
        ({ tr, dispatch }) => {
          const currentPreset = this.storage.currentPreset
          if (!currentPreset) {
            console.warn('No current style preset found')
            return false
          }

          // 更新字体大小
          const updatedPreset = {
            ...currentPreset,
            typography: {
              ...currentPreset.typography,
              fontSize,
            },
          }

          const newStyleVersion = this.storage.styleVersion + 1
          this.storage.currentPreset = updatedPreset
          this.storage.styleVersion = newStyleVersion
          this.storage.cssVariables = presetToCSSVariables(updatedPreset)
          // 重新注入 CSS 变量
          if (this.options.autoInjectCSS) {
            injectCSSVariables(this.storage.cssVariables)
          }

          // 传播样式更新
          if (dispatch) {
            // 内联传播逻辑
            const { propagationOptions } = this.options
            const { targetNodeTypes = [] } = propagationOptions

            tr.doc.descendants((node: any, pos: number) => {
              if (!targetNodeTypes.includes(node.type.name)) {
                return true
              }

              const semanticType = getSemanticTypeForNode(node.type.name)
              if (!semanticType || !(semanticType in updatedPreset.semantic)) {
                return true
              }

              const newAttributes = generateGlobalStyleAttributes(updatedPreset, semanticType, newStyleVersion)
              const currentAttrs = node.attrs || {}
              const updatedAttrs = { ...currentAttrs, ...newAttributes }

              if (hasAttributesChanged(currentAttrs, updatedAttrs)) {
                tr.setNodeMarkup(pos, undefined, updatedAttrs)
              }
              return true
            })

            dispatch(tr)
          }

          return true
        },

      getDocumentStyle: () => () => {
        // 返回布尔值，符合 TipTap 命令规范
        return true
      },

      resetDocumentStyle: () => () => {
        return this.editor.commands.applyStylePreset(this.options.defaultPreset.name)
      },

      refreshDocumentStyle:
        () =>
        ({ dispatch }) => {
          const currentPreset = this.storage.currentPreset || this.options.defaultPreset
          this.storage.styleVersion += 1

          if (dispatch && currentPreset) {
            // 刷新当前样式
            console.log('Document style refreshed:', currentPreset.name)
          }

          return true
        },
    }
  },

  onCreate() {
    // 自动注入默认样式
    if (this.options.autoInjectCSS && this.storage.cssVariables) {
      injectCSSVariables(this.storage.cssVariables)
      this.storage.isInjected = true
    }
  },

  onDestroy() {
    // 清理 CSS 变量
    if (this.storage.isInjected) {
      const variableNames = Object.keys(this.storage.cssVariables)
      clearCSSVariables(variableNames)
    }
  },
})
