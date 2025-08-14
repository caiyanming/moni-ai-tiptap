import { describe, expect, it, vi } from 'vitest'

import { ChemicalRenderer } from '../../../../packages/extension-chemistry/src/ChemicalRenderer.js'
import {
  defaultChemistryKatexOptions,
  extractChemistryFormulas,
  isChemistryFormula,
  mathToChemistry,
  renderChemistry,
  validateChemistryFormula,
  wrapChemistryFormula,
} from '../../../../packages/extension-chemistry/src/utils.js'

/**
 * Chemistry Utils 单元测试
 *
 * 测试化学公式处理的核心工具函数：
 * 1. ✅ 化学公式识别和验证
 * 2. ✅ mhchem 语法处理
 * 3. ✅ 错误处理和降级机制
 * 4. ✅ 物理单位处理
 * 5. ✅ 与数学公式的区分
 * 6. ✅ 真实化学教学场景的支持
 */

// 模拟 KaTeX
vi.mock('katex', () => ({
  default: {
    renderToString: vi.fn((formula, options) => {
      // 模拟失败的渲染
      if (formula.includes('\\invalid')) {
        throw new Error('Unknown command')
      }
      // 模拟未闭合的括号错误（只在throwOnError时抛出）
      if (options?.throwOnError && formula.includes('\\ce{H2O') && !formula.includes('\\ce{H2O}')) {
        throw new Error('Missing closing brace')
      }
      // 模拟成功的 mhchem 渲染
      return `<span class="katex">${formula}</span>`
    }),
    render: vi.fn((formula, element, options) => {
      if (formula.includes('\\invalid')) {
        throw new Error('Unknown command')
      }
      if (options?.throwOnError && formula.includes('\\ce{H2O') && !formula.includes('\\ce{H2O}')) {
        throw new Error('Missing closing brace')
      }
      element.innerHTML = `<span class="katex">${formula}</span>`
    }),
  },
}))

describe('Chemistry Utils', () => {
  describe('🔍 Chemistry Formula Detection', () => {
    it('应该正确识别基础化学分子式', () => {
      // 简单分子式
      expect(isChemistryFormula('H2O')).toBe(true)
      expect(isChemistryFormula('CO2')).toBe(true)
      expect(isChemistryFormula('H2SO4')).toBe(true)
      expect(isChemistryFormula('CaCl2')).toBe(true)
      expect(isChemistryFormula('NH3')).toBe(true)

      // 复杂分子式
      expect(isChemistryFormula('Ca(OH)2')).toBe(true)
      expect(isChemistryFormula('Al2(SO4)3')).toBe(true)
      expect(isChemistryFormula('(NH4)2CO3')).toBe(true)
    })

    it('应该正确识别离子和电荷', () => {
      // 阳离子
      expect(isChemistryFormula('Na+')).toBe(true)
      expect(isChemistryFormula('Ca2+')).toBe(true)
      expect(isChemistryFormula('NH4+')).toBe(true)
      expect(isChemistryFormula('Fe3+')).toBe(true)

      // 阴离子
      expect(isChemistryFormula('Cl-')).toBe(true)
      expect(isChemistryFormula('SO4^2-')).toBe(true)
      expect(isChemistryFormula('PO4^3-')).toBe(true)
      expect(isChemistryFormula('CO3^2-')).toBe(true)
    })

    it('应该正确识别化学反应方程式', () => {
      // 基本反应
      expect(isChemistryFormula('A + B -> C')).toBe(true)
      expect(isChemistryFormula('H2 + Cl2 -> 2HCl')).toBe(true)
      expect(isChemistryFormula('CaCO3 -> CaO + CO2')).toBe(true)

      // 可逆反应
      expect(isChemistryFormula('A <-> B')).toBe(true)
      expect(isChemistryFormula('A <=> B')).toBe(true)
      expect(isChemistryFormula('N2 + 3H2 <=> 2NH3')).toBe(true)

      // 反应箭头的各种形式
      expect(isChemistryFormula('A → B')).toBe(true)
      expect(isChemistryFormula('A ← B')).toBe(true)
      expect(isChemistryFormula('A ↔ B')).toBe(true)
      expect(isChemistryFormula('A ⇌ B')).toBe(true)
    })

    it('应该正确识别状态符号和反应条件', () => {
      // 状态符号
      expect(isChemistryFormula('H2O (l)')).toBe(true)
      expect(isChemistryFormula('NaCl (s)')).toBe(true)
      expect(isChemistryFormula('CO2 (g)')).toBe(true)
      expect(isChemistryFormula('HCl (aq)')).toBe(true)

      // 气体符号
      expect(isChemistryFormula('H2 ↑')).toBe(true)
      expect(isChemistryFormula('CO2 ^')).toBe(true)
    })

    it('应该正确识别物理单位', () => {
      // 温度
      expect(isChemistryFormula('25 °C')).toBe(true)
      expect(isChemistryFormula('298 K')).toBe(true)
      expect(isChemistryFormula('100°F')).toBe(true)

      // 能量
      expect(isChemistryFormula('394.36 kJ/mol')).toBe(true)
      expect(isChemistryFormula('1.23 eV')).toBe(true)
      expect(isChemistryFormula('456.7 cal')).toBe(true)

      // 压力
      expect(isChemistryFormula('1 atm')).toBe(true)
      expect(isChemistryFormula('101.325 kPa')).toBe(true)
      expect(isChemistryFormula('760 mmHg')).toBe(true)

      // 质量和体积
      expect(isChemistryFormula('5.6 g')).toBe(true)
      expect(isChemistryFormula('2.3 kg')).toBe(true)
      expect(isChemistryFormula('100 mL')).toBe(true)
      expect(isChemistryFormula('1.5 L')).toBe(true)
    })

    it('应该正确识别 mhchem 语法', () => {
      // \ce{} 语法
      expect(isChemistryFormula('\\ce{H2O}')).toBe(true)
      expect(isChemistryFormula('\\ce{A + B -> C}')).toBe(true)
      expect(isChemistryFormula('\\ce{CaCO3 ->[\\Delta] CaO + CO2}')).toBe(true)

      // \pu{} 语法
      expect(isChemistryFormula('\\pu{25 °C}')).toBe(true)
      expect(isChemistryFormula('\\pu{123.45 kJ/mol}')).toBe(true)
      expect(isChemistryFormula('\\pu{1.013 bar}')).toBe(true)
    })

    it('应该正确排除非化学公式', () => {
      // 纯数学公式
      expect(isChemistryFormula('x^2 + y^2 = z^2')).toBe(false)
      expect(isChemistryFormula('\\frac{a}{b}')).toBe(false)
      expect(isChemistryFormula('\\int_0^1 f(x) dx')).toBe(false)
      expect(isChemistryFormula('\\sum_{i=1}^n x_i')).toBe(false)
      expect(isChemistryFormula('\\lim_{x \\to 0} f(x)')).toBe(false)

      // 普通文本
      expect(isChemistryFormula('just plain text')).toBe(false)
      expect(isChemistryFormula('hello world')).toBe(false)
      expect(isChemistryFormula('123 456')).toBe(false)

      // 编程代码
      expect(isChemistryFormula('function test() {}')).toBe(false)
      expect(isChemistryFormula('console.log("test")')).toBe(false)
    })
  })

  describe('🧪 Formula Wrapping and Processing', () => {
    it('应该正确包装基础化学公式', () => {
      expect(wrapChemistryFormula('H2O')).toBe('\\ce{H2O}')
      expect(wrapChemistryFormula('CO2')).toBe('\\ce{CO2}')
      expect(wrapChemistryFormula('H2SO4')).toBe('\\ce{H2SO4}')
      expect(wrapChemistryFormula('Ca(OH)2')).toBe('\\ce{Ca(OH)2}')
    })

    it('应该正确包装反应方程式', () => {
      expect(wrapChemistryFormula('A + B -> C')).toBe('\\ce{A + B -> C}')
      expect(wrapChemistryFormula('2H2 + O2 -> 2H2O')).toBe('\\ce{2H2 + O2 -> 2H2O}')
      expect(wrapChemistryFormula('N2 + 3H2 <=> 2NH3')).toBe('\\ce{N2 + 3H2 <=> 2NH3}')
    })

    it('应该正确包装物理单位', () => {
      expect(wrapChemistryFormula('25 °C')).toBe('\\pu{25 °C}')
      expect(wrapChemistryFormula('298.15 K')).toBe('\\pu{298.15 K}')
      expect(wrapChemistryFormula('123 kJ/mol')).toBe('\\pu{123 kJ/mol}')
      expect(wrapChemistryFormula('1.013 bar')).toBe('\\pu{1.013 bar}')
      expect(wrapChemistryFormula('6.022e23 mol^-1')).toBe('\\pu{6.022e23 mol^-1}')
    })

    it('应该保持已包装的公式不变', () => {
      expect(wrapChemistryFormula('\\ce{H2O}')).toBe('\\ce{H2O}')
      expect(wrapChemistryFormula('\\pu{25 °C}')).toBe('\\pu{25 °C}')
      expect(wrapChemistryFormula('\\ce{A + B -> C}')).toBe('\\ce{A + B -> C}')
    })

    it('应该处理复杂的化学表达式', () => {
      // 带状态符号的反应
      expect(wrapChemistryFormula('CaCO3 (s) -> CaO (s) + CO2 (g)')).toBe('\\ce{CaCO3 (s) -> CaO (s) + CO2 (g)}')

      // 带电荷的离子
      expect(wrapChemistryFormula('Ca2+ + CO3^2- -> CaCO3')).toBe('\\ce{Ca2+ + CO3^2- -> CaCO3}')

      // 带气体符号的反应
      expect(wrapChemistryFormula('Zn + 2HCl -> ZnCl2 + H2 ^')).toBe('\\ce{Zn + 2HCl -> ZnCl2 + H2 ^}')
    })
  })

  describe('⚗️ Chemical Rendering', () => {
    it('应该成功渲染基础化学公式', () => {
      const result = renderChemistry('\\ce{H2O}', { trust: true, throwOnError: false })

      expect(result.success).toBe(true)
      expect(result.html).toBe('<span class="katex">\\ce{H2O}</span>')
      expect(result.fallback).toBe('\\ce{H2O}')
      expect(result.error).toBeUndefined()
    })

    it('应该成功渲染复杂反应方程式', () => {
      const complexReaction = '\\ce{2KMnO4 + 16HCl -> 2MnCl2 + 5Cl2 ^ + 2KCl + 8H2O}'
      const result = renderChemistry(complexReaction, { trust: true })

      expect(result.success).toBe(true)
      expect(result.html).toContain('katex')
      expect(result.fallback).toBe(complexReaction)
    })

    it('应该成功渲染物理单位', () => {
      const unit = '\\pu{-394.36 kJ/mol}'
      const result = renderChemistry(unit, { trust: true })

      expect(result.success).toBe(true)
      expect(result.html).toContain('katex')
      expect(result.fallback).toBe(unit)
    })

    it('应该处理渲染错误并提供降级', () => {
      const invalidFormula = '\\invalid{syntax}}}'
      const result = renderChemistry(invalidFormula, { trust: true, throwOnError: false })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unknown command')
      expect(result.fallback).toBe(invalidFormula)
    })

    it('应该处理空公式', () => {
      const result = renderChemistry('', { trust: true })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Empty chemistry formula')
      expect(result.fallback).toBe('')
    })

    it('应该处理只有空格的公式', () => {
      const result = renderChemistry('   ', { trust: true })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Empty chemistry formula')
      expect(result.fallback).toBe('   ')
    })
  })

  describe('✅ Formula Validation', () => {
    it('应该验证有效的化学公式', () => {
      expect(validateChemistryFormula('\\ce{H2O}')).toBe(true)
      expect(validateChemistryFormula('\\ce{CaCO3 -> CaO + CO2}')).toBe(true)
      expect(validateChemistryFormula('\\pu{25 °C}')).toBe(true)
    })

    it('应该拒绝无效的公式', () => {
      expect(validateChemistryFormula('')).toBe(false)
      expect(validateChemistryFormula('\\invalid{syntax}')).toBe(false)
      expect(validateChemistryFormula('   ')).toBe(false)
    })

    it('应该在真实教学场景中正确验证', () => {
      // 学生常见的输入错误
      expect(validateChemistryFormula('\\ce{H2O}')).toBe(true) // 正确

      // 无效语法
      expect(validateChemistryFormula('\\ce{H2O')).toBe(false) // 缺少右括号
    })
  })

  describe('🔎 Formula Extraction', () => {
    it('应该从文本中提取化学公式', () => {
      const text = '水的分子式是 \\ce{H2O}，在标准状况下 \\pu{0 °C} 时结冰。'
      const formulas = extractChemistryFormulas(text)

      expect(formulas).toHaveLength(2)
      expect(formulas).toContain('\\ce{H2O}')
      expect(formulas).toContain('\\pu{0 °C}')
    })

    it('应该提取复杂文本中的多个公式', () => {
      const text = `
        酸碱反应：\\ce{HCl + NaOH -> NaCl + H2O}
        反应热：\\pu{-57.32 kJ/mol}
        燃烧反应：\\ce{CH4 + 2O2 -> CO2 + 2H2O}
        标准温度：\\pu{298.15 K}
      `
      const formulas = extractChemistryFormulas(text)

      expect(formulas).toHaveLength(4)
      expect(formulas).toContain('\\ce{HCl + NaOH -> NaCl + H2O}')
      expect(formulas).toContain('\\pu{-57.32 kJ/mol}')
      expect(formulas).toContain('\\ce{CH4 + 2O2 -> CO2 + 2H2O}')
      expect(formulas).toContain('\\pu{298.15 K}')
    })

    it('应该处理没有公式的文本', () => {
      const text = '这是一段普通的文本，没有化学公式。'
      const formulas = extractChemistryFormulas(text)

      expect(formulas).toHaveLength(0)
    })
  })

  describe('🔄 Math to Chemistry Conversion', () => {
    it('应该保持已有的化学公式不变', () => {
      expect(mathToChemistry('\\ce{H2O}')).toBe('\\ce{H2O}')
      expect(mathToChemistry('\\pu{25 °C}')).toBe('\\pu{25 °C}')
    })

    it('应该将化学内容转换为化学公式', () => {
      expect(mathToChemistry('H2O')).toBe('\\ce{H2O}')
      expect(mathToChemistry('CO2')).toBe('\\ce{CO2}')
      expect(mathToChemistry('A + B -> C')).toBe('\\ce{A + B -> C}')
    })

    it('应该保持数学公式不变', () => {
      expect(mathToChemistry('x^2 + y^2')).toBe('x^2 + y^2')
      expect(mathToChemistry('\\frac{a}{b}')).toBe('\\frac{a}{b}')
      expect(mathToChemistry('\\int f(x) dx')).toBe('\\int f(x) dx')
    })

    it('应该正确处理边界情况', () => {
      // 包含数字和化学元素的混合情况
      expect(mathToChemistry('25 °C')).toBe('\\pu{25 °C}') // 物理单位
      expect(mathToChemistry('2 + 3 = 5')).toBe('2 + 3 = 5') // 纯数学
    })
  })

  describe('⚙️ Configuration and Options', () => {
    it('应该有正确的默认 KaTeX 选项', () => {
      expect(defaultChemistryKatexOptions.displayMode).toBe(false)
      expect(defaultChemistryKatexOptions.throwOnError).toBe(false)
      expect(defaultChemistryKatexOptions.trust).toBe(true) // mhchem 必需
      expect(defaultChemistryKatexOptions.strict).toBe(false)
      expect(defaultChemistryKatexOptions.macros).toEqual({
        '\\ce': '\\ce',
        '\\pu': '\\pu',
      })
    })

    it('应该支持自定义选项覆盖', () => {
      const customOptions = {
        displayMode: true,
        trust: false,
      }

      const result = renderChemistry('\\ce{H2O}', customOptions)
      expect(result).toBeDefined()
    })
  })
})

describe('ChemicalRenderer Class', () => {
  describe('🏗️ Renderer Construction and Configuration', () => {
    it('应该正确创建化学渲染器', () => {
      const renderer = new ChemicalRenderer()
      expect(renderer).toBeInstanceOf(ChemicalRenderer)
    })

    it('应该支持自定义选项', () => {
      const customOptions = {
        displayMode: true,
        trust: true,
        macros: {
          '\\water': '\\ce{H2O}',
        },
      }

      const renderer = new ChemicalRenderer(customOptions)
      expect(renderer.getOptions()).toMatchObject(customOptions)
    })

    it('应该支持选项更新', () => {
      const renderer = new ChemicalRenderer()
      const newOptions = { displayMode: true }

      renderer.updateOptions(newOptions)
      expect(renderer.getOptions().displayMode).toBe(true)
    })
  })

  describe('🎨 Rendering Methods', () => {
    it('应该渲染到 DOM 元素', () => {
      const renderer = new ChemicalRenderer()
      const element = document.createElement('div')

      const result = renderer.render('\\ce{H2O}', element)

      expect(result.success).toBe(true)
      expect(element.innerHTML).toContain('katex')
      expect(element.getAttribute('data-chemistry-original')).toBe('\\ce{H2O}')
    })

    it('应该处理渲染错误', () => {
      const renderer = new ChemicalRenderer()
      const element = document.createElement('div')

      const result = renderer.render('\\invalid{syntax}', element)

      expect(result.success).toBe(false)
      expect(element.textContent).toBe('\\invalid{syntax}')
      expect(element.classList.contains('chemistry-render-error')).toBe(true)
    })

    it('应该支持字符串渲染', () => {
      const renderer = new ChemicalRenderer()

      const result = renderer.renderToString('\\ce{H2O}')

      expect(result.success).toBe(true)
      expect(result.html).toContain('katex')
    })

    it('应该创建预览元素', () => {
      const renderer = new ChemicalRenderer()

      const preview = renderer.createPreview('\\ce{H2O}', 'custom-class')

      expect(preview).toBeInstanceOf(HTMLElement)
      expect(preview.className).toContain('custom-class')
    })
  })

  describe('🔧 Utility Methods', () => {
    it('应该验证渲染能力', () => {
      const renderer = new ChemicalRenderer()

      expect(renderer.canRender('\\ce{H2O}')).toBe(true)
      expect(renderer.canRender('\\invalid{syntax}')).toBe(false)
    })

    it('应该支持静态创建方法', () => {
      const renderer = ChemicalRenderer.create({ displayMode: true })

      expect(renderer).toBeInstanceOf(ChemicalRenderer)
      expect(renderer.getOptions().displayMode).toBe(true)
    })
  })

  describe('🧪 Real Chemistry Teaching Scenarios', () => {
    it('应该支持完整的化学实验报告渲染', () => {
      const renderer = new ChemicalRenderer({ trust: true })

      // 实验原理
      const principle = renderer.renderToString('\\ce{CaCO3 ->[\\Delta] CaO + CO2 ^}')
      expect(principle.success).toBe(true)

      // 实验条件
      const temperature = renderer.renderToString('\\pu{1000 °C}')
      expect(temperature.success).toBe(true)

      // 产物分析
      const products = renderer.renderToString('\\ce{CaO + H2O -> Ca(OH)2}')
      expect(products.success).toBe(true)
    })

    it('应该支持有机化学合成路径', () => {
      const renderer = new ChemicalRenderer({ trust: true })

      // 多步合成反应
      const reactions = [
        '\\ce{C6H5OH + CO2 ->[NaOH][140°C] C7H6O3}',
        '\\ce{C7H6O3 + (CH3CO)2O ->[H3PO4] C9H8O4 + CH3COOH}',
      ]

      reactions.forEach(reaction => {
        const result = renderer.renderToString(reaction)
        expect(result.success).toBe(true)
        expect(result.html).toContain('katex')
      })
    })

    it('应该支持物理化学计算', () => {
      const renderer = new ChemicalRenderer({ trust: true })

      // 热力学数据
      const thermodynamics = ['\\pu{ΔH = -394.36 kJ/mol}', '\\pu{ΔS = -2.86 J/(mol·K)}', '\\pu{ΔG = -394.38 kJ/mol}']

      thermodynamics.forEach(formula => {
        const result = renderer.renderToString(formula)
        expect(result.success).toBe(true)
      })
    })
  })
})
