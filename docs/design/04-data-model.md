# ZELIXWMS データモデル設計
# ZELIXWMS 数据模型设计

> 新規開発者向け: 本文書はシステムのデータモデルと関係性を説明します。
> 面向新开发者: 本文档说明系统的数据模型和关系。

## 1. ER 概要図 / ER概要图

```mermaid
erDiagram
    TENANT ||--o{ USER : has
    TENANT ||--o{ WAREHOUSE : owns
    TENANT ||--o{ PRODUCT : manages
    TENANT ||--o{ CLIENT : serves

    WAREHOUSE ||--o{ LOCATION : contains

    PRODUCT ||--o{ STOCK_QUANT : stocked_at
    PRODUCT ||--o{ INBOUND_ORDER_LINE : received_as
    PRODUCT ||--o{ SHIPMENT_ORDER_PRODUCT : shipped_as

    LOCATION ||--o{ STOCK_QUANT : holds

    CLIENT ||--o{ SUB_CLIENT : has
    CLIENT ||--o{ SHOP : has

    INBOUND_ORDER ||--o{ INBOUND_ORDER_LINE : contains
    SHIPMENT_ORDER ||--o{ SHIPMENT_ORDER_PRODUCT : contains

    STOCK_QUANT ||--o{ STOCK_MOVE : tracked_by
    STOCK_MOVE }o--|| LOCATION : from
    STOCK_MOVE }o--|| LOCATION : to
```

## 2. ドメイン分類 / 领域分类

### 2.1 コアドメイン / 核心领域

| テーブル | 説明 | レコード規模 |
|---------|------|------------|
| **tenants** | テナント（3PL事業者）| ~10 |
| **users** | ユーザー | ~100 |
| **warehouses** | 倉庫拠点 | ~5 |
| **locations** | ロケーション（棚/ゾーン/ステージング）| ~500 |
| **products** | 商品マスタ（LOGIFAST 60+カラム）| ~10,000 |
| **product_sub_skus** | 子SKU | ~1,000 |

### 2.2 入庫ドメイン / 入库领域

| テーブル | 説明 | レコード規模 |
|---------|------|------------|
| **inbound_orders** | 入庫指示ヘッダー | ~1,000/月 |
| **inbound_order_lines** | 入庫明細行 | ~5,000/月 |

### 2.3 出荷ドメイン / 出荷领域

| テーブル | 説明 | レコード規模 |
|---------|------|------------|
| **shipment_orders** | 出荷指示（最大テーブル）| ~50,000/月 |
| **shipment_order_products** | 出荷商品明細 | ~80,000/月 |

### 2.4 在庫ドメイン / 库存领域

| テーブル | 説明 | レコード規模 |
|---------|------|------------|
| **stock_quants** | 在庫数量（商品×ロケーション×ロット）| ~50,000 |
| **stock_moves** | 在庫移動履歴 | ~200,000/月 |
| **lots** | ロット/バッチ | ~5,000 |
| **inventory_ledger** | 在庫台帳（受払記録）| ~500,000/月 |
| **inventory_reservations** | 引当予約 | ~10,000 |

### 2.5 請求ドメイン / 请求领域

| テーブル | 説明 |
|---------|------|
| **billing_records** | 月次請求レコード |
| **invoices** | 請求書 |
| **work_charges** | 作業チャージ（入庫/出荷/保管）|
| **service_rates** | サービス料金マスタ |
| **shipping_rates** | 運賃マスタ |

### 2.6 配送ドメイン / 配送领域

| テーブル | 説明 |
|---------|------|
| **carriers** | 配送業者マスタ |
| **carrier_automation_configs** | B2 Cloud/佐川 API設定 |

### 2.7 その他 / 其他

| テーブル | 説明 |
|---------|------|
| **return_orders** | 返品 |
| **stocktaking_orders** | 棚卸 |
| **notifications** | 通知 |
| **operation_logs** | 操作ログ（TTL 180日）|
| **api_logs** | APIログ（TTL 180日）|
| **daily_reports** | 日次レポート |
| **print_templates** | 帳票テンプレート |
| **webhooks** / **plugins** / **feature_flags** | 拡張機能 |

## 3. 重要な関係性 / 重要关系

### 3.1 テナント分離 / 租户隔离
```
全テーブルに tenant_id カラム
→ PostgreSQL: RLS (Row Level Security) で自動フィルタ
→ MongoDB (現行): サービス層で手動フィルタ
```

### 3.2 商品 → 在庫 チェーン / 商品→库存链
```
Product (sku: "APPLE-001")
  ↓
StockQuant (product_id, location_id, lot_id → quantity: 100, reserved: 10)
  ↓
StockMove (from_location, to_location, quantity: 50, type: "inbound")
  ↓
InventoryLedger (type: "inbound", quantity: +50, reference: "IN-20260320-001")
```

### 3.3 出荷フロー / 出荷流程
```
ShipmentOrder (order_number: "SH20260320-001", status: {confirm, printReady, shipped})
  ↓ contains
ShipmentOrderProduct (input_sku: "APPLE-001", quantity: 5)
  ↓ triggers
StockMove (type: "outbound", quantity: -5)
  ↓ updates
StockQuant (quantity: 95, reserved: 5)
```

### 3.4 MongoDB vs PostgreSQL の違い / MongoDB与PostgreSQL的区别

| MongoDB (現行) | PostgreSQL (移行後) |
|----------------|-------------------|
| 商品の明細は ShipmentOrder に埋め込み | shipment_order_products 別テーブル |
| status は nested object `{confirm:{isConfirmed}}` | フラット化 `is_confirmed: boolean` |
| carrierId は Mixed型 (ObjectId or String) | UUID foreign key |
| _id (ObjectId 24文字) | id (UUID 36文字) |
| tenantId は optional String | tenant_id は NOT NULL UUID + RLS |

## 4. インデックス戦略 / 索引策略

### 優先度高（必須）/ 高优先级
```sql
-- 商品: テナント×SKU ユニーク
UNIQUE(tenant_id, sku) ON products

-- 在庫: テナント×商品×ロケーション×ロット ユニーク
UNIQUE(tenant_id, product_id, location_id, lot_id) ON stock_quants

-- 出荷: テナント×作成日（一覧表示用）
INDEX(tenant_id, created_at DESC) ON shipment_orders

-- ロケーション: テナント×コード ユニーク
UNIQUE(tenant_id, code) ON locations
```

### 優先度中 / 中优先级
```sql
-- 商品: 顧客商品コード検索
INDEX(tenant_id, customer_product_code) ON products

-- 在庫移動: 参照元検索
INDEX(reference_type, reference_id) ON stock_moves

-- ログ: TTL用
INDEX(created_at) ON operation_logs  -- TTL 180 days
INDEX(created_at) ON api_logs        -- TTL 180 days
```

## 5. トランザクション要件 / 事务需求

### 必須トランザクション / 必须事务
1. **在庫引当**: StockQuant.reserved += N → ShipmentOrder.status = confirmed
2. **入庫確定**: StockMove作成 → StockQuant更新 → InboundOrder.status変更
3. **出荷完了**: StockQuant減算 → StockMove作成 → OperationLog記録
4. **月次請求**: WorkCharge集計 → BillingRecord作成/更新 → Invoice生成

### MongoDB での現状 / MongoDB现状
```
MongoDB standalone → トランザクション非対応
→ 原子操作 ($inc, $expr) + fire-and-forget で代替
→ PostgreSQL 移行で正式トランザクション化
```
