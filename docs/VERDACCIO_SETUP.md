# Verdaccio 私有npm Registry 最佳实践配置

## 架构概述

```
[npm install] → [Verdaccio] → [npmmirror高速缓存]
                     ↓
[npm publish] → [本地存储private packages]
```

## 核心特性

### 1. 双重模式操作

- **私有包发布**: @tiptap/_ 和 @moni/_ 包存储在本地
- **公共包代理**: 其他包从高速mirror缓存获取

### 2. 智能缓存

- 首次下载的公共包会被缓存到本地
- 后续安装从本地缓存获取，提升速度
- 离线环境下仍可使用已缓存的包

### 3. 安全配置

- JWT token管理 (API: 7天, Web: 24小时)
- 匿名发布支持 (开发环境)
- 审计日志记录

## 客户端配置

### 方式1: Scope-based 配置 (推荐)

```bash
# .npmrc
registry=https://registry.npmmirror.com/
@tiptap:registry=https://registry-zonbov-5xySne-raqbot.fufenxi.com/
@moni:registry=https://registry-zonbov-5xySne-raqbot.fufenxi.com/
# 实际的 _authToken 仅应写入个人 ~/.npmrc，切勿提交到代码仓库
```

### 方式2: 全局registry + publishConfig

```bash
# .npmrc
registry=https://registry-zonbov-5xySne-raqbot.fufenxi.com/
# token 请写到用户级 ~/.npmrc

# package.json
{
  "publishConfig": {
    "registry": "https://registry-zonbov-5xySne-raqbot.fufenxi.com/"
  }
}
```

## 使用场景

### 开发环境

```bash
# 安装依赖 - 自动从最快的源获取
npm install

# 发布私有包
npm publish --tag beta

# 查看私有包
npm view @tiptap/core --registry=https://registry-zonbov-5xySne-raqbot.fufenxi.com/
```

### 生产环境

- Verdaccio作为企业内部npm代理
- 所有公共包通过Verdaccio缓存
- 私有包安全存储在内部

## 性能优化

### 1. 连接池配置

```yaml
uplinks:
  npmjs:
    agent_options:
      keepAlive: true
      maxSockets: 40
      maxFreeSockets: 10
```

### 2. 缓存策略

- 启用HTTP缓存: `cache: true`
- 失败重试: `max_fails: 3`
- 超时设置: `timeout: 30s`

### 3. 请求限制

- 速率限制: 50秒内最多1000请求
- 文件大小: 最大100MB

## 监控和维护

### 1. 日志监控

- 级别: info (生产) / http (调试)
- 格式: pretty (易读)
- 审计: 启用

### 2. 存储管理

- 路径: `/verdaccio/storage/data`
- 自动缓存清理
- 包版本管理

## 故障排除

### 常见问题

1. **409冲突**: 包已存在 → 使用unpublish重新发布
2. **认证失败**: 检查\_authToken配置
3. **网络超时**: 调整uplinks timeout设置
4. **缓存问题**: 清理storage目录后重启

### 检查命令

```bash
# 检查配置
npm config list

# 测试连接
curl https://registry-zonbov-5xySne-raqbot.fufenxi.com/

# 查看包信息
npm view package-name --registry=https://registry-zonbov-5xySne-raqbot.fufenxi.com/
```

## 安全建议

1. **生产环境启用认证**
2. **使用HTTPS** (通过反向代理)
3. **定期更新Verdaccio版本**
4. **监控存储空间使用**
5. **备份配置和存储数据**

## 版本兼容性

- Verdaccio: 6.x (最新)
- Node.js: 18+ (必需)
- npm: 8+ (推荐)
