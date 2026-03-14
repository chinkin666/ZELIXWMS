# ZELIXWMS 设计文档（Design Document）

> 版本: 1.0 | 日期: 2026-03-14

---

## 1. 系统架构

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (SPA)                    │
│         Vue 3 + Pinia + Element Plus + Vite          │
│    ┌──────────┬──────────┬──────────┬──────────┐    │
│    │ 出荷管理  │ 入庫管理  │ 在庫管理  │  設定    │    │
│    └──────────┴──────────┴──────────┴──────────┘    │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP/REST (JSON)
                       ▼
┌─────────────────────────────────────────────────────┐
│                  Backend (API Server)                 │
│           Node.js + Express + TypeScript              │
│  ┌─────────────────────────────────────────────┐    │
│  │              API Routes Layer                │    │
│  │  35 Controllers × RESTful Endpoints          │    │
│  ├─────────────────────────────────────────────┤    │
│  │            Service Layer                     │    │
│  │  WorkflowEngine │ StockService │ B2Service   │    │
│  │  AutoProcessing │ RuleEngine   │ Render      │    │
│  ├─────────────────────────────────────────────┤    │
│  │            Data Access Layer                 │    │
│  │  Mongoose Models (35+ collections)           │    │
│  └─────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────┘
                       │
          ┌────────────┼──────────────┐
          ▼            ▼              ▼
    ┌──────────┐ ┌──────────┐  ┌──────────────┐
    │ MongoDB  │ │ B2 Cloud │  │ Sort Code    │
    │ Database │ │   API    │  │ Calculator   │
    └──────────┘ └──────────┘  └──────────────┘
```

### 1.2 部署架构

```
┌────────────────────────────────────────┐
│              Host Machine               │
│                                        │
│  ┌──────────────┐  ┌────────────────┐  │
│  │ Node.js      │  │ MongoDB        │  │
│  │ Backend      │  │ (standalone    │  │
│  │ :4000        │  │  or replica)   │  │
│  │              │  │ :27017         │  │
│  │ + Static     │  │                │  │
│  │   Frontend   │  │                │  │
│  └──────────────┘  └────────────────┘  │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ File Storage (FILE_STORAGE_DIR)  │  │
│  │ - Uploaded files                 │  │
│  │ - Generated PDFs                 │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

---

## 2. 前端设计

### 2.1 应用结构

```
frontend/src/
├── api/                    # API 客户端层（36 模块，基于 axios）
├── assets/                 # 静态资源
├── components/
│   ├── odoo/               # Odoo 风格基础组件库
│   │   ├── ODialog.vue     # 模态对话框
│   │   ├── OButton.vue     # 按钮组件
│   │   ├── ODatePicker.vue # 日期选择器
│   │   ├── OTagInput.vue   # 标签输入
│   │   ├── OFormSheet.vue  # 表单布局
│   │   ├── OStatusbar.vue  # 状态条
│   │   ├── OBarcodeListener.vue  # 条码扫描监听
│   │   ├── OImportWizard.vue     # 导入向导
│   │   └── ...
│   ├── core/datatable/     # 通用数据表格
│   ├── auto-processing/    # 自动处理规则编辑器
│   ├── carrier-automation/ # B2 验证/导出结果
│   ├── mapping/            # CSV 映射编辑器
│   ├── print/              # 打印预览
│   └── import/             # 导入对话框
├── composables/            # 全局可组合函数
│   ├── useAuth.ts
│   ├── useI18n.ts
│   ├── useToast.ts
│   └── ...
├── core/plugin/            # 插件系统
├── i18n/                   # 国际化（ja/en/zh）
├── layouts/
│   └── WmsLayout.vue       # 主布局（导航+子导航+侧边栏）
├── modules/
│   └── shipment/           # V2 出荷模块（模块化重构）
│       ├── pages/
│       ├── components/
│       └── composables/    # 14 个细粒度 composable
├── plugins/                # 插件实现
│   ├── barcode-field/
│   └── yamato-carrier/
├── router/                 # Vue Router（38 路由）
├── stores/wms/             # Pinia 状态管理
├── utils/                  # 工具函数
│   ├── transforms/         # 转换管道前端实现
│   ├── form-export/        # PDF 帳票生成
│   └── print/              # 标签打印工具
└── views/                  # 页面视图（按领域组织）
    ├── inbound/
    ├── inventory/
    ├── shipment/
    ├── stocktaking/
    ├── returns/
    ├── warehouse-ops/
    ├── daily/
    ├── set-products/
    └── settings/
```

### 2.2 状态管理设计

```
┌─────────────────────────────────────────────┐
│               Pinia Stores                   │
│                                             │
│  useWmsUserStore ──── 用户认证/角色/权限     │
│  useWmsConfigStore ── 系统配置              │
│  shipmentOrderDraft ─ 出荷单草稿状态        │
│  settings ─────────── UI 偏好设置           │
└─────────────────────────────────────────────┘
```

### 2.3 V2 模块化架构（出荷管理）

V2 页面采用细粒度 composable 拆分模式：

```
ShipmentOrderCreatePage.vue
  ├── useV2State.ts          # 响应式状态核心
  ├── useV2DataLoading.ts    # 数据加载 + 分页
  ├── useV2Counts.ts         # 状态计数徽标
  ├── useV2Submit.ts         # 创建/更新提交
  ├── useV2Validation.ts     # 订单校验
  ├── useV2BulkSettings.ts   # 批量编辑
  ├── useV2Bundle.ts         # 打包分组
  ├── useV2Labels.ts         # 标签打印
  ├── useV2B2Export.ts       # B2 导出
  ├── useV2B2Validation.ts   # B2 验证
  ├── useV2CarrierExport.ts  # 通用运营商导出
  ├── useV2HoldDelete.ts     # 保留/删除
  ├── useV2FormActions.ts    # 表单操作
  └── useV2ProductDefaults.ts # 商品默认值
```

### 2.4 导航结构设计

```
顶部导航（12 个主菜单）
├── ホーム（首页）
├── 商品管理
│   ├── 商品設定
│   └── バーコード管理
├── セット組
│   ├── セット商品一覧
│   ├── セット組作業
│   └── セット組履歴
├── 出荷指示
│   ├── 出荷指示入力 (V1)
│   └── 出荷指示入力 V2
├── 出荷作業
│   ├── 出荷一覧
│   ├── タスク
│   ├── 1:1 検品
│   └── N:1 検品
├── 出荷実績
├── 入庫管理
│   ├── ダッシュボード
│   ├── 入庫指示一覧
│   ├── 入庫指示作成
│   ├── 入庫履歴
│   └── CSV取込
├── 在庫管理
│   ├── 在庫一覧
│   ├── 移動履歴
│   ├── 在庫調整
│   ├── ロット管理
│   ├── 期限アラート
│   ├── ロケーション
│   └── 流水台帳
├── 棚卸
├── 返品
├── 倉庫作業
│   ├── タスクボード
│   ├── ウェーブ管理
│   └── シリアル番号
├── 日報
└── 設定（18 个子页面）
```

---

## 3. 后端设计

### 3.1 分层架构

```
Routes (路由定义)
    │
    ▼
Controllers (控制器 - 请求处理/参数校验/响应格式化)
    │
    ▼
Services (服务层 - 业务逻辑)
    │
    ▼
Models (数据模型 - Mongoose Schema/Hooks/索引)
    │
    ▼
MongoDB (数据存储)
```

### 3.2 核心服务设计

#### 3.2.1 工作流引擎（WorkflowEngine）

```
WorkflowEngine
├── InboundWorkflow (入库工作流)
│   ├── startReceiving()    → confirmed → receiving
│   ├── confirmReceiveLine() → 更新收货量 + InventoryLedger
│   ├── startPutaway()      → 创建上架任务
│   ├── completePutaway()   → 更新库存 + InventoryLedger
│   └── getWorkflowStatus() → 进度汇总
│
├── OutboundWorkflow (出库工作流)
│   ├── createWave()        → 创建 Wave + 汇总 SKU
│   ├── startPicking()      → picking 任务 + 库存预留
│   ├── completePickingTask() → 更新任务进度
│   ├── startSorting()      → picking → sorting
│   ├── completeSorting()   → sorting → packing
│   ├── completePacking()   → 库存消耗 + 自动出库
│   └── getWaveProgress()   → 进度汇总
│
└── ReplenishmentWorkflow (补货工作流)
    ├── checkAndTrigger()   → 安全库存检查
    └── completeReplenishment() → 储备 → 拣货库位
```

#### 3.2.2 库存服务（StockService）

```
StockService
├── reserveStockForOrder()
│   └── FEFO 分配：按到期日排序 → 增加 reservedQuantity → 创建 confirmed StockMove
├── completeStockForOrder()
│   └── confirmed → done StockMove → 减少 quantity + reservedQuantity
└── unreserveStockForOrder()
    └── 取消 confirmed StockMove → 恢复 reservedQuantity
```

#### 3.2.3 B2 Cloud 服务（YamatoB2Service）

```
YamatoB2Service
├── login() ─── 3层缓存: 内存 → MongoDB(carrier_session_caches) → API
├── authenticatedFetch() ─── 自动重试 (401/403/500+'entry')
├── validateShipments() ─── 日本語キー + /api/v1/shipments/validate
├── exportShipments() ──── 英語キー + /api/v1/shipments
├── exportAndPrint() ───── export → print (按服务类型分组)
├── printLabels() ─────── /api/v1/shipments/print
├── getHistory() ──────── /api/v1/history
├── deleteFromHistory() ── /api/v1/history (soft delete)
└── fetchBatchPdf() ────── /api/v1/shipments/pdf/batch
```

#### 3.2.4 自动处理引擎（AutoProcessingEngine）

```
Event 触发
    │
    ▼
查找匹配规则 (trigger.event === currentEvent && enabled)
    │
    ▼
评估条件 (conditions[] - AND 逻辑)
    │
    ├── orderField: 检查订单字段值
    ├── orderStatus: 检查状态标记
    ├── orderGroup: 检查分组
    ├── carrierRawRow: 检查运营商原始行数据
    └── sourceRawRow: 检查导入原始行数据
    │
    ▼
执行动作 (actions[])
    ├── addProduct: 解析 SKU → 添加商品 + 计算价格
    └── setOrderGroup: 设置检品分组
```

### 3.3 数据转换管道（Transform Pipeline）

```
输入源 (Inputs[])              组合 (Combine)         输出管道 (Output Pipeline)
┌──────────────┐
│ column: "A"  │──┐
│ pipeline: [] │  │
├──────────────┤  │   ┌──────────┐     ┌──────────────────┐
│ column: "B"  │──┼──>│ concat   │────>│ trim → replace   │──> 最终值
│ pipeline: [] │  │   │ first    │     │ → dateFormat     │
├──────────────┤  │   │ coalesce │     │ → map            │
│ literal: "X" │──┘   └──────────┘     └──────────────────┘
└──────────────┘
```

### 3.4 渲染管道

```
Print Template (Canvas 模板)
    │
    ▼
Order Data + Transform Pipeline → 变量值
    │
    ▼
Skia Canvas (服务端)
├── 文本渲染 (日文字体)
├── 条码渲染 (bwip-js)
├── QR 码渲染
├── 图片渲染
└── 矩形/线条
    │
    ▼
PNG Image
    │
    ▼
PDF Assembly (pdf-lib / Muhammara)
├── 单页或多页
├── 缓存 (renderCache + pdfCache)
└── Worker 线程并行 (Piscina)
```

---

## 4. 数据库设计

### 4.1 集合关系图

```
                    ┌──────────┐
                    │  Tenant  │
                    └────┬─────┘
                         │ 1:N
              ┌──────────┼──────────┐
              ▼          ▼          ▼
        ┌──────────┐ ┌──────┐ ┌────────┐
        │Warehouse │ │Client│ │  User  │
        └────┬─────┘ └──────┘ └────────┘
             │ 1:N
             ▼
        ┌──────────┐
        │ Location │ (hierarchical: zone > shelf > bin)
        └────┬─────┘
             │ 1:N
             ▼
        ┌──────────┐        ┌─────────┐
        │StockQuant│◄───────│ Product │
        │(qty,res) │  N:1   │(SKU,bar)│
        └────┬─────┘        └────┬────┘
             │ 1:N               │ 1:N
             ▼                   ▼
        ┌──────────┐        ┌────────┐
        │StockMove │        │  Lot   │
        └──────────┘        └────────┘

        ┌───────────────┐        ┌──────────────┐
        │ShipmentOrder  │───N:1──│  OrderGroup  │
        │(products[])   │───N:1──│OrderSourceCo │
        └───────┬───────┘───N:1──│   Carrier    │
                │                └──────────────┘
                │ N:1
                ▼
           ┌────────┐
           │  Wave  │──1:N──> WarehouseTask
           └────────┘

        ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐
        │ InboundOrder │  │ ReturnOrder   │  │StocktakingOrder │
        └──────────────┘  └───────────────┘  └─────────────────┘
                │                 │                    │
                └─────────┬──────┘────────────────────┘
                          ▼
                   ┌──────────────┐
                   │InventoryLedger│ (append-only audit log)
                   └──────────────┘
```

### 4.2 核心索引设计

| 集合 | 索引 | 类型 |
|------|------|------|
| orders | `orderNumber` | unique |
| orders | `carrierId + status.confirm.isConfirmed` | compound |
| orders | `_productsMeta.skus` | multikey |
| orders | `trackingId` | sparse |
| products | `sku` | unique |
| products | `_allSku` | unique, multikey |
| products | `barcode` | multikey |
| stock_quants | `productId + locationId + lotId` | unique compound |
| locations | `warehouseId + fullPath` | compound |
| lots | `productId + lotNumber` | unique compound |
| waves | `status + warehouseId` | compound |

### 4.3 订单状态模型

```
ShipmentOrder.status (6 个独立布尔状态):
┌─────────────┐  ┌─────────┐  ┌─────────┐  ┌───────────┐  ┌─────────┐  ┌────────────┐
│carrierReceipt│→│ confirm │→│ printed │→│ inspected │→│ shipped │→│ ecExported │
│  (回执)      │  │ (確認)  │  │ (印刷)  │  │ (検品)    │  │ (出荷)  │  │ (EC出力)   │
└─────────────┘  └─────────┘  └─────────┘  └───────────┘  └─────────┘  └────────────┘
+ held (保留) — 独立状态，可与其他状态并存

InboundOrder.status (线性):
draft → confirmed → receiving → received → done | cancelled

Wave.status (线性):
draft → picking → sorting → packing → completed | cancelled

ReturnOrder.status (线性):
draft → inspecting → completed | cancelled

StocktakingOrder.status (线性):
draft → in_progress → completed → adjusted | cancelled
```

---

## 5. 安全设计

### 5.1 现有安全措施

| 措施 | 实现 |
|------|------|
| HTTP 安全头 | Helmet middleware |
| CORS | 白名单配置 (FRONTEND_URL) |
| 角色权限 | 4级层级 (super_admin > admin > operator > viewer) |
| 审计日志 | OperationLog + ApiLog |
| API 会话缓存 | 加密存储在 MongoDB |

### 5.2 待完善项

| 项目 | 当前状态 | 建议 |
|------|----------|------|
| 后端认证 | 无中间件 | 添加 JWT/Session 中间件 |
| 前端认证 | Mock (localStorage) | 接入后端认证 API |
| 多租户隔离 | 应用层过滤 | 添加中间件级租户隔离 |
| 输入校验 | 部分使用 Zod | 全面启用 Zod 校验 |
| Rate Limiting | 未实现 | 添加 express-rate-limit |

---

## 6. 集成设计

### 6.1 ヤマト B2 Cloud 集成

```
ZELIXWMS                          B2 Cloud API
   │                                   │
   │──── POST /login ─────────────────>│
   │<─── session token ───────────────│
   │                                   │
   │──── POST /shipments/validate ───>│  (日本語キー)
   │<─── validation results ──────────│
   │                                   │
   │──── POST /shipments ────────────>│  (英語キー)
   │<─── tracking numbers ───────────│
   │                                   │
   │──── POST /shipments/print ──────>│
   │<─── label PDF (base64) ─────────│
   │                                   │
   │──── POST /shipments/pdf/batch ──>│
   │<─── merged PDF ─────────────────│
```

### 6.2 CSV/Excel 导入流程

```
EC 平台 CSV/Excel
       │
       ▼
MappingConfig 查找 (按 orderSourceCompanyId)
       │
       ▼
Transform Pipeline 执行
├── 列映射 (column input)
├── 固定值 (literal input)
├── 自动生成 (generated input)
├── 管道转换 (trim/replace/split/map/dateFormat)
├── 组合策略 (concat/first/coalesce)
└── 输出管道 (最终格式化)
       │
       ▼
OrderDocument 校验
       │
       ▼
SKU → Product 自动匹配 (支持 sub-SKU)
       │
       ▼
ShipmentOrder 创建 + processOrderEvent('order.created')
```

---

## 7. UI/UX 设计原则

### 7.1 组件设计

- **Odoo 风格组件库**：借鉴 Odoo ERP 的 UI 模式，提供统一的 WMS 操作体验
- **数据表格**：WmsDataTable 提供分页、选择、排序、分组功能
- **搜索面板**：SearchPanel 支持多字段筛选、运算符选择
- **状态栏**：OStatusbar 可视化展示订单流转状态
- **批量操作栏**：OBatchActionBar 支持多选后批量操作

### 7.2 响应式设计

- 桌面端：顶部导航 + 子导航
- 移动端：汉堡菜单 + 侧边栏抽屉
- 打印页面：独立路由，无布局干扰

### 7.3 硬件集成

- **条码扫描器**：OBarcodeListener 监听键盘事件，自动识别扫描输入
- **打印机**：PrinterSettings 管理打印机连接，支持模板分配
