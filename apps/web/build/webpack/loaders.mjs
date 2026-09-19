export function createBabelLoader() {
  // Babel 负责现代 JavaScript 和 TypeScript 语法转换。
  return {
    loader: 'babel-loader',
    options: {
      presets: [
        ['@babel/preset-env', { targets: 'defaults, not IE 11' }],
        ['@babel/preset-typescript', { allExtensions: true, isTSX: true }],
      ],
      plugins: ['@vue/babel-plugin-jsx'],
    },
  }
}

export function createModuleRules({ isProduction, cssLoader, sassLoader }) {
  // Loader 顺序遵循 Webpack 从右到左：预处理器 -> PostCSS -> CSS -> 注入/提取。
  return [
    { resourceQuery: /raw/, type: 'asset/source' },
    {
      test: /\.vue$/,
      resourceQuery: { not: [/raw/] },
      loader: 'vue-loader',
      options: { babelParserPlugins: ['typescript'] },
    },
    {
      test: /\.tsx?$/,
      exclude: /node_modules/,
      use: ['thread-loader', createBabelLoader()],
    },
    {
      test: /\.s[ac]ss$/i,
      use: [isProduction ? cssLoader : 'style-loader', 'css-loader', 'postcss-loader', sassLoader],
    },
    {
      test: /\.css$/i,
      use: [isProduction ? cssLoader : 'style-loader', 'css-loader', 'postcss-loader'],
    },
    { test: /\.(png|jpe?g|gif|svg|webp)$/i, type: 'asset' },
  ]
}
