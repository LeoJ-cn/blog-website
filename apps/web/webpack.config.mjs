import path from 'node:path'
import { fileURLToPath } from 'node:url'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import { VueLoaderPlugin } from 'vue-loader'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'

const root = fileURLToPath(new URL('.', import.meta.url))
const isProduction = process.env.NODE_ENV === 'production'

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
    alias: { '@': path.resolve(root, 'src') },
  },
  module: {
    rules: [
      { test: /\.vue$/, loader: 'vue-loader' },
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: { loader: 'babel-loader', options: { parserOpts: { plugins: ['typescript'] } } },
      },
      {
        resourceQuery: /lang=ts/,
        use: { loader: 'babel-loader', options: { parserOpts: { plugins: ['typescript'] } } },
      },
      { test: /\.s[ac]ss$/i, use: [isProduction ? MiniCssExtractPlugin.loader : 'style-loader', 'css-loader', 'sass-loader'] },
      { test: /\.css$/i, use: [isProduction ? MiniCssExtractPlugin.loader : 'style-loader', 'css-loader'] },
      { test: /\.(png|jpe?g|gif|svg|webp)$/i, type: 'asset' },
    ],
  },
  plugins: [
    new VueLoaderPlugin(),
    new HtmlWebpackPlugin({ template: path.resolve(root, 'index.html') }),
    ...(isProduction ? [new MiniCssExtractPlugin({ filename: 'assets/[name].[contenthash:8].css' })] : []),
  ],
  devtool: isProduction ? 'source-map' : 'eval-cheap-module-source-map',
  devServer: { host: '127.0.0.1', port: 4174, hot: true, open: true, historyApiFallback: true },
  optimization: { splitChunks: { chunks: 'all' }, runtimeChunk: 'single' },
}
