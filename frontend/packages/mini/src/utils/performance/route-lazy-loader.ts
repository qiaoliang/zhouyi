/**
 * 路由懒加载工具
 * 实现页面和组件的按需加载
 */

import { ComponentType } from 'react';

/**
 * 路由懒加载包装器
 * @param loader 组件加载函数
 * @param fallback 加载中的占位组件
 */
export function lazyLoadComponent<T extends ComponentType<any>>(
  loader: () => Promise<{ default: T }>,
  fallback?: ComponentType<any>
): ComponentType<any> {
  return (props: any) => {
    const [Component, setComponent] = useState<T | null>(null);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
      loader()
        .then((module) => {
          setComponent(() => module.default);
        })
        .catch((err) => {
          console.error('组件加载失败:', err);
          setError(err);
        });
    }, []);

    if (error) {
      // TODO: 显示错误组件
      return null;
    }

    if (!Component) {
      // 显示加载占位符
      return fallback ? React.createElement(fallback) : null;
    }

    return React.createElement(Component, props);
  };
}

/**
 * 预加载路由组件
 * @param routes 路由配置
 */
export function preloadRoutes(routes: string[]) {
  // 根据路由预加载对应的页面组件
  routes.forEach((route) => {
    import(`@/pages/${route}/index`).catch((err) => {
      console.warn(`预加载路由 ${route} 失败:`, err);
    });
  });
}

/**
 * 预加载组件
 * @param componentPath 组件路径
 */
export function preloadComponent(componentPath: string): Promise<void> {
  return import(`@/${componentPath}`).catch((err) => {
    console.warn(`预加载组件 ${componentPath} 失败:`, err);
  });
}

/**
 * 页面可见性预加载
 * 当用户在当前页面时,预加载可能访问的下一个页面
 */
export class VisibilityPreloader {
  private preloadedRoutes = new Set<string>();

  /**
   * 注册页面预加载规则
   * @param currentRoute 当前页面路由
   * @param nextRoutes 可能访问的下一个页面路由列表
   */
  register(currentRoute: string, nextRoutes: string[]) {
    // 监听页面显示事件
    Taro.onAppShow(() => {
      const pages = Taro.getCurrentPages();
      const currentPage = pages[pages.length - 1];
      const route = currentPage.route || '';

      if (route === currentRoute) {
        this.preloadNextPages(nextRoutes);
      }
    });
  }

  /**
   * 预加载下一个可能访问的页面
   */
  private preloadNextPages(routes: string[]) {
    routes.forEach((route) => {
      if (!this.preloadedRoutes.has(route)) {
        console.log(`预加载页面: ${route}`);
        import(`@/pages/${route}/index`)
          .then(() => {
            console.log(`预加载成功: ${route}`);
            this.preloadedRoutes.add(route);
          })
          .catch((err) => {
            console.warn(`预加载失败 ${route}:`, err);
          });
      }
    });
  }

  /**
   * 清除预加载缓存
   */
  clear() {
    this.preloadedRoutes.clear();
  }
}

/**
 * 智能预加载策略
 * 根据用户行为预测并预加载可能访问的页面
 */
export class SmartPreloader {
  private visibilityPreloader: VisibilityPreloader;
  private userBehaviorMap = new Map<string, number>();

  constructor() {
    this.visibilityPreloader = new VisibilityPreloader();
  }

  /**
   * 初始化智能预加载
   */
  init() {
    // 注册常见页面的预加载规则
    this.visibilityPreloader.register(
      'pages/course-list/index',
      ['pages/course-reader/index', 'pages/learning/index']
    );

    this.visibilityPreloader.register(
      'pages/divination/index',
      ['pages/detailed-divination/index', 'pages/history/index']
    );

    this.visibilityPreloader.register(
      'pages/profile/index',
      ['pages/history/index', 'pages/learning/index']
    );

    // 追踪用户行为
    this.trackUserBehavior();
  }

  /**
   * 追踪用户行为
   */
  private trackUserBehavior() {
    // 记录用户访问过的页面
    Taro.onAppShow(() => {
      const pages = Taro.getCurrentPages();
      const currentPage = pages[pages.length - 1];
      const route = currentPage.route || '';

      const count = this.userBehaviorMap.get(route) || 0;
      this.userBehaviorMap.set(route, count + 1);

      // 如果用户经常访问某个页面,预加载其相关页面
      if (count >= 3) {
        this.preloadRelatedPages(route);
      }
    });
  }

  /**
   * 预加载相关页面
   */
  private preloadRelatedPages(route: string) {
    const relatedPagesMap: Record<string, string[]> = {
      'pages/course-list/index': ['pages/course-reader/index'],
      'pages/divination/index': ['pages/detailed-divination/index'],
      'pages/history/index': ['pages/detailed-divination/index'],
    };

    const relatedPages = relatedPagesMap[route];
    if (relatedPages) {
      preloadRoutes(relatedPages);
    }
  }
}

// 导出单例
export const smartPreloader = new SmartPreloader();
