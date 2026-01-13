# 本地数据库和缓存策略使用示例

本文档提供了在实际项目中使用本地数据库和缓存策略的详细示例。

## 目录

1. [课程数据缓存](#课程数据缓存)
2. [卜卦历史记录缓存](#卜卦历史记录缓存)
3. [学习进度管理](#学习进度管理)
4. [离线数据同步](#离线数据同步)
5. [完整使用场景](#完整使用场景)

---

## 课程数据缓存

### 场景: 用户学习课程时缓存课程内容

```typescript
import { cacheStrategyService } from '@/services/storage';
import { request } from '@/utils/request';

// 课程页面
export default function CoursePage({ courseId }) {
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCourse(courseId);
  }, [courseId]);

  async function loadCourse(courseId: string) {
    try {
      // 1. 先尝试从本地缓存加载
      const cachedCourse = await cacheStrategyService.getCachedCourse(courseId);

      if (cachedCourse) {
        console.log('从本地缓存加载课程');
        setCourse(cachedCourse);
        setLoading(false);
      }

      // 2. 从服务器获取最新数据
      const { data } = await request({
        url: `/courses/${courseId}`,
        method: 'GET',
      });

      if (data) {
        console.log('从服务器加载课程');
        setCourse(data);
        setLoading(false);

        // 3. 更新本地缓存
        await cacheStrategyService.cacheCourse(courseId, data);
      }
    } catch (error) {
      console.error('加载课程失败:', error);

      // 如果网络请求失败,使用缓存数据(如果有)
      const cachedCourse = await cacheStrategyService.getCachedCourse(courseId);
      if (cachedCourse) {
        setCourse(cachedCourse);
        setLoading(false);
      } else {
        Taro.showToast({ title: '加载失败,请检查网络', icon: 'none' });
      }
    }
  }

  return (
    <View>
      {loading ? <Text>加载中...</Text> : <CourseContent course={course} />}
    </View>
  );
}
```

---

## 卜卦历史记录缓存

### 场景: 卜卦后保存记录,离线时可查看历史

```typescript
import { cacheStrategyService } from '@/services/storage';
import { request } from '@/utils/request';

// 卜卦完成后保存记录
async function saveDivinationRecord(divinationResult: any) {
  try {
    // 1. 先保存到本地缓存
    const recordData = {
      _id: divinationResult.id || `local-${Date.now()}`,
      hexagram: divinationResult.hexagram,
      interpretation: divinationResult.interpretation,
      isFavorite: false,
      createdAt: new Date().toISOString(),
      syncAt: new Date().toISOString(),
    };

    await cacheStrategyService.cacheDivinationRecord(divinationResult.id, recordData);

    // 2. 尝试同步到服务器
    try {
      await request({
        url: '/divination-records',
        method: 'POST',
        data: divinationResult,
      });
      console.log('记录已同步到服务器');
    } catch (error) {
      console.log('网络不可用,记录将在恢复网络后同步');
    }
  } catch (error) {
    console.error('保存记录失败:', error);
  }
}

// 历史记录页面
export default function HistoryPage() {
  const [records, setRecords] = useState([]);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      // 1. 先从本地缓存加载
      const cachedRecords = await cacheStrategyService.getAllCachedDivinationRecords();
      setRecords(cachedRecords);

      // 2. 从服务器获取最新记录
      const { data } = await request({
        url: '/divination-records',
        method: 'GET',
      });

      if (data && data.records) {
        // 3. 更新本地缓存
        await cacheStrategyService.cacheDivinationRecords(data.records);
        setRecords(data.records);
      }
    } catch (error) {
      console.error('加载历史失败:', error);
      // 网络失败时使用缓存数据
    }
  }

  return (
    <View>
      {records.map(record => (
        <HistoryCard key={record._id} record={record} />
      ))}
    </View>
  );
}
```

---

## 学习进度管理

### 场景: 记录用户学习进度,支持离线继续学习

```typescript
import { cacheStrategyService } from '@/services/storage';

// 课程阅读器页面
export default function CourseReader({ courseId, chapterId }) {
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    loadProgress(courseId);
  }, [courseId]);

  // 加载学习进度
  async function loadProgress(courseId: string) {
    const savedProgress = await cacheStrategyService.getLearningProgress(courseId);
    if (savedProgress) {
      setProgress(savedProgress);

      // 跳转到上次阅读的章节
      if (savedProgress.lastReadChapter && !chapterId) {
        navigateToChapter(savedProgress.lastReadChapter);
      }
    }
  }

  // 更新阅读进度
  async function updateProgress(courseId: string, chapterId: string, chapterCount: number, currentChapterIndex: number) {
    const progressData = {
      courseId,
      completedChapters: progress?.completedChapters || [],
      lastReadChapter: chapterId,
      progress: Math.round(((currentChapterIndex + 1) / chapterCount) * 100),
      lastReadTime: Date.now(),
    };

    // 标记已完成的章节
    if (!progressData.completedChapters.includes(chapterId)) {
      progressData.completedChapters.push(chapterId);
    }

    await cacheStrategyService.saveLearningProgress(courseId, progressData);
    setProgress(progressData);
  }

  // 翻页时更新进度
  function handlePageChange(newChapterId: string, index: number) {
    updateProgress(courseId, newChapterId, 10, index);
  }

  return (
    <View>
      {progress && <ProgressBar progress={progress.progress} />}
      <ChapterContent onPageChange={handlePageChange} />
    </View>
  );
}
```

---

## 离线数据同步

### 场景: 网络恢复后自动同步本地数据

```typescript
import { localDBService, LocalTable } from '@/services/storage';
import { request } from '@/utils/request';

// 监听网络状态
Taro.onNetworkStatusChange((res) => {
  if (res.isConnected) {
    console.log('网络已连接,开始同步数据');
    syncPendingData();
  }
});

// 同步待上传的数据
async function syncPendingData() {
  try {
    // 1. 获取待同步的学习进度
    const pendingProgress = await localDBService.getPendingSync(LocalTable.LEARNING_PROGRESS);

    for (const progress of pendingProgress as any[]) {
      try {
        await request({
          url: `/learning-progress/${progress.data.courseId}`,
          method: 'PUT',
          data: progress.data,
        });

        // 更新为已同步
        await localDBService.updateSyncStatus(LocalTable.LEARNING_PROGRESS, progress.id, 'synced');
        console.log(`学习进度 ${progress.id} 同步成功`);
      } catch (error) {
        console.error(`学习进度 ${progress.id} 同步失败:`, error);
      }
    }

    // 2. 获取待同步的卜卦记录
    const pendingRecords = await localDBService.getPendingSync(LocalTable.DIVINATION_HISTORY);

    for (const record of pendingRecords as any[]) {
      try {
        await request({
          url: '/divination-records/sync',
          method: 'POST',
          data: record.data,
        });

        await localDBService.updateSyncStatus(LocalTable.DIVINATION_HISTORY, record.id, 'synced');
        console.log(`卜卦记录 ${record.id} 同步成功`);
      } catch (error) {
        console.error(`卜卦记录 ${record.id} 同步失败:`, error);
      }
    }

    Taro.showToast({ title: '数据同步完成', icon: 'success' });
  } catch (error) {
    console.error('同步数据失败:', error);
  }
}
```

---

## 完整使用场景

### 场景: 离线起卦功能

```typescript
import { cacheStrategyService, localDBService, LocalTable } from '@/services/storage';
import { request } from '@/utils/request';

// 离线起卦
async function offlineDivination() {
  try {
    // 1. 本地生成卦象
    const hexagram = generateHexagram();

    // 2. 本地解卦(基础解卦)
    const basicInterpretation = await getLocalBasicInterpretation(hexagram);

    const result = {
      id: `local-${Date.now()}`,
      hexagram,
      interpretation: {
        basic: basicInterpretation,
      },
      createdAt: new Date().toISOString(),
      syncAt: new Date().toISOString(),
    };

    // 3. 保存到本地
    await cacheStrategyService.cacheDivinationRecord(result.id, result);

    // 4. 检查网络状态,决定是否显示详细解卦
    const networkStatus = await Taro.getNetworkType();

    if (networkStatus.networkType !== 'none') {
      // 在线:获取详细解卦
      try {
        const { data } = await request({
          url: '/divination/detailed',
          method: 'POST',
          data: {
            hexagram: result.hexagram,
          },
        });

        result.interpretation.detailed = data.detailed;

        // 更新本地缓存
        await cacheStrategyService.cacheDivinationRecord(result.id, result);
      } catch (error) {
        console.error('获取详细解卦失败:', error);
      }
    } else {
      // 离线:提示用户
      Taro.showToast({
        title: '当前离线,仅显示基础解卦',
        icon: 'none',
      });
    }

    return result;
  } catch (error) {
    console.error('离线起卦失败:', error);
    throw error;
  }
}

// 查看历史记录
async function viewHistory() {
  // 1. 先从本地加载
  const localRecords = await cacheStrategyService.getAllCachedDivinationRecords();
  displayRecords(localRecords);

  // 2. 尝试从服务器同步最新记录
  try {
    const { data } = await request({
      url: '/divination-records',
      method: 'GET',
    });

    if (data.records) {
      // 合并本地和服务器记录
      const mergedRecords = mergeRecords(localRecords, data.records);
      await cacheStrategyService.cacheDivinationRecords(mergedRecords);
      displayRecords(mergedRecords);
    }
  } catch (error) {
    console.log('离线模式,使用本地数据');
  }
}
```

---

## 缓存管理工具

### 场景: 提供缓存管理功能给用户

```typescript
import { cacheStrategyService } from '@/services/storage';

// 设置页面
export default function SettingsPage() {
  const [cacheStats, setCacheStats] = useState(null);

  useEffect(() => {
    loadCacheStats();
  }, []);

  async function loadCacheStats() {
    const stats = await cacheStrategyService.getCacheStats();
    setCacheStats(stats);
  }

  // 清理缓存
  async function clearCache() {
    Taro.showModal({
      title: '确认清理',
      content: '清理后需要重新加载数据,是否继续?',
      success: async (res) => {
        if (res.confirm) {
          Taro.showLoading({ title: '清理中...' });

          await cacheStrategyService.clearAllCache();

          Taro.hideLoading();
          Taro.showToast({ title: '清理完成', icon: 'success' });

          await loadCacheStats();
        }
      },
    });
  }

  return (
    <View>
      <Text>缓存统计</Text>
      {cacheStats && (
        <View>
          <Text>课程: {cacheStats.courses.count} / {cacheStats.courses.maxSize}</Text>
          <Text>历史记录: {cacheStats.divination_history.count} / {cacheStats.divination_history.maxSize}</Text>
          <Text>学习进度: {cacheStats.learning_progress.count} / {cacheStats.learning_progress.maxSize}</Text>
        </View>
      )}

      <Button onClick={clearCache}>清理缓存</Button>
    </View>
  );
}
```

---

## 最佳实践总结

1. **先读缓存,再请求网络**: 提升用户体验,实现离线可用
2. **网络请求成功后更新缓存**: 保证数据一致性
3. **监听网络状态变化**: 自动同步待上传数据
4. **提供缓存管理功能**: 让用户控制缓存使用
5. **合理设置缓存策略**: 根据数据特点选择合适的淘汰策略
6. **处理缓存失效**: 优雅降级,避免影响用户体验
