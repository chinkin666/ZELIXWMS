# ZELIXWMS NestJS 后端架构设计
# ZELIXWMS NestJS バックエンドアーキテクチャ設計

> 从 Express.js + MongoDB 迁移到 NestJS 11 + Drizzle ORM + PostgreSQL 16 (Supabase) 的架构设计文档
> Express.js + MongoDB から NestJS 11 + Drizzle ORM + PostgreSQL 16 (Supabase) への移行設計書

---

## 1. 架构概要 / アーキテクチャ概要

### 1.1 技术栈 / 技術スタック

| 层 / レイヤー | 现行 (Express) | 迁移后 (NestJS) |
|---|---|---|
| 框架 / フレームワーク | Express 4.x | **NestJS 11 + Fastify** |
| 语言 / 言語 | TypeScript 5.6 | TypeScript 5.6 (维持 / 維持) |
| ORM / DB | Mongoose 8 + MongoDB | **Drizzle ORM + PostgreSQL 16 (Supabase)** |
| HTTP 平台 / プラットフォーム | Express built-in | **@nestjs/platform-fastify** |
| 认证 / 認証 | 自前 JWT (jsonwebtoken) | **Supabase Auth (JWT)** |
| 验证 / バリデーション | Zod 3.x | class-validator + class-transformer (NestJS 标准) |
| 队列 / キュー | BullMQ + ioredis | @nestjs/bullmq + ioredis (维持 / 維持) |
| 日志 / ロギング | Pino 9.x | **Pino 9.x (nestjs-pino)** |
| 测试 / テスト | Vitest 4.x | Vitest 4.x (维持 / 維持) |
| API 文档 / ドキュメント | swagger-jsdoc | **@nestjs/swagger (Decorator ベース)** |
| 事件 / イベント | 无 / なし | **EventEmitter2 (@nestjs/event-emitter)** |

### 1.2 设计原则 / 設計原則

1. **模块化单体 / モジュラーモノリス**: NestJS Module 单位功能分离，**不是微服务**。各 Module 独立测试、独立部署准备
2. **Repository 模式 / リポジトリパターン**: 数据访问封装在 Repository 层，Service 层不直接操作 Drizzle
3. **Service 层 / サービス層**: 业务逻辑集中在 Service，Controller 只做请求解析和响应格式化
4. **Controller 层 / コントローラ層**: 轻量级，负责路由、验证、调用 Service、返回结果
5. **不可变性 / 不変性**: DTO 是 readonly，Service 是无状态的
6. **租户隔离 / テナント分離**: 全查询自动附加 tenant_id 过滤 + PostgreSQL RLS
7. **事务 / トランザクション**: 利用 Drizzle 实现 MongoDB 时代缺失的 ACID 事务
8. **向后兼容 / 後方互換**: API 路径结构维持不变，前端改动最小化

### 1.3 架构分层图 / アーキテクチャレイヤー図

```
┌─────────────────────────────────────────────────────┐
│                    Client (Vue 3)                     │
└───────────────────────┬─────────────────────────────┘
                        │ HTTP / WebSocket
┌───────────────────────▼─────────────────────────────┐
│              Fastify HTTP Platform                    │
├─────────────────────────────────────────────────────┤
│  Middleware Pipeline:                                 │
│  Fastify Hooks → AuthGuard → TenantGuard → RoleGuard │
│  → ValidationPipe → Controller → TransformInterceptor │
├─────────────────────────────────────────────────────┤
│                  Controller Layer                     │
│  (路由解析 / ルーティング、DTO 验证 / バリデーション)     │
├─────────────────────────────────────────────────────┤
│                   Service Layer                       │
│  (业务逻辑 / ビジネスロジック、事务编排 / トランザクション) │
├─────────────────────────────────────────────────────┤
│                 Repository Layer                      │
│  (数据访问 / データアクセス、tenant_id 自动过滤)         │
├─────────────────────────────────────────────────────┤
│           Drizzle ORM + PostgreSQL 16                 │
│              (Supabase hosted)                        │
└─────────────────────────────────────────────────────┘
         ┌──────────┐    ┌────────────────┐
         │  Redis   │    │  BullMQ Queues │
         │ (Cache)  │    │  (7 queues)    │
         └──────────┘    └────────────────┘
```

---

## 2. 目录结构 / ディレクトリ構成

```
backend/
├── src/
│   ├── app.module.ts                      # 根模块 / ルートモジュール
│   ├── main.ts                            # 入口 (Fastify bootstrap) / エントリポイント
│   │
│   ├── common/                            # ── 共享模块 / 共通モジュール ──
│   │   ├── guards/
│   │   │   ├── auth.guard.ts              # JWT 验证 / JWT 検証
│   │   │   ├── tenant.guard.ts            # 租户隔离 / テナント分離
│   │   │   └── role.guard.ts              # RBAC 角色验证 / ロール検証
│   │   ├── interceptors/
│   │   │   ├── transform.interceptor.ts   # 响应格式化 / レスポンス整形
│   │   │   └── logging.interceptor.ts     # 请求日志 / リクエストログ
│   │   ├── pipes/
│   │   │   ├── validation.pipe.ts         # 全局验证管道 / グローバルバリデーション
│   │   │   └── pagination.pipe.ts         # 分页参数解析 / ページネーション解析
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts  # @CurrentUser()
│   │   │   ├── tenant-id.decorator.ts     # @TenantId()
│   │   │   └── roles.decorator.ts         # @Roles('admin', 'manager')
│   │   ├── filters/
│   │   │   └── all-exceptions.filter.ts   # 全局异常过滤器 / グローバル例外フィルタ
│   │   ├── dto/
│   │   │   ├── pagination.dto.ts          # page, limit
│   │   │   └── sort.dto.ts               # sort, order
│   │   └── errors/
│   │       ├── wms-not-found.exception.ts
│   │       └── insufficient-stock.exception.ts
│   │
│   ├── database/                          # ── 数据库 / データベース ──
│   │   ├── drizzle.module.ts              # Drizzle 全局模块 / グローバルモジュール
│   │   ├── schema/                        # Drizzle 表定义 / テーブル定義
│   │   │   ├── index.ts
│   │   │   ├── tenants.ts
│   │   │   ├── users.ts
│   │   │   ├── products.ts
│   │   │   ├── shipment-orders.ts
│   │   │   ├── inbound-orders.ts
│   │   │   ├── inventory.ts              # stock_quants, stock_moves
│   │   │   ├── lots.ts
│   │   │   ├── locations.ts
│   │   │   ├── carriers.ts
│   │   │   ├── clients.ts
│   │   │   ├── billing.ts               # billing_records, invoices
│   │   │   ├── returns.ts
│   │   │   ├── stocktaking.ts
│   │   │   ├── tasks.ts
│   │   │   ├── extensions.ts
│   │   │   ├── notifications.ts
│   │   │   └── audit.ts                 # operation_logs, api_logs
│   │   ├── repositories/
│   │   │   ├── base.repository.ts        # BaseRepository 抽象类 / 抽象クラス
│   │   │   ├── products.repository.ts
│   │   │   ├── shipment-orders.repository.ts
│   │   │   ├── inbound-orders.repository.ts
│   │   │   ├── inventory.repository.ts
│   │   │   └── ...                       # 每个实体一个 / エンティティごとに1つ
│   │   └── migrations/                   # SQL 迁移文件 / マイグレーションファイル
│   │
│   ├── auth/                             # ── 认证 / 認証 ──
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── portal-auth.controller.ts     # 货主门户认证 / 荷主ポータル認証
│   │   └── dto/
│   │
│   ├── modules/                          # ── 16 个业务模块 / 16業務モジュール ──
│   │   ├── products/
│   │   │   ├── products.module.ts
│   │   │   ├── products.controller.ts
│   │   │   ├── products.service.ts
│   │   │   ├── set-products.controller.ts
│   │   │   ├── set-products.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── inventory/
│   │   │   ├── inventory.module.ts
│   │   │   ├── inventory.controller.ts
│   │   │   ├── stock.service.ts          # 预留、移动、调整 / 引当・移動・調整
│   │   │   ├── inventory.service.ts      # 列表、汇总 / 一覧・集計
│   │   │   ├── inventory-ledger.service.ts
│   │   │   ├── lot.service.ts
│   │   │   ├── serial-number.service.ts
│   │   │   ├── location.service.ts
│   │   │   ├── inventory-category.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── inbound/
│   │   │   ├── inbound.module.ts
│   │   │   ├── inbound.controller.ts
│   │   │   ├── inbound.service.ts
│   │   │   ├── inbound-workflow.service.ts  # 确认→验收→上架→完成
│   │   │   ├── passthrough.controller.ts    # 通过型入库 / 通過型入庫
│   │   │   ├── passthrough.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── shipment/
│   │   │   ├── shipment.module.ts
│   │   │   ├── shipment.controller.ts
│   │   │   ├── shipment.service.ts
│   │   │   ├── outbound-request.controller.ts
│   │   │   ├── outbound-request.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── warehouse/                    # 含棚卸 / 棚卸含む
│   │   │   ├── warehouse.module.ts
│   │   │   ├── warehouse.controller.ts
│   │   │   ├── warehouse.service.ts
│   │   │   ├── task.controller.ts        # 拣货、分拣 / ピッキング・仕分け
│   │   │   ├── task.service.ts
│   │   │   ├── wave.controller.ts
│   │   │   ├── wave.service.ts
│   │   │   ├── inspection.controller.ts
│   │   │   ├── inspection.service.ts
│   │   │   ├── labeling.controller.ts
│   │   │   ├── labeling.service.ts
│   │   │   ├── stocktaking.controller.ts
│   │   │   ├── stocktaking.service.ts
│   │   │   ├── cycle-count.controller.ts
│   │   │   ├── cycle-count.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── returns/
│   │   │   ├── returns.module.ts
│   │   │   ├── returns.controller.ts
│   │   │   ├── returns.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── billing/
│   │   │   ├── billing.module.ts
│   │   │   ├── billing.controller.ts
│   │   │   ├── billing.service.ts
│   │   │   ├── service-rate.controller.ts
│   │   │   ├── service-rate.service.ts
│   │   │   ├── work-charge.controller.ts
│   │   │   ├── work-charge.service.ts
│   │   │   ├── shipping-rate.controller.ts
│   │   │   ├── shipping-rate.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── carriers/                     # 含 B2 Cloud wrapper / B2 Cloud ラッパー含む
│   │   │   ├── carriers.module.ts
│   │   │   ├── carriers.controller.ts
│   │   │   ├── carriers.service.ts
│   │   │   ├── carrier-automation.controller.ts
│   │   │   ├── carrier-automation.service.ts
│   │   │   ├── b2-cloud.service.ts       # ★ 禁止修改内部 / 内部変更禁止 ★
│   │   │   ├── sagawa.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── clients/                      # 含门户 / ポータル含む
│   │   │   ├── clients.module.ts
│   │   │   ├── clients.controller.ts
│   │   │   ├── clients.service.ts
│   │   │   ├── sub-client.controller.ts
│   │   │   ├── sub-client.service.ts
│   │   │   ├── customer.controller.ts
│   │   │   ├── customer.service.ts
│   │   │   ├── shop.controller.ts
│   │   │   ├── shop.service.ts
│   │   │   ├── client-portal.controller.ts
│   │   │   ├── client-portal.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── extensions/                   # 含自动化 / 自動化含む
│   │   │   ├── extensions.module.ts
│   │   │   ├── extensions.controller.ts
│   │   │   ├── plugin.service.ts
│   │   │   ├── webhook.service.ts
│   │   │   ├── script-runner.service.ts
│   │   │   ├── hook-manager.service.ts
│   │   │   ├── custom-field.service.ts
│   │   │   ├── feature-flag.service.ts
│   │   │   ├── rule-engine.service.ts
│   │   │   ├── workflow-engine.service.ts
│   │   │   ├── auto-processing.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── integrations/                 # FBA, RSL, marketplace
│   │   │   ├── integrations.module.ts
│   │   │   ├── fba/
│   │   │   │   ├── fba.controller.ts
│   │   │   │   ├── fba.service.ts
│   │   │   │   └── fba-box.service.ts
│   │   │   ├── rsl/
│   │   │   │   ├── rsl.controller.ts
│   │   │   │   └── rsl.service.ts
│   │   │   ├── oms/
│   │   │   │   ├── oms.controller.ts
│   │   │   │   └── oms.service.ts
│   │   │   ├── marketplace/
│   │   │   │   ├── marketplace.controller.ts
│   │   │   │   └── marketplace.service.ts
│   │   │   └── erp/
│   │   │       ├── erp.controller.ts
│   │   │       └── erp.service.ts
│   │   │
│   │   ├── reporting/                    # 含高峰模式 / ピークモード含む
│   │   │   ├── reporting.module.ts
│   │   │   ├── dashboard.controller.ts
│   │   │   ├── dashboard.service.ts
│   │   │   ├── admin-dashboard.controller.ts
│   │   │   ├── daily-report.controller.ts
│   │   │   ├── daily-report.service.ts
│   │   │   ├── kpi.controller.ts
│   │   │   ├── kpi.service.ts
│   │   │   ├── peak-mode.controller.ts
│   │   │   ├── peak-mode.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── notifications/
│   │   │   ├── notifications.module.ts
│   │   │   ├── notifications.controller.ts
│   │   │   ├── notifications.service.ts
│   │   │   ├── email-template.controller.ts
│   │   │   ├── email-template.service.ts
│   │   │   └── dto/
│   │   │
│   │   ├── admin/
│   │   │   ├── admin.module.ts
│   │   │   ├── tenant.controller.ts
│   │   │   ├── tenant.service.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── user.service.ts
│   │   │   ├── system-settings.controller.ts
│   │   │   ├── system-settings.service.ts
│   │   │   ├── operation-log.controller.ts
│   │   │   ├── api-log.controller.ts
│   │   │   ├── exception.controller.ts
│   │   │   └── dto/
│   │   │
│   │   ├── import/
│   │   │   ├── import.module.ts
│   │   │   ├── import.controller.ts
│   │   │   ├── csv-import.service.ts
│   │   │   ├── mapping-config.controller.ts
│   │   │   ├── mapping-config.service.ts
│   │   │   └── dto/
│   │   │
│   │   └── render/                       # PDF/标签生成 / PDF/ラベル生成
│   │       ├── render.module.ts
│   │       ├── render.controller.ts
│   │       ├── render.service.ts
│   │       ├── print-template.controller.ts
│   │       ├── print-template.service.ts
│   │       └── dto/
│   │
│   ├── queue/                            # ── BullMQ 设置 / セットアップ ──
│   │   ├── queue.module.ts
│   │   ├── webhook.processor.ts
│   │   ├── script.processor.ts
│   │   ├── audit.processor.ts
│   │   ├── csv-import.processor.ts
│   │   ├── billing.processor.ts
│   │   ├── notification.processor.ts
│   │   ├── report.processor.ts
│   │   └── scheduled-tasks.service.ts
│   │
│   └── config/                           # ── 配置 / 設定 ──
│       ├── env.ts                        # 环境变量验证 / 環境変数バリデーション
│       ├── env.schema.ts                 # Zod env schema
│       ├── supabase.ts                   # Supabase 客户端 / クライアント
│       ├── redis.ts                      # Redis 连接配置 / 接続設定
│       └── database.ts                   # DB 连接配置 / 接続設定
│
├── test/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── drizzle.config.ts
├── nest-cli.json
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

---

## 3. 模块设计 (16 modules) / モジュール設計

### 3.1 模块依赖关系 / モジュール依存関係

```
AppModule
├── CommonModule (global)             # Guards, Interceptors, Pipes, Filters
├── DatabaseModule (global)           # Drizzle ORM + Repositories
├── EventEmitterModule (global)       # Domain Events
├── AuthModule                        # Supabase Auth, JWT
├── modules/
│   ├── ProductsModule                # → DatabaseModule
│   ├── InventoryModule               # → DatabaseModule
│   ├── InboundModule                 # → DatabaseModule, InventoryModule
│   ├── ShipmentModule                # → DatabaseModule, InventoryModule, CarriersModule
│   ├── WarehouseModule               # → DatabaseModule, InventoryModule (含棚卸)
│   ├── ReturnsModule                 # → DatabaseModule, InventoryModule, ShipmentModule
│   ├── BillingModule                 # → DatabaseModule
│   ├── CarriersModule                # → DatabaseModule (含 B2 Cloud wrapper)
│   ├── ClientsModule                 # → DatabaseModule, AuthModule (含门户)
│   ├── ExtensionsModule              # → DatabaseModule, QueueModule (含自动化)
│   ├── IntegrationsModule            # → DatabaseModule, ShipmentModule
│   ├── ReportingModule               # → DatabaseModule (含高峰模式)
│   ├── NotificationsModule           # → DatabaseModule, QueueModule
│   ├── AdminModule                   # → DatabaseModule, AuthModule
│   ├── ImportModule                  # → DatabaseModule, QueueModule
│   └── RenderModule                  # → DatabaseModule
├── QueueModule                       # BullMQ (7 queues)
└── ConfigModule                      # Environment, Supabase, Redis
```

### 3.2 各模块详细 / 各モジュール詳細

#### (1) ProductsModule — 商品管理 / 商品管理

| 项目 / 項目 | 内容 |
|---|---|
| **Controllers** | `ProductsController` (8 endpoints), `SetProductsController` (6 endpoints) |
| **Services** | `ProductsService`, `SetProductsService` |
| **Repositories** | `ProductsRepository`, `SetProductsRepository` |
| **Key DTOs** | `CreateProductDto`, `UpdateProductDto`, `ProductQueryDto`, `CreateSetProductDto` |

主要端点 / 主要エンドポイント:
- `GET /api/products` — 列表 (分页) / 一覧 (ページネーション)
- `GET /api/products/:id` — 详细 / 詳細
- `POST /api/products` — 新建 / 新規作成
- `PUT /api/products/:id` — 更新
- `PATCH /api/products/:id` — 部分更新
- `DELETE /api/products/:id` — 软删除 / ソフトデリート
- `POST /api/products/import` — CSV 批量导入 / CSV 一括取込
- `GET /api/products/search` — 全文搜索 / 全文検索

#### (2) InventoryModule — 库存管理 / 在庫管理

| 项目 / 項目 | 内容 |
|---|---|
| **Controllers** | `InventoryController` (15 endpoints), `LocationController` (6), `LotController` (5), `SerialNumberController` (5), `InventoryCategoryController` (5), `InventoryLedgerController` (4) |
| **Services** | `StockService` (预留/移动/调整), `InventoryService`, `InventoryLedgerService`, `LotService`, `SerialNumberService`, `LocationService`, `InventoryCategoryService` |
| **Repositories** | `InventoryRepository`, `LocationRepository`, `LotRepository`, `SerialNumberRepository`, `InventoryCategoryRepository`, `InventoryLedgerRepository` |
| **Key DTOs** | `AdjustStockDto`, `MoveStockDto`, `ReserveStockDto`, `LocationCreateDto`, `LotCreateDto` |

#### (3) InboundModule — 入库管理 / 入庫管理

| 项目 / 項目 | 内容 |
|---|---|
| **Controllers** | `InboundController` (15 endpoints), `PassthroughController` (10 endpoints) |
| **Services** | `InboundService`, `InboundWorkflowService`, `PassthroughService` |
| **Repositories** | `InboundOrderRepository`, `PassthroughRepository` |
| **Key DTOs** | `CreateInboundDto`, `ReceiveItemDto`, `BulkReceiveDto`, `PutawayDto` |

工作流 / ワークフロー: `draft → confirmed → receiving → putaway → completed`

#### (4) ShipmentModule — 出库管理 / 出庫管理

| 项目 / 項目 | 内容 |
|---|---|
| **Controllers** | `ShipmentController` (12 endpoints), `OutboundRequestController` (5 endpoints) |
| **Services** | `ShipmentService`, `OutboundRequestService` |
| **Repositories** | `ShipmentOrderRepository`, `OutboundRequestRepository` |
| **Key DTOs** | `UpdateShipmentDto`, `BulkStatusDto`, `CreateOutboundRequestDto`, `ImportReceiptsDto` |

#### (5) WarehouseModule — 仓库运营 / 倉庫オペレーション (含棚卸 / 棚卸含む)

| 项目 / 項目 | 内容 |
|---|---|
| **Controllers** | `WarehouseController` (4), `TaskController` (8), `WaveController` (6), `InspectionController` (5), `LabelingController` (5), `StocktakingController` (10), `CycleCountController` (8) |
| **Services** | `WarehouseService`, `TaskService`, `WaveService`, `InspectionService`, `LabelingService`, `StocktakingService`, `CycleCountService` |
| **Repositories** | `WarehouseRepository`, `TaskRepository`, `WaveRepository`, `StocktakingRepository`, `CycleCountRepository` |
| **Key DTOs** | `CreateTaskDto`, `CreateWaveDto`, `InspectionResultDto`, `StocktakingCreateDto`, `CycleCountCreateDto` |

#### (6) ReturnsModule — 退货管理 / 返品管理

| 项目 / 項目 | 内容 |
|---|---|
| **Controllers** | `ReturnsController` (11 endpoints) |
| **Services** | `ReturnsService` |
| **Repositories** | `ReturnOrderRepository` |
| **Key DTOs** | `CreateReturnDto`, `ProcessReturnDto`, `ReturnQueryDto` |

#### (7) BillingModule — 账单管理 / 請求管理

| 项目 / 項目 | 内容 |
|---|---|
| **Controllers** | `BillingController` (10), `ServiceRateController` (5), `WorkChargeController` (5), `ShippingRateController` (6) |
| **Services** | `BillingService`, `ServiceRateService`, `WorkChargeService`, `ShippingRateService` |
| **Repositories** | `BillingRepository`, `ServiceRateRepository`, `WorkChargeRepository`, `ShippingRateRepository` |
| **Key DTOs** | `CreateInvoiceDto`, `BillingQueryDto`, `ServiceRateDto`, `WorkChargeDto`, `ShippingRateDto` |

#### (8) CarriersModule — 物流商 / 配送業者 (含 B2 Cloud wrapper)

| 项目 / 項目 | 内容 |
|---|---|
| **Controllers** | `CarriersController` (8), `CarrierAutomationController` (6), `SagawaController` (8) |
| **Services** | `CarriersService`, `CarrierAutomationService`, `B2CloudService` (wrapper), `SagawaService` |
| **Repositories** | `CarrierRepository`, `CarrierAutomationRepository` |
| **Key DTOs** | `CreateCarrierDto`, `AutomationRuleDto`, `B2CloudShipmentDto` |

> **重要 / 重要**: `B2CloudService` 只是对现有 `yamatoB2Service.ts` 的包装。**禁止修改内部逻辑** / 内部ロジック変更禁止。

#### (9) ClientsModule — 客户管理 / 顧客管理 (含门户 / ポータル含む)

| 项目 / 項目 | 内容 |
|---|---|
| **Controllers** | `ClientsController` (6), `SubClientController` (5), `CustomerController` (5), `ShopController` (4), `ClientPortalController` (3) |
| **Services** | `ClientsService`, `SubClientService`, `CustomerService`, `ShopService`, `ClientPortalService` |
| **Repositories** | `ClientRepository`, `SubClientRepository`, `CustomerRepository`, `ShopRepository` |
| **Key DTOs** | `CreateClientDto`, `SubClientDto`, `CustomerDto`, `ShopDto` |

#### (10) ExtensionsModule — 扩展系统 / 拡張システム (含自动化 / 自動化含む)

| 项目 / 項目 | 内容 |
|---|---|
| **Controllers** | `ExtensionsController` (46 endpoints), `AutoProcessingRuleController` (6), `RuleController` (8), `WorkflowController` (8) |
| **Services** | `PluginService`, `WebhookService`, `ScriptRunnerService`, `HookManagerService`, `CustomFieldService`, `FeatureFlagService`, `RuleEngineService`, `WorkflowEngineService`, `AutoProcessingService` |
| **Repositories** | `ExtensionRepository`, `WebhookRepository`, `RuleRepository`, `WorkflowRepository` |
| **Key DTOs** | `CreatePluginDto`, `WebhookConfigDto`, `ScriptDto`, `RuleDto`, `WorkflowDto` |

#### (11) IntegrationsModule — 外部集成 / 外部連携

| 项目 / 項目 | 内容 |
|---|---|
| **Controllers** | `FbaController` (8), `FbaBoxController` (4), `RslController` (6), `OmsController` (4), `MarketplaceController` (4), `ErpController` (4) |
| **Services** | `FbaService`, `FbaBoxService`, `RslService`, `OmsService`, `MarketplaceService`, `ErpService` |
| **Repositories** | `FbaRepository`, `RslRepository` |
| **Key DTOs** | `FbaPlanDto`, `FbaBoxDto`, `RslPlanDto`, `OmsOrderDto`, `MarketplaceConfigDto` |

#### (12) ReportingModule — 报表/KPI / レポート・KPI (含高峰模式 / ピークモード含む)

| 项目 / 項目 | 内容 |
|---|---|
| **Controllers** | `DashboardController` (4), `AdminDashboardController` (3), `DailyReportController` (4), `KpiController` (5), `PeakModeController` (3) |
| **Services** | `DashboardService`, `DailyReportService`, `KpiService`, `PeakModeService` |
| **Repositories** | `DailyReportRepository` |
| **Key DTOs** | `DashboardQueryDto`, `DateRangeDto`, `KpiQueryDto`, `PeakModeToggleDto` |

#### (13) NotificationsModule — 通知 / 通知

| 项目 / 項目 | 内容 |
|---|---|
| **Controllers** | `NotificationsController` (6), `EmailTemplateController` (6) |
| **Services** | `NotificationsService`, `EmailTemplateService` |
| **Repositories** | `NotificationRepository`, `EmailTemplateRepository` |
| **Key DTOs** | `SendNotificationDto`, `NotificationQueryDto`, `CreateEmailTemplateDto` |

#### (14) AdminModule — 管理 / 管理

| 项目 / 項目 | 内容 |
|---|---|
| **Controllers** | `TenantController` (4), `UserController` (6), `SystemSettingsController` (4), `OperationLogController` (3), `ApiLogController` (3), `ExceptionController` (3) |
| **Services** | `TenantService`, `UserService`, `SystemSettingsService` |
| **Repositories** | `TenantRepository`, `UserRepository`, `SystemSettingsRepository`, `OperationLogRepository`, `ApiLogRepository` |
| **Key DTOs** | `CreateTenantDto`, `CreateUserDto`, `UpdateSettingsDto` |

#### (15) ImportModule — 数据导入 / データインポート

| 项目 / 項目 | 内容 |
|---|---|
| **Controllers** | `ImportController` (5), `MappingConfigController` (5) |
| **Services** | `CsvImportService`, `MappingConfigService` |
| **Repositories** | `MappingConfigRepository` |
| **Key DTOs** | `ImportFileDto`, `MappingConfigDto`, `ImportProgressDto` |

#### (16) RenderModule — PDF/标签生成 / PDF/ラベル生成

| 项目 / 項目 | 内容 |
|---|---|
| **Controllers** | `RenderController` (4), `PrintTemplateController` (5) |
| **Services** | `RenderService`, `PrintTemplateService` |
| **Repositories** | `PrintTemplateRepository` |
| **Key DTOs** | `RenderRequestDto`, `PrintTemplateDto` |

### 3.3 端点总数 / エンドポイント合計

| Module | 端点数 / エンドポイント数 |
|---|---|
| AuthModule | 7 |
| ProductsModule | 14 |
| InventoryModule | 40 |
| InboundModule | 25 |
| ShipmentModule | 17 |
| WarehouseModule | 46 |
| ReturnsModule | 11 |
| BillingModule | 26 |
| CarriersModule | 22 |
| ClientsModule | 23 |
| ExtensionsModule | 68 |
| IntegrationsModule | 30 |
| ReportingModule | 19 |
| NotificationsModule | 12 |
| AdminModule | 23 |
| ImportModule | 10 |
| RenderModule | 9 |
| **合计 / 合計** | **~402** |

---

## 4. 认证与授权 / 認証・認可

### 4.1 Supabase Auth 集成 / Supabase Auth 統合

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Frontend    │────→│  NestJS API  │────→│ Supabase Auth│
│  (Vue 3)    │     │  AuthGuard   │     │  JWT verify  │
└─────────────┘     └──────────────┘     └──────────────┘
      │                     │
      │  Authorization:     │  @CurrentUser()
      │  Bearer <token>     │  → { id, email, role, tenantId }
```

### 4.2 Guard 链 / Guard チェーン

**AuthGuard (全局 / グローバル)**:
1. 从 `Authorization: Bearer <token>` 头提取 token / ヘッダーからトークン抽出
2. Supabase `auth.getUser(token)` 验证 / 検証
3. 从 `users` 表获取追加信息 (role, tenantId) / 追加情報取得
4. 注入到 `request.user` / `request.user` に注入

**TenantGuard (全局 / グローバル)**:
1. 从 JWT `app_metadata` 提取 `tenant_id` / `app_metadata` から `tenant_id` 抽出
2. 注入到请求上下文 / リクエストコンテキストに注入
3. 后续所有数据库查询自动附加 tenant_id / 全 DB クエリに自動付与

**RoleGuard (路由级 / ルートレベル)**:
1. 读取 `@Roles()` 装饰器元数据 / デコレーターメタデータ読取
2. 比较用户角色与要求角色 / ユーザーロールと要求ロール比較
3. `admin` 角色绕过所有检查 / admin はバイパス

### 4.3 角色体系 / ロール体系 (5 roles)

| 角色 / ロール | 说明 / 説明 | 权限范围 / 権限範囲 |
|---|---|---|
| `admin` | 系统管理员 / システム管理者 | 全部权限，跨租户 / 全権限、テナント横断 |
| `manager` | 仓库经理 / 倉庫マネージャー | 租户内全操作 / テナント内全操作 |
| `operator` | 仓库操作员 / 倉庫作業者 | 入出库、棚卸、拣货 / 入出庫・棚卸・ピッキング |
| `viewer` | 只读用户 / 閲覧者 | 只读 / 読取のみ |
| `client` | 货主 / 荷主 | 仅自己公司数据 / 自社データのみ |

### 4.4 权限矩阵 / 権限マトリックス

| 操作 / 操作 | admin | manager | operator | viewer | client |
|---|:---:|:---:|:---:|:---:|:---:|
| 商品 CRUD / 商品 CRUD | R/W | R/W | R | R | R (自社) |
| 入库操作 / 入庫操作 | R/W | R/W | R/W | R | R (自社) |
| 出库操作 / 出庫操作 | R/W | R/W | R/W | R | R (自社) |
| 库存调整 / 在庫調整 | R/W | R/W | - | R | - |
| 棚卸 / 棚卸 | R/W | R/W | R/W | R | - |
| 账单管理 / 請求管理 | R/W | R/W | - | R | R (自社) |
| 用户管理 / ユーザー管理 | R/W | R | - | - | - |
| 系统设置 / システム設定 | R/W | R | - | - | - |
| 扩展管理 / 拡張管理 | R/W | R/W | - | - | - |
| 报表 / レポート | R/W | R/W | R | R | R (自社) |

### 4.5 API Key 认证 / API キー認証

外部集成用 (OMS, Marketplace, ERP):

```typescript
// @UseGuards(ApiKeyGuard) を使用
// X-API-Key ヘッダーで認証 / 从 X-API-Key 头认证
```

---

## 5. Repository Pattern / リポジトリパターン

### 5.1 BaseRepository 抽象类 / 抽象クラス

```typescript
export abstract class BaseRepository<T> {
  constructor(
    @Inject('DRIZZLE') protected readonly db: DrizzleDB,
  ) {}

  // 子类指定表引用 / サブクラスでテーブル参照指定
  protected abstract get table(): PgTable;

  // 按 ID 查询（自动附加 tenant_id）
  // ID で検索（tenant_id 自動付与）
  async findById(id: string, tenantId: string): Promise<T | null>;

  // 分页查询（自动附加 tenant_id）
  // ページネーション検索（tenant_id 自動付与）
  async findAllPaginated(
    tenantId: string,
    pagination: PaginationDto,
    filters?: Record<string, unknown>,
  ): Promise<{ items: T[]; total: number; page: number; limit: number }>;

  // 新建（自动设置 tenant_id, created_at）
  // 作成（tenant_id, created_at 自動設定）
  async create(tenantId: string, data: Partial<T>): Promise<T>;

  // 更新（验证 tenant_id 一致性）
  // 更新（tenant_id 一致性検証）
  async update(id: string, tenantId: string, data: Partial<T>): Promise<T>;

  // 软删除（设置 deleted_at）
  // ソフトデリート（deleted_at 設定）
  async softDelete(id: string, tenantId: string): Promise<void>;
}
```

### 5.2 tenant_id 自动强制 / tenant_id 自動強制

所有 BaseRepository 方法**强制要求** tenant_id 参数。没有不带 tenant_id 的查询路径。

全 BaseRepository メソッドは tenant_id パラメータを**必須**とする。tenant_id なしのクエリパスは存在しない。

### 5.3 事务管理 / トランザクション管理

```typescript
// TransactionManager 使用例 / 使用例
async confirmInbound(id: string, tenantId: string) {
  return this.db.transaction(async (tx) => {
    // 1. 更新入库单状态 / 入庫伝票ステータス更新
    await tx.update(inboundOrders)
      .set({ status: 'confirmed' })
      .where(and(eq(inboundOrders.id, id), eq(inboundOrders.tenantId, tenantId)));

    // 2. 增加库存 / 在庫増加
    await tx.insert(stockMoves).values({ /* ... */ });

    // 3. 记录台账 / 台帳記録
    await tx.insert(inventoryLedger).values({ /* ... */ });
  });
}
```

需要事务的关键操作 / トランザクションが必要な主要操作:
- 入库确认 / 入庫確認: 库存增加 + 批次生成 + 台账记录
- 出库预留 / 出庫引当: 库存预留 + 拣货单生成
- 棚卸确定 / 棚卸確定: 差异反映 + 台账记录
- 退货入库 / 返品入庫: 库存恢复 + 检品记录

---

## 6. Error Handling / エラーハンドリング

### 6.1 AllExceptionsFilter 全局异常过滤器 / グローバル例外フィルタ

捕获所有异常，统一返回格式:

すべての例外をキャッチし、統一フォーマットで返却:

```typescript
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    // 统一响应格式 / 統一レスポンスフォーマット
  }
}
```

### 6.2 WMS 专用异常类 / WMS 専用例外クラス

| 异常类 / 例外クラス | HTTP Status | 用途 / 用途 |
|---|---|---|
| `WmsNotFoundException` | 404 | 资源不存在 / リソース未発見 |
| `InsufficientStockException` | 409 | 库存不足 / 在庫不足 |
| `InvalidStatusTransitionException` | 422 | 状态转换非法 / ステータス遷移不正 |
| `TenantMismatchException` | 403 | 租户不匹配 / テナント不一致 |
| `DuplicateResourceException` | 409 | 资源重复 / リソース重複 |

### 6.3 响应格式 / レスポンスフォーマット

```json
// 成功 / 成功
{
  "statusCode": 200,
  "message": "OK",
  "data": { }
}

// 错误 / エラー
{
  "statusCode": 404,
  "message": "商品未找到 / 商品が見つかりません",
  "error": "WmsNotFoundException"
}
```

NestJS 标准格式，前端兼容。生产环境不包含 stack trace。

NestJS 標準フォーマット、フロントエンド互換。本番環境では stack trace を含まない。

---

## 7. API 设计规范 / API 設計規範

### 7.1 RESTful 约定 / RESTful 規約

- 前缀 / プレフィックス: `/api/` (与现行一致 / 現行互換)
- HTTP Methods: `GET` (查询), `POST` (创建), `PUT` (全量更新), `PATCH` (部分更新), `DELETE` (删除)
- 命名: kebab-case (`/api/shipment-orders`, `/api/inbound-orders`)
- ID 格式: UUID (从 MongoDB ObjectId 迁移 / MongoDB ObjectId から移行)

### 7.2 分页 / ページネーション

请求 / リクエスト:
```
GET /api/products?page=1&limit=50
```

响应 / レスポンス:
```json
{
  "statusCode": 200,
  "data": {
    "items": [ ],
    "total": 150,
    "page": 1,
    "limit": 50
  }
}
```

### 7.3 排序 / ソート

```
GET /api/products?sort=createdAt&order=desc
```

- `sort`: 字段名 / フィールド名
- `order`: `asc` | `desc` (默认 `desc`)

### 7.4 过滤 / フィルタリング

```
GET /api/products?status=active&search=keyword&categoryId=xxx
```

- `status`: 状态过滤 / ステータスフィルタ
- `search`: 关键词搜索 / キーワード検索
- 其他字段: 按实体特定字段过滤 / エンティティ固有フィールド

### 7.5 限流 / レートリミット

| 类型 / タイプ | 限制 / 制限 | 适用范围 / 適用範囲 |
|---|---|---|
| global | 1000 req / 15 min | 全部端点 / 全エンドポイント |
| auth | 20 req / 15 min | `/api/auth/*`, `/api/portal/*` |
| write | 200 req / 15 min | POST, PUT, PATCH, DELETE |

使用 `@nestjs/throttler` 实现，配合 Redis 存储。

`@nestjs/throttler` で実装、Redis ストレージ併用。

---

## 8. B2 Cloud 集成 / B2 Cloud 統合

### 8.1 包装策略 / ラップ戦略

> **核心原则 / コア原則**: `yamatoB2Service.ts` 的内部逻辑**绝对禁止修改**。
> `yamatoB2Service.ts` の内部ロジックは**絶対に変更禁止**。

```typescript
@Injectable()
export class B2CloudService {
  // 包装现有代码，不修改内部 / 既存コードをラップ、内部変更なし
  async validateShipments(shipments: any[]) {
    const { validateShipments } = await import('@legacy/services/yamatoB2Service');
    return validateShipments(shipments);
  }

  async exportShipments(shipments: any[]) {
    const { exportShipments } = await import('@legacy/services/yamatoB2Service');
    return exportShipments(shipments);
  }

  async login() {
    const { login } = await import('@legacy/services/yamatoB2Service');
    return login();
  }
}
```

### 8.2 CarriersModule 提供 B2CloudService

`CarriersModule` exports `B2CloudService`，其他模块通过 DI 注入使用。

`CarriersModule` が `B2CloudService` をエクスポートし、他モジュールが DI で注入利用。

### 8.3 Session 缓存迁移 / セッションキャッシュ移行

| 层 / 層 | 现行 / 現行 | 迁移后 / 移行後 |
|---|---|---|
| L1 | 内存缓存 / インメモリ | 内存缓存 (维持) / インメモリ (維持) |
| L2 | MongoDB | **Redis** |
| L3 | B2 Cloud API | B2 Cloud API (维持 / 維持) |

---

## 9. 队列设计 / キュー設計

### 9.1 7 个 BullMQ 队列 / 7 BullMQ キュー

| 队列名 / キュー名 | 用途 / 用途 | 并发度 / 並列度 | 重试 / リトライ |
|---|---|---|---|
| `wms-webhook` | Webhook 投递 / 配信 | 3 | 3次, 指数退避 |
| `wms-script` | 自动化脚本执行 / スクリプト実行 | 2 | 3次, 指数退避 |
| `wms-audit` | 审计日志写入 / 監査ログ書込 | 1 | 3次, 指数退避 |
| `wms-csv-import` | CSV 批量导入 / CSV 一括インポート | 2 | 3次, 指数退避 |
| `wms-billing` | 账单计算 / 請求計算 | 2 | 3次, 指数退避 |
| `wms-notification` | 通知发送 / 通知送信 | 3 | 3次, 指数退避 |
| `wms-report` | 报表生成 / レポート生成 | 1 | 3次, 指数退避 |

### 9.2 重试策略 / リトライ戦略

```typescript
// 所有队列统一配置 / 全キュー統一設定
{
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000,  // 1s → 2s → 4s
  },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
}
```

### 9.3 定时任务 / 定期タスク

```typescript
@Injectable()
export class ScheduledTasksService {
  @Cron('0 */30 * * * *')   // 每30分钟 / 30分ごと
  async releaseExpiredReservations() { /* 释放过期预留 / 期限切れ引当解放 */ }

  @Cron('0 0 2 * * *')      // 每天 02:00 / 毎日 02:00
  async generateDailyReport() { /* 日报生成 / 日次レポート生成 */ }

  @Cron('0 0 1 1 * *')      // 每月1日 01:00 / 毎月1日 01:00
  async generateMonthlyBilling() { /* 月结账单 / 月次請求書生成 */ }
}
```

---

## 10. 中间件管道 / ミドルウェアパイプライン

请求处理顺序 / リクエスト処理順序:

```
Request
  │
  ▼
Fastify Hooks (CORS, Helmet, Body Parser, Request ID)
  │
  ▼
Global Middleware (Pino Logger, Rate Limiter)
  │
  ▼
AuthGuard (JWT 验证 / 検証)
  │
  ▼
TenantGuard (tenant_id 提取 / 抽出)
  │
  ▼
RoleGuard (@Roles 检查 / チェック) [路由级 / ルートレベル]
  │
  ▼
ValidationPipe (DTO 验证 / バリデーション)
  │
  ▼
Controller Method
  │
  ▼
TransformInterceptor (响应格式化 / レスポンス整形)
  │
  ▼
AllExceptionsFilter (异常捕获 / 例外キャッチ) [仅异常时 / 例外時のみ]
  │
  ▼
Response
```

### 10.1 Fastify 特定配置 / Fastify 固有設定

```typescript
// main.ts
const app = await NestFactory.create<NestFastifyApplication>(
  AppModule,
  new FastifyAdapter({ logger: false }), // Pino 处理日志 / Pino がログ担当
);

// CORS 配置 / CORS 設定
app.enableCors({
  origin: process.env.CORS_ORIGINS?.split(',').map(o => o.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Warehouse-Id'],
});

// Body 大小限制 / ボディサイズ制限
app.register(require('@fastify/multipart'), { limits: { fileSize: 10 * 1024 * 1024 } });

// 全局管道 / グローバルパイプ
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
app.useGlobalFilters(new AllExceptionsFilter());
app.useGlobalInterceptors(new TransformInterceptor());
```

---

## 11. 日志与监控 / ログ・監視

### 11.1 Pino 结构化日志 / 構造化ログ

```typescript
// nestjs-pino 配置 / 設定
LoggerModule.forRoot({
  pinoHttp: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport: process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty' }
      : undefined,
    // Request ID 自动关联 / リクエストID 自動関連付け
    genReqId: (req) => req.headers['x-request-id'] || randomUUID(),
  },
});
```

### 11.2 Request ID 追踪 / リクエストID トラッキング

- 每个请求自动生成或沿用 `X-Request-ID` / 各リクエストに自動生成 or 引継ぎ
- 日志、错误响应、审计记录全部关联 / ログ・エラーレスポンス・監査記録すべて関連付け
- 生产环境使用 `combined` 格式 / 本番環境は `combined` フォーマット

### 11.3 健康检查 / ヘルスチェック

| 端点 / エンドポイント | 用途 / 用途 | 检查内容 / チェック内容 |
|---|---|---|
| `GET /health` | 基本存活 / 基本存活 | プロセス起動確認 |
| `GET /health/liveness` | K8s liveness probe | プロセス応答確認 |
| `GET /health/readiness` | K8s readiness probe | DB + Redis 接続確認 |

### 11.4 OpenTelemetry 就绪 / OpenTelemetry Ready

预留 OpenTelemetry SDK 集成接口，未来可接入:

OpenTelemetry SDK 統合インターフェースを予約。将来接続可能:

- Traces: 请求链路追踪 / リクエストトレーシング
- Metrics: 响应时间、错误率 / レスポンスタイム・エラーレート
- Logs: 结构化日志导出 / 構造化ログエクスポート

---

## 12. Domain Events / ドメインイベント

### 12.1 EventEmitter2 进程内事件 / プロセス内イベント

使用 `@nestjs/event-emitter` (基于 EventEmitter2) 实现松耦合模块间通信。

`@nestjs/event-emitter` (EventEmitter2 ベース) で疎結合モジュール間通信を実現。

### 12.2 事件一览 / イベント一覧

| 事件名 / イベント名 | 触发时机 / トリガータイミング | 监听器 / リスナー |
|---|---|---|
| `stock.adjusted` | 库存调整时 / 在庫調整時 | AuditListener, NotificationListener |
| `stock.reserved` | 库存预留时 / 在庫引当時 | AuditListener |
| `stock.moved` | 库存移动时 / 在庫移動時 | AuditListener, LedgerListener |
| `order.shipped` | 出库完成时 / 出庫完了時 | AuditListener, NotificationListener, BillingListener |
| `order.created` | 出库单创建时 / 出庫伝票作成時 | WebhookListener |
| `inbound.received` | 入库验收时 / 入庫検品時 | AuditListener, NotificationListener |
| `inbound.completed` | 入库完成时 / 入庫完了時 | AuditListener, WebhookListener |
| `return.processed` | 退货处理时 / 返品処理時 | AuditListener, InventoryListener |
| `stocktaking.finalized` | 棚卸确定时 / 棚卸確定時 | AuditListener, LedgerListener |
| `billing.generated` | 账单生成时 / 請求書生成時 | NotificationListener |
| `user.created` | 用户创建时 / ユーザー作成時 | AuditListener |
| `extension.triggered` | 扩展触发时 / 拡張トリガー時 | WebhookListener, ScriptListener |

### 12.3 异步监听器 + BullMQ / 非同期リスナー + BullMQ

高开销操作通过 BullMQ 异步处理，不阻塞主线程:

高コスト操作は BullMQ で非同期処理、メインスレッドをブロックしない:

```typescript
@OnEvent('order.shipped')
async handleOrderShipped(event: OrderShippedEvent) {
  // 1. 同步: 审计日志入队 / 同期: 監査ログをキューに追加
  await this.auditQueue.add('log', {
    action: 'order.shipped',
    entityId: event.orderId,
    tenantId: event.tenantId,
    userId: event.userId,
    timestamp: new Date(),
  });

  // 2. 同步: 通知入队 / 同期: 通知をキューに追加
  await this.notificationQueue.add('send', {
    type: 'order_shipped',
    tenantId: event.tenantId,
    data: event,
  });

  // 3. 同步: Webhook 入队 / 同期: Webhook をキューに追加
  await this.webhookQueue.add('dispatch', {
    event: 'order.shipped',
    payload: event,
  });
}
```

事件监听器本身是同步入队操作（快速），实际处理由 BullMQ Worker 异步执行。

イベントリスナー自体は同期的なキュー追加操作（高速）。実際の処理は BullMQ Worker が非同期実行。

---

## 附录 A: Express → NestJS 路由映射 / Express → NestJS ルートマッピング

> 完整端点对应表参见 [04-api-mapping.md](./04-api-mapping.md)
> 完全エンドポイント対応表は [04-api-mapping.md](./04-api-mapping.md) を参照

映射原则 / マッピング方針:
- 路径结构 100% 维持 / パス構造 100% 維持 (`/api/products`, `/api/shipment-orders`, etc.)
- HTTP 方法不变 / HTTP メソッド変更なし
- 请求/响应 body 尽量维持兼容 / リクエスト/レスポンス body 互換維持
- Query 参数名不变 / Query パラメータ名変更なし
- ObjectId (MongoDB) → UUID (PostgreSQL) 是唯一的 ID 格式变更 / 唯一の ID フォーマット変更

## 附录 B: 从 Express 现行代码的迁移参考 / Express 現行コードからの移行参考

### 现行 Express 中间件栈 / 現行 Express ミドルウェアスタック

参考 `backend/src/app.ts` 的现行配置，NestJS 对应关系:

`backend/src/app.ts` の現行設定を参考に、NestJS での対応関係:

| Express 现行 / 現行 | NestJS 迁移后 / 移行後 |
|---|---|
| `cors()` | `app.enableCors()` (Fastify) |
| `helmet()` | `@fastify/helmet` |
| `express.json({ limit: '10mb' })` | `@fastify/multipart` + body limit |
| `morgan('combined')` | `nestjs-pino` (Pino) |
| `requestTimer` | `LoggingInterceptor` |
| `globalLimiter` | `@nestjs/throttler` |
| `optionalAuth` | `AuthGuard` (global) |
| `paginationGuard` | `PaginationPipe` |
| `requireAuth` | `AuthGuard` (route-level) |
| `auditLogger` | `AuditInterceptor` + EventEmitter |

### 现行路由文件 / 現行ルートファイル

参考 `backend/src/api/routes/index.ts`，共 69 个路由文件、约 402+ 端点，已全部映射到上述 16 个 NestJS 模块中。

`backend/src/api/routes/index.ts` を参考に、69 ルートファイル・約 402+ エンドポイントはすべて上記 16 NestJS モジュールにマッピング済み。
