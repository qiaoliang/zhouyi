# 金钱课起卦 API 文档

## 概述

本文档描述了周易通APP后端的金钱课起卦API接口。金钱课起卦是传统的周易卜卦方法，通过掷铜钱生成卦象。

---

## 1. 执行金钱课起卦

### 端点
`POST /api/v1/divination/divinate`

### 描述
执行金钱课起卦，连续掷6次铜钱生成卦象。支持游客和已登录用户。

### 请求头
```
Content-Type: application/json
Authorization: Bearer {accessToken}  // 可选，已登录用户需要
X-Guest-ID: {guestId}               // 可选，游客模式需要
```

### 请求体
```json
{
  "device": {
    "platform": "ios",        // 平台: ios, android, miniprogram, h5
    "model": "iPhone 14"      // 设备型号（可选）
  }
}
```

### 响应示例
```json
{
  "success": true,
  "data": {
    "hexagram": {
      "primary": {
        "name": "乾为天",
        "symbol": "䷀",
        "pinyin": "qián wéi tiān",
        "sequence": 1
      },
      "lines": [
        {
          "position": 1,
          "yinYang": "yang",
          "changing": false
        },
        {
          "position": 2,
          "yinYang": "yang",
          "changing": false
        },
        {
          "position": 3,
          "yinYang": "yin",
          "changing": true
        },
        {
          "position": 4,
          "yinYang": "yang",
          "changing": false
        },
        {
          "position": 5,
          "yinYang": "yang",
          "changing": false
        },
        {
          "position": 6,
          "yinYang": "yang",
          "changing": false
        }
      ],
      "changed": {
        "name": "天风姤",
        "symbol": "䷫",
        "pinyin": "tiān fēng gòu",
        "sequence": 44
      },
      "mutual": {
        "name": "乾为天",
        "symbol": "䷀",
        "pinyin": "qián wéi tiān",
        "sequence": 1
      },
      "changingLines": [3]
    },
    "recordId": "507f1f77bcf86cd799439011",
    "timestamp": "2026-01-13T08:30:00.000Z"
  },
  "message": "起卦成功",
  "timestamp": 1705105800000
}
```

### 字段说明

#### hexagram.primary - 主卦信息
| 字段 | 类型 | 说明 |
|------|------|------|
| name | string | 卦名 |
| symbol | string | 卦象符号 |
| pinyin | string | 拼音 |
| sequence | number | 序号 (1-64) |

#### hexagram.lines - 六爻信息
| 字段 | 类型 | 说明 |
|------|------|------|
| position | number | 爻位 (1-6, 从下到上) |
| yinYang | string | 阴阳 (yin/yang) |
| changing | boolean | 是否变爻 |

#### hexagram.changed - 变卦信息
如果存在变爻，变爻取反后形成的卦象。如果没有变爻，则与主卦相同。

#### hexagram.mutual - 互卦信息
互卦由原卦的二三四爻为下卦，三四五爻为上卦组成。

#### hexagram.changingLines - 变爻位置数组
如 [2, 5] 表示第二爻和第五爻为变爻。空数组表示无变爻。

---

## 2. 获取用户卜卦历史

### 端点
`GET /api/v1/divination/history`

### 描述
获取当前用户的卜卦历史记录。需要登录。

### 请求头
```
Authorization: Bearer {accessToken}
```

### 查询参数
| 参数 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | number | 否 | 1 | 页码 |
| limit | number | 否 | 20 | 每页数量 |

### 响应示例
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "hexagram": {
          "primary": { "name": "乾为天", "symbol": "䷀", "sequence": 1 },
          "lines": [...],
          "changed": { "name": "乾为天", "symbol": "䷀", "sequence": 1 },
          "mutual": { "name": "乾为天", "symbol": "䷀", "sequence": 1 },
          "changingLines": []
        },
        "interpretation": {
          "basic": {
            "hexagramName": "乾为天",
            "guaci": "元，亨，利，贞。",
            "guaciTranslation": "元始，亨通，和谐有利，正固持久。",
            "yaoci": [...]
          }
        },
        "payment": {
          "type": "free",
          "amount": 0,
          "status": "unpaid"
        },
        "isFavorite": false,
        "createdAt": "2026-01-13T08:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  },
  "message": "获取历史记录成功",
  "timestamp": 1705105800000
}
```

---

## 3. 获取游客卜卦历史

### 端点
`GET /api/v1/divination/guest/history`

### 描述
获取游客的卜卦历史记录。

### 查询参数
| 参数 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| guestId | string | 是 | - | 游客ID |
| page | number | 否 | 1 | 页码 |
| limit | number | 否 | 20 | 每页数量 |

### 响应格式
与"获取用户卜卦历史"相同。

---

## 4. 获取单个卜卦记录

### 端点
`GET /api/v1/divination/record/:id`

### 描述
获取指定ID的卜卦记录详情。需要登录。

### 请求头
```
Authorization: Bearer {accessToken}
```

### 路径参数
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 卜卦记录ID |

### 响应示例
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "userId": "user123",
    "hexagram": { ... },
    "interpretation": { ... },
    "payment": { ... },
    "isFavorite": true,
    "createdAt": "2026-01-13T08:30:00.000Z"
  },
  "message": "获取记录成功",
  "timestamp": 1705105800000
}
```

---

## 5. 收藏/取消收藏卜卦记录

### 端点
`POST /api/v1/divination/record/:id/favorite`

### 描述
收藏或取消收藏指定的卜卦记录。需要登录。

### 请求头
```
Authorization: Bearer {accessToken}
```

### 路径参数
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 卜卦记录ID |

### 响应示例
```json
{
  "success": true,
  "data": {
    "isFavorite": true
  },
  "message": "收藏状态已更新",
  "timestamp": 1705105800000
}
```

---

## 错误响应

所有API在发生错误时返回以下格式：

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  },
  "timestamp": 1705105800000
}
```

### 常见错误码
| 错误码 | 说明 |
|--------|------|
| UNAUTHORIZED | 未授权访问 |
| MISSING_GUEST_ID | 缺少游客ID |
| RECORD_NOT_FOUND | 卜卦记录不存在 |
| FAILED_TO_DETERMINE_HEXAGRAM | 无法确定卦象 |
| HEXAGRAM_DATA_NOT_FOUND | 卦象数据不存在 |

---

## 金钱课起卦算法说明

### 铜钱规则

金钱课使用三个铜钱，每个铜钱有正反两面：
- **字**（正面）：有文字的一面
- **背**（反面）：有花纹的一面

### 爻的生成规则

掷一次三个铜钱，根据字/背的数量确定一个爻：

| 字数 | 背数 | 爻名 | 阴阳 | 变爻 | 二进制 |
|------|------|------|------|------|--------|
| 1 | 2 | 少阳 | 阳 | 否 | 1 |
| 2 | 1 | 少阴 | 阴 | 否 | 0 |
| 3 | 0 | 老阳 | 阳 | 是（变阴） | 1 → 0 |
| 0 | 3 | 老阴 | 阴 | 是（变阳） | 0 → 1 |

### 卦象生成

1. 连续掷6次铜钱，得到6个爻
2. 从下到上排列：初爻、二爻、三爻、四爻、五爻、上爻
3. 下卦（内卦）：初爻、二爻、三爻
4. 上卦（外卦）：四爻、五爻、上爻
5. 根据上下卦组合确定主卦

### 变卦计算

如果有变爻：
- 将变爻的阴阳取反（老阳→阴，老阴→阳）
- 根据变化后的六爻计算变卦

### 互卦计算

- 互卦下卦：原卦的二、三、四爻
- 互卦上卦：原卦的三、四、五爻

---

## 前端集成示例

### 使用 Fetch API

```javascript
// 执行起卦
async function performDivination(accessToken) {
  const response = await fetch('http://localhost:3000/api/v1/divination/divinate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      device: {
        platform: 'ios',
        model: 'iPhone 14',
      },
    }),
  });

  const result = await response.json();

  if (result.success) {
    console.log('卦象:', result.data.hexagram);
    console.log('记录ID:', result.data.recordId);
  }

  return result;
}

// 获取历史记录
async function getHistory(accessToken, page = 1) {
  const response = await fetch(
    `http://localhost:3000/api/v1/divination/history?page=${page}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  const result = await response.json();
  return result;
}

// 游客模式起卦
async function guestDivination(guestId) {
  const response = await fetch('http://localhost:3000/api/v1/divination/divinate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Guest-ID': guestId,
    },
    body: JSON.stringify({
      device: { platform: 'h5' },
    }),
  });

  const result = await response.json();
  return result;
}
```

### 使用 Axios

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
});

// 设置认证token
api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

// 执行起卦
async function performDivination() {
  const { data } = await api.post('/divination/divinate', {
    device: { platform: 'ios' },
  });

  return data;
}

// 获取历史记录
async function getHistory(page = 1, limit = 20) {
  const { data } = await api.get('/divination/history', {
    params: { page, limit },
  });

  return data;
}
```

---

## 注意事项

1. **游客数据限制**：游客的卜卦记录会在30天后自动删除

2. **收藏功能**：只有登录用户才能使用收藏功能

3. **频率限制**：建议前端添加适当的起卦频率限制，避免用户过于频繁地起卦

4. **错误处理**：前端应妥善处理各种错误情况，如网络错误、服务器错误等

5. **数据完整性**：卦象数据需要预先录入数据库，否则起卦会失败

---

## 测试

可以使用以下命令测试起卦功能：

```bash
# 已登录用户
curl -X POST http://localhost:3000/api/v1/divination/divinate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"device":{"platform":"ios"}}'

# 游客模式
curl -X POST http://localhost:3000/api/v1/divination/divinate \
  -H "Content-Type: application/json" \
  -H "X-Guest-ID: guest123" \
  -d '{"device":{"platform":"h5"}}'
```

---

**文档版本**: 1.0
**最后更新**: 2026年1月13日
**维护者**: AI Assistant
