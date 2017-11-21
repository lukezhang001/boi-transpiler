const _ = require('lodash');
const Path = require('path');
const Glob = require('glob');
const WebpackMerge = require('webpack-merge');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackPluginReplaceurl = require('../../../../html-webpack-plugin-replaceurl');
const HtmlWebpackIncludeAssetsPlugin = require('html-webpack-include-assets-plugin');

/**
 * @constant ENGINE_LOADERS_MAP dependencies of each engine
 */
const ENGINE_LOADERS_MAP = {
  html: {
    htmlAssit: false,
    loader: 'html-loader',
    deps: ['html-loader']
  },
  pug: {
    htmlAssit: true,
    loader: 'pug-html-loader',
    options: {
      doctype: 'html'
    },
    renderKey: 'data',
    deps: ['pug', 'html-loader', 'pug-html-loader']
  },
  ejs: {
    htmlAssit: true,
    loader: 'ejs-html-loader',
    options: {},
    renderKey: null,
    deps: ['ejs', 'html-loader', 'ejs-html-loader']
  },
  mustache: {
    htmlAssit: false,
    loader: 'mustache-loader',
    options: {
      tiny: false
    },
    renderKey: 'render',
    deps: ['mustache', 'mustache-loader']
  }
};

/**
 * @private 
 * @desc generate filename from full path
 * @param {string}  fullname full path
 * @param {string}  exttype  ext type
 * @param {string}  basepath extra path of output filename
 * @param {boolean} noPrefix whether or not delete index of output filename
 * @return {string} filename
 */
function GetFilename(fullname, exttype, basepath, noPrefix) {
  let basename = Path.basename(fullname, `.${exttype}`);
  if (noPrefix) {
    basename = basename.replace(/^index\./, '');
  }
  return Path.posix.join(basepath, `${basename}.html`);
}

/**
 * @module boi/transpiler/moduleAndPlugins/html
 * @param  {Object}      config        boi configuration
 * @param  {boolean}     isDevelopment whether or not on development environment
 * @param  {boolean}     hasDll        whether or not has dll.js, it will impact html injection
 * @param  {Object|Null} deployConf    deploy configuration
 * @return {Object}  webpack configuration&denpencies
 */
module.exports = function (config, isDevelopment, deployConf = null, hasDll) {
  const CONFIG_HTML = config.html;

  const Module = {
    rules: [],
    noParse: []
  };
  const Plugins = [];
  const Dependencies = [];

  // ext type
  const EXTTYPE = _.isString(CONFIG_HTML.ext) ? CONFIG_HTML.ext : 'html';
  // render engine
  const ENGJINE = CONFIG_HTML.engine || 'html';

  const REG_EXTTYPE = new RegExp(`\\.${EXTTYPE}$`);

  // path of source files
  const SourcePath = Path.join(process.cwd(), config.basic.source, CONFIG_HTML.source, '/');
  // source files list
  const IndexFiles = _.isArray(CONFIG_HTML.files) && CONFIG_HTML.files.length > 0 ? CONFIG_HTML.files : Glob.sync(`${SourcePath}**/+(${CONFIG_HTML.mainFilePrefix}.**.${EXTTYPE}|${CONFIG_HTML.mainFilePrefix}.${EXTTYPE})`);

  const CdnInfo = deployConf && deployConf.cdn || null;
  // cdn prefix of images that be referred by style 
  const PublicPath = isDevelopment ? '/' : (cdnInfo => {
    if (!cdnInfo) {
      return '/';
    }
    if (cdnInfo.domain) {
      return [
        cdnInfo.domain.replace(/^(http(s)?\:)?\/*/, '//').replace(/\/*$/, ''),
        cdnInfo.path && Path.posix.join('/', cdnInfo.path, '/') || '/'
      ].join('');
    } else {
      return cdnInfo.path || '/';
    }
  })(CdnInfo);
  // enable inject feature of HtmlWebpackPlugin if there is only one index view files
  if (IndexFiles.length === 1) {
    Plugins.push(new HtmlWebpackPlugin({
      inject: true,
      xhtml: false,
      hash: false,
      template: IndexFiles[0],
      filename: Path.posix.join(CONFIG_HTML.output, 'index.html'),
      minify: {
        minifyCSS: !isDevelopment,
        minifyJS: !isDevelopment,
        removeComments: false,
        removeAttributeQuotes: false,
        preserveLineBreaks: false,
        collapseWhitespace: true
      }
    }));
    hasDll && Plugins.push(new HtmlWebpackIncludeAssetsPlugin({
      assets: [`${config.js.output}/${config.basic.appname}.dll.js`],
      append: false,
      publicPath: PublicPath
    }));
  } else if (IndexFiles.length > 1) {
    // for multipage project,use html-webpack-plugin-replaceurl to replace static urls
    // @see https://github.com/boijs/html-webpack-plugin-replaceurl
    IndexFiles.forEach(file => {
      Plugins.push(new HtmlWebpackPlugin({
        filename: Path.posix.join(CONFIG_HTML.output, GetFilename(file, EXTTYPE, CONFIG_HTML.output, CONFIG_HTML.removePrefixAfterBuilt)),
        template: file,
        xhtml: false,
        hash: false,
        inject: false,
        minify: {
          minifyCSS: !isDevelopment,
          minifyJS: !isDevelopment,
          removeComments: false,
          removeAttributeQuotes: false,
          preserveLineBreaks: false,
          collapseWhitespace: true
        }
      }));
    });

    Plugins.push(new HtmlWebpackPluginReplaceurl({
      js: {
        mainFilePrefix: config.js.files ? '' : config.js.mainFilePrefix,
        useHash: !isDevelopment && config.js.useHash || false,
        separator: '.',
        common: config.js.splitCommonModule || (config.js.files && !_.isEmpty(config.js.files.common)) ? true : false,
        dll: !hasDll ? false : {
          name: `${config.basic.appname}.dll.js`,
          url: `${PublicPath}${config.js.output}/${config.basic.appname}.dll.js`
        }
      },
      css: {
        mainFilePrefix: config.style.files ? '' : config.style.mainFilePrefix,
        useHash: !isDevelopment && config.style.useHash || false,
        separator: '.'
      },
      urlTimestamp: CONFIG_HTML.urlTimestamp || false,
      mode: CONFIG_HTML.staticLocateMode === 'strict' ? 'strict' : 'loose'
    }));
  }

  const UseRule = [];
  if (ENGINE_LOADERS_MAP.hasOwnProperty(ENGJINE)) {
    if (ENGINE_LOADERS_MAP[ENGJINE].htmlAssit) {
      UseRule.push('html-loader');
    }

    UseRule.push({
      loader: ENGINE_LOADERS_MAP[ENGJINE].loader,
      options: _.isPlainObject(CONFIG_HTML.renderData) ? Object.assign({}, ENGINE_LOADERS_MAP[ENGJINE].options, ENGINE_LOADERS_MAP[ENGJINE].renderKey ? {
        [ENGINE_LOADERS_MAP[ENGJINE].renderKey]: CONFIG_HTML.renderData
      } : CONFIG_HTML.renderData) : {}
    });
  } else {
    UseRule.push('html-loader');
  }

  Module.rules.push({
    test: REG_EXTTYPE,
    use: UseRule
  });

  return {
    webpackConf: WebpackMerge.smart({
      module: Module,
      plugins: Plugins
    }, CONFIG_HTML.webpackConfig || {}),
    dependencies: Dependencies.concat(ENGINE_LOADERS_MAP[ENGJINE].deps)
  };
};