const Path = require('path');

module.exports = function (config, isDevelopment) {
  // root path of output files
  const OutputPath = Path.join(process.cwd(), config.compile.basic.output);
  // filename of main bundle
  const Filename = !isDevelopment && config.compile.js.useHash ? '[name].[chunkhash:8].js' : '[name].js';
  // filename of load on command bundles
  const ChunkFilename = config.compile.basic.appname + (!isDevelopment && config.compile.js.asyncModuleHash ?
    '.[name].[chunkhash:8].js' : '.[name].js');

  // publicPath is used for CDN prefix
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

  return {
    publicPath: PublicPath,
    path: OutputPath,
    filename: Path.posix.join(config.compile.js.output, Filename),
    chunkFilename: Path.posix.join(config.compile.js.output, 'modules/', ChunkFilename)
  };
};