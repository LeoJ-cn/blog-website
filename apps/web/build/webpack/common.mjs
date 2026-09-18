import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import { VueLoaderPlugin } from 'vue-loader'
import { createModuleRules } from './loaders.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const require = createRequire(import.meta.url)

export function createWebpackCommonConfig() {
  return {
    // 所有环境共享的上下文、入口和输出目录。
    context: root,
    entry: { main: path.resolve(root, 'src/main.ts') },
    output: {
      path: path.resolve(root, '../../dist-webpack'),
      filename: 'assets/[name].[contenthash:8].js',
      chunkFilename: 'assets/[name].[contenthash:8].chunk.js',
      assetModuleFilename: 'assets/[name].[contenthash:8][ext][query]',
      clean: true,
      publicPath: 'auto',
      crossOriginLoading: 'anonymous',
    },
    // workspace、Vue runtime 和扩展名解析策略。
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.vue', '.json'],
      symlinks: true,
      alias: { '@': path.resolve(root, 'src'), vue$: require.resolve('vue/dist/vue.runtime.esm-bundler.js') },
      modules: ['node_modules'],
    },
    // Loader 规则由开发/生产层覆盖，避免重复注册 CSS loader。
    module: { strictExportPresence: true, rules: createModuleRules({ isProduction: false, cssLoader: 'style-loader', sassLoader: 'sass-loader' }) },
    // Vue、HTML、缓存、日志和性能预算等通用插件/能力。
    plugins: [new VueLoaderPlugin(), new HtmlWebpackPlugin({ template: path.resolve(root, 'index.html'), scriptLoading: 'defer' })],
    cache: { type: 'filesystem', cacheDirectory: path.resolve(root, '../../node_modules/.cache/webpack'), buildDependencies: { config: [import.meta.url] } },
    infrastructureLogging: { level: 'warn' },
    stats: 'errors-warnings',
    performance: { hints: 'warning', maxAssetSize: 512000, maxEntrypointSize: 512000 },
  }
}
