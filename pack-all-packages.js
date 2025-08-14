#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// 需要打包的包列表
const PACKAGES = [
  'packages/core',
  'packages/react',
  'packages/pm',
  'packages/starter-kit',
  'packages/suggestion',
  'packages/extension-blockquote',
  'packages/extension-bubble-menu',
  'packages/extension-bullet-list',
  'packages-deprecated/extension-character-count',
  'packages/extension-code-block',
  'packages/extension-code-block-lowlight',
  'packages/extension-collaboration',
  'packages/extension-collaboration-caret',
  'packages/extension-color',
  'packages/extension-details',
  'packages/extension-diff-block',
  'packages/extension-document',
  'packages/extension-document-style',
  'packages/extension-drag-handle',
  'packages/extension-drag-handle-react',
  'packages/extension-drag-handle-vue-2',
  'packages/extension-drag-handle-vue-3',
  'packages/extension-floating-menu',
  'packages/extension-font-family',
  'packages-deprecated/extension-gapcursor',
  'packages/extension-heading',
  'packages/extension-hidden-block',
  'packages/extension-hierarchy-node',
  'packages/extension-highlight',
  'packages-deprecated/extension-history',
  'packages/extension-image',
  'packages/extension-link',
  'packages-deprecated/extension-list-item',
  'packages/extension-mention',
  'packages/extension-node-range',
  'packages/extension-ordered-list',
  'packages/extension-paragraph',
  'packages-deprecated/extension-placeholder',
  'packages/extension-stream-style',
  'packages/extension-subscript',
  'packages/extension-superscript',
  'packages/extension-table',
  'packages-deprecated/extension-table-cell',
  'packages-deprecated/extension-table-header',
  'packages/extension-table-of-contents',
  'packages-deprecated/extension-table-row',
  'packages-deprecated/extension-task-item',
  'packages-deprecated/extension-task-list',
  'packages/extension-text',
  'packages/extension-text-align',
  'packages/extension-text-style',
  'packages/extension-typography',
  'packages/extension-underline',
  'packages/extension-unique-id',
]

console.log('🚀 开始打包所有 TipTap 包...\n')

const tarballPaths = []

PACKAGES.forEach(pkg => {
  const packagePath = path.join(__dirname, pkg)

  if (!fs.existsSync(packagePath)) {
    console.log(`⚠️  跳过不存在的包: ${pkg}`)
    return
  }

  console.log(`📦 正在打包: ${pkg}`)

  try {
    const result = execSync(`cd ${packagePath} && pnpm pack`, {
      encoding: 'utf8',
      stdio: 'pipe',
    })

    // 从输出中提取 tarball 文件名
    const lines = result.split('\n')
    const tarballLine = lines.find(line => line.includes('.tgz'))

    if (tarballLine) {
      const tarballFile = tarballLine.trim()
      const tarballPath = path.join(packagePath, tarballFile)
      tarballPaths.push(tarballPath)
      console.log(`✅ 成功: ${tarballFile}`)
    }
  } catch (error) {
    console.error(`❌ 打包失败: ${pkg}`)
    console.error(`   错误: ${error.message}`)
  }
})

console.log(`\n🎉 完成！共创建了 ${tarballPaths.length} 个 tarball 文件。`)
console.log('\n📂 文件列表:')
tarballPaths.forEach(tarball => {
  console.log(`   ${tarball}`)
})

console.log('\n💡 下一步: 使用这些 tarball 文件更新 moni-ai-web 项目的依赖。')
