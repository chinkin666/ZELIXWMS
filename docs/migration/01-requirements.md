# ZELIXWMS 技術スタック移行要件定義

# ZELIXWMS 技术栈迁移需求定义

> 作成日 / 创建日期: 2026-03-21
> ステータス / 状态: ドラフト / 草案

---

## 1. 移行概要 / 迁移概述

### 1.1 背景 / 背景

ZELIXWMS は現在 Express.js + MongoDB + Mongoose で構築されている。
WMS（倉庫管理システム）のデータは本質的にリレーショナルであり、
在庫移動・出荷・請求などの処理にはトランザクション整合性が不可欠である。
また、将来的なマルチテナント SaaS 化を見据え、Row Level Security (RLS) による
テナント分離が必要となる。

ZELIXWMS 目前基于 Express.js + MongoDB + Mongoose 构建。
WMS（仓库管理系统）的数据本质上是关系型的，
库存移动、出库、计费等处理需要事务完整性保证。
此外，为了未来的多租户 SaaS 化，需要通过 Row Level Security (RLS) 实现租户隔离。

| 項目 / 项目 | 現行 / 现行 | 目標 / 目标 |
|---|---|---|
| フレームワーク / 框架 | Express.js 4.x | NestJS 11.x |
| データベース / 数据库 | MongoDB 7.x | PostgreSQL 15+ (Supabase) |
| ORM | Mongoose 8.x | Drizzle ORM |
| 認証 / 认证 | 手書き JWT (jsonwebtoken) | Supabase Auth |
| バリデーション / 验证 | Zod 3.x | Zod 3.x（継続 / 继续使用） |
| テスト / 测试 | Vitest | Vitest（継続 / 继续使用） |
| キュー / 队列 | BullMQ + Redis (ioredis) | BullMQ + Redis（継続 / 继续使用） |
| ランタイム / 运行时 | Node.js 20+ | Node.js 20+（継続 / 继续使用） |

### 1.2 移行スコープ / 迁移范围

**移行対象 / 迁移对象:**

- バックエンド API: Express.js → NestJS（全面移行）
  后端 API：Express.js → NestJS（全面迁移）
- データベース: MongoDB → PostgreSQL (Supabase)
  数据库：MongoDB → PostgreSQL (Supabase)
- ORM: Mongoose → Drizzle ORM
  ORM：Mongoose → Drizzle ORM
- 認証: 手書き JWT → Supabase Auth
  认证：手写 JWT → Supabase Auth
- ミドルウェア: Express middleware → NestJS Guards / Interceptors / Pipes
  中间件：Express middleware → NestJS Guards / Interceptors / Pipes
- GraphQL: @apollo/server → @nestjs/graphql (Apollo Driver)
  GraphQL：@apollo/server → @nestjs/graphql (Apollo Driver)

### 1.3 移行しないもの / 不迁移的部分

- **フロントエンド / 前端** (Vue 3 + Vite + Pinia) — API エンドポイント URL のみ変更
  前端（Vue 3 + Vite + Pinia）— 仅变更 API 端点 URL
- **BullMQ + Redis** — そのまま継続使用
  BullMQ + Redis — 继续使用
- **Docker Compose 構成** — バックエンドのイメージのみ変更
  Docker Compose 配置 — 仅变更后端镜像
- **yamatoB2Service.ts** — CLAUDE.md の変更禁止ルール準拠（安定稼働中）
  yamatoB2Service.ts — 遵守 CLAUDE.md 的禁止修改规则（稳定运行中）
- **yamatoB2Format.ts** — B2 Cloud フォーマット定義（変更禁止）
  yamatoB2Format.ts — B2 Cloud 格式定义（禁止修改）
- **PDF 生成ライブラリ** — pdf-lib, muhammara はそのまま
  PDF 生成库 — pdf-lib、muhammara 继续使用
- **画像処理 / 图像处理** — sharp, skia-canvas はそのまま
  图像处理 — sharp、skia-canvas 继续使用

---

## 2. 現行システム分析 / 现行系统分析

### 2.1 データモデル一覧 (78 Mongoose Models) / 数据模型列表（78 个 Mongoose 模型）

#### コアドメイン / 核心领域

| カテゴリ / 类别 | モデル / 模型 | 説明 / 说明 |
|---|---|---|
| テナント・ユーザー / 租户用户 | `User`, `Tenant`, `Role` | 認証・権限管理 / 认证权限管理 |
| 倉庫 / 仓库 | `Warehouse`, `Location` | 倉庫・ロケーション管理 / 仓库位置管理 |
| 商品 / 商品 | `Product`, `Material`, `SetProduct` | 商品・資材・セット商品 / 商品材料套装商品 |
| 入庫 / 入库 | `InboundOrder`, `InspectionRecord` | 入庫予定・検品記録 / 入库预定检品记录 |
| 出荷 / 出库 | `ShipmentOrder`, `SetOrder` | 出荷指示・セット出荷 / 出库指示套装出库 |
| 返品 / 退货 | `ReturnOrder` | 返品処理 / 退货处理 |
| 在庫 / 库存 | `StockQuant`, `StockMove`, `InventoryReservation`, `InventoryLedger`, `Lot`, `SerialNumber`, `InventoryCategory` | 在庫数量・移動・引当・台帳・ロット・シリアル / 库存数量移动预留台账批次序列号 |
| 棚卸 / 盘点 | `StocktakingOrder`, `CycleCountPlan` | 棚卸・循環棚卸 / 盘点循环盘点 |

#### ビジネス / 业务

| カテゴリ / 类别 | モデル / 模型 | 説明 / 说明 |
|---|---|---|
| 請求 / 计费 | `BillingRecord`, `Invoice`, `WorkCharge`, `ServiceRate`, `ShippingRate`, `PriceCatalog` | 請求・作業費・料金 / 计费作业费费率 |
| 配送 / 配送 | `Carrier`, `CarrierAutomationConfig`, `CarrierSessionCache` | 配送業者・自動化設定 / 配送商自动化配置 |
| 顧客管理 / 客户管理 | `Client`, `SubClient`, `Shop`, `Customer`, `Supplier`, `OrderSourceCompany` | 顧客・仕入先・注文元 / 客户供应商订单来源 |
| レポート / 报表 | `DailyReport`, `ExceptionReport`, `OrderGroup` | 日報・異常レポート / 日报异常报表 |

#### 作業管理 / 作业管理

| カテゴリ / 类别 | モデル / 模型 | 説明 / 说明 |
|---|---|---|
| ウェーブ・ピッキング / 波次拣货 | `Wave`, `PickTask`, `PickItem` | ウェーブ・ピッキング / 波次拣货 |
| パッキング / 打包 | `PackingTask`, `PackingRule` | パッキング作業・ルール / 打包作业规则 |
| ラベリング / 贴标 | `LabelingTask` | ラベリング作業 / 贴标作业 |
| 仕分け / 分拣 | `SortingTask` | 仕分け作業 / 分拣作业 |
| 補充 / 补货 | `ReplenishmentTask` | 補充作業 / 补货作业 |
| 汎用タスク / 通用任务 | `WarehouseTask`, `WmsTask` | 倉庫タスク / 仓库任务 |

#### 拡張・プラグイン / 扩展插件

| カテゴリ / 类别 | モデル / 模型 | 説明 / 说明 |
|---|---|---|
| プラグイン / 插件 | `Plugin`, `PluginConfig` | プラグイン管理 / 插件管理 |
| Webhook | `Webhook`, `WebhookLog` | Webhook 設定・ログ / Webhook 配置日志 |
| 自動化 / 自动化 | `AutomationScript`, `ScriptExecutionLog`, `AutoProcessingRule`, `AutoProcessingLog` | 自動処理 / 自动处理 |
| ルール / 规则 | `RuleDefinition`, `SlottingRule` | ルールエンジン / 规则引擎 |
| カスタムフィールド / 自定义字段 | `CustomFieldDefinition`, `FeatureFlag` | カスタム定義・機能フラグ / 自定义定义功能标志 |
| テンプレート / 模板 | `PrintTemplate`, `EmailTemplate`, `FormTemplate` | 各種テンプレート / 各类模板 |
| スケジュール / 计划 | `WmsSchedule`, `WmsScheduleLog` | スケジュール管理 / 计划管理 |
| FBA/RSL | `FbaShipmentPlan`, `RslShipmentPlan`, `FbaBox` | Amazon FBA/RSL 連携 / Amazon FBA/RSL 对接 |
| マッピング / 映射 | `MappingConfig` | データマッピング設定 / 数据映射配置 |

#### システム / 系统

| カテゴリ / 类别 | モデル / 模型 | 説明 / 说明 |
|---|---|---|
| ログ / 日志 | `Notification`, `NotificationPreference`, `OperationLog`, `ApiLog`, `EventLog` | 通知・操作ログ / 通知操作日志 |
| 設定 / 设置 | `SystemSettings` | システム設定 / 系统设置 |

### 2.2 API エンドポイント (70 ルートファイル) / API 端点（70 个路由文件）

#### 認証・ユーザー / 认证用户

| ルートファイル / 路由文件 | 主なエンドポイント / 主要端点 |
|---|---|
| `auth.ts` | POST /login, POST /register, POST /refresh-token |
| `portalAuth.ts` | POST /portal/login, POST /portal/register |
| `users.ts` | CRUD /users, PATCH /users/:id/role |
| `tenants.ts` | CRUD /tenants, GET /tenants/:id/stats |

#### 倉庫・マスタ / 仓库主数据

| ルートファイル / 路由文件 | 主なエンドポイント / 主要端点 |
|---|---|
| `warehouses.ts` | CRUD /warehouses |
| `locations.ts` | CRUD /locations, POST /locations/bulk |
| `products.ts` | CRUD /products, POST /products/import |
| `materials.ts` | CRUD /materials |
| `setProducts.ts` | CRUD /set-products |
| `lots.ts` | CRUD /lots |
| `serialNumbers.ts` | CRUD /serial-numbers |
| `inventoryCategories.ts` | CRUD /inventory-categories |

#### 入庫・出荷・返品 / 入库出库退货

| ルートファイル / 路由文件 | 主なエンドポイント / 主要端点 |
|---|---|
| `inboundOrders.ts` | CRUD /inbound-orders, PATCH /:id/status |
| `shipmentOrders.ts` | CRUD /shipment-orders, POST /bulk-create |
| `returnOrders.ts` | CRUD /return-orders |
| `outboundRequests.ts` | CRUD /outbound-requests (保管型出庫 / 保管型出库) |
| `import.ts` | POST /import/csv, POST /import/orders |

#### 在庫・棚卸 / 库存盘点

| ルートファイル / 路由文件 | 主なエンドポイント / 主要端点 |
|---|---|
| `inventory.ts` | GET /inventory, POST /inventory/adjust |
| `inventoryLedger.ts` | GET /inventory-ledger |
| `stocktakingOrders.ts` | CRUD /stocktaking-orders |
| `cycleCounts.ts` | CRUD /cycle-counts |

#### 作業管理 / 作业管理

| ルートファイル / 路由文件 | 主なエンドポイント / 主要端点 |
|---|---|
| `waves.ts` | CRUD /waves, POST /waves/:id/release |
| `tasks.ts` | CRUD /tasks, PATCH /:id/complete |
| `labelingTasks.ts` | CRUD /labeling-tasks |
| `inspections.ts` | CRUD /inspections |
| `workflows.ts` | GET /workflows, POST /workflows/trigger |

#### 請求・料金 / 计费费率

| ルートファイル / 路由文件 | 主なエンドポイント / 主要端点 |
|---|---|
| `billing.ts` | GET /billing, POST /billing/generate |
| `workCharges.ts` | CRUD /work-charges |
| `serviceRates.ts` | CRUD /service-rates |
| `shippingRates.ts` | CRUD /shipping-rates |

#### 配送・外部連携 / 配送外部对接

| ルートファイル / 路由文件 | 主なエンドポイント / 主要端点 |
|---|---|
| `carriers.ts` | CRUD /carriers |
| `carrierAutomation.ts` | CRUD /carrier-automation |
| `passthrough.ts` | POST /passthrough/* (B2 Cloud プロキシ / 代理) |
| `sagawa.ts` | POST /sagawa/* (佐川急便連携 / 佐川急便对接) |
| `fba.ts` | CRUD /fba-shipment-plans |
| `fbaBoxes.ts` | CRUD /fba-boxes |
| `rsl.ts` | CRUD /rsl-shipment-plans |
| `erp.ts` | POST /erp/sync |
| `oms.ts` | POST /oms/sync |
| `marketplace.ts` | POST /marketplace/sync |

#### 顧客管理 / 客户管理

| ルートファイル / 路由文件 | 主なエンドポイント / 主要端点 |
|---|---|
| `clients.ts` | CRUD /clients |
| `subClients.ts` | CRUD /sub-clients |
| `shops.ts` | CRUD /shops |
| `customers.ts` | CRUD /customers |
| `suppliers.ts` | CRUD /suppliers |
| `orderSourceCompanies.ts` | CRUD /order-source-companies |
| `clientPortal.ts` | GET /portal/*, POST /portal/* |

#### 拡張・自動化 / 扩展自动化

| ルートファイル / 路由文件 | 主なエンドポイント / 主要端点 |
|---|---|
| `extensions.ts` | CRUD /extensions (プラグイン / 插件) |
| `autoProcessingRules.ts` | CRUD /auto-processing-rules |
| `rules.ts` | CRUD /rules |
| `packingRules.ts` | CRUD /packing-rules |
| `wmsSchedules.ts` | CRUD /wms-schedules |
| `mappingConfigs.ts` | CRUD /mapping-configs |

#### テンプレート / 模板

| ルートファイル / 路由文件 | 主なエンドポイント / 主要端点 |
|---|---|
| `printTemplates.ts` | CRUD /print-templates, POST /:id/render |
| `emailTemplates.ts` | CRUD /email-templates |
| `formTemplates.ts` | CRUD /form-templates |
| `render.ts` | POST /render/label, POST /render/pdf |

#### ダッシュボード・レポート / 仪表盘报表

| ルートファイル / 路由文件 | 主なエンドポイント / 主要端点 |
|---|---|
| `dashboard.ts` | GET /dashboard/stats |
| `adminDashboard.ts` | GET /admin/dashboard |
| `kpi.ts` | GET /kpi/* |
| `dailyReports.ts` | GET /daily-reports |
| `exceptions.ts` | GET /exceptions |
| `orderGroups.ts` | CRUD /order-groups |
| `peakMode.ts` | POST /peak-mode/activate |

#### システム / 系统

| ルートファイル / 路由文件 | 主なエンドポイント / 主要端点 |
|---|---|
| `health.ts` | GET /health |
| `systemSettings.ts` | GET /settings, PATCH /settings |
| `notifications.ts` | GET /notifications, PATCH /:id/read |
| `operationLogs.ts` | GET /operation-logs |
| `apiLogs.ts` | GET /api-logs |

### 2.3 サービス層 (31 サービス) / 服务层（31 个服务）

| サービス / 服务 | 責務 / 职责 |
|---|---|
| `shipmentOrderService.ts` | 出荷指示の CRUD・ステータス遷移・バルク操作 / 出库指示的 CRUD 状态流转批量操作 |
| `inventoryService.ts` | 在庫照会・調整・引当 / 库存查询调整预留 |
| `stockService.ts` | 在庫数量の増減・移動 / 库存数量增减移动 |
| `inboundWorkflow.ts` | 入庫ワークフロー（受入→検品→格納） / 入库工作流（收货→检品→上架） |
| `outboundWorkflow.ts` | 出荷ワークフロー（引当→ピック→パック→出荷） / 出库工作流（预留→拣货→打包→出库） |
| `replenishmentWorkflow.ts` | 補充ワークフロー / 补货工作流 |
| `workflowEngine.ts` | 汎用ワークフローエンジン / 通用工作流引擎 |
| `taskEngine.ts` | タスク生成・割当・完了管理 / 任务生成分配完成管理 |
| `ruleEngine.ts` | ルールエンジン（スロッティング・パッキング等） / 规则引擎（货位分配打包等） |
| `autoProcessingEngine.ts` | 自動処理ルール実行 / 自动处理规则执行 |
| `chargeService.ts` | 請求計算・作業費算出 / 计费计算作业费核算 |
| `kpiService.ts` | KPI 算出・集計 / KPI 计算汇总 |
| `notificationService.ts` | 通知送信（メール・アプリ内） / 通知发送（邮件应用内） |
| `csvImportService.ts` | CSV インポート処理 / CSV 导入处理 |
| `yamatoB2Service.ts` | ヤマトB2 Cloud 連携 (**変更禁止** / **禁止修改**) |
| `yamatoCalcService.ts` | ヤマト運賃計算 / 大和运费计算 |
| `sagawaService.ts` | 佐川急便連携 / 佐川急便对接 |
| `passthroughService.ts` | B2 Cloud API プロキシ / B2 Cloud API 代理 |
| `printTemplateService.ts` | 印刷テンプレート管理・レンダリング / 打印模板管理渲染 |
| `photoService.ts` | 写真管理 / 照片管理 |
| `fbaBoxService.ts` | FBA ボックス管理 / FBA 箱管理 |
| `fbaLabelService.ts` | FBA ラベル生成 / FBA 标签生成 |
| `inspectionService.ts` | 検品サービス / 检品服务 |
| `cycleCountService.ts` | 循環棚卸サービス / 循环盘点服务 |
| `exceptionService.ts` | 異常管理 / 异常管理 |
| `inventoryAgingService.ts` | 在庫エイジング分析 / 库存账龄分析 |
| `peakModeService.ts` | ピークモード管理 / 高峰模式管理 |
| `mappingConfigService.ts` | マッピング設定管理 / 映射配置管理 |
| `operationLogger.ts` | 操作ログ記録 / 操作日志记录 |
| `apiLogger.ts` | API ログ記録 / API 日志记录 |
| `render/` | ラベル・PDF レンダリング / 标签 PDF 渲染 |

### 2.4 ミドルウェア (9 ファイル) / 中间件（9 个文件）

| ミドルウェア / 中间件 | NestJS 移行先 / NestJS 迁移目标 |
|---|---|
| `auth.ts` | AuthGuard (Supabase Auth) |
| `rateLimit.ts` | ThrottlerGuard (@nestjs/throttler) |
| `requirePermission.ts` | RolesGuard / PermissionsGuard |
| `featureFlagGuard.ts` | FeatureFlagGuard |
| `errorHandler.ts` | ExceptionFilter (global) |
| `requestTimer.ts` | LoggingInterceptor |
| `auditLogger.ts` | AuditInterceptor |
| `paginationGuard.ts` | PaginationPipe |
| `index.ts` | NestJS Module で一括登録 / NestJS Module 统一注册 |

### 2.5 技術的依存関係 / 技术依赖关系

**継続使用するパッケージ / 继续使用的包:**
- `zod` (3.x) — バリデーション / 验证
- `bullmq` (5.x) — ジョブキュー / 作业队列
- `ioredis` (5.x) — Redis クライアント / Redis 客户端
- `dayjs` (1.x) — 日時処理 / 日期时间处理
- `csv-parse` (5.x) — CSV パース / CSV 解析
- `pdf-lib`, `muhammara` — PDF 処理 / PDF 处理
- `sharp`, `skia-canvas` — 画像処理 / 图像处理
- `bwip-js` — バーコード生成 / 条码生成
- `nodemailer` — メール送信 / 邮件发送
- `pino`, `pino-pretty` — ロギング / 日志
- `piscina` — ワーカースレッド / 工作线程

**廃止するパッケージ / 废弃的包:**
- `express`, `cors`, `helmet`, `morgan`, `multer` → NestJS 組み込みで代替 / NestJS 内置替代
- `mongoose` → `drizzle-orm` + `drizzle-kit`
- `jsonwebtoken` → `@supabase/supabase-js`
- `@apollo/server` → `@nestjs/graphql` + `@nestjs/apollo`
- `swagger-jsdoc`, `swagger-ui-express` → `@nestjs/swagger`
- `express-rate-limit` → `@nestjs/throttler`

**新規追加するパッケージ / 新增的包:**
- `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`
- `@nestjs/config` — 設定管理 / 配置管理
- `@nestjs/swagger` — API ドキュメント / API 文档
- `@nestjs/throttler` — レートリミット / 限流
- `@nestjs/graphql`, `@nestjs/apollo` — GraphQL
- `@nestjs/bullmq` — キュー統合 / 队列集成
- `drizzle-orm`, `drizzle-kit` — ORM + マイグレーション / ORM + 迁移
- `@supabase/supabase-js` — Supabase クライアント / Supabase 客户端
- `postgres` (pg driver) — PostgreSQL ドライバ / PostgreSQL 驱动

---

## 3. 移行要件 / 迁移需求

### 3.1 機能要件 / 功能需求

1. **全109画面の機能維持** / 全部 109 个画面的功能维持
   - LOGIFAST カバー率 100% を維持すること
   - 全 CRUD 操作が既存と同等に動作すること

2. **既存データの完全移行** / 现有数据的完全迁移
   - MongoDB の全コレクション → PostgreSQL テーブルへのデータ移行
   - ObjectId → UUID or BIGINT への変換
   - nested document / embedded array → 正規化テーブルへの変換
   - Mixed 型 → JSONB カラムへの変換

3. **API 互換性** / API 兼容性
   - REST API のパスとレスポンス形式を維持
   - フロントエンドの変更を最小限に（ベース URL のみ変更）
   - ページネーションレスポンス形式の維持

4. **B2 Cloud 連携の継続動作** / B2 Cloud 对接的持续运行
   - yamatoB2Service.ts をそのまま NestJS サービスとしてラップ
   - validate → export → PDF の一連のフローが動作すること
   - 3層キャッシュ（インメモリ → MongoDB → API）の移行
     - MongoDB キャッシュ層 → PostgreSQL or Redis に変更

5. **マルチテナント対応** / 多租户支持
   - 全テーブルに `tenant_id` カラム追加
   - Supabase RLS ポリシーによるテナント分離
   - Drizzle クエリに自動 tenant_id フィルタリング

### 3.2 非機能要件 / 非功能需求

1. **パフォーマンス / 性能**
   - 既存と同等以上のレスポンスタイム
   - PostgreSQL インデックス設計の最適化
   - N+1 クエリの防止（Drizzle の relational query 活用）
   - コネクションプーリングの適切な設定

2. **セキュリティ / 安全**
   - Supabase Auth による JWT 検証
   - Row Level Security (RLS) による全テーブルのテナント分離
   - SQL インジェクション防止（Drizzle のパラメータ化クエリ）
   - 既存の RBAC（ロールベースアクセス制御）の移行
   - API レートリミットの維持

3. **スケーラビリティ / 可扩展性**
   - 水平スケーリング可能なステートレス設計
   - マルチテナント SaaS 対応のスキーマ設計
   - Supabase の接続管理 (pgBouncer)

4. **可観測性 / 可观测性**
   - Pino ロガーの継続使用
   - API ログ・操作ログの PostgreSQL 保存
   - ヘルスチェックエンドポイントの維持

5. **テスト / 测试**
   - 既存 1807 テストの移行 + 新規追加
   - Vitest 継続使用
   - テストカバレッジ 80% 以上維持
   - E2E テスト: Supabase ローカルインスタンスでの統合テスト

### 3.3 制約 / 约束

1. **yamatoB2Service.ts は変更禁止** / yamatoB2Service.ts 禁止修改
   - NestJS サービスとしてラップするアダプター層のみ作成
   - コアロジック（認証・バリデーション・エクスポート）は一切変更しない

2. **フロントエンドの画面・コンポーネントは変更しない** / 前端画面组件不修改
   - API レスポンス形式を既存と互換にする
   - 必要に応じてレスポンス変換レイヤーを設ける

3. **段階的移行** / 分阶段迁移
   - ビッグバン移行ではなく、フェーズごとに移行
   - 各フェーズで動作確認・テスト実施

4. **開発段階のため並行稼働は不要** / 开发阶段因此不需要并行运行
   - 本番環境未稼働のため、両 DB 同時書き込みは不要
   - 移行完了後に旧コードを削除

---

## 4. 移行戦略 / 迁移策略

### 4.1 段階的移行プラン / 分阶段迁移计划

#### Phase 1: 基盤 + 認証 + マスタ系 (Week 1) / 基础 + 认证 + 主数据（第1周）

**目標 / 目标:** NestJS プロジェクト構築、Supabase 認証、マスタデータ CRUD

| タスク / 任务 | 詳細 / 详情 |
|---|---|
| NestJS プロジェクト初期化 | monorepo 構造、ESLint、Prettier、Vitest 設定 |
| Supabase セットアップ | ローカル開発環境、Auth 設定、RLS ポリシー |
| Drizzle スキーマ定義 | 全78モデルの PostgreSQL スキーマ変換 |
| 認証モジュール | Supabase Auth Guard、JWT 検証、RBAC |
| マスタ系 CRUD | User, Tenant, Warehouse, Location, Product, Material |
| テスト | 認証 + マスタ系の単体・統合テスト |

#### Phase 2: コアビジネス (Week 2) / 核心业务（第2周）

**目標 / 目标:** 入庫・出荷・在庫の全ワークフロー移行

| タスク / 任务 | 詳細 / 详情 |
|---|---|
| 入庫モジュール | InboundOrder CRUD + ワークフロー（受入→検品→格納） |
| 出荷モジュール | ShipmentOrder CRUD + ワークフロー（引当→ピック→パック→出荷） |
| 在庫モジュール | StockQuant, StockMove, InventoryLedger, InventoryReservation |
| 返品モジュール | ReturnOrder CRUD + ワークフロー |
| B2 Cloud アダプター | yamatoB2Service.ts のラッパーサービス |
| 請求モジュール | BillingRecord, Invoice, WorkCharge, ServiceRate |
| 作業管理 | Wave, PickTask, PackingTask, WarehouseTask |
| BullMQ 統合 | @nestjs/bullmq でジョブキュー移行 |
| テスト | コアビジネスの単体・統合テスト |

#### Phase 3: 拡張 + テスト + 切替 (Week 3) / 扩展 + 测试 + 切换（第3周）

**目標 / 目标:** 拡張機能移行、全テスト実施、本番切替準備

| タスク / 任务 | 詳細 / 详情 |
|---|---|
| 拡張モジュール | Plugin, Webhook, AutomationScript, CustomField, FeatureFlag |
| テンプレート | PrintTemplate, EmailTemplate, FormTemplate + レンダリング |
| FBA/RSL | FbaShipmentPlan, RslShipmentPlan, FbaBox |
| 顧客管理 | Client, SubClient, Shop, Customer, Supplier |
| レポート | DailyReport, ExceptionReport, KPI, Dashboard |
| データ移行 | MongoDB → PostgreSQL ETL スクリプト作成・実行 |
| 全テスト実施 | 1807+ テストの移行・実行・カバレッジ確認 |
| フロントエンド接続 | API ベース URL 変更、動作確認 |
| Docker 更新 | docker-compose.yml のバックエンドイメージ変更 |

### 4.2 データ移行戦略 / 数据迁移策略

#### スキーママッピング方針 / Schema 映射方针

| MongoDB 型 / MongoDB 类型 | PostgreSQL 型 / PostgreSQL 类型 | 備考 / 备注 |
|---|---|---|
| `ObjectId` | `UUID` (gen_random_uuid()) | 主キー / 主键 |
| `String` | `VARCHAR` or `TEXT` | 長さ制約に応じて / 根据长度约束 |
| `Number` | `INTEGER`, `BIGINT`, or `NUMERIC` | 用途に応じて / 根据用途 |
| `Boolean` | `BOOLEAN` | そのまま / 直接映射 |
| `Date` | `TIMESTAMPTZ` | タイムゾーン付き / 带时区 |
| `Mixed` / `Schema.Types.Mixed` | `JSONB` | 柔軟データ用 / 灵活数据用 |
| `[String]` (単純配列) | `TEXT[]` or 正規化テーブル | 要素数に応じて / 根据元素数量 |
| `[ObjectId]` (参照配列) | 中間テーブル / 关联表 | 多対多関係 / 多对多关系 |
| `[SubDocument]` (埋め込み配列) | 子テーブル (1:N) | 正規化 / 规范化 |
| `Map<String, Mixed>` | `JSONB` | キーバリュー / 键值对 |

#### ETL スクリプト設計 / ETL 脚本设计

1. **Export**: MongoDB から JSON/BSON ダンプ
   从 MongoDB 导出 JSON/BSON 转储
2. **Transform**: ObjectId → UUID 変換、ネスト構造の正規化
   ObjectId → UUID 转换、嵌套结构规范化
3. **Load**: Drizzle のシードスクリプトで PostgreSQL に投入
   通过 Drizzle seed 脚本加载到 PostgreSQL

### 4.3 B2 Cloud 連携の移行方針 / B2 Cloud 对接的迁移方针

yamatoB2Service.ts は変更禁止のため、アダプターパターンで対応する:
yamatoB2Service.ts 禁止修改，因此采用适配器模式：

```
NestJS YamatoB2Module
  └── YamatoB2AdapterService (NestJS Injectable)
        └── yamatoB2Service.ts (既存コード、変更なし / 现有代码不修改)
```

- MongoDB の CarrierSessionCache → Redis or PostgreSQL に移行
  MongoDB 的 CarrierSessionCache → 迁移到 Redis 或 PostgreSQL
- 3層キャッシュのうち MongoDB 層を差し替え
  三层缓存中替换 MongoDB 层

### 4.4 リスク / 风险

| リスク / 风险 | 影響度 / 影响度 | 軽減策 / 缓解措施 |
|---|---|---|
| B2 Cloud 連携の互換性 | 高 | アダプターパターン、E2E テストで検証 / 适配器模式 + E2E 测试验证 |
| MongoDB 柔軟スキーマの RDB 化 | 中 | JSONB で柔軟性を維持、段階的に正規化 / JSONB 保持灵活性，逐步规范化 |
| テスト移行の工数 | 中 | モデルモックの差し替えを優先、カバレッジ監視 / 优先替换模型 mock，监控覆盖率 |
| Supabase Auth の既存フロー互換性 | 中 | カスタムクレーム (app_metadata) で RBAC 維持 / 自定义 claims 维持 RBAC |
| ネストした配列データの正規化 | 低〜中 | 段階的に正規化、初期は JSONB で吸収 / 逐步规范化，初期用 JSONB 吸收 |
| 移行期間中の開発停滞 | 低 | フェーズ分割で各段階で動作確認 / 分阶段确认各阶段功能 |

---

## 5. 成功基準 / 成功标准

### 5.1 機能面 / 功能面

- [ ] 全109画面が動作すること / 全部 109 个画面正常运行
- [ ] 全70ルートファイルに対応する NestJS Controller が存在すること
      所有 70 个路由文件对应的 NestJS Controller 已创建
- [ ] 全78モデルに対応する Drizzle スキーマが定義されていること
      所有 78 个模型对应的 Drizzle schema 已定义
- [ ] CRUD 操作が既存と同等に動作すること / CRUD 操作与现有系统等效运行
- [ ] ワークフロー（入庫・出荷・返品・棚卸）が正常動作すること
      工作流（入库、出库、退货、盘点）正常运行

### 5.2 外部連携 / 外部对接

- [ ] B2 Cloud validate → export → PDF が動作すること
      B2 Cloud validate → export → PDF 正常运行
- [ ] 佐川急便連携が動作すること / 佐川急便对接正常运行
- [ ] FBA/RSL 連携が動作すること / FBA/RSL 对接正常运行
- [ ] CSV インポートが動作すること / CSV 导入正常运行

### 5.3 認証・権限 / 认证权限

- [ ] Supabase Auth でログイン/ログアウトが動作すること
      Supabase Auth 登录/登出正常运行
- [ ] RBAC（admin/staff/viewer）が正しく機能すること
      RBAC（admin/staff/viewer）正确运行
- [ ] クライアントポータル認証が動作すること / 客户门户认证正常运行
- [ ] RLS によるテナント分離が機能すること / RLS 租户隔离正常运行

### 5.4 データ / 数据

- [ ] PostgreSQL のトランザクションが正しく動作すること
      PostgreSQL 事务正确运行
- [ ] 既存データの完全移行（データロスなし） / 现有数据完全迁移（无数据丢失）
- [ ] JSONB カラムのクエリが適切に動作すること / JSONB 列查询正确运行

### 5.5 テスト / 测试

- [ ] 1807テスト相当のテストが全パスすること / 等同于 1807 个测试全部通过
- [ ] テストカバレッジ 80% 以上 / 测试覆盖率 80% 以上
- [ ] E2E テスト（ユーザージャーニー16ステップ）が全パス
      E2E 测试（用户旅程 16 步）全部通过

### 5.6 非機能 / 非功能

- [ ] 既存と同等以上のレスポンスタイム / 响应时间与现有系统相当或更优
- [ ] Docker Compose で起動可能 / Docker Compose 可启动
- [ ] CI/CD パイプラインが動作すること / CI/CD 管道正常运行

---

## 6. 用語集 / 术语表

| 用語 / 术语 | 説明 / 说明 |
|---|---|
| RLS | Row Level Security — PostgreSQL の行レベルセキュリティ / 行级安全 |
| Drizzle ORM | TypeScript-first の型安全 ORM / TypeScript 优先的类型安全 ORM |
| Supabase | PostgreSQL ベースの BaaS / 基于 PostgreSQL 的 BaaS |
| NestJS | Node.js の Enterprise フレームワーク / Node.js 企业级框架 |
| BullMQ | Redis ベースのジョブキュー / 基于 Redis 的作业队列 |
| ETL | Extract, Transform, Load — データ移行パイプライン / 数据迁移管道 |
| RBAC | Role-Based Access Control — ロールベースアクセス制御 / 基于角色的访问控制 |
| JSONB | PostgreSQL のバイナリ JSON 型 / PostgreSQL 二进制 JSON 类型 |
