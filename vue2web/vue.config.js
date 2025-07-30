const { defineConfig } = require("@vue/cli-service");
module.exports = defineConfig({
  publicPath: ".",
  transpileDependencies: true,
  configureWebpack: {
    devtool: "eval-cheap-module-source-map",
    devServer: {
      open: true,
      port: 9988,
    },
  },
});
