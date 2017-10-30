const Shell = require('shelljs');
const BoiUtils = require('../../boi-utils');

/**
 * @module boi/parser/boPlugins
 * @param {Map} pluginList boi plugins set
 * @return {Array} webpack configuration list of boi plugins
 */
module.exports = function(pluginList){
  const WebpackConfList = [];
  if(!pluginList || pluginList.length === 0){
    return WebpackConfList;
  }
  try{
    const Spinner = BoiUtils.log.loadingSync('Installing plugins...');
    Spinner.start();
  
    const PluginsNeedInstall = [...pluginList.keys()];
    // install plugins
    const InstallLog = Shell.exec(`npm install ${PluginsNeedInstall.join(' ')} --save-dev`,{
      silent: true
    });

    if(InstallLog.stderr){
      Spinner.error(InstallLog.stderr);
      process.exit(1);
    }else{
      // require and execute the plugins
      for(const [name,options] of pluginList.entries()){
        WebpackConfList.push(require(name)(options));
      }
      Spinner.success('All plugins have been installed');
      return WebpackConfList;
    }
  }catch(e){
    throw new Error(e);
  }
};