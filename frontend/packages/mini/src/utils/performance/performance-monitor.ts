/**
 * 性能监控工具
 * 监控页面加载性能、资源加载情况,并生成报告
 */

import Taro from '@tarojs/taro';

/**
 * 性能指标
 */
interface PerformanceMetrics {
  // 页面加载时间
  pageLoadTime: number;
  // 首次内容绘制时间
  firstContentfulPaint: number;
  // DOM就绪时间
  domReadyTime: number;
  // 资源加载时间
  resourceLoadTime: number;
  // 总加载时间
  totalLoadTime: number;
}

/**
 * 性能数据收集器
 */
export class PerformanceCollector {
  private metrics: PerformanceMetrics | null = null;
  private observers: PerformanceObserver[] = [];

  /**
   * 开始收集性能数据
   */
  start() {
    if (typeof window === 'undefined' || !window.performance) {
      console.warn('Performance API not supported');
      return;
    }

    // 监听首次内容绘制
    this.observeFCP();

    // 监听资源加载
    this.observeResources();

    // 在页面加载完成后收集指标
    if (document.readyState === 'complete') {
      this.collectMetrics();
    } else {
      window.addEventListener('load', () => this.collectMetrics());
    }
  }

  /**
   * 收集性能指标
   */
  private collectMetrics() {
    const timing = window.performance.timing;

    this.metrics = {
      pageLoadTime: timing.loadEventEnd - timing.navigationStart,
      firstContentfulPaint: this.getFCP(),
      domReadyTime: timing.domContentLoadedEventEnd - timing.navigationStart,
      resourceLoadTime: timing.loadEventEnd - timing.domContentLoadedEventEnd,
      totalLoadTime: timing.loadEventEnd - timing.navigationStart,
    };

    console.log('性能指标:', this.metrics);

    // 检查是否达标
    this.checkPerformance();

    // 发送报告
    this.sendReport();
  }

  /**
   * 获取首次内容绘制时间
   */
  private getFCP(): number {
    const entries = window.performance.getEntriesByName('first-contentful-paint');
    if (entries.length > 0) {
      return (entries[0] as any).startTime || 0;
    }
    return 0;
  }

  /**
   * 监听首次内容绘制
   */
  private observeFCP() {
    if (typeof PerformanceObserver === 'undefined') {
      return;
    }

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            console.log('FCP:', entry.startTime);
          }
        });
      });

      observer.observe({ entryTypes: ['paint'] });
      this.observers.push(observer);
    } catch (e) {
      console.warn('Failed to observe FCP:', e);
    }
  }

  /**
   * 监听资源加载
   */
  private observeResources() {
    if (typeof PerformanceObserver === 'undefined') {
      return;
    }

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          const resource = entry as PerformanceResourceTiming;
          if (resource.duration > 1000) {
            console.warn('慢速资源:', {
              name: resource.name,
              duration: `${Math.round(resource.duration)}ms`,
              size: `${Math.round(resource.transferSize / 1024)}KB`,
            });
          }
        });
      });

      observer.observe({ entryTypes: ['resource'] });
      this.observers.push(observer);
    } catch (e) {
      console.warn('Failed to observe resources:', e);
    }
  }

  /**
   * 检查性能是否达标
   */
  private checkPerformance() {
    if (!this.metrics) return;

    const { pageLoadTime, totalLoadTime } = this.metrics;
    const target = 2000; // 目标:2秒

    const results = {
      页面加载时间: {
        value: pageLoadTime,
        target,
        passed: pageLoadTime < target,
      },
      总加载时间: {
        value: totalLoadTime,
        target,
        passed: totalLoadTime < target,
      },
    };

    console.table(
      Object.entries(results).map(([key, value]) => ({
        指标: key,
        实际值: `${Math.round(value.value)}ms`,
        目标值: `< ${value.target}ms`,
        状态: value.passed ? '✅ 达标' : '❌ 未达标',
      }))
    );

    // 如果未达标,给出优化建议
    if (!results.页面加载时间.passed || !results.总加载时间.passed) {
      this.showOptimizationTips();
    }
  }

  /**
   * 显示优化建议
   */
  private showOptimizationTips() {
    console.group('🚀 性能优化建议');

    // 检查资源加载
    const resources = window.performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const largeResources = resources.filter((r) => r.transferSize > 100 * 1024); // 大于100KB

    if (largeResources.length > 0) {
      console.warn('发现大文件资源:');
      largeResources.forEach((r) => {
        console.warn(`- ${r.name}: ${Math.round(r.transferSize / 1024)}KB`);
      });
      console.info('💡 建议:压缩图片资源或使用CDN加速');
    }

    // 检查JavaScript执行时间
    const jsEntries = resources.filter((r) => r.initiatorType === 'script');
    const slowJs = jsEntries.filter((r) => r.duration > 500);

    if (slowJs.length > 0) {
      console.warn('发现执行缓慢的JavaScript:');
      slowJs.forEach((r) => {
        console.warn(`- ${r.name}: ${Math.round(r.duration)}ms`);
      });
      console.info('💡 建议:使用代码分割或懒加载');
    }

    console.groupEnd();
  }

  /**
   * 发送性能报告
   */
  private sendReport() {
    if (!this.metrics) return;

    const report = {
      metrics: this.metrics,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      url: window.location.href,
    };

    // TODO: 发送到监控服务
    if (process.env.NODE_ENV === 'production') {
      // Taro.request({
      //   url: '/api/analytics/performance',
      //   method: 'POST',
      //   data: report,
      // });
    }
  }

  /**
   * 停止收集
   */
  stop() {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
  }

  /**
   * 获取当前指标
   */
  getMetrics(): PerformanceMetrics | null {
    return this.metrics;
  }
}

/**
 * 小程序性能监控
 */
export class MiniProgramPerformanceMonitor {
  private startTime = 0;

  /**
   * 开始监控
   */
  start() {
    this.startTime = Date.now();
  }

  /**
   * 结束监控并记录
   */
  end(label: string) {
    const duration = Date.now() - this.startTime;
    console.log(`⏱️ ${label}: ${duration}ms`);

    // 检查是否超时
    if (duration > 2000) {
      console.warn(`⚠️ ${label} 超时 (${duration}ms > 2000ms)`);
    }

    return duration;
  }

  /**
   * 监控页面加载性能
   */
  monitorPageLoad(pageName: string) {
    const startTime = Date.now();

    return () => {
      const duration = Date.now() - startTime;
      console.log(`📄 ${pageName} 加载时间: ${duration}ms`);

      // 记录到统计
      this.reportPageLoad(pageName, duration);
    };
  }

  /**
   * 报告页面加载时间
   */
  private reportPageLoad(pageName: string, duration: number) {
    const report = {
      page: pageName,
      duration,
      timestamp: Date.now(),
    };

    console.table([{
      页面: pageName,
      加载时间: `${duration}ms`,
      状态: duration < 2000 ? '✅' : '❌',
    }]);

    // TODO: 发送到统计服务
    if (process.env.NODE_ENV === 'production') {
      // Taro.request({
      //   url: '/api/analytics/page-load',
      //   method: 'POST',
      //   data: report,
      // });
    }
  }

  /**
   * 监控网络请求
   */
  monitorRequest(url: string) {
    const startTime = Date.now();

    return {
      end: (success: boolean) => {
        const duration = Date.now() - startTime;
        console.log(`🌐 ${url}: ${duration}ms ${success ? '✅' : '❌'}`);

        // 记录慢请求
        if (duration > 3000) {
          console.warn(`⚠️ 慢请求: ${url} (${duration}ms)`);
        }

        return duration;
      },
    };
  }
}

// 导出单例
export const performanceCollector = new PerformanceCollector();
export const miniProgramMonitor = new MiniProgramPerformanceMonitor();

/**
 * 初始化性能监控
 */
export function initPerformanceMonitoring() {
  // 在小程序环境下
  if (typeof wx !== 'undefined') {
    console.log('🚀 初始化小程序性能监控');

    // 监听小程序性能
    const performance = wx.getPerformance();
    if (performance) {
      performance.on('performanceEntry', (entries) => {
        entries.forEach((entry: any) => {
          if (entry.entryType === 'render') {
            console.log(`🎨 渲染时间: ${entry.duration}ms`);
          } else if (entry.entryType === 'navigation') {
            console.log(`🧭 导航时间: ${entry.duration}ms`);
          }
        });
      });
    }
  }

  // 在H5环境下
  if (typeof window !== 'undefined') {
    performanceCollector.start();
  }
}
