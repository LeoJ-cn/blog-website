import { defineConfig, loadEnv, mergeConfig } from 'vite'
import { createViteCommonConfig } from './build/vite/common'
import { createViteDevelopmentConfig } from './build/vite/development'
import { createViteProductionConfig } from './build/vite/production'

export default defineConfig(({ mode }) => {
  // 仅读取 VITE_ 前缀变量，避免服务端环境变量进入浏览器。
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  // 先合并通用配置，再叠加开发或生产配置。
  const environment =
    mode === 'production'
      ? createViteProductionConfig(process.env.ANALYZE === 'true')
      : createViteDevelopmentConfig()
  return mergeConfig(mergeConfig(createViteCommonConfig(), environment), {
    base: env.VITE_BASE_PATH || './',
  })
})
