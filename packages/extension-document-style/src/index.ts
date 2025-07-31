export { DocumentStyleExtension } from './document-style.js'
export type { DocumentStyleOptions } from './document-style.js'

export { 
  MoniDefaultStylePreset, 
  AcademicStylePreset, 
  DEFAULT_STYLE_PRESETS 
} from './default-presets.js'

export {
  presetToCSSVariables,
  injectCSSVariables,
  clearCSSVariables,
  semanticStyleToInlineCSS,
  generateGlobalStyleAttributes,
  parseGlobalStyleAttributes,
  mergeSemanticStyles,
  computeFinalStyle,
  generateStyleCacheKey,
  debounce,
  deepClone
} from './style-utils.js'

// 重新导出核心类型，方便使用
export type {
  DocumentStylePreset,
  SemanticStyle,
  DocumentStyleState,
  MoniGlobalStyleAttributes,
  CSSVariableMap,
  StylePropagationOptions,
  StreamStyleConfig
} from '@tiptap/core'