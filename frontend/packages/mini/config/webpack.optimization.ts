/**
 * Webpack 性能优化配置
 * 目标: 首屏加载时间 < 2秒
 */

import type { IPluginContext } from '@tarojs/taro';

/**
 * 图片优化配置
 * - WebP格式转换
 * - 图片压缩
 * - 响应式图片
 */
export const imageOptimization = {
  // 配置图片加载器
  module: {
    rules: [
      {
        test: /\.(png|jpe?g|gif|webp)$/i,
        use: [
          {
            loader: 'url-loader',
            options: {
              limit: 1024, // 小于1KB转base64
              name: 'static/images/[name].[hash:8].[ext]',
              esModule: false,
            },
          },
          {
            loader: 'image-webpack-loader',
            options: {
              mozjpeg: {
                progressive: true,
                quality: 80,
              },
              optipng: {
                enabled: false,
              },
              pngquant: {
                quality: [0.65, 0.90],
                speed: 4,
              },
              gifsicle: {
                interlaced: false,
              },
              webp: {
                quality: 75,
              },
            },
          },
        ],
      },
    ],
  },
};

/**
 * 代码分割配置
 * - 路由懒加载
 * - 组件懒加载
 * - 第三方库分离
 */
export const codeSplitting = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      minSize: 20000,
      minChunks: 1,
      maxAsyncRequests: 30,
      maxInitialRequests: 25,
      automaticNameDelimiter: '.',
      cacheGroups: {
        // 第三方库分离
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10,
          name: 'vendors',
        },
        // Taro核心库
        taro: {
          test: /[\\/]node_modules[\\/]@tarojs[\\/]/,
          priority: -9,
          name: 'taro',
        },
        // React相关
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|react-router)[\\/]/,
          priority: -8,
          name: 'react',
        },
        // 公共组件
        common: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true,
          name: 'common',
        },
      },
    },
    // 运行时代码分离
    runtimeChunk: {
      name: 'runtime',
    },
  },
};

/**
 * 构建性能优化
 * - 持久化缓存
 * - 并行构建
 * - 压缩优化
 */
export const buildOptimization = {
  cache: {
    type: 'filesystem', // 文件系统缓存
    buildDependencies: {
      config: [__filename],
    },
  },

  // 压缩配置
  minimizer: [
    // 压缩JavaScript
    new (require('terser-webpack-plugin'))({
      terserOptions: {
        compress: {
          drop_console: true, // 生产环境移除console
          drop_debugger: true,
          pure_funcs: ['console.log'],
        },
        format: {
          comments: false,
        },
      },
      extractComments: false,
      parallel: true, // 多进程并行压缩
    }),

    // 压缩CSS
    new (require('css-minimizer-webpack-plugin'))({
      parallel: true,
    }),
  ],

  // 并行处理
  parallelism: require('os').cpus().length - 1,
};

/**
 * 资源预加载配置
 */
export const preloadConfig = {
  // 预加载关键资源
  preload: [
    // 预加载首页组件
    // 预加载关键样式
  ],

  // 预连接到重要域名
  preconnect: [
    'https://api.zhouyi.com',
    'https://cdn.zhouyi.com',
  ],
};

/**
 * CDN配置
 */
export const cdnConfig = {
  // 静态资源CDN域名
  publicPath: process.env.CDN_URL || 'https://cdn.zhouyi.com/static/',

  // 需要CDN加速的资源
  patterns: [
    'static/images/**',
    'static/fonts/**',
  ],
};

/**
 * 性能预算配置
 */
export const performanceBudget = {
  maxAssetSize: 244 * 1024, // 单个文件最大244KB
  maxEntrypointSize: 512 * 1024, // 入口文件最大512KB
  hints: 'warning', // 超出时显示警告
};

/**
 * 完整的优化配置
 */
export function getOptimizationConfig(): any {
  return {
    ...imageOptimization,
    ...codeSplitting,
    ...buildOptimization,
    performance: performanceBudget,
  };
}

/**
 * 图片优化工具函数
 */
export class ImageOptimizer {
  /**
   * 生成响应式图片URL
   * @param baseUrl 基础URL
   * @param width 图片宽度
   * @param quality 图片质量(1-100)
   */
  static getResponsiveUrl(baseUrl: string, width: number, quality: number = 80): string {
    const url = new URL(baseUrl);
    url.searchParams.set('width', width.toString());
    url.searchParams.set('quality', quality.toString());
    return url.toString();
  }

  /**
   * 生成WebP格式URL
   * @param baseUrl 基础URL
   */
  static getWebPUrl(baseUrl: string): string {
    const url = new URL(baseUrl);
    url.searchParams.set('format', 'webp');
    return url.toString();
  }

  /**
   * 检查浏览器是否支持WebP
   */
  static async checkWebPSupport(): Promise<boolean> {
    return new Promise((resolve) => {
      const webP = new Image();
      webP.onload = webP.onerror = () => {
        resolve(webP.height === 2);
      };
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  }
}

/**
 * 性能监控工具
 */
export class PerformanceMonitor {
  /**
   * 记录页面加载时间
   */
  static logPageLoadTiming() {
    if (typeof window === 'undefined' || !window.performance) return;

    const timing = window.performance.timing;
    const loadTime = timing.loadEventEnd - timing.navigationStart;
    const domReadyTime = timing.domContentLoadedEventEnd - timing.navigationStart;
    const firstPaint = timing.responseStart - timing.navigationStart;

    console.log('📊 页面性能指标:', {
      '总加载时间': `${loadTime}ms`,
      'DOM就绪时间': `${domReadyTime}ms`,
      '首字节时间': `${firstPaint}ms`,
      '目标': '< 2000ms',
      '是否达标': loadTime < 2000 ? '✅' : '❌',
    });

    // 发送到监控服务
    this.sendToAnalytics({
      loadTime,
      domReadyTime,
      firstPaint,
      timestamp: Date.now(),
    });
  }

  /**
   * 监控资源加载
   */
  static logResourceTiming() {
    if (typeof window === 'undefined' || !window.performance) return;

    const resources = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];

    const slowResources = resources.filter((r) => r.duration > 1000);

    if (slowResources.length > 0) {
      console.warn('⚠️ 加载缓慢的资源:', slowResources.map((r) => ({
        name: r.name,
        duration: `${Math.round(r.duration)}ms`,
      })));
    }
  }

  /**
   * 发送数据到分析服务
   */
  private static sendToAnalytics(data: any) {
    // TODO: 集成到实际的分析服务
    if (process.env.NODE_ENV === 'production') {
      // 发送到监控API
      // fetch('/api/analytics/performance', { method: 'POST', body: JSON.stringify(data) });
    }
  }
}
