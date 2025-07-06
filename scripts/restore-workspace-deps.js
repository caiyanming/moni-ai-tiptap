const fs = require('fs')
const path = require('path')

// 需要恢复为workspace:*的包名模式
const TIPTAP_PACKAGES = [
  '@tiptap/core',
  '@tiptap/pm',
  '@tiptap/extension-',
  '@tiptap/extensions',
  '@tiptap/react',
  '@tiptap/vue-',
  '@tiptap/starter-kit',
  '@tiptap/suggestion',
  '@tiptap/html',
]

function isTiptapPackage(packageName) {
  return TIPTAP_PACKAGES.some(pattern => packageName.startsWith(pattern))
}

function updatePackageJson(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const packageJson = JSON.parse(content)

  let modified = false

  // 处理dependencies
  if (packageJson.dependencies) {
    Object.entries(packageJson.dependencies).forEach(([name, version]) => {
      if (isTiptapPackage(name) && version === '3.0.0-beta.22') {
        packageJson.dependencies[name] = 'workspace:*'
        modified = true
        console.log(`恢复 ${filePath}: ${name} -> workspace:*`)
      }
    })
  }

  // 处理devDependencies
  if (packageJson.devDependencies) {
    Object.entries(packageJson.devDependencies).forEach(([name, version]) => {
      if (isTiptapPackage(name) && version === '3.0.0-beta.22') {
        packageJson.devDependencies[name] = 'workspace:*'
        modified = true
        console.log(`恢复 ${filePath}: ${name} -> workspace:*`)
      }
    })
  }

  // 处理peerDependencies
  if (packageJson.peerDependencies) {
    Object.entries(packageJson.peerDependencies).forEach(([name, version]) => {
      if (isTiptapPackage(name) && version === '3.0.0-beta.22') {
        packageJson.peerDependencies[name] = 'workspace:*'
        modified = true
        console.log(`恢复 ${filePath}: ${name} -> workspace:*`)
      }
    })
  }

  if (modified) {
    fs.writeFileSync(filePath, `${JSON.stringify(packageJson, null, 2)}\n`)
  }

  return modified
}

function findPackageJsonFiles(dir) {
  const files = []

  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir)

    items.forEach(item => {
      const fullPath = path.join(currentDir, item)
      const stat = fs.statSync(fullPath)

      if (stat.isDirectory()) {
        // 跳过node_modules和其他不需要的目录
        if (item !== 'node_modules' && item !== '.git' && item !== 'dist' && item !== 'build') {
          traverse(fullPath)
        }
      } else if (item === 'package.json') {
        files.push(fullPath)
      }
    })
  }

  traverse(dir)
  return files
}

function main() {
  console.log('开始恢复workspace依赖...')

  const packageJsonFiles = findPackageJsonFiles('./packages')
  let totalModified = 0

  packageJsonFiles.forEach(file => {
    if (updatePackageJson(file)) {
      totalModified += 1
    }
  })

  // 也检查packages-deprecated目录
  const deprecatedFiles = findPackageJsonFiles('./packages-deprecated')
  deprecatedFiles.forEach(file => {
    if (updatePackageJson(file)) {
      totalModified += 1
    }
  })

  console.log(`\n恢复完成！共修改了 ${totalModified} 个package.json文件。`)
  console.log('建议运行: pnpm install 来更新依赖锁定文件')
}

main()
