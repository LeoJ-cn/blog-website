import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import legacy from '@vitejs/plugin-legacy'
import { defineConfig, loadEnv } from 'vite'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  return {
    base: env.VITE_BASE_PATH || '/',
    plugins: [
      vue(),
      ...(mode === 'production' ? [legacy({ targets: ['defaults', 'not IE 11'], modernPolyfills: true })] : []),
      ...(process.env.ANALYZE === 'true'
        ? [visualizer({ filename: '../../dist-vite/vite-report.html', open: false, gzipSize: true, brotliSize: true })]
        : []),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    css: {
      devSourcemap: mode !== 'production',
    },
    build: {
      outDir: '../../dist-vite',
      emptyOutDir: true,
      sourcemap: mode === 'staging',
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks: {
            framework: ['vue', 'vue-router', 'pinia'],
          },
        },
      },
    },
    server: {
      host: '127.0.0.1',
      open: true,
      port: 4173,
      strictPort: true,
    },
  }
})
