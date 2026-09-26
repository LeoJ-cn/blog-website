import type { UserConfig } from 'vite'
export const createViteDevelopmentConfig = (): UserConfig => ({
  // 开发环境保留 Source Map，关闭压缩和 Manifest 生成。
  mode: 'development',
  esbuild: { legalComments: 'eof', sourcemap: true },
  build: { sourcemap: true, minify: false, cssMinify: false, manifest: false },
  // 保留完整终端日志，便于定位开发服务器问题。
  clearScreen: false,
  logLevel: 'info',
})
