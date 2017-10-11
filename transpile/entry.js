const _ = require('lodash');
const Path = require('path');
const Glob = require('glob');
const Webpack = require('webpack');
const HotClient = Path.join(__dirname, '../assist/hotClient.js');

module.exports = function (config, isDevelopment) {
  const Entry = {};
  const Plugins = [];

  const CONFIG_JS = config.compile.js;
  // js源文件目录绝对路径
  const SourcePath = Path.join(process.cwd(), config.compile.basic.source, CONFIG_JS.source);
  // js源文件后缀类型
  const ExtType = CONFIG_JS.ext || 'js';
  // js入口文件的前缀，默认为main.*.[ext]
  const MainFilePrefix = CONFIG_JS.mainFilePrefix || 'main';

  // 如果手动配置了入口文件，则只针对已配置的文件进行构建
  // 如果没有详细配置入口文件，则默认遍历指定js文件目录和子目录中所有以main.*.js命名的文件
  if (CONFIG_JS.files && _.isPlainObject(CONFIG_JS.files.main) && !_.isEmpty(CONFIG_JS.files.main)) {
    for (const Filename in CONFIG_JS.files.main) {
      // 开发环境加入livereload辅助模块
      Entry[Filename] = isDevelopment ? [
        HotClient,
        Path.posix.join(SourcePath, CONFIG_JS.files.main[Filename])
      ] : Path.posix.join(SourcePath, CONFIG_JS.files.main[Filename]);
    }
  } else {
    // 遍历目录及子目录，获取js入口文件的绝对路径
    const Entries = Glob.sync(`${SourcePath}/**/${MainFilePrefix}.*.${ExtType}`);
    Entries.forEach(file => {
      Entry[Path.basename(file, `.${ExtType}`)] = isDevelopment ? [HotClient, file] : file;
    });
  }

  const CommonFileName = `${CONFIG_JS.output}/common.${config.compile.basic.appname}`;

  // 如果配置了common模块，则将common模块编译为独立的js文件
  if (CONFIG_JS.files && _.isArray(CONFIG_JS.files.common) && CONFIG_JS.files.common.length>0) {
    Entry['common'] = CONFIG_JS.files.common;
    Plugins.push(new Webpack.optimize.CommonsChunkPlugin({
      name: 'common',
      filename: !isDevelopment && CONFIG_JS.useHash ? `${CommonFileName}.[chunkhash:8].js` : `${CommonFileName}.js`
    }));
  } else if (CONFIG_JS.splitCommonModule) {
    // 如果没有明确配置公共模块，同时有一个以上entry，这种情况下仍然需要生成common模块
    // 此时的common模块没有任何逻辑相关代码，只包含webpack runtime
    // @see http://webpack.github.io/docs/list-of-plugins.html#commonschunkplugin
    Plugins.push(new Webpack.optimize.CommonsChunkPlugin({
      name: 'common',
      filename: `${CommonFileName}.js`,
      // @important chunks字段必填,否则会将style文件打包在一起
      chunks: []
    }));
  }
  return {
    entry: Entry,
    plugins: Plugins
  };
};