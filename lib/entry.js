const _         = require('lodash');
const Path      = require('path');
const Glob      = require('glob');
const Webpack   = require('webpack');
const HotClient = Path.join(__dirname, '../assist/hotClient.js');

/**
 * @module boi/transpiler/entry
 * @param  {Object}  config        boi configuration
 * @param  {boolean} isDevelopment whether or not on development environment
 * @return {Object}  entry&plugins as part of webpack configuration
 */
module.exports = function (config, isDevelopment) {
  const Entry = {};
  const Plugins = [];
  const CONFIG_JS = config.compile.js;
  // source js files
  const SourcePath = Path.join(process.cwd(), config.compile.basic.source, CONFIG_JS.source);
  // ext type of source js files
  const ExtType = CONFIG_JS.ext || 'js';
  // prefix of entry js files
  const MainFilePrefix = CONFIG_JS.mainFilePrefix || 'main';

  /**
   * if entry files are specified, then only the <main> files would be compiled
   * otherwise,all files that meet the requirement of naming notations(main.<name>.js by default) would be compiled
   */
  if (CONFIG_JS.files && _.isPlainObject(CONFIG_JS.files.main) && !_.isEmpty(CONFIG_JS.files.main)) {
    for (const Filename in CONFIG_JS.files.main) {
      // livereload utils would be required on development environment
      Entry[Filename] = isDevelopment ? [
        HotClient,
        Path.posix.join(SourcePath, CONFIG_JS.files.main[Filename])
      ] : Path.posix.join(SourcePath, CONFIG_JS.files.main[Filename]);
    }
  } else {
    const Entries = Glob.sync(`${SourcePath}/**/${MainFilePrefix}.*.${ExtType}`);
    Entries.forEach(file => {
      Entry[Path.basename(file, `.${ExtType}`)] = isDevelopment ? [HotClient, file] : file;
    });
  }

  const CommonFileName = `${CONFIG_JS.output}/common.${config.compile.basic.appname}`;

  /**
   * if common modules are specified, then the specified modules would be merged to a single js file
   * otherwise,webpack runtime&manifest would be merged to a single js file if splitCommonModule is set as true
   * @see http://webpack.github.io/docs/list-of-plugins.html#commonschunkplugin
   */
  if (CONFIG_JS.splitCommonModule && CONFIG_JS.files && _.isArray(CONFIG_JS.files.common) && CONFIG_JS.files.common.length > 0 && (!CONFIG_JS.splitDllModule || isDevelopment)) {
    Entry['common'] = CONFIG_JS.files.common;
    Plugins.push(new Webpack.optimize.CommonsChunkPlugin({
      name: 'common',
      filename: !isDevelopment && CONFIG_JS.useHash ? `${CommonFileName}.[chunkhash:8].js` : `${CommonFileName}.js`
    }));
  } else if (CONFIG_JS.splitCommonModule) {
    Plugins.push(new Webpack.optimize.CommonsChunkPlugin({
      name: 'common',
      filename: !isDevelopment && CONFIG_JS.useHash ? `${CommonFileName}.[chunkhash:8].js` : `${CommonFileName}.js`
    }));
  }

  return {
    entry: Entry,
    plugins: Plugins
  };
};