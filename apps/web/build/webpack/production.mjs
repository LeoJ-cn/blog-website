import CssMinimizerPlugin from 'css-minimizer-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import TerserPlugin from 'terser-webpack-plugin'
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'
import { createModuleRules } from './loaders.mjs'

export function createWebpackProductionConfig(analyze = false) {
  return {
    // 生产环境：提取 CSS、压缩 JS/CSS、分包和可选分析报告。
    mode: 'production',
    devtool: 'source-map',
    module: {
      rules: createModuleRules({
        isProduction: true,
        cssLoader: MiniCssExtractPlugin.loader,
        sassLoader: 'sass-loader',
      }),
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: 'assets/[name].[contenthash:8].css',
        chunkFilename: 'assets/[name].[contenthash:8].chunk.css',
        attributes: { crossorigin: 'anonymous' },
      }),
      ...(analyze
        ? [
            new BundleAnalyzerPlugin({
              analyzerMode: 'static',
              openAnalyzer: false,
              reportFilename: 'webpack-report.html',
              generateStatsFile: true,
            }),
          ]
        : []),
    ],
    optimization: {
      minimize: true,
      runtimeChunk: 'single',
      splitChunks: {
        chunks: 'all',
        maxInitialRequests: 30,
        maxAsyncRequests: 30,
        cacheGroups: {
          defaultVendors: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: -10,
            reuseExistingChunk: true,
          },
          default: { minChunks: 2, priority: -20, reuseExistingChunk: true },
        },
      },
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
}
