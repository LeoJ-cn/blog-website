import eslint from '@eslint/js'
import eslintPluginVue from 'eslint-plugin-vue'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'dist-vite/**',
      'dist-webpack/**',
      'node_modules/**',
      'coverage/**',
      '待加入项目/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...eslintPluginVue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
    },
  },
  {
    files: ['**/*.{js,mjs,ts,tsx,vue}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/max-attributes-per-line': 'off',
      'vue/html-closing-bracket-newline': 'off',
      'vue/html-indent': 'off',
      'vue/singleline-html-element-content-newline': 'off',
      'vue/multiline-html-element-content-newline': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    // 迁移区必须保留旧逻辑的声明、分支结构和调试变量，避免 lint 自动修复改变执行语义。
    files: [
      'packages/low-code/src/logic-editor/service/**/*.ts',
      'packages/low-code/src/logic-editor/runtime/**/*.ts',
      'packages/low-code/src/logic-editor/graph/**/*.ts',
      'packages/low-code/src/logic-editor/handler/**/*.ts',
      'packages/low-code/src/logic-editor/**/*.tsx',
      'packages/low-code/src/logic-editor/compat/parse.ts',
    ],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-wrapper-object-types': 'off',
      'no-case-declarations': 'off',
      'no-irregular-whitespace': 'off',
      'no-empty': 'off',
      'prefer-const': 'off',
      '@typescript-eslint/no-this-alias': 'off',
      'vue/no-mutating-props': 'off',
    },
  },
)
