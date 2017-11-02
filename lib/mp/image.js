const _ = require('lodash');
const Path = require('path');
const WebpackMerge = require('webpack-merge');

// 默认支持的后缀类型
const DefaultExts = [
  'jpg',
  'jpeg',
  'svg',
  'png',
  'eot',
  'ttf',
  'ico',
  'gif',
  'woff',
  'woff2'
];

module.exports = function (config,isDevelopment) {
  const CONFIG_IMAGE = config.image;

  const Module = {
    rules: [],
    noParse: []
  };

  const Plugins = [];

  let dependencies = [];

  Module.rules = (() => {
    const Loaders = [];

    // 输出目录
    const OutputPath = Path.posix.join(CONFIG_IMAGE.output.replace(/^\.*\//,''), '/');
    // 输出文件名
    const OutputFilename = !isDevelopment&&CONFIG_IMAGE.useHash?`${OutputPath}[name].[hash:8].[ext]`:`${OutputPath}[name].[ext]`;

    let exts = null;
    if(!CONFIG_IMAGE.ext){
      exts = [...DefaultExts];
    }else{
      exts = [...new Set(_.isArray(CONFIG_IMAGE.ext) ? DefaultExts.concat(CONFIG_IMAGE.ext) : DefaultExts.concat([CONFIG_IMAGE.ext]))];
    }

    const REG_EXTTYPE = new RegExp(`\\.(${exts.join('|')})$`);

    if (CONFIG_IMAGE.base64) {
      Loaders.push({
        loader: 'url-loader',
        options: {
          name: OutputFilename,
          limit: CONFIG_IMAGE.base64Limit
        }
      });
    } else {
      Loaders.push({
        loader: 'file-loader',
        options: {
          name: OutputFilename,
        }
      });
    }
    Loaders.push({
      loader: 'image-webpack-loader',
      options: {
        mozjpeg: {
          progressive: true,
          quality: 65
        },
        optipng: {
          enabled: false,
        },
        pngquant: {
          quality: '65-90',
          speed: 4
        },
        gifsicle: {
          interlaced: false,
        },
        webp: {
          quality: 75
        }
      }
    });
    return [{
      test: REG_EXTTYPE,
      use: Loaders
    }];
  })();

  return {
    webpackConf: WebpackMerge.smart({
      module: Module,
      plugins: Plugins
    },CONFIG_IMAGE.webpackConfig||{}),
    dependencies
  };
}