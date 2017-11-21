const _        = require('lodash');
const Shell    = require('shelljs');
const BoiUtils = require('boi-utils');

/**
 * @module boi/parser/pluginsOfBoi
 * @param  {Map}     pluginList boi plugins set
 * @param  {boolean} installPluginsAndDeps whether or not install boi plugins and dependencied
 * @return {Array}   webpack configuration list of boi plugins
 */
module.exports = function (pluginList,installPluginsAndDeps) {
  const WebpackConfList = [];
  let deps = [];
  let alias = [];

  if (!pluginList || [...pluginList].length === 0) {
    return {
      webpackConf: [],
      dependencies: []
    };
  }

  if(installPluginsAndDeps){
    const Spinner = BoiUtils.log.loadingSync('Installing plugins...');
    
    Spinner.start();

    const PluginsNeedInstall = [];
  
    // check if plugin exists
    for(const plugin of pluginList.keys()){
      try {
        require.resolve(`${process.cwd()}/node_modules/${plugin}`);
      }catch(e){
        PluginsNeedInstall.push(plugin);
      }
    }

    if(PluginsNeedInstall.length === 0){
      Spinner.success('Installed plugins succeed');
    }else{
      // install plugins
      Shell.exec(`npm install ${PluginsNeedInstall.join(' ')} --save-dev`, {
        silent: true
      });
  
      Spinner.success('Installed plugins succeed');
    }
  }

  // require and execute the plugins
  for (const [name, options] of pluginList.entries()) {
    // const {
    //   webpackConf,
    //   dependencies,
    //   aliasOfPlugin
    // } = require(`${process.cwd()}/node_modules/${name}`)(options);

    const {
      webpackConf,
      dependencies,
      alias: aliasOfPlugin
    } = require(`../../${name}`)(options);

    WebpackConfList.push(webpackConf);
    deps = deps.concat(dependencies);
    if(aliasOfPlugin && !_.isEmpty(aliasOfPlugin)){
      alias = Object.assign({},alias,aliasOfPlugin);
    }
  }

  return {
    alias,
    webpackConf  : WebpackConfList,
    dependencies : new Set(deps)
  };
};