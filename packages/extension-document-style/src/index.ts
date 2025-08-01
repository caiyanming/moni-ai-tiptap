export { AcademicStylePreset, DEFAULT_STYLE_PRESETS, MoniDefaultStylePreset } from './default-presets.js'
export type { DocumentStyleOptions } from './document-style.js'
export { DocumentStyleExtension } from './document-style.js'
export {
  clearCSSVariables,
  computeFinalStyle,
  debounce,
  deepClone,
  generateGlobalStyleAttributes,
  generateStyleCacheKey,
  injectCSSVariables,
  mergeSemanticStyles,
  parseGlobalStyleAttributes,
  presetToCSSVariables,
  semanticStyleToInlineCSS,
} from './style-utils.js'

// 重新导出核心类型，方便使用
export type {
  CSSVariableMap,
  DocumentStylePreset,
  DocumentStyleState,
  MoniGlobalStyleAttributes,
  SemanticStyle,
  StreamStyleConfig,
  StylePropagationOptions,
} from '@tiptap/core'
