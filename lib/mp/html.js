const _ = require('lodash');
const Path = require('path');
const Glob = require('glob');
const WebpackMerge = require('webpack-merge');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const FaviconsWebpackPlugin = require('favicons-webpack-plugin');
const HtmlWebpackPluginReplaceurl = require('html-webpack-plugin-replaceurl');

// 各类型文件对应的dependencies
const ENGINE_LOADERS_MAP = {
  html:{
    htmlAssit: false,
    loader: 'html-loader',
    deps: []
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

function GetFilename(fullname, exttype, basepath, noPrefix) {
  let basename = Path.basename(fullname, `.${exttype}`);
  if (noPrefix) {
    basename = basename.replace(/^index\./, '');
  }
  return Path.posix.join(basepath, `${basename}.html`);
}

module.exports = function (config, isDevelopment) {
  const CONFIG_HTML = config.html;
  const Module = {
    rules: [],
    noParse: []
  };
  const Plugins = [];
  const Dependencies = [];

  // 文件后缀
  const EXTTYPE = _.isString(CONFIG_HTML.ext) ? CONFIG_HTML.ext : 'html';
  // 模板引擎
  const ENGJINE = CONFIG_HTML.engine || 'html';
  // 匹配正则
  const REG_EXTTYPE = new RegExp(`\\.${EXTTYPE}$`);

  // view源文件目录
  const SourcePath = Path.posix.join(process.cwd(), config.basic.source, CONFIG_HTML.source, '/');
  // index文件列表
  const IndexFiles = _.isArray(CONFIG_HTML.files) && CONFIG_HTML.files.length > 0 ? CONFIG_HTML.files : Glob.sync(`${SourcePath}**/+(${CONFIG_HTML.mainFilePrefix}.**.${EXTTYPE}|${CONFIG_HTML.mainFilePrefix}.${EXTTYPE})`);

  // 如果只存在一个html入口文件，则使用inject注入chunks
  if (IndexFiles.length === 1) {
    Plugins.push(new HtmlWebpackPlugin({
      filename: Path.posix.join(CONFIG_HTML.output, 'index.html'),
      template: IndexFiles[0],
      // 单页应用启用自动注入
      inject: true,
      xhtml: false,
      hash: false,
      minify: {
        removeComments: true,
        removeAttributeQuotes: false
      }
    }));
  } else if (IndexFiles.length > 1) {
    // 如果存在多个html文件，则分析各html文件的依赖chunks，使用html-webpack-plugin-replaceurl注入
    // @see https://github.com/boijs/html-webpack-plugin-replaceurl
    IndexFiles.forEach(file => {
      Plugins.push(new HtmlWebpackPlugin({
        filename: Path.posix.join(CONFIG_HTML.output, GetFilename(file, EXTTYPE, CONFIG_HTML.output, CONFIG_HTML.removePrefixAfterBuilt)),
        template: file,
        // 多页应用关闭自动注入
        inject: false,
        xhtml: false,
        hash: false,
        minify: {
          removeComments: true,
          removeAttributeQuotes: false
        }
      }));
    });

    // 静态资源url替换
    Plugins.push(new HtmlWebpackPluginReplaceurl({
      js: {
        mainFilePrefix: config.js.files ? '' : config.js.mainFilePrefix,
        useHash: !isDevelopment && config.js.useHash || false,
        separator: '.',
        common: config.js.splitCommonModule || (config.js.files && !_.isEmpty(config.js.files.common)) ? true : false,
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

  // favicon plugin
  if (CONFIG_HTML.favicon) {
    Plugins.push(new FaviconsWebpackPlugin({
      logo: Path.posix.join(process.cwd(), CONFIG_HTML.favicon),
      inject: true,
      prefix: Path.posix.join(config.image.output, 'favicons/'),
      statsFilename: 'iconstats.json',
      persistentCache: false,
      icons: {
        android: true,
        appleIcon: true,
        appleStartup: false,
        coast: false,
        favicons: true,
        firefox: false,
        opengraph: false,
        twitter: false,
        yandex: false,
        windows: false
      }
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