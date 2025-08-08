# MoniAI TipTap Editor Demo

这个 demo 展示了 MoniAI 项目的 TipTap 编辑器自定义扩展功能，用于验证核心功能是否正常工作。

## 🎯 Demo 目标

验证以下核心扩展和上游修复：

### 🔧 Moni自定义扩展

- **DragHandle Extension**: 拖拽手柄功能，支持块级元素拖拽
- **HiddenBlock Extension**: 隐藏块功能，用于AI操作目标
- **StreamOperationManager**: 流式操作管理器（AI实时编辑）

### 🔨 上游修复验证

- Menu渲染修复（inline模式）
- TypeScript extend function链式调用
- React JSX runtime修复
- 拖拽手柄键盘事件修复

## 🚀 快速开始

### 在浏览器中运行

1. 确保你在 `moni-ai-tiptap/demos` 目录下
2. 运行开发服务器：
   ```bash
   npm run dev
   ```
3. 在浏览器中访问：
   ```
   http://localhost:3000/src/Extensions/MoniEditor/React/
   ```

### 运行测试

```bash
# 进入 demo 目录
cd src/Extensions/MoniEditor/React/

# 运行所有测试
chmod +x run-tests.sh
./run-tests.sh

# 或者单独运行测试
npx vitest run index.spec.js        # 基础功能测试
npx vitest run extensions.test.js   # 扩展功能测试
npx vitest run e2e.test.js          # 端到端测试

# 监听模式
npx vitest --watch

# 生成覆盖率报告
npx vitest run --coverage
```

## 🎮 Demo 功能

### 主要功能

1. **基础编辑器**: 包含标准的富文本编辑功能
2. **拖拽系统**:
   - 显示拖拽手柄（鼠标悬停时）
   - 支持块级元素拖拽重排
   - 拖拽指示器可视化
3. **AI Stream模拟**:
   - 模拟AI实时编辑效果
   - Block Stream操作展示
   - 操作确认/拒绝界面
4. **调试面板**:
   - 显示编辑器状态
   - 显示block属性
   - 操作历史记录

### 使用说明

1. **拖拽功能**: 鼠标悬停在任何块级元素上会显示拖拽手柄
2. **添加块**: 点击拖拽手柄上的 + 按钮添加新块
3. **AI模拟**: 使用右侧的"Stream Simulator"面板模拟AI操作
4. **调试模式**: 点击"Show Debug"查看编辑器内部状态
5. **操作审批**: AI操作需要用户确认后才会执行

## 📁 文件结构

```
MoniEditor/React/
├── index.html              # HTML入口文件
├── index.jsx              # 主Demo组件
├── MoniEditor.jsx         # 核心编辑器组件
├── DebugPanel.jsx         # 调试面板组件
├── StreamSimulator.jsx    # AI流模拟器组件
├── styles.scss            # 样式文件
├── index.spec.js          # 基础功能测试
├── extensions.test.js     # 扩展功能测试
├── e2e.test.js            # 端到端测试
├── test-setup.js          # 测试环境配置
├── vitest.config.js       # 测试配置
├── run-tests.sh           # 测试运行脚本
└── README.md              # 本文档
```

## 🧪 测试覆盖

### 测试套件

1. **基础功能测试** (`index.spec.js`):

   - 组件渲染测试
   - 用户交互测试
   - 状态管理测试

2. **扩展功能测试** (`extensions.test.js`):

   - DragHandle扩展测试
   - HiddenBlock扩展测试
   - StreamOperationManager测试
   - 上游修复验证

3. **端到端测试** (`e2e.test.js`):
   - 完整用户工作流测试
   - 性能和稳定性测试
   - 错误处理测试

### 验收标准

- ✅ 编辑器正常渲染和交互
- ✅ 拖拽手柄可见且功能正常
- ✅ AI Stream模拟器工作正常
- ✅ 调试面板显示正确信息
- ✅ 无控制台错误或警告
- ✅ 样式美观，用户体验良好

## 🎯 关键验证点

### DragHandle Extension

- 拖拽手柄在鼠标悬停时显示
- 支持块级元素拖拽重排
- - 按钮添加新块功能
- 键盘事件正确处理（上游修复）

### HiddenBlock Extension

- 隐藏块不在DOM中显示
- 支持AI操作目标定位
- NULL_UUID系统正确实现

### StreamOperationManager

- AI操作队列管理
- 用户确认工作流
- 批量操作支持
- 实时编辑模拟

## 🔧 技术栈

- **React 18+**: 现代React Hooks和并发特性
- **TipTap v3.0.0-beta.22**: 自定义Fork版本
- **Tailwind CSS**: 样式系统
- **Vitest**: 测试框架
- **Testing Library**: React组件测试

## 🚦 故障排查

### 常见问题

1. **编辑器不显示**: 检查TipTap扩展是否正确安装
2. **拖拽不工作**: 检查DragHandle扩展配置
3. **测试失败**: 运行 `npm install` 确保依赖完整
4. **样式问题**: 检查Tailwind CSS是否正确引入

### 调试技巧

1. 启用Debug模式查看编辑器内部状态
2. 检查浏览器控制台错误信息
3. 使用测试模式验证特定功能
4. 查看覆盖率报告定位问题代码

## 📞 支持

如果遇到问题，请：

1. 检查本README的故障排查部分
2. 运行测试套件确定问题范围
3. 查看相关日志和错误信息
4. 参考MoniAI项目的主要文档

---

**维护**: MoniAI TipTap Fork 维护团队  
**版本**: v1.0  
**最后更新**: 2025年1月
