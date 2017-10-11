const Path = require('path');
const Glob = require('glob');
const Webpack = require('webpack');
const WebpackMerge = require('webpack-merge');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TranspileMPForJS = require('./mp/javascript.js');
const TranspileMPForHTML = require('./mp/html.js');
const TranspileMPForStyle = require('./mp/style.js');
const TranspileMPForImage = require('./mp/image.js');

/**
 * @private
 * @desc 合并子模块配置项
 * @param {Array} list 各子模块配置项集合
 * @return {Object}
 */
function Merge(list) {
  // 依赖的第三方模块
  let dependencies = [];
  
  let webpackConfList = [];

  list.forEach(options => {
    webpackConfList.push(options.webpackConf);
    // concat Dependencies
    dependencies = dependencies.concat(options.dependencies);
  });

  return {
    dependencies: [...new Set(dependencies)],
    webpackConf: WebpackMerge.smart(webpackConfList)
  }
}

module.exports = function (config, isDevelopment) {
  const CONFIG_COMPILE = config.compile;

  // webpack module
  const Modules = {
    rules: [],
    noParse: []
  };
  // webpack plugins
  const Plugins = [];
  // 依赖的第三方模块
  const Dependencies = [];

  if (isDevelopment) {
    // dev环境下额外使用dev server需要的一组插件
    Plugins.push(new Webpack.HotModuleReplacementPlugin());
  } else if (CONFIG_COMPILE.basic.deployLibs && CONFIG_COMPILE.basic.libs) {
    // 将第三方库文件复制到编译输出目录并且一同部署
    // @important 不建议开启此配置
    Plugins.push(new CopyWebpackPlugin([{
      from: Path.join(process.cwd(), CONFIG_COMPILE.basic.libs),
      to: Path.join(process.cwd(), CONFIG_COMPILE.basic.output, CONFIG_COMPILE.basic.libs),
      ignore: ['.*']
    }]));
  }

  return Merge([
    TranspileMPForJS(CONFIG_COMPILE, isDevelopment),
    TranspileMPForImage(CONFIG_COMPILE, isDevelopment),
    TranspileMPForStyle(CONFIG_COMPILE, isDevelopment,config.deploy),
    TranspileMPForHTML(CONFIG_COMPILE, isDevelopment),
    {
      webpackConf: {
        plugins: Plugins
      },
      dependencies: Dependencies
    }
  ]);
  // 插件比config API有更高优先级
  // 使用插件进行的配置将覆盖patternt同名配置项
  // if (config.pluginPatterns && config.pluginPatterns.length !== 0) {
  //   config.pluginPatterns.forEach(function (pattern) {
  //     config[pattern] = null;
  //   });
  // }
};