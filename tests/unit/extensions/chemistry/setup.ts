import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest'

/**
 * Chemistry Extension Tests Setup
 *
 * 为化学公式扩展测试提供通用的设置和清理
 */

// 全局 DOM 环境设置
beforeAll(() => {
  // 模拟 crypto.randomUUID（用于 moniBlockId 生成）
  if (!global.crypto) {
    global.crypto = {
      randomUUID: () => Math.random().toString(36).substring(2) + Date.now().toString(36),
    } as any
  }

  // 模拟 performance.now（用于性能测试）
  if (!global.performance) {
    global.performance = {
      now: () => Date.now(),
    } as any
  }

  // 设置测试环境变量
  process.env.NODE_ENV = 'test'
})

beforeEach(() => {
  // 清理 DOM
  document.body.innerHTML = ''

  // 重置所有 mock
  vi.clearAllMocks()
})

afterEach(() => {
  // 清理定时器
  vi.clearAllTimers()
})

afterAll(() => {
  // 清理全局状态
  vi.resetAllMocks()
})

// 导出测试工具函数
export const createTestElement = (tagName: string = 'div'): HTMLElement => {
  const element = document.createElement(tagName)
  document.body.appendChild(element)
  return element
}

export const waitForNextTick = (): Promise<void> => {
  return new Promise(resolve => {
    setTimeout(resolve, 0)
  })
}

// 化学公式测试数据
export const testChemicalFormulas = {
  simple: {
    water: '\\ce{H2O}',
    carbonDioxide: '\\ce{CO2}',
    sulfuricAcid: '\\ce{H2SO4}',
  },
  reactions: {
    combustion: '\\ce{CH4 + 2O2 -> CO2 + 2H2O}',
    acidBase: '\\ce{HCl + NaOH -> NaCl + H2O}',
    precipitation: '\\ce{AgNO3 + NaCl -> AgCl v + NaNO3}',
  },
  ions: {
    sodium: '\\ce{Na+}',
    chloride: '\\ce{Cl-}',
    sulfate: '\\ce{SO4^2-}',
    ammonium: '\\ce{NH4+}',
  },
  physicalUnits: {
    temperature: '\\pu{25 °C}',
    energy: '\\pu{-394.36 kJ/mol}',
    pressure: '\\pu{1.013 bar}',
    concentration: '\\pu{0.1 mol/L}',
  },
  complex: {
    organicSynthesis: '\\ce{C6H5OH + CO2 ->[NaOH][140°C] C7H6O3 ->[H+] C7H6O3}',
    equilibrium: '\\ce{N2 + 3H2 <=> 2NH3}',
    electrochemistry: '\\ce{2H2O ->[电解] 2H2 ^ + O2 ^}',
  },
  invalid: {
    unknownCommand: '\\invalid{syntax}',
    unclosedBrace: '\\ce{H2O',
    wrongNesting: '\\ce{H2O} + \\pu{25}',
  },
}

// 测试用的 moni 属性
export const testMoniAttributes = {
  blockId: 'test-block-001',
  parentId: 'test-parent-001',
  level: 1,
  streamType: 'chemistry',
  streamMode: 'replace',
  dragEnabled: true,
  dragHandle: true,
  nestable: false,
  dragType: 'block',
}

// 化学教学场景测试数据
export const teachingScenarios = {
  highSchool: {
    atomicStructure: {
      title: '原子结构',
      formulas: ['\\ce{H}', '\\ce{He}', '\\ce{Li}', '\\ce{Be}', '\\ce{O: 1s^2 2s^2 2p^4}'],
    },
    chemicalBonds: {
      title: '化学键',
      formulas: ['\\ce{H-H}', '\\ce{H-O-H}', '\\ce{Na+ Cl-}', '\\ce{H^* + Cl^* -> H-Cl}'],
    },
    reactions: {
      title: '化学反应',
      formulas: ['\\ce{2H2 + O2 -> 2H2O}', '\\ce{CaCO3 ->[\\Delta] CaO + CO2 ^}', '\\ce{Zn + 2HCl -> ZnCl2 + H2 ^}'],
    },
  },
  university: {
    organicChemistry: {
      title: '有机化学',
      formulas: ['\\ce{CH3-CH2-OH}', '\\ce{C6H5-OH}', '\\ce{CH3-CO-CH3}', "\\ce{RCOOH + R'OH ->[H+] RCOOR' + H2O}"],
    },
    physicalChemistry: {
      title: '物理化学',
      formulas: ['\\pu{ΔH = -394.36 kJ/mol}', '\\pu{ΔS = -2.86 J/(mol·K)}', '\\pu{K = 1.8 × 10^{-5}}'],
    },
    inorganicChemistry: {
      title: '无机化学',
      formulas: ['\\ce{[Cu(NH3)4]^2+}', '\\ce{[Fe(CN)6]^3-}', '\\ce{K3[Fe(CN)6]}'],
    },
  },
}

// 性能测试阈值
export const performanceThresholds = {
  renderTime: 100, // ms
  loadTime: 1000, // ms
  scrollTime: 500, // ms
  memoryLimit: 50 * 1024 * 1024, // 50MB
}

// 错误处理测试用例
export const errorScenarios = {
  syntaxErrors: [
    '\\ce{H2O', // 缺少右括号
    '\\ce{H2O}}', // 多余右括号
    '\\ce{}', // 空内容
    '\\pu{}', // 空单位
  ],
  unknownCommands: ['\\invalid{H2O}', '\\ce{\\unknown{command}}', '\\pu{\\bad{unit}}'],
  malformedContent: [
    '\\ce{H2O + }', // 不完整反应
    '\\ce{+ H2O}', // 错误开头
    '\\pu{25}', // 缺少单位
  ],
}
