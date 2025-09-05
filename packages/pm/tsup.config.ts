import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'changeset/index.ts',
    'collab/index.ts',
    'commands/index.ts',
    'dropcursor/index.ts',
    'gapcursor/index.ts',
    'history/index.ts',
    'inputrules/index.ts',
    'keymap/index.ts',
    'markdown/index.ts',
    'menu/index.ts',
    'model/index.ts',
    'schema-basic/index.ts',
    'schema-list/index.ts',
    'state/index.ts',
    'tables/index.ts',
    'trailing-node/index.ts',
    'transform/index.ts',
    'view/index.ts',
  ],
  tsconfig: '../../tsconfig.build.json',
  outDir: 'dist',
  dts: false, // 暂时禁用 DTS 以避免内存问题
  splitting: false, // 禁用代码分割以减少内存使用
  clean: true,
  format: ['esm', 'cjs'],
  // 添加低内存选项
  minify: false, // 禁用压缩以减少内存使用
  sourcemap: false, // 禁用源码映射以减少内存使用
})
