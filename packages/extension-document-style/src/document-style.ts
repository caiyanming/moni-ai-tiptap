import type {
  CommandProps,
  DocumentStylePreset,
  DocumentStyleState,
  MoniGlobalStyleAttributes,
  StylePropagationOptions,
} from '@tiptap/core'
import { Extension } from '@tiptap/core'

import { DEFAULT_STYLE_PRESETS,MoniDefaultStylePreset } from './default-presets.js'
import {
  clearCSSVariables,
  debounce,
  generateGlobalStyleAttributes,
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
    return {
      // 文档样式状态
      documentStyle: {
        currentPreset: null as DocumentStylePreset | null,
        styleVersion: 1,
        cssVariables: {} as Record<string, string>,
        isInjected: false,
      } as DocumentStyleState,

      // 样式缓存
      styleCache: new Map<string, any>(),

      // 防抖更新函数
      debouncedUpdate: null as any,

      // 工具方法
      injectCSSVariables: (variables: Record<string, string>) => {
        injectCSSVariables(variables)
      },

      propagateStyleToAllBlocks: (
        tr: any,
        preset: DocumentStylePreset,
        styleVersion: number,
        options: DocumentStyleOptions,
      ) => {
        const { propagationOptions } = options
        const { targetNodeTypes = [] } = propagationOptions

        // 遍历文档中的所有节点
        tr.doc.descendants((node: any, pos: number) => {
          // 只处理目标节点类型
          if (!targetNodeTypes.includes(node.type.name)) {
            return true // 继续遍历子节点
          }

          // 获取对应的语义样式类型
          const semanticType = getSemanticTypeForNode(node.type.name)
          if (!semanticType || !preset.semantic[semanticType]) {
            return true
          }

          // 生成新的全局样式属性
          const newAttributes = generateGlobalStyleAttributes(preset, semanticType, styleVersion)

          // 更新节点属性
          const currentAttrs = node.attrs || {}
          const updatedAttrs = {
            ...currentAttrs,
            ...newAttributes,
          }

          // 只有属性确实发生变化时才更新
          if (hasAttributesChanged(currentAttrs, updatedAttrs)) {
            tr.setNodeMarkup(pos, undefined, updatedAttrs)
          }

          return true
        })
      },

      updateDocumentStyle: (newPreset: DocumentStylePreset) => {
        // 样式更新的防抖处理逻辑
        console.log('Updating document style:', newPreset.name)
      },

      hasAttributesChanged: (oldAttrs: any, newAttrs: any): boolean => {
        const keys = Object.keys(newAttrs)
        return keys.some(key => oldAttrs[key] !== newAttrs[key])
      },
    }
  },

  addCommands() {
    return {
      applyStylePreset:
        (presetName: string) =>
        ({ tr, dispatch, editor }) => {
          const preset = this.options.availablePresets.find(p => p.name === presetName)
          if (!preset) {
            console.warn(`Style preset "${presetName}" not found`)
            return false
          }

          // 更新存储状态
          const newStyleVersion = this.storage.documentStyle.styleVersion + 1
          this.storage.documentStyle = {
            currentPreset: preset,
            styleVersion: newStyleVersion,
            cssVariables: presetToCSSVariables(preset),
            isInjected: false,
          }

          // 注入 CSS 变量
          if (this.options.autoInjectCSS) {
            this.storage.injectCSSVariables(this.storage.documentStyle.cssVariables)
            this.storage.documentStyle.isInjected = true
          }

          // 传播样式到所有块
          if (dispatch) {
            this.storage.propagateStyleToAllBlocks(tr, preset, newStyleVersion, this.options)
            dispatch(tr)
          }

          return true
        },

      setDocumentFont:
        (fontFamily: string) =>
        ({ tr, dispatch }) => {
          const currentPreset = this.storage.documentStyle.currentPreset
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

          const newStyleVersion = this.storage.documentStyle.styleVersion + 1
          this.storage.documentStyle.currentPreset = updatedPreset
          this.storage.documentStyle.styleVersion = newStyleVersion
          this.storage.documentStyle.cssVariables = presetToCSSVariables(updatedPreset)

          // 重新注入 CSS 变量
          if (this.options.autoInjectCSS) {
            this.storage.injectCSSVariables(this.storage.documentStyle.cssVariables)
          }

          // 传播样式更新
          if (dispatch) {
            this.storage.propagateStyleToAllBlocks(tr, updatedPreset, newStyleVersion, this.options)
            dispatch(tr)
          }

          return true
        },

      setDocumentFontSize:
        (fontSize: number) =>
        ({ tr, dispatch }) => {
          const currentPreset = this.storage.documentStyle.currentPreset
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

          const newStyleVersion = this.storage.documentStyle.styleVersion + 1
          this.storage.documentStyle.currentPreset = updatedPreset
          this.storage.documentStyle.styleVersion = newStyleVersion
          this.storage.documentStyle.cssVariables = presetToCSSVariables(updatedPreset)

          // 重新注入 CSS 变量
          if (this.options.autoInjectCSS) {
            this.storage.injectCSSVariables(this.storage.documentStyle.cssVariables)
          }

          // 传播样式更新
          if (dispatch) {
            this.storage.propagateStyleToAllBlocks(tr, updatedPreset, newStyleVersion, this.options)
            dispatch(tr)
          }

          return true
        },

      getDocumentStyle: () => () => {
        // Return true for command success, actual data should be accessed via this.storage.documentStyle
        return true
      },

      resetDocumentStyle:
        () =>
        ({ tr, dispatch }) => {
          return this.editor.commands.applyStylePreset(this.options.defaultPreset.name)
        },

      refreshDocumentStyle:
        () =>
        ({ tr, dispatch }) => {
          const currentPreset = this.storage.documentStyle.currentPreset
          if (!currentPreset) {return false}

          const newStyleVersion = this.storage.documentStyle.styleVersion + 1
          this.storage.documentStyle.styleVersion = newStyleVersion

          if (dispatch) {
            this.storage.propagateStyleToAllBlocks(tr, currentPreset, newStyleVersion, this.options)
            dispatch(tr)
          }

          return true
        },
    }
  },

  onCreate() {
    // 初始化默认样式
    this.storage.documentStyle = {
      currentPreset: this.options.defaultPreset,
      styleVersion: 1,
      cssVariables: presetToCSSVariables(this.options.defaultPreset),
      isInjected: false,
    }

    // 创建防抖更新函数
    this.storage.debouncedUpdate = debounce(this.storage.updateDocumentStyle, this.options.debounceDelay)

    // 自动注入默认样式
    if (this.options.autoInjectCSS) {
      this.storage.injectCSSVariables(this.storage.documentStyle.cssVariables)
      this.storage.documentStyle.isInjected = true
    }
  },

  onDestroy() {
    // 清理 CSS 变量
    if (this.storage.documentStyle.isInjected) {
      const variableNames = Object.keys(this.storage.documentStyle.cssVariables)
      clearCSSVariables(variableNames)
    }

    // 清理缓存
    this.storage.styleCache.clear()
  },
})

// 工具函数
function getSemanticTypeForNode(nodeTypeName: string): keyof DocumentStylePreset['semantic'] | null {
  const mapping: Record<string, keyof DocumentStylePreset['semantic']> = {
    paragraph: 'paragraph',
    heading: 'heading1', // 默认为 heading1，实际应该根据 level 属性判断
    blockquote: 'blockquote',
    codeBlock: 'codeBlock',
    bulletList: 'bulletList',
    orderedList: 'orderedList',
    listItem: 'listItem',
  }

  return mapping[nodeTypeName] || null
}

function hasAttributesChanged(oldAttrs: any, newAttrs: any): boolean {
  const keys = Object.keys(newAttrs)
  return keys.some(key => oldAttrs[key] !== newAttrs[key])
}
