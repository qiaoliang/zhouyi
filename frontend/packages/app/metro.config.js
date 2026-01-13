/**
 * Metro配置
 */

const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

/**
 * Metro配置
 */
const config = {
  watcher: {
    // 使用原生文件监听器以提高性能
    usePolling: false,
  },
  resolver: {
    // 支持monorepo中的workspace包
    nodeModulesPaths: [
      // 首先查找本地的node_modules
      `${__dirname}/node_modules`,
      // 然后查找monorepo根目录的node_modules
      `${__dirname}/../../node_modules`,
    ],
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
