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
  chainWebpack: (config) => {
    config.plugin("html").tap((args) => {
      var Dates = new Date();
      var Y = Dates.getFullYear();
      var M = Dates.getMonth() + 1;
      var D = Dates.getDate();
      var times = Y + (M < 10 ? "-0" : "-") + M + (D < 10 ? "-0" : "-") + D;
      args[0].title = `LastUpdated ${times}`;
      return args;
    });
  },
});
