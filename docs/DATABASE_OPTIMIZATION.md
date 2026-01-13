# 数据库优化指南

本文档说明如何优化数据库查询性能,确保支持1000+并发用户。

## 目录

1. [连接池优化](#连接池优化)
2. [查询优化](#查询优化)
3. [索引管理](#索引管理)
4. [慢查询分析](#慢查询分析)
5. [性能监控](#性能监控)
6. [最佳实践](#最佳实践)

---

## 连接池优化

### 1. 配置连接池

数据库连接池配置会根据环境自动调整:

```typescript
import { getDatabasePoolConfig, buildMongoUri } from '@/config/database-optimization.config';

// 获取当前环境的连接池配置
const poolConfig = getDatabasePoolConfig();

console.log('连接池配置:', poolConfig);
// {
//   maxPoolSize: 21,        // 最大连接数
//   minPoolSize: 8,         // 最小连接数
//   maxIdleTimeMS: 30000,   // 最大空闲时间
//   ...
// }

// 构建优化的MongoDB URI
const mongoUri = buildMongoUri();
```

### 2. 环境变量配置

可以通过环境变量自定义连接池配置:

```bash
# MongoDB连接
MONGODB_HOST=localhost
MONGODB_PORT=27017
MONGODB_DATABASE=zhouyi
MONGODB_USERNAME=username
MONGODB_PASSWORD=password

# 连接池配置(可选,会自动计算)
MAX_POOL_SIZE=21
MIN_POOL_SIZE=8

# 健康检查
DB_HEALTH_CHECK_ENABLED=true
DB_HEALTH_CHECK_INTERVAL=30000
DB_HEALTH_CHECK_TIMEOUT=5000

# 监控配置
SLOW_QUERY_THRESHOLD=100
ENABLE_QUERY_LOGGING=true
ENABLE_DB_METRICS=true
```

### 3. 连接池监控

```typescript
import { poolMonitor } from '@/config/database-optimization.config';

// 检查连接池状态
const status = await poolMonitor.checkPoolStatus(connection);

console.log('连接池状态:', status);
// {
//   status: 'healthy',
//   poolSize: 10,
//   activeConnections: 3,
//   waitingQueue: 0,
// }

// 获取优化建议
const recommendation = poolMonitor.getRecommendation();
console.log(recommendation);
```

---

## 查询优化

### 1. 使用查询优化器

```typescript
import { QueryOptimizerService } from '@/common/database/query-optimizer.service';

@Injectable()
export class DivinationService {
  constructor(
    private queryOptimizer: QueryOptimizerService,
    @InjectModel('DivinationRecord')
    private divinationModel: Model<DivinationRecord>,
  ) {}

  async getUserRecords(userId: string) {
    // 使用查询优化器包装查询
    return this.queryOptimizer.trackQuery(
      'getUserRecords',
      'divination_records',
      () => this.divinationModel.find({ userId }).sort({ createdAt: -1 }).exec()
    );
  }
}
```

### 2. 优化查询条件

```typescript
import { QueryOptimizerService } from '@/common/database/query-optimizer.service';

// 原始查询
const filter = {
  userId: '123',
  status: null,  // 空值
  createdAt: { $gte: Date.now() - 86400000 },
};

// 优化后的查询
const optimized = queryOptimizer.optimizeQuery(filter);
// {
//   userId: '123',
//   createdAt: { $gte: Date.now() - 86400000 },
//   // status 已被移除
// }
```

### 3. 分页查询优化

```typescript
import { QueryOptimizerService } from '@/common/database/query-optimizer.service';

// 传统分页(skip + limit)
const page1 = queryOptimizer.createPaginationQuery(
  model,
  { userId: '123' },
  { page: 1, limit: 10, sort: { createdAt: -1 } }
);

// 基于键的分页(性能更好)
const page2 = queryOptimizer.createKeyBasedPaginationQuery(
  model,
  { userId: '123' },
  { lastId: '507f1f77bcf86cd799439011', limit: 10 }
);
```

### 4. 批量查询优化

```typescript
import { QueryOptimizerService } from '@/common/database/query-optimizer.service';

// 批量查询,自动分批
const records = await queryOptimizer.batchFind(
  model,
  ['id1', 'id2', 'id3', ...],
  { batchSize: 100 } // 每批100条
);
```

### 5. 使用装饰器优化查询

```typescript
import { OptimizeQuery } from '@/common/database/query-optimizer.service';

@Injectable()
export class UserService {
  @OptimizeQuery('users')
  async findByEmail(email: string) {
    return this.userModel.findOne({ email });
  }

  // 查询会自动被跟踪和记录性能
}
```

---

## 索引管理

### 1. 创建索引

```typescript
import { IndexManagerService } from '@/common/database/index-manager.service';

@Injectable()
export class DatabaseSetupService {
  constructor(
    private indexManager: IndexManagerService,
    @InjectModel('DivinationRecord')
    private divinationModel: Model<DivinationRecord>,
  ) {}

  async setupIndexes() {
    // 单字段索引
    await this.indexManager.createSingleFieldIndex(
      this.divinationModel,
      'userId'
    );

    // 复合索引
    await this.indexManager.createCompoundIndex(
      this.divinationModel,
      { userId: 1, createdAt: -1 }
    );

    // 唯一索引
    await this.indexManager.createSingleFieldIndex(
      this.userModel,
      'email',
      { unique: true }
    );

    // TTL索引(自动过期)
    await this.indexManager.createTTLIndex(
      this.divinationModel,
      'createdAt',
      30 * 24 * 60 * 60 // 30天
    );

    // 文本索引
    await this.indexManager.createTextIndex(
      this.courseModel,
      ['title', 'description'],
      { weights: { title: 10, description: 5 } }
    );
  }
}
```

### 2. 自动创建常用索引

```typescript
import { IndexManagerService } from '@/common/database/index-manager.service';

// 为常用集合自动创建索引
await indexManager.ensureCommonIndexes(divinationModel);
await indexManager.ensureCommonIndexes(userModel);
await indexManager.ensureCommonIndexes(courseModel);
```

### 3. 查看索引信息

```typescript
import { IndexManagerService } from '@/common/database/index-manager.service';

// 获取所有索引
const indexes = await indexManager.getIndexes(divinationModel);

console.log('索引列表:', indexes);
// [
//   { name: '_id_', keys: { _id: 1 } },
//   { name: 'userId_1', keys: { userId: 1 } },
//   ...
// ]

// 获取索引统计
const stats = await indexManager.getIndexStats(divinationModel);

console.log('索引统计:', stats);
// {
//   collection: 'divination_records',
//   indexCount: 5,
//   totalSize: 40960,
//   indexes: [...]
// }
```

### 4. 删除索引

```typescript
// 删除单个索引
await indexManager.dropIndex(model, 'old_index_name');

// 删除所有索引(除了_id)
await indexManager.dropAllIndexes(model);

// 重建索引
await indexManager.rebuildIndex(model, 'userId_1');
```

---

## 慢查询分析

### 1. 分析查询性能

```typescript
import { QueryOptimizerService } from '@/common/database/query-optimizer.service';

// 分析查询执行计划
const analysis = await queryOptimizer.analyzeQuery(
  model,
  { userId: '123', isFavorite: true }
);

console.log('查询分析:', analysis);
// {
//   executionTimeMillis: 5,
//   totalDocsExamined: 100,
//   totalKeysExamined: 100,
//   indexUsed: 'userId_1',
//   executionStages: {...}
// }
```

### 2. 获取索引建议

```typescript
import { QueryOptimizerService } from '@/common/database/query-optimizer.service';

// 根据查询模式获取索引建议
const queryPatterns = [
  { userId: '123' },
  { userId: '123', createdAt: { $gte: Date.now() - 86400000 } },
  { guestId: '456' },
  { isFavorite: true },
];

const suggestions = queryOptimizer.getIndexSuggestions(
  'divination_records',
  queryPatterns
);

console.log('索引建议:', suggestions);
// [
//   {
//     collection: 'divination_records',
//     field: 'userId',
//     type: 'single',
//     priority: 'high',
//     reason: '字段 userId 在 10 次查询中使用'
//   }
// ]
```

### 3. 慢查询日志

慢查询会自动记录:

```typescript
// 查询执行时间超过100ms会被记录为慢查询
const result = await queryOptimizer.trackQuery(
  'slowOperation',
  'collection',
  async () => {
    // 模拟慢查询
    await new Promise(resolve => setTimeout(resolve, 150));
    return data;
  }
);

// 控制台会输出警告:
// 慢查询检测: collection.slowOperation 耗时 150ms
```

---

## 性能监控

### 1. 查询统计

```typescript
import { QueryOptimizerService } from '@/common/database/query-optimizer.service';

// 获取查询统计
const stats = queryOptimizer.getQueryStats();

console.log('查询统计:', stats);
// {
//   totalQueries: 1000,
//   slowQueries: 5,
//   avgExecutionTime: 25,
//   collections: ['divination_records', 'users', 'courses']
// }
```

### 2. 生成性能报告

```typescript
import { QueryOptimizerService } from '@/common/database/query-optimizer.service';

// 生成详细的性能报告
const report = queryOptimizer.generatePerformanceReport();

console.log(report);
// === 数据库查询性能报告 ===
// 总查询数: 1000
// 慢查询数: 5
// 平均执行时间: 25ms
// 涉及集合: divination_records, users, courses
//
// === 慢查询列表 ===
// - divination_records.getUserRecords: 150ms
// - users.findByEmail: 120ms
```

### 3. 索引使用报告

```typescript
import { IndexManagerService } from '@/common/database/index-manager.service';

// 分析查询模式
indexManager.analyzeIndexUsage(model, queryPatterns);

// 生成索引使用报告
const report = indexManager.getIndexUsageReport();
console.log(report);
// === 索引使用报告 ===
// divination_records.userId:
//   使用次数: 150
//   最后访问: 2026-01-13T10:30:00.000Z
```

---

## 最佳实践

### 1. 查询优化

```typescript
// ❌ 不推荐:全表扫描
const users = await userModel.find({ role: 'admin' });

// ✅ 推荐:使用索引
const users = await userModel.find({ role: 'admin' }).hint('role_1');

// ❌ 不推荐:大量数据一次性加载
const all = await bigCollection.find({}).exec();

// ✅ 推荐:分页加载
const page1 = await bigCollection.find({}).skip(0).limit(100).exec();

// ❌ 不推荐:返回所有字段
const users = await userModel.find({}).select('-password');

// ✅ 推荐:只返回需要的字段
const users = await userModel.find({}).select('name email').exec();
```

### 2. 索引策略

```typescript
// 为高频查询字段创建索引
await indexManager.createSingleFieldIndex(model, 'userId');

// 为排序字段创建索引
await indexManager.createSingleFieldIndex(model, 'createdAt', { name: 'createdAt_-1' });

// 为常用查询组合创建复合索引
await indexManager.createCompoundIndex(model, {
  userId: 1,
  createdAt: -1,
  isFavorite: 1,
});

// 为文本搜索创建文本索引
await indexManager.createTextIndex(model, ['title', 'description']);

// 为自动清理数据创建TTL索引
await indexManager.createTTLIndex(model, 'createdAt', 30 * 24 * 60 * 60);
```

### 3. 连接池管理

```typescript
// 根据负载调整连接池大小
const cpuCount = require('os').cpus().length;

const config = {
  maxPoolSize: cpuCount * 2 + 1,  // CPU核心数 * 2 + 1
  minPoolSize: cpuCount,            // CPU核心数
  maxIdleTimeMS: 30000,            // 30秒
};

// 定期检查连接池状态
setInterval(async () => {
  const status = await poolMonitor.checkPoolStatus(connection);
  if (status.status === 'degraded') {
    console.warn('连接池使用率过高,考虑增加 maxPoolSize');
  }
}, 60000); // 每分钟检查一次
```

### 4. 缓存策略

```typescript
// 使用Redis缓存查询结果
const cacheKey = `user:${userId}`;

// 先查缓存
let user = await redis.get(cacheKey);

if (!user) {
  // 缓存未命中,查询数据库
  user = await userModel.findById(userId);

  // 写入缓存
  await redis.setex(cacheKey, 3600, JSON.stringify(user));
}

return JSON.parse(user);
```

---

## 性能目标

| 指标 | 目标值 | 说明 |
|-----|-------|------|
| 平均查询时间 | < 50ms | 常规查询的响应时间 |
| 慢查询阈值 | < 100ms | 超过此时间需要优化 |
| 连接池使用率 | < 90% | 活跃连接占比 |
| 并发连接数 | 1000+ | 支持的并发用户数 |
| 索引命中率 | > 95% | 使用索引的查询比例 |
| 缓存命中率 | > 80% | Redis缓存命中率 |

---

## 故障排查

### 问题: 查询慢

1. **检查执行计划**:
```typescript
const analysis = await queryOptimizer.analyzeQuery(model, filter);
console.log(analysis);
```

2. **检查是否使用索引**:
```typescript
if (!analysis.indexUsed || analysis.indexUsed === '_id_') {
  console.warn('查询未使用索引');
}
```

3. **添加合适的索引**:
```typescript
await indexManager.createSingleFieldIndex(model, field);
```

### 问题: 连接池耗尽

1. **检查连接池状态**:
```typescript
const status = await poolMonitor.checkPoolStatus(connection);
console.log(status);
```

2. **增加连接池大小**:
```bash
MAX_POOL_SIZE=50
```

3. **检查是否有连接泄漏**:
```typescript
// 确保正确关闭连接
await connection.close();
```

### 问题: 内存占用高

1. **限制返回字段**:
```typescript
const users = await userModel.find({}).select('name email').exec();
```

2. **使用流式处理**:
```typescript
const stream = userModel.find().cursor();
for await (const doc of stream) {
  // 处理文档
}
```

3. **定期清理数据**:
```typescript
// 使用TTL索引自动清理
await indexManager.createTTLIndex(model, 'createdAt', 30 * 24 * 60 * 60);
```
