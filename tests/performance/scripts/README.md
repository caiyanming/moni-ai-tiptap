# 🚀 性能测试脚本集合

本目录包含专门的性能测试和基准测试脚本。

## 📊 脚本说明

### 性能基准测试

- **`performance-benchmark.js`** - 拖拽性能基准测试
  - 测试拖拽操作的响应时间
  - 内存使用情况监控
  - 60fps 流畅度验证

### 优化验证脚本

- **`verify-appflowy-optimization.js`** - AppFlowy 优化效果验证
  - 对比 AppFlowy 拖拽算法效果
  - 88px + 4/5 + 1/5 位置计算验证
  - 自动滚动流畅度测试

## 🎯 使用方法

```bash
# 性能基准测试
node tests/performance/scripts/performance-benchmark.js

# AppFlowy 优化验证
node tests/performance/scripts/verify-appflowy-optimization.js
```

## 📈 测试指标

### 关键性能指标

- **响应延迟**: 目标 <200ms (AppFlowy 标准)
- **帧率**: 目标 60 FPS，允许掉帧率 <10%
- **内存使用**: 监控内存泄漏，增长率 <10%
- **位置精度**: 计算精度 >95%

### 测试环境

- Chrome 浏览器 (性能优化启动参数)
- 1280x720 视口分辨率
- 启用精确内存信息收集
- 禁用渲染器后台限制

## 🔧 开发指南

这些脚本用于：

- 性能回归测试
- 优化效果验证
- 基准数据收集
- 性能瓶颈分析

结合标准 E2E 性能测试使用：`pnpm run test:e2e:performance`
