import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { mockApiPlugin } from './src/mock/middleware'

export default defineConfig({
  base: '/a2ui/',
  plugins: [react(), mockApiPlugin()],
  // @white55/a2ui-ui 把 react 声明为 peer，而本包的 react 在 workspace 里可能被提升，
  // 显式 dedupe 让 Rollup 始终解析到同一份，避免 react/jsx-runtime 解析失败。
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  build: {
    outDir: '../../dist-vite/a2ui',
    emptyOutDir: true,
  },
})
