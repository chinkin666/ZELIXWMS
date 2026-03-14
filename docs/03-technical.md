# ZELIXWMS 技术文档（Technical Document）

> 版本: 1.0 | 日期: 2026-03-14

---

## 1. 技术栈

### 1.1 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | ≥20 | 运行时 |
| Express | 4.x | Web 框架 |
| TypeScript | 5.x | 类型安全 |
| Mongoose | 8.x | MongoDB ODM |
| Zod | - | 输入校验 |
| Pino | - | 日志 |
| Helmet | - | HTTP 安全头 |
| Morgan | - | HTTP 请求日志 |
| @napi-rs/canvas (Skia) | - | 服务端 Canvas 渲染 |
| pdf-lib | - | PDF 操作 |
| bwip-js | - | 条码生成 |
| sharp | - | 图像处理 |
| Piscina | - | Worker 线程池 |
| csv-parse / csv-stringify | - | CSV 处理 |
| xlsx | - | Excel 处理 |

### 1.2 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue | 3.x | UI 框架 |
| Vue Router | 4.x | 路由 |
| Pinia | 3.x | 状态管理 |
| Vite | 7.x | 构建工具 |
| Element Plus | - | UI 组件库 |
| TypeScript | 5.x | 类型安全 |
| Konva | - | Canvas 编辑器 |
| xlsx | - | Excel 处理 |
| pdf-lib | - | PDF 操作 |
| pdfmake | - | PDF 文档生成 |
| Chart.js | - | 图表 |
| axios | - | HTTP 客户端 |

### 1.3 数据库

| 技术 | 说明 |
|------|------|
| MongoDB | 主数据存储（standalone 或 replica set） |
| 默认 URI | `mongodb://127.0.0.1:27017/nexand-shipment` |
| 事务支持 | 需要 Replica Set 模式 |

---

## 2. 项目结构

```
ZELIXWMS/
├── backend/
│   ├── src/
│   │   ├── server.ts              # 入口：HTTP 服务启动
│   │   ├── app.ts                 # Express 应用工厂
│   │   ├── config/
│   │   │   ├── env.ts             # 环境变量加载 (AppEnv)
│   │   │   └── database.ts        # MongoDB 连接管理
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   └── index.ts       # 路由注册（35 路由前缀）
│   │   │   └── controllers/       # 35 控制器
│   │   │       ├── shipmentOrderController.ts   # 最复杂控制器
│   │   │       ├── inboundOrderController.ts
│   │   │       ├── inventoryController.ts
│   │   │       ├── carrierAutomationController.ts
│   │   │       ├── workflowController.ts
│   │   │       ├── waveController.ts
│   │   │       └── ...
│   │   ├── models/                # 35+ Mongoose 模型
│   │   │   ├── shipmentOrder.ts   # orders 集合
│   │   │   ├── inboundOrder.ts
│   │   │   ├── product.ts
│   │   │   ├── stockQuant.ts
│   │   │   ├── stockMove.ts
│   │   │   ├── inventoryLedger.ts
│   │   │   ├── location.ts
│   │   │   ├── lot.ts
│   │   │   ├── wave.ts
│   │   │   ├── warehouseTask.ts
│   │   │   └── ...
│   │   ├── services/
│   │   │   ├── workflowEngine.ts         # 工作流引擎入口
│   │   │   ├── inboundWorkflow.ts        # 入库工作流
│   │   │   ├── outboundWorkflow.ts       # 出库工作流
│   │   │   ├── replenishmentWorkflow.ts  # 补货工作流
│   │   │   ├── stockService.ts           # 库存预留/消耗/释放
│   │   │   ├── yamatoB2Service.ts        # ⚠️ 禁止修改核心
│   │   │   ├── yamatoCalcService.ts      # 分拣码计算
│   │   │   ├── autoProcessingEngine.ts   # 自动处理引擎
│   │   │   ├── mappingConfigService.ts   # 转换管道执行
│   │   │   ├── ruleEngine.ts             # 规则引擎
│   │   │   ├── taskEngine.ts             # 任务创建辅助
│   │   │   ├── printTemplateService.ts   # 标签渲染
│   │   │   ├── operationLogger.ts        # 操作日志
│   │   │   ├── apiLogger.ts              # API 日志
│   │   │   └── render/                   # 渲染服务
│   │   │       ├── renderService.ts
│   │   │       └── konva/
│   │   │           ├── skiaRenderer.ts
│   │   │           ├── skiaBarcode.ts
│   │   │           ├── pdfAssembler.ts
│   │   │           ├── renderWorker.ts
│   │   │           └── fontManager.ts
│   │   ├── utils/
│   │   │   ├── yamatoB2Format.ts         # ⚠️ 禁止修改
│   │   │   ├── japaneseCharWidth.ts      # 全角/半角字符处理
│   │   │   ├── idGenerator.ts
│   │   │   ├── sequenceGenerator.ts
│   │   │   ├── naturalSort.ts
│   │   │   ├── carrierFormatParser.ts
│   │   │   └── carrierMappings.ts
│   │   └── transforms/                   # 转换插件
│   │       ├── core.ts
│   │       ├── combine.ts
│   │       └── metadata.ts
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── main.ts
│   │   ├── App.vue
│   │   ├── api/                   # 36 API 客户端模块
│   │   │   ├── base.ts            # axios 封装
│   │   │   ├── shipmentOrders.ts
│   │   │   ├── inboundOrders.ts
│   │   │   └── ...
│   │   ├── components/
│   │   │   ├── odoo/              # 基础组件库
│   │   │   └── core/datatable/    # 数据表格
│   │   ├── composables/           # 全局 composable
│   │   ├── i18n/                  # ja/en/zh
│   │   ├── layouts/WmsLayout.vue
│   │   ├── modules/shipment/      # V2 出荷模块
│   │   ├── router/index.ts        # 38 路由
│   │   ├── stores/wms/
│   │   ├── utils/
│   │   │   ├── transforms/
│   │   │   ├── form-export/
│   │   │   └── print/
│   │   └── views/                 # 页面视图
│   ├── vite.config.ts
│   └── package.json
├── shared/                        # 共享类型
├── carrier-format/                # 运营商 CSV 格式定义
├── local-db/                      # 本地 MongoDB 数据
├── docs/                          # 文档
└── package.json                   # Monorepo 根配置
```

---

## 3. 环境配置

### 3.1 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 4000 | 服务端口 |
| `HOST` | 0.0.0.0 | 绑定地址 |
| `MONGODB_URI` | mongodb://127.0.0.1:27017/nexand-shipment | 数据库连接 |
| `FRONTEND_URL` | - | CORS 白名单 |
| `FILE_STORAGE_DIR` | - | 文件存储目录 |
| `YAMATO_CALC_BASE_URL` | - | 分拣码计算服务地址 |

### 3.2 前端环境

| 文件 | 用途 |
|------|------|
| `.env.development` | 开发环境（API base URL） |
| `vite.config.ts` | Vite 配置（proxy 代理设置） |

---

## 4. API 接口规范

### 4.1 路由前缀一览

所有接口基于 `/api/` 前缀：

| 前缀 | 说明 | 关键操作 |
|------|------|----------|
| `/api/shipment-orders` | 出荷指示 | CRUD, 批量导入, 状态变更, 分拣码计算 |
| `/api/carrier-automation` | 运营商自动化 | validate, export, export-and-print, history, pdf/batch |
| `/api/inbound-orders` | 入库指示 | CRUD, 状态流转 |
| `/api/inventory` | 库存 | 查询, 调整, 移动 |
| `/api/products` | 商品 | CRUD, SKU 查找 |
| `/api/locations` | 库位 | CRUD, 层级管理 |
| `/api/lots` | 批次 | CRUD, 状态管理 |
| `/api/waves` | Wave | 生命周期管理 |
| `/api/tasks` | 任务 | 分配, 执行, 完成 |
| `/api/workflows` | 工作流 | 入库/出库/补货操作 |
| `/api/return-orders` | 退货 | CRUD, 处置 |
| `/api/stocktaking-orders` | 盘点 | CRUD, 盘差调整 |
| `/api/mapping-configs` | 映射配置 | CRUD, 转换测试 |
| `/api/print-templates` | 标签模板 | CRUD |
| `/api/form-templates` | 帳票模板 | CRUD |
| `/api/render` | 渲染 | PDF/图片生成 |
| `/api/carriers` | 运营商 | CRUD |
| `/api/order-groups` | 检品分组 | CRUD |
| `/api/auto-processing-rules` | 自动处理规则 | CRUD, 手动执行 |
| `/api/order-source-companies` | 依赖主公司 | CRUD |
| `/api/daily-reports` | 日报 | CRUD |
| `/api/set-products` | 套装商品 | CRUD |
| `/api/suppliers` | 供应商 | CRUD |
| `/api/customers` | 得意先 | CRUD |
| `/api/clients` | 荷主 | CRUD |
| `/api/warehouses` | 仓库 | CRUD |
| `/api/tenants` | 租户 | CRUD |
| `/api/serial-numbers` | 序列号 | CRUD |
| `/api/inventory-categories` | 库存分类 | CRUD |
| `/api/inventory-ledger` | 流水台帳 | 查询 |
| `/api/operation-logs` | 操作日志 | 查询 |
| `/api/api-logs` | API 日志 | 查询 |
| `/api/email-templates` | 邮件模板 | CRUD |
| `/api/wms-schedules` | 定时任务 | CRUD |
| `/api/rules` | 业务规则 | CRUD |
| `/api/system-settings` | 系统设置 | 读写 |

### 4.2 搜索/筛选接口规范

出荷指示列表支持丰富的筛选操作符：

```json
{
  "filters": {
    "fieldName": {
      "operator": "is|isNot|contains|notContains|hasAnyValue|isEmpty|equals|notEquals|lessThan|greaterThan|between|before|after|today|thisWeek",
      "value": "..."
    }
  },
  "page": 1,
  "limit": 50,
  "sort": { "field": "createdAt", "order": "desc" }
}
```

### 4.3 B2 Cloud API 调用规范

**验证（Validate）**：使用日本語キー + ShipmentInput schema
```
POST /api/v1/shipments/validate
Content-Type: application/json
Authorization: Bearer {sessionToken}
Body: { shipments: [{ "届け先電話番号": "...", ... }] }
```

**登录（Export）**：使用英語キー
```
POST /api/v1/shipments
Content-Type: application/json
Authorization: Bearer {sessionToken}
Body: { shipments: [{ "consignee_tel1": "...", ... }] }
```

**注意**: `/api/v1/shipments/validate-full` 不使用（幅チェッカーにバグあり）

---

## 5. 数据模型详细规格

### 5.1 ShipmentOrder (orders)

```typescript
{
  orderNumber: string;           // 系统生成唯一号
  carrierId: ObjectId | string;  // 运营商ID（或内置字符串如 __builtin_yamato_b2__）
  customerManagementNumber: string;
  trackingId: string;            // 运单号

  recipient: Address;            // 收件人
  orderer: Address;              // 注文者
  sender: Address;               // 发件人

  products: [{
    inputSku: string;
    quantity: number;
    productId: ObjectId;
    productSku: string;
    productName: string;
    matchedSubSku: string;
    barcode: string[];
    coolType: string;
    mailCalcEnabled: boolean;
    unitPrice: number;
    subtotal: number;
  }];

  _productsMeta: {               // pre-save hook 自动计算
    skus: string[];
    names: string[];
    barcodes: string[];
    skuCount: number;
    totalQuantity: number;
    totalPrice: number;
  };

  invoiceType: '0'|'1'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'A';
  coolType: '0'|'1'|'2';        // 通常/冷凍/冷蔵
  deliveryTimeSlot: string;      // "1012" = 10:00-12:00
  shipPlanDate: Date;
  deliveryDatePreference: Date;
  handlingTags: string[];
  orderGroupId: ObjectId;
  orderSourceCompanyId: ObjectId;

  carrierData: {
    yamato: {
      sortingCode: string;
      hatsuBaseNo1: string;
      hatsuBaseNo2: string;
    };
  };

  status: {
    carrierReceipt: { isReceived: boolean, receivedAt: Date };
    confirm:        { isConfirmed: boolean, confirmedAt: Date };
    printed:        { isPrinted: boolean, printedAt: Date };
    inspected:      { isInspected: boolean, inspectedAt: Date };
    shipped:        { isShipped: boolean, shippedAt: Date };
    ecExported:     { isExported: boolean, exportedAt: Date };
    held:           { isHeld: boolean, heldAt: Date };
  };

  internalRecord: [{             // 状态变更审计
    action: string;
    timestamp: Date;
    details: any;
  }];

  sourceRawRows: any[];          // CSV/Excel 原始行数据
  carrierRawRow: any;            // 运营商结果数据
  tenantId: string;
}
```

### 5.2 Address 子文档

```typescript
{
  postalCode: string;    // 郵便番号
  prefecture: string;    // 都道府県
  city: string;          // 市区町村
  street: string;        // 町域・番地
  building: string;      // 建物名
  name: string;          // 氏名
  phone: string;         // 電話番号
  companyName: string;   // 会社名
}
```

### 5.3 StockQuant (stock_quants)

```typescript
{
  productId: ObjectId;      // unique compound with locationId + lotId
  locationId: ObjectId;
  lotId: ObjectId;
  quantity: number;          // 実在庫
  reservedQuantity: number;  // 引当済み
  lastMovedAt: Date;
}
// 可用量 = quantity - reservedQuantity
```

### 5.4 Location (locations)

```typescript
{
  name: string;
  type: 'warehouse'|'zone'|'shelf'|'bin'|'staging'|'receiving'|'virtual/supplier'|'virtual/customer';
  parentId: ObjectId;       // 層級関係
  warehouseId: ObjectId;
  coolType: string;         // 温度帯
  fullPath: string;         // 例: "WH1/Zone-A/Shelf-01/Bin-003"
  sortOrder: number;
  capacity: number;
}
```

---

## 6. 核心算法

### 6.1 FEFO 库存分配算法

```
reserveStockForOrder(orderId, products):
  for each product in products:
    remainingQty = product.quantity
    quants = StockQuant.find({ productId })
      .populate('lotId')
      .sort({ 'lotId.expiryDate': 'asc' })  // 先到期先出

    for each quant in quants:
      available = quant.quantity - quant.reservedQuantity
      if available <= 0: continue

      reserveQty = min(available, remainingQty)
      quant.reservedQuantity += reserveQty
      quant.save()

      StockMove.create({
        type: 'outbound',
        status: 'confirmed',
        productId, quantity: reserveQty,
        fromLocationId: quant.locationId,
        referenceType: 'shipment-order',
        referenceId: orderId
      })

      remainingQty -= reserveQty
      if remainingQty <= 0: break
```

### 6.2 日文字符宽度计算

```
sliceByWidth(str, maxWidth):
  // 全角字符 = 2 宽度单位
  // 半角字符 = 1 宽度单位
  // 用于 B2 Cloud API 字段截断
  width = 0
  for each char in str:
    charWidth = isFullWidth(char) ? 2 : 1
    if width + charWidth > maxWidth: break
    width += charWidth
    result += char
  return result
```

### 6.3 订单号生成

```
generateOrderNumber():
  sequence = SequenceCounter.findOneAndUpdate(
    { name: 'shipmentOrder', date: today },
    { $inc: { seq: 1 } },
    { upsert: true }
  )
  return `SO-${yyyymmdd}-${padStart(sequence.seq, 5, '0')}`
  // 例: SO-20260314-00001
```

---

## 7. Worker 线程渲染架构

```
主线程 (Express)
    │
    ├── renderService.ts
    │   ├── 解析模板 + 数据绑定
    │   ├── 检查缓存 (renderCache)
    │   │
    │   ├── 命中缓存 → 直接返回
    │   │
    │   └── 未命中 → 提交到 Piscina Worker Pool
    │       │
    │       ▼
    │   renderWorker.ts (Worker 线程)
    │   ├── skiaRenderer.ts → Canvas 绘制
    │   ├── skiaBarcode.ts → 条码/QR 码
    │   ├── fontManager.ts → 日文字体
    │   └── 返回 PNG Buffer
    │
    ├── pdfAssembler.ts
    │   ├── PNG → PDF 页面
    │   ├── 多页组装
    │   └── 返回 PDF Buffer
    │
    └── pdfCache.ts → 缓存结果
```

---

## 8. 错误处理与重试

### 8.1 B2 Cloud Session 管理

```
authenticatedFetch(url, options):
  session = await login()  // 3 层缓存
  response = await fetch(url, { headers: { Authorization: session } })

  if response.status in [401, 403] OR (status === 500 AND body contains 'entry'):
    // Session 过期，清除缓存并重试
    clearSessionCache()
    session = await login()  // 强制重新登录
    response = await fetch(url, { headers: { Authorization: session } })

  return response
```

### 8.2 MongoDB 重连

```
database.ts:
  mongoose.connection.on('disconnected', () => {
    setTimeout(() => mongoose.connect(uri), 5000)
  })
  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB error', err)
  })
```

---

## 9. 缓存策略

| 缓存层 | 位置 | 用途 | TTL |
|--------|------|------|-----|
| B2 Session (内存) | yamatoB2Service | API 会话 token | 直到过期 |
| B2 Session (MongoDB) | carrier_session_caches | 持久化会话 | 直到过期 |
| 渲染缓存 | renderCache | 标签图片缓存 | 配置决定 |
| PDF 缓存 | pdfCache | 生成的 PDF | 配置决定 |

---

## 10. 日志系统

| 日志类型 | 实现 | 存储 |
|----------|------|------|
| HTTP 请求 | Morgan middleware | stdout |
| 应用日志 | Pino logger | stdout |
| WMS 操作 | OperationLog model | MongoDB (operation_logs) |
| API 调用 | ApiLog model | MongoDB (api_logs) |
| 自动处理 | AutoProcessingLog model | MongoDB (auto_processing_logs) |
