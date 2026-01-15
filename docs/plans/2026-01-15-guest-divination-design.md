# 未登录用户卜卦功能设计

## 概述

为未登录用户提供与"每日一卦"相同信息结构的卜卦功能，同时提示用户登录后可获得更专业的解卦服务。

## 需求分析

### 用户场景
- 未登录用户点击"首页-卜卦"按钮
- 查看卦象信息和解读
- 获得登录提示，引导注册

### 功能目标
- 提供基础的卦象解读服务
- 与"每日一卦"保持一致的信息结构
- 引导用户转化为注册用户

## 后端架构设计

### 新增接口

**接口路径**: `POST /api/v1/divination/divinate/guest`

**权限**: 公开接口（无需认证）

**请求参数**:
```typescript
{
  device: {
    platform: string,      // 'ios' | 'android' | 'web' | 'mini'
    deviceId: string,      // 设备唯一标识
    appVersion?: string    // 应用版本（可选）
  }
}
```

**响应数据**:
```typescript
{
  success: true,
  data: {
    hexagram: {
      symbol: string,
      name: string,
      pinyin: string,
      sequence: number,
      guaci: { original, translation, annotation },
      tuanci: { original, translation },
      xiangci: { original, translation },
      yaoci: Array<{position, name, yinYang, original, translation, xiang}>
    },
    interpretation: {
      overall: string,      // 卦象概述
      career: string,       // 事业运势
      relationships: string, // 感情运势
      health: string,       // 健康运势
      wealth: string        // 财运运势
    },
    recordId: string,       // 游客记录ID
    timestamp: number,
    loginPrompt: {
      title: "解锁专业解卦",
      message: "登录后可获得基于动爻的精准解读和个性化建议",
      features: [
        "基于动爻的精准解读",
        "个性化建议",
        "会员专属深度解读"
      ]
    }
  },
  message: "起卦成功",
  timestamp: number
}
```

### 数据生成逻辑

**解读生成服务**（`src/modules/divination/interpretation.service.ts`）

**生成规则**:
- **卦象概述**: 基于卦辞 + 彖辞的核心含义
- **运势指引**: 基于象辞的象征意义
- **建议事项**: 基于爻辞的吉凶判断
- **注意事项**: 基于卦象的五行属性和季节因素

**实现方式**:
```typescript
class InterpretationService {
  async generateBasicInterpretation(hexagram: Hexagram): Promise<Interpretation> {
    return {
      overall: this.generateOverall(hexagram),
      career: this.generateCareer(hexagram),
      relationships: this.generateRelationships(hexagram),
      health: this.generateHealth(hexagram),
      wealth: this.generateWealth(hexagram)
    };
  }
}
```

### 数据存储

**游客记录存储**:
- 使用 `guestId` 作为用户标识
- 存储基本的卜卦记录（卦象、时间、设备信息）
- 不存储详细的解读内容（可重新生成）

**Schema 设计**:
```typescript
{
  guestId: string,
  hexagram: Hexagram,
  device: DeviceInfo,
  createdAt: Date,
  ip?: string
}
```

## 前端展示设计

### 页面结构

1. **卦象卡片**
   - 卦符、卦名、卦辞
   - 卦象基本信息

2. **五个维度的解读卡片**
   - 整体运势
   - 事业运势
   - 感情运势
   - 健康运势
   - 财运运势

3. **登录提示卡片**
   - 突出显示"解锁专业解卦"
   - 列出登录后的专业功能
   - 登录/注册按钮

4. **操作按钮**
   - 点赞
   - 分享
   - 登录

### 交互流程

1. 用户点击"卜卦"按钮
2. 调用 `/api/v1/divination/divinate/guest` 接口
3. 显示加载动画
4. 显示卦象信息和五个维度的解读
5. 显示登录提示卡片
6. 用户可以点赞、分享或点击登录

## 错误处理

### 接口错误
- 网络错误：显示友好的错误提示
- 服务器错误：显示"服务暂时不可用，请稍后再试"
- 数据错误：返回基础卦象信息，不显示解读

### 限流控制
- 同一设备/IP 在 1 分钟内限制 5 次请求
- 超过限制返回 429 状态码
- 显示"请求过于频繁，请稍后再试"

## 性能优化

### 数据存储优化
- 游客记录存储精简（不存储详细解读）
- 使用 Redis 缓存热门卦象的解读
- 定期清理过期的游客记录

### 响应时间优化
- 解读内容按需生成
- 使用缓存减少数据库查询
- 异步处理非关键操作

## 安全考虑

### 防止滥用
- 使用 guestId 进行限流
- 记录 IP 地址和设备信息
- 监控异常请求模式

### 数据保护
- 不存储敏感信息
- 游客记录定期清理
- 使用 HTTPS 传输

## 实施计划

### Phase 1: 后端开发
1. 创建 `interpretation.service.ts`
2. 实现解读生成逻辑
3. 添加 `/api/v1/divination/divinate/guest` 接口
4. 实现游客记录存储
5. 添加限流控制

### Phase 2: 前端开发
1. 创建卜卦结果页面组件
2. 实现五个维度的解读展示
3. 添加登录提示卡片
4. 实现点赞和分享功能
5. 添加错误处理和加载状态

### Phase 3: 测试
1. 单元测试（解读生成逻辑）
2. 集成测试（接口功能）
3. 性能测试（响应时间）
4. 安全测试（限流和防滥用）

### Phase 4: 部署
1. 代码审查
2. 部署到测试环境
3. 用户验收测试
4. 部署到生产环境

## 成功指标

- 未登录用户卜卦成功率 > 95%
- 平均响应时间 < 500ms
- 登录转化率提升 > 10%
- 用户满意度 > 4.0/5.0

## 后续优化

1. A/B 测试不同的登录提示文案
2. 基于用户行为优化解读内容
3. 添加更多维度的解读
4. 实现个性化推荐