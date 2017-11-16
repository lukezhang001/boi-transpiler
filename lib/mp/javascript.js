const _              = require('lodash');
const Path           = require('path');
const Shell          = require('shelljs');
const Webpack        = require('webpack');
const WebpackMerge   = require('webpack-merge');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

/**
 * @module boi/transpiler/moduleAndPlugins/javascript
 * @param  {Object}  config        boi configuration
 * @param  {boolean} isDevelopment whether or not on development environment
 * @return {Object}  webpack configuration&denpencies
 */
module.exports = function (config, isDevelopment, installPluginsAndDeps) {
  const CONFIG_JS = config.js;

  const Module = {
    rules: [],
    noParse: [/jquery|zepto|lodash/]
  };

  const Plugins = [];

  const DefineMap = isDevelopment ? {} : {
    'process.env': {
      'NODE_ENV': '"production"'
    }
  };

  const EXTTYPE = CONFIG_JS.ext || 'js';
  const REG_EXTTYPE = _.isArray(EXTTYPE) ? new RegExp(`\\.(${EXTTYPE.join('|')})$`) : new RegExp(`\\.${EXTTYPE}$`);

  if (!isDevelopment&&CONFIG_JS.lint) {
    Module.rules.push({
      test: REG_EXTTYPE,
      include: [
        Path.posix.join(process.cwd(), config.basic.source, CONFIG_JS.source)
      ],
      enforce: 'pre',
      use: [{
        loader: 'eslint-loader',
        options: {
          emitError: true,
          emitWarning: true,
          failOnError: true,
          formatter: require('eslint-friendly-formatter')
        }
      }]
    });
  }

  Module.rules.push({
    test: REG_EXTTYPE,
    include: [
      Path.posix.join(process.cwd(), config.basic.source, CONFIG_JS.source)
    ],
    use: [{
      loader: 'babel-loader'
    }]
  });

  if (installPluginsAndDeps) {
    // copy .eslintrc to project directory
    Shell.exec(`cp ${Path.join(__dirname,'../../templates/eslintrc.ejs')} ${Path.join(process.cwd(),'.eslintrc')}`, {
      slient: true
    });
    // copy .babelrc to project directory
    Shell.exec(`cp ${Path.join(__dirname,'../../templates/babelrc.ejs')} ${Path.join(process.cwd(),'.babelrc')}`, {
      slient: true
    });
  }

  if (CONFIG_JS.define && _.isPlainObject(CONFIG_JS.define)) {
    for (const Key in CONFIG_JS.define) {
      DefineMap[Key] = JSON.stringify(CONFIG_JS.define[Key]);
    }
  }
  Plugins.push(new Webpack.DefinePlugin(DefineMap));

  // uglify is available on non development environments
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
    }, CONFIG_JS.webpackConfig || {}),
    dependencies: [
      'eslint',
      'eslint-loader',
      'eslint-plugin-html',
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