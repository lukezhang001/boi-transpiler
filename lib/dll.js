const Fs             = require('fs');
const _              = require('lodash');
const Path           = require('path');
const Webpack        = require('webpack');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');

module.exports = function (config, isDevelopment, force = false, alias = {}) {
  const CONFIG_JS = config.compile.js;
  const IsNeedBuild = CONFIG_JS.splitDllModule && CONFIG_JS.files && _.isArray(CONFIG_JS.files.common) && CONFIG_JS.files.common.length > 0;

  if (isDevelopment || !IsNeedBuild) {
    return {
      hasDll: false,
      config: null
    };
  }

  // generate dll.js if set force as true or dll.js doesn't exists
  if (force || !Fs.existsSync(Path.join(process.cwd(), `./dll/${config.compile.basic.appname}.dll.js`))) {
    const Modules = _.isEmpty(alias) ? CONFIG_JS.files.common : CONFIG_JS.files.common.map(m => {
      return alias[m] || m;
    });

    return {
      hasDll: true,
      config: {
        entry: {
          [config.compile.basic.appname]: Modules
        },
        output: {
          path: Path.join(process.cwd(), './dll'),
          filename: '[name].dll.js',
          library: '[name]'
        },
        plugins: [
          new Webpack.DllPlugin({
            path: Path.join(process.cwd(), './dll/manifest.json'),
            name: '[name]',
            context: process.cwd()
          }),
          new UglifyJSPlugin({
            compress: {
              warnings: false
            },
            sourceMap: false,
            mangle: {
              except: ['$', 'exports', 'require']
            }
          }),
          new Webpack.DefinePlugin({
            'process.env': {
              'NODE_ENV': '"production"'
            }
          })
        ]
      }
    };
  } else {
    return {
      hasDll: true,
      config: null
    };
  }
};