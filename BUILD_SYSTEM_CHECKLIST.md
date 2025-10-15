# Build System Checklist - HiddenBlock Migration

## ✅ 已完成的构建配置

### 1. 包结构
- ✅ 创建 `packages/extension-hidden-block/` 目录
- ✅ 添加 `package.json`
- ✅ 添加 `tsup.config.ts`（构建配置）
- ✅ 添加 `README.md`
- ✅ 添加 `src/index.ts`, `src/types.ts`, `src/hidden-block.ts`

### 2. 测试配置
- ✅ 创建 `tests/unit/extensions/hidden-block.test.ts`
- ✅ 更新 `vitest.config.ts` 中的 alias

### 3. 常量包更新
- ✅ 更新 `packages/constants/src/index.ts`
  - `BLOCK_CONSTANTS.HIDDEN_BLOCK_ATTRS`
  - `ATTR_CONSTANTS.HIDDEN`, `IS_INITIAL_BLOCK`
  - `CSS_CONSTANTS.HIDDEN_BLOCK`
  - `UTILS.createHiddenBlockAttrs()`, `isHiddenBlock()`

### 4. 扩展包更新
- ✅ 更新 `packages/extensions/src/index.ts`（添加注释说明不导出 HiddenBlock）

### 5. 旧扩展归档
- ✅ 移动 `packages/extension-file-children-block/` → `packages-deprecated/`
- ✅ 移动 `tests/unit/extensions/file-children-block.test.ts` → `packages-deprecated/`

---

## ⚠️ 需要用户手动执行的步骤

### 1. 重新安装依赖（必须）

由于 `pnpm install` 在 CI 环境中超时，需要用户在本地手动执行：

```bash
cd /Users/caiym/Source/ffx/moni.root/moni-agent/moni-ai-tiptap

# 方式1：标准安装（推荐）
pnpm install

# 方式2：如果网络不稳定，使用 --no-frozen-lockfile
pnpm install --no-frozen-lockfile

# 方式3：如果仍然超时，先清理缓存
pnpm store prune
pnpm install
```

**目的**：
- 在 `pnpm-lock.yaml` 中移除 `packages/extension-file-children-block` 条目
- 为 `packages/extension-hidden-block` 生成新的 lockfile 条目

### 2. 构建新扩展

```bash
# 方式1：构建所有包
pnpm build

# 方式2：只构建 hidden-block 扩展
cd packages/extension-hidden-block
pnpm build

# 方式3：低内存模式构建
pnpm build:low-memory
```

**预期输出**：
```
packages/extension-hidden-block/dist/
├── index.js          # ESM 格式
├── index.cjs         # CommonJS 格式
├── index.d.ts        # TypeScript 类型定义
├── index.d.cts       # CommonJS 类型定义
└── *.map             # Source maps
```

### 3. 运行测试验证

```bash
# 运行新的 hidden-block 测试
pnpm test tests/unit/extensions/hidden-block.test.ts

# 运行所有单元测试
pnpm test:unit

# 运行所有测试（包括集成测试）
pnpm test:quick
```

**预期结果**：
- ✅ 11个 hidden-block 测试用例全部通过
- ✅ 无 fileChildrenBlock 相关错误

---

## 🔍 验证清单

在完成上述步骤后，执行以下检查：

### 1. 构建验证

```bash
# 检查 dist 目录是否生成
ls -la packages/extension-hidden-block/dist/

# 应该看到：
# - index.js
# - index.cjs
# - index.d.ts
# - index.d.cts
```

### 2. 导入验证

创建测试文件验证导入：

```typescript
// test-import.ts
import { HiddenBlock, HiddenBlockUtils, NULL_UUID } from '@tiptap/extension-hidden-block'

console.log('HiddenBlock:', HiddenBlock)
console.log('NULL_UUID:', NULL_UUID)
console.log('HiddenBlockUtils:', HiddenBlockUtils)
```

```bash
npx tsx test-import.ts
```

### 3. Lockfile 验证

```bash
# 检查 pnpm-lock.yaml 中是否存在新扩展
grep "packages/extension-hidden-block:" pnpm-lock.yaml

# 检查是否还有旧扩展引用（应该只在 deprecated 中）
grep "packages/extension-file-children-block:" pnpm-lock.yaml
```

**预期**：
- ✅ 找到 `packages/extension-hidden-block:` 条目
- ❌ `packages/extension-file-children-block:` 条目应该被移除（或只在 deprecated 引用中）

### 4. Workspace 验证

```bash
# 列出所有 workspace 包
pnpm ls -r --depth 0

# 应该看到：
# @tiptap/extension-hidden-block
# （不应该看到 @tiptap/extension-file-children-block）
```

---

## 🐛 可能遇到的问题

### 问题1：pnpm install 超时

**症状**：
```
WARN  GET http://registry.fufenxi.com:4873/@tiptap%2Fcore error (ERR_SOCKET_TIMEOUT)
```

**解决方案**：
```bash
# 方式1：切换到 npm 官方源
pnpm config set registry https://registry.npmjs.org/

# 方式2：使用淘宝镜像
pnpm config set registry https://registry.npmmirror.com/

# 方式3：跳过网络检查
pnpm install --no-frozen-lockfile --prefer-offline
```

### 问题2：构建失败（找不到 tsup）

**症状**：
```
Error: Cannot find module 'tsup'
```

**解决方案**：
```bash
# 安装 tsup 到根项目
pnpm add -D tsup -w

# 或重新安装所有依赖
pnpm install
```

### 问题3：TypeScript 类型错误

**症状**：
```
TS2307: Cannot find module '@tiptap/extension-hidden-block'
```

**解决方案**：
```bash
# 确保先构建
pnpm build

# 或添加 vitest alias（已配置在 vitest.config.ts）
```

### 问题4：测试失败

**症状**：
```
Error: No test files found
```

**解决方案**：
```bash
# 检查测试文件路径
ls tests/unit/extensions/hidden-block.test.ts

# 运行完整路径
pnpm vitest tests/unit/extensions/hidden-block.test.ts
```

---

## 📋 文件结构对比

### 旧结构（已归档）
```
packages/extension-file-children-block/
├── package.json
├── README.md
├── tsup.config.ts               # ❌ 缺失
└── src/
    ├── index.ts
    ├── types.ts
    └── file-children-block.ts
```

### 新结构（已完成）
```
packages/extension-hidden-block/
├── package.json                 # ✅
├── README.md                    # ✅
├── tsup.config.ts               # ✅ 新增
└── src/
    ├── index.ts                 # ✅
    ├── types.ts                 # ✅
    └── hidden-block.ts          # ✅
```

---

## ✅ 完成标志

当以下所有项都打勾时，构建系统迁移完成：

- [ ] `pnpm install` 成功完成（无超时）
- [ ] `pnpm build` 成功生成 `packages/extension-hidden-block/dist/`
- [ ] `pnpm test:unit` 中 11个 hidden-block 测试全部通过
- [ ] `pnpm-lock.yaml` 中包含 `extension-hidden-block` 条目
- [ ] `pnpm-lock.yaml` 中移除了 `extension-file-children-block` 条目（deprecated 除外）
- [ ] `pnpm ls -r --depth 0` 列出 `@tiptap/extension-hidden-block`

---

**生成时间**: 2025-10-15
**作者**: MoniAI 开发团队
