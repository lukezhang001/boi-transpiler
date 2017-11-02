const Shell = require('shelljs');
const BoiUtils = require('../../boi-utils');

/**
 * @module boi/parser/boPlugins
 * @param {Map} pluginList boi plugins set
 * @return {Array} webpack configuration list of boi plugins
 */
module.exports = function (pluginList) {
  const WebpackConfList = [];
  let deps = [];
  if (!pluginList || pluginList.length === 0) {
    return {
      webpackConf: [],
      dependencies: []
    };
  }
  const Spinner = BoiUtils.log.loadingSync('Installing plugins...');
  Spinner.start();

  const PluginsNeedInstall = [];

  // check if plugin exists
  for(const plugin of pluginList.keys()){
    try {
      require.resolve(plugin);
    }catch(e){
      PluginsNeedInstall.push(plugin);
    }
  }

  if(PluginsNeedInstall.length === 0){
    Spinner.success('All plugins have been installed');
  }else{
    // install plugins
    // const InstallLog = Shell.exec(`npm install ${PluginsNeedInstall.join(' ')} --save-dev`, {
    //   silent: true
    // });

    // if (InstallLog && InstallLog.stderr) {
    //   Spinner.error(InstallLog.stderr);
    //   process.exit(1);
    // } else {
      // require and execute the plugins
      for (const [name, options] of pluginList.entries()) {
        const {
          webpackConf,
          dependencies
        } = require(`../../${name}`)(options);
        WebpackConfList.push(webpackConf);
        deps = deps.concat(dependencies);
      }

      Spinner.success('All plugins have been installed');
    // }
  }
  return {
    webpackConf: WebpackConfList,
    dependencies: new Set(deps)
  };
};