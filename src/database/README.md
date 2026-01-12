# 数据库模型

## 概述

本目录包含周易通APP的所有 MongoDB 数据库模型（Mongoose Schemas）。

## 数据库结构

### 已实现的 Schema

| Schema | 文件 | 描述 |
|--------|------|------|
| **User** | `user.schema.ts` | 用户表 - 存储用户基本信息、会员状态和统计数据 |
| **DivinationRecord** | `divination-record.schema.ts` | 卜卦记录表 - 存储用户的卜卦记录和结果 |
| **Hexagram** | `hexagram.schema.ts` | 六十四卦数据表 - 存储六十四卦的完整内容 |
| **Order** | `order.schema.ts` | 订单表 - 存储用户订单和支付信息 |
| **LearningProgress** | `learning-progress.schema.ts` | 学习进度表 - 存储用户的学习进度和完成记录 |
| **DailyHexagram** | `daily-hexagram.schema.ts` | 每日一卦表 - 存储每日推送的卦象 |

## 使用方法

### 1. 导入 Schema

```typescript
import { User, UserSchema } from '@/database/schemas';
```

### 2. 注册到模块

```typescript
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '@/database/schemas';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
})
export class UserModule {}
```

### 3. 注入 Model

```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '@/database/schemas';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }
}
```

## 索引说明

### User Schema

- `unionId`: 唯一索引 (sparse)
- `openId`: 唯一索引 (sparse)
- `phoneNumber`: 唯一索引 (sparse)
- 复合索引: `openId + status`

### DivinationRecord Schema

- 复合索引: `userId + createdAt` (降序)
- 复合索引: `guestId + createdAt` (降序)
- `isFavorite`: 普通索引
- TTL 索引: 游客数据 30 天后自动删除

### Hexagram Schema

- `sequence`: 唯一索引
- `symbol`: 唯一索引
- `name`, `pinyin`: 文本索引

### Order Schema

- `orderNo`: 唯一索引
- 复合索引: `userId + createdAt` (降序)
- `payment.transactionId`: 普通索引
- `status`: 普通索引
- `type`: 普通索引

### LearningProgress Schema

- `userId`: 唯一索引
- `progress.percentage`: 普通索引

### DailyHexagram Schema

- `date`: 唯一索引
- 复合索引: `year + month + day`

## 数据模型关系

```
users (1) ───────────── (n) divination_records
 │                           │
 │                      (1) orders
 │
 └────────────── (1) learning_progress


hexagrams (1) ────────── (n) divination_records
 │
 └────────────── (1) daily_hexagrams
```

## 枚举类型

### UserStatus
- `ACTIVE`: 活跃用户
- `SUSPENDED`: 已暂停
- `DELETED`: 已删除

### MembershipType
- `FREE`: 免费用户
- `MONTHLY`: 月费会员
- `YEARLY`: 年费会员

### PaymentStatus
- `PENDING`: 待支付
- `PAID`: 已支付
- `FAILED`: 支付失败
- `REFUNDED`: 已退款

### OrderStatus
- `CREATED`: 已创建
- `PAID`: 已支付
- `CANCELLED`: 已取消
- `REFUNDED`: 已退款

## 环境变量

在 `.env` 文件中配置以下变量：

```bash
# MongoDB 连接配置
MONGODB_URI=mongodb://localhost:27017/zhouyi
MONGODB_DB_NAME=zhouyi

# 连接池配置
MONGO_MAX_POOL_SIZE=10
MONGO_MIN_POOL_SIZE=2
MONGO_SERVER_SELECTION_TIMEOUT=5000
MONGO_SOCKET_TIMEOUT=45000
MONGO_HEARTBEAT_FREQUENCY=10000
```

## 数据库迁移

### 创建索引

```typescript
// 开发环境自动创建索引
// 生产环境需要在部署时手动运行
await db.createIndexes();
```

### 种子数据

六十四卦基础数据需要手动导入：

```bash
npm run seed:hexagrams
```

## 注意事项

1. **游客数据**: 卜卦记录中的游客数据会在 30 天后自动删除（TTL 索引）
2. **软删除**: 用户数据采用软删除策略，`deletedAt` 字段标记删除时间
3. **加密存储**: 手机号等敏感数据需要加密存储
4. **时间戳**: 所有 Schema 都自动管理 `createdAt` 和 `updatedAt` 字段

## 待实现的 Schema

根据数据库设计文档，以下 Schema 尚未实现：

- [ ] Push Notification (推送通知表)
- [ ] Operation Logs (操作日志表)

这些表可以在后续开发中根据实际需求添加。
