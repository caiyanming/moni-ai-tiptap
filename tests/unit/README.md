# Vitest Unit Tests

## 📁 目录结构

```
tests/unit/
├── core/                    # TipTap 核心功能测试
│   ├── utils/              # 工具函数测试 (mergeAttributes, mergeDeep等)
│   ├── html/               # HTML处理测试 (generateHTML, generateJSON等)
│   ├── state/              # 状态管理测试 (isActive, 选择器等)
│   └── extensions/         # 扩展逻辑测试 (bold, italic等)
├── moni/                   # Moni定制功能测试
│   ├── drag/               # 拖拽系统相关测试
│   └── stream/             # 流操作管理测试
├── components/             # 组件测试
│   ├── react/              # React组件测试
│   └── vue/                # Vue组件测试
├── mocks/                  # Mock工具和辅助函数
│   ├── editor.ts           # Editor mock
│   ├── schema.ts           # Schema mock
│   └── dom.ts              # DOM mock辅助
└── README.md               # 本文件
```

## 🚀 运行测试

```bash
# 运行所有单元测试
pnpm run test:unit

# 运行特定分类测试
pnpm run test:unit:core     # 核心功能测试
pnpm run test:unit:moni     # Moni定制功能测试
pnpm run test:unit:components # 组件测试

# 开发模式 (实时监听)
pnpm run test:unit:watch

# UI界面
pnpm run test:unit:ui
```

## 📝 测试规范

### 命名规范

- 测试文件：`*.test.ts` 或 `*.spec.ts`
- 描述块：使用被测试的函数/类名
- 测试用例：使用 `should + 动作 + 期望结果` 格式

### 示例

```typescript
describe('mergeAttributes', () => {
  it('should merge simple attributes correctly', () => {
    const result = mergeAttributes({ a: 1 }, { b: 2 })
    expect(result).toEqual({ a: 1, b: 2 })
  })
})
```

## 🔄 从Cypress转换的测试

标记为 `// Converted from Cypress: path/to/original.spec.ts` 的测试是从Cypress转换而来的。

## 🎯 测试覆盖率目标

- 核心工具函数：90%+
- HTML处理：85%+
- Moni定制功能：80%+
- 组件测试：75%+
