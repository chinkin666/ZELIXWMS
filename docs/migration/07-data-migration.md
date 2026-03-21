# ZELIXWMS データ移行手順書
# ZELIXWMS 数据迁移手册

> MongoDB → PostgreSQL のデータ移行手順
> MongoDB → PostgreSQL 数据迁移步骤

## 1. 移行概要 / 迁移概述

```
MongoDB (nexand-shipment DB)
  ↓ mongodump (BSON)
  ↓ bsondump → JSON
  ↓ ETL スクリプト (TypeScript)
  ↓ PostgreSQL INSERT
PostgreSQL (zelixwms DB)
```

## 2. 前提条件 / 前提条件

- MongoDB 稼働中 (port 27017)
- PostgreSQL 稼働中 (port 5432)
- `drizzle/0000_initial.sql` 適用済み
- Node.js 20+ / tsx

## 3. Step 1: MongoDB ダンプ / MongoDB导出

```bash
# BSON ダンプ
npm run db:dump
# → local-db/dump/ に全コレクションのBSONが出力される

# または手動
mongodump --db nexand-shipment --out local-db/dump/
```

## 4. Step 2: ID マッピング方針 / ID映射方针

### ObjectId → UUID 変換
```
MongoDB ObjectId: 69b6205e7ddcb7290ca9fd74 (24文字 hex)
PostgreSQL UUID:  69b6205e-7ddc-b729-0ca9-fd7400000000 (36文字)
```

変換ルール:
```typescript
function objectIdToUuid(oid: string): string {
  // ObjectId 24文字を UUID 形式にパディング
  const padded = oid.padEnd(32, '0');
  return [
    padded.slice(0, 8),
    padded.slice(8, 12),
    padded.slice(12, 16),
    padded.slice(16, 20),
    padded.slice(20, 32),
  ].join('-');
}
```

### tenantId マッピング
```
MongoDB: tenantId = "default" (String)
PostgreSQL: tenant_id = '00000000-0000-0000-0000-000000000001' (UUID)

マッピング: "default" → fixed UUID
```

## 5. Step 3: ETL スクリプト / ETL脚本

### 5.1 テナント + ユーザー
```bash
npx tsx scripts/migrate/01-tenants-users.ts
```

### 5.2 マスタデータ（商品・ロケーション・配送業者）
```bash
npx tsx scripts/migrate/02-master-data.ts
```

### 5.3 入庫データ
```bash
npx tsx scripts/migrate/03-inbound-orders.ts
```

### 5.4 出荷データ（最大）
```bash
npx tsx scripts/migrate/04-shipment-orders.ts
```
注意: 出荷データは `orders` コレクション (ShipmentOrder) を `shipment_orders` + `shipment_order_products` に分解

### 5.5 在庫データ
```bash
npx tsx scripts/migrate/05-inventory.ts
```

### 5.6 請求・ログ・その他
```bash
npx tsx scripts/migrate/06-billing-logs.ts
```

## 6. Step 4: データ検証 / 数据验证

```bash
npx tsx scripts/migrate/verify.ts
```

検証項目:
```
✅ テーブルごとのレコード数比較
✅ 商品SKUの重複チェック
✅ 在庫合計の整合性（MongoDB sum vs PostgreSQL sum）
✅ 外部キー参照の整合性
✅ NULL/空文字の扱い
```

## 7. コレクション → テーブル マッピング / 集合→表映射

| MongoDB Collection | PostgreSQL Table | 変換方法 |
|-------------------|-----------------|---------|
| tenants | tenants | 1:1, tenantCode→code |
| users | users | 1:1, Supabase Auth user作成 |
| warehouses | warehouses | 1:1, code unique化 |
| locations | locations | 1:1, type保持 |
| products | products + product_sub_skus | 1:N分解 (subSkus→別テーブル) |
| orders (ShipmentOrder) | shipment_orders + shipment_order_products | 1:N分解 (products→別テーブル) |
| inbound_orders | inbound_orders + inbound_order_lines | 1:N分解 (lines→別テーブル) |
| stock_quants | stock_quants | 1:1 |
| stock_moves | stock_moves | 1:1 |
| lots | lots | 1:1 |
| inventory_ledger | inventory_ledger | 1:1 |
| billing_records | billing_records | 1:1 |
| carriers | carriers | 1:1 |
| carrier_automation_configs | carrier_automation_configs | 1:1, JSONB保持 |
| return_orders | return_orders + return_order_lines | 1:N分解 |
| operation_logs | operation_logs | 1:1, TTL移行 |
| api_logs | api_logs | 1:1, TTL移行 |
| notifications | notifications | 1:1 |
| print_templates | print_templates | 1:1, elements→JSONB |

## 8. 特殊変換 / 特殊转换

### ShipmentOrder.status (nested → flat)
```
MongoDB:
  status: {
    confirm: { isConfirmed: true, confirmedAt: "2026-03-20" },
    printReady: { isPrintReady: false },
    shipped: { isShipped: true, shippedAt: "2026-03-20" }
  }

PostgreSQL:
  is_confirmed: true
  confirmed_at: '2026-03-20'
  is_print_ready: false
  is_shipped: true
  shipped_at: '2026-03-20'
```

### ShipmentOrder.recipient (embedded → flat)
```
MongoDB:
  recipient: { postalCode: "1000001", prefecture: "東京都", city: "千代田区", street: "丸の内1-1-1", name: "太郎", phone: "0312345678" }

PostgreSQL:
  recipient_postal_code: '1000001'
  recipient_prefecture: '東京都'
  recipient_city: '千代田区'
  recipient_street: '丸の内1-1-1'
  recipient_name: '太郎'
  recipient_phone: '0312345678'
```

### Mixed 型 → JSONB
```
MongoDB: carrierData (Mixed) → PostgreSQL: carrier_data (JSONB)
MongoDB: customFields (Mixed) → PostgreSQL: custom_fields (JSONB)
```

## 9. ロールバック手順 / 回滚步骤

```bash
# PostgreSQL データ全削除
docker exec zelixship-db-1 psql -U zelixship -d zelixwms -c "
  TRUNCATE shipment_order_products, shipment_orders,
           inbound_order_lines, inbound_orders,
           stock_moves, stock_quants, inventory_ledger,
           products, product_sub_skus, locations, warehouses,
           users CASCADE;
"

# MongoDB はそのまま（変更していないため）
# フロントエンドの API URL を Express に戻す
```

## 10. 移行後チェックリスト / 迁移后检查清单

- [ ] 全テーブルのレコード数が MongoDB と一致
- [ ] 商品検索が正常に動作
- [ ] 入庫フロー（作成→確定→検品→棚入れ→完了）が動作
- [ ] 出荷フロー（作成→確認→B2 Cloud→伝票→出荷完了）が動作
- [ ] 在庫数が MongoDB と一致
- [ ] 請求データが移行されている
- [ ] 操作ログが検索可能
- [ ] フロントエンドの全画面が表示される
