# 映射配置 API 文档

## 概述

映射配置 API 用于管理 Excel/CSV 文件列与数据库字段的映射关系。使用基于 TransformStep 的转换管道（Transform Pipeline）来实现灵活的数据转换。

**API 路径**: `/api/mapping-configs`

**Schema 版本**: 当前使用 `schemaVersion: 2`

系统使用 TransformMapping 来定义映射规则，支持：
- **多输入源**: 可以从多个列、字面量或生成值中获取数据
- **转换管道**: 每个输入源可以应用多个 TransformStep 进行数据转换
- **组合操作**: 多个输入源可以通过 Combine 插件合并成一个值
- **后处理管道**: 组合后的值可以再次通过 TransformStep 进行最终处理

支持的业务场景（ConfigType）：
- `ec-company-to-order`: ECモール CSV → 注文データ（主要使用场景）
- `order-to-carrier`: 注文データ → 配送会社フォーマット
- `customer`: 客户映射
- `product`: 产品映射
- `inventory`: 库存映射
- 其他自定义场景

## API Endpoints

### 1. 创建映射配置

**POST** `/api/mapping-configs`

请求体示例：

```json
{
  "configType": "ec-company-to-order",
  "name": "乐天CSV映射配置",
  "description": "用于映射乐天下载的CSV文件",
  "isDefault": true,
  "schemaVersion": 2,
  "mappings": [
    {
      "targetField": "customerManagementNumber",
      "inputs": [
        {
          "id": "input1",
          "type": "column",
          "column": "注文番号",
          "pipeline": {
            "steps": [
              {
                "id": "step1",
                "plugin": "string.trim",
                "enabled": true
              }
            ]
          }
        }
      ],
      "combine": {
        "plugin": "combine.first"
      },
      "required": true
    },
    {
      "targetField": "recipientAddress",
      "inputs": [
        {
          "id": "input1",
          "type": "column",
          "column": "都道府県"
        },
        {
          "id": "input2",
          "type": "column",
          "column": "市区町村"
        },
        {
          "id": "input3",
          "type": "column",
          "column": "番地"
        }
      ],
      "combine": {
        "plugin": "combine.concat",
        "params": {
          "separator": "",
          "ignoreEmpty": true
        }
      },
      "outputPipeline": {
        "steps": [
          {
            "id": "step1",
            "plugin": "string.trim"
          }
        ]
      }
    }
  ]
}
```

响应：

```json
{
  "_id": "1234567890_abc123",
  "tenantId": "default-tenant",
  "configType": "shipment-order",
  "name": "乐天CSV映射配置",
  "description": "用于映射乐天下载的CSV文件",
  "isDefault": true,
  "mappings": [...],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### 2. 获取所有映射配置

**GET** `/api/mapping-configs?configType=shipment-order`

查询参数：
- `configType` (可选): 过滤配置类型，如 `shipment-order`, `customer`, `product` 等

响应：

```json
[
  {
    "_id": "1234567890_abc123",
    "configType": "shipment-order",
    "name": "乐天CSV映射配置",
    ...
  }
]
```

### 3. 根据ID获取映射配置

**GET** `/api/mapping-configs/:id`

响应：单个映射配置对象

### 4. 更新映射配置

**PUT** `/api/mapping-configs/:id`

请求体：与创建接口相同，但所有字段都是可选的

### 5. 删除映射配置

**DELETE** `/api/mapping-configs/:id`

响应：204 No Content

### 6. 获取默认映射配置

**GET** `/api/mapping-configs/default?configType=ec-company-to-order`

查询参数：
- `configType` (必需): 配置类型，如 `ec-company-to-order`, `order-to-carrier` 等

响应：默认映射配置对象

### 7. 获取可用的转换插件列表

**GET** `/api/mapping-configs/transform-plugins`

响应：

```json
{
  "transforms": [
    { "id": "string.trim", "name": "去除空格", "category": "string" },
    { "id": "date.parse", "name": "解析日期", "category": "date" },
    ...
  ],
  "combines": [
    { "id": "combine.first", "name": "取第一个值" },
    { "id": "combine.concat", "name": "连接" },
    ...
  ],
  "generators": [
    { "id": "now", "name": "当前时间" },
    { "id": "uuid", "name": "UUID" }
  ]
}
```

## 数据模型

### TransformStep

TransformStep 是转换管道中的单个转换步骤：

```typescript
{
  id: string;                    // 步骤的唯一标识符
  plugin: string;                // 转换插件名称，如 "string.trim", "date.parse"
  params?: any;                  // 插件参数（根据插件类型不同）
  enabled?: boolean;             // 是否启用（默认 true）
  onError?: {                    // 错误处理策略
    mode: 'fail' | 'fallback' | 'skip';
    value?: any;                 // fallback 模式时的默认值
  };
}
```

### TransformPipeline

TransformPipeline 包含多个 TransformStep，按顺序执行：

```typescript
{
  steps: TransformStep[];
}
```

### InputSource

InputSource 定义数据输入源，可以是列、字面量或生成值：

```typescript
// 从 CSV/Excel 列获取数据
{
  id: string;
  type: 'column';
  column: string;                 // 列名
  pipeline?: TransformPipeline;  // 可选的转换管道
}

// 使用固定字面量
{
  id: string;
  type: 'literal';
  value: any;                     // 字面量值
  pipeline?: TransformPipeline;  // 可选的转换管道
}

// 使用生成值（如当前时间、UUID）
{
  id: string;
  type: 'generated';
  generator: 'now' | 'uuid' | string;
  generatorParams?: Record<string, any>;
  pipeline?: TransformPipeline;  // 可选的转换管道
}
```

### CombineConfig

CombineConfig 定义如何将多个输入源合并成一个值：

```typescript
{
  plugin: string;                // 合并插件名称，如 "combine.concat", "combine.first"
  params?: any;                  // 插件参数
}
```

### TransformMapping

TransformMapping 是完整的映射规则：

```typescript
{
  targetField: string;           // 目标数据库字段路径
  inputs: InputSource[];         // 输入源数组
  combine: CombineConfig;        // 合并配置
  outputPipeline?: TransformPipeline;  // 可选的输出后处理管道
  required?: boolean;            // 是否必填
  defaultValue?: any;            // 默认值（当结果为空时使用）
  meta?: Record<string, any>;    // 可选的元数据
}
```

## 常用 Transform 插件

### 字符串处理
- `string.trim`: 去除首尾空格
- `string.uppercase`: 转大写
- `string.lowercase`: 转小写

### 日期处理
- `date.parse`: 解析日期字符串
  - `params.formats`: 日期格式数组，如 `["YYYY/MM/DD", "YYYY-MM-DD"]`
  - `params.precision`: `'date' | 'time' | 'datetime'`
- `date.format`: 格式化日期
  - `params.format`: 目标格式字符串
  - `params.precision`: `'date' | 'time' | 'datetime'`

### 邮政编码处理
- `char.toHalfWidth`: 数字英文与符号 全角转半角
- `char.toFullWidth`: 数字英文与符号 半角转全角
- `string.insertSymbol`: 在文字指定位置添加符号（默认-，可多个位置）

### 条件判断
- `condition.equals`: 判断值是否等于指定值

### 映射查找
- `lookup.map`: 完全一致映射（键值对）
- `lookup.contains`: 部分一致映射（文字列を含む場合にマッピング）
- `regex.extract`: 正規表現で値を抽出

### 文字列置換
- `string.replace`: 文字列を検索して置換（複数ルール対応）

## 常用 Combine 插件

- `combine.concat`: 连接多个值
  - `params.separator`: 分隔符（默认空字符串）
  - `params.ignoreEmpty`: 是否忽略空值（默认 true）
- `combine.first`: 返回第一个非空值

## 示例

### 示例1：简单列映射（带 trim）
```json
{
  "targetField": "recipientName",
  "inputs": [
    {
      "id": "input1",
      "type": "column",
      "column": "お届け先氏名",
      "pipeline": {
        "steps": [
          {
            "id": "step1",
            "plugin": "string.trim"
          }
        ]
      }
    }
  ],
  "combine": {
    "plugin": "combine.first"
  }
}
```

### 示例2：合并多列
```json
{
  "targetField": "recipientAddress",
  "inputs": [
    {
      "id": "input1",
      "type": "column",
      "column": "都道府県"
    },
    {
      "id": "input2",
      "type": "column",
      "column": "市区町村"
    },
    {
      "id": "input3",
      "type": "column",
      "column": "番地"
    }
  ],
  "combine": {
    "plugin": "combine.concat",
    "params": {
      "separator": "",
      "ignoreEmpty": true
    }
  },
  "outputPipeline": {
    "steps": [
      {
        "id": "step1",
        "plugin": "string.trim"
      }
    ]
  }
}
```

### 示例3：日期解析和格式化
```json
{
  "targetField": "shipPlanDate",
  "inputs": [
    {
      "id": "input1",
      "type": "column",
      "column": "出荷予定日",
      "pipeline": {
        "steps": [
          {
            "id": "step1",
            "plugin": "date.parse",
            "params": {
              "formats": ["YYYY/MM/DD", "YYYY-MM-DD", "YYYY年MM月DD日"],
              "precision": "date"
            }
          }
        ]
      }
    }
  ],
  "combine": {
    "plugin": "combine.first"
  }
}
```

## 配置类型 (ConfigType)

系统支持多种业务场景的映射配置：

- `ec-company-to-order`: ECモール CSV → 注文 - 用于将ECモール下载的CSV文件映射到注文数据结构（主要场景）
- `order-to-carrier`: 注文 → 配送会社 - 用于将注文数据映射到配送会社格式
- `customer`: 客户映射 - 用于客户信息的导入映射
- `product`: 产品映射 - 用于产品信息的导入映射
- `inventory`: 库存映射 - 用于库存数据的导入映射
- 自定义类型: 可以扩展其他业务场景的映射配置

### Schema 版本说明

当前系统使用 `schemaVersion: 2`。版本 2 的主要特点：

1. **Transform Pipeline 架构**: 使用管道式的数据转换，支持多步骤处理
2. **多输入源支持**: 单个目标字段可以从多个源获取数据
3. **灵活的组合方式**: 通过 Combine 插件实现多种数据合并策略
4. **错误处理机制**: 每个转换步骤可配置独立的错误处理策略

## 注意事项

1. 每个租户（tenant）可以有多个映射配置
2. 每个配置类型（configType）只能有一个默认配置
3. 设置为默认配置时，会自动取消同类型其他配置的默认状态
4. CSV和Excel文件使用相同的映射配置，系统不区分文件格式
5. 后端只负责保存配置，实际的数据转换在前端完成

