const _ = require('lodash');
const Fs = require('fs');
const Ejs = require('ejs');
const Path = require('path');
const WebpackMerge = require('webpack-merge');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const OptimizeCSSPlugin = require('optimize-css-assets-webpack-plugin');

/**
 * @constant EXT_DEPS_MAP dependencies of each ext 
 * @type {Object}
 */
const EXT_DEPS_MAP = {
  css: [
    'postcss-loader'
  ],
  less: [
    'less',
    'less-loader',
    'postcss-less',
    'postcss-loader'
  ],
  scss: [
    'sass-loader',
    'node-sass',
    'postcss-scss',
    'postcss-loader'
  ]
};

/**
 * @desc generate loaders/dependencies
 * @param {Object} config boi configuration
 * @param {soolean} isDevelopment whether in development or not
 * @param {string} ext ext type of source style files
 * @return {Object} loaders and dependencies
 */
function GetLoaders(config, isDevelopment, ext, isGenerateConfigFile) {
  const CONFIG_IMAGE = config.image;
  const CONFIG_STYLE = config.style;
  const BaseLoaders = [];
  const Dependencies = [];
  BaseLoaders.push({
    loader: 'css-loader',
    options: {
      url: true,
      minimize: !isDevelopment,
      importLoaders: ext === 'css' ? 1 : 2
    }
  });

  if (isGenerateConfigFile) {
    const PostcssPlugins = [];
    if (CONFIG_STYLE.autoprefix) {
      Dependencies.push('autoprefixer');
      PostcssPlugins.push({
        name: 'autoprefixer',
        options: '{}'
      });
    }
    if (CONFIG_STYLE.sprites) {
      Dependencies.push('postcss-sprites');
      // 散列图片目录名称
      const SourceDirname = Path.basename(CONFIG_STYLE.sprites.source || 'icons');
      // 合法的散列图路径
      const REG_SPRITES_NAME = new RegExp(SourceDirname, 'i');
      // 合法的retina标识
      const REG_SPRITES_RETINA = new RegExp(['@(\\d+)x\\.',
        _.isArray(CONFIG_IMAGE.ext) ? `(${CONFIG_IMAGE.ext.join('|')})` : CONFIG_IMAGE.ext,
      ].join(''), 'i');
      /**
       * @constant
       * @desc postcss-sprites默认配置项
       * @type {string}
       * @see https://github.com/2createStudio/postcss-sprites
       */
      const PostcssSpritesOpts = `{
      // enable/disable retina mark parser
      retina: ${CONFIG_STYLE.sprites.retina || false},
      relativeTo: 'file',
      spritePath: process.env.BOI_ENV === 'dev'?'${Path.posix.join(config.basic.output, config.image.output)}':'.tmp',
      spritesmith: {
        padding: 5,
      },
      groupBy: image => {
        let groupName = undefined;

        if (${CONFIG_STYLE.sprites.split}) {
          groupName = Path.basename(Path.dirname(image.url));
        } else {
          groupName = '${SourceDirname}';
        }
        if (${CONFIG_STYLE.sprites.retina}) {
          image.retina = true;
          image.ratio = 1;
          let ratio = ${REG_SPRITES_RETINA}.exec(image.url);
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
        if (!${REG_SPRITES_NAME}.test(image.url)) {
          return Promise.reject();
        }
        return Promise.resolve();
      },
      hooks: {
        // rename sprites file's name
        onSaveSpritesheet: (opts, spritesheet) => {
          const FilenameChunks = spritesheet.groups.concat(spritesheet.extension);
          return Path.posix.join(opts.spritePath, FilenameChunks.join('.'));
        },
        // inject background-position/background-image/size
        onUpdateRule: (rule, token, image) => {
          ['width', 'height'].forEach(prop => {
            rule.insertAfter(rule.last, require('postcss').decl({
              prop: prop,
              value: image.coords[prop] + 'px'
            }));
          });
          require('postcss-sprites/lib/core').updateRule(rule, token, image);
        }
      }
    }`;

      PostcssPlugins.push({
        name: 'postcss-sprites',
        options: PostcssSpritesOpts
      });
    }

    const PostCssConf = Ejs.render(Fs.readFileSync(Path.join(__dirname, '../../templates/postcssrc.js.ejs'), 'utf-8'), {
      plugins: PostcssPlugins
    });

    Fs.writeFileSync(Path.join(process.cwd(), '.postcssrc.js'), PostCssConf);
  }
  BaseLoaders.push({
    loader: 'postcss-loader'
  });
  return {
    loaders: BaseLoaders,
    deps: Dependencies
  };
}

/**
 * @module boi/tranpiler/moduleAndPlugins/style
 * @param {Object} config boi configurations
 * @param {boolean} isDevelopment whether or not development environment
 * @param {Object|Null} deployConf deploy configuration
 * @return {Object} webpack configuration and dependencies
 */
module.exports = function (config, isDevelopment, deployConf = null, installPluginsAndDeps = false) {
  const CONFIG_STYLE = config.style;

  const Module = {
    rules: [],
    noParse: []
  };

  const Plugins = [];
  let dependencies = ['style-loader'];

  const IsNeedGeneratePostCssConfig = installPluginsAndDeps||!Fs.existsSync(Path.join(process.cwd(), '.postcssrc.js'));

  // 后缀类型
  const EXTTYPE = CONFIG_STYLE.ext || 'css';
  // 后缀正则
  const REG_EXTTYPE = new RegExp(`\\.${EXTTYPE}$`);
  // 编译输出文件名
  const OutputFilename = !isDevelopment && CONFIG_STYLE.useHash ? '[name].[contenthash:8].css' : '[name].css';

  const ExtractCSS = new ExtractTextPlugin({
    filename: Path.posix.join(CONFIG_STYLE.output, OutputFilename),
    allChunks: true,
    ignoreOrder: true
  });

  const CdnInfo = deployConf && deployConf.cdn || null;
  // cdn prefix of images that be referred by style 
  const PublicPath = CdnInfo && !isDevelopment ? (cdnInfo => {
    if (cdnInfo.domain) {
      return [
        cdnInfo.domain.replace(/^(http(s)?\:)?\/*/, '//').replace(/\/*$/, ''),
        cdnInfo.path && Path.posix.join('/', cdnInfo.path, '/') || '/'
      ].join('');
    } else if (cdnInfo.path) {
      if (Path.isAbsolute(cdnInfo.path)) {
        return Path.posix.join(cdnInfo.path, '/');
      } else {
        return Path.relative(CONFIG_STYLE.output, config.image.output).replace(config.image.output, '');
      }
    }
  })(CdnInfo) : '/';

  const {
    loaders,
    deps
  } = GetLoaders(config, isDevelopment, EXTTYPE,IsNeedGeneratePostCssConfig);

  dependencies = dependencies.concat(deps);

  // 添加*.css文件编译支持
  Module.rules.push({
    test: /\.css$/,
    use: CONFIG_STYLE.extract ? ExtractCSS.extract({
      use: loaders,
      publicPath: PublicPath
    }): ['style-loader'].concat(loaders)
  });

  // less & scss support by default
  if (EXTTYPE === 'scss' || EXTTYPE === 'less') {
    const {
      loaders,
      deps
    } = GetLoaders(config, isDevelopment, EXTTYPE,IsNeedGeneratePostCssConfig);
    dependencies = dependencies.concat(deps);
    Module.rules.push({
      test: REG_EXTTYPE,
      use: CONFIG_STYLE.extract ? ExtractCSS.extract({
        use: loaders.concat([`${EXTTYPE==='scss'?'sass':EXTTYPE}-loader`]),
        publicPath: PublicPath
      }) : ['style-loader'].concat(loaders).concat([`${EXTTYPE==='scss'?'sass':EXTTYPE}-loader`])
    });
  }

  CONFIG_STYLE.extract && Plugins.push(ExtractCSS);
  Plugins.push(new OptimizeCSSPlugin({
    cssProcessorOptions: {
      safe: true
    }
  }));

  return {
    webpackConf: WebpackMerge.smart({
      module: Module,
      plugins: Plugins
    }, CONFIG_STYLE.webpackConfig || {}),
    dependencies: EXT_DEPS_MAP[EXTTYPE].concat(dependencies)
  };
};