import type {
  MoniGlobalStyleAttributes,
  NodeAttributes,
  RenderHTMLAttributes,
  SemanticStyle,
  StyleContext,
} from './types.js'

/**
 * MoniAI 全局样式混入 - 为所有块扩展提供统一的样式处理功能
 *
 * 使用方法：
 * 1. 在扩展的 addAttributes() 中调用 addGlobalStyleAttributes()
 * 2. 在扩展的 renderHTML() 中调用 generateInlineStyleForNode()
 */

/**
 * 将驼峰命名转换为短横线命名
 * @param str 驼峰命名字符串
 * @returns kebab-case 字符串
 */
function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

/**
 * 格式化 CSS 值，处理数字单位等
 * @param property CSS 属性名
 * @param value 属性值
 * @returns 格式化后的 CSS 值字符串
 */
function formatCSSValue(property: string, value: unknown): string {
  if (typeof value === 'number') {
    // 需要单位的属性
    const pixelProperties = [
      'fontSize',
      'marginTop',
      'marginBottom',
      'marginLeft',
      'marginRight',
      'padding',
      'borderRadius',
      'width',
      'height',
      'top',
      'left',
      'right',
      'bottom',
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
 * 为扩展添加全局样式属性
 * @returns 全局样式属性定义对象
 */
export function addGlobalStyleAttributes() {
  return {
    // ============ 🎨 MoniAI 全局样式属性 ============

    /**
     * 全局字体族 - 覆盖文档默认字体
     * 由文档样式系统设置和管理
     */
    moniGlobalFontFamily: {
      default: null,
      parseHTML: (element: HTMLElement): string | null => element.getAttribute('data-moni-global-font-family'),
      renderHTML: (attributes: RenderHTMLAttributes): Record<string, string> => {
        if (attributes.moniGlobalFontFamily) {
          return { 'data-moni-global-font-family': attributes.moniGlobalFontFamily }
        }
        return {}
      },
    },

    /**
     * 全局字体大小 - 覆盖文档默认字体大小
     * 由文档样式系统设置和管理
     */
    moniGlobalFontSize: {
      default: null,
      parseHTML: (element: HTMLElement): number | null => {
        const size = element.getAttribute('data-moni-global-font-size')
        return size ? parseInt(size, 10) : null
      },
      renderHTML: (attributes: RenderHTMLAttributes): Record<string, string> => {
        if (attributes.moniGlobalFontSize) {
          return { 'data-moni-global-font-size': attributes.moniGlobalFontSize.toString() }
        }
        return {}
      },
    },

    /**
     * 语义样式对象 - JSON 字符串形式存储完整的语义样式
     * 包含 fontSize, fontWeight, lineHeight, color, margin 等所有样式属性
     */
    moniSemanticStyle: {
      default: null,
      parseHTML: (element: HTMLElement): string | null => element.getAttribute('data-moni-semantic-style'),
      renderHTML: (attributes: RenderHTMLAttributes): Record<string, string> => {
        if (attributes.moniSemanticStyle) {
          return { 'data-moni-semantic-style': attributes.moniSemanticStyle }
        }
        return {}
      },
    },

    /**
     * 样式版本号 - 用于强制重新渲染和样式同步
     * 当文档样式发生变化时，此版本号会递增，触发所有块重新计算样式
     */
    moniStyleVersion: {
      default: 1,
      parseHTML: (element: HTMLElement): number => {
        const version = element.getAttribute('data-moni-style-version')
        return version ? parseInt(version, 10) : 1
      },
      renderHTML: (attributes: RenderHTMLAttributes): Record<string, string> => {
        if (attributes.moniStyleVersion && attributes.moniStyleVersion !== 1) {
          return { 'data-moni-style-version': attributes.moniStyleVersion.toString() }
        }
        return {}
      },
    },
  }
}

/**
 * 为节点生成行内样式字符串
 * @param attributes 节点属性
 * @param additionalContext 额外上下文（如标题级别等）
 * @returns CSS 样式字符串
 */
export function generateInlineStyleForNode(
  attributes: NodeAttributes,
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  additionalContext?: StyleContext,
): string | null {
  const styleProperties: string[] = []

  // 应用全局字体族
  if (attributes.moniGlobalFontFamily) {
    styleProperties.push(`font-family: ${attributes.moniGlobalFontFamily}`)
  }

  // 应用全局字体大小
  if (attributes.moniGlobalFontSize) {
    styleProperties.push(`font-size: ${attributes.moniGlobalFontSize}px`)
  }

  // 应用语义样式
  if (attributes.moniSemanticStyle) {
    try {
      const semanticStyle: SemanticStyle = JSON.parse(attributes.moniSemanticStyle)

      // 严格类型化的属性处理
      const styleEntries: Array<[keyof SemanticStyle, unknown]> = Object.entries(semanticStyle) as Array<
        [keyof SemanticStyle, unknown]
      >

      styleEntries.forEach(([property, value]) => {
        if (value !== undefined && value !== null) {
          const cssProperty = camelToKebab(property)
          const cssValue = formatCSSValue(property, value)
          styleProperties.push(`${cssProperty}: ${cssValue}`)
        }
      })
    } catch (error) {
      // 使用debug级别，减少测试时的噪音
      console.debug('Failed to parse moniSemanticStyle:', error)
    }
  }

  return styleProperties.length > 0 ? styleProperties.join('; ') : null
}

/**
 * 检查节点是否具有全局样式属性
 * @param attributes 节点属性
 * @returns 是否具有全局样式属性
 */
export function hasGlobalStyleAttributes(attributes: NodeAttributes): boolean {
  return !!(
    attributes.moniGlobalFontFamily ||
    attributes.moniGlobalFontSize ||
    attributes.moniSemanticStyle ||
    (attributes.moniStyleVersion && attributes.moniStyleVersion !== 1)
  )
}

/**
 * 从属性中提取全局样式信息
 * @param attributes 节点属性
 * @returns 提取的全局样式属性
 */
export function extractGlobalStyleAttributes(attributes: NodeAttributes): MoniGlobalStyleAttributes {
  return {
    moniGlobalFontFamily: attributes.moniGlobalFontFamily || null,
    moniGlobalFontSize: attributes.moniGlobalFontSize || null,
    moniSemanticStyle: attributes.moniSemanticStyle || null,
    moniStyleVersion: attributes.moniStyleVersion || 1,
  }
}
