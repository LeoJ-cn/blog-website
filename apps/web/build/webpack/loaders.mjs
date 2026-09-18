export function createBabelLoader() {
  return {
    loader: 'babel-loader',
    options: {
      presets: [
        ['@babel/preset-env', { targets: 'defaults, not IE 11' }],
        ['@babel/preset-typescript', { allExtensions: true, isTSX: false }],
      ],
    },
  }
}

export function createModuleRules({ isProduction, cssLoader, sassLoader }) {
  return [
    { test: /\.vue$/, loader: 'vue-loader', options: { babelParserPlugins: ['typescript'] } },
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
