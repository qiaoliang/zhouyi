/**
 * Babel配置
 */

module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    // React Native Reanimated plugin需要在最后
    'react-native-reanimated/plugin',
  ],
};
