import { createModuleRules } from './loaders.mjs'

export function createWebpackDevelopmentConfig() {
  return {
    // 开发环境：快速 Source Map、HMR 和开发服务器。
    mode: 'development',
    devtool: 'eval-cheap-module-source-map',
    module: {
      rules: createModuleRules({
        isProduction: false,
        cssLoader: 'style-loader',
        sassLoader: 'sass-loader',
      }),
    },
    devServer: {
      host: '127.0.0.1',
      port: 4174,
      strictPort: true,
      hot: true,
      open: true,
      historyApiFallback: true,
      compress: true,
      client: { logging: 'info', overlay: true },
    },
    optimization: { runtimeChunk: 'single', splitChunks: { chunks: 'all' } },
  }
}
