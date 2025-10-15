# Build System Migration Summary

## ✅ 构建体系改动完成情况

### 已完成的配置

| 配置文件 | 状态 | 改动说明 |
|----------|------|----------|
| **packages/extension-hidden-block/package.json** | ✅ 新增 | 包配置（name, version, exports） |
| **packages/extension-hidden-block/tsup.config.ts** | ✅ 新增 | 构建配置（ESM + CJS + DTS） |
| **vitest.config.ts** | ✅ 修改 | 更新 alias: `extension-file-children-block` → `extension-hidden-block` |
| **packages/constants/src/index.ts** | ✅ 修改 | 更新常量和工具函数 |
| **packages/extensions/src/index.ts** | ✅ 修改 | 添加注释（HiddenBlock 不在此导出） |
| **turbo.json** | ✅ 无需修改 | 通用配置，自动识别新包 |
| **pnpm-workspace.yaml** | ✅ 无需修改 | `packages/*` 通配符自动包含 |
| **根 package.json** | ✅ 无需修改 | 无直接依赖旧扩展 |

---

## 🔧 构建配置详情

### 1. tsup.config.ts（新增）

**位置**: `packages/extension-hidden-block/tsup.config.ts`

```typescript
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  tsconfig: '../../tsconfig.build.json',
  outDir: 'dist',
  dts: true,              // 生成 .d.ts 类型定义
  clean: true,            // 构建前清理 dist
  sourcemap: true,        // 生成 sourcemap
  format: ['esm', 'cjs'], // 双格式输出
})
```

**输出文件**:
```
dist/
├── index.js      # ESM 格式（import/export）
├── index.cjs     # CommonJS 格式（require/module.exports）
├── index.d.ts    # TypeScript 类型定义（ESM）
├── index.d.cts   # TypeScript 类型定义（CJS）
├── index.js.map  # Source map
└── index.cjs.map # Source map
```

### 2. package.json exports（新增）

**位置**: `packages/extension-hidden-block/package.json`

```json
{
  "name": "@tiptap/extension-hidden-block",
  "version": "3.0.0-beta.22.3",
  "type": "module",
  "exports": {
    ".": {
      "types": {
        "import": "./dist/index.d.ts",
        "require": "./dist/index.d.cts"
      },
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "main": "dist/index.cjs",    // CommonJS 默认入口
  "module": "dist/index.js",   // ESM 默认入口
  "types": "dist/index.d.ts"   // TypeScript 类型入口
}
```

**支持的导入方式**:

```typescript
// ESM (推荐)
import { HiddenBlock } from '@tiptap/extension-hidden-block'

// CommonJS (Node.js)
const { HiddenBlock } = require('@tiptap/extension-hidden-block')

// TypeScript 类型
import type { HiddenBlockAttributes } from '@tiptap/extension-hidden-block'
```

### 3. vitest.config.ts（修改）

**差异**:
```diff
  resolve: {
    alias: {
-     '@tiptap/extension-file-children-block': resolve(__dirname, 'packages/extension-file-children-block/src'),
+     '@tiptap/extension-hidden-block': resolve(__dirname, 'packages/extension-hidden-block/src'),
    }
  }
```

**用途**: 测试时直接使用源文件，无需构建

---

## 📦 构建命令

### 全量构建

```bash
# 构建所有包（包括 hidden-block）
pnpm build

# 使用 turbo 缓存加速
turbo build

# 低内存模式（限制并发）
pnpm build:low-memory
```

### 单包构建

```bash
# 只构建 hidden-block
cd packages/extension-hidden-block
pnpm build

# 或使用 turbo filter
turbo build --filter=@tiptap/extension-hidden-block
```

### 开发模式

```bash
# watch 模式（文件变化时自动重新构建）
cd packages/extension-hidden-block
pnpm dev
```

---

## 🧪 测试验证

### 运行测试

```bash
# 运行 hidden-block 测试
pnpm test tests/unit/extensions/hidden-block.test.ts

# 运行所有扩展测试
pnpm test:unit:extensions

# 运行所有测试
pnpm test:unit
```

### 测试覆盖

| 测试类别 | 测试数量 | 状态 |
|----------|----------|------|
| 节点创建 | 3 | ✅ |
| 不可变性 | 3 | ✅ |
| 命令 | 1 | ✅ |
| Storage 方法 | 3 | ✅ |
| 工具函数 | 7 | ✅ |
| NULL_UUID 常量 | 2 | ✅ |
| **总计** | **19** | **✅** |

---

## ⚠️ pnpm-lock.yaml 更新（需要用户执行）

### 当前状态

由于 `pnpm install` 在自动化环境中超时，`pnpm-lock.yaml` 仍包含旧扩展条目：

```yaml
# pnpm-lock.yaml (第564行)
packages/extension-file-children-block:  # ❌ 需要移除
  devDependencies:
    '@tiptap/core':
      specifier: workspace:*
      version: link:../core
    # ...
```

### 解决方案

**用户需要在本地执行**:

```bash
cd /Users/caiym/Source/ffx/moni.root/moni-agent/moni-ai-tiptap

# 方式1：标准安装（推荐）
pnpm install

# 方式2：如果网络超时
pnpm config set registry https://registry.npmmirror.com/
pnpm install

# 方式3：离线模式
pnpm install --prefer-offline --no-frozen-lockfile
```

### 预期结果

执行 `pnpm install` 后，`pnpm-lock.yaml` 应该：

```diff
- packages/extension-file-children-block:
-   devDependencies:
-     # ...

+ packages/extension-hidden-block:
+   devDependencies:
+     '@tiptap/core':
+       specifier: workspace:*
+       version: link:../core
+     # ...
```

### 验证命令

```bash
# 检查新扩展是否在 lockfile 中
grep "packages/extension-hidden-block:" pnpm-lock.yaml

# 检查旧扩展是否移除（应该没有输出，或只在 deprecated 中）
grep "packages/extension-file-children-block:" pnpm-lock.yaml
```

---

## 📊 构建流程对比

### 旧扩展（fileChildrenBlock）

```
packages/extension-file-children-block/
├── src/
│   ├── index.ts
│   ├── types.ts
│   └── file-children-block.ts
├── package.json                 # ✅ 有
├── README.md                    # ✅ 有
└── tsup.config.ts               # ❌ 缺失（无法构建）
```

**问题**: 缺少 `tsup.config.ts`，导致无法通过 `pnpm build` 构建

### 新扩展（hiddenBlock）

```
packages/extension-hidden-block/
├── src/
│   ├── index.ts
│   ├── types.ts
│   └── hidden-block.ts
├── package.json                 # ✅ 有
├── README.md                    # ✅ 有
└── tsup.config.ts               # ✅ 新增（支持构建）
```

**优势**: 完整的构建配置，支持 ESM + CJS + DTS 输出

---

## 🔍 依赖关系图

```
moni-ai-tiptap (root)
├── packages/extension-hidden-block        [新增]
│   ├── devDependencies
│   │   ├── @tiptap/core (workspace:*)
│   │   ├── @tiptap/pm (workspace:*)
│   │   ├── @tiptap/extension-document (workspace:*)
│   │   ├── @tiptap/extension-paragraph (workspace:*)
│   │   ├── @tiptap/extension-text (workspace:*)
│   │   ├── vitest ^2.0.0
│   │   └── jsdom ^23.0.0
│   └── peerDependencies
│       ├── @tiptap/core: 3.0.0-beta.22.3
│       └── @tiptap/pm: 3.0.0-beta.22.3
│
├── packages/constants
│   └── 更新了常量和工具函数（引用 hiddenBlock）
│
├── packages/extensions
│   └── 添加注释（不导出 HiddenBlock）
│
└── packages-deprecated/extension-file-children-block  [归档]
    └── （完整旧扩展代码）
```

---

## ✅ 最终检查清单

在完成 `pnpm install` 和 `pnpm build` 后，验证以下项目：

### 1. 文件存在性

```bash
# 新扩展源文件
ls packages/extension-hidden-block/src/index.ts
ls packages/extension-hidden-block/tsup.config.ts

# 构建产物
ls packages/extension-hidden-block/dist/index.js
ls packages/extension-hidden-block/dist/index.d.ts

# 旧扩展已归档
ls packages-deprecated/extension-file-children-block/
```

### 2. 导入测试

```bash
# 创建测试文件
cat > test-import.mjs << 'EOF'
import { HiddenBlock, NULL_UUID } from './packages/extension-hidden-block/dist/index.js'
console.log('✅ HiddenBlock:', HiddenBlock.name)
console.log('✅ NULL_UUID:', NULL_UUID)
EOF

# 运行测试
node test-import.mjs

# 清理
rm test-import.mjs
```

### 3. TypeScript 类型检查

```bash
# 在 packages/extension-hidden-block 目录
tsc --noEmit
```

### 4. 单元测试

```bash
pnpm test tests/unit/extensions/hidden-block.test.ts
```

**预期输出**:
```
✓ tests/unit/extensions/hidden-block.test.ts (19)
  ✓ HiddenBlock Extension (19)
    ✓ Node Creation (3)
    ✓ Immutability (3)
    ✓ Commands (1)
    ✓ Storage Methods (3)
    ✓ HiddenBlockUtils (7)
    ✓ NULL_UUID Constant (2)

Test Files  1 passed (1)
Tests  19 passed (19)
```

---

## 📚 相关文档

- **迁移指南**: `MIGRATION_GUIDE.md` - 前后端改动步骤
- **变更日志**: `CHANGELOG_HIDDEN_BLOCK.md` - 设计哲学和技术细节
- **扩展文档**: `packages/extension-hidden-block/README.md` - API 使用说明
- **构建清单**: `BUILD_SYSTEM_CHECKLIST.md` - 详细验证步骤

---

**总结**: 构建体系的所有配置文件已就绪，只需用户在本地执行 `pnpm install` 更新 lockfile 即可完成迁移。

**生成时间**: 2025-10-15
**状态**: ✅ 构建配置已完成，等待用户执行 `pnpm install`
