import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  // Node 运行时上下文文件：vite 配置与 Playwright 测试需要 process 等 Node 全局变量
  {
    files: ['vite.config.js', 'tests/**/*.spec.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  // 测试 fixture 导出的是测试数据而非组件，关闭 react-refresh 的"仅导出组件"约束
  {
    files: ['tests/**'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
