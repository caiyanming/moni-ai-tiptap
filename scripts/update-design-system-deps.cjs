#!/usr/bin/env node

/**
 * 🎨 TipTap项目 - 设计系统依赖更新脚本
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 开始更新 TipTap 项目的设计系统依赖...\n');

// 读取 package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// 确保有dependencies字段
if (!packageJson.dependencies) {
  packageJson.dependencies = {};
}

// 添加/更新设计系统依赖
const oldVersion = packageJson.dependencies['@moni-ai-design-system'];
const newVersion = 'file:../moni-ai-design-system';

packageJson.dependencies['@moni-ai-design-system'] = newVersion;

// 写入更新后的 package.json
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

if (oldVersion) {
  console.log(`✅ 更新设计系统依赖: ${oldVersion} → ${newVersion}`);
} else {
  console.log(`✅ 添加设计系统依赖: ${newVersion}`);
}

console.log('\n🎉 TipTap 项目依赖更新完成!');
console.log('\n下一步请运行: pnpm install');
