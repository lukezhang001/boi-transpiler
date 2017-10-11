const _ = require('lodash');
const Path = require('path');
const WebpackMerge = require('webpack-merge');
const TranspileEntry = require('./transpile/entry.js');
const TranspileOutput = require('./transpile/output.js');
const TranspileModuleAndPlugin = require('./transpile/moduleAndPlugins.js');

/**
 * @module 将boi配置解析为webpack配置
 * @param {Object} options boi配置
 * @param {Boolean} isDevelopment 是否为开发环境
 * @return {Object}
 */
module.exports = function(options,isDevelopment){
  const ModuleAndPlugins = TranspileModuleAndPlugin(options,isDevelopment);
  const EntryAndPlugins = TranspileEntry(options,isDevelopment);
  const Output = TranspileOutput(options,isDevelopment);

  // npm global模块的路径
  // 默认情况下，使用nvm管理node的环境下，global模块不能被resolve解析，@seehttps://github.com/creationix/nvm/pull/97
  /* eslint-disable */
  const NpmRootPath = _.trim(exec('npm root -g', {
    silent: true
  }).stdout);
  /* eslint-enable */

  // 全局安装boi的node_modules目录
  const BoiModulesPath = Path.posix.join(NpmRootPath, 'boi/node_modules');

  return WebpackMerge.smart({
      entry: EntryAndPlugins.entry,
      output: Output,
      profile: true,
      plugins: EntryAndPlugins.plugins,
      resolveLoader: {
        modules: [
          // 构建工具自身的模块目录
          Path.posix.join(__dirname, '../../../node_modules'),
          // 项目自身的模块目录
          Path.posix.join(process.cwd(), 'node_modules'),
          NpmRootPath,
          BoiModulesPath
        ]
      },
      resolve: {
        modules: [
          Path.posix.join(__dirname, '../../../node_modules'),
          Path.posix.join(process.cwd(), 'node_modules'),
          NpmRootPath,
          BoiModulesPath
        ],
        alias: {
          '@': Path.posix.join(process.cwd(),options.compile.basic.source)
        }
      },
      // 开发环境使用eval-source-map提高重构建速度
      devtool: isDevelopment ? 'eval-source-map' : false,
      // 性能指标
      performance: isDevelopment ? {} : Object.assign({
        // 超标文件提示错误
        hints: 'warning',
        // 入口文件最大不超过150kb
        maxEntrypointSize: 150000,
        // 所有类型文件最大不超过200kb
        maxAssetSize: 200000
      },options.compile.basic.limit)
    },ModuleAndPlugins.webpackConf,options.pluginConfig||{})
} 