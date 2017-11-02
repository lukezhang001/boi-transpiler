const _ = require('lodash');
const Path = require('path');
const Shell = require('shelljs');
const WebpackMerge = require('webpack-merge');
const TranspileEntry = require('./lib/entry.js');
const TranspileOutput = require('./lib/output.js');
const TranspileModuleAndPlugin = require('./lib/moduleAndPlugins.js');
const TranspileBoiPlugins = require('./lib/boiPlugins.js');

/**
 * @module boi/transpiler
 * @param {Object} options boi configuration
 * @param {Boolean} isDevelopment indicate whether is development environment
 * @return {Object} webpack configuration and dependencies
 */
module.exports = function(options,isDevelopment){
  const ModuleAndPlugins = TranspileModuleAndPlugin(options,isDevelopment);
  const EntryAndPlugins = TranspileEntry(options,isDevelopment);
  const Output = TranspileOutput(options,isDevelopment);
  const WebpackConfOfBoiPlugins = TranspileBoiPlugins(options.plugins);
  /**
   * global node_modules path,
   * By default global modules can not be resolved on nvm environment
   * @constant 
   * @see https://github.com/creationix/nvm/pull/97
   */
  const NpmRootPath = _.trim(Shell.exec('npm root -g', { silent: true }).stdout);

  // 全局安装boi的node_modules目录
  const BoiModulesPath = Path.posix.join(NpmRootPath, 'boi/node_modules');

  return {
    webpackConf: WebpackMerge.smart({
      entry: EntryAndPlugins.entry,
      output: Output,
      profile: true,
      plugins: EntryAndPlugins.plugins,
      resolveLoader: {
        modules: [
          // 构建工具自身的模块目录
          Path.posix.join(__dirname, './node_modules'),
          // 项目自身的模块目录
          Path.posix.join(process.cwd(), 'node_modules'),
          NpmRootPath,
          BoiModulesPath
        ]
      },
      resolve: {
        modules: [
          Path.posix.join(__dirname, './node_modules'),
          Path.posix.join(process.cwd(), 'node_modules'),
          NpmRootPath,
          BoiModulesPath
        ],
        // disable symlinks
        symlinks: false,
        // '@' indicate the root path of source files
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
    },ModuleAndPlugins.webpackConf,...WebpackConfOfBoiPlugins.webpackConf),
    dependencies: ModuleAndPlugins.dependencies.concat([...WebpackConfOfBoiPlugins.dependencies])
  }
} 