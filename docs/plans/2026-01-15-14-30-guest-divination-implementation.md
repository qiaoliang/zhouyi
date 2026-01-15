# 未登录用户卜卦功能的实施计划

> 使用命令 `executing-plans`，实现这个计划。

**Goal:** 为未登录用户提供与"每日一卦"相同信息结构的卜卦功能，同时提示用户登录后可获得更专业的解卦服务

**Architecture:** 新增公开接口 `/api/v1/divination/divinate/guest`，基于卦象的卦辞、彖辞、象辞、爻辞生成五个维度的解读，使用 guestId 标识游客并实现限流控制

**Tech Stack:** NestJS, Mongoose, Redis, TypeScript, Jest

---

## 任务 1: 创建解读生成服务

**涉及文件:**
- `src/modules/divination/interpretation.service.ts` (新建)
- `src/modules/divination/interpretation.service.spec.ts` (新建)

**步骤:**

1. 创建解读生成服务文件

```bash
cd /Users/qiaoliang/working/code/zhouyi
touch src/modules/divination/interpretation.service.ts
```

2. 编写解读生成服务代码

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Hexagram } from '../../database/schemas/hexagram.schema';

export interface Interpretation {
  overall: string;
  career: string;
  relationships: string;
  health: string;
  wealth: string;
}

@Injectable()
export class InterpretationService {
  private readonly logger = new Logger(InterpretationService.name);

  constructor(
    @InjectModel('Hexagram')
    private hexagramModel: Model<Hexagram>,
  ) {}

  /**
   * 生成基础解读
   */
  async generateBasicInterpretation(hexagram: Hexagram): Promise<Interpretation> {
    return {
      overall: this.generateOverall(hexagram),
      career: this.generateCareer(hexagram),
      relationships: this.generateRelationships(hexagram),
      health: this.generateHealth(hexagram),
      wealth: this.generateWealth(hexagram),
    };
  }

  /**
   * 生成卦象概述
   */
  private generateOverall(hexagram: Hexagram): string {
    const { guaci, tuanci, xiangci } = hexagram;
    
    // 基于卦辞和彖辞生成概述
    let overview = guaci.translation || guaci.original;
    
    if (tuanci && tuanci.translation) {
      overview += ' ' + tuanci.translation;
    }
    
    return overview;
  }

  /**
   * 生成事业运势
   */
  private generateCareer(hexagram: Hexagram): string {
    const { yaoci, metadata } = hexagram;
    
    // 基于爻辞和卦象属性生成事业运势
    const careerLines = yaoci.filter(line => 
      line.original.includes('事业') || 
      line.original.includes('官') ||
      line.original.includes('进')
    );
    
    if (careerLines.length > 0) {
      return careerLines[0].translation || careerLines[0].original;
    }
    
    // 默认基于卦象性质
    return `${hexagram.name}之象，事业运势${metadata.nature.includes('吉') ? '亨通' : '需谨慎'}。`;
  }

  /**
   * 生成感情运势
   */
  private generateRelationships(hexagram: Hexagram): string {
    const { yaoci, metadata } = hexagram;
    
    // 基于爻辞生成感情运势
    const relationshipLines = yaoci.filter(line => 
      line.original.includes('婚') || 
      line.original.includes('娶') ||
      line.original.includes('配')
    );
    
    if (relationshipLines.length > 0) {
      return relationshipLines[0].translation || relationshipLines[0].original;
    }
    
    return `${hexagram.name}之象，感情运势${metadata.category.quality === 'lucky' ? '顺利' : '需经营'}。`;
  }

  /**
   * 生成健康运势
   */
  private generateHealth(hexagram: Hexagram): string {
    const { metadata, body } = hexagram;
    
    // 基于卦象对应的身体部位
    return `${hexagram.name}之象，应注意${body || '整体'}健康，保持平和心态。`;
  }

  /**
   * 生成财运运势
   */
  private generateWealth(hexagram: Hexagram): string {
    const { yaoci, metadata } = hexagram;
    
    // 基于爻辞生成财运运势
    const wealthLines = yaoci.filter(line => 
      line.original.includes('财') || 
      line.original.includes('利') ||
      line.original.includes('得')
    );
    
    if (wealthLines.length > 0) {
      return wealthLines[0].translation || wealthLines[0].original;
    }
    
    return `${hexagram.name}之象，财运运势${metadata.category.quality === 'lucky' ? '亨通' : '需谨慎'}。`;
  }
}
```

3. 创建测试文件

```bash
touch src/modules/divination/interpretation.service.spec.ts
```

4. 编写测试代码

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { InterpretationService } from './interpretation.service';
import { getModelToken } from '@nestjs/mongoose';
import { Hexagram } from '../../database/schemas/hexagram.schema';

describe('InterpretationService', () => {
  let service: InterpretationService;

  const mockHexagramModel = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InterpretationService,
        {
          provide: getModelToken('Hexagram'),
          useValue: mockHexagramModel,
        },
      ],
    }).compile();

    service = module.get<InterpretationService>(InterpretationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateBasicInterpretation', () => {
    it('should generate interpretation for a hexagram', async () => {
      const hexagram = {
        name: '乾为天',
        guaci: {
          original: '元亨利贞。',
          translation: '元始、亨通、和谐、贞正。',
          annotation: ''
        },
        tuanci: {
          original: '彖曰：大哉乾元，万物资始，乃统天。',
          translation: '彖传曰：乾卦的元始之道伟大啊，万物都由此开始，统领天道。',
        },
        xiangci: {
          original: '象曰：天行健，君子以自强不息。',
          translation: '象传曰：天道运行刚健有力，君子应该效法天道，自强不息。',
        },
        yaoci: [
          {
            position: 1,
            name: '初九',
            yinYang: 'yang',
            original: '潜龙勿用。',
            translation: '潜藏的龙，不宜有所作为。',
            xiang: '象曰：潜龙勿用，阳在下也。'
          },
          {
            position: 2,
            name: '九二',
            yinYang: 'yang',
            original: '见龙在田，利见大人。',
            translation: '龙出现在田野，有利于拜见大人。',
            xiang: '象曰：见龙在田，德施普也。'
          }
        ],
        metadata: {
          element: '金',
          nature: '刚健',
          direction: '西北',
          season: '秋',
          trigrams: {
            upper: { name: '乾', symbol: '☰', nature: '刚健', position: 'upper' },
            lower: { name: '乾', symbol: '☰', nature: '刚健', position: 'lower' }
          },
          family: '父',
          body: '首',
          animal: '马',
          color: '白'
        },
        category: {
          nature: 'yang',
          quality: 'lucky',
          difficulty: 'simple'
        },
        tags: ['乾', '天', '刚健']
      } as any;

      const result = await service.generateBasicInterpretation(hexagram);

      expect(result).toBeDefined();
      expect(result.overall).toContain('元始');
      expect(result.career).toBeDefined();
      expect(result.relationships).toBeDefined();
      expect(result.health).toBeDefined();
      expect(result.wealth).toBeDefined();
    });
  });
});
```

5. 运行测试

```bash
npm test -- src/modules/divination/interpretation.service.spec.ts
```

**预期输出:**
```
PASS  src/modules/divination/interpretation.service.spec.ts
  InterpretationService
    ✓ should be defined (5ms)
    ✓ should generate interpretation for a hexagram (15ms)

Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
```

6. 提交代码

```bash
git add src/modules/divination/interpretation.service.ts src/modules/divination/interpretation.service.spec.ts
git commit -m "feat: 创建解读生成服务

- 新增 InterpretationService 用于生成卦象解读
- 实现五个维度的解读生成（整体、事业、感情、健康、财运）
- 基于卦辞、彖辞、象辞、爻辞生成解读内容
- 添加完整的单元测试"
```

---

## 任务 2: 创建游客卜卦 DTO

**涉及文件:**
- `src/modules/divination/dto/guest-divinate.dto.ts` (新建)

**步骤:**

1. 创建 DTO 文件

```bash
touch src/modules/divination/dto/guest-divinate.dto.ts
```

2. 编写 DTO 代码

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn } from 'class-validator';

export class DeviceInfoDto {
  @ApiProperty({ description: '平台类型', enum: ['ios', 'android', 'web', 'mini'] })
  @IsString()
  @IsIn(['ios', 'android', 'web', 'mini'])
  platform: string;

  @ApiProperty({ description: '设备唯一标识' })
  @IsString()
  deviceId: string;

  @ApiProperty({ description: '应用版本', required: false })
  @IsOptional()
  @IsString()
  appVersion?: string;
}

export class GuestDivinateDto {
  @ApiProperty({ description: '设备信息', type: DeviceInfoDto })
  device: DeviceInfoDto;
}
```

3. 提交代码

```bash
git add src/modules/divination/dto/guest-divinate.dto.ts
git commit -m "feat: 创建游客卜卦 DTO

- 新增 GuestDivinateDto 用于游客卜卦请求
- 包含设备信息验证（平台、设备ID、应用版本）
- 使用 class-validator 进行参数验证"
```

---

## 任务 3: 添加游客卜卦接口

**涉及文件:**
- `src/modules/divination/divination.controller.ts`
- `src/modules/divination/divination.service.ts`
- `src/modules/divination/divination.module.ts`

**步骤:**

1. 修改 DivinationController 添加新接口

```typescript
// 在 DivinationController 类中添加以下方法

  /**
   * 游客卜卦接口
   * 公开接口，无需认证
   */
  @Public()
  @Post('divinate/guest')
  async guestDivinate(@Body() dto: GuestDivinateDto, @Req() req: any) {
    // 执行起卦
    const hexagram = await this.divinationService.performDivination();

    // 生成 guestId
    const guestId = dto.device.deviceId;

    // 生成解读
    const interpretation = await this.analysisService.generateBasicInterpretation(
      hexagram,
    );

    // 保存游客记录
    const record = await this.divinationService.saveGuestDivinationRecord(
      hexagram,
      guestId,
      dto.device,
      req.ip,
    );

    return {
      success: true,
      data: {
        hexagram,
        interpretation,
        recordId: record._id,
        timestamp: record.createdAt,
        loginPrompt: {
          title: '解锁专业解卦',
          message: '登录后可获得基于动爻的精准解读和个性化建议',
          features: [
            '基于动爻的精准解读',
            '个性化建议',
            '会员专属深度解读',
          ],
        },
      },
      message: '起卦成功',
      timestamp: Date.now(),
    };
  }
```

2. 在文件顶部添加导入

```typescript
import { GuestDivinateDto } from './dto/guest-divinate.dto';
```

3. 修改 DivinationService 添加游客记录保存方法

```typescript
// 在 DivinationService 类中添加以下方法

  /**
   * 保存游客卜卦记录
   */
  async saveGuestDivinationRecord(
    hexagram: any,
    guestId: string,
    device: any,
    ip?: string,
  ): Promise<any> {
    const record = new this.guestDivinationModel({
      guestId,
      hexagram,
      device,
      ip,
      createdAt: new Date(),
    });

    return record.save();
  }
```

4. 修改 DivinationModule 添加 InterpretationService

```typescript
// 在 imports 中添加
import { InterpretationService } from './interpretation.service';

// 在 providers 中添加
providers: [
  DivinationService,
  HexagramAnalysisService,
  InterpretationService, // 新增
  // ... 其他 providers
],
```

5. 提交代码

```bash
git add src/modules/divination/divination.controller.ts src/modules/divination/divination.service.ts src/modules/divination/divination.module.ts
git commit -m "feat: 添加游客卜卦接口

- 新增 POST /api/v1/divination/divinate/guest 接口
- 集成 InterpretationService 生成五个维度的解读
- 添加游客记录保存功能
- 返回登录提示，引导用户注册登录"
```

---

## 任务 4: 创建游客记录 Schema

**涉及文件:**
- `src/database/schemas/guest-divination.schema.ts` (新建)

**步骤:**

1. 创建 Schema 文件

```bash
touch src/database/schemas/guest-divination.schema.ts
```

2. 编写 Schema 代码

```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export interface DeviceInfo {
  platform: string;
  deviceId: string;
  appVersion?: string;
}

export interface GuestDivinationDocument extends Document {
  guestId: string;
  hexagram: any;
  device: DeviceInfo;
  ip?: string;
  createdAt: Date;
}

@Schema({ collection: 'guest_divinations' })
export class GuestDivination {
  @Prop({ required: true, index: true })
  guestId: string;

  @Prop({ required: true })
  hexagram: any;

  @Prop({ required: true })
  device: DeviceInfo;

  @Prop()
  ip: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const GuestDivinationSchema = SchemaFactory.createForClass(GuestDivination);
```

3. 在 database.module.ts 中注册 Schema

```typescript
import { GuestDivination, GuestDivinationSchema } from './schemas/guest-divination.schema';

// 在 MongooseModule.forFeature 中添加
MongooseModule.forFeature([
  { name: 'Hexagram', schema: HexagramSchema },
  { name: 'DivinationRecord', schema: DivinationRecordSchema },
  { name: 'DailyHexagram', schema: DailyHexagramSchema },
  { name: 'GuestDivination', schema: GuestDivinationSchema }, // 新增
  // ... 其他 schemas
]),
```

4. 在 divination.service.ts 中注入模型

```typescript
// 在构造函数中添加
constructor(
  @InjectModel('Hexagram')
  private hexagramModel: Model<HexagramDocument>,
  @InjectModel('DivinationRecord')
  private divinationRecordModel: Model<DivinationRecordDocument>,
  @InjectModel('GuestDivination')
  private guestDivinationModel: Model<GuestDivinationDocument>, // 新增
  @Inject('RedisService')
  private redisService: RedisService,
) {}
```

5. 提交代码

```bash
git add src/database/schemas/guest-divination.schema.ts src/database/database.module.ts src/modules/divination/divination.service.ts
git commit -m "feat: 创建游客记录 Schema

- 新增 GuestDivination Schema 用于存储游客卜卦记录
- 包含 guestId、hexagram、device、ip、createdAt 字段
- 在 database.module.ts 中注册 Schema
- 在 divination.service.ts 中注入模型"
```

---

## 任务 5: 添加限流控制

**涉及文件:**
- `src/modules/divination/divination.controller.ts`
- `src/modules/divination/guards/rate-limit.guard.ts` (新建)

**步骤:**

1. 创建限流守卫

```bash
touch src/modules/divination/guards/rate-limit.guard.ts
```

2. 编写限流守卫代码

```typescript
import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const guestId = request.body?.device?.deviceId;
    const ip = request.ip;

    if (!guestId) {
      return true; // 如果没有 guestId，跳过限流
    }

    const key = `rate_limit:guest_divination:${guestId}`;
    const limit = 5; // 每分钟5次
    const window = 60; // 60秒

    try {
      const current = await this.redis.incr(key);

      if (current === 1) {
        await this.redis.expire(key, window);
      }

      if (current > limit) {
        const ttl = await this.redis.ttl(key);
        this.logger.warn(`Rate limit exceeded for guestId: ${guestId}`);
        throw new Error(`请求过于频繁，请在 ${ttl} 秒后重试`);
      }

      return true;
    } catch (error) {
      this.logger.error('Rate limit check failed', error);
      // 如果 Redis 出错，允许请求通过
      return true;
    }
  }
}
```

3. 在游客卜卦接口上应用限流守卫

```typescript
// 在 DivinationController 类中修改游客卜卦接口

  /**
   * 游客卜卦接口
   * 公开接口，无需认证
   */
  @Public()
  @UseGuards(RateLimitGuard) // 新增限流守卫
  @Post('divinate/guest')
  async guestDivinate(@Body() dto: GuestDivinateDto, @Req() req: any) {
    // ... 原有代码
  }
```

4. 添加导入

```typescript
import { RateLimitGuard } from './guards/rate-limit.guard';
```

5. 提交代码

```bash
git add src/modules/divination/guards/rate-limit.guard.ts src/modules/divination/divination.controller.ts
git commit -m "feat: 添加游客卜卦限流控制

- 新增 RateLimitGuard 守卫用于限流控制
- 基于 guestId 限制每分钟5次请求
- 使用 Redis 存储请求计数
- 超过限制返回友好错误提示"
```

---

## 任务 6: 更新 API 文档

**涉及文件:**
- `src/modules/divination/divination.controller.ts`

**步骤:**

1. 为新接口添加 Swagger 文档

```typescript
// 在游客卜卦接口方法上方添加文档注释

  /**
   * 游客卜卦接口
   * 公开接口，无需认证
   * 
   * @param dto 游客卜卦请求参数
   * @param req 请求对象
   * @returns 卦象信息和解读
   * 
   * @example
   * POST /api/v1/divination/divinate/guest
   * {
   *   "device": {
   *     "platform": "mini",
   *     "deviceId": "unique-device-id-123"
   *   }
   * }
   */
  @Public()
  @UseGuards(RateLimitGuard)
  @Post('divinate/guest')
  async guestDivinate(@Body() dto: GuestDivinateDto, @Req() req: any) {
    // ... 原有代码
  }
```

2. 提交代码

```bash
git add src/modules/divination/divination.controller.ts
git commit -m "docs: 更新游客卜卦接口文档

- 添加 Swagger 文档注释
- 添加请求示例
- 说明接口参数和返回值"
```

---

## 任务 7: 添加集成测试

**涉及文件:**
- `src/modules/divination/divination.controller.spec.ts`

**步骤:**

1. 在测试文件中添加游客卜卦接口测试

```typescript
// 在 describe 块中添加新的测试用例

  describe('guestDivinate', () => {
    it('should return hexagram and interpretation for guest user', async () => {
      const dto = {
        device: {
          platform: 'mini',
          deviceId: 'test-device-123',
        },
      };

      const result = await controller.guestDivinate(
        dto,
        { ip: '127.0.0.1' } as any,
      );

      expect(result.success).toBe(true);
      expect(result.data.hexagram).toBeDefined();
      expect(result.data.interpretation).toBeDefined();
      expect(result.data.interpretation.overall).toBeDefined();
      expect(result.data.interpretation.career).toBeDefined();
      expect(result.data.interpretation.relationships).toBeDefined();
      expect(result.data.interpretation.health).toBeDefined();
      expect(result.data.interpretation.wealth).toBeDefined();
      expect(result.data.loginPrompt).toBeDefined();
      expect(result.data.loginPrompt.features).toHaveLength(3);
    });

    it('should save guest divination record', async () => {
      const dto = {
        device: {
          platform: 'mini',
          deviceId: 'test-device-456',
        },
      };

      const result = await controller.guestDivinate(
        dto,
        { ip: '127.0.0.1' } as any,
      );

      expect(result.data.recordId).toBeDefined();
      // 验证记录是否保存到数据库
      const record = await divinationService.guestDivinationModel.findById(
        result.data.recordId,
      );
      expect(record).toBeDefined();
      expect(record.guestId).toBe('test-device-456');
    });
  });
```

2. 运行测试

```bash
npm test -- src/modules/divination/divination.controller.spec.ts
```

**预期输出:**
```
PASS  src/modules/divination/divination.controller.spec.ts
  DivinationController
    ...
    ✓ should return hexagram and interpretation for guest user (25ms)
    ✓ should save guest divination record (18ms)

Test Suites: 1 passed, 1 total
Tests:       8 passed, 8 total
```

3. 提交代码

```bash
git add src/modules/divination/divination.controller.spec.ts
git commit -m "test: 添加游客卜卦接口集成测试

- 测试游客卜卦接口返回正确的数据结构
- 测试游客记录是否正确保存到数据库
- 验证登录提示和功能列表"
```

---

## 任务 8: 运行完整测试套件

**涉及文件:**
- 无（运行测试）

**步骤:**

1. 运行所有测试

```bash
npm test
```

**预期输出:**
```
Test Suites: 12 passed, 12 total
Tests:       45 passed, 45 total
```

2. 如果测试失败，修复失败的测试

3. 提交代码

```bash
git add .
git commit -m "test: 确保所有测试通过"
```

---

## 验证步骤

### 1. 启动服务

```bash
cd /Users/qiaoliang/working/code/zhouyi
pnpm run start:dev
```

### 2. 测试游客卜卦接口

```bash
curl -X POST http://localhost:3000/api/v1/divination/divinate/guest \
  -H "Content-Type: application/json" \
  -d '{
    "device": {
      "platform": "mini",
      "deviceId": "test-device-123"
    }
  }'
```

**预期响应:**
```json
{
  "success": true,
  "data": {
    "hexagram": {
      "symbol": "䷀",
      "name": "乾为天",
      "pinyin": "qián wéi tiān",
      "sequence": 1,
      "guaci": {
        "original": "元亨利贞。",
        "translation": "元始、亨通、和谐、贞正。",
        "annotation": ""
      },
      "tuanci": {
        "original": "彖曰：大哉乾元，万物资始，乃统天。",
        "translation": "彖传曰：乾卦的元始之道伟大啊，万物都由此开始，统领天道。"
      },
      "xiangci": {
        "original": "象曰：天行健，君子以自强不息。",
        "translation": "象传曰：天道运行刚健有力，君子应该效法天道，自强不息。"
      },
      "yaoci": [...]
    },
    "interpretation": {
      "overall": "元始、亨通、和谐、贞正。 彖传曰：乾卦的元始之道伟大啊，万物都由此开始，统领天道。",
      "career": "乾为天之象，事业运势亨通。",
      "relationships": "乾为天之象，感情运势顺利。",
      "health": "乾为天之象，应注意首部健康，保持平和心态。",
      "wealth": "乾为天之象，财运运势亨通。"
    },
    "recordId": "...",
    "timestamp": "...",
    "loginPrompt": {
      "title": "解锁专业解卦",
      "message": "登录后可获得基于动爻的精准解读和个性化建议",
      "features": [
        "基于动爻的精准解读",
        "个性化建议",
        "会员专属深度解读"
      ]
    }
  },
  "message": "起卦成功",
  "timestamp": 1705310400000
}
```

### 3. 测试限流功能

连续发送 6 次请求，第 6 次应该返回 429 错误。

```bash
for i in {1..6}; do
  echo "Request $i:"
  curl -X POST http://localhost:3000/api/v1/divination/divinate/guest \
    -H "Content-Type: application/json" \
    -d '{
      "device": {
        "platform": "mini",
        "deviceId": "test-device-123"
      }
    }'
  echo ""
done
```

### 4. 检查数据库中的游客记录

```bash
docker exec zhouyi-mongodb mongosh -u admin -p admin123 --authenticationDatabase admin zhouyi --eval 'db.guest_divinations.find().sort({createdAt: -1}).limit(5)'
```

### 5. 查看 API 文档

访问 `http://localhost:3000/api/docs` 查看新增的接口文档。

---

## 提交最终代码

```bash
git add .
git commit -m "feat: 完成未登录用户卜卦功能

- 新增游客卜卦接口 POST /api/v1/divination/divinate/guest
- 实现解读生成服务，生成五个维度的解读
- 添加游客记录存储和限流控制
- 完善单元测试和集成测试
- 更新 API 文档"
```

---

## 完成标准

- [ ] 所有单元测试通过
- [ ] 所有集成测试通过
- [ ] 游客卜卦接口返回正确的数据结构
- [ ] 限流控制正常工作
- [ ] 游客记录正确保存到数据库
- [ ] API 文档完整
- [ ] 响应时间 < 500ms