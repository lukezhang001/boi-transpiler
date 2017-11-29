const _                        = require('lodash');
const Path                     = require('path');
const Shell                    = require('shelljs');
const WebpackMerge             = require('webpack-merge');
const DllGenerator             = require('./lib/dll.js');
const TranspileEntry           = require('./lib/entry.js');
const TranspileOutput          = require('./lib/output.js');
const TranspileBoiPlugins      = require('./lib/pluginsOfBoi.js');
const TranspileModuleAndPlugin = require('./lib/moduleAndPlugins.js');

/**
 * @module boi/transpiler
 * @param  {Object}  options boi configuration
 * @param  {boolean} installPluginsAndDeps whether or not install boi plugins and dependencies
 * @return {Object}  webpack configuration and dependencies
 */
module.exports = function (options, installPluginsAndDeps = false) {
  const IsDevelopment = process.env.BOI_ENV === 'dev' ? true : false;

  const EntryAndPlugins = TranspileEntry(options, IsDevelopment);
  const Output = TranspileOutput(options, IsDevelopment);
  const WebpackConfOfBoiPlugins = TranspileBoiPlugins(options.plugins, installPluginsAndDeps);

  const {
    hasDll: HasDll,
    config: WebpackConfOfDll
  } = DllGenerator(options, IsDevelopment, installPluginsAndDeps, WebpackConfOfBoiPlugins.alias);

  const ModuleAndPlugins = TranspileModuleAndPlugin(options, IsDevelopment, installPluginsAndDeps, HasDll);

  /**
   * By default global modules can not be resolved on nvm environment
   * @constant NpmRootPath global node_modules path
   * @see https://github.com/creationix/nvm/pull/97
   */
  const NpmRootPath = _.trim(Shell.exec('npm root -g', {
    silent: true
  }).stdout);

  // node_modules path under global boi module
  // const BoiModulesPath = Path.posix.join(NpmRootPath, 'boi/node_modules');
  let BoiModulesPath = null;
  try {
    require.resolve(Path.join(NpmRootPath, 'boi/node_modules'));
    BoiModulesPath =Path.join(NpmRootPath, 'boi/node_modules');
  }catch(e){
  }
  if(!BoiModulesPath){
    BoiModulesPath = Path.join(__dirname,'../../node_modules');
  }
  return {
    webpackConfOfDll: WebpackConfOfDll,
    webpackConf: WebpackMerge.smart({
      entry: EntryAndPlugins.entry,
      output: Output,
      profile: true,
      plugins: EntryAndPlugins.plugins,
      resolveLoader: {
        modules: [
          // node_modules path of the util
          Path.posix.join(__dirname, './node_modules'),
          // node_modules path of specific project
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
        // '@' indicate the root path of source directory
        alias: {
          '@': Path.posix.join(process.cwd(), options.compile.basic.source)
        }
      },
      // enable eval-source-map on devepelopment environment
      devtool: IsDevelopment ? 'eval-source-map' : false,
      // 性能指标
      performance: IsDevelopment ? {} : Object.assign({
        // 超标文件提示错误
        hints: 'warning',
        // the maxsize of each chunks shall not exceed 150kb
        maxEntrypointSize: 150000,
        // the maxsize of all kind of resource shall not exceed 200kb
        maxAssetSize: 200000
      }, options.compile.basic.limit)
    }, ModuleAndPlugins.webpackConf, ...WebpackConfOfBoiPlugins.webpackConf),
    dependencies: ModuleAndPlugins.dependencies.concat([...WebpackConfOfBoiPlugins.dependencies])
  };
};