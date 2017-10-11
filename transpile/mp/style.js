const _ = require('lodash');
const Path = require('path');
const WebpackMerge = require('webpack-merge');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

// 各类型文件对应的dependencies
const EXT_DEPS_MAP = {
  css: ['postcss-loader'],
  less: ['less', 'less-loader', 'postcss-less', 'postcss-loader'],
  scss: ['sass-loader', 'node-sass', 'postcss-scss', 'postcss-loader']
};

/**
 * @desc 分发loader
 * @param {Object} config boi针对compile的配置项集合
 * @param {Boolean} isDevelopment 是否开发环境
 * @param {String} ext style文件后缀类型
 * @return {Array}
 */
function GetLoaders(config, isDevelopment, ext) {
  const CONFIG_IMAGE = config.image;
  const CONFIG_STYLE = config.style;
  const BaseLoaders = [];
  const CssLoaderOptions = {
    // 开发环境下禁用css-loader的url处理功能
    url: !isDevelopment,
    // 开发环境不压缩
    minimize: !isDevelopment,
    importLoaders: ext === 'css' ? 1 : 2
  };

  const PostcssPlugins = [];
  if (CONFIG_STYLE.autoprefix) {
    PostcssPlugins.push(require('autoprefixer'));
  }
  if (CONFIG_STYLE.sprites) {
    const UpdateRule = require('postcss-sprites/lib/core').updateRule;
    // 散列图片目录名称
    const SourceDirname = Path.basename(CONFIG_STYLE.sprites.source || 'icons');
    // 合法的散列图路径
    const REG_SPRITES_NAME = new RegExp(SourceDirname, 'i');
    // 合法的retina标识
    const REG_SPRITES_RETINA = new RegExp([
      '@(\\d+)x\\.',
      _.isArray(CONFIG_IMAGE.ext) ? `(${CONFIG_IMAGE.ext.join('|')})` : CONFIG_IMAGE.ext,
    ].join(''), 'i');
    /**
     * @desc postcss-sprites默认配置项
     * @type {Object}
     * @see https://github.com/2createStudio/postcss-sprites
     */
    const PostcssSpritesOpts = {
      // 是否开启retina识别
      retina: CONFIG_STYLE.sprites.retina || false,
      relativeTo: 'rule',
      spritePath: Path.posix.join(config.basic.output, config.image.output),
      stylesheetPath: isDevelopment ? Path.posix.join(config.basic.output, CONFIG_STYLE.output) : null,
      spritesmith: {
        padding: 5,
      },
      groupBy: image => {
        let groupName = undefined;

        if (CONFIG_STYLE.sprites.split) {
          groupName = Path.basename(Path.dirname(image.url));
        } else {
          groupName = SourceDirname;
        }
        if (CONFIG_STYLE.sprites.retina) {
          image.retina = true;
          image.ratio = 1;
          let ratio = REG_SPRITES_RETINA.exec(image.url);
          if (ratio) {
            ratio = ratio[1];
            while (ratio > 10) {
              ratio = ratio / 10;
            }
            image.ratio = ratio;
            image.groups = image.groups.filter((group) => {
              return ('@' + ratio + 'x') !== group;
            });
            groupName += '@' + ratio + 'x';
          }
        }
        return Promise.resolve(groupName);
      },
      filterBy: image => {
        if (!REG_SPRITES_NAME.test(image.url)) {
          return Promise.reject();
        }
        return Promise.resolve();
      },
      hooks: {
        // 重命名输出的spirites图片名称
        onSaveSpritesheet: function (opts, spritesheet) {
          const FilenameChunks = spritesheet.groups.concat(spritesheet.extension);
          return Path.posix.join(opts.spritePath, FilenameChunks.join('.'));
        },
        // 注入background-position&background-image&size
        onUpdateRule: (rule, token, image) => {
          ['width', 'height'].forEach(prop => {
            rule.insertAfter(rule.last, require('postcss').decl({
              prop: prop,
              value: image.coords[prop] + 'px'
            }));
          });
          UpdateRule(rule, token, image);
        }
      }
    };

    PostcssPlugins.push(require('postcss-sprites')(Object.assign({}, PostcssSpritesOpts,
      CONFIG_STYLE.sprites.postcssSpritesOpts || {})));
  }

  BaseLoaders.push({
    loader: 'css-loader',
    options: CssLoaderOptions
  });
  PostcssPlugins.length > 0 && BaseLoaders.push({
    loader: 'postcss-loader',
    options: {
      plugins: PostcssPlugins
    }
  });

  return BaseLoaders;
};

module.exports = function (config, isDevelopment, deployConf = null) {
  const CONFIG_STYLE = config.style;

  const Module = {
    rules: [],
    noParse: []
  };

  const Plugins = [];

  // 后缀类型
  const EXTTYPE = CONFIG_STYLE.ext || 'css';
  // 后缀正则
  const REG_EXTTYPE = new RegExp(`\\.${EXTTYPE}$`);
  // 编译输出目录
  const OutputPath = Path.posix.join(CONFIG_STYLE.output.replace(/^\.*\//, ''), '/');
  // 编译输出文件名
  const OutputFilename = !isDevelopment && CONFIG_STYLE.useHash ? `${OutputPath}[name].[contenthash:8].css` : `${OutputPath}[name].css`;

  const ExtractCSS = new ExtractTextPlugin({
    filename: Path.posix.join(CONFIG_STYLE.output, OutputFilename),
    allChunks: true,
    ignoreOrder: true
  });

  // ExtractTextPlugin中publicPath配置的作用是替换style文件中引用图片的根目录
  const CdnInfo = deployConf && deployConf.cdn || null;
  // cdn前缀 
  const PublicPath = CdnInfo && !isDevelopment ? (cdnInfo => {
    if (!!cdnInfo.domain) {
      return [
        cdnInfo.domain.replace(/^(http(s)?\:)?\/*/, '//').replace(/\/*$/, ''),
        cdnInfo.path && Path.posix.join('/', cdnInfo.path, '/') || '/'
      ].join('');
    } else if (!!cdnInfo.path) {
      if (Path.isAbsolute(cdnInfo.path)) {
        return Path.posix.join(cdnInfo.path, '/');
      } else {
        return Path.relative(CONFIG_STYLE.output, config.image.output).replace(config.image.output, '');
      }
    }
  })(CdnInfo) : '/';

  // 添加*.css文件编译支持
  Module.rules.push({
    test: /\.css$/,
    use: ExtractCSS.extract({
      use: GetLoaders(config,isDevelopment,'css'),
      publicPath: PublicPath
    })
  });

  // 默认支持less和scss预编译
  if (EXTTYPE === 'scss' || EXTTYPE === 'less') {
    Module.rules.push({
      test: REG_EXTTYPE,
      use: ExtractCSS.extract({
        use: GetLoaders(config,isDevelopment,EXTTYPE).concat([`${EXTTYPE}-loader`]),
        publicPath: PublicPath
      })
    });
  }

  Plugins.push(ExtractCSS);

  return {
    webpackConf: WebpackMerge.smart({
      module: Module,
      plugins: Plugins
    },CONFIG_STYLE.webpackConfig||{}),
    dependencies: EXT_DEPS_MAP[EXTTYPE]
  };
};