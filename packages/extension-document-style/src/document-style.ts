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

      /**
       * 清除当前样式预设（用于测试）
       */
      clearDocumentStyle: () => ReturnType
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
    // 支持真正的 null 预设场景 - 只有在明确配置且不为null时才使用默认预设
    const hasExplicitDefault = this.options && 'defaultPreset' in this.options && this.options.defaultPreset != null
    const defaultPreset = hasExplicitDefault ? this.options.defaultPreset : null

    // 简单返回状态数据 - 根据配置决定是否已注入
    return {
      currentPreset: defaultPreset,
      styleVersion: 1,
      cssVariables: defaultPreset ? presetToCSSVariables(defaultPreset) : {},
      isInjected: this.options?.autoInjectCSS || false,
      styleCache: new Map(),
    }
  },

  addCommands() {
    return {
      applyStylePreset:
        (presetName: string) =>
        ({ tr, dispatch }) => {
          const preset = this.options.availablePresets.find(p => p.name === presetName)
          if (!preset) {
            console.debug(`Style preset "${presetName}" not found`)
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

          // 传播样式到所有块 - 优化批处理
          if (dispatch) {
            const { propagationOptions } = this.options
            const { targetNodeTypes = [], batchSize = 100 } = propagationOptions
            let updateCount = 0

            // 批量收集更新操作，减少事务复杂度
            const updates: Array<{ pos: number; attrs: any }> = []

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
                updates.push({ pos, attrs: updatedAttrs })
                updateCount += 1

                // 性能优化：限制批处理大小
                if (updateCount >= batchSize) {
                  return false // 停止遍历
                }
              }
              return true
            })

            // 批量应用所有更新
            updates.forEach(({ pos, attrs }) => {
              tr.setNodeMarkup(pos, undefined, attrs)
            })

            dispatch(tr)
          }

          return true
        },

      setDocumentFont:
        (fontFamily: string) =>
        ({ tr, dispatch }) => {
          // 严格的null检查，支持测试场景
          if (!this.storage.currentPreset || this.storage.currentPreset === null) {
            console.debug('No current style preset found')
            return false
          }

          // 直接修改存储的预设，确保引用一致性
          this.storage.currentPreset.typography.fontFamily = fontFamily
          const newStyleVersion = this.storage.styleVersion + 1
          this.storage.styleVersion = newStyleVersion
          this.storage.cssVariables = presetToCSSVariables(this.storage.currentPreset)
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
              if (!semanticType || !(semanticType in this.storage.currentPreset!.semantic)) {
                return true
              }

              const newAttributes = generateGlobalStyleAttributes(
                this.storage.currentPreset!,
                semanticType,
                newStyleVersion,
              )
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
          // 严格的null检查，支持测试场景
          if (!this.storage.currentPreset || this.storage.currentPreset === null) {
            console.debug('No current style preset found')
            return false
          }

          // 直接修改存储的预设，确保引用一致性
          this.storage.currentPreset.typography.fontSize = fontSize
          const newStyleVersion = this.storage.styleVersion + 1
          this.storage.styleVersion = newStyleVersion
          this.storage.cssVariables = presetToCSSVariables(this.storage.currentPreset)
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
              if (!semanticType || !(semanticType in this.storage.currentPreset!.semantic)) {
                return true
              }

              const newAttributes = generateGlobalStyleAttributes(
                this.storage.currentPreset!,
                semanticType,
                newStyleVersion,
              )
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
        // 返回当前文档样式状态
        return {
          currentPreset: this.storage.currentPreset,
          styleVersion: this.storage.styleVersion,
          cssVariables: this.storage.cssVariables,
          isInjected: this.storage.isInjected,
        }
      },

      resetDocumentStyle:
        () =>
        ({ tr, dispatch }) => {
          // 直接调用 applyStylePreset 的逻辑，避免嵌套命令调用
          const defaultPreset = this.options.defaultPreset
          if (!defaultPreset) {
            console.debug('No default style preset found')
            return false
          }

          // 更新存储状态
          const newStyleVersion = this.storage.styleVersion + 1
          this.storage.currentPreset = defaultPreset
          this.storage.styleVersion = newStyleVersion
          this.storage.cssVariables = presetToCSSVariables(defaultPreset) as Record<string, string>
          this.storage.isInjected = false

          // 注入 CSS 变量
          if (this.options.autoInjectCSS) {
            injectCSSVariables(this.storage.cssVariables)
            this.storage.isInjected = true
          }

          // 传播样式到所有块
          if (dispatch) {
            const { propagationOptions } = this.options
            const { targetNodeTypes = [], batchSize = 100 } = propagationOptions
            let updateCount = 0

            // 批量收集更新操作，减少事务复杂度
            const updates: Array<{ pos: number; attrs: any }> = []

            tr.doc.descendants((node: any, pos: number) => {
              if (!targetNodeTypes.includes(node.type.name)) {
                return true
              }

              const semanticType = getSemanticTypeForNode(node.type.name)
              if (!semanticType || !(semanticType in defaultPreset.semantic)) {
                return true
              }

              const newAttributes = generateGlobalStyleAttributes(defaultPreset, semanticType, newStyleVersion)
              const currentAttrs = node.attrs || {}
              const updatedAttrs = { ...currentAttrs, ...newAttributes }

              if (hasAttributesChanged(currentAttrs, updatedAttrs)) {
                updates.push({ pos, attrs: updatedAttrs })
                updateCount += 1

                // 性能优化：限制批处理大小
                if (updateCount >= batchSize) {
                  return false // 停止遍历
                }
              }
              return true
            })

            // 批量应用所有更新
            updates.forEach(({ pos, attrs }) => {
              tr.setNodeMarkup(pos, undefined, attrs)
            })

            dispatch(tr)
          }

          return true
        },

      refreshDocumentStyle:
        () =>
        ({ dispatch }) => {
          const currentPreset = this.storage.currentPreset
          this.storage.styleVersion += 1

          if (dispatch && currentPreset) {
            // 刷新当前样式
            console.log('Document style refreshed:', currentPreset.name)
          }

          return true
        },

      clearDocumentStyle: () => () => {
        // 清除当前预设，主要用于测试场景
        this.storage.currentPreset = null
        this.storage.styleVersion += 1
        this.storage.cssVariables = {}
        this.storage.isInjected = false
        return true
      },
    }
  },

  onBeforeCreate() {
    // 自动注入默认样式 - 使用 onBeforeCreate 确保 storage 已经设置
    if (this.options.autoInjectCSS) {
      // 在下个tick执行，确保storage已初始化
      setTimeout(() => {
        if (this.storage?.cssVariables && this.storage.currentPreset) {
          injectCSSVariables(this.storage.cssVariables)
          this.storage.isInjected = true
        }
      }, 0)
    }
  },

  onCreate() {
    // onCreate 也检查一下，作为后备
    if (
      this.options.autoInjectCSS &&
      this.storage.cssVariables &&
      this.storage.currentPreset &&
      !this.storage.isInjected
    ) {
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
