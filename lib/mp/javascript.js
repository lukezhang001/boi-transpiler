'use strict';

require('shelljs/global');
const _ = require('lodash');
const Path = require('path');
const Webpack = require('webpack');
const WebpackMerge = require('webpack-merge');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

module.exports = function (config, isDevelopment) {
  const CONFIG_JS = config.js;

  const Module = {
    rules: [],
    noParse: [/jquery|zepto|lodash/]
  };

  const Plugins = [];

  const DefineMap = {};

  // 文件后缀
  const EXTTYPE = CONFIG_JS.ext || 'js';
  // 文件后缀正则
  const REG_EXTTYPE = _.isArray(EXTTYPE) ? new RegExp(`\\.(${EXTTYPE.join('|')})$`) : new RegExp(`\\.${EXTTYPE}$`);

  Module.rules.push({
    test: REG_EXTTYPE,
    include: [
      // 只编译源文件
      Path.posix.join(process.cwd(), CONFIG_JS.source)
    ],
    use: [{
      loader: 'babel-loader'
    }]
  });

  /* eslint-disable */
  exec(`cp ${Path.join(__dirname,'../../templates/babelrc.ejs')} ${Path.join(process.cwd(),'.babelrc')}`, {
    slient: true
  });
  /* eslint-enable */

  // define的value需要stringify后才可被正确应用
  if (CONFIG_JS.define && _.isPlainObject(CONFIG_JS.define)) {
    for (const Key in CONFIG_JS.define) {
      DefineMap[Key] = JSON.stringify(CONFIG_JS.define[Key]);
    }
  }
  Plugins.push(new Webpack.DefinePlugin(DefineMap));

  // 非开发环境下uglify配置可用
  if (CONFIG_JS.uglify && !isDevelopment) {
    Plugins.push(new UglifyJSPlugin({
      compress: {
        warnings: false
      },
      sourceMap: false,
      mangle: {
        except: ['$', 'exports', 'require']
      }
    }));
  }

  return {
    webpackConf: WebpackMerge.smart({
      module: Module,
      plugins: Plugins
    },CONFIG_JS.webpackConfig||{}),
    dependencies: [
      'babel-loader',
      'babel-core',
      'babel-preset-stage-0',
      'babel-preset-env',
      'babel-plugin-transform-object-assign',
      'babel-plugin-syntax-object-rest-spread',
      'babel-plugin-transform-runtime'
    ]
  };
};