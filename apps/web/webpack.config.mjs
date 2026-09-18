import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import { VueLoaderPlugin } from 'vue-loader'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin'
import TerserPlugin from 'terser-webpack-plugin'
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'
import { createModuleRules } from './build/webpack/loaders.mjs'

const root = fileURLToPath(new URL('.', import.meta.url))
const require = createRequire(import.meta.url)
const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('production')
const isAnalyze = process.env.ANALYZE === 'true'

export default {
  mode: isProduction ? 'production' : 'development',
  entry: path.resolve(root, 'src/main.ts'),
  output: {
    path: path.resolve(root, '../../dist-webpack'),
    filename: 'assets/[name].[contenthash:8].js',
    clean: true,
    publicPath: 'auto',
  },
  resolve: {
    extensions: ['.ts', '.js', '.vue'],
    alias: {
      '@': path.resolve(root, 'src'),
      vue$: require.resolve('vue/dist/vue.runtime.esm-bundler.js'),
    },
  },
  module: {
    rules: createModuleRules({
      isProduction,
      cssLoader: MiniCssExtractPlugin.loader,
      sassLoader: 'sass-loader',
    }),
  },
  plugins: [
    new VueLoaderPlugin(),
    new HtmlWebpackPlugin({ template: path.resolve(root, 'index.html') }),
    ...(isProduction
      ? [new MiniCssExtractPlugin({ filename: 'assets/[name].[contenthash:8].css' })]
      : []),
    ...(isAnalyze
      ? [
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
            reportFilename: 'webpack-report.html',
          }),
        ]
      : []),
  ],
  devtool: isProduction ? 'source-map' : 'eval-cheap-module-source-map',
  cache: { type: 'filesystem', buildDependencies: { config: [import.meta.url] } },
  devServer: { host: '127.0.0.1', port: 4174, hot: true, open: true, historyApiFallback: true },
  optimization: {
    splitChunks: { chunks: 'all' },
    runtimeChunk: 'single',
    minimizer: [
      new TerserPlugin({
        parallel: true,
        extractComments: false,
        terserOptions: { compress: { drop_console: true, drop_debugger: true } },
      }),
      new CssMinimizerPlugin({ parallel: true }),
    ],
  },
}
