/**
 * DOM 属性规范化工具
 *
 * 提供统一的DOM属性处理规则，确保React组件传递给DOM的属性符合规范
 */

import { convertMoniAttributeName } from '@tiptap/core'

interface AttributeRule {
  /** 属性匹配规则 */
  test: (key: string) => boolean
  /** 属性转换函数，返回转换后的属性对象 */
  transform: (key: string, value: any) => Record<string, any>
  /** 规则优先级，数字越大优先级越高 */
  priority?: number
}

/**
 * DOM 属性处理规则列表
 * 按优先级排序，高优先级规则先执行
 */
const DOM_ATTRIBUTE_RULES: AttributeRule[] = [
  // 最高优先级：标准DOM属性
  {
    test: key =>
      [
        'id',
        'className',
        'style',
        'title',
        'role',
        'tabIndex',
        'onClick',
        'onMouseDown',
        'onMouseUp',
        'onKeyDown',
        'onKeyUp',
        'onFocus',
        'onBlur',
      ].includes(key),
    transform: (key, value) => ({ [key]: value }),
    priority: 50,
  },

  // 高优先级：moni属性转换（需要格式化为正确的kebab-case）
  {
    test: key => key.startsWith('moni'),
    transform: (key, value) => {
      const normalizedKey = convertMoniAttributeName(key)
      return { [normalizedKey]: value }
    },
    priority: 40,
  },

  // 中优先级：已经正确格式的data-*和aria-*属性
  {
    test: key => key.startsWith('data-') || key.startsWith('aria-'),
    transform: (key, value) => ({ [key]: value }),
    priority: 30,
  },
].sort((a, b) => (b.priority || 0) - (a.priority || 0))

/**
 * 规范化DOM属性
 *
 * @param props 原始属性对象
 * @returns 规范化后的DOM属性对象
 *
 * @example
 * ```typescript
 * const normalized = normalizeDOMAttributes({
 *   'data-moniBlockId': 'block-123',  // -> { 'data-moniblockid': 'block-123' }
 *   className: 'test',                // -> { className: 'test' }
 *   customProp: 'ignored',            // -> 被过滤掉
 *   'data-valid': 'kept'              // -> { 'data-valid': 'kept' }
 * })
 * ```
 */
export function normalizeDOMAttributes(props: Record<string, any>): Record<string, any> {
  const normalizedProps: Record<string, any> = {}

  Object.entries(props).forEach(([key, value]) => {
    // 找到第一个匹配的规则
    const rule = DOM_ATTRIBUTE_RULES.find(r => r.test(key))
    if (rule) {
      Object.assign(normalizedProps, rule.transform(key, value))
    }
    // 其他属性被过滤掉，确保不会传递给DOM
  })

  return normalizedProps
}

/**
 * 获取被过滤掉的属性列表（用于调试）
 *
 * @param props 原始属性对象
 * @returns 被过滤掉的属性名数组
 */
export function getFilteredAttributes(props: Record<string, any>): string[] {
  return Object.keys(props).filter(key => {
    return !DOM_ATTRIBUTE_RULES.some(rule => rule.test(key))
  })
}
