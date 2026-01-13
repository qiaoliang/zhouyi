import path from 'path'

const config = {
  projectName: 'zhouyi-mini',
  date: '2026-1-13',
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  plugins: [],
  defineConstants: {
  },
  copy: {
    patterns: [
      { from: 'src/assets/icons', to: 'assets/icons' }
    ],
    options: {
    }
  },
  framework: 'react',
  compiler: {
    type: 'webpack5',
    prebundle: {
      enable: false
    }
  },
  cache: {
    enable: false // Webpack 持久化缓存配置，建议开启。默认配置请参考：https://docs.taro.zone/docs/config-detail#cache
  },
  webpackChain(chain) {
    // 确保 shared 包中的 TypeScript 文件通过 babel-loader 处理
    chain.module
      .rule('compile-shared')
      .test(/\.ts?x$/)
      .include
      .add(path.resolve(__dirname, '../../shared/src'))
      .end()
      .use('babel-loader')
      .loader('babel-loader')
      .options({
        cacheDirectory: true
      })
  },
  mini: {
    postcss: {
      pxtransform: {
        enable: true,
        config: {

        }
      },
      url: {
        enable: true,
        config: {
          limit: 1024 // 设定转换尺寸上限
        }
      },
      cssModules: {
        enable: false, // 默认为 false，如需使用 css modules 功能，设置为 true
        config: {
          namingPattern: 'module', // 转换模式，取值为 global/module
          generateScopedName: '[name]__[local]___[hash:base64:5]'
        }
      }
    }
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    postcss: {
      autoprefixer: {
        enable: true
      },
      cssModules: {
        enable: false, // 默认为 false，如需使用 css modules 功能，设置为 true
        config: {
          namingPattern: 'module', // 转换模式，取值为 global/module
          generateScopedName: '[name]__[local]___[hash:base64:5]'
        }
      }
    }
  },
  alias: {
    '@': path.resolve(__dirname, '..', 'src'),
    '@zhouyi/shared': path.resolve(__dirname, '../../shared/dist')
  }
}

export default config
