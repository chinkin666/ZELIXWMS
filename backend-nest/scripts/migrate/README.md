# MongoDB to PostgreSQL Data Migration Scripts

MongoDB から PostgreSQL (Supabase) へのデータ移行ETLスクリプト集。
MongoDB 到 PostgreSQL (Supabase) 的数据迁移 ETL 脚本集。

## Overview / 概要

- **ORM**: Drizzle ORM (PostgreSQL)
- **ID Conversion / ID変換**: UUID v5 (deterministic ObjectId -> UUID)
- **Batch Size / バッチサイズ**: 500 records per batch
- **Idempotent / 冪等性**: All scripts use `onConflictDoNothing()` — safe to re-run

## Run Order / 実行順序

Scripts must be run in order due to foreign key dependencies:
外部キー依存のため、以下の順序で実行すること：

| # | Script | MongoDB Collection(s) | PostgreSQL Table(s) |
|---|--------|-----------------------|---------------------|
| 01 | `01-tenants.ts` | tenants | tenants |
| 02 | `02-users.ts` | users | users |
| 03 | `03-products.ts` | products | products, product_sub_skus |
| 04 | `04-warehouses-locations.ts` | warehouses, locations | warehouses, locations |
| 05 | `05-clients.ts` | clients, subClients, shops, customers, suppliers | clients, sub_clients, shops, customers, suppliers |
| 06 | `06-orders.ts` | shipmentOrders, inboundOrders, returnOrders | shipment_orders, shipment_order_products, inbound_orders, inbound_order_lines, return_orders, return_order_lines |
| 07 | `07-inventory.ts` | stockQuants, stockMoves, lots, inventoryLedger | stock_quants, stock_moves, lots, inventory_ledger |
| 08 | `08-billing.ts` | serviceRates, shippingRates, workCharges, billingRecords, invoices | service_rates, shipping_rates, work_charges, billing_records, invoices |

## Usage / 使用方法

```bash
# Run all migrations / 全移行を実行
npx ts-node scripts/migrate/run-all.ts

# Run a specific migration / 特定の移行を実行
npx ts-node scripts/migrate/01-tenants.ts
```

## Environment Variables / 環境変数

```
MONGO_URI=mongodb://localhost:27017/zelixwms
DATABASE_URL=postgresql://user:password@localhost:5432/zelixwms
BATCH_SIZE=500  # optional, default 500
```

## ID Conversion / ID変換

Uses UUID v5 with DNS namespace for deterministic conversion:
DNS名前空間を使ったUUID v5による決定論的変換：

```
MongoDB ObjectId: 507f1f77bcf86cd799439011
         -> UUID: xxxxxxxx-xxxx-5xxx-xxxx-xxxxxxxxxxxx
```

Same ObjectId always produces the same UUID, enabling re-runs and cross-reference integrity.
同じObjectIdは常に同じUUIDを生成し、再実行と相互参照の整合性を保証する。
