import { mergeWebpackConfig } from './build/webpack/merge.mjs'
import { createWebpackCommonConfig } from './build/webpack/common.mjs'
import { createWebpackDevelopmentConfig } from './build/webpack/development.mjs'
import { createWebpackProductionConfig } from './build/webpack/production.mjs'

const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('production')
const isAnalyze = process.env.ANALYZE === 'true'

// 配置入口只负责选择环境并合并 common/dev/prod，具体能力分散在各模块。
export default mergeWebpackConfig(
  createWebpackCommonConfig(),
  isProduction ? createWebpackProductionConfig(isAnalyze) : createWebpackDevelopmentConfig(),
)
