# AI 解卦功能设计文档

**日期**: 2026-01-16
**状态**: 设计完成，待实现
**作者**: AI 辅助设计

---

## 1. 功能概述

为登录用户提供基于大语言模型（GLM）的智能解卦服务。用户在卜卦后，可选择获取 AI 深度解读，系统将卦象信息发送给 GLM，返回专业、个性化的解卦内容。

### 核心特性

- **可选升级服务**: 用户卜卦后可点击「获取 AI 深度解读」按钮触发
- **完整卦象分析**: 包含主卦、变卦、互卦及六爻分析
- **仅限登录用户**: 非登录用户无法使用此功能
- **智能缓存**: 相同卦象和问题的解读缓存 24 小时
- **请求限流**: 每用户每小时限制 10 次请求

---

## 2. 系统架构

### 2.1 调用流程

```
用户点击「AI 深度解读」
    ↓
前端调用 POST /api/v1/divination/record/:id/ai-interpretation
    ↓
JwtAuthGuard 验证用户身份
    ↓
DivinationController 处理请求
    ↓
GLMService 组织卦象文本并调用 GLM API
    ↓
GLM 返回解卦内容
    ↓
将 AI 解读保存到 DivinationRecord.aiInterpretation 字段
    ↓
返回完整的 AI 解卦内容给前端
```

### 2.2 核心组件

| 组件 | 职责 |
|------|------|
| **GLMService** | 组织卦象数据、调用 GLM API、处理响应 |
| **DivinationController** | 新增 API 端点、权限验证 |
| **DivinationRecord Schema** | 扩展存储 AI 解读结果 |
| **Redis** | 缓存、限流、分布式锁 |

---

## 3. API 设计

### 3.1 端点定义

**POST** `/api/v1/divination/record/:id/ai-interpretation`

**请求头**:
```
Authorization: Bearer <access_token>
```

**路径参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| id | string | 是 | 卜卦记录 ID |

**请求体**:
```typescript
{
  question?: string  // 用户的问题（可选，用于个性化解读）
}
```

### 3.2 响应格式

**成功响应** (200):
```typescript
{
  success: true,
  data: {
    recordId: string,
    aiInterpretation: {
      summary: string,           // 核心解读摘要
      detailedAnalysis: string,  // 详细分析
      advice: string,            // 建议和指导
      createdAt: Date            // 生成时间
    },
    cached: boolean  // 是否来自缓存
  },
  message: '获取 AI 解卦成功',
  timestamp: number
}
```

**错误响应**:

| 状态码 | 错误代码 | 说明 |
|--------|----------|------|
| 401 | UNAUTHORIZED | 未登录或 token 无效 |
| 403 | FORBIDDEN | 无权访问此记录 |
| 404 | RECORD_NOT_FOUND | 卜卦记录不存在 |
| 429 | RATE_LIMIT_EXCEEDED | 请求频率超限 |
| 500 | AI_SERVICE_ERROR | GLM API 调用失败 |

---

## 4. 数据库设计

### 4.1 Schema 扩展

在 `DivinationRecord` 添加 `aiInterpretation` 字段：

```typescript
aiInterpretation?: {
  summary: string;           // 核心解读摘要（100-150字）
  detailedAnalysis: string;  // 详细分析（500-800字）
  advice: string;            // 建议和指导（200-300字）
  prompt: string;            // 发送给 GLM 的提示词（调试用）
  model: string;             // 使用的模型名称
  createdAt: Date;           // 生成时间
  cached: boolean;           // 是否来自缓存
}
```

---

## 5. 环境变量配置

在 `.env` 添加以下配置：

```bash
# GLM API 配置
GLM_API_KEY="your_glm_api_key"                    # GLM API 密钥
GLM_BASE_URL="https://open.bigmodel.cn/api/paas/v4"  # GLM API 地址
GLM_MODEL="glm-4-flash"                           # 模型名称（或 glm-4-plus）
GLM_TIMEOUT=30000                                 # 请求超时（毫秒）
GLM_MAX_TOKENS=2000                               # 最大生成 token 数

# AI 解卦限流配置
AI_INTERPRETATION_RATE_LIMIT=10                   # 每小时最大请求数
AI_INTERPRETATION_CACHE_TTL=86400                 # 缓存时间（秒，24小时）
```

---

## 6. 提示词设计

### 6.1 发送给 GLM 的文本结构

```
你是一位精通周易的解卦大师。请根据以下卦象信息，结合周易传统理论，
为用户提供专业、深刻的解卦分析。

【卦象基本信息】
主卦：{卦名}（{符号}）- {卦序}
卦辞：{卦辞原文}
卦辞译文：{卦辞现代译文}

【六爻分析】
初爻：{爻辞原文} - {爻辞译文}
二爻：{爻辞原文} - {爻辞译文}
...
上爻：{爻辞原文} - {爻辞译文}

【变卦信息】
变爻位置：{变爻的爻位}
变卦：{变卦名称}（{符号}）
变卦卦辞：{变卦卦辞}

【互卦信息】
互卦：{互卦名称}（{符号}）
互卦说明：{互卦的传统解释}

【用户问题】
{用户的问题，如果提供的话}

【解读要求】
请从以下几个方面进行解读：
1. 核心卦意：用简洁的语言概括卦象的核心含义
2. 详细分析：结合卦辞、爻辞、变爻、互卦进行深入分析
3. 实践建议：给出具体的行动建议和注意事项

请用专业但不晦涩的语言，让现代读者能够理解并应用。

请以 JSON 格式返回：
{
  "summary": "核心解读摘要",
  "detailedAnalysis": "详细分析",
  "advice": "行动建议"
}
```

### 6.2 GLM 返回格式

```typescript
{
  "summary": "卦象核心含义的简洁概述（100-150字）",
  "detailedAnalysis": "结合卦辞、爻辞、变爻、互卦的详细分析（500-800字）",
  "advice": "针对用户情况的具体行动建议（200-300字）"
}
```

---

## 7. 核心服务设计

### 7.1 GLMService 方法

```typescript
@Injectable()
export class GLMService {
  // 组织卦象文本
  private async buildHexagramPrompt(
    hexagram: IHexagram,
    question?: string
  ): Promise<string>

  // 调用 GLM API
  private async callGLM(prompt: string): Promise<string>

  // 生成 AI 解读（对外接口）
  async generateAIInterpretation(
    recordId: string,
    userId: string,
    question?: string
  ): Promise<AIInterpretation>

  // 检查限流
  private async checkRateLimit(userId: string): Promise<boolean>

  // 检查缓存
  private async getCachedInterpretation(
    hexagramSequence: number,
    question?: string
  ): Promise<AIInterpretation | null>

  // 保存到缓存
  private async setCachedInterpretation(
    hexagramSequence: number,
    interpretation: AIInterpretation,
    question?: string
  ): Promise<void>

  // 获取分布式锁
  private async acquireLock(recordId: string): Promise<boolean>

  // 释放分布式锁
  private async releaseLock(recordId: string): Promise<void>
}
```

---

## 8. 安全与性能

### 8.1 安全措施

| 措施 | 实现方式 |
|------|----------|
| 用户认证 | JwtAuthGuard |
| 权限验证 | 检查 record.userId === request.userId |
| API 密钥保护 | 环境变量存储，不提交到代码库 |
| 输入验证 | class-validator DTO 验证 |

### 8.2 性能优化

| 策略 | 实现 |
|------|------|
| 结果缓存 | Redis 缓存相同卦象的解读（24小时） |
| 请求限流 | 每用户每小时 10 次 |
| 分布式锁 | 防止并发请求重复调用 API |
| 超时控制 | 30 秒超时，最多 3 次重试 |

### 8.3 Redis 键设计

```typescript
// 限流
ai:interpretation:rate:{userId}:{hour}  // TTL: 3600s

// 缓存
ai:interpretation:cache:{hexagramSequence}:{questionHash}  // TTL: 86400s

// 分布式锁
ai:interpretation:lock:{recordId}  // TTL: 60s
```

---

## 9. 错误处理

### 9.1 GLM API 错误处理

```typescript
switch (error.code) {
  case 'invalid_api_key':
    throw new BadRequestException('AI 服务配置错误，请联系管理员');

  case 'rate_limit_exceeded':
    throw new HttpException('请求过于频繁，请稍后再试', 429);

  case 'timeout':
    // 超时重试（最多3次）
    // 仍失败则降级到基础解读
    return fallbackToBasicInterpretation();

  default:
    this.logger.error(`GLM API Error: ${error.message}`);
    throw new InternalServerErrorException('AI 解读服务暂时不可用');
}
```

### 9.2 边界情况处理

| 场景 | 处理方式 |
|------|----------|
| 记录已有 AI 解读 | 直接返回，不重复调用 |
| GLM 返回非 JSON | 尝试解析，失败则提取文本 |
| 卦象数据不完整 | 使用默认值，记录警告 |
| 并发请求同一记录 | 使用分布式锁 |

---

## 10. 监控与日志

### 10.1 关键指标

- AI 解读请求数量（按小时/天统计）
- 平均响应时间
- 缓存命中率
- API 失败率
- 用户使用频率分布

### 10.2 日志级别

| 级别 | 场景 |
|------|------|
| INFO | 正常请求和响应 |
| WARN | 缓存未命中、降级处理 |
| ERROR | API 失败、数据异常 |

---

## 11. 测试策略

### 11.1 单元测试

- `buildHexagramPrompt`: 测试提示词格式化
- `checkRateLimit`: 测试限流逻辑
- `getCachedInterpretation`: 测试缓存读取

### 11.2 集成测试

- 完整的 AI 解读请求流程
- 用户认证和权限验证
- 缓存机制
- 错误响应

### 11.3 Mock 策略

测试环境使用 Mock GLM 服务：
```typescript
const mockGLMService = {
  callGLM: jest.fn().mockResolvedValue({
    summary: '测试摘要',
    detailedAnalysis: '测试详细分析',
    advice: '测试建议',
  }),
};
```

---

## 12. 实施计划

### Phase 1: 基础设施（1-2天）
- [ ] 添加环境变量配置
- [ ] 创建 GLMService 基础结构
- [ ] 实现 HTTP 调用方法
- [ ] 添加 Redis 缓存和限流逻辑

### Phase 2: 核心功能（2-3天）
- [ ] 实现 buildHexagramPrompt 方法
- [ ] 实现 generateAIInterpretation 完整流程
- [ ] 扩展 DivinationRecord Schema
- [ ] 在 Controller 添加新端点
- [ ] 添加权限验证

### Phase 3: 错误处理与优化（1-2天）
- [ ] 实现完整的错误处理
- [ ] 添加分布式锁
- [ ] 实现降级策略
- [ ] 添加日志和监控

### Phase 4: 测试与文档（1-2天）
- [ ] 编写单元测试
- [ ] 编写集成测试
- [ ] 更新 API 文档
- [ ] 前端对接联调

---

## 13. 文件清单

### 新建文件

```
src/modules/divination/
├── glm.service.ts                      # GLM 服务
├── glm.service.spec.ts                 # GLM 服务测试
└── dto/
    └── ai-interpretation.dto.ts        # AI 解读 DTO
```

### 修改文件

```
src/modules/divination/
├── divination.controller.ts            # 添加新端点
├── divination.module.ts                # 注册 GLMService
├── divination.controller.spec.ts       # 添加测试

src/database/schemas/
└── divination-record.schema.ts         # 添加 aiInterpretation 字段

.env.example                            # 添加 GLM 配置
```

---

## 14. 前端集成建议

### 14.1 API 调用

```typescript
// frontend/packages/shared/services/divination.ts
async getAIInterpretation(
  recordId: string,
  question?: string
): Promise<AIInterpretationResponse> {
  return this.apiClient.post(
    `/divination/record/${recordId}/ai-interpretation`,
    { question }
  );
}
```

### 14.2 UI 建议

- 在卜卦结果页面添加「获取 AI 深度解读」按钮
- 按钮仅对登录用户显示
- 加载状态显示动画
- 分段展示结果（摘要、分析、建议）
- 显示缓存标识

---

## 15. 成本估算

### GLM API 成本

假设使用 `glm-4-flash`：
- 输入：约 2000 tokens（卦象数据 + 提示词）
- 输出：约 1000 tokens（解读内容）
- 单次成本：约 ¥0.001-0.002

### 优化建议

- 启用缓存可降低 70-80% 的 API 调用
- 相同卦象 + 问题组合复用缓存
- 监控使用情况，必要时调整限流策略

---

## 16. 未来扩展

- [ ] 支持更多 LLM 提供商（OpenAI、Anthropic 等）
- [ ] 支持流式响应（SSE）
- [ ] 添加用户反馈机制（点赞/点踩）
- [ ] 个性化提示词（基于用户历史）
- [ ] 多语言支持
- [ ] 语音播报功能

---

**文档版本**: 1.0
**最后更新**: 2026-01-16
