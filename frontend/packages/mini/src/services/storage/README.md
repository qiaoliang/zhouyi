# 本地数据库服务

基于微信小程序 Storage API 实现的离线数据存储解决方案。

## 功能特性

- ✅ **数据持久化**: 基于 wx.setStorage API,数据永久保存(除非手动删除)
- ✅ **过期管理**: 支持设置数据过期时间,自动清理过期数据
- ✅ **表结构管理**: 提供类似数据库的表操作(增删改查)
- ✅ **同步状态管理**: 内置同步状态跟踪,支持离线数据同步
- ✅ **类型安全**: 完整的 TypeScript 类型支持
- ✅ **线程安全**: 单例模式确保线程安全
- ✅ **错误处理**: 完善的错误处理机制

## 架构设计

```
┌─────────────────────────────────────────┐
│         应用层 (Pages/Components)        │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│          LocalDBService                 │
│  (表管理、CRUD操作、同步状态管理)          │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│          StorageService                 │
│  (数据存储、过期管理、版本控制)           │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│       微信小程序 Storage API             │
│  (wx.setStorage, wx.getStorage, etc)    │
└─────────────────────────────────────────┘
```

## 数据表定义

| 表名 | 枚举值 | 说明 | 典型数据 |
|-----|--------|------|---------|
| 课程表 | `LocalTable.COURSES` | 缓存已学习的课程内容 | 课程数据、章节内容 |
| 学习进度表 | `LocalTable.LEARNING_PROGRESS` | 记录学习进度 | 已读章节、学习时长 |
| 卜卦历史表 | `LocalTable.DIVINATION_HISTORY` | 离线卜卦记录 | 卦象、解卦结果 |
| 用户配置表 | `LocalTable.USER_CONFIG` | 用户配置数据 | 设置项、偏好配置 |
| 卦象数据表 | `LocalTable.HEXAGRAM_DATA` | 缓存卦象基础数据 | 六十四卦数据 |

## 使用示例

### 1. 基础存储操作

```typescript
import { storageService } from '@/services/storage';

// 存储数据
await storageService.set('user-token', 'abc123');

// 获取数据
const token = await storageService.get<string>('user-token');

// 删除数据
await storageService.remove('user-token');

// 清空所有数据
await storageService.clear();
```

### 2. 带过期时间的存储

```typescript
import { storageService } from '@/services/storage';

// 缓存数据,60秒后过期
await storageService.setWithExpire('api-cache', data, 60);

// 存储数据,指定具体的过期时间戳
await storageService.set('key', data, {
  expire: Date.now() + 60000 // 1分钟后过期
});
```

### 3. 表操作(增删改查)

```typescript
import { localDBService, LocalTable } from '@/services/storage';

// 插入课程数据
await localDBService.upsert(
  LocalTable.COURSES,
  'course-123',
  {
    title: '周易入门',
    content: '...',
    chapters: [...]
  }
);

// 获取所有课程
const courses = await localDBService.getAll(LocalTable.COURSES);

// 根据ID获取课程
const course = await localDBService.getById(LocalTable.COURSES, 'course-123');

// 删除课程
await localDBService.delete(LocalTable.COURSES, 'course-123');

// 清空课程表
await localDBService.clearTable(LocalTable.COURSES);
```

### 4. 查询操作

```typescript
import { localDBService, LocalTable } from '@/services/storage';

// 获取待同步的数据
const pendingItems = await localDBService.getPendingSync(LocalTable.DIVINATION_HISTORY);

// 高级查询
const results = await localDBService.query(LocalTable.DIVINATION_HISTORY, {
  syncStatus: 'pending',
  createdAtGreaterThan: Date.now() - 86400000, // 最近24小时
  limit: 10
});
```

### 5. 同步状态管理

```typescript
import { localDBService, LocalTable } from '@/services/storage';

// 更新单条记录的同步状态
await localDBService.updateSyncStatus(
  LocalTable.DIVINATION_HISTORY,
  'record-123',
  'synced'
);

// 批量更新同步状态
await localDBService.batchUpdateSyncStatus(
  LocalTable.DIVINATION_HISTORY,
  ['record-1', 'record-2', 'record-3'],
  'synced'
);
```

### 6. 获取存储统计信息

```typescript
import { localDBService } from '@/services/storage';

// 获取数据库统计信息
const stats = await localDBService.getStats();
console.log(stats);
// 输出:
// {
//   courses: 10,
//   divination_history: 25,
//   currentSize: 1024000,
//   limitSize: 10485760
// }
```

## 数据结构

### LocalData 接口

所有存储的数据都包含以下元数据:

```typescript
interface LocalData<T> {
  id: string;              // 唯一标识
  data: T;                 // 实际数据
  createdAt: number;       // 创建时间(毫秒时间戳)
  updatedAt: number;       // 更新时间(毫秒时间戳)
  syncStatus?: 'synced' | 'pending' | 'conflict'; // 同步状态
}
```

### 同步状态说明

- `synced`: 数据已与服务器同步
- `pending`: 数据已修改,等待同步到服务器
- `conflict`: 数据冲突,需要手动解决

## 最佳实践

### 1. 合理使用过期时间

```typescript
// ✅ 推荐:为缓存数据设置过期时间
await localDBService.upsert(LocalTable.COURSES, id, data);

// ❌ 不推荐:永久存储大量数据
await storageService.set('huge-data', largeData);
```

### 2. 及时清理不需要的数据

```typescript
// 删除已读课程以节省空间
await localDBService.delete(LocalTable.COURSES, courseId);
```

### 3. 使用同步状态管理离线数据

```typescript
// 新增数据时标记为 pending
await localDBService.upsert(table, id, data, 'pending');

// 同步成功后更新为 synced
await localDBService.updateSyncStatus(table, id, 'synced');
```

### 4. 错误处理

```typescript
import { storageService } from '@/services/storage';

try {
  const data = await storageService.get('key');
  if (data) {
    // 处理数据
  } else {
    // 数据不存在或已过期
  }
} catch (error) {
  console.error('读取数据失败:', error);
  // 降级处理
}
```

## 性能优化

1. **批量操作**: 尽量使用批量操作减少存储次数
2. **数据压缩**: 对于大数据,考虑压缩后存储
3. **索引策略**: 使用有意义的 ID 以便快速查找
4. **缓存策略**: 合理设置过期时间,避免存储空间浪费

## 存储限制

- 微信小程序 Storage 限制: **10MB**
- 单个 key 限制: **1MB**
- 建议定期清理过期数据

## 测试

运行单元测试:

```bash
npm test src/services/storage/__tests__
```

## 注意事项

1. ⚠️ **不要存储敏感信息**: Storage 不加密,避免存储用户密码等敏感数据
2. ⚠️ **数据版本**: 修改数据结构时要考虑版本兼容
3. ⚠️ **并发控制**: 虽然 Storage API 是异步的,但仍需注意并发读写
4. ⚠️ **空间管理**: 定期检查存储使用情况,避免超出限制

## 未来扩展

- [ ] 支持数据加密存储
- [ ] 实现更复杂的查询索引
- [ ] 添加数据迁移工具
- [ ] 支持更高级的缓存策略(LRU/LFU)
