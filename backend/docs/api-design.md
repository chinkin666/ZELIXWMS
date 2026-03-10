# Nexand 出荷管理システム - Backend API Design

## API 模块总览

| 模块 | 路由前缀 | 用途 |
|------|---------|------|
| Shipment Orders | `/api/shipment-orders` | 出荷注文管理 |
| Mapping Configs | `/api/mapping-configs` | CSV/Excel映射配置 |
| Products | `/api/products` | 商品マスタ管理 |
| Carriers | `/api/carriers` | 配送会社管理 |
| EC Companies | `/api/ec-companies` | ECモール管理 |
| Order Source Companies | `/api/order-source-companies` | 依頼主管理 |
| Print Templates | `/api/print-templates` | 印刷テンプレート管理 |
| Form Templates | `/api/form-templates` | 帳票テンプレート管理 |
| Carrier Automation | `/api/carrier-automation` | 配送会社自動化（B2 API等） |

---

## 1. Shipment Orders API

出荷注文の作成・取得・更新・削除・ステータス管理。

### エンドポイント一覧

| Method | Path | 機能 |
|--------|------|------|
| `GET` | `/` | 注文一覧取得（フィルタ・ページネーション対応） |
| `GET` | `/:id` | 注文詳細取得 |
| `POST` | `/manual/bulk` | 手動注文一括作成 |
| `POST` | `/by-ids` | ID指定で複数注文取得 |
| `POST` | `/carrier-receipts/import` | 配送会社回执取込 |
| `POST` | `/status/bulk` | ステータス一括更新 |
| `POST` | `/delete/bulk` | 注文一括削除 |
| `POST` | `/:id/status` | 単一注文ステータス更新 |
| `PUT` | `/:id` | 注文更新 |
| `PATCH` | `/bulk` | 注文一括更新 |
| `DELETE` | `/:id` | 注文削除 |

### GET /api/shipment-orders

注文一覧を取得。高度なフィルタリングをサポート。

**クエリパラメータ:**

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `page` | number | ページ番号（デフォルト: 1） |
| `limit` | number | 取得件数（デフォルト: 20） |
| `sort` | string | ソートフィールド |
| `order` | 'asc' \| 'desc' | ソート順序 |
| `q` | string | 高度検索クエリ（下記参照） |

**検索クエリ `q` の書式:**

```
field:operator:value
```

対応する演算子:
- `eq` - 完全一致
- `ne` - 不一致
- `contains` - 部分一致
- `startsWith` - 前方一致
- `in` - 配列内に存在
- `nin` - 配列内に存在しない
- `gt`, `gte`, `lt`, `lte` - 数値/日付比較

複数条件は `|` で区切り:
```
shipPlanDate:gte:2024-01-01|carrierId:eq:xxx|status.confirm.isConfirmed:eq:true
```

**レスポンス:**

```json
{
  "items": [/* ShipmentOrder[] */],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

### POST /api/shipment-orders/manual/bulk

手動入力による注文一括作成。

**リクエストボディ:**

```json
{
  "orders": [
    {
      "customerManagementNumber": "ORD-001",
      "ecCompanyId": "xxx",
      "carrierId": "xxx",
      "recipient": {
        "postalCode": "1234567",
        "prefecture": "東京都",
        "city": "渋谷区",
        "street": "xxx",
        "name": "山田太郎",
        "phone": "09012345678"
      },
      "sender": { /* Address */ },
      "products": [
        { "inputSku": "SKU001", "quantity": 2 }
      ],
      "shipPlanDate": "2024/01/15",
      "invoiceType": "0"
    }
  ]
}
```

### POST /api/shipment-orders/carrier-receipts/import

配送会社からの回执（伝票番号等）を取り込み。

**リクエストボディ:**

```json
{
  "carrierId": "xxx",
  "rows": [
    {
      "customerManagementNumber": "ORD-001",
      "trackingId": "1234-5678-9012",
      /* その他回执データ */
    }
  ]
}
```

### POST /api/shipment-orders/:id/status

単一注文のステータスを更新。

**リクエストボディ:**

```json
{
  "action": "confirm" | "unconfirm" | "print" | "ship",
  "timestamp": "2024-01-15T10:00:00Z"
}
```

### POST /api/shipment-orders/status/bulk

複数注文のステータスを一括更新。

**リクエストボディ:**

```json
{
  "orderIds": ["id1", "id2"],
  "action": "confirm" | "unconfirm" | "print" | "ship"
}
```

---

## 2. Products API

商品マスタの管理。子SKU対応。

### エンドポイント一覧

| Method | Path | 機能 |
|--------|------|------|
| `GET` | `/` | 商品一覧取得 |
| `GET` | `/resolve/:sku` | SKU解決（子SKU対応） |
| `GET` | `/:id` | 商品詳細取得 |
| `POST` | `/` | 商品作成 |
| `POST` | `/batch` | 複数商品一括取得 |
| `POST` | `/check-sku-availability` | SKU利用可否チェック |
| `POST` | `/validate-import` | インポート検証 |
| `POST` | `/import-bulk` | 一括インポート |
| `PUT` | `/:id` | 商品更新 |
| `DELETE` | `/:id` | 商品削除 |

### GET /api/products/resolve/:sku

SKUを解決し、親商品情報と子SKU情報を取得。

**レスポンス（親SKUの場合）:**

```json
{
  "found": true,
  "type": "product",
  "product": { /* IProduct */ }
}
```

**レスポンス（子SKUの場合）:**

```json
{
  "found": true,
  "type": "subSku",
  "product": { /* 親商品 IProduct */ },
  "subSku": {
    "subSku": "SKU001-BLK",
    "price": 1000,
    "description": "ブラック"
  }
}
```

### POST /api/products/batch

複数のSKUから商品情報を一括取得。

**リクエストボディ:**

```json
{
  "skus": ["SKU001", "SKU002", "SKU003"]
}
```

### POST /api/products/import-bulk

商品データの一括インポート。

**リクエストボディ:**

```json
{
  "products": [
    {
      "sku": "SKU001",
      "name": "商品名",
      "category": "商品",
      "barcode": ["4901234567890"],
      "subSkus": [
        { "subSku": "SKU001-BLK", "price": 1000 }
      ]
    }
  ],
  "mode": "create" | "update" | "upsert"
}
```

---

## 3. Mapping Configs API

CSV/Excel列映射配置の管理。

### エンドポイント一覧

| Method | Path | 機能 |
|--------|------|------|
| `GET` | `/` | 配置一覧取得 |
| `GET` | `/default` | デフォルト配置取得 |
| `GET` | `/transform-plugins` | 利用可能なプラグイン一覧 |
| `GET` | `/:id` | 配置詳細取得 |
| `POST` | `/` | 配置作成 |
| `PUT` | `/:id` | 配置更新 |
| `DELETE` | `/:id` | 配置削除 |

### GET /api/mapping-configs

**クエリパラメータ:**

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `configType` | string | 配置タイプでフィルタ |
| `ecCompanyId` | string | ECモールIDでフィルタ |
| `carrierId` | string | 配送会社IDでフィルタ |

### GET /api/mapping-configs/default

**クエリパラメータ:**

| パラメータ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| `configType` | string | Yes | 配置タイプ |

---

## 4. Carriers API

配送会社マスタの管理。

### エンドポイント一覧

| Method | Path | 機能 |
|--------|------|------|
| `GET` | `/` | 配送会社一覧取得 |
| `GET` | `/:id` | 配送会社詳細取得 |
| `POST` | `/` | 配送会社作成 |
| `PUT` | `/:id` | 配送会社更新 |
| `DELETE` | `/:id` | 配送会社削除 |

**注意:** `isBuiltIn: true` の配送会社は編集・削除不可。

---

## 5. EC Companies API

ECモール設定の管理。

### エンドポイント一覧

| Method | Path | 機能 |
|--------|------|------|
| `GET` | `/` | ECモール一覧取得 |
| `GET` | `/:id` | ECモール詳細取得 |
| `POST` | `/` | ECモール作成 |
| `PUT` | `/:id` | ECモール更新 |
| `DELETE` | `/:id` | ECモール削除 |

---

## 6. Order Source Companies API

依頼主（送り主）マスタの管理。

### エンドポイント一覧

| Method | Path | 機能 |
|--------|------|------|
| `GET` | `/` | 依頼主一覧取得 |
| `GET` | `/:id` | 依頼主詳細取得 |
| `POST` | `/` | 依頼主作成 |
| `POST` | `/validate-import` | インポート検証 |
| `POST` | `/import-bulk` | 一括インポート |
| `PUT` | `/:id` | 依頼主更新 |
| `DELETE` | `/:id` | 依頼主削除 |

---

## 7. Print Templates API

印刷テンプレート（送り状ラベル等）の管理。

### エンドポイント一覧

| Method | Path | 機能 |
|--------|------|------|
| `GET` | `/` | テンプレート一覧取得 |
| `GET` | `/:id` | テンプレート詳細取得 |
| `POST` | `/` | テンプレート作成 |
| `PUT` | `/:id` | テンプレート更新 |
| `DELETE` | `/:id` | テンプレート削除 |

### GET /api/print-templates

**クエリパラメータ:**

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `carrierId` | string | 配送会社IDでフィルタ |
| `invoiceType` | string | 送り状種類でフィルタ |
| `includeSampleData` | boolean | サンプルデータを含める |

---

## 8. Form Templates API

帳票テンプレート（ピッキングリスト等）の管理。

### エンドポイント一覧

| Method | Path | 機能 |
|--------|------|------|
| `GET` | `/` | テンプレート一覧取得 |
| `GET` | `/:id` | テンプレート詳細取得 |
| `POST` | `/` | テンプレート作成 |
| `PUT` | `/:id` | テンプレート更新 |
| `DELETE` | `/:id` | テンプレート削除 |

### GET /api/form-templates

**クエリパラメータ:**

| パラメータ | 型 | 説明 |
|-----------|-----|------|
| `targetType` | string | 対象タイプでフィルタ |

---

## 9. Carrier Automation API

配送会社API連携（ヤマトB2等）の自動化機能。

### 設定管理

| Method | Path | 機能 |
|--------|------|------|
| `GET` | `/configs` | 設定一覧取得 |
| `GET` | `/configs/:type` | 設定詳細取得 |
| `PUT` | `/configs/:type` | 設定作成/更新（upsert） |
| `DELETE` | `/configs/:type` | 設定削除 |
| `POST` | `/configs/:type/test` | 接続テスト |

### Yamato B2 操作

| Method | Path | 機能 |
|--------|------|------|
| `POST` | `/yamato-b2/validate` | 注文データ検証 |
| `POST` | `/yamato-b2/export` | B2へデータ送信（出荷登録） |
| `POST` | `/yamato-b2/print` | 送り状印刷データ取得 |
| `POST` | `/yamato-b2/import` | B2から回执取込 |
| `GET` | `/yamato-b2/history` | 操作履歴取得 |
| `POST` | `/yamato-b2/unconfirm` | 確認取消 |

### POST /api/carrier-automation/yamato-b2/validate

注文データをB2 API仕様に照らして検証。

**リクエストボディ:**

```json
{
  "orderIds": ["id1", "id2"]
}
```

**レスポンス:**

```json
{
  "valid": [
    { "orderId": "id1", "valid": true }
  ],
  "invalid": [
    { "orderId": "id2", "valid": false, "errors": ["recipient.phone is required"] }
  ]
}
```

### POST /api/carrier-automation/yamato-b2/export

B2 APIに出荷データを送信し、伝票番号を取得。

**リクエストボディ:**

```json
{
  "orderIds": ["id1", "id2"]
}
```

**レスポンス:**

```json
{
  "success": [
    { "orderId": "id1", "trackingId": "1234-5678-9012" }
  ],
  "failed": [
    { "orderId": "id2", "error": "API Error: xxx" }
  ]
}
```

---

## 共通仕様

### リクエストヘッダー

```
Content-Type: application/json
X-Tenant-Id: default-tenant
```

### エラーレスポンス

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": [
      { "field": "recipient.phone", "message": "Phone number is required" }
    ]
  }
}
```

### HTTPステータスコード

| コード | 意味 |
|--------|------|
| 200 | 成功 |
| 201 | 作成成功 |
| 204 | 削除成功（レスポンスボディなし） |
| 400 | リクエストエラー |
| 404 | リソース未発見 |
| 409 | コンフリクト（重複等） |
| 500 | サーバーエラー |

### ページネーション

リスト取得APIは以下のクエリパラメータをサポート:

| パラメータ | デフォルト | 説明 |
|-----------|-----------|------|
| `page` | 1 | ページ番号 |
| `limit` | 20 | 1ページあたりの件数 |
| `sort` | `createdAt` | ソートフィールド |
| `order` | `desc` | ソート順序 |

レスポンス形式:

```json
{
  "items": [],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```
