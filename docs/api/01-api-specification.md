# ZELIXWMS API 仕様書
# ZELIXWMS API 规格书

> 全エンドポイントのリファレンス。新規開発者向け。
> 全端点参考。面向新开发者。

## 1. 概要 / 概述

- Base URL: `http://localhost:4000/api` (Express) / `http://localhost:4100/api` (NestJS)
- 認証: Bearer JWT token (`Authorization: Bearer <token>`)
- Content-Type: `application/json`
- テナント: JWT の `tenantId` から自動取得
- 開発モード: トークン不要（dev user 自動注入）

## 2. 共通レスポンス形式 / 通用响应格式

### 一覧 (Paginated)
```json
{
  "items": [...],
  "total": 100,
  "page": 1,
  "limit": 50
}
```

### 単体 (Single)
```json
{
  "_id": "...",
  "sku": "...",
  "name": "...",
  "createdAt": "2026-03-20T00:00:00.000Z"
}
```

### エラー (Error)
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

## 3. 認証 API / 认证 API

| Method | Path | 説明 |
|--------|------|------|
| POST | `/api/auth/login` | ログイン（email + password → JWT） |
| POST | `/api/auth/register` | 新規登録 |
| GET | `/api/auth/me` | 現在のユーザー情報取得 |

## 4. 商品管理 / 商品管理

| Method | Path | 説明 | RBAC |
|--------|------|------|------|
| GET | `/api/products` | 一覧（?page, ?limit, ?sku, ?name） | - |
| GET | `/api/products/:id` | 詳細 | - |
| POST | `/api/products` | 作成（Zod validation） | - |
| PUT | `/api/products/:id` | 全体更新 | - |
| PATCH | `/api/products/:id` | 部分更新 | - |
| DELETE | `/api/products/:id` | 削除 | - |
| POST | `/api/products/import` | CSV一括取込 | - |

### POST /api/products リクエスト例
```json
{
  "sku": "APPLE-001",
  "name": "りんごジュース 1L",
  "category": "食品",
  "barcode": ["4901234567890"],
  "price": 198,
  "weight": 1.2,
  "customerProductCode": "CUST-APPLE-001",
  "brandCode": "BRD-FRUIT",
  "safetyStock": 10,
  "inventoryEnabled": true
}
```

## 5. 入庫管理 / 入库管理

| Method | Path | 説明 | RBAC |
|--------|------|------|------|
| GET | `/api/inbound-orders` | 一覧 | - |
| POST | `/api/inbound-orders` | 作成（LOGIFAST全フィールド） | - |
| GET | `/api/inbound-orders/:id` | 詳細 | - |
| PUT | `/api/inbound-orders/:id` | 更新（draft のみ） | - |
| DELETE | `/api/inbound-orders/:id` | 削除（draft のみ） | - |
| POST | `/api/inbound-orders/:id/confirm` | 確定（draft → confirmed） | - |
| POST | `/api/inbound-orders/:id/receive` | 行別検品 | - |
| POST | `/api/inbound-orders/:id/bulk-receive` | 一括検品 | - |
| POST | `/api/inbound-orders/:id/putaway` | 棚入れ | - |
| POST | `/api/inbound-orders/:id/complete` | 完了 | - |
| POST | `/api/inbound-orders/:id/cancel` | キャンセル | - |
| GET | `/api/inbound-orders/history` | 検品履歴検索 | - |
| GET | `/api/inbound-orders/:id/variance` | 差異レポート | - |
| POST | `/api/inbound-orders/import` | CSV取込 | - |

## 6. 出荷管理 / 出荷管理

| Method | Path | 説明 | RBAC |
|--------|------|------|------|
| GET | `/api/shipment-orders` | 一覧（50+フィルター） | - |
| POST | `/api/shipment-orders/manual/bulk` | 一括作成 | - |
| GET | `/api/shipment-orders/:id` | 詳細 | - |
| PATCH | `/api/shipment-orders/:id` | 部分更新 | - |
| DELETE | `/api/shipment-orders/:id` | 削除 | order:delete |
| POST | `/api/shipment-orders/delete/bulk` | 一括削除 | order:delete |
| POST | `/api/shipment-orders/status/bulk` | ステータス一括変更 | - |
| POST | `/api/shipment-orders/carrier-receipts/import` | 送り状取込 | - |

### ステータス変更アクション
`mark-print-ready`, `mark-printed`, `mark-shipped`, `mark-ec-exported`, `mark-inspected`, `mark-held`, `unhold`, `unconfirm`

## 7. 在庫管理 / 库存管理

| Method | Path | 説明 | RBAC |
|--------|------|------|------|
| GET | `/api/inventory/stock` | 在庫一覧（?stockType フィルター） | - |
| GET | `/api/inventory/stock/summary` | サマリー | - |
| GET | `/api/inventory/stock/:productId` | 商品別在庫 | - |
| POST | `/api/inventory/adjust` | 在庫調整 | inventory:adjust |
| POST | `/api/inventory/bulk-adjust` | 一括調整 | inventory:adjust |
| POST | `/api/inventory/transfer` | 在庫移動 | inventory:transfer |
| POST | `/api/inventory/reserve-orders` | 引当 | inventory:reserve |
| POST | `/api/inventory/cleanup-zero` | ゼロ在庫削除 | inventory:admin |
| POST | `/api/inventory/rebuild` | リビルド | inventory:admin |
| GET | `/api/inventory/movements` | 移動履歴 | - |
| GET | `/api/inventory/alerts/low-stock` | 低在庫アラート | - |
| GET | `/api/inventory/overview` | 概況 | - |
| GET | `/api/inventory/ledger-summary` | 受払一覧 | - |

## 8. 配送業者 / 配送公司

| Method | Path | 説明 |
|--------|------|------|
| GET | `/api/carriers` | 一覧 |
| GET | `/api/carrier-automation/configs` | 自動化設定一覧 |
| PUT | `/api/carrier-automation/configs/:type` | 設定更新 |
| POST | `/api/carrier-automation/yamato-b2/validate` | B2 Cloud 検証 |
| POST | `/api/carrier-automation/yamato-b2/export` | B2 Cloud エクスポート |
| POST | `/api/carrier-automation/yamato-b2/print` | B2 Cloud PDF取得 |

## 9. その他 API / 其他 API

| Method | Path | 説明 |
|--------|------|------|
| GET | `/api/return-orders` | 返品一覧 |
| POST | `/api/return-orders` | 返品作成 |
| GET | `/api/billing` | 請求一覧 |
| GET | `/api/billing/work-charges` | 作業チャージ |
| GET | `/api/notifications` | 通知一覧 |
| GET | `/api/daily-reports` | 日次レポート |
| POST | `/api/daily-reports/generate` | レポート生成 |
| GET | `/api/kpi/dashboard` | KPI ダッシュボード |
| GET | `/api/locations` | ロケーション一覧 |
| GET | `/api/warehouses` | 倉庫一覧 |
| GET | `/api/clients` | 荷主一覧 |
| GET | `/api/operation-logs` | 操作ログ |
| GET | `/api/print-templates` | 帳票テンプレート |
| GET | `/health` | ヘルスチェック |

## 10. ヘルスチェック / 健康检查

### GET /health
```json
{
  "status": "ok",
  "version": "0.1.0",
  "timestamp": "2026-03-20T07:00:00.000Z",
  "uptime": 3600,
  "services": {
    "database": { "status": "connected", "latencyMs": 2 },
    "redis": { "status": "connected" }
  },
  "memory": {
    "rss": 67108864,
    "heapUsed": 33554432
  }
}
```
