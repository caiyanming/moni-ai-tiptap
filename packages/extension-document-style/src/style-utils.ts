import type { 
  DocumentStylePreset, 
  SemanticStyle, 
  CSSVariableMap,
  MoniGlobalStyleAttributes 
} from '@tiptap/core'

/**
 * 样式工具函数集 - 提供样式计算、CSS 变量注入等功能
 */

/**
 * 将样式预设转换为 CSS 变量映射
 * @param preset 样式预设
 * @returns CSS 变量映射表
 */
export function presetToCSSVariables(preset: DocumentStylePreset): CSSVariableMap {
  const variables: Partial<CSSVariableMap> = {}

  // 基础变量
  variables['--moni-font-family'] = preset.typography.fontFamily
  variables['--moni-font-size'] = `${preset.typography.fontSize}px`
  variables['--moni-line-height'] = preset.typography.lineHeight.toString()
  variables['--moni-letter-spacing'] = preset.typography.letterSpacing

  // 颜色变量
  variables['--moni-color-text'] = preset.colors.text
  variables['--moni-color-text-secondary'] = preset.colors.textSecondary
  variables['--moni-color-background'] = preset.colors.background
  variables['--moni-color-accent'] = preset.colors.accent
  variables['--moni-color-highlight'] = preset.colors.highlight
  variables['--moni-color-success'] = preset.colors.success
  variables['--moni-color-warning'] = preset.colors.warning
  variables['--moni-color-error'] = preset.colors.error

  // 间距变量
  variables['--moni-spacing-block'] = `${preset.spacing.blockSpacing}px`
  variables['--moni-spacing-paragraph'] = `${preset.spacing.paragraphSpacing}px`
  variables['--moni-spacing-list-indent'] = `${preset.spacing.listIndent}px`

  // 语义样式变量
  Object.entries(preset.semantic).forEach(([semanticType, style]) => {
    const variablePrefix = `--moni-semantic-${semanticType}`
    Object.entries(style).forEach(([property, value]) => {
      if (value !== undefined && value !== null) {
        const variableName = `${variablePrefix}-${kebabCase(property)}` as keyof CSSVariableMap
        ;(variables as any)[variableName] = formatCSSValue(property, value)
      }
    })
  })

  return variables as CSSVariableMap
}

/**
 * 注入 CSS 变量到文档根元素
 * @param variables CSS 变量映射
 * @param target 目标元素，默认为 document.documentElement
 */
export function injectCSSVariables(
  variables: Partial<CSSVariableMap>, 
  target: HTMLElement = document.documentElement
): void {
  Object.entries(variables).forEach(([property, value]) => {
    if (value !== undefined && value !== null) {
      target.style.setProperty(property, value)
    }
  })
}

/**
 * 清除 CSS 变量
 * @param variableNames 要清除的变量名列表
 * @param target 目标元素
 */
export function clearCSSVariables(
  variableNames: string[], 
  target: HTMLElement = document.documentElement
): void {
  variableNames.forEach(name => {
    target.style.removeProperty(name)
  })
}

/**
 * 将语义样式转换为行内样式字符串
 * @param style 语义样式对象
 * @returns CSS 样式字符串
 */
export function semanticStyleToInlineCSS(style: SemanticStyle): string {
  const cssProperties: string[] = []

  Object.entries(style).forEach(([property, value]) => {
    if (value !== undefined && value !== null) {
      const cssProperty = kebabCase(property)
      const cssValue = formatCSSValue(property, value)
      cssProperties.push(`${cssProperty}: ${cssValue}`)
    }
  })

  return cssProperties.join('; ')
}

/**
 * 生成全局样式属性对象
 * @param preset 样式预设
 * @param semanticType 语义类型 (paragraph, heading1, etc.)
 * @param styleVersion 样式版本号
 * @returns 全局样式属性
 */
export function generateGlobalStyleAttributes(
  preset: DocumentStylePreset,
  semanticType: keyof DocumentStylePreset['semantic'],
  styleVersion: number
): MoniGlobalStyleAttributes {
  const semanticStyle = preset.semantic[semanticType]
  
  return {
    moniGlobalFontFamily: preset.typography.fontFamily,
    moniGlobalFontSize: preset.typography.fontSize,
    moniSemanticStyle: JSON.stringify(semanticStyle),
    moniStyleVersion: styleVersion
  }
}

/**
 * 解析全局样式属性为可用的样式对象
 * @param attributes 全局样式属性
 * @returns 解析后的样式信息
 */
export function parseGlobalStyleAttributes(attributes: Partial<MoniGlobalStyleAttributes>): {
  fontFamily?: string
  fontSize?: number
  semanticStyle?: SemanticStyle
  styleVersion?: number
} {
  const result: any = {}

  if (attributes.moniGlobalFontFamily) {
    result.fontFamily = attributes.moniGlobalFontFamily
  }

  if (attributes.moniGlobalFontSize) {
    result.fontSize = attributes.moniGlobalFontSize
  }

  if (attributes.moniSemanticStyle) {
    try {
      result.semanticStyle = JSON.parse(attributes.moniSemanticStyle)
    } catch (error) {
      console.warn('Failed to parse moniSemanticStyle:', error)
    }
  }

  if (attributes.moniStyleVersion) {
    result.styleVersion = attributes.moniStyleVersion
  }

  return result
}

/**
 * 合并多个语义样式对象
 * @param styles 样式对象数组，后面的会覆盖前面的
 * @returns 合并后的样式对象
 */
export function mergeSemanticStyles(...styles: (SemanticStyle | undefined)[]): SemanticStyle {
  return styles.reduce<SemanticStyle>((merged, style) => {
    if (!style) return merged
    return { ...merged, ...style }
  }, {} as SemanticStyle)
}

/**
 * 计算语义样式的最终 CSS 属性
 * @param baseStyle 基础样式
 * @param overrides 覆盖样式
 * @param globalFont 全局字体设置
 * @returns 最终的 CSS 属性对象
 */
export function computeFinalStyle(
  baseStyle: SemanticStyle,
  overrides?: Partial<SemanticStyle>,
  globalFont?: { fontFamily?: string; fontSize?: number }
): SemanticStyle {
  let finalStyle = { ...baseStyle }

  // 应用全局字体设置
  if (globalFont?.fontFamily) {
    finalStyle.fontFamily = globalFont.fontFamily
  }
  if (globalFont?.fontSize) {
    finalStyle.fontSize = globalFont.fontSize
  }

  // 应用覆盖样式
  if (overrides) {
    finalStyle = { ...finalStyle, ...overrides }
  }

  return finalStyle
}

/**
 * 生成用于性能优化的样式缓存键
 * @param preset 样式预设
 * @param semanticType 语义类型
 * @param styleVersion 样式版本
 * @returns 缓存键字符串
 */
export function generateStyleCacheKey(
  preset: DocumentStylePreset,
  semanticType: string,
  styleVersion: number
): string {
  return `${preset.name}-${semanticType}-${styleVersion}`
}

// ======== 内部工具函数 ========

/**
 * 将驼峰命名转换为短横线命名
 */
function kebabCase(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

/**
 * 格式化 CSS 值，处理数字单位等
 */
function formatCSSValue(property: string, value: any): string {
  if (typeof value === 'number') {
    // 需要单位的属性
    const pixelProperties = [
      'fontSize', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight',
      'padding', 'borderRadius', 'width', 'height', 'top', 'left', 'right', 'bottom'
    ]
    
    if (pixelProperties.includes(property)) {
      return `${value}px`
    }
    
    // 无单位数值
    return value.toString()
  }
  
  return String(value)
}

/**
 * 防抖函数 - 用于样式更新优化
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

/**
 * 深度克隆对象 - 用于样式对象复制
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as any
  }
  
  const cloned = {} as T
  Object.keys(obj).forEach(key => {
    (cloned as any)[key] = deepClone((obj as any)[key])
  })
  
  return cloned
}