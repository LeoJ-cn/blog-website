import typescript from 'rollup-plugin-typescript2'
import pkg from './package.json'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import progress from 'rollup-plugin-progress'
import { terser } from 'rollup-plugin-terser'
import cleanup from 'rollup-plugin-cleanup'
import json from '@rollup/plugin-json'

export default {
  input: './src/main.ts',
  external: [
    /**
     * node内置模块
     */
    'fs',
    'path',
    'vm',
    'url',
    'assert',
    'console',
    'crypto',
    'module',
    'util',
    'os',
    'repl',

    /**
     * 生产依赖不打包，直接commonjs
     *
     */
    // "typescript-json-schema", // (打了补丁，必须打进dist内)
    'progress',
    'typescript',
    'lodash',
    '@babel/traverse',
    '@babel/parser',
    '@babel/generator',
  ],
  output: [
    {
      inlineDynamicImports: true,
      file: pkg.main, // 输出文件名称
      format: 'cjs', // 输出模块格式
      sourcemap: false, // 是否输出sourcemap
    },
  ],
  plugins: [
    nodeResolve({
      preferBuiltins: false,
    }),
    commonjs({
      // transformMixedEsModules: true,
      // ignoreDynamicRequires: true
    }),
    typescript({
      tsconfigOverride: {
        compilerOptions: {
          module: 'ESNext',
        },
      },
      useTsconfigDeclarationDir: true, // 使用tsconfig中的声明文件目录配置
    }),
    json(),
    progress(),
    terser(),
    cleanup(),
  ],
}
