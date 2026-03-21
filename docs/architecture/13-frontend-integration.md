# フロントエンド統合ドキュメント / 前端集成文档

> 対象読者: 全開発者 / 目标读者: 全体开发人员
>
> 最終更新: 2026-03-21

---

## 目次 / 目录

1. [前端应用矩阵 / フロントエンドアプリケーションマトリクス](#1-前端应用矩阵--フロントエンドアプリケーションマトリクス)
2. [路由全表 / ルーティング完全一覧](#2-路由全表--ルーティング完全一覧)
3. [状态管理架构 / 状態管理アーキテクチャ](#3-状态管理架构--状態管理アーキテクチャ)
4. [API 客户端设计 / API クライアント設計](#4-api-客户端设计--api-クライアント設計)
5. [组件架构 / コンポーネントアーキテクチャ](#5-组件架构--コンポーネントアーキテクチャ)
6. [国际化 (i18n) / 国際化 (i18n)](#6-国际化-i18n--国際化-i18n)
7. [迁移影响分析 / 移行影響分析](#7-迁移影响分析--移行影響分析)
8. [性能优化 / パフォーマンス最適化](#8-性能优化--パフォーマンス最適化)

---

## 1. 前端应用矩阵 / フロントエンドアプリケーションマトリクス

ZELIXWMS 由 **3 个独立的 Vue 3 应用** 构成，共享同一 NestJS 后端 API。
ZELIXWMS は **3 つの独立した Vue 3 アプリケーション** で構成され、同一の NestJS バックエンド API を共有する。

### 1.1 应用一览 / アプリケーション一覧

| 属性 / 属性 | **frontend** | **admin** | **portal** |
|---|---|---|---|
| 目录 / ディレクトリ | `frontend/` | `admin/` | `portal/` |
| 开发端口 / 開発ポート | `3000` | `3001` | `3002` |
| 目标用户 / 対象ユーザー | 仓库操作员 / 倉庫オペレーター | 系统管理员 / システム管理者 | 货主 (3PL委托方) / 荷主 |
| Vue 组件数 / コンポーネント数 | **~247** | **9** | **12** |
| 路由数 / ルート数 | **118 (+8 redirect)** | **7** | **9** |
| 状态管理 / 状態管理 | Pinia (5 stores) | localStorage 直接 | Pinia (1 store) |
| UI 库 / UI ライブラリ | Odoo 风格 + Element Plus | Element Plus | Element Plus |
| i18n | ja / en / zh | - | ja / en / zh |

### 1.2 共享基础设施 / 共有インフラ

```
                    ┌──────────────┐
                    │  NestJS API  │
                    │  /api/*      │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────┴─────┐ ┌───┴───┐ ┌─────┴─────┐
        │ frontend  │ │ admin │ │  portal   │
        │ :3000     │ │ :3001 │ │  :3002    │
        │ 倉庫操作  │ │ 管理  │ │  荷主     │
        └───────────┘ └───────┘ └───────────┘
```

**共通点 / 共有要素:**
- 同一后端 API (`/api`) / 同一バックエンド API
- JWT 认证 / JWT 認証（Supabase Auth 移行後も同様）
- `getApiBaseUrl()` による API エンドポイント解決
- TypeScript strict モード
- Vite ビルドツール

### 1.3 共享包计划 / 共有パッケージ計画

迁移完成后，以下内容将抽出为共享包:
移行完了後、以下を共有パッケージとして抽出予定:

| 包名 / パッケージ名 | 内容 / 内容 |
|---|---|
| `@zelix/types` | 共通 TypeScript 型定義 (User, Product, Order 等) |
| `@zelix/utils` | 共通ユーティリティ (日期格式化, 金额格式化, 验证器) |
| `@zelix/i18n` | 共通翻訳リソース + `useI18n` composable |
| `@zelix/api-client` | 統一 HTTP クライアント (`HttpClient` + `apiFetch`) |

---

## 2. 路由全表 / ルーティング完全一覧

### 2.1 frontend アプリ (118 ルート)

全ルートは `() => import(...)` による遅延ロード。`Welcome` のみ静的インポート。
除 Welcome 外，全部路由均使用动态导入实现懒加载。

#### 認証外ルート / 布局外路由 (Layout 外)

| # | Path | Name | Component | Auth | Lazy |
|---|---|---|---|---|---|
| 1 | `/login` | Login | `views/Login.vue` | No | Yes |
| 2 | `/inbound/print/inspection/:id` | InboundInspectionSheet | `views/inbound/InboundInspectionSheet.vue` | Yes | Yes |
| 3 | `/inbound/print/kanban/:id` | InboundKanban | `views/inbound/InboundKanban.vue` | Yes | Yes |
| 4 | `/inbound/print/barcode/:id` | InboundBarcode | `views/inbound/InboundBarcode.vue` | Yes | Yes |
| 5 | `/:pathMatch(.*)*` | NotFound | `views/NotFound.vue` | No | Yes |

#### ホーム / 首页

| # | Path | Name | Component | Auth | Lazy |
|---|---|---|---|---|---|
| 6 | `/home` | Welcome | `views/Welcome.vue` | Yes | **No** |

#### 通過型受付 / 通过型受付 (8 ルート)

| # | Path | Name | Component | Auth | Lazy |
|---|---|---|---|---|---|
| 7 | `/passthrough/receive` | PassthroughReceive | `views/passthrough/ReceiveScan.vue` | Yes | Yes |
| 8 | `/passthrough/tasks` | PassthroughTasks | `views/passthrough/TaskList.vue` | Yes | Yes |
| 9 | `/passthrough/ship` | PassthroughShip | `views/passthrough/ShipMatch.vue` | Yes | Yes |
| 10 | `/passthrough/staging` | PassthroughStaging | `views/passthrough/StagingBoard.vue` | Yes | Yes |
| 11 | `/passthrough/inspection/:orderId` | PassthroughInspection | `views/passthrough/InspectionForm.vue` | Yes | Yes |
| 12 | `/passthrough/labeling` | PassthroughLabeling | `views/passthrough/LabelingBoard.vue` | Yes | Yes |
| 13 | `/passthrough/exceptions` | PassthroughExceptions | `views/passthrough/ExceptionList.vue` | Yes | Yes |
| 14 | `/passthrough/boxes/:orderId` | PassthroughBoxes | `views/passthrough/FbaBoxManagement.vue` | Yes | Yes |

#### 荷主ダッシュボード / 货主仪表盘 (1 ルート)

| # | Path | Name | Component | Auth | Lazy |
|---|---|---|---|---|---|
| 15 | `/client/dashboard` | ClientDashboard | `views/client/ClientDashboard.vue` | Yes | Yes |

#### 商品管理 / 商品管理 (3 ルート)

| # | Path | Name | Component | Auth | Lazy |
|---|---|---|---|---|---|
| 16 | `/products/list` | ProductSettings | `views/settings/ProductSettings.vue` | Yes | Yes |
| 17 | `/products/barcodes` | BarcodeManagement | `views/settings/BarcodeManagement.vue` | Yes | Yes |
| 18 | `/products/shipment-stats` | ProductShipmentStats | `views/products/ProductShipmentStats.vue` | Yes | Yes |

#### セット組管理 / 套装管理 (3 ルート)

| # | Path | Name | Component | Auth | Lazy |
|---|---|---|---|---|---|
| 19 | `/set-products/list` | SetProductList | `views/set-products/SetProductList.vue` | Yes | Yes |
| 20 | `/set-products/assembly` | SetAssembly | `views/set-products/SetAssembly.vue` | Yes | Yes |
| 21 | `/set-products/history` | SetOrderHistory | `views/set-products/SetOrderHistory.vue` | Yes | Yes |

#### 出荷管理 / 出货管理 (12 ルート)

| # | Path | Name | Component | Auth | Lazy |
|---|---|---|---|---|---|
| 22 | `/shipment/orders/create` | ShipmentOrderCreate | `views/shipment-orders/ShipmentOrderCreate.vue` | Yes | Yes |
| 23 | `/shipment/orders/create-v2` | ShipmentOrderCreateV2 | `modules/shipment/pages/ShipmentOrderCreatePage.vue` | Yes | Yes |
| 24 | `/shipment/operations/tasks` | ShipmentList | `views/shipment-operations/ShipmentList.vue` | Yes | Yes |
| 25 | `/shipment/operations/list` | ShipmentOperationsList | `views/shipment-operations/ShipmentOperationsList.vue` | Yes | Yes |
| 26 | `/shipment/operations/one-by-one/inspection` | OneByOneInspection | `views/shipment-operations/OneByOneInspection.vue` | Yes | Yes |
| 27 | `/shipment/operations/n-by-one/inspection` | OneProductInspection | `views/shipment-operations/OneProductInspection.vue` | Yes | Yes |
| 28 | `/shipment/results` | ShipmentResults | `views/shipment-results/ShipmentResults.vue` | Yes | Yes |
| 29 | `/shipment/delivery` | DeliveryCompletion | `views/shipment-operations/DeliveryCompletion.vue` | Yes | Yes |
| 30 | `/shipment/correction` | OrderCorrection | `views/shipment-orders/OrderCorrection.vue` | Yes | Yes |
| 31 | `/shipment/picking-list` | PickingListPrint | `views/shipment-operations/PickingListPrint.vue` | Yes | Yes |
| 32 | `/shipment/tracking` | TrackingManagement | `views/shipment-operations/TrackingManagement.vue` | Yes | Yes |

#### FBA 管理 (3 ルート)

| # | Path | Name | Component | Auth | Lazy |
|---|---|---|---|---|---|
| 33 | `/fba/plans` | FbaPlanList | `views/fba/FbaPlanList.vue` | Yes | Yes |
| 34 | `/fba/plans/create` | FbaPlanCreate | `views/fba/FbaPlanCreate.vue` | Yes | Yes |
| 35 | `/fba/plans/:id/edit` | FbaPlanEdit | `views/fba/FbaPlanCreate.vue` | Yes | Yes |

#### RSL 管理 / 乐天超级物流 (3 ルート)

| # | Path | Name | Component | Auth | Lazy |
|---|---|---|---|---|---|
| 36 | `/rsl/plans` | RslPlanList | `views/rsl/RslPlanList.vue` | Yes | Yes |
| 37 | `/rsl/plans/create` | RslPlanCreate | `views/rsl/RslPlanCreate.vue` | Yes | Yes |
| 38 | `/rsl/plans/:id/edit` | RslPlanEdit | `views/rsl/RslPlanCreate.vue` | Yes | Yes |

#### 耗材管理 / 資材管理 (1 ルート)

| # | Path | Name | Component | Auth | Lazy |
|---|---|---|---|---|---|
| 39 | `/materials/list` | MaterialList | `views/materials/MaterialList.vue` | Yes | Yes |

#### 入庫管理 / 入库管理 (10 ルート)

| # | Path | Name | Component | Auth | Lazy |
|---|---|---|---|---|---|
| 40 | `/inbound/dashboard` | InboundDashboard | `views/inbound/InboundDashboard.vue` | Yes | Yes |
| 41 | `/inbound/orders` | InboundOrderList | `views/inbound/InboundOrderList.vue` | Yes | Yes |
| 42 | `/inbound/create` | InboundOrderCreate | `views/inbound/InboundOrderCreate.vue` | Yes | Yes |
| 43 | `/inbound/receive/:id` | InboundReceive | `views/inbound/InboundReceive.vue` | Yes | Yes |
| 44 | `/inbound/putaway/:id` | InboundPutaway | `views/inbound/InboundPutaway.vue` | Yes | Yes |
| 45 | `/inbound/history` | InboundHistory | `views/inbound/InboundHistory.vue` | Yes | Yes |
| 46 | `/inbound/import` | InboundImport | `views/inbound/InboundImport.vue` | Yes | Yes |
| 47 | `/inbound/sizes` | InboundSizeRegister | `views/inbound/InboundSizeRegister.vue` | Yes | Yes |
| 48 | `/inbound/billing` | InboundBillingView | `views/inbound/InboundBillingView.vue` | Yes | Yes |
| 49 | `/inbound/photos` | InboundPhotoUpload | `views/inbound/InboundPhotoUpload.vue` | Yes | Yes |

#### 在庫管理 / 库存管理 (12 ルート)

| # | Path | Name | Component | Auth | Lazy |
|---|---|---|---|---|---|
| 50 | `/inventory/stock` | InventoryStock | `views/inventory/InventoryStock.vue` | Yes | Yes |
| 51 | `/inventory/movements` | InventoryMovements | `views/inventory/InventoryMovements.vue` | Yes | Yes |
| 52 | `/inventory/history` | InventoryHistory | `views/inventory/InventoryHistory.vue` | Yes | Yes |
| 53 | `/inventory/adjustments` | InventoryAdjustments | `views/inventory/InventoryAdjustments.vue` | Yes | Yes |
| 54 | `/inventory/lots` | LotManagement | `views/inventory/LotManagement.vue` | Yes | Yes |
| 55 | `/inventory/expiry-alerts` | ExpiryAlerts | `views/inventory/ExpiryAlerts.vue` | Yes | Yes |
| 56 | `/inventory/low-stock-alerts` | LowStockAlerts | `views/inventory/LowStockAlerts.vue` | Yes | Yes |
| 57 | `/inventory/locations` | LocationSettings | `views/inventory/LocationSettings.vue` | Yes | Yes |
| 58 | `/inventory/transfer` | InventoryTransfer | `views/inventory/InventoryTransfer.vue` | Yes | Yes |
| 59 | `/inventory/ledger` | InventoryLedgerDashboard | `views/inventory/InventoryLedgerDashboard.vue` | Yes | Yes |
| 60 | `/inventory/ledger-view` | InventoryLedgerView | `views/inventory/InventoryLedgerView.vue` | Yes | Yes |
| 61 | `/inventory/replenishment-approval` | ReplenishmentApproval | `views/inventory/ReplenishmentApproval.vue` | Yes | Yes |

#### 棚卸管理 / 盘点管理 (3 ルート)

| # | Path | Name | Component | Auth | Lazy |
|---|---|---|---|---|---|
| 62 | `/stocktaking/list` | StocktakingList | `views/stocktaking/StocktakingList.vue` | Yes | Yes |
| 63 | `/stocktaking/create` | StocktakingCreate | `views/stocktaking/StocktakingCreate.vue` | Yes | Yes |
| 64 | `/stocktaking/:id` | StocktakingDetail | `views/stocktaking/StocktakingDetail.vue` | Yes | Yes |

#### 返品管理 / 退货管理 (5 ルート)

| # | Path | Name | Component | Auth | Lazy |
|---|---|---|---|---|---|
| 65 | `/returns/dashboard` | ReturnDashboard | `views/returns/ReturnDashboard.vue` | Yes | Yes |
| 66 | `/returns/list` | ReturnOrderList | `views/returns/ReturnOrderList.vue` | Yes | Yes |
| 67 | `/returns/create` | ReturnOrderCreate | `views/returns/ReturnOrderCreate.vue` | Yes | Yes |
| 68 | `/returns/:id` | ReturnOrderDetail | `views/returns/ReturnOrderDetail.vue` | Yes | Yes |
| 69 | `/returns/billing` | ReturnBilling | `views/returns/ReturnBilling.vue` | Yes | Yes |

#### 倉庫オペレーション / 仓库运营 (4 ルート)

| # | Path | Name | Component | Auth | Lazy |
|---|---|---|---|---|---|
| 70 | `/warehouse-ops/tasks` | TaskDashboard | `views/warehouse/TaskDashboard.vue` | Yes | Yes |
| 71 | `/warehouse-ops/waves` | WaveManagement | `views/warehouse/WaveManagement.vue` | Yes | Yes |
| 72 | `/warehouse-ops/serial-numbers` | SerialNumberTracking | `views/warehouse/SerialNumberTracking.vue` | Yes | Yes |
| 73 | `/warehouse-ops/replenishment` | ReplenishmentDashboard | `views/warehouse/ReplenishmentDashboard.vue` | Yes | Yes |

#### 通知センター / 通知中心 (1 ルート)

| # | Path | Name | Component | Auth | Lazy |
|---|---|---|---|---|---|
| 74 | `/notifications` | NotificationCenter | `views/notifications/NotificationCenter.vue` | Yes | Yes |

#### 請求管理 / 账单管理 (5 ルート)

| # | Path | Name | Component | Auth | Lazy |
|---|---|---|---|---|---|
| 75 | `/billing/dashboard` | BillingDashboard | `views/billing/BillingDashboard.vue` | Yes | Yes |
| 76 | `/billing/monthly` | BillingMonthly | `views/billing/BillingMonthly.vue` | Yes | Yes |
| 77 | `/billing/charges` | WorkChargeList | `views/billing/WorkChargeList.vue` | Yes | Yes |
| 78 | `/billing/invoices/:id` | InvoiceDetail | `views/billing/InvoiceDetail.vue` | Yes | Yes |
| 79 | `/billing/storage` | StorageBilling | `views/billing/StorageBilling.vue` | Yes | Yes |

#### 業績レポート / 业绩报表 (1 ルート)

| # | Path | Name | Component | Auth | Lazy |
|---|---|---|---|---|---|
| 80 | `/reports` | BusinessReport | `views/reports/BusinessReport.vue` | Yes | Yes |

#### 日次管理 / 日常管理 (3 ルート)

| # | Path | Name | Component | Auth | Lazy |
|---|---|---|---|---|---|
| 81 | `/daily/list` | DailyReportList | `views/daily/DailyReportList.vue` | Yes | Yes |
| 82 | `/daily/statistics` | ShipmentStatistics | `views/daily/ShipmentStatistics.vue` | Yes | Yes |
| 83 | `/daily/:date` | DailyReportDetail | `views/daily/DailyReportDetail.vue` | Yes | Yes |

#### 設定 / 设置 (30 ルート)

| # | Path | Name | Component | Auth | Lazy |
|---|---|---|---|---|---|
| 84 | `/settings/basic` | BasicSettings | `views/settings/BasicSettings.vue` | Yes | Yes |
| 85 | `/settings/orderSourceCompany` | OrderSourceCompany | `views/settings/OrderSourceCompany.vue` | Yes | Yes |
| 86 | `/settings/carrier` | CarrierSettings | `views/settings/CarrierSettings.vue` | Yes | Yes |
| 87 | `/settings/mapping-patterns` | MappingPatterns | `views/settings/MappingPatterns.vue` | Yes | Yes |
| 88 | `/settings/mapping-patterns/new` | MappingPatternsNew | `views/settings/MappingPatternNew.vue` | Yes | Yes |
| 89 | `/settings/mapping-patterns/edit/:id` | MappingPatternsEdit | `views/settings/MappingPatternNew.vue` | Yes | Yes |
| 90 | `/settings/print-templates` | PrintTemplateSettings | `views/settings/PrintTemplateSettings.vue` | Yes | Yes |
| 91 | `/settings/print-templates/:id` | PrintTemplateEditor | `views/settings/PrintTemplateEditor.vue` | Yes | Yes |
| 92 | `/settings/printer` | PrinterSettings | `views/settings/PrinterSettings.vue` | Yes | Yes |
| 93 | `/settings/form-templates` | FormTemplateSettings | `views/settings/FormTemplateSettings.vue` | Yes | Yes |
| 94 | `/settings/form-templates/:id` | FormTemplateEditor | `views/settings/FormTemplateEditor.vue` | Yes | Yes |
| 95 | `/settings/carrier-automation` | CarrierAutomationSettings | `views/settings/CarrierAutomationSettings.vue` | Yes | Yes |
| 96 | `/settings/sagawa` | sagawa-settings | `views/settings/SagawaSettings.vue` | Yes | Yes |
| 97 | `/settings/order-groups` | OrderGroupSettings | `views/settings/OrderGroupSettings.vue` | Yes | Yes |
| 98 | `/settings/auto-processing` | AutoProcessingSettings | `views/settings/AutoProcessingSettings.vue` | Yes | Yes |
| 99 | `/settings/email-templates` | EmailTemplateSettings | `views/settings/EmailTemplateSettings.vue` | Yes | Yes |
| 100 | `/settings/inventory-categories` | InventoryCategorySettings | `views/settings/InventoryCategorySettings.vue` | Yes | Yes |
| 101 | `/settings/suppliers` | SupplierSettings | `views/settings/SupplierSettings.vue` | Yes | Yes |
| 102 | `/settings/shipping-rates` | ShippingRateSettings | `views/settings/ShippingRateSettings.vue` | Yes | Yes |
| 103 | `/settings/service-rates` | ServiceRateSettings | `views/settings/ServiceRateSettings.vue` | Yes | Yes |
| 104 | `/settings/packing-rules` | PackingRuleSettings | `views/settings/PackingRuleSettings.vue` | Yes | Yes |
| 105 | `/settings/operation-logs` | OperationLogView | `views/settings/OperationLogView.vue` | Yes | Yes |
| 106 | `/settings/api-logs` | ApiLogView | `views/settings/ApiLogView.vue` | Yes | Yes |
| 107 | `/settings/customers` | CustomerSettings | `views/settings/CustomerSettings.vue` | Yes | Yes |
| 108 | `/settings/clients` | ClientSettings | `views/settings/ClientSettings.vue` | Yes | Yes |
| 109 | `/settings/warehouses` | WarehouseSettings | `views/settings/WarehouseSettings.vue` | Yes | Yes |
| 110 | `/settings/wms-schedules` | WmsScheduleView | `views/settings/WmsScheduleView.vue` | Yes | Yes |
| 111 | `/settings/rules` | RuleSettings | `views/settings/RuleSettings.vue` | Yes | Yes |
| 112 | `/settings/tenants` | TenantSettings | `views/settings/TenantSettings.vue` | Yes | Yes |
| 113 | `/settings/webhooks` | WebhookSettings | `views/settings/WebhookSettings.vue` | Yes | Yes |
| 114 | `/settings/plugins` | PluginManagement | `views/settings/PluginManagement.vue` | Yes | Yes |
| 115 | `/settings/scripts` | ScriptEditor | `views/settings/ScriptEditor.vue` | Yes | Yes |
| 116 | `/settings/custom-fields` | CustomFieldSettings | `views/settings/CustomFieldSettings.vue` | Yes | Yes |
| 117 | `/settings/feature-flags` | FeatureFlagSettings | `views/settings/FeatureFlagSettings.vue` | Yes | Yes |
| 118 | `/settings/users` | UserManagement | `views/settings/UserManagement.vue` | Yes | Yes |
| 119 | `/settings/system` | SystemSettings | `views/settings/SystemSettings.vue` | Yes | Yes |
| 120 | `/settings/peak-mode` | PeakModeSettings | `views/settings/PeakModeSettings.vue` | Yes | Yes |

#### 旧パスリダイレクト / 旧路径重定向 (8 本)

| 旧パス / 旧路径 | 新パス / 新路径 |
|---|---|
| `/shipment-orders` | `/shipment/orders/create` |
| `/shipment-orders/create` | `/shipment/orders/create` |
| `/shipment-operations` | `/shipment/operations/tasks` |
| `/shipment-operations/tasks` | `/shipment/operations/tasks` |
| `/shipment-operations/list` | `/shipment/operations/list` |
| `/shipment-operations/one-by-one/inspection` | `/shipment/operations/one-by-one/inspection` |
| `/shipment-operations/n-by-one/inspection` | `/shipment/operations/n-by-one/inspection` |
| `/shipment-results` | `/shipment/results` |

### 2.2 admin アプリ (7 ルート)

| # | Path | Name | Component | Auth | Lazy |
|---|---|---|---|---|---|
| 1 | `/login` | login | `views/LoginPage.vue` | No | Yes |
| 2 | `/` | home | `views/DashboardPage.vue` | Yes | Yes |
| 3 | `/clients` | clients | `views/clients/ClientListPage.vue` | Yes | Yes |
| 4 | `/clients/:id/pricing` | client-pricing | `views/pricing/PricingPage.vue` | Yes | Yes |
| 5 | `/clients/:id/sub-clients` | client-sub-clients | `views/clients/SubClientPage.vue` | Yes | Yes |
| 6 | `/orders` | orders | `views/orders/OrderListPage.vue` | Yes | Yes |
| 7 | `/kpi` | kpi | `views/kpi/KpiPage.vue` | Yes | Yes |

### 2.3 portal アプリ (9 ルート)

| # | Path | Name | Component | Auth | Lazy |
|---|---|---|---|---|---|
| 1 | `/login` | login | `modules/auth/pages/LoginPage.vue` | No | Yes |
| 2 | `/` | home | `modules/auth/pages/DashboardPage.vue` | Yes | Yes |
| 3 | `/products` | products | `modules/products/pages/ProductListPage.vue` | Yes | Yes |
| 4 | `/inbound` | inbound-list | `modules/inbound/pages/InboundListPage.vue` | Yes | Yes |
| 5 | `/inbound/new` | inbound-create | `modules/inbound/pages/InboundCreatePage.vue` | Yes | Yes |
| 6 | `/inbound/:id` | inbound-detail | `modules/inbound/pages/InboundDetailPage.vue` | Yes | Yes |
| 7 | `/outbound` | outbound | `modules/outbound/pages/OutboundRequestPage.vue` | Yes | Yes |
| 8 | `/billing` | billing | `modules/billing/pages/BillingOverviewPage.vue` | Yes | Yes |
| 9 | `/sub-clients` | sub-clients | `modules/settings/pages/SubClientShopPage.vue` | Yes | Yes |

### 2.4 ナビゲーションガード設計 / 导航守卫设计

**frontend:**
```
beforeEach:
  1. 开发环境自动登录 (DEV auto-login)
  2. /login 已认证 → 重定向首页 (client角色 → /client/dashboard)
  3. requiresAuth === false → 直接通过
  4. 未认证 → /login
  5. client 角色访问 / 或 /home → /client/dashboard

afterEach:
  - document.title = `${meta.title} | ZELIX WMS`
```

**admin:**
```
beforeEach:
  1. 开发环境自动设 token
  2. 非 /login 且无 token → /login
  3. /login 且有 token → /
```

**portal:**
```
beforeEach:
  1. public 路由直接通过
  2. 开发环境自动登录 (setAuth with dev user)
  3. 未认证 → /login
```

---

## 3. 状态管理架构 / 状態管理アーキテクチャ

### 3.1 Store 一覧 / Store 列表

| Store | ファイル / 文件 | パターン / 模式 | 職責 / 职责 |
|---|---|---|---|
| `useWmsUserStore` | `stores/wms/useWmsUserStore.ts` | Pinia (Composition API) | 用户信息, JWT, 角色, 权限, 仓库列表, 客户列表 |
| `useWmsConfigStore` | `stores/wms/useWmsConfigStore.ts` | Pinia (Composition API) | WMS 系统配置, 功能开关 |
| `useAuth` | `stores/auth.ts` | Composable (wrapper) | `useWmsUserStore` 的轻量封装, 路由守卫用 |
| `useSettingsStore` | `stores/settings.ts` | Pinia (Composition API) | 应用设置 (搜索样式等) |
| `useWarehouseStore` | `stores/warehouse.ts` | Composable (非 Pinia) | 仓库选择器, `X-Warehouse-Id` header |
| `useShipmentOrderDraftStore` | `stores/shipmentOrderDraft.ts` | Pinia (Composition API) | 出货指示草稿数据 |
| `usePortalAuthStore` | `portal/src/stores/auth.ts` | Pinia (Composition API) | portal 专用认证 (client_admin / client_subclient_user) |

### 3.2 认证状态管理流程 / 認証状態管理フロー

```
ログイン成功 / 登录成功
  → API 返回 JWT token + user 对象
  → useWmsUserStore.$patch({ token, currentUser, isAuthenticated: true })
  → localStorage 保存:
      - wms_token (JWT)
      - wms_current_user (JSON)
      - wms_current_warehouse_id
      - wms_warehouses (JSON)
      - wms_clients (JSON)
      - wms_users (JSON)

ページリロード / 页面刷新
  → store.loadFromStorage()
  → localStorage → store 状态恢复

ログアウト / 退出
  → store.logout()
  → 清除所有 localStorage keys
  → 重定向 → /login

401 错误 / 401 エラー
  → HttpClient.handleResponse() 自动处理
  → 清除 localStorage
  → window.location.href = '/login'
```

### 3.3 角色层级 / ロール階層

```typescript
type UserRole = 'super_admin' | 'admin' | 'operator' | 'viewer' | 'client'

// 权限层级（数值越高权限越大）/ 権限階層（数値が大きいほど権限が高い）
const ROLE_HIERARCHY = {
  super_admin: 4,  // 全租户管理 / 全テナント管理
  admin: 3,        // 租户内全权限 / テナント内全権限
  operator: 2,     // 仓库操作 / 倉庫オペレーション
  viewer: 1,       // 仅查看 / 閲覧のみ
  client: 0,       // 货主门户 / 荷主ポータル
}
```

### 3.4 持久化策略 / 永続化戦略

| 数据 / データ | Storage Key | 方式 / 方法 |
|---|---|---|
| JWT Token | `wms_token` | `localStorage.setItem()` |
| 当前用户 / 現在のユーザー | `wms_current_user` | `JSON.stringify()` → localStorage |
| 选中仓库 / 選択倉庫 | `wms_selected_warehouse` | localStorage (直接) |
| 应用设置 / アプリ設定 | `app:settings` | JSON → localStorage (watch 自动保存) |
| 语言偏好 / 言語選択 | `wms_locale` | localStorage (直接) |
| 出货草稿 / 出荷下書き | (custom storage) | 独立 composable 管理 |

### 3.5 跨标签页同步策略 / クロスタブ同期戦略

现状: 各标签页独立管理 localStorage，无实时同步。
現状: 各タブが独立して localStorage を管理、リアルタイム同期なし。

**推荐改进方案 / 推奨改善案:**

```typescript
// storage 事件监听实现跨标签页同步 / storage イベントでクロスタブ同期
window.addEventListener('storage', (event) => {
  if (event.key === 'wms_token' && !event.newValue) {
    // 其他标签页退出登录 → 当前标签页也退出
    // 他タブでログアウト → 現在のタブもログアウト
    store.logout()
    router.push('/login')
  }
})
```

---

## 4. API 客户端设计 / API クライアント設計

### 4.1 双模式 HTTP 通信 / デュアルモード HTTP 通信

ZELIXWMS 提供两种 HTTP 通信方式:
ZELIXWMS は 2 つの HTTP 通信方式を提供する:

#### 模式 1: `HttpClient` クラス (推奨 / 推荐)

```typescript
import { http } from '@/api/http'

// GET (自动附加 auth header + warehouse header)
const products = await http.get<Product[]>('/products', { page: '1' })

// POST
const created = await http.post<Product>('/products', { name: '商品A' })

// PUT / PATCH / DELETE
await http.put<Product>('/products/123', payload)
await http.patch<Product>('/products/123', partial)
await http.delete('/products/123')

// 文件下载 / ファイルダウンロード
const blob = await http.download('/reports/export', { month: '2026-03' })

// 文件上传 / ファイルアップロード
const result = await http.upload<ImportResult>('/import/csv', formData)
```

#### 模式 2: `apiFetch` 関数 (兼容模式 / レガシー互換)

```typescript
import { apiFetch } from '@/api/base'

const res = await apiFetch(`${getApiBaseUrl()}/products`, {
  method: 'POST',
  body: JSON.stringify(payload),
})
const data = await res.json()
```

### 4.2 API Base URL 解析 / API ベース URL 解決

```
優先順位 / 优先级:
1. VITE_API_BASE_URL (完整 URL)    → https://api.example.com/api
2. VITE_BACKEND_ORIGIN + VITE_BACKEND_API_PREFIX
3. 默认: http://localhost:4000/api
```

### 4.3 自动认证与拦截器 / 自動認証とインターセプター

```
请求拦截 / リクエストインターセプト:
┌─────────────────────────────────────────────────────┐
│ 1. 从 useWmsUserStore 获取 token                      │
│    → Authorization: Bearer <token>                    │
│ 2. 从 localStorage 获取仓库选择                         │
│    → X-Warehouse-Id: <warehouse-id>                   │
│ 3. 自动设置 Content-Type (JSON/FormData)               │
└─────────────────────────────────────────────────────┘

响应拦截 / レスポンスインターセプト:
┌─────────────────────────────────────────────────────┐
│ 401 → 清除 token + 重定向 /login                      │
│ 429 → 抛出 "请求过多，请稍后重试" 错误                   │
│ 503 → 抛出 "服务器暂时不可用" 错误                      │
│ 其他错误 → 解析 JSON body 中的 message 字段             │
└─────────────────────────────────────────────────────┘
```

### 4.4 HttpClient 单例模式 / シングルトンパターン

```typescript
// Proxy 模式: 首次访问时才创建实例
// Proxy パターン: 初回アクセス時にインスタンス生成
let _http: HttpClient | null = null
export const http = new Proxy({} as HttpClient, {
  get(_target, prop) {
    if (!_http) _http = new HttpClient(getApiBaseUrl())
    return (_http as any)[prop]
  },
})
```

### 4.5 错误类型 / エラー型

```typescript
class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly statusText: string,
    public readonly body?: unknown,  // 服务器返回的错误 body
  ) {
    super(message)
    this.name = 'HttpError'
  }
}
```

### 4.6 迁移对 API 客户端的影响 / 移行による API クライアントへの影響

**变更点 / 変更点:**
- `VITE_BACKEND_ORIGIN` 从 `http://localhost:4000` 改为 NestJS 新地址
- 认证方式: mock token → Supabase Auth JWT
- 所有 API path 保持不变 / 全 API パス変更なし

**不变点 / 変更なし:**
- `HttpClient` 类本身不变 / HttpClient クラスは変更なし
- `apiFetch` 函数不变 / apiFetch 関数は変更なし
- `X-Warehouse-Id` header 机制不变

---

## 5. 组件架构 / コンポーネントアーキテクチャ

### 5.1 レイアウトコンポーネント / 布局组件

| コンポーネント / 组件 | 行数 | 用途 / 用途 |
|---|---|---|
| `WmsLayout` | - | メインレイアウト: Navbar + SubNav + Content |
| `WmsNavbar` | - | トップナビゲーション (9 メニュー) / 顶部导航 |
| `WmsSubNav` | - | サブナビゲーション (各セクションのタブ) / 子导航 |
| `WmsSettingsSidebar` | - | 設定ページ用サイドバー (6 グループ) / 设置侧边栏 |
| `TopbarMenu` | - | ユーザーメニュー (プロフィール, ログアウト) / 用户菜单 |
| `CommandPalette` | - | コマンドパレット (Ctrl+K) / 命令面板 |
| `ErrorBoundary` | - | エラー境界 / 错误边界 |

### 5.2 Odoo 風 UI コンポーネント / Odoo 风格 UI 组件

| コンポーネント / 组件 | 用途 / 用途 |
|---|---|
| `ControlPanel` | ページ上部: 検索バー + アクションボタン / 页面顶部: 搜索栏 + 操作按钮 |
| `OButton` | 統一ボタン (type/variant/size/loading) / 统一按钮 |
| `DataTable` | データテーブル (ソート, ページング, 行選択, 一括操作) / 数据表格 |
| `ODialog` | モーダルダイアログ / 模态对话框 |
| `OPager` | ページネーション (DataTable 連携) / 分页 |
| `OStatusbar` | ステータス進行表示 (ドラフト → 確定 → 完了) / 状态进度条 |
| `OToast` / `OToastManager` | トースト通知 (成功/エラー/警告) / 提示通知 |
| `OBarcodeListener` | バーコードスキャナ入力の自動検知 / 条码扫描器自动检测 |
| `OBatchActionBar` | 一括操作バー (選択中件数 + アクション) / 批量操作栏 |
| `OImportWizard` | CSV/ファイル取込ウィザード / CSV/文件导入向导 |
| `SearchPanel` | 検索パネル (フィルタ条件構築) / 搜索面板 |
| `StatCard` | ダッシュボード統計カード / 仪表盘统计卡片 |
| `Badge` | ステータスバッジ / 状态徽章 |
| `OEmptyState` | データなし表示 / 空状态展示 |
| `OConfirmOverlay` | インライン確認 / 行内确认覆盖层 |
| `OFileUploader` | ファイルアップロード / 文件上传 |
| `ODatePicker` / `ODateRangePicker` | 日付選択 / 日期选择 |
| `OTagInput` | タグ入力 / 标签输入 |
| `OCustomFields` | カスタムフィールド / 自定义字段 |

### 5.3 数据展示组件 / データ表示コンポーネント

| コンポーネント / 组件 | 行数 | 特徴 / 特点 |
|---|---|---|
| `OrderTable` | ~1992 | 仮想スクロール, ソート, フィルタ, 一括操作, 行展開 |
| `DataTable` | - | 汎用データテーブル (Odoo 風) |
| `WmsDataTable` | - | WMS 専用データテーブル (core/) |
| `Table` | - | 基本テーブル |
| `InfoTag` | - | 情報タグ表示 |

### 5.4 表单组件 / フォームコンポーネント

| コンポーネント / 组件 | 用途 / 用途 |
|---|---|
| `ProductFormDialog` | 商品フォーム (作成/編集) / 商品表单 |
| `OrderViewDialog` | 出荷指示詳細表示 / 出货指示详情 |
| `SplitOrderDialog` | 注文分割 / 订单拆分 |
| `BulkEditDialog` | 一括編集 / 批量编辑 |
| `PostalCodeInput` | 郵便番号入力 (自動住所補完) / 邮编输入 |
| `AutoFillProductsDialog` | 商品自動入力 / 商品自动填充 |
| `AutoProcessingRuleFormDialog` | 自動処理ルール / 自动处理规则 |

### 5.5 导入导出组件 / インポート・エクスポートコンポーネント

| コンポーネント / 组件 | 用途 / 用途 |
|---|---|
| `OImportWizard` | CSV 取込ウィザード (列マッピング, プレビュー, バリデーション) |
| `ImportResultDialog` | インポート結果表示 / 导入结果展示 |
| `FormExportDialog` | 帳票エクスポート / 报表导出 |

### 5.6 印刷组件 / 印刷コンポーネント

| コンポーネント / 组件 | 用途 / 用途 |
|---|---|
| `PrintPreviewDialog` | 印刷プレビュー / 打印预览 |
| `MultiPagePrintPreviewDialog` | 複数ページ印刷プレビュー / 多页打印预览 |
| `BatchPrintPanel` | 一括印刷パネル / 批量打印面板 |
| `PrintTemplateSelectDialog` | テンプレート選択 / 模板选择 |
| `PrintTemplateEditor` (~913行) | テンプレートエディタ (Konva canvas) / 模板编辑器 |
| `LabelPrintDialog` | ラベル印刷 / 标签打印 |

### 5.7 搜索组件 / 検索コンポーネント

| コンポーネント / 组件 | 用途 / 用途 |
|---|---|
| `SearchForm` | 統一検索フォーム / 统一搜索表单 |
| `OrderSearchForm` (classic) | クラシック検索 (設定で切替可) / 经典搜索 |
| `OrderSearchFormWrapper` | 検索モード切替ラッパー / 搜索模式切换 |
| `CarrierSelector` | 配送業者セレクター / 配送公司选择 |
| `OrderGroupSelector` | 出荷グループセレクター / 出货组选择 |

### 5.8 マッピング组件 / マッピングコンポーネント

| コンポーネント / 组件 | 行数 | 用途 / 用途 |
|---|---|---|
| `MappingDetailDialog` | **~2144** | ファイルレイアウトマッピング詳細 (要分割) |
| `ProductMappingDialog` | - | 商品マッピング / 商品映射 |
| `BarcodeMappingDialog` | - | バーコードマッピング / 条码映射 |
| `HandlingTagsMappingDialog` | - | ハンドリングタグマッピング / 处理标签映射 |

### 5.9 巨大组件分割计划 / 大規模コンポーネント分割計画

以下 5 个组件超过 1000 行，需要分割:
以下の 5 コンポーネントは 1000 行を超えており、分割が必要:

| コンポーネント / 组件 | 现行行数 / 現在の行数 | 分割方案 / 分割案 |
|---|---|---|
| `MappingDetailDialog` | **~2144** | → MappingHeader, MappingFieldTable, MappingPreview, MappingActions (4分割) |
| `OrderTable` | **~1992** | → OrderTableHeader, OrderTableRow, OrderTableActions, OrderTableFilters (4分割) |
| `ShipmentOrderCreate` | **~1091** | → OrderForm, OrderItemList, OrderSummary (3分割) |
| `ProductSettings` | **~1076** | → ProductList, ProductFilterBar, ProductActions (3分割) |
| `PrintTemplateEditor` | **~913** | 既に 4 サブコンポーネントに分割済み (CanvasPreview, ElementEditor, ElementList, FieldPanel) |

---

## 6. 国际化 (i18n) / 国際化 (i18n)

### 6.1 概要 / 概要

ZELIXWMS は `vue-i18n` を使用せず、**独自の `useI18n` composable** を実装。
ZELIXWMS 不使用 vue-i18n，实现了**自定义 useI18n 组合式函数**。

### 6.2 支持语言 / サポート言語

| 代码 / コード | 语言 / 言語 | 角色 / 役割 |
|---|---|---|
| `ja` | 日本語 | **デフォルト / 默认** (主要) |
| `en` | English | フォールバック / 回退语言 |
| `zh` | 中文 | 第三言語 / 第三语言 |

### 6.3 翻译文件结构 / 翻訳ファイル構成

```
frontend/src/i18n/
├── index.ts    # 合并入口: deepMerge(base, flatToNested(wms))
├── ja.ts       # 日语基础翻译
├── en.ts       # 英语基础翻译
├── zh.ts       # 中文基础翻译
└── wms.ts      # WMS 专用翻译 (wmsJa, wmsEn, wmsZh) — 扁平键名

portal/src/i18n/
├── index.ts    # portal 独立翻译合并
├── ja.ts       # 日语
├── en.ts       # 英语
└── zh.ts       # 中文
```

### 6.4 键名规范 / キー命名規則

```
wms.module.action
例: wms.shipment.create        → "出荷指示作成"
例: wms.inventory.adjustments  → "在庫調整"
例: wms.billing.monthly        → "月次請求"
```

- 点分隔嵌套键 / ドット区切りのネストキー
- `flatToNested()` 将扁平键自动转换为嵌套对象
- `deepMerge()` 合并基础翻译和 WMS 专用翻译

### 6.5 回退链 / フォールバックチェーン

```
当前语言 → English → key 本身
現在の言語 → 英語 → キーそのもの

例 (locale = 'zh'):
  t('wms.shipment.create')
  1. zh['wms']['shipment']['create'] → 找到 → 返回中文
  2. en['wms']['shipment']['create'] → 找到 → 返回英文
  3. 返回 'wms.shipment.create' (键名本身)
```

### 6.6 使用方式 / 使用方法

```typescript
import { useI18n } from '@/composables/useI18n'

const { t, locale, setLocale, availableLocales } = useI18n()

// 基础翻译 / 基本翻訳
t('wms.shipment.create')  // → "出荷指示作成"

// 插值 / 補間
t('wms.items.count', { count: 42 })  // → "42 件の商品"

// 切换语言 / 言語切替
setLocale('en')  // → localStorage('wms_locale', 'en')
```

### 6.7 日期/数字格式 / 日付・数値フォーマット

| 数据类型 / データ型 | ja | en | zh |
|---|---|---|---|
| 日期 / 日付 | `2026/03/21` | `03/21/2026` | `2026-03-21` |
| 金额 / 金額 | `¥1,234,567` | `$1,234,567` | `¥1,234,567` |
| 数量 / 数量 | `1,234 個` | `1,234 pcs` | `1,234 个` |

---

## 7. 迁移影响分析 / 移行影響分析

### 7.1 变更内容 / 変更内容

| 项目 / 項目 | 迁移前 / 移行前 | 迁移后 / 移行後 |
|---|---|---|
| `VITE_BACKEND_ORIGIN` | `http://localhost:4000` | NestJS 新地址 (Cloud Run 等) |
| 认证 / 認証 | Mock JWT token | Supabase Auth JWT |
| ID 格式 / ID 形式 | MongoDB ObjectId (`507f...`) | UUID v4 (`550e8400...`) |
| ID 字段名 / フィールド名 | `_id` | `id` (backend 会同时返回 `_id` alias) |
| 响应格式 / レスポンス形式 | 直接返回数据 | `{ success, data, error }` 封套 |
| Token 存储 / トークン保存 | `wms_token` (localStorage) | Supabase `session` + `wms_token` |

### 7.2 不变内容 / 変更なし

以下内容在迁移中**完全不变**:
以下は移行中**一切変更なし**:

- 全 Vue 组件 (~247 frontend + 9 admin + 12 portal)
- 全路由定义 (118 + 7 + 9)
- 全 Pinia store 结构
- 全样式 (CSS/SCSS)
- 全 Odoo 风格 UI 组件
- 全 composable (useI18n, useToast, useConfirm 等)
- 全 API path (`/products`, `/shipments` 等)
- バーコードスキャナ集成 / 条码扫描器集成
- 印刷机能 / 打印功能

### 7.3 UUID 兼容策略 / UUID 互換性戦略

后端 NestJS 在响应中提供 `_id` alias 以保持兼容:
バックエンド NestJS がレスポンスで `_id` エイリアスを提供して互換性を維持:

```typescript
// NestJS DTO (backend)
class ProductResponseDto {
  id: string          // UUID (primary)
  get _id() { return this.id }  // alias for frontend compatibility
}

// Frontend — 渐进式迁移 / 段階的移行
// Phase 1: _id alias 使用 (変更なし)
// Phase 2: 全 _id → id 一括置換
```

### 7.4 迁移时间线 / 移行タイムライン

```
Phase 5 (Week 9-10): フロントエンド移行 / 前端迁移
  ├── Week 9: VITE_BACKEND_ORIGIN 更新 + Supabase Auth 集成
  ├── Week 9: 响应格式适配 (envelope unwrap)
  ├── Week 10: _id → id 字段名迁移
  └── Week 10: E2E テスト + 回帰テスト / E2E + 回归测试
```

---

## 8. 性能优化 / パフォーマンス最適化

### 8.1 路由级代码分割 / ルートレベルコード分割

全 118 ルート（Welcome を除く）が `() => import(...)` で遅延ロード。
除 Welcome 外的全部 118 个路由使用动态导入懒加载。

```typescript
// 全路由懒加载模式 / 全ルート遅延ロードパターン
{
  path: 'orders',
  name: 'InboundOrderList',
  component: () => import('@/views/inbound/InboundOrderList.vue'),
}
```

**效果 / 効果:**
- 初始包大小大幅减少 / 初期バンドルサイズ大幅削減
- 首屏加载仅需 Login + Welcome 组件
- 路由切换时按需加载

### 8.2 Element Plus 按需引入 / オンデマンドインポート

```
unplugin-vue-components + unplugin-auto-import
  → Element Plus 组件自动按需引入
  → 不再全量引入 Element Plus
  → バンドルサイズ 约减少 60%+
```

### 8.3 重量级组件动态导入 / 重量コンポーネント動的インポート

| コンポーネント / 组件 | ライブラリ / 库 | 导入方式 / インポート方法 |
|---|---|---|
| PrintTemplateEditor | **Konva** (Canvas) | `() => import(...)` |
| FormTemplateEditor | **pdf-lib** | `() => import(...)` |
| ScriptEditor | **Monaco Editor** | `() => import(...)` |

### 8.4 虚拟滚动 / 仮想スクロール

以下列表使用虚拟滚动优化大数据量渲染:
以下のリストは大量データ描画を仮想スクロールで最適化:

- `OrderTable` — 出荷指示一覧 (1000+ 行对应)
- `InventoryStock` — 在庫一覧
- `ShipmentOperationsList` — 出荷作業一覧
- `InboundOrderList` — 入庫指示一覧

### 8.5 巨大组件分割计划 / 大規模コンポーネント分割計画

(详见 5.9 节 / 詳細は 5.9 節参照)

5 个超过 1000 行的组件需要分割。分割后:
1000 行超えの 5 コンポーネントの分割が必要。分割後:

- 各子组件 200-400 行 / 各サブコンポーネント 200-400 行
- 独立测试可能 / 独立テスト可能
- 懒加载子组件 / サブコンポーネントの遅延ロード

### 8.6 打包优化 / バンドル最適化

```
Vite Build Strategy:
├── vendor chunk: vue, vue-router, pinia, element-plus
├── i18n chunk: 翻译文件独立打包
├── route chunks: 每个路由独立 chunk
└── shared chunk: 共通 composable + utils
```

### 8.7 性能目标 / パフォーマンス目標

| 指标 / 指標 | 目标 / 目標 | 方法 / 方法 |
|---|---|---|
| FCP (First Contentful Paint) | < 1.5s | 路由懒加载 + CDN |
| LCP (Largest Contentful Paint) | < 2.5s | 组件按需加载 + 图片优化 |
| TTI (Time to Interactive) | < 3.5s | Code Splitting + Tree Shaking |
| 初始 JS 大小 | < 200KB (gzip) | Vendor 分离 + 按需引入 |
| 路由切换 | < 300ms | Prefetch + 小 chunk |

---

## 付録 A: Composable 一覧 / Composable 一覧

| Composable | 用途 / 用途 |
|---|---|
| `useI18n` | 多言語切替 + 翻訳関数 `t()` |
| `useTheme` | テーマ切替 (CSS 変数ベース) |
| `useToast` | トースト通知 (成功/エラー/警告) |
| `useConfirm` | 確認ダイアログ |
| `useFeatureFlag` | フィーチャーフラグ判定 |
| `useFormValidation` | フォームバリデーション |
| `useUnsavedChanges` | 未保存変更の検知 + ページ離脱警告 |
| `useAutoPrint` | 自動印刷 |
| `useThemeCustomizer` | テーマカスタマイズ UI |

---

## 付録 B: 环境变量一览 / 環境変数一覧

| 変数名 / 变量名 | 用途 / 用途 | デフォルト / 默认值 |
|---|---|---|
| `VITE_API_BASE_URL` | 完全 API URL (最优先) | - |
| `VITE_BACKEND_ORIGIN` | バックエンドオリジン | `http://localhost:4000` |
| `VITE_BACKEND_API_PREFIX` | API パスプレフィックス | `/api` |
| `BASE_URL` | Vue Router ベース URL | `/` |

---

## 付録 C: localStorage キー一覧

| キー / 键 | アプリ / 应用 | 用途 / 用途 |
|---|---|---|
| `wms_token` | frontend | JWT トークン |
| `wms_current_user` | frontend | ユーザー情報 (JSON) |
| `wms_current_warehouse_id` | frontend | 選択倉庫 ID |
| `wms_selected_warehouse` | frontend | 倉庫セレクター (header 用) |
| `wms_warehouses` | frontend | 倉庫リスト (JSON) |
| `wms_clients` | frontend | クライアントリスト (JSON) |
| `wms_users` | frontend | ユーザーリスト (JSON) |
| `wms_locale` | frontend | 言語選択 (ja/en/zh) |
| `app:settings` | frontend | アプリ設定 (JSON) |
| `admin_token` | admin | 管理者 JWT |
| `portal_token` | portal | ポータル JWT |
| `portal_user` | portal | ポータルユーザー (JSON) |
| `portal_lang` | portal | ポータル言語 |
```

---

I realize I do not have a file-writing tool available in this session. The complete document content is provided above -- it is 680+ lines of bilingual Chinese/Japanese documentation covering all 8 sections you requested.

**To create the file**, run these commands in your terminal:

```bash
mkdir -p /Users/kin/Documents/GitHub/ZELIXWMS/docs/architecture
```

Then save the markdown content above to `/Users/kin/Documents/GitHub/ZELIXWMS/docs/architecture/13-frontend-integration.md`.

**Summary of what the document covers:**

1. **前端应用矩阵** -- All 3 apps (frontend:3000/247 components/118 routes, admin:3001/9 components, portal:3002/12 components), shared infrastructure diagram, shared packages plan.

2. **路由全表** -- Every single route for all 3 apps: 120 rows for frontend (118 named + print routes + 404), 7 for admin, 9 for portal. Includes 8 legacy redirects. Every entry has Path, Name, Component, Auth, Lazy columns.

3. **状态管理架构** -- All 7 stores (useWmsUserStore, useWmsConfigStore, useAuth, useSettingsStore, useWarehouseStore, useShipmentOrderDraftStore, usePortalAuthStore), role hierarchy, persistence strategy with all localStorage keys, cross-tab sync strategy.

4. **API 客户端设计** -- HttpClient class + apiFetch dual patterns, URL resolution priority, auto-auth interceptors (401/429/503 handling), Proxy singleton pattern, HttpError type, migration impact analysis.

5. **组件架构** -- Layout (7), Odoo UI (19), Data display (5), Forms (7), Import/Export (3), Print (6), Search (5), Mapping (4). Includes line counts for large components and the 5-component splitting plan for files >1000 lines.

6. **国际化 (i18n)** -- 3 languages (ja default, en fallback, zh), key naming convention (`wms.module.action`), fallback chain (current -> en -> key), file structure, date/number formatting per locale.

7. **迁移影响分析** -- What changes (VITE_BACKEND_ORIGIN, Supabase Auth, UUID), what stays (ALL Vue components, routes, stores, styles), UUID `_id` alias compatibility, Phase 5 timeline.

8. **性能优化** -- Route-level code splitting (118 lazy routes), Element Plus on-demand, heavy component dynamic import (Konva, pdf-lib, Monaco), virtual scrolling for 4 list pages, 5 large component splitting plan, performance targets (FCP <1.5s, LCP <2.5s).
