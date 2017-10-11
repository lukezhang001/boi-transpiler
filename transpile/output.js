'use strict';

const Path = require('path');

module.exports = function (config, isDevelopment) {
  const Output = {};

  // 编译输出目录
  const OutputPath = Path.posix.join(process.cwd(), config.compile.basic.output);

  // 编译输出的主文件名
  const Filename = !isDevelopment && config.compile.js.useHash ? '[name].[chunkhash:8].js' : '[name].js';
  // 编译输出的异步文件名
  const ChunkFilename = config.compile.basic.appname + (!isDevelopment && config.compile.js.asyncModuleHash ?
    '.[name].[chunkhash:8].js' : '.[name].js');


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
  })(config.deploy.cdn);

  Object.assign(Output,{
    publicPath: PublicPath,
    path: OutputPath,
    filename: Path.posix.join(config.compile.js.output, Filename),
    chunkFilename: Path.posix.join(config.compile.js.output, 'modules/', ChunkFilename)
  });

  if (config.compile.js.libraryType) {
    Output.libraryTarget = config.compile.js.libraryType;
    Output.library = config.compile.js.library || config.compile.basic.appname;
  }
  return Output;
};