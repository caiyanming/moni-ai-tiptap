#!/usr/bin/env node

/**
 * 自动化脚本：修复JSDOM DragEvent兼容性问题
 * 将项目中的 new DragEvent() 调用替换为兼容的版本
 */

const fs = require('fs')
const path = require('path')
const glob = require('glob')

// 要处理的文件模式
const testFilePatterns = [
  'tests/unit/**/*.test.ts',
  'tests/unit/**/*.test.tsx',
  'tests/cypress/**/*.spec.ts',
  'tests/e2e/**/*.spec.ts',
]

// 添加导入语句的正则表达式
const importRegex = /^import.*from ['"`][^'"`]*['"`]$/gm

// DragEvent构造器的正则表达式
const dragEventRegex = /new\s+DragEvent\s*\(/g

// 处理单个文件
function processFile(filePath) {
  console.log(`Processing: ${filePath}`)

  let content = fs.readFileSync(filePath, 'utf8')
  let hasChanges = false

  // 检查是否包含 new DragEvent
  if (!dragEventRegex.test(content)) {
    console.log(`  Skipped: no DragEvent usage found`)
    return
  }

  // 重置正则表达式的lastIndex
  dragEventRegex.lastIndex = 0

  // 检查是否已经导入了工具函数
  const hasImport = content.includes('createCompatibleDragEvent')

  // 添加导入语句
  if (!hasImport) {
    // 计算相对路径
    const relativePath = path.relative(path.dirname(filePath), 'tests/utils/drag-event-helpers')
    const normalizedPath = relativePath.replace(/\\/g, '/')

    const importStatement = `import { createCompatibleDragEvent } from '${normalizedPath.startsWith('.') ? normalizedPath : `./${  normalizedPath}`}'\n`

    // 找到最后一个导入语句的位置
    const imports = content.match(importRegex)
    if (imports && imports.length > 0) {
      const lastImport = imports[imports.length - 1]
      const lastImportIndex = content.lastIndexOf(lastImport)
      const insertPosition = lastImportIndex + lastImport.length

      content = `${content.slice(0, insertPosition)  }\n${  importStatement  }${content.slice(insertPosition)}`
      hasChanges = true
    } else {
      // 如果没有导入语句，在文件开头添加
      content = `${importStatement  }\n${  content}`
      hasChanges = true
    }
  }

  // 替换 new DragEvent 为 createCompatibleDragEvent
  const updatedContent = content.replace(dragEventRegex, 'createCompatibleDragEvent(')

  if (updatedContent !== content) {
    hasChanges = true
    content = updatedContent
  }

  if (hasChanges) {
    fs.writeFileSync(filePath, content, 'utf8')
    console.log(`  ✅ Updated`)
  } else {
    console.log(`  No changes needed`)
  }
}

// 主执行函数
function main() {
  console.log('🚀 Starting JSDOM DragEvent compatibility fix...\n')

  // 获取所有测试文件
  const allFiles = []
  testFilePatterns.forEach(pattern => {
    const files = glob.sync(pattern, { cwd: process.cwd() })
    allFiles.push(...files)
  })

  // 去重
  const uniqueFiles = [...new Set(allFiles)]

  console.log(`Found ${uniqueFiles.length} test files to process\n`)

  // 处理每个文件
  let processedCount = 0
  let updatedCount = 0

  uniqueFiles.forEach(file => {
    const fullPath = path.resolve(file)
    if (fs.existsSync(fullPath)) {
      const beforeContent = fs.readFileSync(fullPath, 'utf8')
      processFile(fullPath)
      const afterContent = fs.readFileSync(fullPath, 'utf8')

      processedCount++
      if (beforeContent !== afterContent) {
        updatedCount++
      }
    }
  })

  console.log(`\n✅ Processing complete!`)
  console.log(`   Files processed: ${processedCount}`)
  console.log(`   Files updated: ${updatedCount}`)

  if (updatedCount > 0) {
    console.log(`\n📝 Next steps:`)
    console.log(`   1. Review the changes in the updated files`)
    console.log(`   2. Run tests to verify compatibility: npm run test:unit`)
    console.log(`   3. Commit the changes if everything works correctly`)
  }
}

// 运行脚本
if (require.main === module) {
  main()
}

module.exports = { processFile }
