const Path                = require('path');
const Webpack             = require('webpack');
const WebpackMerge        = require('webpack-merge');
const TranspileMPForHTML  = require('./mp/html.js');
const TranspileMPForStyle = require('./mp/style.js');
const TranspileMPForImage = require('./mp/image.js');
const TranspileMPForJS    = require('./mp/javascript.js');
const CopyWebpackPlugin   = require('copy-webpack-plugin');

/**
 * @private 
 * @desc merge webpack configuration&denpencies of children process
 * @param  {Array} list children process content
 * @return {Object} webpack configuration&denpencies
 */
function Merge(list) {
  let dependencies    = [];
  let webpackConfList = [];

  list.forEach(options => {
    webpackConfList.push(options.webpackConf);
    dependencies = dependencies.concat(options.dependencies);
  });

  return {
    // dependencies list should has no duplicate items
    dependencies: [...new Set(dependencies)],
    webpackConf: WebpackMerge.smart(webpackConfList)
  };
}

/**
 * @module boi/transpiler/moduleAndPlugins
 * @param  {Object}  config                boi configuration
 * @param  {boolean} isDevelopment         whether or not on development environment
 * @param  {boolean} installPluginsAndDeps whether or not install boi plugins and dependencies
 * @return {Object}  webpack configuration&denpencies
 */
module.exports = function (config, isDevelopment, installPluginsAndDeps) {
  const CONFIG_COMPILE = config.compile;
  
  const Dependencies = [];
  // webpack plugins
  const Plugins = [
    new Webpack.HashedModuleIdsPlugin(),
    new Webpack.NoEmitOnErrorsPlugin()
  ];

  if (isDevelopment) {
    Plugins.push(new Webpack.HotModuleReplacementPlugin());
    Plugins.push(new Webpack.NamedModulesPlugin());
  } else if (CONFIG_COMPILE.basic.deployLibs && CONFIG_COMPILE.basic.libs) {
    // copy thirdparties to output directory
    Plugins.push(new CopyWebpackPlugin([{
      from: Path.join(process.cwd(), CONFIG_COMPILE.basic.libs),
      to: Path.join(process.cwd(), CONFIG_COMPILE.basic.output, CONFIG_COMPILE.basic.libs),
      ignore: ['.*']
    }]));
  }

  return Merge([
    TranspileMPForJS(CONFIG_COMPILE, isDevelopment, installPluginsAndDeps),
    TranspileMPForImage(CONFIG_COMPILE, isDevelopment),
    TranspileMPForStyle(CONFIG_COMPILE, isDevelopment, config.deploy, installPluginsAndDeps),
    TranspileMPForHTML(CONFIG_COMPILE, isDevelopment),
    {
      webpackConf: {
        plugins: Plugins
      },
      dependencies: Dependencies
    }
  ]);
};