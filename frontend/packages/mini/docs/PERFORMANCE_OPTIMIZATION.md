# 前端性能优化指南

本文档说明如何在前端项目中实施性能优化,确保页面加载时间小于2秒。

## 目录

1. [优化配置](#优化配置)
2. [图片优化](#图片优化)
3. [代码分割](#代码分割)
4. [懒加载](#懒加载)
5. [性能监控](#性能监控)
6. [CDN配置](#cdn配置)
7. [最佳实践](#最佳实践)

---

## 优化配置

### 1. 启用 Webpack 优化

在 `config/index.ts` 中启用优化配置:

```typescript
import { getOptimizationConfig } from './webpack.optimization';

export default {
  // ...其他配置
  compiler: {
    type: 'webpack5',
    prebundle: {
      enable: false
    }
  },
  // 应用优化配置
  ...getOptimizationConfig(),
}
```

### 2. 启用持久化缓存

```typescript
cache: {
  type: 'filesystem', // 文件系统缓存
  buildDependencies: {
    config: [__filename],
  },
}
```

---

## 图片优化

### 使用优化的图片组件

```tsx
import OptimizedImage from '@/components/OptimizedImage';

function CoursePage({ course }) {
  return (
    <View>
      {/* 自动懒加载、WebP支持、响应式加载 */}
      <OptimizedImage
        src={course.coverImage}
        width={750}
        height={400}
        quality={85}
        mode="aspectFill"
        lazy={true}
        onLoad={() => console.log('图片加载完成')}
        onError={() => console.log('图片加载失败')}
      />
    </View>
  );
}
```

### 手动使用图片优化工具

```typescript
import { ImageOptimizer } from '@/config/webpack.optimization';

// 生成响应式图片URL
const optimizedUrl = ImageOptimizer.getResponsiveUrl(
  'https://example.com/image.jpg',
  750, // 宽度
  80   // 质量
);

// 生成WebP URL
const webpUrl = ImageOptimizer.getWebPUrl('https://example.com/image.jpg');

// 检查WebP支持
const supportsWebP = await ImageOptimizer.checkWebPSupport();
```

---

## 代码分割

### 路由懒加载

```typescript
// app.config.ts
export default {
  pages: [
    'pages/index/index',
    'pages/divination/index',
    'pages/learning/index',
    'pages/history/index',
    'pages/profile/index',
  ],
  // 自动分包配置
  subPackages: [
    {
      root: 'pages/course',
      pages: [
        'course-list/index',
        'course-reader/index',
      ],
    },
    {
      root: 'pages/divination',
      pages: [
        'detailed-divination/index',
        'precise-form/index',
      ],
    },
  ],
}
```

### 组件懒加载

```typescript
import { lazyLoadComponent } from '@/utils/performance/route-lazy-loader';

// 懒加载重型组件
const HeavyChart = lazyLoadComponent(
  () => import('@/components/HeavyChart'),
  () => <View>加载中...</View>
);

function Dashboard() {
  return (
    <View>
      <HeavyChart data={chartData} />
    </View>
  );
}
```

---

## 懒加载

### 路由预加载

```typescript
import { smartPreloader } from '@/utils/performance/route-lazy-loader';

// 在 app.ts 中初始化
class App extends Component {
  onLaunch() {
    // 初始化智能预加载
    smartPreloader.init();
  }
}
```

### 手动预加载

```typescript
import { preloadRoutes, preloadComponent } from '@/utils/performance/route-lazy-loader';

// 预加载特定路由
preloadRoutes(['pages/course-reader/index', 'pages/learning/index']);

// 预加载组件
preloadComponent('components/OptimizedImage');
```

---

## 性能监控

### 初始化监控

在 `app.ts` 中初始化性能监控:

```typescript
import { initPerformanceMonitoring } from '@/utils/performance/performance-monitor';

class App extends Component {
  onLaunch() {
    // 初始化性能监控
    initPerformanceMonitoring();
  }
}
```

### 监控页面加载

```typescript
import { miniProgramMonitor } from '@/utils/performance/performance-monitor';

export default function CoursePage() {
  useEffect(() => {
    // 开始监控
    miniProgramMonitor.start();

    return () => {
      // 结束监控
      miniProgramMonitor.end('课程页面加载');
    };
  }, []);

  return <View>...</View>;
}
```

### 监控网络请求

```typescript
import { miniProgramMonitor } from '@/utils/performance/performance-monitor';

async function loadCourse(courseId: string) {
  const monitor = miniProgramMonitor.monitorRequest('/api/courses/' + courseId);

  try {
    const data = await fetchCourse(courseId);
    monitor.end(true); // 成功
    return data;
  } catch (error) {
    monitor.end(false); // 失败
    throw error;
  }
}
```

### 查看性能指标

```typescript
import { performanceCollector } from '@/utils/performance/performance-monitor';

// 获取当前性能指标
const metrics = performanceCollector.getMetrics();

console.log('页面性能:', metrics);
// {
//   pageLoadTime: 1850,
//   firstContentfulPaint: 800,
//   domReadyTime: 1200,
//   totalLoadTime: 1850,
// }
```

---

## CDN配置

### 配置静态资源CDN

在 `config/index.ts` 中配置:

```typescript
export default {
  h5: {
    publicPath: process.env.CDN_URL || 'https://cdn.zhouyi.com/static/',
    staticDirectory: 'static',
  }
}
```

### 使用CDN加速图片

```typescript
// 将图片上传到CDN后使用
const cdnUrl = 'https://cdn.zhouyi.com/images/course-cover.webp';

<OptimizedImage src={cdnUrl} width={750} height={400} />
```

---

## 最佳实践

### 1. 资源加载优先级

```typescript
// 高优先级:首屏必需资源
const priorityResources = [
  '/static/css/main.css',
  '/static/js/main.js',
];

// 中优先级:用户可能访问的资源
const mediumPriorityResources = [
  '/static/images/icons.svg',
];

// 低优先级:用户很少访问的资源
const lowPriorityResources = [
  '/static/js/charts.js',
];
```

### 2. 避免重复请求

```typescript
// 使用请求缓存
const cache = new Map();

async function fetchWithCache(url: string) {
  if (cache.has(url)) {
    return cache.get(url);
  }

  const data = await fetch(url);
  cache.set(url, data);
  return data;
}
```

### 3. 压缩数据

```typescript
// 使用gzip压缩
fetch('/api/data', {
  headers: {
    'Accept-Encoding': 'gzip, deflate, br',
  },
});

// 使用更紧凑的数据格式
const compact = {
  // ❌ 不推荐
  userFirstName: 'John',
  userLastName: 'Doe',

  // ✅ 推荐
  fn: 'John',
  ln: 'Doe',
};
```

### 4. 优化列表渲染

```typescript
// 使用虚拟列表处理长列表
import VirtualList from '@tarojs/components/virtual-list';

function LongList({ items }) {
  return (
    <VirtualList
      items={items}
      itemHeight={100}
      renderItem={(item) => <ListItem data={item} />}
    />
  );
}
```

### 5. 防抖和节流

```typescript
import { debounce, throttle } from 'lodash';

// 搜索输入防抖
const handleSearch = debounce((query) => {
  search(query);
}, 300);

// 滚动事件节流
const handleScroll = throttle((event) => {
  updateScrollPosition(event);
}, 100);
```

---

## 性能检查清单

### 构建时检查

- [ ] 启用 Webpack 持久化缓存
- [ ] 配置代码分割
- [ ] 启用 Terser 压缩
- [ ] 启用 CSS 压缩
- [ ] 移除 console.log
- [ ] 生成 source map(仅开发环境)

### 运行时检查

- [ ] 页面加载时间 < 2秒
- [ ] 首次内容绘制 < 1秒
- [ ] 所有资源使用懒加载
- [ ] 图片使用 WebP 格式
- [ ] 大图片已压缩
- [ ] 第三方库已分离

### 监控检查

- [ ] 性能监控已初始化
- [ ] 慢请求有警告
- [ ] 性能指标已记录
- [ ] 错误已上报

---

## 性能优化工具

### 1. Lighthouse

```bash
# 安装 Lighthouse
npm install -g lighthouse

# 运行 Lighthouse
lighthouse https://your-site.com --view
```

### 2. Webpack Bundle Analyzer

```bash
# 安装插件
npm install --save-dev webpack-bundle-analyzer

# 在 config/index.ts 中配置
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

export default {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
    }),
  ],
}
```

### 3. 小程序性能分析

使用微信开发者工具的性能面板:
- 开发者工具 → 性能监控 → 开始记录
- 执行操作
- 停止记录并分析

---

## 性能目标

| 指标 | 目标值 | 说明 |
|-----|-------|------|
| 页面加载时间 | < 2秒 | 从导航到页面完全加载 |
| 首次内容绘制 | < 1秒 | 首屏内容可见 |
| DOM就绪时间 | < 1.5秒 | DOM可交互 |
| 总加载时间 | < 2秒 | 所有资源加载完成 |
| 图片大小 | < 100KB | 单张图片压缩后大小 |
| JavaScript包 | < 500KB | 主要JS包大小 |

---

## 故障排查

### 问题: 页面加载慢

1. 检查网络请求:
```javascript
console.log(performance.getEntriesByType('resource'));
```

2. 检查JavaScript执行:
```javascript
console.log(performance.getEntriesByType('measure'));
```

3. 使用 Webpack Bundle Analyzer 找出大文件

### 问题: 图片加载慢

1. 检查图片大小
2. 使用 WebP 格式
3. 启用图片懒加载
4. 使用CDN加速

### 问题: 白屏时间长

1. 检查首屏资源
2. 优化关键渲染路径
3. 使用骨架屏
4. 预加载关键资源
