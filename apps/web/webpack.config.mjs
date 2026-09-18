import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import { VueLoaderPlugin } from 'vue-loader'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin'
import TerserPlugin from 'terser-webpack-plugin'
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'

const root = fileURLToPath(new URL('.', import.meta.url))
const require = createRequire(import.meta.url)
const isProduction = process.env.NODE_ENV === 'production' || process.argv.includes('production')
const isAnalyze = process.env.ANALYZE === 'true'
const babelLoader = {
  loader: 'babel-loader',
  options: {
    presets: [
      ['@babel/preset-env', { targets: 'defaults, not IE 11' }],
      ['@babel/preset-typescript', { allExtensions: true, isTSX: false }],
    ],
  },
}

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
    alias: { '@': path.resolve(root, 'src'), vue$: require.resolve('vue/dist/vue.runtime.esm-bundler.js') },
  },
  module: {
    rules: [
      { test: /\.vue$/, loader: 'vue-loader', options: { babelParserPlugins: ['typescript'] } },
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: ['thread-loader', babelLoader],
      },
      { test: /\.s[ac]ss$/i, use: [isProduction ? MiniCssExtractPlugin.loader : 'style-loader', 'css-loader', 'postcss-loader', 'sass-loader'] },
      { test: /\.css$/i, use: [isProduction ? MiniCssExtractPlugin.loader : 'style-loader', 'css-loader', 'postcss-loader'] },
      { test: /\.(png|jpe?g|gif|svg|webp)$/i, type: 'asset' },
    ],
  },
  plugins: [
    new VueLoaderPlugin(),
    new HtmlWebpackPlugin({ template: path.resolve(root, 'index.html') }),
    ...(isProduction ? [new MiniCssExtractPlugin({ filename: 'assets/[name].[contenthash:8].css' })] : []),
    ...(isAnalyze ? [new BundleAnalyzerPlugin({ analyzerMode: 'static', openAnalyzer: false, reportFilename: 'webpack-report.html' })] : []),
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
