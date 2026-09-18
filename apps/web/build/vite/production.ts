import legacy from '@vitejs/plugin-legacy'
import { visualizer } from 'rollup-plugin-visualizer'
import type { UserConfig } from 'vite'

export const createViteProductionConfig = (analyze: boolean): UserConfig => ({
  // 生产环境追加旧浏览器兼容产物。
  plugins: [legacy({ targets: ['defaults', 'not IE 11'], modernPolyfills: true })],
  css: { devSourcemap: false },
  mode: 'production',
  // 生产构建移除调试器和许可证注释，减小产物体积。
  esbuild: { legalComments: 'none', drop: ['debugger'] },
  build: { sourcemap: false, minify: 'esbuild', cssMinify: 'esbuild', reportCompressedSize: true, emptyOutDir: true, rollupOptions: { plugins: analyze ? [visualizer({ filename: '../../dist-vite/vite-report.html', open: false, gzipSize: true, brotliSize: true })] : [] } },
  // CI 中保留构建日志。
  clearScreen: false,
  logLevel: 'info',
})
