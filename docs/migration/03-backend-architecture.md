# ZELIXWMS NestJS バックエンドアーキテクチャ設計
# ZELIXWMS NestJS 后端架构设计

> Express.js + MongoDB から NestJS + Drizzle ORM + PostgreSQL (Supabase) への移行設計書
> 从 Express.js + MongoDB 迁移到 NestJS + Drizzle ORM + PostgreSQL (Supabase) 的架构设计文档

---

## 1. アーキテクチャ概要 / 架构概述

### 1.1 技術スタック / 技术栈

| レイヤー / 层 | 現行 (Express) | 移行後 (NestJS) |
|---|---|---|
| フレームワーク / 框架 | Express 4.x | NestJS 10+ |
| 言語 / 语言 | TypeScript 5.6 | TypeScript 5.6 (維持) |
| ORM / DB | Mongoose 8 + MongoDB | Drizzle ORM + PostgreSQL (Supabase) |
| 認証 / 认证 | 自前 JWT (jsonwebtoken) | Supabase Auth (JWT) |
| バリデーション / 验证 | Zod 3.x | Zod 3.x (維持 / 维持) |
| キュー / 队列 | BullMQ + ioredis | @nestjs/bullmq + ioredis (維持 / 维持) |
| ロギング / 日志 | Pino 9.x | Pino 9.x (nestjs-pino 経由 / 通过 nestjs-pino) |
| テスト / 测试 | Vitest 4.x | Vitest 4.x (維持 / 维持) |
| API ドキュメント | swagger-jsdoc | @nestjs/swagger (Decorator ベース) |
| GraphQL | @apollo/server (手動) | @nestjs/graphql + @apollo/server |

### 1.2 設計原則 / 设计原则

1. **モジュラー化 / 模块化**: NestJS Module 単位で機能分離。各 Module は独立してテスト可能
2. **不変性 / 不可变性**: DTO は readonly、Service はステートレス
3. **テナント分離 / 租户隔离**: 全クエリに tenant_id フィルタ自動適用 + PostgreSQL RLS
4. **トランザクション / 事务**: MongoDB にはなかった ACID トランザクションを Drizzle で実現
5. **後方互換 / 向后兼容**: API パス構造を維持し、フロントエンド変更を最小化

### 1.3 ディレクトリ構成 / 目录结构

```
backend-nest/
├── src/
│   ├── app.module.ts                  # ルートモジュール / 根模块
│   ├── main.ts                        # エントリポイント / 入口
│   │
│   ├── common/                        # ── 共通モジュール / 公共模块 ──
│   │   ├── common.module.ts
│   │   ├── guards/
│   │   │   ├── auth.guard.ts          # JWT 検証 / JWT 验证
│   │   │   ├── role.guard.ts          # RBAC ロール検証 / 角色验证
│   │   │   ├── tenant.guard.ts        # テナント分離 / 租户隔离
│   │   │   └── permission.guard.ts    # 権限チェック / 权限校验
│   │   ├── interceptors/
│   │   │   ├── logging.interceptor.ts      # リクエストログ / 请求日志
│   │   │   ├── transform.interceptor.ts    # レスポンス整形 / 响应格式化
│   │   │   ├── timeout.interceptor.ts      # タイムアウト / 超时
│   │   │   └── audit.interceptor.ts        # 監査ログ / 审计日志
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts   # @CurrentUser()
│   │   │   ├── tenant-id.decorator.ts      # @TenantId()
│   │   │   ├── require-permission.decorator.ts  # @RequirePermission()
│   │   │   └── api-paginated.decorator.ts  # @ApiPaginated()
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts    # グローバル例外フィルタ / 全局异常过滤器
│   │   ├── pipes/
│   │   │   └── zod-validation.pipe.ts      # Zod スキーマ検証 / Zod 验证管道
│   │   └── dto/
│   │       ├── base.dto.ts                 # id, createdAt, updatedAt
│   │       ├── pagination.dto.ts           # page, limit, sort, order
│   │       └── api-response.dto.ts         # { success, data, error, meta }
│   │
│   ├── database/                      # ── データベース / 数据库 ──
│   │   ├── database.module.ts
│   │   ├── drizzle.provider.ts        # Drizzle インスタンス / 实例
│   │   ├── drizzle.config.ts
│   │   ├── schema/                    # Drizzle テーブル定義 / 表定义
│   │   │   ├── index.ts
│   │   │   ├── tenants.ts
│   │   │   ├── users.ts
│   │   │   ├── products.ts
│   │   │   ├── shipment-orders.ts
│   │   │   ├── inbound-orders.ts
│   │   │   ├── inventory.ts           # stock_quants, stock_moves
│   │   │   ├── lots.ts
│   │   │   ├── locations.ts
│   │   │   ├── carriers.ts
│   │   │   ├── clients.ts
│   │   │   ├── billing.ts             # billing_records, invoices, price_catalogs
│   │   │   ├── returns.ts
│   │   │   ├── stocktaking.ts
│   │   │   ├── tasks.ts               # warehouse_tasks, pick_tasks, etc.
│   │   │   ├── extensions.ts          # plugins, webhooks, scripts
│   │   │   ├── notifications.ts
│   │   │   ├── audit.ts               # operation_logs, api_logs, event_logs
│   │   │   └── ...
│   │   ├── migrations/
│   │   └── seed/
│   │
│   ├── auth/                          # ── 認証 / 认证 ──
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── supabase.strategy.ts       # Passport strategy
│   │   ├── portal-auth.controller.ts  # 荷主ポータル認証 / 货主门户认证
│   │   └── dto/
│   │       ├── login.dto.ts
│   │       └── register.dto.ts
│   │
│   ├── products/                      # ── 商品管理 / 商品管理 ──
│   │   ├── products.module.ts
│   │   ├── products.controller.ts     # 14 endpoints
│   │   ├── products.service.ts
│   │   ├── set-products.service.ts    # セット商品 / 套装商品
│   │   └── dto/
│   │
│   ├── inbound/                       # ── 入庫管理 / 入库管理 ──
│   │   ├── inbound.module.ts
│   │   ├── inbound.controller.ts      # 15 endpoints
│   │   ├── inbound.service.ts
│   │   ├── inbound-workflow.service.ts  # 確認→検品→棚入→完了 / 确认→验收→上架→完成
│   │   ├── passthrough.controller.ts  # 通過型入庫 / 通过型入库
│   │   ├── passthrough.service.ts
│   │   └── dto/
│   │
│   ├── shipment/                      # ── 出庫管理 / 出库管理 ──
│   │   ├── shipment.module.ts
│   │   ├── shipment.controller.ts     # 12 endpoints
│   │   ├── shipment.service.ts
│   │   ├── outbound-request.controller.ts  # 保管型出庫申請 / 保管型出库
│   │   ├── outbound-request.service.ts
│   │   └── dto/
│   │
│   ├── inventory/                     # ── 在庫管理 / 库存管理 ──
│   │   ├── inventory.module.ts
│   │   ├── inventory.controller.ts    # 15 endpoints
│   │   ├── stock.service.ts           # 引当・移動・調整 / 预留、移动、调整
│   │   ├── inventory.service.ts       # 一覧・集約 / 列表、汇总
│   │   ├── inventory-ledger.service.ts  # 台帳 / 台账
│   │   ├── lot.service.ts
│   │   ├── serial-number.service.ts
│   │   ├── location.service.ts
│   │   ├── inventory-category.service.ts
│   │   └── dto/
│   │
│   ├── warehouse/                     # ── 倉庫オペレーション / 仓库运营 ──
│   │   ├── warehouse.module.ts
│   │   ├── warehouse.controller.ts
│   │   ├── warehouse.service.ts
│   │   ├── task.controller.ts         # ピッキング・仕分け / 拣货、分拣
│   │   ├── task.service.ts
│   │   ├── wave.controller.ts         # ウェーブ / 波次
│   │   ├── wave.service.ts
│   │   ├── inspection.controller.ts   # 検品 / 检品
│   │   ├── inspection.service.ts
│   │   ├── labeling.controller.ts     # ラベル貼り / 贴标
│   │   ├── labeling.service.ts
│   │   └── dto/
│   │
│   ├── stocktaking/                   # ── 棚卸 / 盘点 ──
│   │   ├── stocktaking.module.ts
│   │   ├── stocktaking.controller.ts
│   │   ├── stocktaking.service.ts
│   │   ├── cycle-count.controller.ts  # 循環棚卸 / 循环盘点
│   │   ├── cycle-count.service.ts
│   │   └── dto/
│   │
│   ├── returns/                       # ── 返品管理 / 退货管理 ──
│   │   ├── returns.module.ts
│   │   ├── returns.controller.ts      # 11 endpoints
│   │   ├── returns.service.ts
│   │   └── dto/
│   │
│   ├── billing/                       # ── 請求管理 / 账单管理 ──
│   │   ├── billing.module.ts
│   │   ├── billing.controller.ts      # 10 endpoints
│   │   ├── billing.service.ts
│   │   ├── service-rate.controller.ts
│   │   ├── service-rate.service.ts
│   │   ├── work-charge.controller.ts
│   │   ├── work-charge.service.ts
│   │   ├── shipping-rate.controller.ts
│   │   ├── shipping-rate.service.ts
│   │   └── dto/
│   │
│   ├── carriers/                      # ── 配送業者 / 物流商 ──
│   │   ├── carriers.module.ts
│   │   ├── carriers.controller.ts
│   │   ├── carriers.service.ts
│   │   ├── carrier-automation.controller.ts  # 自動配送設定 / 自动配送
│   │   ├── carrier-automation.service.ts
│   │   ├── yamato-b2/                 # ★ 変更禁止 / 禁止修改 ★
│   │   │   ├── yamato-b2.module.ts
│   │   │   ├── yamato-b2.service.ts   # 既存ロジックをラップ / 包装现有逻辑
│   │   │   └── yamato-b2-format.util.ts
│   │   ├── sagawa/
│   │   │   ├── sagawa.module.ts
│   │   │   └── sagawa.service.ts
│   │   └── dto/
│   │
│   ├── clients/                       # ── 顧客管理 / 客户管理 ──
│   │   ├── clients.module.ts
│   │   ├── clients.controller.ts
│   │   ├── clients.service.ts
│   │   ├── sub-client.controller.ts
│   │   ├── sub-client.service.ts
│   │   ├── customer.controller.ts     # エンドカスタマー / 终端客户
│   │   ├── customer.service.ts
│   │   ├── shop.controller.ts
│   │   ├── shop.service.ts
│   │   └── dto/
│   │
│   ├── client-portal/                 # ── 荷主ポータル / 货主门户 ──
│   │   ├── client-portal.module.ts
│   │   ├── client-portal.controller.ts
│   │   ├── client-portal.service.ts
│   │   └── dto/
│   │
│   ├── integrations/                  # ── 外部連携 / 外部集成 ──
│   │   ├── integrations.module.ts
│   │   ├── fba/                       # Amazon FBA
│   │   │   ├── fba.controller.ts
│   │   │   ├── fba.service.ts
│   │   │   └── fba-box.service.ts
│   │   ├── rsl/                       # 楽天スーパーロジスティクス / 乐天超级物流
│   │   │   ├── rsl.controller.ts
│   │   │   └── rsl.service.ts
│   │   ├── oms/                       # OMS/EC 連携
│   │   │   ├── oms.controller.ts
│   │   │   └── oms.service.ts
│   │   ├── marketplace/               # マーケットプレイス連携 / 电商平台
│   │   │   ├── marketplace.controller.ts
│   │   │   └── marketplace.service.ts
│   │   └── erp/                       # ERP/会計連携
│   │       ├── erp.controller.ts
│   │       └── erp.service.ts
│   │
│   ├── extensions/                    # ── 拡張システム / 扩展系统 ──
│   │   ├── extensions.module.ts
│   │   ├── extensions.controller.ts   # 46 endpoints (plugins, webhooks, scripts, etc.)
│   │   ├── plugin.service.ts
│   │   ├── webhook.service.ts
│   │   ├── script-runner.service.ts
│   │   ├── hook-manager.service.ts
│   │   ├── custom-field.service.ts
│   │   ├── feature-flag.service.ts
│   │   └── dto/
│   │
│   ├── automation/                    # ── 自動化エンジン / 自动化引擎 ──
│   │   ├── automation.module.ts
│   │   ├── rule-engine.service.ts     # ルールエンジン / 规则引擎
│   │   ├── workflow-engine.service.ts # ワークフロー / 工作流
│   │   ├── auto-processing.service.ts
│   │   ├── auto-processing-rule.controller.ts
│   │   ├── rule.controller.ts
│   │   ├── workflow.controller.ts
│   │   └── dto/
│   │
│   ├── reporting/                     # ── レポート・KPI / 报表・KPI ──
│   │   ├── reporting.module.ts
│   │   ├── dashboard.controller.ts
│   │   ├── dashboard.service.ts
│   │   ├── admin-dashboard.controller.ts
│   │   ├── daily-report.controller.ts
│   │   ├── daily-report.service.ts
│   │   ├── kpi.controller.ts
│   │   ├── kpi.service.ts
│   │   └── dto/
│   │
│   ├── notifications/                 # ── 通知 / 通知 ──
│   │   ├── notifications.module.ts
│   │   ├── notifications.controller.ts
│   │   ├── notifications.service.ts
│   │   ├── email-template.controller.ts
│   │   ├── email-template.service.ts
│   │   └── dto/
│   │
│   ├── admin/                         # ── 管理 / 管理 ──
│   │   ├── admin.module.ts
│   │   ├── tenant.controller.ts
│   │   ├── tenant.service.ts
│   │   ├── user.controller.ts
│   │   ├── user.service.ts
│   │   ├── system-settings.controller.ts
│   │   ├── system-settings.service.ts
│   │   └── dto/
│   │
│   ├── import/                        # ── データインポート / 数据导入 ──
│   │   ├── import.module.ts
│   │   ├── import.controller.ts
│   │   ├── csv-import.service.ts
│   │   ├── mapping-config.controller.ts
│   │   ├── mapping-config.service.ts
│   │   └── dto/
│   │
│   ├── queue/                         # ── キュー / 队列 ──
│   │   ├── queue.module.ts
│   │   ├── webhook.processor.ts       # @Processor('wms-webhook')
│   │   ├── script.processor.ts        # @Processor('wms-script')
│   │   ├── audit.processor.ts         # @Processor('wms-audit')
│   │   └── scheduled-tasks.service.ts # @Cron ジョブ
│   │
│   ├── render/                        # ── PDF/ラベル生成 / PDF/标签生成 ──
│   │   ├── render.module.ts
│   │   ├── render.controller.ts
│   │   ├── render.service.ts
│   │   └── print-template.service.ts
│   │
│   ├── operational/                   # ── 運用ログ / 运维日志 ──
│   │   ├── operational.module.ts
│   │   ├── operation-log.controller.ts
│   │   ├── api-log.controller.ts
│   │   ├── exception.controller.ts
│   │   ├── exception.service.ts
│   │   └── dto/
│   │
│   ├── peak-mode/                     # ── 繁忙期モード / 高峰期模式 ──
│   │   ├── peak-mode.module.ts
│   │   ├── peak-mode.controller.ts
│   │   ├── peak-mode.service.ts
│   │   └── dto/
│   │
│   └── config/                        # ── 設定 / 配置 ──
│       ├── env.ts                     # 環境変数バリデーション / 环境变量验证
│       ├── env.schema.ts              # Zod env schema
│       ├── supabase.ts                # Supabase クライアント / 客户端
│       └── database.ts                # DB 接続設定 / 数据库连接
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

## 2. モジュール設計 / 模块设计

### 2.1 モジュール依存関係図 / 模块依赖关系图

```
AppModule
├── CommonModule (global)          # Guards, Interceptors, Pipes, Filters
├── DatabaseModule (global)        # Drizzle ORM provider
├── AuthModule                     # Supabase Auth, JWT
├── ProductsModule                 # → DatabaseModule
├── InboundModule                  # → DatabaseModule, InventoryModule
├── ShipmentModule                 # → DatabaseModule, InventoryModule, CarriersModule
├── InventoryModule                # → DatabaseModule
├── WarehouseModule                # → DatabaseModule, InventoryModule
├── StocktakingModule              # → DatabaseModule, InventoryModule
├── ReturnsModule                  # → DatabaseModule, InventoryModule, ShipmentModule
├── BillingModule                  # → DatabaseModule
├── CarriersModule                 # → DatabaseModule
│   ├── YamatoB2Module             # ★ 変更禁止 — ラップのみ
│   └── SagawaModule
├── ClientsModule                  # → DatabaseModule
├── ClientPortalModule             # → AuthModule, ClientsModule, ShipmentModule, InboundModule
├── IntegrationsModule             # → DatabaseModule, ShipmentModule
│   ├── FbaSubModule
│   ├── RslSubModule
│   ├── OmsSubModule
│   ├── MarketplaceSubModule
│   └── ErpSubModule
├── ExtensionsModule               # → DatabaseModule, QueueModule
├── AutomationModule               # → DatabaseModule, ExtensionsModule
├── ReportingModule                # → DatabaseModule
├── NotificationsModule            # → DatabaseModule, QueueModule
├── AdminModule                    # → DatabaseModule, AuthModule
├── ImportModule                   # → DatabaseModule
├── QueueModule                    # BullMQ registration
├── RenderModule                   # → DatabaseModule
├── OperationalModule              # → DatabaseModule
└── PeakModeModule                 # → DatabaseModule
```

### 2.2 各モジュールの責務 / 各模块职责

#### AuthModule — 認証・認可 / 认证授权
| Controller | メソッド | パス | 説明 |
|---|---|---|---|
| AuthController | login() | POST /api/auth/login | Supabase Auth ログイン |
| AuthController | register() | POST /api/auth/register | ユーザー登録 |
| AuthController | me() | GET /api/auth/me | 現在ユーザー情報 |
| AuthController | logout() | POST /api/auth/logout | ログアウト |
| PortalAuthController | login() | POST /api/portal/login | 荷主ポータルログイン |
| PortalAuthController | register() | POST /api/portal/register | ポータル登録 |
| PortalAuthController | me() | GET /api/portal/me | ポータルユーザー情報 |

**Service**: `AuthService` — Supabase Auth SDK ラッパー、トークン生成・検証

#### ProductsModule — 商品管理 / 商品管理
| Controller | メソッド | パス | 説明 |
|---|---|---|---|
| ProductsController | findAll() | GET /api/products | 一覧（ページネーション） |
| ProductsController | findOne() | GET /api/products/:id | 詳細 |
| ProductsController | create() | POST /api/products | 新規作成 |
| ProductsController | update() | PUT /api/products/:id | 更新 |
| ProductsController | patch() | PATCH /api/products/:id | 部分更新 |
| ProductsController | remove() | DELETE /api/products/:id | ソフトデリート |
| ProductsController | import() | POST /api/products/import | CSV 一括取込 |
| ProductsController | search() | GET /api/products/search | 全文検索 |
| SetProductsController | (CRUD) | /api/set-products/* | セット商品管理 |

**Service**: `ProductsService`, `SetProductsService`

#### InboundModule — 入庫管理 / 入库管理
| Controller | メソッド | パス | 説明 |
|---|---|---|---|
| InboundController | findAll() | GET /api/inbound-orders | 一覧 |
| InboundController | findOne() | GET /api/inbound-orders/:id | 詳細 |
| InboundController | create() | POST /api/inbound-orders | 新規作成 |
| InboundController | update() | PUT /api/inbound-orders/:id | 更新 (draft のみ) |
| InboundController | remove() | DELETE /api/inbound-orders/:id | 削除 (draft のみ) |
| InboundController | confirm() | POST /api/inbound-orders/:id/confirm | 確認 |
| InboundController | receive() | POST /api/inbound-orders/:id/receive | 行別検品 |
| InboundController | bulkReceive() | POST /api/inbound-orders/:id/bulk-receive | 一括検品 |
| InboundController | putaway() | POST /api/inbound-orders/:id/putaway | 棚入れ |
| InboundController | complete() | POST /api/inbound-orders/:id/complete | 完了 |
| PassthroughController | (CRUD+workflow) | /api/passthrough/* | 通過型入庫 |

**Service**: `InboundService`, `InboundWorkflowService`, `PassthroughService`
**依存 / 依赖**: InventoryModule (在庫引当 / 库存预留)

#### ShipmentModule — 出庫管理 / 出库管理
| Controller | メソッド | パス | 説明 |
|---|---|---|---|
| ShipmentController | findAll() | GET /api/shipment-orders | 一覧 |
| ShipmentController | findOne() | GET /api/shipment-orders/:id | 詳細 |
| ShipmentController | update() | PUT /api/shipment-orders/:id | 更新 |
| ShipmentController | bulkUpdate() | PATCH /api/shipment-orders/bulk | 一括更新 |
| ShipmentController | handleStatus() | POST /api/shipment-orders/:id/status | ステータス変更 |
| ShipmentController | handleStatusBulk() | POST /api/shipment-orders/status/bulk | 一括ステータス |
| ShipmentController | createManualBulk() | POST /api/shipment-orders/manual/bulk | 手動一括作成 |
| ShipmentController | getByIds() | POST /api/shipment-orders/by-ids | ID 指定取得 |
| ShipmentController | deleteBulk() | POST /api/shipment-orders/delete/bulk | 一括削除 |
| ShipmentController | importReceipts() | POST /api/shipment-orders/carrier-receipts/import | 送り状取込 |
| ShipmentController | groupCounts() | GET /api/shipment-orders/group-counts | グループ集計 |
| OutboundRequestController | (CRUD) | /api/outbound-requests/* | 保管型出庫申請 |

**Service**: `ShipmentService`, `ShipmentOrderService`, `OutboundRequestService`

#### InventoryModule — 在庫管理 / 库存管理
**Controller endpoints**: 15+ (在庫一覧、調整、移動、引当、ロケーション管理、ロット、シリアル番号、カテゴリ、台帳)

**Services**:
- `StockService` — 引当 (reserve)、確定 (confirm)、移動 (move)、調整 (adjust)
- `InventoryService` — 一覧、集計、エイジング分析
- `InventoryLedgerService` — 台帳記録
- `LotService` — ロット管理 (FIFO/FEFO)
- `SerialNumberService` — シリアル番号管理
- `LocationService` — ロケーション CRUD
- `InventoryCategoryService` — カテゴリ管理

#### CarriersModule — 配送業者 / 物流商
**重要 / 重要**: Yamato B2 Cloud サービスは変更禁止。NestJS Module でラップするのみ。

```typescript
// yamato-b2.service.ts — 既存コードのラップ例
// 包装现有代码示例
@Injectable()
export class YamatoB2NestService {
  // 既存の yamatoB2Service をそのまま注入
  // 直接注入现有的 yamatoB2Service
  async validateShipments(shipments: any[]) {
    const { validateShipments } = await import(
      '@legacy/services/yamatoB2Service'
    );
    return validateShipments(shipments);
  }
}
```

---

## 3. 認証・認可 / 认证授权

### 3.1 Supabase Auth 統合 / Supabase Auth 集成

現行システムは自前 JWT (jsonwebtoken) を使用。移行後は Supabase Auth に統一。

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Frontend    │────→│  NestJS API  │────→│ Supabase Auth│
│  (Next.js)   │     │  AuthGuard   │     │  JWT verify  │
└─────────────┘     └──────────────┘     └──────────────┘
      │                     │
      │  Authorization:     │  @CurrentUser()
      │  Bearer <token>     │  → { id, email, role, tenantId }
```

**AuthGuard (グローバル)**:
1. `Authorization: Bearer <token>` ヘッダーからトークン抽出
2. Supabase `auth.getUser(token)` で検証
3. `users` テーブルから追加情報 (role, tenantId, roleIds) 取得
4. `request.user` に注入

### 3.2 RBAC (ロールベースアクセス制御) / 基于角色的访问控制

現行の `requirePermission()` ミドルウェアを NestJS Guard + Decorator に変換。

```typescript
// デコレーター定義 / 装饰器定义
@RequirePermission('inventory:adjust')
@Get('adjust')
async adjustStock(@CurrentUser() user: AuthUser, @Body() dto: AdjustDto) {
  // ...
}
```

**権限チェックフロー / 权限校验流程**:
1. `@RequirePermission()` → メタデータ設定
2. `PermissionGuard` → メタデータ読取 → ロールから権限取得 → 比較
3. `admin` ロールは全権限バイパス (現行と同じ)
4. 権限キャッシュ: 5分 TTL (現行 Map キャッシュを維持)

**ロール体系 / 角色体系**:
| ロール | 説明 | 権限範囲 |
|---|---|---|
| admin | 管理者 | 全権限 |
| manager | 倉庫マネージャー | テナント内全操作 |
| operator | 倉庫作業者 | 入出庫・棚卸操作 |
| viewer | 閲覧者 | 読取のみ |
| client | 荷主 | 自社データのみ |

### 3.3 テナント分離 / 租户隔离

**3 層防御 / 三层防御**:

1. **TenantGuard (アプリケーション層)**:
   - `@CurrentUser()` から `tenantId` 抽出
   - 全リクエストに自動適用 (global guard)

2. **Service 層フィルタ**:
   - 全クエリに `.where(eq(table.tenantId, tenantId))` 自動追加
   - `BaseTenantService` 抽象クラスで共通化

3. **PostgreSQL RLS (データベース層)**:
   - Supabase RLS ポリシーでテナント分離を強制
   - Backend は `service_role` キーで RLS バイパス可能（管理操作用）
   - Frontend は `anon` キーで RLS 適用

```sql
-- RLS ポリシー例 / RLS 策略示例
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON products
  USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

### 3.4 API キー認証 / API Key 认证

外部連携用 API キー認証 (OMS, Marketplace, ERP):

```typescript
@Injectable()
export class ApiKeyGuard implements CanActivate {
  // X-API-Key ヘッダーから認証
  // 从 X-API-Key 头部认证
}
```

---

## 4. API 設計 / API设计

### 4.1 REST API 規約 / REST API 规范

**パス構造 / 路径结构**:
- プレフィックス: `/api/` (現行互換 — フロントエンド変更不要)
- 将来の破壊的変更: `/api/v2/` で追加

**レスポンスエンベロープ / 响应封装**:
```typescript
// 成功レスポンス / 成功响应
{
  "success": true,
  "data": { ... },
  "meta": {                    // ページネーション時のみ
    "total": 150,
    "page": 1,
    "limit": 50,
    "totalPages": 3
  }
}

// エラーレスポンス / 错误响应
{
  "success": false,
  "error": {
    "statusCode": 400,
    "message": "バリデーションエラー / 验证错误",
    "details": [...]           // Zod エラー詳細
  }
}
```

**TransformInterceptor** が全レスポンスを自動的にエンベロープで包む。

### 4.2 Express → NestJS ルートマッピング概要 / 路由映射概要

現行 Express ルーター: **69 ファイル**, **492 エンドポイント**

> 完全なエンドポイント対応表は [04-api-mapping.md](./04-api-mapping.md) を参照。
> 完整的端点映射表参见 [04-api-mapping.md](./04-api-mapping.md)。

**マッピング方針 / 映射方针**:
- パス構造は 100% 維持 (`/api/products`, `/api/shipment-orders`, etc.)
- HTTP メソッドは変更なし
- リクエスト/レスポンス body はできるだけ互換を維持
- Query パラメータ名は変更なし
- ObjectId (MongoDB) → UUID (PostgreSQL) のみ変更

**主要モジュール別エンドポイント数 / 各模块端点数**:

| NestJS Module | エンドポイント数 | Express ルートファイル |
|---|---|---|
| AuthModule | 7 | auth.ts, portalAuth.ts |
| ProductsModule | 24 | products.ts, setProducts.ts |
| InboundModule | 25 | inboundOrders.ts, passthrough.ts |
| ShipmentModule | 17 | shipmentOrders.ts, outboundRequests.ts |
| InventoryModule | 55 | inventory.ts, inventoryLedger.ts, lots.ts, serialNumbers.ts, locations.ts, inventoryCategories.ts |
| WarehouseModule | 28 | tasks.ts, waves.ts, inspections.ts, labelingTasks.ts |
| StocktakingModule | 18 | stocktakingOrders.ts, cycleCounts.ts |
| ReturnsModule | 11 | returnOrders.ts |
| BillingModule | 26 | billing.ts, serviceRates.ts, workCharges.ts, shippingRates.ts |
| CarriersModule | 22 | carriers.ts, carrierAutomation.ts, sagawa.ts |
| ClientsModule | 23 | clients.ts, subClients.ts, customers.ts, shops.ts |
| ClientPortalModule | 3 | clientPortal.ts |
| IntegrationsModule | 26 | fba.ts, fbaBoxes.ts, rsl.ts, oms.ts, marketplace.ts, erp.ts |
| ExtensionsModule | 46 | extensions.ts |
| AutomationModule | 30 | autoProcessingRules.ts, rules.ts, workflows.ts |
| ReportingModule | 11 | dashboard.ts, adminDashboard.ts, dailyReports.ts, kpi.ts |
| NotificationsModule | 12 | notifications.ts, emailTemplates.ts |
| AdminModule | 16 | tenants.ts, users.ts, systemSettings.ts |
| ImportModule | 10 | import.ts, mappingConfigs.ts |
| RenderModule | 9 | render.ts, printTemplates.ts |
| OperationalModule | 13 | operationLogs.ts, apiLogs.ts, exceptions.ts |
| PeakModeModule | 3 | peakMode.ts |
| QueueModule | 0 | (internal processors) |
| **合計 / 合计** | **~492** | **69 ルートファイル** |

---

## 5. データアクセス / 数据访问

### 5.1 Drizzle ORM パターン / Drizzle ORM 模式

**Provider 登録 / Provider 注册**:
```typescript
// database.module.ts
@Global()
@Module({
  providers: [
    {
      provide: 'DRIZZLE',
      useFactory: async () => {
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        return drizzle(pool, { schema });
      },
    },
  ],
  exports: ['DRIZZLE'],
})
export class DatabaseModule {}
```

**Service 層パターン / Service 层模式**:
```typescript
@Injectable()
export class ProductsService {
  constructor(@Inject('DRIZZLE') private readonly db: DrizzleDB) {}

  async findAll(tenantId: string, query: PaginationDto) {
    const { page, limit } = query;
    const offset = (page - 1) * limit;

    const [items, countResult] = await Promise.all([
      this.db
        .select()
        .from(products)
        .where(eq(products.tenantId, tenantId))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(products)
        .where(eq(products.tenantId, tenantId)),
    ]);

    return { items, total: countResult[0].count, page, limit };
  }
}
```

### 5.2 トランザクション / 事务

MongoDB ではトランザクションが事実上使えなかったが、PostgreSQL + Drizzle で ACID トランザクションを実現。

**トランザクションが必要なオペレーション / 需要事务的操作**:
- 入庫確認 (inbound confirm): 在庫増加 + ロット生成 + 台帳記録
- 出庫引当 (shipment allocate): 在庫引当 + ピックリスト生成
- 棚卸確定 (stocktaking finalize): 差異反映 + 台帳記録
- 返品入庫 (return receive): 在庫復元 + 検品記録

```typescript
// トランザクション例 / 事务示例
async confirmInbound(id: string, tenantId: string) {
  return this.db.transaction(async (tx) => {
    const order = await tx.query.inboundOrders.findFirst({
      where: and(eq(inboundOrders.id, id), eq(inboundOrders.tenantId, tenantId)),
    });

    // 在庫増加 / 增加库存
    await tx.insert(stockMoves).values({ ... });

    // ステータス更新 / 状态更新
    await tx
      .update(inboundOrders)
      .set({ status: 'confirmed' })
      .where(eq(inboundOrders.id, id));

    // 台帳記録 / 台账记录
    await tx.insert(inventoryLedger).values({ ... });

    return order;
  });
}
```

### 5.3 テナントスコープ基底クラス / 租户作用域基类

```typescript
export abstract class BaseTenantService {
  constructor(@Inject('DRIZZLE') protected readonly db: DrizzleDB) {}

  // サブクラスでテーブル参照を指定 / 子类指定表引用
  protected abstract get table(): PgTable;

  async findAllForTenant(tenantId: string, opts?: PaginationDto) {
    return this.db
      .select()
      .from(this.table)
      .where(eq(this.table.tenantId, tenantId))
      .limit(opts?.limit ?? 50)
      .offset(((opts?.page ?? 1) - 1) * (opts?.limit ?? 50));
  }
}
```

---

## 6. キュー / 队列

### 6.1 BullMQ 統合 / BullMQ 集成

現行の `queueManager.ts` + `workers.ts` を NestJS `@nestjs/bullmq` に移行。

**現行キュー / 现有队列**:
| キュー名 | 用途 | 並列度 |
|---|---|---|
| `wms-webhook` | Webhook 配信 / 投递 | 3 |
| `wms-script` | 自動化スクリプト実行 / 脚本执行 | 2 |
| `wms-audit` | 監査ログ書込 + 定期ジョブ / 审计日志 + 定时任务 | 1 |

**NestJS 移行後 / 迁移后**:
```typescript
// queue.module.ts
@Module({
  imports: [
    BullModule.forRoot({
      connection: { host: 'localhost', port: 6379 },
    }),
    BullModule.registerQueue(
      { name: 'wms-webhook' },
      { name: 'wms-script' },
      { name: 'wms-audit' },
    ),
  ],
  providers: [WebhookProcessor, ScriptProcessor, AuditProcessor],
})
export class QueueModule {}

// webhook.processor.ts
@Processor('wms-webhook')
export class WebhookProcessor extends WorkerHost {
  async process(job: Job<WebhookJobData>) {
    await this.webhookService.dispatch(job.data.event, job.data.payload);
  }
}
```

### 6.2 定期ジョブ / 定时任务

```typescript
@Injectable()
export class ScheduledTasksService {
  @Cron('0 */30 * * * *')  // 30分ごと / 每30分钟
  async releaseExpiredReservations() {
    // 期限切れ引当の解放 / 释放过期预留
  }

  @Cron('0 0 2 * * *')     // 毎日 02:00 / 每天 02:00
  async generateDailyReport() {
    // 日次レポート生成 / 生成日报
  }
}
```

---

## 7. テスト戦略 / 测试策略

### 7.1 現行テスト資産 / 现有测试资产

- 1,799 テスト (Vitest)
- カバレッジ目標: 80%+
- E2E: Playwright

### 7.2 移行後テスト構成 / 迁移后测试结构

| テストタイプ | ツール | 対象 |
|---|---|---|
| Unit | Vitest (維持) | Service クラス、Util 関数 |
| Integration | Vitest + Testcontainers | Controller + DB (PostgreSQL) |
| E2E | Playwright (維持) | ユーザーフロー全体 |

**Vitest を維持する理由 / 维持 Vitest 的理由**:
- 既存 1,799 テストの資産を最大限活用
- NestJS は Jest 前提だが Vitest でも動作可能 (SWC transformer 経由)
- テスト実行速度が Jest より高速

**Integration テスト例 / 集成测试示例**:
```typescript
describe('ProductsController (integration)', () => {
  let app: INestApplication;
  let db: DrizzleDB;

  beforeAll(async () => {
    // Testcontainers で PostgreSQL 起動
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    db = module.get('DRIZZLE');
    await app.init();
  });

  it('GET /api/products — テナント分離確認', async () => {
    // テナントAのデータがテナントBからアクセス不可であることを確認
  });
});
```

### 7.3 移行期間のテスト方針 / 迁移期间测试方针

1. **Express テスト維持**: 移行完了まで既存テストを並行実行
2. **NestJS テスト追加**: 各モジュール移行完了時に対応テスト作成
3. **E2E テスト共有**: Playwright テストは API パスが同一のため変更不要
4. **回帰テスト**: 移行前後で同一入力 → 同一出力を保証

---

## 8. 移行手順 / 迁移步骤

### 8.1 フェーズ概要 / 阶段概述

```
Phase 0: 準備 (1週間)
    ↓
Phase 1: 基盤構築 (1週間)
    ↓
Phase 2: コアモジュール移行 (2-3週間)
    ↓
Phase 3: 業務モジュール移行 (2-3週間)
    ↓
Phase 4: 統合テスト + 並行稼働 (1-2週間)
    ↓
Phase 5: 本番切替 + 旧システム停止 (1週間)
```

### 8.2 各フェーズ詳細 / 各阶段详细

#### Phase 0: 準備 / 准备
- [ ] `backend-nest/` プロジェクト scaffold (`nest new`)
- [ ] Vitest + SWC 設定
- [ ] Drizzle ORM + PostgreSQL 接続確認
- [ ] Supabase プロジェクト設定 (Auth, RLS)
- [ ] CI/CD パイプラインに NestJS ビルド追加
- [ ] MongoDB → PostgreSQL スキーママッピング確定 (別文書参照)

#### Phase 1: 基盤構築 / 基础搭建
- [ ] `CommonModule` 実装 (Guards, Interceptors, Pipes, Filters, Decorators)
- [ ] `DatabaseModule` 実装 (Drizzle provider)
- [ ] `AuthModule` 実装 (Supabase Auth strategy)
- [ ] `QueueModule` 実装 (BullMQ)
- [ ] テナント分離基盤 (`TenantGuard`, `BaseTenantService`)
- [ ] ヘルスチェック (`/api/health`)
- [ ] エラーハンドリング統一 (`HttpExceptionFilter`)

#### Phase 2: コアモジュール移行 / 核心模块迁移
優先度順 / 按优先级:
1. [ ] `ProductsModule` — 最もシンプルな CRUD、移行パターンの確立
2. [ ] `InventoryModule` — 在庫管理の中核
3. [ ] `InboundModule` — ワークフローありの中核モジュール
4. [ ] `ShipmentModule` — 最も複雑、配送業者連携あり
5. [ ] `CarriersModule` — Yamato B2 ラップ注意

**各モジュール移行手順 / 每个模块迁移步骤**:
1. Drizzle スキーマ定義 (MongoDB model → PostgreSQL table)
2. Service 実装 (Mongoose query → Drizzle query)
3. Controller 実装 (Express route → NestJS controller)
4. Unit テスト作成
5. Integration テスト作成
6. E2E テストで既存フロー確認

#### Phase 3: 業務モジュール移行 / 业务模块迁移
- [ ] `WarehouseModule` (tasks, waves, inspections, labeling)
- [ ] `StocktakingModule` (棚卸, 循環棚卸)
- [ ] `ReturnsModule`
- [ ] `BillingModule`
- [ ] `ClientsModule` + `ClientPortalModule`
- [ ] `IntegrationsModule` (FBA, RSL, OMS, Marketplace, ERP)
- [ ] `ExtensionsModule` + `AutomationModule`
- [ ] `ReportingModule` + `NotificationsModule`
- [ ] `AdminModule` + `ImportModule`
- [ ] `RenderModule` + `OperationalModule` + `PeakModeModule`

#### Phase 4: 統合テスト + 並行稼働 / 集成测试 + 并行运行
- [ ] 全 492 エンドポイントの回帰テスト
- [ ] データ移行スクリプト (MongoDB → PostgreSQL)
- [ ] Express / NestJS 並行稼働 (nginx でルーティング切替)
- [ ] パフォーマンスベンチマーク比較
- [ ] セキュリティ監査 (9 項目チェック維持)

#### Phase 5: 本番切替 / 正式切换
- [ ] トラフィックを段階的に NestJS へ移行 (10% → 50% → 100%)
- [ ] MongoDB → PostgreSQL 最終データ同期
- [ ] Express アプリケーション停止
- [ ] 監視ダッシュボード更新
- [ ] ロールバック手順確認・テスト

### 8.3 Yamato B2 Cloud 移行方針 / Yamato B2 Cloud 迁移方针

> **変更禁止 / 禁止修改** (CLAUDE.md 参照)

B2 Cloud 関連コードは既存のまま NestJS にラップ:

1. `yamatoB2Service.ts` を `@legacy/` パス経由でインポート
2. `YamatoB2NestService` で薄いラッパーを提供
3. 認証フロー (`login`, `authenticatedFetch`, 3 層キャッシュ) は一切変更しない
4. B2 Cloud SDK が独立パッケージとして完成するまでこの方針を維持

---

## 9. 設定管理 / 配置管理

### 9.1 環境変数 / 环境变量

```typescript
// config/env.schema.ts
import { z } from 'zod';

export const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  PORT: z.coerce.number().default(4000),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Database (Supabase PostgreSQL 直接接続)
  DATABASE_URL: z.string().url(),

  // Redis (BullMQ)
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // Legacy JWT (移行期間中は並行使用)
  JWT_SECRET: z.string().optional(),

  // Yamato B2 Cloud
  B2_CLOUD_API_BASE: z.string().url().optional(),
  B2_CLOUD_USERNAME: z.string().optional(),
  B2_CLOUD_PASSWORD: z.string().optional(),
});
```

### 9.2 NestJS ConfigModule

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({
      validate: (config) => envSchema.parse(config),
      isGlobal: true,
    }),
  ],
})
export class AppModule {}
```

---

## 10. パフォーマンス考慮事項 / 性能考虑

### 10.1 現行パフォーマンス基準 / 现有性能基准
- API レスポンス: 平均 65% 改善済み (最適化後)
- テスト: 1,799 全通過

### 10.2 PostgreSQL 移行によるパフォーマンス影響 / 迁移性能影响

**改善が期待される点 / 预期改善**:
- JOIN クエリ (MongoDB では $lookup で遅かった)
- トランザクション処理 (MongoDB では不安定だった)
- 複雑な集計クエリ (billing, KPI, reporting)
- インデックス最適化 (B-tree, GIN for 全文検索)

**注意が必要な点 / 需要注意**:
- 大量データの一括取得 (cursor ベースページネーションの検討)
- N+1 クエリ防止 (Drizzle の `with` リレーション活用)
- コネクションプール管理 (Supabase の制限に注意)

### 10.3 キャッシュ戦略 / 缓存策略
- Redis: セッション、権限キャッシュ、B2 Cloud セッションキャッシュ
- インメモリ: 頻繁アクセスのマスタデータ (carriers, system-settings)
- HTTP: `Cache-Control` ヘッダー (static assets のみ)
