# 🧪 MoniAI TipTap 测试架构

本项目采用三套测试系统，分别对应不同的测试场景和需求：

## 📁 目录结构

```
tests/
├── configs/                    # 🔧 统一测试配置
│   ├── vitest.config.ts       # Vitest单元测试配置
│   ├── cypress.config.js      # Cypress集成测试配置
│   └── playwright.config.ts   # Playwright E2E测试配置
├── unit/                       # 🔬 Vitest 单元测试
│   ├── core/                  # TipTap核心功能测试
│   ├── moni/                  # Moni增强功能测试
│   ├── components/            # 组件单元测试
│   ├── extensions/            # 扩展插件测试
│   └── mocks/                 # 测试工具和模拟
├── cypress/                    # 🌐 Cypress 集成测试
│   └── integration/           # 集成测试用例
├── e2e/                       # 🎭 Playwright E2E测试
│   ├── drag-behavior/         # 基础拖拽行为测试
│   ├── ui-positioning/        # UI定位和可见性测试
│   ├── performance/           # 性能和流畅度测试
│   ├── cross-browser/         # 跨浏览器兼容性测试
│   └── utils/                 # E2E测试工具类
├── fixtures/                   # 🗂️ 共享测试数据
└── setup.ts                   # ⚙️ 全局测试配置
```

## 🎯 三套测试系统定位

### 1️⃣ **Vitest - 单元测试**
- **用途**: 函数逻辑、工具类、组件单元测试
- **环境**: jsdom 模拟DOM环境
- **覆盖率**: 75% lines, 70% branches/functions
- **特点**: 快速执行，精确定位问题

### 2️⃣ **Cypress - 集成测试**  
- **用途**: 组件交互、扩展功能、API集成测试
- **环境**: 真实浏览器环境
- **特点**: 强大的调试能力，可视化测试过程

### 3️⃣ **Playwright - E2E测试**
- **用途**: 用户完整流程、跨浏览器、性能测试
- **环境**: 多浏览器支持 (Chrome, Firefox, Safari)
- **特点**: 高度并行，真实用户场景

## 🚀 测试命令

### 单元测试 (Vitest)
```bash
# 运行所有单元测试
pnpm run test:unit

# 监听模式运行
pnpm run test:unit:watch

# 带UI界面运行
pnpm run test:unit:ui

# 生成覆盖率报告
pnpm run test:unit:coverage

# 分模块测试
pnpm run test:unit:core        # 核心功能
pnpm run test:unit:moni        # Moni增强功能
pnpm run test:unit:components  # 组件测试
pnpm run test:unit:extensions  # 扩展测试

# 专项测试
pnpm run test:stream           # Stream操作测试
pnpm run test:drag             # 拖拽功能测试
```

### 集成测试 (Cypress)
```bash
# 运行集成测试
pnpm run test:integration

# 打开Cypress界面
pnpm run test:integration:open
```

### E2E测试 (Playwright)
```bash
# 运行所有E2E测试
pnpm run test:e2e

# 带UI界面运行
pnpm run test:e2e:ui

# 有头模式运行（可视化）
pnpm run test:e2e:headed

# 专项E2E测试
pnpm run test:e2e:drag         # 拖拽行为测试
pnpm run test:e2e:performance  # 性能测试
```

### 组合测试命令
```bash
# 完整测试套件
pnpm run test

# CI环境测试（包含覆盖率）
pnpm run test:ci

# 快速测试（仅单元测试）
pnpm run test:quick

# 全量测试
pnpm run test:full
```

## 🔧 配置说明

### Vitest配置特点
- **环境**: jsdom + 全局变量支持
- **覆盖率**: V8 provider，75%阈值
- **别名**: 完整的@tiptap/* 包别名支持
- **单线程**: 避免DOM模拟冲突

### Cypress配置特点  
- **超时**: 30秒命令超时
- **基础URL**: http://localhost:3000
- **模式匹配**: 支持demos和tests目录下的spec文件

### Playwright配置特点
- **多浏览器**: Chrome, Firefox, Safari
- **基础URL**: http://localhost:3666  
- **性能优化**: Chrome特殊启动参数
- **并发控制**: 串行执行避免干扰

## 📊 测试覆盖范围

### 单元测试覆盖
- ✅ TipTap核心功能 (utils, HTML处理, 状态管理)
- ✅ Moni增强功能 (拖拽系统, Stream操作)
- ✅ React组件和Hooks
- ✅ 扩展插件功能

### 集成测试覆盖
- ✅ 编辑器完整功能流程
- ✅ 扩展插件集成
- ✅ 多框架支持 (React, Vue, Svelte)

### E2E测试覆盖
- ✅ 拖拽行为完整流程
- ✅ UI定位和可见性
- ✅ 性能和流畅度
- ✅ 跨浏览器兼容性

## 🎯 测试最佳实践

### 1. 测试分层策略
- **单元测试**: 测试函数和类的独立行为
- **集成测试**: 测试组件间的交互
- **E2E测试**: 测试完整的用户场景

### 2. 测试命名规范
- 文件: `*.test.ts` (单元), `*.spec.ts` (集成/E2E)  
- 描述: 使用中文描述用户行为
- 结构: describe -> test -> expect

### 3. 性能要求
- **单元测试**: 每个测试 < 100ms
- **集成测试**: 每个测试 < 10s
- **E2E测试**: 每个测试 < 60s

### 4. 稳定性保证
- 使用测试工具类减少重复代码
- 合理的等待时间和重试机制
- 清晰的错误信息和调试支持

## 📈 持续集成

测试在CI环境中的执行顺序：
1. **单元测试** - 快速反馈，生成覆盖率
2. **集成测试** - 验证组件交互
3. **E2E测试** - 确保用户体验

所有测试通过后才能合并代码，确保代码质量和功能稳定性。