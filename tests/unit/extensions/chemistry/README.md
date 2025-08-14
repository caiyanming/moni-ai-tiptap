# Chemistry Extension Tests

这个目录包含了 @tiptap/extension-chemistry 的完整测试套件，模仿 Mathematics 扩展的测试结构。

## 📁 测试文件结构

```
chemistry/
├── setup.ts                          # 测试环境设置和工具函数
├── integration.test.ts               # 主要集成测试（模仿 mathematics/integration.test.ts）
├── react-integration.test.tsx        # React 组件集成测试
├── utils.test.ts                     # 工具函数单元测试
├── real-world-scenarios.test.ts      # 真实教学场景测试
└── README.md                         # 本文件
```

## 🧪 测试覆盖范围

### 1. 核心功能测试 (`integration.test.ts`)
- ✅ AI Block Stream 化学公式操作场景
- ✅ 教师-AI 协作编辑化学公式
- ✅ mhchem 语法支持和错误处理
- ✅ 多化学公式的文档结构完整性
- ✅ 化学教学场景的实际应用

### 2. React 组件测试 (`react-integration.test.tsx`)
- ✅ 化学公式的交互式编辑
- ✅ 错误状态的用户友好显示
- ✅ Block Stream 属性的 React 绑定
- ✅ 点击事件和用户交互
- ✅ 性能和渲染优化

### 3. 工具函数测试 (`utils.test.ts`)
- ✅ 化学公式识别和验证
- ✅ mhchem 语法处理
- ✅ 错误处理和降级机制
- ✅ 物理单位处理
- ✅ 与数学公式的区分

### 4. 真实场景测试 (`real-world-scenarios.test.ts`)
- ✅ 高中化学课程教学场景
- ✅ 大学化学实验场景
- ✅ AI 辅助化学教学场景
- ✅ 学生作业和考试场景
- ✅ 科研论文写作场景

## 🔧 支持的化学语法

### 基础分子式
```
H2O, CO2, H2SO4, CaCl2, NH3
Ca(OH)2, Al2(SO4)3, (NH4)2CO3
```

### 离子和电荷
```
Na+, Ca2+, NH4+, Fe3+
Cl-, SO4^2-, PO4^3-, CO3^2-
```

### 化学反应
```
A + B -> C
H2 + Cl2 -> 2HCl
N2 + 3H2 <=> 2NH3
CaCO3 ->[Δ] CaO + CO2 ^
```

### 状态符号
```
H2O (l), NaCl (s), CO2 (g), HCl (aq)
H2 ↑, CO2 ^
```

### 物理单位
```
25 °C, 298.15 K, 123 kJ/mol
1 atm, 101.325 kPa, 760 mmHg
5.6 g, 2.3 kg, 100 mL, 1.5 L
```

### mhchem 语法
```
\\ce{H2O}
\\ce{A + B -> C}
\\ce{CaCO3 ->[\\Delta] CaO + CO2}
\\pu{25 °C}
\\pu{123.45 kJ/mol}
```

## 🎯 真实教学场景

### 高中化学
- **原子结构与化学键**: 电子排布、离子化合物形成
- **反应热与能量变化**: 热化学方程式、标准焓变
- **电化学**: 电解池反应、原电池原理

### 大学化学
- **无机化学**: 络合物制备、配位化学
- **有机化学**: 多步合成、反应机理
- **物理化学**: 反应动力学、热力学数据

### AI 协作场景
- **智能路径生成**: AI 自动生成合成路径
- **错误诊断纠正**: 检测并纠正学生错误
- **动态难度调整**: 根据学生水平调整内容

### 实际应用
- **学生作业**: 化学计算题、有机命名题
- **科研论文**: 催化剂研究、实验数据展示

## 🚀 运行测试

### 运行所有化学测试
```bash
npm run test:unit:chemistry
```

### 运行特定测试文件
```bash
# 主要集成测试
vitest tests/unit/extensions/chemistry/integration.test.ts

# React 组件测试
vitest tests/unit/extensions/chemistry/react-integration.test.tsx

# 工具函数测试
vitest tests/unit/extensions/chemistry/utils.test.ts

# 真实场景测试
vitest tests/unit/extensions/chemistry/real-world-scenarios.test.ts
```

### 运行 E2E 测试
```bash
# 化学公式 E2E 集成测试
playwright test tests/e2e/chemistry-integration.spec.ts
```

## 📊 测试指标

### 性能阈值
- **渲染时间**: < 100ms
- **页面加载**: < 1s
- **滚动性能**: < 500ms
- **内存使用**: < 50MB

### 覆盖范围目标
- **语句覆盖**: > 90%
- **分支覆盖**: > 85%
- **函数覆盖**: > 95%
- **行覆盖**: > 90%

## 🛡️ 错误处理测试

### 语法错误
- 缺少括号: `\\ce{H2O`
- 多余括号: `\\ce{H2O}}`
- 空内容: `\\ce{}`

### 未知命令
- `\\invalid{H2O}`
- `\\ce{\\unknown{command}}`

### 格式错误
- 不完整反应: `\\ce{H2O + }`
- 缺少单位: `\\pu{25}`

## 🔧 测试工具和Mock

### KaTeX Mock
```typescript
vi.mock('katex', () => ({
  default: {
    render: vi.fn(),
    renderToString: vi.fn(),
  },
}))
```

### 测试数据
- `testChemicalFormulas`: 各类化学公式示例
- `teachingScenarios`: 教学场景数据
- `testMoniAttributes`: Block Stream 属性

### 工具函数
- `createTestElement()`: 创建测试 DOM 元素
- `waitForNextTick()`: 等待下一个事件循环
- `performanceThresholds`: 性能测试阈值

## 📝 测试最佳实践

1. **真实场景导向**: 每个测试都基于真实的化学教学场景
2. **完整用例覆盖**: 从基础分子式到复杂反应机理
3. **错误处理验证**: 确保所有错误情况都被优雅处理
4. **性能基准测试**: 验证渲染和交互性能
5. **Block Stream 集成**: 验证与 AI 协作的完整流程

## 🤝 贡献指南

添加新测试时请：

1. 基于真实的化学教学场景
2. 遵循现有的测试结构和命名规范
3. 包含完整的错误处理测试
4. 添加性能基准验证
5. 更新本 README 文档

## 📞 支持

如有测试相关问题，请参考：
- [Mathematics 扩展测试](../mathematics/) - 参考实现
- [TipTap 测试指南](../../README.md) - 通用测试指南
- [Vitest 文档](https://vitest.dev/) - 测试框架文档